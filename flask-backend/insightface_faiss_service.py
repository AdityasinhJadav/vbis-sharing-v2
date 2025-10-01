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
        logger.info("InsightFace initialized with providers=%s det_size=%s", providers, det_size)
        return True

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

    def compute_embeddings_from_url(self, image_url: str) -> Optional[List[np.ndarray]]:
        """Return embeddings for all detected faces in the image URL."""
        if not self.initialized:
            self.initialize()
        img = self._download_image(image_url)
        if img is None:
            return None
        faces = self.app.get(img)
        if not faces:
            return None
        embeddings: List[np.ndarray] = []
        for f in faces:
            emb = f.normed_embedding if hasattr(f, 'normed_embedding') else f.embedding
            vec = np.array(emb, dtype=np.float32)
            norm = np.linalg.norm(vec) + 1e-8
            vec = vec / norm
            embeddings.append(vec)
        return embeddings

    def get_face_embedding(self, image_file) -> Optional[np.ndarray]:
        """Compute ArcFace embedding from an uploaded file-like object."""
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
            face = max(faces, key=lambda f: getattr(f, 'det_score', 0.0))
            emb = face.normed_embedding if hasattr(face, 'normed_embedding') else face.embedding
            vec = np.array(emb, dtype=np.float32)
            norm = np.linalg.norm(vec) + 1e-8
            vec = vec / norm
            return vec
        except Exception:
            return None

    def _get_or_create_index(self, event_id: str, dim: int = 512):
        import faiss  # type: ignore
        entry = self.event_indices.get(event_id)
        if entry is None:
            index = faiss.IndexFlatIP(dim)
            self.event_indices[event_id] = {"index": index, "ids": [], "vectors": np.zeros((0, dim), dtype=np.float32)}
            entry = self.event_indices[event_id]
        return entry

    def ingest(self, event_id: str, photo_id: str, image_url: Optional[str] = None, embedding: Optional[List[float]] = None) -> bool:
        if not self.initialized:
            self.initialize()
        vectors_to_add: List[np.ndarray] = []
        ids_to_add: List[str] = []
        if embedding is None:
            if not image_url:
                raise ValueError("Either embedding or image_url must be provided")
            # Ingest all faces in the image
            vecs = self.compute_embeddings_from_url(image_url)
            if not vecs:
                return False
            for i, v in enumerate(vecs):
                vectors_to_add.append(v.reshape(1, -1))
                ids_to_add.append(f"{photo_id}#{i}")
        else:
            vec = np.asarray(embedding, dtype=np.float32)
            norm = np.linalg.norm(vec) + 1e-8
            vec = vec / norm
            vectors_to_add.append(vec.reshape(1, -1))
            ids_to_add.append(photo_id)

        # Initialize index based on dimension
        entry = self._get_or_create_index(event_id, dim=vectors_to_add[0].shape[1])
        index = entry["index"]
        ids: List[str] = entry["ids"]
        vectors: np.ndarray = entry["vectors"]

        # Append all vectors
        for v, pid in zip(vectors_to_add, ids_to_add):
            vectors = np.vstack([vectors, v])
            index.add(v)
            ids.append(pid)

        entry["vectors"] = vectors
        logger.info("Ingested %d face(s) for photo %s into event %s (index size=%d)", len(ids_to_add), photo_id, event_id, len(ids))
        return True

    def match(self, event_id: str, query_embedding: List[float], top_k: int = 20, threshold: float = 0.35):
        if not self.initialized:
            self.initialize()
        entry = self.event_indices.get(event_id)
        if entry is None or len(entry["ids"]) == 0:
            return []
        index = entry["index"]
        ids: List[str] = entry["ids"]
        q = np.asarray(query_embedding, dtype=np.float32)
        q = q / (np.linalg.norm(q) + 1e-8)

        D, I = index.search(q.reshape(1, -1), min(top_k, len(ids)))
        results = []
        for score, idx in zip(D[0].tolist(), I[0].tolist()):
            if idx < 0:
                continue
            # cosine similarity in [-1,1]; keep above threshold
            if score >= threshold:
                results.append({
                    "id": ids[idx],
                    "score": float(score),
                })
        # Group by base photo_id (before '#') and keep max score per photo
        grouped: Dict[str, float] = {}
        for r in results:
            base_id = r["id"].split("#", 1)[0]
            grouped[base_id] = max(grouped.get(base_id, 0.0), r["score"])
        deduped = [{"id": pid, "score": sc} for pid, sc in grouped.items()]
        # Sort by score desc
        deduped.sort(key=lambda x: x["score"], reverse=True)
        return deduped


# Singleton service
insightface_faiss_service = InsightFaceFaissService()



