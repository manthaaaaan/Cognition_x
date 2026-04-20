from fastapi import FastAPI
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import os

# Load environment variables from .env file
load_dotenv()

from app.routes.consultation import router as consultation_router

app = FastAPI(title="CognitionX Backend")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For demo purposes, allow all. In production, restrict this.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(consultation_router)

@app.get("/")
async def root():
    return {"message": "Welcome to CognitionX Backend API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
