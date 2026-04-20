import wave
import struct
import requests
import json
import os

def create_dummy_wav(filename):
    """Creates a 1-second dummy silent .wav file."""
    # Set parameters: mono, 2 bytes per sample, 44100 Hz, 1 second duration
    nchannels = 1
    sampwidth = 2
    framerate = 44100
    nframes = framerate
    
    print(f"Generating dummy audio: {filename}...")
    with wave.open(filename, 'w') as wav_file:
        wav_file.setparams((nchannels, sampwidth, framerate, nframes, 'NONE', 'not compressed'))
        for _ in range(nframes):
            value = 0 # silence
            data = struct.pack('<h', value)
            wav_file.writeframesraw(data)

def test_api():
    filename = "dummy_silence.wav"
    create_dummy_wav(filename)
    
    url = "http://localhost:8000/api/consultation/process"
    
    print(f"Sending audio to {url}...")
    
    try:
        with open(filename, 'rb') as f:
            files = {'audio_file': (filename, f, 'audio/wav')}
            response = requests.post(url, files=files)
            
            print(f"Status Code: {response.status_code}")
            if response.status_code == 200:
                print("\nSuccess! Full SOAP Note JSON:")
                print(json.dumps(response.json(), indent=2))
            else:
                print(f"\nAPI Error ({response.status_code}):")
                print(response.text)
                
    except requests.exceptions.ConnectionError:
        print("\nConnection Error: Make sure the FastAPI server is running at http://localhost:8000")
    except Exception as e:
        print(f"\nAn error occurred: {str(e)}")
    finally:
        if os.path.exists(filename):
            os.remove(filename)

if __name__ == "__main__":
    test_api()
