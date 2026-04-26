import os
import time
from google import genai
from dotenv import load_dotenv

load_dotenv()

# We support both GOOGLE_API_KEY and GEMINI_API_KEY
API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")

def get_client():
    return genai.Client(api_key=API_KEY)

def upload_to_gemini(path, mime_type=None):
    """Uploads the given file to Gemini File API."""
    client = get_client()
    config = {}
    if mime_type:
        config["mime_type"] = mime_type
    with open(path, 'rb') as f:
        file = client.files.upload(file=f, config=config)
    print(f"Uploaded file '{file.display_name}' as: {file.uri}")
    return file

def wait_for_files_active(files):
    """Waits for the given files to be active (processed) using the new google-genai SDK."""
    client = get_client()
    print("Waiting for file processing...")
    for f in files:
        file = client.files.get(name=f.name)
        while file.state == "PROCESSING":
            print(".", end="", flush=True)
            time.sleep(2)
            file = client.files.get(name=f.name)
        if file.state != "ACTIVE":
            raise Exception(f"File {file.name} failed to process with state: {file.state}")
    print("...all files active")
