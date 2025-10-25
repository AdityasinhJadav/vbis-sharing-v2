#!/usr/bin/env python3
"""
Simple Face Detection Test
Tests face detection without Flask
"""

import numpy as np
import face_recognition
from PIL import Image
import io

def test_face_detection():
    """Test basic face detection functionality"""
    print("Testing face detection...")
    
    # Create a simple test image with a face-like pattern
    # This is a very basic test - real images will work better
    test_image = np.ones((400, 400, 3), dtype=np.uint8) * 128
    
    # Add some basic face-like features
    import cv2
    cv2.circle(test_image, (200, 150), 50, (255, 255, 255), -1)  # Head
    cv2.circle(test_image, (180, 130), 8, (0, 0, 0), -1)  # Left eye
    cv2.circle(test_image, (220, 130), 8, (0, 0, 0), -1)  # Right eye
    cv2.ellipse(test_image, (200, 180), (25, 15), 0, 0, 180, (0, 0, 0), 3)  # Mouth
    
    print(f"Test image shape: {test_image.shape}")
    
    # Test HOG model
    try:
        print("Testing HOG model...")
        hog_faces = face_recognition.face_locations(test_image, model='hog')
        print(f"HOG found {len(hog_faces)} faces")
    except Exception as e:
        print(f"HOG failed: {e}")
    
    # Test CNN model
    try:
        print("Testing CNN model...")
        cnn_faces = face_recognition.face_locations(test_image, model='cnn')
        print(f"CNN found {len(cnn_faces)} faces")
    except Exception as e:
        print(f"CNN failed: {e}")
    
    # Test with a real image if available
    print("\nTesting with real image...")
    try:
        # Try to load a sample image
        import requests
        response = requests.get("https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Vd-Orig.png/256px-Vd-Orig.png")
        if response.status_code == 200:
            image = Image.open(io.BytesIO(response.content))
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            image_array = np.array(image)
            print(f"Real image shape: {image_array.shape}")
            
            # Test with real image
            real_faces = face_recognition.face_locations(image_array, model='hog')
            print(f"Real image - HOG found {len(real_faces)} faces")
            
            real_faces_cnn = face_recognition.face_locations(image_array, model='cnn')
            print(f"Real image - CNN found {len(real_faces_cnn)} faces")
            
        else:
            print("Could not download test image")
            
    except Exception as e:
        print(f"Real image test failed: {e}")

if __name__ == "__main__":
    test_face_detection()
