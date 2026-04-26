import firebase_admin
from firebase_admin import credentials, firestore
import os
from datetime import datetime
from typing import List, Dict

# Support for local development vs production
def get_firestore_client():
    try:
        if not firebase_admin._apps:
            # In production/deployment, use default credentials
            # For local, you can set GOOGLE_APPLICATION_CREDENTIALS
            firebase_admin.initialize_app()
        return firestore.client()
    except Exception as e:
        print(f"Warning: Firebase not initialized. Records will not be saved. {str(e)}")
        return None

def save_anonymized_consultation(symptoms: List[str], district: str):
    db = get_firestore_client()
    if not db:
        return
    
    # District default if none found
    if not district or district.lower() == "null":
        district = "Unknown"

    try:
        doc_ref = db.collection('clinical_records').document()
        doc_ref.set({
            'symptoms': symptoms,
            'district': district,
            'timestamp': datetime.utcnow(),
            'is_anonymized': True
        })
        print(f"Saved anonymized record to Firestore for district: {district}")
    except Exception as e:
        print(f"Error saving to Firestore: {str(e)}")

def get_recent_records(hours: int = 72) -> List[Dict]:
    db = get_firestore_client()
    if not db:
        # Mock data for demonstration if Firebase is not connected
        return [
            {"district": "Bangalore", "symptoms": ["Fever", "Cough"], "timestamp": datetime.now()},
            {"district": "Bangalore", "symptoms": ["Fever", "Headache"], "timestamp": datetime.now()},
            {"district": "Mysore", "symptoms": ["Fever", "Body Ache"], "timestamp": datetime.now()},
        ]
    
    try:
        from datetime import timedelta
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        docs = db.collection('clinical_records').where('timestamp', '>=', cutoff).stream()
        return [doc.to_dict() for doc in docs]
    except Exception as e:
        print(f"Error fetching from Firestore: {str(e)}")
        return []

def save_field_report(report_data: Dict):
    db = get_firestore_client()
    if not db:
        return
    
    try:
        doc_ref = db.collection('field_reports').document()
        report_data['timestamp'] = datetime.utcnow()
        doc_ref.set(report_data)
        print(f"Saved field report from: {report_data.get('asha_name')}")
    except Exception as e:
        print(f"Error saving field report: {str(e)}")

def get_field_reports() -> List[Dict]:
    db = get_firestore_client()
    if not db:
        return [
            {
                "asha_name": "Lakshmi Devi",
                "patient_name": "Aman Verma",
                "urgency": "HIGH",
                "location": "12.9716, 77.5946",
                "summary": {"assessment": "Suspected Typhoid"}
            }
        ]
    
    try:
        docs = db.collection('field_reports').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(20).stream()
        return [doc.to_dict() for doc in docs]
    except Exception as e:
        print(f"Error fetching field reports: {str(e)}")
        return []
