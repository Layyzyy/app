#!/usr/bin/env python3
"""
Focused test for the failing endpoints
"""

import requests
import json
import uuid

BACKEND_URL = "https://mediclock-5.preview.emergentagent.com/api"

def test_reminder_logs_issue():
    """Test the reminder logs endpoint that's failing"""
    # First create a test patient and prescription
    session = requests.Session()
    
    # Login
    login_resp = session.post(f"{BACKEND_URL}/auth/login", json={"phone": "+1234567890"})
    if login_resp.status_code != 200:
        print("❌ Login failed")
        return
    
    otp = login_resp.json()["otp"]
    
    # Verify
    verify_resp = session.post(f"{BACKEND_URL}/auth/verify", json={"phone": "+1234567890", "otp": otp})
    if verify_resp.status_code != 200:
        print("❌ Verify failed")
        return
    
    user_id = verify_resp.json()["user"]["id"]
    
    # Create patient
    patient_resp = session.post(f"{BACKEND_URL}/patients", json={
        "user_id": user_id,
        "name": "Test Patient",
        "dob": "1980-01-01",
        "gender": "male"
    })
    
    if patient_resp.status_code != 200:
        print("❌ Patient creation failed")
        return
    
    patient_id = patient_resp.json()["patient"]["id"]
    
    # Add prescription
    prescription_resp = session.post(f"{BACKEND_URL}/prescriptions", json={
        "patient_id": patient_id,
        "medication_name": "Test Medicine",
        "dosage": "10mg",
        "frequency": "once",
        "schedule": {"times": ["08:00"], "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]},
        "start_date": "2024-01-01",
        "current_stock": 30,
        "total_per_refill": 30
    })
    
    if prescription_resp.status_code != 200:
        print("❌ Prescription creation failed")
        return
    
    prescription_id = prescription_resp.json()["prescription"]["id"]
    
    # Log a reminder
    log_resp = session.post(f"{BACKEND_URL}/reminders/log", json={
        "prescription_id": prescription_id,
        "patient_id": patient_id,
        "action": "took",
        "note": "Test reminder"
    })
    
    if log_resp.status_code != 200:
        print("❌ Reminder log failed")
        return
    
    print("✅ Reminder logged successfully")
    
    # Now try to get reminder logs - this is where it fails
    logs_resp = session.get(f"{BACKEND_URL}/reminders/logs/patient/{patient_id}")
    
    print(f"Reminder logs response: {logs_resp.status_code}")
    if logs_resp.status_code == 200:
        print("✅ Reminder logs retrieved successfully")
        print(f"Response: {logs_resp.json()}")
    else:
        print(f"❌ Reminder logs failed: {logs_resp.text}")

def test_ai_assistant():
    """Test AI assistant with correct medication name"""
    session = requests.Session()
    
    payload = {
        "medication_name": "Metformin 500mg",
        "query_type": "summary",
        "language": "en"
    }
    
    response = session.post(f"{BACKEND_URL}/ai/explain", json=payload)
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success"):
            print("✅ AI Assistant working correctly")
            print(f"Explanation length: {len(data.get('explanation', ''))}")
        else:
            print(f"❌ AI Assistant failed: {data}")
    else:
        print(f"❌ AI Assistant HTTP error: {response.status_code} - {response.text}")

def test_ocr_with_better_image():
    """Test OCR with a better base64 image"""
    session = requests.Session()
    
    # Create a simple white 100x100 PNG image in base64
    # This is a minimal valid PNG
    better_image_b64 = "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA=="
    
    payload = {
        "image_base64": better_image_b64,
        "patient_id": "test-patient-id"
    }
    
    response = session.post(f"{BACKEND_URL}/ocr/recognize", json=payload)
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success"):
            print("✅ OCR working correctly")
            print(f"Extracted: {data.get('extracted', {})}")
        else:
            print(f"❌ OCR failed: {data}")
    else:
        print(f"❌ OCR HTTP error: {response.status_code} - {response.text}")

if __name__ == "__main__":
    print("🔍 Running focused tests on failing endpoints...")
    print("=" * 50)
    
    print("\n1. Testing Reminder Logs Issue:")
    test_reminder_logs_issue()
    
    print("\n2. Testing AI Assistant:")
    test_ai_assistant()
    
    print("\n3. Testing OCR:")
    test_ocr_with_better_image()