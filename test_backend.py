import requests
import wave
import struct

url = "https://cognitionx-production.up.railway.app/api/consultation/process"

filename = "test.wav"
with wave.open(filename, 'w') as f:
    f.setnchannels(1)
    f.setsampwidth(2)
    f.setframerate(44100)
    for i in range(44100): # 1 second of silence
        value = 0
        data = struct.pack('<h', value)
        f.writeframesraw(data)

with open(filename, "rb") as f:
    files = {"audio_file": ("consultation.wav", f, "audio/wav")}
    data = {"language_hint": "Auto"}
    response = requests.post(url, files=files, data=data)

print(response.status_code)
print(response.text)
