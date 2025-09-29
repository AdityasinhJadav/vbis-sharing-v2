#!/usr/bin/env python3
"""
Advanced FaceMatch Server Runner
Starts the industrial-grade face recognition backend
"""

import sys
import os
import subprocess

def check_dependencies():
    """Check if advanced face recognition dependencies are installed"""
    print("🔍 Checking advanced face recognition dependencies...")
    
    required_modules = [
        'face_recognition',
        'dlib', 
        'cv2',
        'numpy',
        'PIL',
        'flask',
        'flask_cors'
    ]
    
    missing_modules = []
    
    for module in required_modules:
        try:
            __import__(module)
            print(f"✅ {module}")
        except ImportError:
            print(f"❌ {module} - MISSING")
            missing_modules.append(module)
    
    if missing_modules:
        print(f"\n❌ Missing dependencies: {', '.join(missing_modules)}")
        print("💡 Run the installation script first:")
        print("   python install_advanced.py")
        return False
    
    print("✅ All dependencies are installed!")
    return True

def test_face_recognition():
    """Test if face recognition is working"""
    print("\n🧪 Testing face recognition functionality...")
    
    try:
        import face_recognition
        import numpy as np
        
        # Quick test
        test_image = np.zeros((100, 100, 3), dtype=np.uint8)
        face_locations = face_recognition.face_locations(test_image)
        
        print("✅ Face recognition is functional!")
        return True
        
    except Exception as e:
        print(f"❌ Face recognition test failed: {str(e)}")
        print("💡 Try reinstalling face_recognition:")
        print("   pip install --upgrade face-recognition")
        return False

def main():
    print("🚀 Starting Advanced FaceMatch Backend")
    print("=" * 50)
    print("🎯 INDUSTRIAL-GRADE AI FACE RECOGNITION")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not os.path.exists('app_advanced.py'):
        print("❌ app_advanced.py not found!")
        print("💡 Make sure you're in the flask-backend directory")
        return False
    
    # Check dependencies
    if not check_dependencies():
        return False
    
    # Test face recognition
    if not test_face_recognition():
        return False
    
    print("\n🔥 Starting Advanced Flask Server...")
    print("📡 Server will be available at: http://localhost:5000")
    print("🏥 Health check: http://localhost:5000/health")
    print("\n🎯 Advanced Features:")
    print("   • Deep Learning CNN Models")
    print("   • 128-Dimensional Face Encodings")
    print("   • Industrial-Level Accuracy")
    print("   • Multi-Scale Face Detection")
    print("   • Advanced Image Preprocessing")
    print("\n" + "=" * 50)
    
    try:
        # Start the advanced Flask application
        subprocess.run([sys.executable, 'app_advanced.py'], check=True)
        
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Server failed to start: {e}")
        return False
        
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
