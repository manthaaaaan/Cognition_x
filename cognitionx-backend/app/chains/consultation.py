from typing import List, Optional
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from google.genai import types
from app.utils.audio import upload_to_gemini, wait_for_files_active, get_client
import os

# Pydantic models for structured output
class ClinicalFindings(BaseModel):
    symptoms: List[str] = Field(description="List of symptoms mentioned by the patient")
    diagnosis: List[str] = Field(description="Potential or confirmed diagnoses")
    duration: str = Field(description="Duration of symptoms")
    vitals: dict = Field(description="Extracted vital signs (temp, bp, heart rate, etc.)")

class MedicalMapping(BaseModel):
    icd10_codes: List[dict] = Field(description="List of ICD-10 codes with descriptions")
    drug_interactions: List[str] = Field(description="Potential drug-drug or drug-condition interactions")

class SOAPNote(BaseModel):
    subjective: str = Field(description="Patient's history, chief complaint, and symptoms")
    objective: str = Field(description="Physical examination and vitals")
    assessment: str = Field(description="Diagnosis and medical coding")
    plan: str = Field(description="Treatment plan, medications, and warnings")
    # New extraction fields
    patient_name: Optional[str] = Field(description="Extracted patient name if mentioned, else null")
    patient_age: Optional[str] = Field(description="Extracted patient age if mentioned, else null")
    patient_sex: Optional[str] = Field(description="Extracted patient sex if mentioned, else null")
    vitals_string: Optional[str] = Field(description="Concatenated string of vitals (e.g. BP 120/80, Temp 101F), else null")

class ConsultationChain:
    def __init__(self):
        # Support both GOOGLE_API_KEY and GEMINI_API_KEY
        api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash", 
            temperature=0,
            google_api_key=api_key
        )

    async def run(self, audio_path: str) -> SOAPNote:
        # 1. Transcription (unchanged)
        uploaded_file = upload_to_gemini(audio_path)
        wait_for_files_active([uploaded_file])

        client = get_client()
        transcription_prompt = "Transcribe this clinical consultation audio accurately. Identify the doctor and patient clearly."
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Part.from_uri(file_uri=uploaded_file.uri, mime_type="audio/wav"),
                types.Part.from_text(text=transcription_prompt)
            ]
        )
        transcript = response.text
        if not transcript or len(transcript.strip()) < 5:
            # Raise exception that will be caught by the router and returned as a 500 with this detail
            raise ValueError("No speech detected in audio or empty transcript.")

        # 2. Clinical Data Extraction (unchanged)
        extraction_llm = self.llm.with_structured_output(ClinicalFindings)
        extraction_prompt = ChatPromptTemplate.from_template(
            "Extract clinical findings from the following transcript:\n\n{transcript}"
        )
        findings = await (extraction_prompt | extraction_llm).ainvoke({"transcript": transcript})

        # 3. Medical Mapping (ICD-10 & Interactions) (unchanged)
        mapping_llm = self.llm.with_structured_output(MedicalMapping)
        mapping_prompt = ChatPromptTemplate.from_template(
            "Based on these findings, provide ICD-10-CM codes and check for drug interactions if medications were mentioned:\n\n{findings}"
        )
        mapping = await (mapping_prompt | mapping_llm).ainvoke({"findings": findings.model_dump_json()})

        # 4. SOAP Note Generation + Metadata Extraction
        soap_llm = self.llm.with_structured_output(SOAPNote)
        soap_prompt = ChatPromptTemplate.from_template(
            "Generate a professional, structured SOAP note based on the transcript and findings provided.\n\n"
            "ADDITIONALLY: Extract the patient's name, age, and sex if they were mentioned in the transcript. "
            "Also extract all vital signs (BP, Temp, HR, etc.) into a concise vitals_string. "
            "If any field is not mentioned, return null for it.\n\n"
            "Transcript: {transcript}\n\n"
            "Findings: {findings}\n\n"
            "Medical Mapping: {mapping}"
        )
        soap_note = await (soap_prompt | soap_llm).ainvoke({
            "transcript": transcript,
            "findings": findings.model_dump_json(),
            "mapping": mapping.model_dump_json()
        })

        return soap_note
