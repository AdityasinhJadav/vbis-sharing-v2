"""
Advanced Face Recognition Service using state-of-the-art deep learning models
Provides industrial-level accuracy for face detection, encoding, and matching
"""

import face_recognition
import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
import io
import requests
import logging
from typing import List, Dict, Optional, Tuple, Union
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import os


class _LRUCache:
    """Simple in-memory LRU cache with TTL for descriptors keyed by image URL."""
    def __init__(self, capacity: int = 1000, ttl_seconds: int = 3600):
        self.capacity = capacity
        self.ttl = ttl_seconds
        self.store: Dict[str, Tuple[float, object]] = {}
        self.order: List[str] = []

    def get(self, key: str):
        now = time.time()
        if key in self.store:
            ts, value = self.store[key]
            if now - ts <= self.ttl:
                # refresh order
                if key in self.order:
                    self.order.remove(key)
                self.order.append(key)
                return value
            # expired
            self.delete(key)
        return None

    def set(self, key: str, value: object):
        now = time.time()
        if key in self.store:
            self.order.remove(key)
        elif len(self.order) >= self.capacity:
            evict = self.order.pop(0)
            self.store.pop(evict, None)
        self.store[key] = (now, value)
        self.order.append(key)

    def delete(self, key: str):
        self.store.pop(key, None)
        if key in self.order:
            self.order.remove(key)


class AdvancedFaceRecognitionService:
    """
    Industrial-grade face recognition service using deep learning models.
    Features:
    - High accuracy face detection using CNN
    - 128-dimensional face encodings
    - Multiple face detection models
    - Robust preprocessing
    - Batch processing optimization
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.initialized = False
        # Default to CNN for better accuracy; can be overridden
        self.face_detection_model = 'cnn'  # 'hog' for speed, 'cnn' for accuracy
        self.num_jitters = 1  # Number of times to re-sample for encoding
        self.tolerance = 0.6  # Face matching tolerance (lower = stricter)
        self.descriptor_cache = _LRUCache(capacity=2000, ttl_seconds=3600)
        
    def initialize(self) -> bool:
        """Initialize the advanced face recognition service"""
        try:
            # Test face_recognition library
            test_image = np.zeros((100, 100, 3), dtype=np.uint8)
            _ = face_recognition.face_locations(test_image)
            
            self.initialized = True
            self.logger.info("✅ Advanced Face Recognition Service initialized successfully")
            self.logger.info(f"🔧 Configuration: model={self.face_detection_model}, jitters={self.num_jitters}, tolerance={self.tolerance}")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize advanced face recognition: {str(e)}")
            self.logger.error("💡 Make sure to install: pip install face-recognition dlib")
            return False
    
    def _preprocess_image(self, image_array: np.ndarray) -> np.ndarray:
        """
        Advanced image preprocessing for better face detection
        """
        try:
            # Convert to PIL for advanced processing
            if image_array.dtype != np.uint8:
                image_array = (image_array * 255).astype(np.uint8)
            
            img_pil = Image.fromarray(image_array)
            
            # Resize if too large (performance optimization)
            max_size = 1024
            if max(img_pil.size) > max_size:
                ratio = max_size / max(img_pil.size)
                new_size = tuple(int(dim * ratio) for dim in img_pil.size)
                img_pil = img_pil.resize(new_size, Image.Resampling.LANCZOS)
            
            # Enhance image quality
            # 1. Contrast enhancement
            enhancer = ImageEnhance.Contrast(img_pil)
            img_pil = enhancer.enhance(1.1)
            
            # 2. Brightness adjustment
            enhancer = ImageEnhance.Brightness(img_pil)
            img_pil = enhancer.enhance(1.05)
            
            # 3. Sharpness enhancement
            enhancer = ImageEnhance.Sharpness(img_pil)
            img_pil = enhancer.enhance(1.1)
            
            # Convert back to RGB array
            processed_array = np.array(img_pil)
            
            # Ensure RGB format
            if len(processed_array.shape) == 3 and processed_array.shape[2] == 3:
                return processed_array
            elif len(processed_array.shape) == 3 and processed_array.shape[2] == 4:
                # Convert RGBA to RGB
                return processed_array[:, :, :3]
            else:
                # Convert grayscale to RGB
                return cv2.cvtColor(processed_array, cv2.COLOR_GRAY2RGB)
                
        except Exception as e:
            self.logger.error(f"Error preprocessing image: {str(e)}")
            return image_array
    
    def _detect_faces_multiple_methods(self, image_rgb: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """
        Use multiple detection methods for robust face detection
        Returns list of face locations as (top, right, bottom, left)
        """
        face_locations = []
        
        # Prioritize configured model first
        try:
            primary = face_recognition.face_locations(image_rgb, model=self.face_detection_model)
            face_locations.extend(primary)
        except Exception as e:
            self.logger.warning(f"Primary face detection ({self.face_detection_model}) failed: {str(e)}")
        
        # Fallback to the other model if no faces found
        if len(face_locations) == 0:
            try:
                fallback_model = 'hog' if self.face_detection_model == 'cnn' else 'cnn'
                fallback = face_recognition.face_locations(image_rgb, model=fallback_model)
                face_locations.extend(fallback)
            except Exception as e:
                self.logger.warning(f"Fallback face detection failed: {str(e)}")
        
        # Method 3: Multi-scale detection if still no faces found
        if len(face_locations) == 0:
            try:
                # Try with different number of upsampling
                for upsample in [0, 1, 2]:
                    locations = face_recognition.face_locations(
                        image_rgb, 
                        number_of_times_to_upsample=upsample,
                        model='hog'
                    )
                    if locations:
                        face_locations.extend(locations)
                        break
            except Exception as e:
                self.logger.warning(f"Multi-scale face detection failed: {str(e)}")
        
        # Remove duplicate detections
        if len(face_locations) > 1:
            face_locations = self._remove_duplicate_faces(face_locations)
        
        return face_locations
    
    def _remove_duplicate_faces(self, face_locations: List[Tuple[int, int, int, int]]) -> List[Tuple[int, int, int, int]]:
        """Remove overlapping face detections"""
        if len(face_locations) <= 1:
            return face_locations
        
        # Calculate areas and remove smaller overlapping faces
        unique_faces = []
        for face in face_locations:
            top, right, bottom, left = face
            is_duplicate = False
            
            for existing_face in unique_faces:
                ex_top, ex_right, ex_bottom, ex_left = existing_face
                
                # Calculate overlap
                overlap_area = max(0, min(right, ex_right) - max(left, ex_left)) * \
                              max(0, min(bottom, ex_bottom) - max(top, ex_top))
                
                face_area = (right - left) * (bottom - top)
                existing_area = (ex_right - ex_left) * (ex_bottom - ex_top)
                
                if overlap_area > 0.3 * min(face_area, existing_area):
                    is_duplicate = True
                    break
            
            if not is_duplicate:
                unique_faces.append(face)
        
        return unique_faces
    
    def load_image_from_file(self, image_file) -> Optional[np.ndarray]:
        """Load and preprocess image from uploaded file"""
        try:
            # Read image from file-like object
            if hasattr(image_file, 'read'):
                image_data = image_file.read()
                image_file.seek(0)  # Reset file pointer
            else:
                image_data = image_file
            
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            image_array = np.array(image)
            
            # Preprocess for better detection
            processed_image = self._preprocess_image(image_array)
            
            return processed_image
            
        except Exception as e:
            self.logger.error(f"Error loading image from file: {str(e)}")
            return None
    
    def load_image_from_url(self, image_url: str) -> Optional[np.ndarray]:
        """Load and preprocess image from URL"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            # If Cloudinary URL without transformation, request a smaller rendition for speed
            optimized_url = image_url
            try:
                if 'res.cloudinary.com' in image_url and '/image/upload/' in image_url and ('/w_' not in image_url):
                    optimized_url = image_url.replace('/image/upload/', '/image/upload/w_640,q_75,c_limit,fl_lossy/')
            except Exception:
                pass

            response = requests.get(optimized_url, timeout=30, headers=headers)
            response.raise_for_status()
            
            image = Image.open(io.BytesIO(response.content))
            
            # Convert to RGB
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            image_array = np.array(image)
            
            # Preprocess for better detection
            processed_image = self._preprocess_image(image_array)
            
            return processed_image
            
        except Exception as e:
            self.logger.error(f"Error loading image from URL {image_url}: {str(e)}")
            return None
    
    def get_face_descriptor(self, image_input: Union[np.ndarray, object]) -> List[float]:
        """
        Extract high-quality 128-dimensional face encoding from image
        
        Args:
            image_input: Image file object or numpy array
            
        Returns:
            List of 128 float values representing the face encoding
        """
        if not self.initialized:
            raise Exception("Advanced face recognition service not initialized")
        
        try:
            # Load image
            if isinstance(image_input, np.ndarray):
                image_rgb = self._preprocess_image(image_input)
            else:
                image_rgb = self.load_image_from_file(image_input)
                if image_rgb is None:
                    raise Exception("Could not load image")
            
            self.logger.info(f"🔍 Analyzing image of shape: {image_rgb.shape}")
            
            # Detect faces using multiple methods
            face_locations = self._detect_faces_multiple_methods(image_rgb)
            
            if len(face_locations) == 0:
                raise Exception("No faces found in the image. Please ensure the image contains a clear, front-facing face with good lighting.")
            
            self.logger.info(f"✅ Found {len(face_locations)} face(s) in image")
            
            # Get face encodings for all detected faces
            face_encodings = face_recognition.face_encodings(
                image_rgb, 
                face_locations, 
                num_jitters=self.num_jitters,
                model='large'  # Use the more accurate model
            )
            
            if len(face_encodings) == 0:
                raise Exception("Could not generate face encoding. Face might be too blurry or at a bad angle.")
            
            # Use the largest face (most prominent in image)
            if len(face_locations) > 1:
                # Calculate face sizes and use the largest one
                face_sizes = [(bottom - top) * (right - left) for top, right, bottom, left in face_locations]
                largest_face_idx = np.argmax(face_sizes)
                selected_encoding = face_encodings[largest_face_idx]
                self.logger.info(f"🎯 Selected largest face (index {largest_face_idx}) from {len(face_locations)} detected faces")
            else:
                selected_encoding = face_encodings[0]
            
            # Convert to list for JSON serialization
            encoding_list = selected_encoding.tolist()
            
            self.logger.info(f"✅ Successfully extracted 128-dimensional face encoding")
            return encoding_list
            
        except Exception as e:
            self.logger.error(f"Error getting face descriptor: {str(e)}")
            raise Exception(f"Failed to analyze face: {str(e)}")
    
    def get_face_descriptors_from_url(self, image_url: str) -> Optional[List[List[float]]]:
        """
        Extract face encodings from image URL
        
        Returns:
            List of face encodings (each encoding is a list of 128 floats)
        """
        try:
            # Cache by URL to avoid repeated downloads/compute in-session
            cached = self.descriptor_cache.get(image_url)
            if cached is not None:
                return cached

            image_rgb = self.load_image_from_url(image_url)
            if image_rgb is None:
                return None
            
            # Detect faces
            face_locations = self._detect_faces_multiple_methods(image_rgb)
            
            if len(face_locations) == 0:
                return None
            
            # Get encodings for all faces
            face_encodings = face_recognition.face_encodings(
                image_rgb, 
                face_locations, 
                num_jitters=self.num_jitters,
                model='large'
            )
            
            if len(face_encodings) == 0:
                return None
            
            # Convert all encodings to lists
            encodings_list = [encoding.tolist() for encoding in face_encodings]
            self.descriptor_cache.set(image_url, encodings_list)
            
            return encodings_list
            
        except Exception as e:
            self.logger.warning(f"Error getting face descriptors from URL: {str(e)}")
            return None
    
    def compare_faces(self, descriptor1: List[float], descriptor2: List[float], tolerance: Optional[float] = None) -> Dict:
        """
        Compare two face descriptors with high accuracy
        
        Args:
            descriptor1: First face encoding
            descriptor2: Second face encoding
            tolerance: Matching tolerance (lower = stricter)
            
        Returns:
            Dictionary with comparison results
        """
        try:
            if tolerance is None:
                tolerance = self.tolerance
            
            # Convert to numpy arrays
            encoding1 = np.array(descriptor1)
            encoding2 = np.array(descriptor2)
            
            # Calculate Euclidean distance
            distance = np.linalg.norm(encoding1 - encoding2)
            
            # Calculate cosine similarity
            cosine_similarity = np.dot(encoding1, encoding2) / (
                np.linalg.norm(encoding1) * np.linalg.norm(encoding2)
            )
            
            # Determine if faces match
            is_match = distance <= tolerance
            
            # Calculate confidence score (0-1, higher is better)
            confidence = max(0, 1 - (distance / 1.2))  # Normalize distance to confidence
            
            return {
                'is_match': bool(is_match),
                'distance': float(distance),
                'similarity': float(cosine_similarity),
                'confidence': float(confidence),
                'tolerance_used': float(tolerance)
            }
            
        except Exception as e:
            self.logger.error(f"Error comparing faces: {str(e)}")
            return {
                'is_match': False,
                'distance': 999.0,
                'similarity': 0.0,
                'confidence': 0.0,
                'tolerance_used': float(tolerance or self.tolerance)
            }
    
    def find_matching_photos(self, user_descriptor: List[float], photo_collection: List[Dict], tolerance: Optional[float] = None) -> List[Dict]:
        """
        Find photos that match the user's face with high accuracy
        
        Args:
            user_descriptor: User's face encoding
            photo_collection: List of photo objects with descriptors
            tolerance: Matching tolerance (default: 0.6, lower = stricter)
            
        Returns:
            List of matching photos with confidence scores
        """
        if not self.initialized:
            raise Exception("Advanced face recognition service not initialized")
        
        try:
            if tolerance is None:
                tolerance = self.tolerance
            
            matched_photos = []
            comparisons_made = 0
            
            self.logger.info(f"🎯 Starting face matching with tolerance: {tolerance}")
            
            for photo_data in photo_collection:
                if 'descriptor' not in photo_data or not photo_data['descriptor']:
                    continue
                
                comparisons_made += 1
                
                # Compare faces using advanced algorithm
                comparison = self.compare_faces(user_descriptor, photo_data['descriptor'], tolerance)
                
                if comparison['is_match']:
                    # Only include high-confidence matches
                    if comparison['confidence'] >= 0.4:  # Minimum confidence threshold
                        matched_photos.append({
                            "id": photo_data['id'],
                            "score": comparison['confidence'],
                            "similarity": comparison['similarity'],
                            "distance": comparison['distance'],
                            "cloudinaryUrl": photo_data.get('cloudinaryUrl', ''),
                            "originalName": photo_data.get('originalName', ''),
                            "uploadedBy": photo_data.get('uploadedBy', ''),
                            "uploadedAt": photo_data.get('uploadedAt', ''),
                            "tolerance_used": comparison['tolerance_used']
                        })
            
            # Sort by confidence score (highest first)
            matched_photos.sort(key=lambda x: x['score'], reverse=True)
            
            self.logger.info(f"✅ Face matching completed:")
            self.logger.info(f"   - Photos analyzed: {len(photo_collection)}")
            self.logger.info(f"   - Comparisons made: {comparisons_made}")
            self.logger.info(f"   - Matches found: {len(matched_photos)}")
            self.logger.info(f"   - Tolerance used: {tolerance}")
            
            if matched_photos:
                avg_confidence = sum(photo['score'] for photo in matched_photos) / len(matched_photos)
                self.logger.info(f"   - Average confidence: {avg_confidence:.3f}")
                self.logger.info(f"   - Best match confidence: {matched_photos[0]['score']:.3f}")
            
            return matched_photos
            
        except Exception as e:
            self.logger.error(f"Error finding matching photos: {str(e)}")
            raise Exception(f"Failed to find matching photos: {str(e)}")
    
    def batch_analyze_photos(self, photo_urls: List[str]) -> Dict:
        """
        Efficiently analyze multiple photos in batch
        
        Args:
            photo_urls: List of image URLs to analyze
            
        Returns:
            Dictionary with analysis results
        """
        results = {
            'processed': 0,
            'faces_found': 0,
            'failed': 0,
            'photo_data': []
        }
        
        def _process(idx_url):
            i, url = idx_url
            try:
                self.logger.info(f"📷 Processing photo {i+1}/{len(photo_urls)}")
                descriptors = self.get_face_descriptors_from_url(url)
                return (True, url, descriptors)
            except Exception as e:
                self.logger.warning(f"Failed to process photo {i+1}: {str(e)}")
                return (False, url, None)

        max_workers = min(8, max(2, (os.cpu_count() or 4)))
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            for ok, url, descriptors in executor.map(_process, list(enumerate(photo_urls))):
                results['processed'] += 1
                if ok and descriptors and len(descriptors) > 0:
                    results['faces_found'] += 1
                    results['photo_data'].append({
                        'url': url,
                        'descriptors': descriptors,
                        'face_count': len(descriptors)
                    })
                elif not ok:
                    results['failed'] += 1
        
        return results


# Global service instance
advanced_face_service = AdvancedFaceRecognitionService()
