from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.utils.audio import upload_to_gemini, wait_for_files_active, get_client
from google.genai import types
import os
import uuid
import base64
import shutil

router = APIRouter(prefix="/api/consultation", tags=["translation"])

@router.post("/translate")
async def translate_turn(
    audio_file: UploadFile = File(...),
    role: str = Form(...), # "patient" or "doctor"
    target_lang: str = Form(...), # The language the OTHER person needs to hear/see
):
    # Save temp file
    temp_dir = "temp_audio"
    os.makedirs(temp_dir, exist_ok=True)
    file_id = str(uuid.uuid4())
    temp_path = os.path.join(temp_dir, f"translate_{file_id}.wav")
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)
            
        # 1. Upload to Gemini
        uploaded_file = upload_to_gemini(temp_path)
        wait_for_files_active([uploaded_file])
        
        client = get_client()
        
        if role == "patient":
            # Patient speaks Native -> Doctor sees English
            prompt = f"The user is a patient speaking in {target_lang}. Translate their speech accurately into English text for the doctor. Only return the English translation."
            modalities = ["TEXT"]
        else:
            # Doctor speaks English -> Patient hears Native
            prompt = f"The user is a doctor speaking in English. Translate their medical advice accurately into {target_lang} text AND generate speech for that {target_lang} translation. Provide BOTH the translation text and the audio output."
            modalities = ["TEXT", "AUDIO"]

        config = types.GenerateContentConfig(
            response_modalities=modalities,
        )

        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=[
                types.Part.from_uri(file_uri=uploaded_file.uri, mime_type=uploaded_file.mime_type),
                types.Part.from_text(text=prompt)
            ],
            config=config
        )

        translated_text = ""
        audio_base64 = None
        
        # In Gemini 2.0, parts can contain text or inline_data (audio)
        for part in response.candidates[0].content.parts:
            if part.text:
                translated_text += part.text
            if part.inline_data:
                audio_base64 = base64.b64encode(part.inline_data.data).decode('utf-8')
                
        return {
            "translated_text": translated_text.strip(),
            "audio": audio_base64
        }

    except Exception as e:
        print(f"Translation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass
