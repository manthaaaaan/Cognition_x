from fastapi import APIRouter, HTTPException
from app.utils.firebase import get_recent_records
from app.utils.audio import get_client
from google.genai import types
import collections
from typing import List, Dict

router = APIRouter(prefix="/api/outbreak", tags=["outbreak"])

@router.get("/analyze")
async def analyze_outbreaks():
    # 1. Fetch records from last 72 hours
    records = get_recent_records(hours=72)
    
    if not records:
        return {"alerts": [], "clusters": []}
    
    # 2. Group by district
    district_groups = collections.defaultdict(list)
    for rec in records:
        district_groups[rec['district']].append(rec)
    
    alerts = []
    clusters = []
    
    client = get_client()
    
    # 3. Analyze each district with 10+ records
    for district, cases in district_groups.items():
        # Heatmap data point
        clusters.append({
            "district": district,
            "count": len(cases),
            # Mock coordinates for visualization (usually would use a geocoding API)
            "lat": 12.9716 if district == "Bangalore" else 12.2958 if district == "Mysore" else 15.3173,
            "lng": 77.5946 if district == "Bangalore" else 76.6394 if district == "Mysore" else 75.7139
        })
        
        if len(cases) >= 10:
            # Prepare symptoms list for Gemini
            symptoms_summary = []
            for c in cases:
                symptoms_summary.append(", ".join(c['symptoms']))
            
            symptoms_text = "\n- ".join(symptoms_summary)
            
            prompt = (
                f"Analyze the following {len(cases)} anonymized patient symptom reports from the district of {district}. "
                "Detect if there is a statistically significant pattern indicating a disease outbreak (e.g., Dengue, Flu, Cholera). "
                "If a pattern is detected, describe the suspected disease and the urgency level.\n\n"
                f"Symptom Reports:\n- {symptoms_text}\n\n"
                "Return a JSON object with: 'is_outbreak' (bool), 'disease' (str), 'urgency' (HIGH, MEDIUM, LOW), 'reasoning' (str)."
            )
            
            try:
                response = client.models.generate_content(
                    model="gemini-1.5-flash",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json"
                    )
                )
                
                import json
                analysis = json.loads(response.text)
                
                if analysis.get('is_outbreak'):
                    alerts.append({
                        "district": district,
                        "disease": analysis.get('disease'),
                        "urgency": analysis.get('urgency'),
                        "reasoning": analysis.get('reasoning'),
                        "cases": len(cases)
                    })
            except Exception as e:
                print(f"Error analyzing outbreak for {district}: {str(e)}")
                
    return {
        "alerts": alerts,
        "clusters": clusters
    }
