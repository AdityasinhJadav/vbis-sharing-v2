#!/usr/bin/env python3
"""
Test Face Detection API
Tests the Flask backend face detection endpoints
"""

import requests
import json
import os
import sys

def test_health_endpoint():
    """Test if Flask backend is running"""
    try:
        response = requests.get('http://localhost:5000/health')
        if response.status_code == 200:
            print("Flask backend is running")
            data = response.json()
            print(f"   Status: {data.get('status', 'unknown')}")
            print(f"   Face service: {data.get('face_service', {}).get('initialized', False)}")
            return True
        else:
            print(f"Flask backend health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"Cannot connect to Flask backend: {e}")
        return False

def test_face_analysis_with_file(image_path):
    """Test face analysis with a file"""
    try:
        if not os.path.exists(image_path):
            print(f"Image file not found: {image_path}")
            return False
        
        print(f"Testing face analysis with: {image_path}")
        
        with open(image_path, 'rb') as f:
            files = {'image': f}
            response = requests.post('http://localhost:5000/api/face/analyze', files=files)
        
        print(f"   Status code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Success: {data.get('success', False)}")
            print(f"   Faces found: {data.get('face_count', 0)}")
            print(f"   Message: {data.get('message', 'No message')}")
            
            if data.get('success') and data.get('face_count', 0) > 0:
                print("Face detection working!")
                return True
            else:
                print("No faces detected")
                return False
        else:
            print(f"API request failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"Face analysis test failed: {e}")
        return False

def test_face_analysis_with_url(image_url):
    """Test face analysis with a URL"""
    try:
        print(f"Testing face analysis with URL: {image_url}")
        
        data = {'image_url': image_url}
        response = requests.post('http://localhost:5000/api/face/analyze', json=data)
        
        print(f"   Status code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"   Success: {result.get('success', False)}")
            print(f"   Faces found: {result.get('face_count', 0)}")
            print(f"   Message: {result.get('message', 'No message')}")
            
            if result.get('success') and result.get('face_count', 0) > 0:
                print("Face detection working!")
                return True
            else:
                print("No faces detected")
                return False
        else:
            print(f"API request failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"Face analysis test failed: {e}")
        return False

def main():
    print("Face Detection API Test")
    print("=" * 50)
    
    # Test 1: Health check
    print("\n1. Testing Flask backend health...")
    if not test_health_endpoint():
        print("Cannot proceed - Flask backend not running")
        print("Start Flask backend with: python app_advanced.py")
        sys.exit(1)
    
    # Test 2: Face analysis with file (if provided)
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
        print(f"\n2. Testing face analysis with file: {image_path}")
        test_face_analysis_with_file(image_path)
    else:
        print("\n2. Testing face analysis with sample URL...")
        # Use a sample image URL
        sample_url = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Vd-Orig.png/256px-Vd-Orig.png"
        test_face_analysis_with_url(sample_url)
    
    print("\nTest completed!")
    print("\nIf face detection is failing:")
    print("   • Check image quality and lighting")
    print("   • Ensure face is clearly visible")
    print("   • Try different images")
    print("   • Check Flask backend logs for errors")

if __name__ == "__main__":
    main()
