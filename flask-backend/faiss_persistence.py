"""
FAISS index persistence to disk
"""

import os
import pickle
import logging
from pathlib import Path
import faiss

logger = logging.getLogger(__name__)

# Directory for storing FAISS indices
PERSISTENCE_DIR = Path(os.getenv('FAISS_PERSISTENCE_DIR', './faiss_indices'))

def ensure_persistence_dir():
    """Ensure the persistence directory exists"""
    PERSISTENCE_DIR.mkdir(parents=True, exist_ok=True)
    return PERSISTENCE_DIR

def get_index_path(event_id):
    """Get the file path for an event's FAISS index"""
    ensure_persistence_dir()
    return PERSISTENCE_DIR / f"{event_id}.faiss"

def get_metadata_path(event_id):
    """Get the file path for an event's metadata"""
    ensure_persistence_dir()
    return PERSISTENCE_DIR / f"{event_id}.meta"

def save_index(event_id, index, ids, vectors):
    """Save FAISS index and metadata to disk"""
    try:
        index_path = get_index_path(event_id)
        metadata_path = get_metadata_path(event_id)
        
        # Save FAISS index
        faiss.write_index(index, str(index_path))
        
        # Save metadata (ids and vectors shape info)
        metadata = {
            'ids': ids,
            'vector_shape': vectors.shape if vectors is not None else None,
            'dimension': index.d if hasattr(index, 'd') else None
        }
        
        with open(metadata_path, 'wb') as f:
            pickle.dump(metadata, f)
        
        logger.info(f"Saved FAISS index for event {event_id} to {index_path}")
        return True
    except Exception as e:
        logger.error(f"Failed to save FAISS index for event {event_id}: {e}")
        return False

def load_index(event_id):
    """Load FAISS index and metadata from disk"""
    try:
        index_path = get_index_path(event_id)
        metadata_path = get_metadata_path(event_id)
        
        if not index_path.exists() or not metadata_path.exists():
            return None, None, None
        
        # Load FAISS index
        index = faiss.read_index(str(index_path))
        
        # Load metadata
        with open(metadata_path, 'rb') as f:
            metadata = pickle.load(f)
        
        ids = metadata.get('ids', [])
        vector_shape = metadata.get('vector_shape')
        
        # Reconstruct vectors if shape info is available
        vectors = None
        if vector_shape is not None:
            # Note: We don't store full vectors, just shape info
            # In production, you might want to store vectors separately
            # For now, we'll reconstruct from the index if needed
            pass
        
        logger.info(f"Loaded FAISS index for event {event_id} from {index_path}")
        return index, ids, vectors
    except Exception as e:
        logger.error(f"Failed to load FAISS index for event {event_id}: {e}")
        return None, None, None

def delete_index(event_id):
    """Delete FAISS index and metadata from disk"""
    try:
        index_path = get_index_path(event_id)
        metadata_path = get_metadata_path(event_id)
        
        deleted = False
        if index_path.exists():
            index_path.unlink()
            deleted = True
        
        if metadata_path.exists():
            metadata_path.unlink()
            deleted = True
        
        if deleted:
            logger.info(f"Deleted FAISS index for event {event_id}")
        
        return deleted
    except Exception as e:
        logger.error(f"Failed to delete FAISS index for event {event_id}: {e}")
        return False

def list_saved_indices():
    """List all saved event indices"""
    try:
        ensure_persistence_dir()
        indices = []
        for path in PERSISTENCE_DIR.glob("*.faiss"):
            event_id = path.stem
            indices.append(event_id)
        return indices
    except Exception as e:
        logger.error(f"Failed to list saved indices: {e}")
        return []

