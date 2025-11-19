from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Depends, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import json
import base64
from PIL import Image
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'mediminder_db')]

# Create the main app
app = FastAPI(title="MediMinder API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============= Models =============

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone: Optional[str] = None
    email: Optional[str] = None
    name: str
    role: str = "patient"  # patient, caregiver, pharmacist, doctor, admin
    password_hash: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    otp: Optional[str] = None
    otp_expires_at: Optional[datetime] = None

class Patient(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    dob: Optional[str] = None
    gender: Optional[str] = None
    allergies: List[str] = []
    conditions: List[str] = []
    primary_doctor_id: Optional[str] = None
    emergency_contact: Optional[Dict[str, str]] = None
    preferred_language: str = "en"
    caregiver_ids: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Medication(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    generic_name: Optional[str] = None
    form: str = "tablet"  # tablet, capsule, syrup, injection, etc.
    strength: Optional[str] = None
    manufacturer: Optional[str] = None
    image_base64: Optional[str] = None
    description: Optional[str] = None
    common_uses: Optional[str] = None
    side_effects: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Prescription(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    medication_id: str
    medication_name: str
    dosage: str
    frequency: str  # once, twice, thrice, custom
    schedule: Dict[str, Any]  # {times: ["08:00", "20:00"], days: ["Mon", "Tue", ...]}
    instructions: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    current_stock: int = 0
    total_per_refill: int = 0
    with_food: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ReminderLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    prescription_id: str
    patient_id: str
    scheduled_at: datetime
    action: str  # took, missed, snoozed, pending
    action_at: Optional[datetime] = None
    note: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class OCRRequest(BaseModel):
    image_base64: str
    patient_id: Optional[str] = None

class AIQuery(BaseModel):
    patient_id: Optional[str] = None
    medication_id: Optional[str] = None
    medication_name: Optional[str] = None
    query_type: str = "summary"  # summary, interactions, dosage, side_effects
    language: str = "en"
    custom_query: Optional[str] = None

# Input Models
class LoginRequest(BaseModel):
    phone: str

class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str

class CreatePatientRequest(BaseModel):
    user_id: str
    name: str
    dob: Optional[str] = None
    gender: Optional[str] = None
    allergies: List[str] = []
    conditions: List[str] = []
    emergency_contact: Optional[Dict[str, str]] = None
    preferred_language: str = "en"

class AddMedicationRequest(BaseModel):
    patient_id: str
    medication_name: str
    dosage: str
    frequency: str
    schedule: Dict[str, Any]
    instructions: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    current_stock: int = 0
    total_per_refill: int = 0
    with_food: bool = False

class UpdateStockRequest(BaseModel):
    prescription_id: str
    new_stock: int

class LogReminderRequest(BaseModel):
    prescription_id: str
    patient_id: str
    action: str  # took, missed, snoozed
    note: Optional[str] = None

# ============= Helper Functions =============

def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    import random
    return str(random.randint(100000, 999999))

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[Dict]:
    """Get current authenticated user (simplified for MVP)"""
    if not credentials:
        return None
    # In production, verify JWT token here
    return {"user_id": credentials.credentials}

# ============= Seed Medicine Database =============

async def seed_medicine_database():
    """Seed the medicine database with common medications"""
    existing = await db.medications.count_documents({})
    if existing > 0:
        logger.info(f"Medicine database already has {existing} entries")
        return
    
    common_medicines = [
        {
            "id": str(uuid.uuid4()),
            "name": "Paracetamol 500mg",
            "generic_name": "Acetaminophen",
            "form": "tablet",
            "strength": "500mg",
            "description": "Pain reliever and fever reducer",
            "common_uses": "Pain relief, fever reduction",
            "side_effects": "Rare allergic reactions, liver damage with overdose",
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Metformin 500mg",
            "generic_name": "Metformin",
            "form": "tablet",
            "strength": "500mg",
            "description": "Used to treat type 2 diabetes",
            "common_uses": "Blood sugar control in diabetes",
            "side_effects": "Nausea, diarrhea, stomach upset",
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Aspirin 75mg",
            "generic_name": "Acetylsalicylic Acid",
            "form": "tablet",
            "strength": "75mg",
            "description": "Blood thinner and pain reliever",
            "common_uses": "Heart disease prevention, pain relief",
            "side_effects": "Stomach irritation, bleeding risk",
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Amoxicillin 500mg",
            "generic_name": "Amoxicillin",
            "form": "capsule",
            "strength": "500mg",
            "description": "Antibiotic for bacterial infections",
            "common_uses": "Treating bacterial infections",
            "side_effects": "Nausea, diarrhea, allergic reactions",
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Lisinopril 10mg",
            "generic_name": "Lisinopril",
            "form": "tablet",
            "strength": "10mg",
            "description": "Blood pressure medication",
            "common_uses": "High blood pressure, heart failure",
            "side_effects": "Dizziness, headache, persistent cough",
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Atorvastatin 20mg",
            "generic_name": "Atorvastatin",
            "form": "tablet",
            "strength": "20mg",
            "description": "Cholesterol-lowering medication",
            "common_uses": "High cholesterol, cardiovascular disease prevention",
            "side_effects": "Muscle pain, liver damage (rare)",
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Omeprazole 20mg",
            "generic_name": "Omeprazole",
            "form": "capsule",
            "strength": "20mg",
            "description": "Reduces stomach acid",
            "common_uses": "Heartburn, acid reflux, ulcers",
            "side_effects": "Headache, stomach pain, nausea",
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Levothyroxine 50mcg",
            "generic_name": "Levothyroxine",
            "form": "tablet",
            "strength": "50mcg",
            "description": "Thyroid hormone replacement",
            "common_uses": "Hypothyroidism treatment",
            "side_effects": "Weight changes, heart palpitations",
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Amlodipine 5mg",
            "generic_name": "Amlodipine",
            "form": "tablet",
            "strength": "5mg",
            "description": "Calcium channel blocker",
            "common_uses": "High blood pressure, chest pain",
            "side_effects": "Swelling of ankles, dizziness",
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Losartan 50mg",
            "generic_name": "Losartan",
            "form": "tablet",
            "strength": "50mg",
            "description": "Blood pressure medication",
            "common_uses": "High blood pressure, diabetic kidney disease",
            "side_effects": "Dizziness, back pain",
            "created_at": datetime.utcnow()
        }
    ]
    
    await db.medications.insert_many(common_medicines)
    logger.info(f"Seeded {len(common_medicines)} medicines to database")

# ============= Auth Routes =============

@api_router.post("/auth/login")
async def login(request: LoginRequest):
    """Initiate login with phone number"""
    try:
        # Generate OTP
        otp = generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        
        # Check if user exists
        user = await db.users.find_one({"phone": request.phone}, {"_id": 0})
        
        if user:
            # Update existing user with new OTP
            await db.users.update_one(
                {"phone": request.phone},
                {"$set": {"otp": otp, "otp_expires_at": expires_at}}
            )
        else:
            # Create new user
            new_user = User(
                phone=request.phone,
                name="User",  # Will be updated after verification
                otp=otp,
                otp_expires_at=expires_at
            )
            await db.users.insert_one(new_user.dict())
        
        logger.info(f"OTP generated for {request.phone}: {otp}")
        
        return {
            "success": True,
            "message": "OTP sent successfully",
            "otp": otp  # In production, this would be sent via SMS
        }
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/auth/verify")
async def verify_otp(request: VerifyOTPRequest):
    """Verify OTP and return user token"""
    try:
        user = await db.users.find_one({"phone": request.phone}, {"_id": 0})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if user.get("otp") != request.otp:
            raise HTTPException(status_code=400, detail="Invalid OTP")
        
        if user.get("otp_expires_at") and datetime.fromisoformat(str(user["otp_expires_at"])) < datetime.utcnow():
            raise HTTPException(status_code=400, detail="OTP expired")
        
        # Clear OTP
        await db.users.update_one(
            {"phone": request.phone},
            {"$unset": {"otp": "", "otp_expires_at": ""}}
        )
        
        # Return user token (simplified - use JWT in production)
        return {
            "success": True,
            "token": user["id"],
            "user": {
                "id": user["id"],
                "phone": user["phone"],
                "name": user["name"],
                "role": user["role"]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verify OTP error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============= Patient Routes =============

@api_router.post("/patients")
async def create_patient(request: CreatePatientRequest):
    """Create a patient profile"""
    try:
        patient = Patient(**request.dict())
        await db.patients.insert_one(patient.dict())
        return {"success": True, "patient": patient.dict()}
    except Exception as e:
        logger.error(f"Create patient error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/patients/{patient_id}")
async def get_patient(patient_id: str):
    """Get patient details"""
    try:
        patient = await db.patients.find_one({"id": patient_id}, {"_id": 0})
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        return {"success": True, "patient": patient}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get patient error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/patients/{patient_id}")
async def update_patient(patient_id: str, updates: Dict[str, Any] = Body(...)):
    """Update patient details"""
    try:
        result = await db.patients.update_one(
            {"id": patient_id},
            {"$set": updates}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Patient not found")
        return {"success": True, "message": "Patient updated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update patient error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============= Medication Routes =============

@api_router.get("/medications/search")
async def search_medications(q: str = ""):
    """Search medications by name"""
    try:
        query = {"$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"generic_name": {"$regex": q, "$options": "i"}}
        ]} if q else {}
        
        medications = await db.medications.find(query, {"_id": 0}).limit(20).to_list(20)
        return {"success": True, "medications": medications}
    except Exception as e:
        logger.error(f"Search medications error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/medications/{medication_id}")
async def get_medication(medication_id: str):
    """Get medication details"""
    try:
        medication = await db.medications.find_one({"id": medication_id}, {"_id": 0})
        if not medication:
            raise HTTPException(status_code=404, detail="Medication not found")
        return {"success": True, "medication": medication}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get medication error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============= Prescription Routes =============

@api_router.post("/prescriptions")
async def add_prescription(request: AddMedicationRequest):
    """Add a prescription (medication to patient)"""
    try:
        # Create or find medication
        medication = await db.medications.find_one(
            {"name": {"$regex": f"^{request.medication_name}$", "$options": "i"}}
        )
        
        if not medication:
            # Create new medication entry
            medication = Medication(
                name=request.medication_name,
                form="tablet"
            )
            await db.medications.insert_one(medication.dict())
            medication_id = medication.id
        else:
            medication_id = medication["id"]
        
        # Create prescription
        prescription = Prescription(
            patient_id=request.patient_id,
            medication_id=medication_id,
            medication_name=request.medication_name,
            dosage=request.dosage,
            frequency=request.frequency,
            schedule=request.schedule,
            instructions=request.instructions,
            start_date=request.start_date,
            end_date=request.end_date,
            current_stock=request.current_stock,
            total_per_refill=request.total_per_refill,
            with_food=request.with_food
        )
        
        await db.prescriptions.insert_one(prescription.dict())
        
        return {"success": True, "prescription": prescription.dict()}
    except Exception as e:
        logger.error(f"Add prescription error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/prescriptions/patient/{patient_id}")
async def get_patient_prescriptions(patient_id: str):
    """Get all prescriptions for a patient"""
    try:
        prescriptions = await db.prescriptions.find({"patient_id": patient_id}, {"_id": 0}).to_list(100)
        return {"success": True, "prescriptions": prescriptions}
    except Exception as e:
        logger.error(f"Get prescriptions error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/prescriptions/{prescription_id}")
async def get_prescription(prescription_id: str):
    """Get a specific prescription"""
    try:
        prescription = await db.prescriptions.find_one({"id": prescription_id}, {"_id": 0})
        if not prescription:
            raise HTTPException(status_code=404, detail="Prescription not found")
        return {"success": True, "prescription": prescription}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get prescription error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/prescriptions/{prescription_id}/stock")
async def update_stock(prescription_id: str, request: UpdateStockRequest):
    """Update medication stock"""
    try:
        result = await db.prescriptions.update_one(
            {"id": prescription_id},
            {"$set": {"current_stock": request.new_stock}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Prescription not found")
        return {"success": True, "message": "Stock updated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update stock error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/prescriptions/{prescription_id}")
async def delete_prescription(prescription_id: str):
    """Delete a prescription"""
    try:
        result = await db.prescriptions.delete_one({"id": prescription_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Prescription not found")
        return {"success": True, "message": "Prescription deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete prescription error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============= Reminder Logs =============

@api_router.post("/reminders/log")
async def log_reminder_action(request: LogReminderRequest):
    """Log reminder action (took, missed, snoozed)"""
    try:
        log = ReminderLog(
            prescription_id=request.prescription_id,
            patient_id=request.patient_id,
            scheduled_at=datetime.utcnow(),
            action=request.action,
            action_at=datetime.utcnow(),
            note=request.note
        )
        
        await db.reminder_logs.insert_one(log.dict())
        
        # Update stock if medication was taken
        if request.action == "took":
            prescription = await db.prescriptions.find_one({"id": request.prescription_id}, {"_id": 0})
            if prescription and prescription["current_stock"] > 0:
                new_stock = prescription["current_stock"] - 1
                await db.prescriptions.update_one(
                    {"id": request.prescription_id},
                    {"$set": {"current_stock": new_stock}}
                )
        
        return {"success": True, "log": log.dict()}
    except Exception as e:
        logger.error(f"Log reminder error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/reminders/logs/patient/{patient_id}")
async def get_reminder_logs(patient_id: str, days: int = 30):
    """Get reminder logs for a patient"""
    try:
        since = datetime.utcnow() - timedelta(days=days)
        logs = await db.reminder_logs.find({
            "patient_id": patient_id,
            "created_at": {"$gte": since}
        }, {"_id": 0}).sort("created_at", -1).to_list(1000)
        
        return {"success": True, "logs": logs}
    except Exception as e:
        logger.error(f"Get reminder logs error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/reminders/adherence/{patient_id}")
async def get_adherence_stats(patient_id: str, days: int = 7):
    """Get adherence statistics for a patient"""
    try:
        since = datetime.utcnow() - timedelta(days=days)
        logs = await db.reminder_logs.find({
            "patient_id": patient_id,
            "created_at": {"$gte": since}
        }).to_list(1000)
        
        total = len(logs)
        took = len([log for log in logs if log["action"] == "took"])
        missed = len([log for log in logs if log["action"] == "missed"])
        snoozed = len([log for log in logs if log["action"] == "snoozed"])
        
        adherence_rate = (took / total * 100) if total > 0 else 0
        
        return {
            "success": True,
            "stats": {
                "total": total,
                "took": took,
                "missed": missed,
                "snoozed": snoozed,
                "adherence_rate": round(adherence_rate, 2)
            }
        }
    except Exception as e:
        logger.error(f"Get adherence stats error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============= OCR Route =============

@api_router.post("/ocr/recognize")
async def recognize_medicine(request: OCRRequest):
    """Use OCR to recognize medicine from image"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        
        # Initialize LLM with vision capability
        llm_key = os.environ.get('EMERGENT_LLM_KEY')
        if not llm_key:
            raise HTTPException(status_code=500, detail="LLM key not configured")
        
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"ocr_{uuid.uuid4()}",
            system_message="You are an expert at reading medicine labels and extracting information."
        ).with_model("openai", "gpt-4o")
        
        # Create image content
        image_content = ImageContent(image_base64=request.image_base64)
        
        # Query the LLM
        message = UserMessage(
            text="""Analyze this medicine image and extract the following information in JSON format:
            {
                "medicine_name": "extracted name",
                "strength": "dosage like 500mg",
                "form": "tablet/capsule/syrup etc",
                "manufacturer": "company name if visible",
                "confidence": 0.0-1.0
            }
            Only respond with valid JSON. If you cannot read the label clearly, set confidence to 0.""",
            file_contents=[image_content]
        )
        
        response = await chat.send_message(message)
        
        # Parse response
        import json
        try:
            extracted = json.loads(response)
        except:
            extracted = {
                "medicine_name": "Unknown",
                "strength": "",
                "form": "tablet",
                "confidence": 0.0
            }
        
        # Search for matching medications in database
        candidates = []
        if extracted.get("medicine_name") and extracted.get("medicine_name") != "Unknown":
            meds = await db.medications.find({
                "name": {"$regex": extracted["medicine_name"], "$options": "i"}
            }).limit(3).to_list(3)
            
            candidates = [
                {
                    "id": med["id"],
                    "name": med["name"],
                    "generic_name": med.get("generic_name", ""),
                    "form": med["form"],
                    "strength": med.get("strength", ""),
                    "confidence": 0.8
                }
                for med in meds
            ]
        
        return {
            "success": True,
            "extracted": extracted,
            "candidates": candidates
        }
    
    except Exception as e:
        logger.error(f"OCR recognition error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============= AI Assistant Route =============

@api_router.post("/ai/explain")
async def explain_medicine(request: AIQuery):
    """AI explanation of medicine"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        llm_key = os.environ.get('EMERGENT_LLM_KEY')
        if not llm_key:
            raise HTTPException(status_code=500, detail="LLM key not configured")
        
        # Get medication details
        medication = None
        if request.medication_id:
            medication = await db.medications.find_one({"id": request.medication_id}, {"_id": 0})
        elif request.medication_name:
            medication = await db.medications.find_one({
                "name": {"$regex": f"^{request.medication_name}$", "$options": "i"}
            })
        
        if not medication:
            return {
                "success": False,
                "message": "Medication not found"
            }
        
        # Build context
        med_name = medication["name"]
        generic_name = medication.get("generic_name", "")
        
        # Prepare query based on type
        if request.query_type == "summary":
            query = f"Explain {med_name} ({generic_name}) in simple language suitable for elderly patients. Include: 1) What it's used for, 2) Common dosage, 3) Important warnings. Keep it to 3-4 short bullet points."
        elif request.query_type == "interactions":
            query = f"What are common drug interactions with {med_name}? Also mention food interactions. Keep it brief and simple."
        elif request.query_type == "dosage":
            query = f"What is the typical dosage for {med_name}? Explain in simple terms for elderly patients."
        elif request.query_type == "side_effects":
            query = f"What are the common side effects of {med_name}? List only the most important ones in simple language."
        else:
            query = request.custom_query or f"Tell me about {med_name}"
        
        # Query LLM
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"ai_{uuid.uuid4()}",
            system_message="You are a helpful medical information assistant. Always provide information in simple, clear language suitable for elderly patients. Always add a disclaimer that patients should consult their doctor."
        ).with_model("openai", "gpt-4o-mini")
        
        message = UserMessage(text=query)
        response = await chat.send_message(message)
        
        # Add disclaimer
        disclaimer = "\n\n⚠️ This is informational only. Always follow your doctor's prescription and consult them for medical advice."
        
        return {
            "success": True,
            "explanation": response + disclaimer,
            "medication": {
                "name": med_name,
                "generic_name": generic_name
            }
        }
    
    except Exception as e:
        logger.error(f"AI explain error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============= Health Check =============

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "MediMinder API",
        "version": "1.0.0"
    }

# Include the router
app.include_router(api_router)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event
@app.on_event("startup")
async def startup_event():
    """Seed database on startup"""
    await seed_medicine_database()
    logger.info("MediMinder API started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
