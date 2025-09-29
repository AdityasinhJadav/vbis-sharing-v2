#!/usr/bin/env python3
"""
Flask Backend Installation Script
Handles dependency installation with proper error handling
"""
import subprocess
import sys
import os

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

def main():
    print("🚀 Installing Flask Backend Dependencies")
    print("=" * 50)
    
    # Step 1: Upgrade pip, setuptools, and wheel
    if not run_command("python -m pip install --upgrade pip setuptools wheel", 
                      "Upgrading pip, setuptools, and wheel"):
        print("⚠️  Continuing with existing versions...")
    
    # Step 2: Install core dependencies first
    core_deps = [
        "setuptools>=65.0.0",
        "wheel>=0.37.0", 
        "numpy>=1.21.0,<2.0.0"  # Ensure NumPy 1.x for OpenCV compatibility
    ]
    
    for dep in core_deps:
        if not run_command(f"pip install '{dep}'", f"Installing {dep.split('>=')[0]}"):
            print(f"❌ Failed to install {dep}")
            return False
    
    # Step 3: Install remaining dependencies
    remaining_deps = [
        "Flask>=2.3.0",
        "Flask-CORS>=4.0.0", 
        "opencv-python>=4.5.0",
        "Pillow>=9.0.0",
        "python-dotenv>=0.19.0",
        "requests>=2.25.0",
        "scikit-learn>=1.0.0"
    ]
    
    for dep in remaining_deps:
        if not run_command(f"pip install '{dep}'", f"Installing {dep.split('>=')[0]}"):
            print(f"⚠️  Failed to install {dep}, trying alternative...")
            # Try without version constraint
            package_name = dep.split('>=')[0]
            if not run_command(f"pip install {package_name}", f"Installing {package_name} (no version constraint)"):
                print(f"❌ Could not install {package_name}")
    
    # Step 4: Verify installation
    print("\n🔍 Verifying installation...")
    
    required_modules = [
        ('flask', 'Flask'),
        ('flask_cors', 'Flask-CORS'),
        ('cv2', 'opencv-python'),
        ('PIL', 'Pillow'),
        ('numpy', 'numpy'),
        ('dotenv', 'python-dotenv'),
        ('requests', 'requests'),
        ('sklearn', 'scikit-learn')
    ]
    
    all_good = True
    for module_name, package_name in required_modules:
        try:
            __import__(module_name)
            print(f"✅ {package_name} is working")
        except ImportError:
            print(f"❌ {package_name} is NOT working")
            all_good = False
    
    if all_good:
        print("\n🎉 All dependencies installed successfully!")
        print("🚀 You can now run: python run.py")
    else:
        print("\n⚠️  Some dependencies are missing. Try manual installation:")
        print("   pip install flask flask-cors opencv-python pillow numpy python-dotenv requests scikit-learn")
    
    return all_good

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
