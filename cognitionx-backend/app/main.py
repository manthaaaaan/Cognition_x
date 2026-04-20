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
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "https://cognitionx-frontend.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
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
