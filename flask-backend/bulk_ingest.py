#!/usr/bin/env python3
"""
Bulk ingest script to populate FAISS indices with existing photos.

Usage:
  python bulk_ingest.py --event-id EVENT_ID --firebase-config firebase_config.json
  python bulk_ingest.py --all-events --firebase-config firebase_config.json

This script:
1. Connects to Firebase to fetch photos for an event
2. Computes ArcFace embeddings for each photo
3. Ingests them into the FAISS index via the Flask API
4. Reports progress and results
"""

import argparse
import json
import time
import logging
from typing import List, Dict, Optional
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class BulkIngestService:
    def __init__(self, flask_base_url: str = "http://localhost:5000"):
        self.flask_base_url = flask_base_url
        self.session = requests.Session()
        
    def health_check(self) -> bool:
        """Check if Flask backend is running and InsightFace is ready."""
        try:
            response = self.session.get(f"{self.flask_base_url}/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                insightface_ready = data.get('insightface_ready', False)
                if insightface_ready:
                    logger.info("✅ Flask backend is running with InsightFace ready")
                    return True
                else:
                    logger.warning("⚠️ Flask backend running but InsightFace not ready")
                    return False
            else:
                logger.error(f"❌ Flask backend health check failed: {response.status_code}")
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
                timeout=30
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
    
    def bulk_ingest_event(self, event_id: str, photos: List[Dict], max_workers: int = 4) -> Dict:
        """Bulk ingest all photos for an event."""
        logger.info(f"🚀 Starting bulk ingest for event {event_id} with {len(photos)} photos")
        
        results = {
            'total': len(photos),
            'success': 0,
            'failed': 0,
            'skipped': 0
        }
        
        def process_photo(photo):
            photo_id = photo.get('id')
            image_url = photo.get('cloudinaryUrl') or photo.get('cloudinary_url')
            
            if not photo_id or not image_url:
                logger.warning(f"Skipping photo {photo_id}: missing ID or URL")
                return 'skipped'
            
            success = self.ingest_photo(event_id, photo_id, image_url)
            return 'success' if success else 'failed'
        
        # Process photos with concurrency
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_photo = {
                executor.submit(process_photo, photo): photo 
                for photo in photos
            }
            
            for future in as_completed(future_to_photo):
                photo = future_to_photo[future]
                try:
                    result = future.result()
                    results[result] += 1
                    
                    if result == 'success':
                        logger.info(f"✅ Ingested {photo.get('id')}")
                    elif result == 'failed':
                        logger.warning(f"❌ Failed to ingest {photo.get('id')}")
                    else:
                        logger.info(f"⏭️ Skipped {photo.get('id')}")
                        
                except Exception as e:
                    logger.error(f"Error processing photo {photo.get('id')}: {e}")
                    results['failed'] += 1
        
        logger.info(f"📊 Bulk ingest completed for event {event_id}:")
        logger.info(f"  - Total: {results['total']}")
        logger.info(f"  - Success: {results['success']}")
        logger.info(f"  - Failed: {results['failed']}")
        logger.info(f"  - Skipped: {results['skipped']}")
        
        return results

def load_firebase_photos(firebase_config_path: str, event_id: Optional[str] = None) -> Dict[str, List[Dict]]:
    """Load photos from Firebase. Returns dict of {event_id: [photos]}."""
    # This is a simplified version - in practice, you'd use Firebase Admin SDK
    # For now, we'll assume you have a JSON file with photo data
    logger.info("📁 Loading photos from Firebase...")
    
    # Placeholder - replace with actual Firebase integration
    # You would typically use:
    # from firebase_admin import credentials, firestore, initialize_app
    # cred = credentials.Certificate(firebase_config_path)
    # initialize_app(cred)
    # db = firestore.client()
    # 
    # if event_id:
    #     photos_query = db.collection('photos').where('event_id', '==', event_id)
    # else:
    #     photos_query = db.collection('photos')
    # 
    # photos = []
    # for doc in photos_query.stream():
    #     photos.append({'id': doc.id, **doc.to_dict()})
    
    # For demo purposes, return empty data
    logger.warning("⚠️ Firebase integration not implemented - using placeholder data")
    return {}

def main():
    parser = argparse.ArgumentParser(description='Bulk ingest photos into FAISS indices')
    parser.add_argument('--event-id', help='Specific event ID to ingest')
    parser.add_argument('--all-events', action='store_true', help='Ingest all events')
    parser.add_argument('--firebase-config', required=True, help='Path to Firebase config JSON')
    parser.add_argument('--flask-url', default='http://localhost:5000', help='Flask backend URL')
    parser.add_argument('--max-workers', type=int, default=4, help='Max concurrent workers')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be ingested without doing it')
    
    args = parser.parse_args()
    
    if not args.event_id and not args.all_events:
        logger.error("❌ Must specify either --event-id or --all-events")
        return 1
    
    # Initialize bulk ingest service
    service = BulkIngestService(args.flask_url)
    
    # Health check
    if not service.health_check():
        logger.error("❌ Flask backend not ready. Please start the server first.")
        return 1
    
    # Load photos from Firebase
    try:
        events_photos = load_firebase_photos(args.firebase_config, args.event_id)
    except Exception as e:
        logger.error(f"❌ Failed to load photos from Firebase: {e}")
        return 1
    
    if not events_photos:
        logger.warning("⚠️ No photos found to ingest")
        return 0
    
    # Process events
    total_events = len(events_photos)
    total_photos = sum(len(photos) for photos in events_photos.values())
    
    logger.info(f"📊 Found {total_photos} photos across {total_events} events")
    
    if args.dry_run:
        logger.info("🔍 DRY RUN - Would ingest:")
        for event_id, photos in events_photos.items():
            logger.info(f"  Event {event_id}: {len(photos)} photos")
        return 0
    
    # Start bulk ingest
    start_time = time.time()
    all_results = {}
    
    for event_id, photos in events_photos.items():
        logger.info(f"🔄 Processing event {event_id}...")
        results = service.bulk_ingest_event(event_id, photos, args.max_workers)
        all_results[event_id] = results
    
    # Summary
    elapsed = time.time() - start_time
    total_success = sum(r['success'] for r in all_results.values())
    total_failed = sum(r['failed'] for r in all_results.values())
    
    logger.info("🎉 Bulk ingest completed!")
    logger.info(f"⏱️ Total time: {elapsed:.1f}s")
    logger.info(f"✅ Total successful: {total_success}")
    logger.info(f"❌ Total failed: {total_failed}")
    
    return 0 if total_failed == 0 else 1

if __name__ == '__main__':
    exit(main())
