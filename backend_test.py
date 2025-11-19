#!/usr/bin/env python3
"""
MediMinder Backend API Test Suite
Tests all backend endpoints with realistic data flow
"""

import requests
import json
import uuid
import base64
from datetime import datetime, timedelta
import sys
import os

# Backend URL from frontend .env
BACKEND_URL = "https://mediclock-5.preview.emergentagent.com/api"

class MediMinderTester:
    def __init__(self):
        self.session = requests.Session()
        self.user_token = None
        self.user_id = None
        self.patient_id = None
        self.prescription_id = None
        self.phone = "+1234567890"
        self.test_results = []
        
    def log_test(self, test_name, success, message, response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "response": response_data
        })
        
    def test_auth_login(self):
        """Test OTP login endpoint"""
        try:
            payload = {"phone": self.phone}
            response = self.session.post(f"{BACKEND_URL}/auth/login", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("otp"):
                    self.otp = data["otp"]  # Store OTP for verification
                    self.log_test("Auth Login", True, f"OTP generated: {self.otp}", data)
                    return True
                else:
                    self.log_test("Auth Login", False, f"Invalid response format: {data}")
            else:
                self.log_test("Auth Login", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Auth Login", False, f"Exception: {str(e)}")
        return False
        
    def test_auth_verify(self):
        """Test OTP verification endpoint"""
        try:
            payload = {"phone": self.phone, "otp": self.otp}
            response = self.session.post(f"{BACKEND_URL}/auth/verify", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("token"):
                    self.user_token = data["token"]
                    self.user_id = data["user"]["id"]
                    self.log_test("Auth Verify", True, f"Token received: {self.user_token[:20]}...", data)
                    return True
                else:
                    self.log_test("Auth Verify", False, f"Invalid response format: {data}")
            else:
                self.log_test("Auth Verify", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Auth Verify", False, f"Exception: {str(e)}")
        return False
        
    def test_create_patient(self):
        """Test patient creation"""
        try:
            payload = {
                "user_id": self.user_id,
                "name": "Sarah Johnson",
                "dob": "1955-03-15",
                "gender": "female",
                "allergies": ["penicillin", "shellfish"],
                "conditions": ["diabetes", "hypertension"],
                "emergency_contact": {
                    "name": "John Johnson",
                    "phone": "+1234567891",
                    "relationship": "spouse"
                },
                "preferred_language": "en"
            }
            
            response = self.session.post(f"{BACKEND_URL}/patients", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("patient"):
                    self.patient_id = data["patient"]["id"]
                    self.log_test("Create Patient", True, f"Patient created: {self.patient_id}", data)
                    return True
                else:
                    self.log_test("Create Patient", False, f"Invalid response format: {data}")
            else:
                self.log_test("Create Patient", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Create Patient", False, f"Exception: {str(e)}")
        return False
        
    def test_get_patient(self):
        """Test get patient details"""
        try:
            response = self.session.get(f"{BACKEND_URL}/patients/{self.patient_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("patient"):
                    patient = data["patient"]
                    if patient["name"] == "Sarah Johnson" and patient["id"] == self.patient_id:
                        self.log_test("Get Patient", True, f"Patient retrieved successfully", data)
                        return True
                    else:
                        self.log_test("Get Patient", False, f"Patient data mismatch: {patient}")
                else:
                    self.log_test("Get Patient", False, f"Invalid response format: {data}")
            else:
                self.log_test("Get Patient", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Get Patient", False, f"Exception: {str(e)}")
        return False
        
    def test_update_patient(self):
        """Test update patient details"""
        try:
            payload = {
                "allergies": ["penicillin", "shellfish", "latex"],
                "conditions": ["diabetes", "hypertension", "arthritis"]
            }
            
            response = self.session.put(f"{BACKEND_URL}/patients/{self.patient_id}", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Update Patient", True, "Patient updated successfully", data)
                    return True
                else:
                    self.log_test("Update Patient", False, f"Invalid response format: {data}")
            else:
                self.log_test("Update Patient", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Update Patient", False, f"Exception: {str(e)}")
        return False
        
    def test_medication_search(self):
        """Test medication search"""
        try:
            # Test search with query
            response = self.session.get(f"{BACKEND_URL}/medications/search?q=metformin")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and isinstance(data.get("medications"), list):
                    medications = data["medications"]
                    metformin_found = any("metformin" in med["name"].lower() for med in medications)
                    if metformin_found:
                        self.log_test("Medication Search", True, f"Found {len(medications)} medications including Metformin", data)
                        return True
                    else:
                        self.log_test("Medication Search", False, f"Metformin not found in results: {medications}")
                else:
                    self.log_test("Medication Search", False, f"Invalid response format: {data}")
            else:
                self.log_test("Medication Search", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Medication Search", False, f"Exception: {str(e)}")
        return False
        
    def test_add_prescription(self):
        """Test adding a prescription"""
        try:
            payload = {
                "patient_id": self.patient_id,
                "medication_name": "Metformin 500mg",
                "dosage": "500mg",
                "frequency": "twice",
                "schedule": {
                    "times": ["08:00", "20:00"],
                    "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
                },
                "instructions": "Take with food to reduce stomach upset",
                "start_date": "2024-01-15",
                "end_date": "2024-07-15",
                "current_stock": 60,
                "total_per_refill": 60,
                "with_food": True
            }
            
            response = self.session.post(f"{BACKEND_URL}/prescriptions", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("prescription"):
                    self.prescription_id = data["prescription"]["id"]
                    self.log_test("Add Prescription", True, f"Prescription created: {self.prescription_id}", data)
                    return True
                else:
                    self.log_test("Add Prescription", False, f"Invalid response format: {data}")
            else:
                self.log_test("Add Prescription", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Add Prescription", False, f"Exception: {str(e)}")
        return False
        
    def test_get_patient_prescriptions(self):
        """Test getting patient prescriptions"""
        try:
            response = self.session.get(f"{BACKEND_URL}/prescriptions/patient/{self.patient_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and isinstance(data.get("prescriptions"), list):
                    prescriptions = data["prescriptions"]
                    if len(prescriptions) > 0 and any(p["id"] == self.prescription_id for p in prescriptions):
                        self.log_test("Get Patient Prescriptions", True, f"Found {len(prescriptions)} prescriptions", data)
                        return True
                    else:
                        self.log_test("Get Patient Prescriptions", False, f"Prescription not found in list: {prescriptions}")
                else:
                    self.log_test("Get Patient Prescriptions", False, f"Invalid response format: {data}")
            else:
                self.log_test("Get Patient Prescriptions", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Get Patient Prescriptions", False, f"Exception: {str(e)}")
        return False
        
    def test_update_stock(self):
        """Test updating prescription stock"""
        try:
            payload = {
                "prescription_id": self.prescription_id,
                "new_stock": 45
            }
            
            response = self.session.put(f"{BACKEND_URL}/prescriptions/{self.prescription_id}/stock", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Update Stock", True, "Stock updated successfully", data)
                    return True
                else:
                    self.log_test("Update Stock", False, f"Invalid response format: {data}")
            else:
                self.log_test("Update Stock", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Update Stock", False, f"Exception: {str(e)}")
        return False
        
    def test_log_reminder(self):
        """Test logging reminder action"""
        try:
            payload = {
                "prescription_id": self.prescription_id,
                "patient_id": self.patient_id,
                "action": "took",
                "note": "Taken with breakfast as instructed"
            }
            
            response = self.session.post(f"{BACKEND_URL}/reminders/log", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("log"):
                    self.log_test("Log Reminder", True, "Reminder logged successfully", data)
                    return True
                else:
                    self.log_test("Log Reminder", False, f"Invalid response format: {data}")
            else:
                self.log_test("Log Reminder", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Log Reminder", False, f"Exception: {str(e)}")
        return False
        
    def test_get_reminder_logs(self):
        """Test getting reminder logs"""
        try:
            response = self.session.get(f"{BACKEND_URL}/reminders/logs/patient/{self.patient_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and isinstance(data.get("logs"), list):
                    logs = data["logs"]
                    self.log_test("Get Reminder Logs", True, f"Retrieved {len(logs)} reminder logs", data)
                    return True
                else:
                    self.log_test("Get Reminder Logs", False, f"Invalid response format: {data}")
            else:
                self.log_test("Get Reminder Logs", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Get Reminder Logs", False, f"Exception: {str(e)}")
        return False
        
    def test_adherence_stats(self):
        """Test getting adherence statistics"""
        try:
            response = self.session.get(f"{BACKEND_URL}/reminders/adherence/{self.patient_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("stats"):
                    stats = data["stats"]
                    required_keys = ["total", "took", "missed", "snoozed", "adherence_rate"]
                    if all(key in stats for key in required_keys):
                        self.log_test("Adherence Stats", True, f"Adherence rate: {stats['adherence_rate']}%", data)
                        return True
                    else:
                        self.log_test("Adherence Stats", False, f"Missing stats keys: {stats}")
                else:
                    self.log_test("Adherence Stats", False, f"Invalid response format: {data}")
            else:
                self.log_test("Adherence Stats", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Adherence Stats", False, f"Exception: {str(e)}")
        return False
        
    def test_ai_assistant(self):
        """Test AI assistant explanation"""
        try:
            payload = {
                "medication_name": "Metformin 500mg",
                "query_type": "summary",
                "language": "en"
            }
            
            response = self.session.post(f"{BACKEND_URL}/ai/explain", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("explanation"):
                    explanation = data["explanation"]
                    if len(explanation) > 50:  # Reasonable explanation length
                        self.log_test("AI Assistant", True, f"AI explanation generated ({len(explanation)} chars)", data)
                        return True
                    else:
                        self.log_test("AI Assistant", False, f"Explanation too short: {explanation}")
                else:
                    self.log_test("AI Assistant", False, f"Invalid response format: {data}")
            else:
                self.log_test("AI Assistant", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("AI Assistant", False, f"Exception: {str(e)}")
        return False
        
    def test_ocr_recognize(self):
        """Test OCR recognition (with mock image)"""
        try:
            # Create a simple test image (1x1 pixel PNG in base64)
            test_image_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA4nEKtAAAAABJRU5ErkJggg=="
            
            payload = {
                "image_base64": test_image_b64,
                "patient_id": self.patient_id
            }
            
            response = self.session.post(f"{BACKEND_URL}/ocr/recognize", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "extracted" in data:
                    extracted = data["extracted"]
                    self.log_test("OCR Recognition", True, f"OCR processed successfully", data)
                    return True
                else:
                    self.log_test("OCR Recognition", False, f"Invalid response format: {data}")
            else:
                self.log_test("OCR Recognition", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("OCR Recognition", False, f"Exception: {str(e)}")
        return False
        
    def test_delete_prescription(self):
        """Test deleting a prescription"""
        try:
            response = self.session.delete(f"{BACKEND_URL}/prescriptions/{self.prescription_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Delete Prescription", True, "Prescription deleted successfully", data)
                    return True
                else:
                    self.log_test("Delete Prescription", False, f"Invalid response format: {data}")
            else:
                self.log_test("Delete Prescription", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Delete Prescription", False, f"Exception: {str(e)}")
        return False
        
    def test_health_check(self):
        """Test health check endpoint"""
        try:
            response = self.session.get(f"{BACKEND_URL}/health")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    self.log_test("Health Check", True, "API is healthy", data)
                    return True
                else:
                    self.log_test("Health Check", False, f"Unhealthy status: {data}")
            else:
                self.log_test("Health Check", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Health Check", False, f"Exception: {str(e)}")
        return False
        
    def run_all_tests(self):
        """Run all tests in sequence"""
        print(f"🧪 Starting MediMinder Backend API Tests")
        print(f"🔗 Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Test sequence following realistic user flow
        tests = [
            ("Health Check", self.test_health_check),
            ("Auth Login", self.test_auth_login),
            ("Auth Verify", self.test_auth_verify),
            ("Create Patient", self.test_create_patient),
            ("Get Patient", self.test_get_patient),
            ("Update Patient", self.test_update_patient),
            ("Medication Search", self.test_medication_search),
            ("Add Prescription", self.test_add_prescription),
            ("Get Patient Prescriptions", self.test_get_patient_prescriptions),
            ("Update Stock", self.test_update_stock),
            ("Log Reminder", self.test_log_reminder),
            ("Get Reminder Logs", self.test_get_reminder_logs),
            ("Adherence Stats", self.test_adherence_stats),
            ("AI Assistant", self.test_ai_assistant),
            ("OCR Recognition", self.test_ocr_recognize),
            ("Delete Prescription", self.test_delete_prescription),
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            try:
                if test_func():
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                print(f"❌ FAIL {test_name}: Unexpected error: {str(e)}")
                failed += 1
            print()  # Add spacing between tests
            
        print("=" * 60)
        print(f"📊 Test Results: {passed} passed, {failed} failed")
        print(f"✅ Success Rate: {(passed/(passed+failed)*100):.1f}%")
        
        return passed, failed, self.test_results

if __name__ == "__main__":
    tester = MediMinderTester()
    passed, failed, results = tester.run_all_tests()
    
    # Exit with error code if any tests failed
    sys.exit(0 if failed == 0 else 1)