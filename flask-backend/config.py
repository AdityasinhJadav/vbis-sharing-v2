"""
Configuration management with validation
"""
import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Config:
    """Application configuration with defaults and validation"""
    
    # Flask settings
    FLASK_ENV: str = os.getenv('FLASK_ENV', 'development')
    FLASK_DEBUG: bool = os.getenv('FLASK_DEBUG', '0') == '1'
    PORT: int = int(os.getenv('PORT', 5000))
    HOST: str = os.getenv('HOST', '0.0.0.0')
    
    # Security
    FLASK_SERVICE_SECRET: Optional[str] = os.getenv('FLASK_SERVICE_SECRET')
    
    # Face recognition settings
    MODEL_NAME: str = os.getenv('MODEL_NAME', 'buffalo_l')
    DET_SIZE: tuple = tuple(map(int, os.getenv('DET_SIZE', '640,640').split(',')))
    DEFAULT_THRESHOLD: float = float(os.getenv('DEFAULT_THRESHOLD', '0.4'))
    MAX_TOP_K: int = int(os.getenv('MAX_TOP_K', '50'))
    
    # FAISS settings
    FAISS_INDEX_PATH: str = os.getenv('FAISS_INDEX_PATH', './faiss_store')
    FAISS_AUTO_SAVE_INTERVAL: int = int(os.getenv('FAISS_AUTO_SAVE_INTERVAL', '300'))  # 5 minutes
    
    # Rate limiting
    RATE_LIMIT_ANALYZE: int = int(os.getenv('RATE_LIMIT_ANALYZE', '20'))
    RATE_LIMIT_MATCH: int = int(os.getenv('RATE_LIMIT_MATCH', '10'))
    RATE_LIMIT_INGEST: int = int(os.getenv('RATE_LIMIT_INGEST', '30'))
    
    # Cloudinary (optional)
    CLOUDINARY_CLOUD_NAME: Optional[str] = os.getenv('CLOUDINARY_CLOUD_NAME')
    CLOUDINARY_API_KEY: Optional[str] = os.getenv('CLOUDINARY_API_KEY')
    CLOUDINARY_API_SECRET: Optional[str] = os.getenv('CLOUDINARY_API_SECRET')
    
    # GPU settings
    GPU_ENABLED: bool = os.getenv('GPU_ENABLED', 'false').lower() == 'true'
    
    @classmethod
    def validate(cls) -> list:
        """Validate configuration and return list of warnings/errors"""
        warnings = []
        
        if not cls.FLASK_SERVICE_SECRET:
            warnings.append("FLASK_SERVICE_SECRET is not set. Service authentication may not work properly.")
        
        if cls.FLASK_DEBUG and cls.FLASK_ENV == 'production':
            warnings.append("WARNING: Debug mode is enabled in production!")
        
        if cls.DEFAULT_THRESHOLD < 0 or cls.DEFAULT_THRESHOLD > 1:
            warnings.append(f"DEFAULT_THRESHOLD should be between 0 and 1, got {cls.DEFAULT_THRESHOLD}")
        
        return warnings
    
    @classmethod
    def get_providers(cls):
        """Get ONNX runtime providers based on configuration"""
        providers = ["CPUExecutionProvider"]
        
        if cls.GPU_ENABLED:
            try:
                import onnxruntime as ort
                available = ort.get_available_providers()
                if "CUDAExecutionProvider" in available:
                    providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
            except Exception:
                pass
        
        return providers


# Create config instance
config = Config()

# Validate on import
warnings = config.validate()
if warnings:
    import logging
    logger = logging.getLogger(__name__)
    for warning in warnings:
        logger.warning(warning)

