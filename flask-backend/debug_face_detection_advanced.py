#!/usr/bin/env python3
"""
Advanced Face Detection Diagnostic Tool
Tests face detection with various methods and provides detailed analysis
"""

import os
import sys
import cv2
import numpy as np
from PIL import Image
import face_recognition
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FaceDetectionDiagnostic:
    def __init__(self):
        self.results = {}
        
    def test_image_loading(self, image_path):
        """Test if image can be loaded properly"""
        try:
            # Test PIL loading
            pil_image = Image.open(image_path)
            logger.info(f"✅ PIL loaded image: {pil_image.size}, mode: {pil_image.mode}")
            
            # Convert to RGB
            if pil_image.mode != 'RGB':
                pil_image = pil_image.convert('RGB')
                logger.info(f"✅ Converted to RGB: {pil_image.size}")
            
            # Convert to numpy array
            image_array = np.array(pil_image)
            logger.info(f"✅ Numpy array shape: {image_array.shape}, dtype: {image_array.dtype}")
            
            # Test OpenCV loading
            cv_image = cv2.imread(image_path)
            if cv_image is not None:
                logger.info(f"✅ OpenCV loaded image: {cv_image.shape}")
            else:
                logger.warning("❌ OpenCV failed to load image")
            
            return image_array, pil_image
            
        except Exception as e:
            logger.error(f"❌ Image loading failed: {e}")
            return None, None
    
    def test_face_detection_methods(self, image_array):
        """Test different face detection methods"""
        results = {}
        
        # Method 1: HOG model
        try:
            logger.info("🔍 Testing HOG face detection...")
            hog_faces = face_recognition.face_locations(image_array, model='hog')
            results['hog'] = len(hog_faces)
            logger.info(f"✅ HOG found {len(hog_faces)} faces")
        except Exception as e:
            logger.error(f"❌ HOG detection failed: {e}")
            results['hog'] = 0
        
        # Method 2: CNN model
        try:
            logger.info("🔍 Testing CNN face detection...")
            cnn_faces = face_recognition.face_locations(image_array, model='cnn')
            results['cnn'] = len(cnn_faces)
            logger.info(f"✅ CNN found {len(cnn_faces)} faces")
        except Exception as e:
            logger.error(f"❌ CNN detection failed: {e}")
            results['cnn'] = 0
        
        # Method 3: Multi-scale detection
        try:
            logger.info("🔍 Testing multi-scale detection...")
            multi_faces = []
            for upsample in [0, 1, 2]:
                faces = face_recognition.face_locations(
                    image_array, 
                    number_of_times_to_upsample=upsample,
                    model='hog'
                )
                multi_faces.extend(faces)
                logger.info(f"  Upsample {upsample}: {len(faces)} faces")
            results['multi_scale'] = len(multi_faces)
            logger.info(f"✅ Multi-scale found {len(multi_faces)} faces")
        except Exception as e:
            logger.error(f"❌ Multi-scale detection failed: {e}")
            results['multi_scale'] = 0
        
        return results
    
    def test_image_preprocessing(self, image_array):
        """Test different image preprocessing techniques"""
        logger.info("🔧 Testing image preprocessing...")
        
        # Original image
        original_faces = face_recognition.face_locations(image_array, model='hog')
        logger.info(f"Original image: {len(original_faces)} faces")
        
        # Resize to different sizes
        for size in [(800, 600), (1200, 900), (1600, 1200)]:
            try:
                resized = cv2.resize(image_array, size)
                faces = face_recognition.face_locations(resized, model='hog')
                logger.info(f"Resized to {size}: {len(faces)} faces")
            except Exception as e:
                logger.warning(f"Resize to {size} failed: {e}")
        
        # Convert to grayscale
        try:
            gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
            gray_rgb = cv2.cvtColor(gray, cv2.COLOR_GRAY2RGB)
            faces = face_recognition.face_locations(gray_rgb, model='hog')
            logger.info(f"Grayscale: {len(faces)} faces")
        except Exception as e:
            logger.warning(f"Grayscale conversion failed: {e}")
        
        # Enhance contrast
        try:
            enhanced = cv2.convertScaleAbs(image_array, alpha=1.2, beta=10)
            faces = face_recognition.face_locations(enhanced, model='hog')
            logger.info(f"Enhanced contrast: {len(faces)} faces")
        except Exception as e:
            logger.warning(f"Contrast enhancement failed: {e}")
    
    def test_with_sample_images(self):
        """Test with built-in sample images"""
        logger.info("🧪 Testing with sample images...")
        
        # Create a simple test image with a face-like pattern
        try:
            # Create a test image
            test_image = np.ones((400, 400, 3), dtype=np.uint8) * 128
            
            # Add some face-like features (very basic)
            cv2.circle(test_image, (200, 150), 30, (255, 255, 255), -1)  # Head
            cv2.circle(test_image, (180, 140), 5, (0, 0, 0), -1)  # Left eye
            cv2.circle(test_image, (220, 140), 5, (0, 0, 0), -1)  # Right eye
            cv2.ellipse(test_image, (200, 170), (20, 10), 0, 0, 180, (0, 0, 0), 2)  # Mouth
            
            # Test detection on this simple image
            faces = face_recognition.face_locations(test_image, model='hog')
            logger.info(f"Simple test image: {len(faces)} faces")
            
        except Exception as e:
            logger.error(f"Sample image test failed: {e}")
    
    def run_comprehensive_test(self, image_path):
        """Run comprehensive face detection test"""
        logger.info("🚀 Starting comprehensive face detection diagnostic...")
        logger.info("=" * 60)
        
        # Test 1: Image loading
        logger.info("📸 Testing image loading...")
        image_array, pil_image = self.test_image_loading(image_path)
        if image_array is None:
            logger.error("❌ Cannot proceed - image loading failed")
            return
        
        # Test 2: Face detection methods
        logger.info("\n🔍 Testing face detection methods...")
        detection_results = self.test_face_detection_methods(image_array)
        
        # Test 3: Image preprocessing
        logger.info("\n🔧 Testing image preprocessing...")
        self.test_image_preprocessing(image_array)
        
        # Test 4: Sample images
        logger.info("\n🧪 Testing with sample images...")
        self.test_with_sample_images()
        
        # Summary
        logger.info("\n📊 DIAGNOSTIC SUMMARY")
        logger.info("=" * 60)
        logger.info(f"Image: {image_path}")
        logger.info(f"Image size: {image_array.shape}")
        logger.info(f"Detection results:")
        for method, count in detection_results.items():
            status = "✅" if count > 0 else "❌"
            logger.info(f"  {status} {method}: {count} faces")
        
        # Recommendations
        logger.info("\n💡 RECOMMENDATIONS")
        logger.info("=" * 60)
        if all(count == 0 for count in detection_results.values()):
            logger.warning("❌ No faces detected with any method!")
            logger.info("Try:")
            logger.info("  • Use a different image with a clear face")
            logger.info("  • Ensure good lighting in the image")
            logger.info("  • Make sure the face is front-facing")
            logger.info("  • Try a higher resolution image")
        else:
            best_method = max(detection_results.items(), key=lambda x: x[1])
            logger.info(f"✅ Best method: {best_method[0]} ({best_method[1]} faces)")
            logger.info("✅ Face detection is working!")

def main():
    if len(sys.argv) != 2:
        print("Usage: python debug_face_detection_advanced.py <image_path>")
        print("Example: python debug_face_detection_advanced.py test_image.jpg")
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    if not os.path.exists(image_path):
        print(f"❌ Image file not found: {image_path}")
        sys.exit(1)
    
    diagnostic = FaceDetectionDiagnostic()
    diagnostic.run_comprehensive_test(image_path)

if __name__ == "__main__":
    main()
