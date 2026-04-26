from fastapi import FastAPI
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import os

# Load environment variables from .env file
load_dotenv()

# Handle Google Cloud Service Account JSON for Production (Railway)
if "GOOGLE_APPLICATION_CREDENTIALS_JSON" in os.environ:
    import tempfile
    creds_json = os.environ["GOOGLE_APPLICATION_CREDENTIALS_JSON"]
    temp_creds_path = os.path.join(tempfile.gettempdir(), "gcp-key.json")
    with open(temp_creds_path, "w") as f:
        f.write(creds_json)
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = temp_creds_path

from app.routes.consultation import router as consultation_router
from app.routes.translate import router as translate_router
from app.routes.outbreak import router as outbreak_router
from app.routes.chat import router as chat_router

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
app.include_router(translate_router)
app.include_router(outbreak_router)
app.include_router(chat_router)

@app.get("/")
async def root():
    return {"message": "Welcome to CognitionX Backend API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
