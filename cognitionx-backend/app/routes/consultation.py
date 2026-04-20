from fastapi import APIRouter, UploadFile, File, HTTPException
from app.chains.consultation import ConsultationChain
import shutil
import os
import uuid

router = APIRouter(prefix="/api/consultation", tags=["consultation"])
consultation_chain = ConsultationChain()

@router.post("/process")
async def process_consultation(audio_file: UploadFile = File(...)):
    # 1. Save temporary file
    temp_dir = "temp_audio"
    os.makedirs(temp_dir, exist_ok=True)
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(audio_file.filename)[1]
    temp_path = os.path.join(temp_dir, f"{file_id}{ext}")

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)

        # 2. Run the chain
        soap_note = await consultation_chain.run(temp_path)
        
        return soap_note

    except Exception as e:
        print(f"Error processing consultation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # 3. Cleanup temp file
        import time
        try:
            time.sleep(0.5)
            if os.path.exists(temp_path):
                os.remove(temp_path)
        except Exception as e:
            print(f"Warning: Could not delete temp file {temp_path}: {str(e)}")
            pass
