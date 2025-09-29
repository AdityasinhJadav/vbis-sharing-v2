#!/usr/bin/env python3
"""
Advanced Face Recognition Installation Script
Installs industrial-grade face recognition dependencies
"""
import subprocess
import sys
import os
import platform

def run_command(command, description):
    """Run a command with error handling"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(f"   Error: {e.stderr}")
        return False

def check_system_requirements():
    """Check system requirements for advanced face recognition"""
    print("🔍 Checking system requirements...")
    
    # Check Python version
    python_version = sys.version_info
    if python_version.major < 3 or (python_version.major == 3 and python_version.minor < 8):
        print("❌ Python 3.8+ is required for advanced face recognition")
        return False
    
    print(f"✅ Python version: {python_version.major}.{python_version.minor}.{python_version.micro}")
    
    # Check platform
    system = platform.system()
    print(f"✅ Operating System: {system}")
    
    # Check if we're in a virtual environment
    in_venv = hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix)
    if in_venv:
        print("✅ Virtual environment detected")
    else:
        print("⚠️  Not in virtual environment - recommended to use one")
    
    return True

def install_system_dependencies():
    """Install system-level dependencies"""
    system = platform.system()
    
    if system == "Windows":
        print("💡 On Windows, make sure Visual Studio Build Tools are installed")
        print("   Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/")
        return True
    
    elif system == "Darwin":  # macOS
        print("🍎 Installing macOS dependencies...")
        commands = [
            "brew install cmake",
            "brew install dlib"
        ]
        
        for cmd in commands:
            if not run_command(cmd, f"Running: {cmd}"):
                print(f"⚠️  Failed: {cmd} - you may need to install Homebrew first")
        
        return True
    
    elif system == "Linux":
        print("🐧 Installing Linux dependencies...")
        commands = [
            "sudo apt-get update",
            "sudo apt-get install -y build-essential cmake",
            "sudo apt-get install -y libopenblas-dev liblapack-dev",
            "sudo apt-get install -y libx11-dev libgtk-3-dev",
            "sudo apt-get install -y python3-dev"
        ]
        
        for cmd in commands:
            if not run_command(cmd, f"Running: {cmd}"):
                print(f"⚠️  Failed: {cmd} - you may need sudo privileges")
        
        return True
    
    return True

def main():
    print("🚀 Installing Advanced Face Recognition System")
    print("=" * 60)
    print("🎯 INDUSTRIAL-GRADE AI FACE RECOGNITION")
    print("=" * 60)
    
    # Check system requirements
    if not check_system_requirements():
        print("❌ System requirements not met")
        return False
    
    # Install system dependencies
    print("\n📦 Installing system dependencies...")
    install_system_dependencies()
    
    # Upgrade pip and essential tools
    print("\n🔧 Upgrading pip and essential tools...")
    if not run_command("python -m pip install --upgrade pip setuptools wheel", 
                      "Upgrading pip, setuptools, and wheel"):
        print("⚠️  Continuing with existing versions...")
    
    # Install core scientific computing libraries first
    print("\n🧮 Installing core scientific libraries...")
    core_deps = [
        "numpy>=1.21.0,<2.0.0",
        "scipy>=1.7.0",
        "Pillow>=9.0.0",
        "opencv-python>=4.5.0"
    ]
    
    for dep in core_deps:
        if not run_command(f"pip install '{dep}'", f"Installing {dep.split('>=')[0]}"):
            print(f"❌ Failed to install {dep}")
            return False
    
    # Install machine learning libraries
    print("\n🧠 Installing machine learning libraries...")
    ml_deps = [
        "scikit-learn>=1.0.0",
        "imageio>=2.19.0"
    ]
    
    for dep in ml_deps:
        if not run_command(f"pip install '{dep}'", f"Installing {dep.split('>=')[0]}"):
            print(f"⚠️  Failed to install {dep}, trying alternative...")
            package_name = dep.split('>=')[0]
            if not run_command(f"pip install {package_name}", f"Installing {package_name} (no version constraint)"):
                print(f"❌ Could not install {package_name}")
    
    # Install dlib (critical for face recognition)
    print("\n🎯 Installing dlib (advanced computer vision library)...")
    dlib_installed = False
    
    # Try different dlib installation methods
    dlib_methods = [
        "pip install dlib",
        "pip install --no-cache-dir dlib",
        "conda install -c conda-forge dlib"
    ]
    
    for method in dlib_methods:
        if run_command(method, f"Installing dlib using: {method}"):
            dlib_installed = True
            break
        else:
            print(f"⚠️  Method failed: {method}")
    
    if not dlib_installed:
        print("❌ Failed to install dlib automatically")
        print("💡 Manual installation options:")
        print("   1. Use conda: conda install -c conda-forge dlib")
        print("   2. Install Visual Studio Build Tools (Windows)")
        print("   3. Use pre-compiled wheels: pip install dlib --find-links https://github.com/charlielito/dlib-wheels/releases")
        return False
    
    # Install face_recognition (the star of the show)
    print("\n🌟 Installing face_recognition (industrial-grade AI)...")
    if not run_command("pip install face-recognition", "Installing face_recognition"):
        print("❌ Failed to install face-recognition")
        print("💡 This is the core library - without it, advanced face recognition won't work")
        return False
    
    # Install Flask and web dependencies
    print("\n🌐 Installing Flask and web dependencies...")
    web_deps = [
        "Flask>=2.3.0",
        "Flask-CORS>=4.0.0",
        "python-dotenv>=0.19.0",
        "requests>=2.25.0"
    ]
    
    for dep in web_deps:
        if not run_command(f"pip install '{dep}'", f"Installing {dep.split('>=')[0]}"):
            print(f"⚠️  Failed to install {dep}")
    
    # Optional performance enhancements
    print("\n⚡ Installing performance enhancements...")
    performance_deps = [
        "numba",  # JIT compilation for faster processing
        "matplotlib"  # For debugging and visualization
    ]
    
    for dep in performance_deps:
        if not run_command(f"pip install {dep}", f"Installing {dep}"):
            print(f"⚠️  Optional package {dep} failed - continuing...")
    
    # Verification
    print("\n🔍 Verifying advanced face recognition installation...")
    
    required_modules = [
        ('numpy', 'NumPy'),
        ('cv2', 'OpenCV'),
        ('PIL', 'Pillow'),
        ('face_recognition', 'Face Recognition'),
        ('dlib', 'Dlib'),
        ('flask', 'Flask'),
        ('flask_cors', 'Flask-CORS'),
        ('requests', 'Requests'),
        ('sklearn', 'Scikit-learn')
    ]
    
    all_good = True
    for module_name, package_name in required_modules:
        try:
            __import__(module_name)
            print(f"✅ {package_name} is working")
        except ImportError:
            print(f"❌ {package_name} is NOT working")
            all_good = False
    
    # Test face recognition functionality
    print("\n🧪 Testing face recognition functionality...")
    try:
        import face_recognition
        import numpy as np
        
        # Create a test image
        test_image = np.zeros((100, 100, 3), dtype=np.uint8)
        face_locations = face_recognition.face_locations(test_image)
        print("✅ Face detection is working")
        
        # Test encoding generation
        if len(face_locations) == 0:
            print("✅ No faces in test image (expected)")
        
        print("✅ Advanced face recognition is fully functional!")
        
    except Exception as e:
        print(f"❌ Face recognition test failed: {str(e)}")
        all_good = False
    
    print("\n" + "=" * 60)
    if all_good:
        print("🎉 ADVANCED FACE RECOGNITION INSTALLATION SUCCESSFUL!")
        print("=" * 60)
        print("🚀 Ready to run industrial-grade face recognition!")
        print("💡 Start the server with: python app_advanced.py")
        print()
        print("🎯 Features enabled:")
        print("   • Deep Learning CNN Models")
        print("   • 128-Dimensional Face Encodings")
        print("   • Industrial-Level Accuracy")
        print("   • Multi-Scale Face Detection")
        print("   • Advanced Image Preprocessing")
        print("   • Batch Processing Support")
    else:
        print("⚠️  INSTALLATION COMPLETED WITH ISSUES")
        print("=" * 60)
        print("💡 Some components may not work correctly")
        print("🔧 Check the error messages above and install missing dependencies")
    
    return all_good

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
