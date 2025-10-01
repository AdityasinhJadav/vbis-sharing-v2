#!/usr/bin/env python3
"""
Background worker to ingest photos into FAISS indices.

This worker can be run as a separate process to handle photo ingestion
asynchronously, either from a queue or by polling for new photos.

Usage:
  python photo_worker.py --firebase-config firebase_config.json
  python photo_worker.py --poll-interval 30 --firebase-config firebase_config.json
"""

import argparse
import json
import time
import logging
from typing import Dict, List, Optional
import requests
import os
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class PhotoWorker:
    def __init__(self, flask_base_url: str = "http://localhost:5000"):
        self.flask_base_url = flask_base_url
        self.session = requests.Session()
        self.processed_photos = set()  # Track processed photos to avoid duplicates
        
    def health_check(self) -> bool:
        """Check if Flask backend is running and InsightFace is ready."""
        try:
            response = self.session.get(f"{self.flask_base_url}/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                insightface_ready = data.get('insightface_ready', False)
                return insightface_ready
            return False
        except Exception as e:
            logger.error(f"❌ Cannot connect to Flask backend: {e}")
            return False
    
    def ingest_photo(self, event_id: str, photo_id: str, image_url: str) -> bool:
        """Ingest a single photo into the FAISS index."""
        try:
            response = self.session.post(
                f"{self.flask_base_url}/api/v2/ingest",
                json={
                    "event_id": event_id,
                    "photo_id": photo_id,
                    "image_url": image_url
                },
                timeout=60  # Longer timeout for embedding computation
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get('success', False)
            else:
                logger.warning(f"Failed to ingest {photo_id}: {response.status_code}")
                return False
                
        except Exception as e:
            logger.warning(f"Error ingesting {photo_id}: {e}")
            return False
    
    def get_new_photos(self, firebase_config_path: str, last_check: Optional[datetime] = None) -> List[Dict]:
        """Get new photos from Firebase since last check."""
        # This is a simplified version - in practice, you'd use Firebase Admin SDK
        # and query for photos with timestamp > last_check
        
        logger.info("📁 Checking for new photos...")
        
        # Placeholder - replace with actual Firebase integration
        # You would typically use:
        # from firebase_admin import credentials, firestore, initialize_app
        # cred = credentials.Certificate(firebase_config_path)
        # initialize_app(cred)
        # db = firestore.client()
        # 
        # query = db.collection('photos')
        # if last_check:
        #     query = query.where('uploadedAt', '>', last_check)
        # 
        # photos = []
        # for doc in query.stream():
        #     photos.append({'id': doc.id, **doc.to_dict()})
        
        # For demo purposes, return empty list
        logger.info("⚠️ Firebase integration not implemented - no new photos found")
        return []
    
    def process_photos(self, photos: List[Dict]) -> Dict:
        """Process a batch of photos."""
        results = {
            'total': len(photos),
            'success': 0,
            'failed': 0,
            'skipped': 0
        }
        
        for photo in photos:
            photo_id = photo.get('id')
            event_id = photo.get('event_id') or photo.get('project_passcode')
            image_url = photo.get('cloudinaryUrl') or photo.get('cloudinary_url')
            
            if not photo_id or not event_id or not image_url:
                logger.warning(f"Skipping photo {photo_id}: missing required fields")
                results['skipped'] += 1
                continue
            
            if photo_id in self.processed_photos:
                logger.info(f"⏭️ Photo {photo_id} already processed")
                results['skipped'] += 1
                continue
            
            logger.info(f"🔄 Processing photo {photo_id} for event {event_id}")
            
            success = self.ingest_photo(event_id, photo_id, image_url)
            
            if success:
                results['success'] += 1
                self.processed_photos.add(photo_id)
                logger.info(f"✅ Successfully ingested {photo_id}")
            else:
                results['failed'] += 1
                logger.warning(f"❌ Failed to ingest {photo_id}")
        
        return results
    
    def run_once(self, firebase_config_path: str) -> Dict:
        """Run the worker once to process any new photos."""
        if not self.health_check():
            logger.error("❌ Flask backend not ready")
            return {'error': 'Backend not ready'}
        
        # Get new photos
        photos = self.get_new_photos(firebase_config_path)
        
        if not photos:
            logger.info("📭 No new photos to process")
            return {'total': 0, 'success': 0, 'failed': 0, 'skipped': 0}
        
        logger.info(f"📊 Found {len(photos)} new photos to process")
        
        # Process photos
        results = self.process_photos(photos)
        
        logger.info(f"📊 Processing complete:")
        logger.info(f"  - Total: {results['total']}")
        logger.info(f"  - Success: {results['success']}")
        logger.info(f"  - Failed: {results['failed']}")
        logger.info(f"  - Skipped: {results['skipped']}")
        
        return results
    
    def run_continuous(self, firebase_config_path: str, poll_interval: int = 60):
        """Run the worker continuously, polling for new photos."""
        logger.info(f"🔄 Starting continuous worker (polling every {poll_interval}s)")
        
        while True:
            try:
                self.run_once(firebase_config_path)
                time.sleep(poll_interval)
            except KeyboardInterrupt:
                logger.info("🛑 Worker stopped by user")
                break
            except Exception as e:
                logger.error(f"❌ Worker error: {e}")
                time.sleep(poll_interval)

def main():
    parser = argparse.ArgumentParser(description='Background worker for photo ingestion')
    parser.add_argument('--firebase-config', required=True, help='Path to Firebase config JSON')
    parser.add_argument('--flask-url', default='http://localhost:5000', help='Flask backend URL')
    parser.add_argument('--poll-interval', type=int, default=60, help='Polling interval in seconds')
    parser.add_argument('--once', action='store_true', help='Run once and exit (don\'t poll)')
    
    args = parser.parse_args()
    
    # Initialize worker
    worker = PhotoWorker(args.flask_url)
    
    if args.once:
        # Run once
        worker.run_once(args.firebase_config)
    else:
        # Run continuously
        worker.run_continuous(args.firebase_config, args.poll_interval)

if __name__ == '__main__':
    main()
