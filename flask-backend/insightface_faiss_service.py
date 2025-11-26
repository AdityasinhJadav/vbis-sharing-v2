"""
InsightFace + FAISS service for industry-grade face embedding and fast search.

Notes:
- Uses ArcFace embeddings (512-d) from InsightFace.
- Uses cosine similarity via FAISS IndexFlatIP (with L2-normalized vectors).
- Maintains one in-memory FAISS index per event for simple scoping.

Install deps (CPU):
  pip install insightface onnxruntime faiss-cpu

GPU (optional):
  pip install onnxruntime-gpu
  (or TensorRT engines for maximum throughput)
"""

import io
import time
import logging
import os
import json
import threading
from typing import Dict, List, Optional, Tuple

import numpy as np
import requests


logger = logging.getLogger(__name__)


def _try_imports():
    global insightface, faiss
    try:
        import insightface  # type: ignore
    except Exception as e:
        raise RuntimeError("insightface is not installed. pip install insightface") from e
    try:
        import faiss  # type: ignore
    except Exception as e:
        raise RuntimeError("faiss-cpu is not installed. pip install faiss-cpu") from e


class InsightFaceFaissService:
    def __init__(self) -> None:
        self.initialized: bool = False
        self.app = None  # InsightFace app
        # Per-event FAISS indices: event_id -> { 'index': faiss.Index, 'ids': [photo_id], 'vectors': np.ndarray }
        self.event_indices: Dict[str, Dict[str, object]] = {}
        self.storage_path = os.getenv('FAISS_INDEX_PATH', os.path.join(os.path.dirname(__file__), 'faiss_store'))
        # Thread locks for each event to ensure thread-safe FAISS operations
        self._locks: Dict[str, threading.Lock] = {}

    def initialize(self, det_size: Tuple[int, int] = (640, 640)) -> bool:
        if self.initialized:
            return True
        _try_imports()
        providers = ["CPUExecutionProvider"]
        try:
            # Try GPU provider if available
            import onnxruntime as ort  # type: ignore
            available = [p for p in ort.get_available_providers()]
            if "CUDAExecutionProvider" in available:
                providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
        except Exception:
            pass

        self.app = insightface.app.FaceAnalysis(name="buffalo_l", providers=providers)
        self.app.prepare(ctx_id=0 if "CUDAExecutionProvider" in providers else -1, det_size=det_size)
        self.initialized = True
        self._load_existing_indices()
        logger.info("InsightFace initialized with providers=%s det_size=%s", providers, det_size)
        return True

    def _ensure_storage_path(self):
        os.makedirs(self.storage_path, exist_ok=True)

    def _vector_path(self, event_id: str):
        return os.path.join(self.storage_path, f'{event_id}.npz')

    def _meta_path(self, event_id: str):
        return os.path.join(self.storage_path, f'{event_id}.json')

    def _persist_event(self, event_id: str):
        try:
            entry = self.event_indices.get(event_id)
            if not entry:
                return
            self._ensure_storage_path()
            vector_path = self._vector_path(event_id)
            meta_path = self._meta_path(event_id)
            np.savez(vector_path, vectors=entry["vectors"])
            with open(meta_path, 'w', encoding='utf-8') as meta_file:
                json.dump({'ids': entry['ids'], 'dim': entry["vectors"].shape[1]}, meta_file)
        except Exception as exc:
            logger.warning("Failed to persist FAISS index for %s: %s", event_id, exc)

    def _load_event_index(self, event_id: str):
        vector_path = self._vector_path(event_id)
        meta_path = self._meta_path(event_id)
        if not os.path.exists(vector_path) or not os.path.exists(meta_path):
            return
        try:
            import faiss  # type: ignore
            data = np.load(vector_path)
            with open(meta_path, 'r', encoding='utf-8') as meta_file:
                meta = json.load(meta_file)
            vectors = data['vectors']
            dim = int(meta.get('dim', vectors.shape[1] if vectors.size else 512))
            index = faiss.IndexFlatIP(dim)
            if vectors.size:
                index.add(vectors)
            self.event_indices[event_id] = {
                "index": index,
                "ids": meta.get('ids', []),
                "vectors": vectors
            }
            logger.info("Loaded FAISS index for event %s with %d items", event_id, len(meta.get('ids', [])))
        except Exception as exc:
            logger.warning("Failed to load FAISS index for %s: %s", event_id, exc)

    def _load_existing_indices(self):
        if not os.path.isdir(self.storage_path):
            return
        for filename in os.listdir(self.storage_path):
            if not filename.endswith('.json'):
                continue
            event_id = filename[:-5]
            self._load_event_index(event_id)

    def _download_image(self, image_url: str) -> Optional[np.ndarray]:
        headers = {"User-Agent": "FaceMatch/1.0"}
        # Add Cloudinary downscale if missing transforms
        optimized = image_url
        try:
            if 'res.cloudinary.com' in image_url and '/image/upload/' in image_url and ('/w_' not in image_url):
                optimized = image_url.replace('/image/upload/', '/image/upload/w_640,q_75,c_limit,fl_lossy/')
        except Exception:
            pass
        try:
            r = requests.get(optimized, timeout=20, headers=headers)
            r.raise_for_status()
        except Exception as e:
            logger.warning("Image download failed: %s", e)
            return None
        import cv2  # lazy
        import numpy as np
        arr = np.frombuffer(r.content, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            return None
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        return img

    def compute_embedding_from_url(self, image_url: str) -> Optional[np.ndarray]:
        if not self.initialized:
            self.initialize()
        img = self._download_image(image_url)
        if img is None:
            return None
        faces = self.app.get(img)
        if not faces:
            return None
        # Use most confident face
        face = max(faces, key=lambda f: getattr(f, 'det_score', 0.0))
        emb = face.normed_embedding if hasattr(face, 'normed_embedding') else face.embedding
        vec = np.array(emb, dtype=np.float32)
        # Ensure normalized for cosine
        norm = np.linalg.norm(vec) + 1e-8
        vec = vec / norm
        return vec

    def compute_embeddings_from_url(self, image_url: str) -> Tuple[Optional[List[np.ndarray]], Optional[str]]:
        """
        Return embeddings for all detected faces in the image URL with quality filtering.
        Returns: (embeddings: Optional[List[np.ndarray]], error_message: Optional[str])
        """
        if not self.initialized:
            self.initialize()
        img = self._download_image(image_url)
        if img is None:
            return None, "Failed to download image from URL"
        try:
            faces = self.app.get(img)
        except Exception as e:
            logger.error(f"Error during face detection: {e}", exc_info=True)
            return None, f"Error during face detection: {str(e)}"
        
        if not faces:
            return None, "No faces detected in the image"
        
        # Filter faces by quality (detection score and face size)
        quality_faces = []
        all_scores = []
        all_ratios = []
        for f in faces:
            det_score = getattr(f, 'det_score', 0.0)
            all_scores.append(det_score)
            # Get face bounding box
            bbox = getattr(f, 'bbox', None)
            if bbox is not None:
                face_width = bbox[2] - bbox[0]
                face_height = bbox[3] - bbox[1]
                face_area = face_width * face_height
                img_area = img.shape[0] * img.shape[1]
                face_ratio = face_area / img_area if img_area > 0 else 0
                all_ratios.append(face_ratio)
                
                # Filter: minimum detection score 0.4, face should be at least 0.1% of image (very lenient for group photos and high-res images)
                # For high-confidence faces (score > 0.6), be even more lenient (0.1%)
                min_ratio = 0.001 if det_score > 0.6 else 0.0015
                if det_score >= 0.4 and face_ratio >= min_ratio:
                    quality_faces.append((f, det_score, face_ratio))
            else:
                # If no bbox, just check detection score
                if det_score >= 0.4:
                    quality_faces.append((f, det_score, 0.1))
        
        if not quality_faces:
            max_score = max(all_scores) if all_scores else 0
            min_score = min(all_scores) if all_scores else 0
            max_ratio = max(all_ratios) * 100 if all_ratios else 0
            min_ratio = min(all_ratios) * 100 if all_ratios else 0
            return None, f"Faces detected ({len(faces)} found, scores: {min_score:.3f}-{max_score:.3f}, sizes: {min_ratio:.2f}%-{max_ratio:.2f}%) but none passed quality filter (need score >= 0.4 and face size >= 0.15% of image, or >= 0.1% for high-confidence faces > 0.6)"
        
        # Sort by quality (detection score * face size ratio)
        quality_faces.sort(key=lambda x: x[1] * x[2], reverse=True)
        
        embeddings: List[np.ndarray] = []
        for f, _, _ in quality_faces:
            try:
                emb = f.normed_embedding if hasattr(f, 'normed_embedding') else f.embedding
                vec = np.array(emb, dtype=np.float32)
                # Double normalization for better accuracy
                norm = np.linalg.norm(vec) + 1e-8
                vec = vec / norm
                # Additional L2 normalization for cosine similarity
                vec = vec / (np.linalg.norm(vec) + 1e-8)
                embeddings.append(vec)
            except Exception as e:
                logger.warning(f"Error extracting embedding from face: {e}")
                continue
        
        if not embeddings:
            return None, "Failed to extract embeddings from detected faces"
        
        return embeddings, None

    def get_face_embedding(self, image_file) -> Optional[np.ndarray]:
        """Compute ArcFace embedding from an uploaded file-like object with quality filtering."""
        if not self.initialized:
            self.initialize()
        try:
            # Read bytes and decode to RGB
            data = image_file.read()
            try:
                image_file.seek(0)
            except Exception:
                pass
            import cv2  # lazy
            import numpy as np
            arr = np.frombuffer(data, dtype=np.uint8)
            img_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if img_bgr is None:
                return None
            img = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

            faces = self.app.get(img)
            if not faces:
                return None
            
            # Filter faces by quality and select best
            quality_faces = []
            for f in faces:
                det_score = getattr(f, 'det_score', 0.0)
                bbox = getattr(f, 'bbox', None)
                if bbox is not None:
                    face_width = bbox[2] - bbox[0]
                    face_height = bbox[3] - bbox[1]
                    face_area = face_width * face_height
                    img_area = img.shape[0] * img.shape[1]
                    face_ratio = face_area / img_area if img_area > 0 else 0
                    
                    # Filter: minimum detection score 0.4, face should be at least 0.1% of image (very lenient for group photos)
                    # For high-confidence faces (score > 0.6), be even more lenient (0.1%)
                    min_ratio = 0.001 if det_score > 0.6 else 0.0015
                    if det_score >= 0.4 and face_ratio >= min_ratio:
                        quality_faces.append((f, det_score * face_ratio))
                else:
                    if det_score >= 0.4:
                        quality_faces.append((f, det_score))
            
            if not quality_faces:
                return None
            
            # Select best quality face
            face, _ = max(quality_faces, key=lambda x: x[1])
            
            emb = face.normed_embedding if hasattr(face, 'normed_embedding') else face.embedding
            vec = np.array(emb, dtype=np.float32)
            # Double normalization for better accuracy
            norm = np.linalg.norm(vec) + 1e-8
            vec = vec / norm
            # Additional L2 normalization for cosine similarity
            vec = vec / (np.linalg.norm(vec) + 1e-8)
            return vec
        except Exception:
            return None

    def _get_lock(self, event_id: str) -> threading.Lock:
        """Get or create a thread lock for an event"""
        if event_id not in self._locks:
            self._locks[event_id] = threading.Lock()
        return self._locks[event_id]
    
    def _get_or_create_index(self, event_id: str, dim: int = 512):
        import faiss  # type: ignore
        entry = self.event_indices.get(event_id)
        if entry is None:
            index = faiss.IndexFlatIP(dim)
            self.event_indices[event_id] = {"index": index, "ids": [], "vectors": np.zeros((0, dim), dtype=np.float32)}
            entry = self.event_indices[event_id]
        return entry

    def ingest(self, event_id: str, photo_id: str, image_url: Optional[str] = None, embedding: Optional[List[float]] = None) -> Tuple[bool, Optional[str]]:
        """
        Ingest a photo into FAISS index.
        Returns: (success: bool, error_message: Optional[str])
        """
        if not self.initialized:
            self.initialize()
        vectors_to_add: List[np.ndarray] = []
        ids_to_add: List[str] = []
        if embedding is None:
            if not image_url:
                return False, "Either embedding or image_url must be provided"
            # Ingest all faces in the image
            try:
                vecs, error_msg = self.compute_embeddings_from_url(image_url)
                if vecs is None:
                    return False, error_msg or "Unknown error during face detection"
                if len(vecs) == 0:
                    return False, "No embeddings extracted from detected faces"
                for i, v in enumerate(vecs):
                    vectors_to_add.append(v.reshape(1, -1))
                    ids_to_add.append(f"{photo_id}#{i}")
            except Exception as e:
                logger.error(f"Exception during ingestion for photo {photo_id}: {e}", exc_info=True)
                return False, f"Error during face detection: {str(e)}"
        else:
            vec = np.asarray(embedding, dtype=np.float32)
            norm = np.linalg.norm(vec) + 1e-8
            vec = vec / norm
            vectors_to_add.append(vec.reshape(1, -1))
            ids_to_add.append(photo_id)

        # Thread-safe ingestion: FAISS IndexFlatIP is NOT thread-safe
        lock = self._get_lock(event_id)
        with lock:
            # Initialize index based on dimension
            entry = self._get_or_create_index(event_id, dim=vectors_to_add[0].shape[1])
            index = entry["index"]
            ids: List[str] = entry["ids"]
            vectors: np.ndarray = entry["vectors"]

            # Batch append vectors for efficiency
            if len(vectors_to_add) > 0:
                batch_vectors = np.vstack(vectors_to_add) if len(vectors_to_add) > 1 else vectors_to_add[0]
                vectors = np.vstack([vectors, batch_vectors])
                index.add(batch_vectors)  # Batch add is more efficient
                ids.extend(ids_to_add)

            entry["vectors"] = vectors
            self._persist_event(event_id)
            logger.info("Ingested %d face(s) for photo %s into event %s (index size=%d)", len(ids_to_add), photo_id, event_id, len(ids))
        return True, None

    def match(self, event_id: str, query_embedding: List[float], top_k: int = 50, threshold: float = 0.4):
        """
        Match query embedding against event index with improved accuracy and recall.
        
        Uses adaptive thresholding and confidence scoring for better accuracy.
        Default threshold is 0.4 (40% similarity) for better recall while maintaining precision.
        """
        if not self.initialized:
            self.initialize()
        entry = self.event_indices.get(event_id)
        if entry is None or len(entry["ids"]) == 0:
            return []
        
        # Thread-safe read: FAISS search is read-only but we lock for consistency
        lock = self._get_lock(event_id)
        with lock:
            index = entry["index"]
            ids: List[str] = entry["ids"]
            vectors = entry.get("vectors", None)
            
            # Normalize query embedding with double normalization for better accuracy
            q = np.asarray(query_embedding, dtype=np.float32)
            q = q / (np.linalg.norm(q) + 1e-8)
            q = q / (np.linalg.norm(q) + 1e-8)  # Double normalization

            # Search for more candidates to improve recall
            search_k = min(max(top_k * 5, 100), len(ids))  # Get 5x candidates or at least 100 for better recall
            D, I = index.search(q.reshape(1, -1), search_k)
            
            results = []
            all_scores = [s for s in D[0].tolist() if s > 0]  # Get all positive scores for adaptive thresholding
            
            # Calculate adaptive threshold based on score distribution
            if len(all_scores) > 0:
                max_score = max(all_scores)
                # Use adaptive threshold: if we have high scores, be more lenient
                if max_score > 0.6:
                    # High quality matches available, use lower threshold for better recall
                    adaptive_threshold = threshold * 0.85  # 15% more lenient
                elif max_score > 0.5:
                    adaptive_threshold = threshold * 0.9  # 10% more lenient
                else:
                    adaptive_threshold = threshold
            else:
                adaptive_threshold = threshold
            
            for score, idx in zip(D[0].tolist(), I[0].tolist()):
                if idx < 0 or idx >= len(ids):
                    continue
                
                # Use adaptive threshold for better recall
                effective_threshold = adaptive_threshold
                
                # Additional leniency for medium scores to catch more matches
                if 0.4 <= score < 0.5:
                    effective_threshold = threshold * 0.9  # More lenient for medium scores
                elif score >= 0.5:
                    effective_threshold = threshold * 0.85  # Even more lenient for good scores
                
                if score >= effective_threshold:
                    # Calculate confidence score (0-1 scale)
                    # Map cosine similarity [threshold, 1.0] to confidence [0.3, 1.0] for better range
                    confidence = 0.3 + (score - effective_threshold) / (1.0 - effective_threshold) * 0.7
                    confidence = min(1.0, max(0.0, confidence))
                    
                    results.append({
                        "id": ids[idx],
                        "score": float(score),
                        "confidence": float(confidence),
                    })
            
            # Group by base photo_id (before '#') and keep best match per photo
            grouped: Dict[str, Dict[str, float]] = {}
            for r in results:
                base_id = r["id"].split("#", 1)[0]
                if base_id not in grouped or r["score"] > grouped[base_id]["score"]:
                    grouped[base_id] = {
                        "score": r["score"],
                        "confidence": r["confidence"]
                    }
            
            # Convert to list and calculate final confidence
            deduped = []
            for pid, data in grouped.items():
                score = data["score"]
                confidence = data["confidence"]
                
                # Additional confidence boost for high scores
                if score > 0.75:
                    confidence = min(1.0, confidence * 1.15)
                elif score > 0.65:
                    confidence = min(1.0, confidence * 1.1)
                elif score > 0.55:
                    confidence = min(1.0, confidence * 1.05)
                
                deduped.append({
                    "id": pid,
                    "score": score,
                    "confidence": confidence
                })
            
            # Sort by confidence first, then by score
            deduped.sort(key=lambda x: (x["confidence"], x["score"]), reverse=True)
            
            # Don't limit results - return all matches above threshold for better recall
            # The frontend can limit if needed
            
        return deduped

    def clear_event(self, event_id: str) -> bool:
        """Clear FAISS index and all data for a specific event."""
        try:
            if event_id in self.event_indices:
                # Remove the event from the indices
                del self.event_indices[event_id]
                vector_path = self._vector_path(event_id)
                meta_path = self._meta_path(event_id)
                for path in [vector_path, meta_path]:
                    try:
                        if os.path.exists(path):
                            os.remove(path)
                    except Exception:
                        pass
                logger.info(f"Cleared FAISS index for event {event_id}")
                return True
            else:
                logger.info(f"No FAISS index found for event {event_id}")
                return True  # Consider it successful if no index exists
        except Exception as e:
            logger.error(f"Error clearing FAISS index for event {event_id}: {e}")
            return False


# Singleton service
insightface_faiss_service = InsightFaceFaissService()



