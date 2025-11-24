#!/usr/bin/env python3
"""
Manual bulk ingest script for FaceMatch photos
Run this to ingest all photos from an event into the FAISS index
"""

import requests
import json
import sys
from typing import List, Dict

# Configuration
FLASK_BASE_URL = "http://localhost:5000"
EVENT_ID = "bDyVceKopFItZGnn5qKa"  # Replace with your actual event ID

def get_event_photos(event_id: str) -> List[Dict]:
    """
    Get photos from Firebase for a specific event
    Note: This is a simplified version - you'll need to implement Firebase access
    """
    # For now, return empty list - you'll need to implement Firebase access
    # or manually provide the photo URLs
    return []

def ingest_photo(event_id: str, photo_id: str, image_url: str) -> bool:
    """Ingest a single photo into the FAISS index"""
    try:
        response = requests.post(
            f"{FLASK_BASE_URL}/api/v2/ingest",
            json={
                "event_id": event_id,
                "photo_id": photo_id,
                "image_url": image_url
            },
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            return result.get('success', False)
        else:
            print(f"❌ Failed to ingest {photo_id}: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error ingesting {photo_id}: {e}")
        return False

def main():
    print(f"🚀 Starting manual bulk ingest for event: {EVENT_ID}")
    print(f"📡 Flask service: {FLASK_BASE_URL}")
    
    # Check if Flask service is running
    try:
        health_response = requests.get(f"{FLASK_BASE_URL}/health", timeout=5)
        if health_response.status_code != 200:
            print("❌ Flask service is not running or not healthy")
            return
        print("✅ Flask service is running")
    except Exception as e:
        print(f"❌ Cannot connect to Flask service: {e}")
        return
    
    # Get photos (you'll need to implement this or provide photo URLs manually)
    photos = get_event_photos(EVENT_ID)
    
    if not photos:
        print("⚠️ No photos found. You need to provide photo URLs manually.")
        print("\nTo manually ingest photos, you can:")
        print("1. Get photo URLs from your Firebase/Cloudinary")
        print("2. Modify this script to include the photo URLs")
        print("3. Or use the frontend bulk ingest feature")
        return
    
    print(f"📸 Found {len(photos)} photos to ingest")
    
    success_count = 0
    fail_count = 0
    
    for i, photo in enumerate(photos, 1):
        print(f"🔄 Processing photo {i}/{len(photos)}: {photo.get('id', 'unknown')}")
        
        if ingest_photo(EVENT_ID, photo['id'], photo['url']):
            success_count += 1
            print(f"✅ Successfully ingested photo {i}")
        else:
            fail_count += 1
            print(f"❌ Failed to ingest photo {i}")
    
    print(f"\n🎉 Bulk ingest completed!")
    print(f"✅ Success: {success_count}")
    print(f"❌ Failed: {fail_count}")
    print(f"📊 Total: {len(photos)}")

if __name__ == "__main__":
    main()




