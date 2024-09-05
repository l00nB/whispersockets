import socketio
import eventlet
import whisperx
import torch
import numpy as np
import queue
import gc

sio = socketio.AsyncServer(async_mode='aiohttp')

from aiohttp import web

app = web.Application()
sio.attach(app)
audio = "empty"
device = "cpu" #change to GPU if in production
batch_size = 16 #lower if GPU-poor
compute_type = "float16" # change to "int8" if low on GPU mem (may reduce accuracy)

model = whisperx.load_model("large-v2",device, compute_type = compute_type)

async def connect(sid):
    print(f"Client connected:{sid}")
    await sio.emit('message',{'data': 'Connected to audio Server'},room=sid)

async def audio_receive(sid,data):
    print(f"Received audio data from {sid} (size: {len(data)} bytes)")
    audio = data
    transcription = await transcribe(audio)
    return transcription

async def transcribe(audio):
    if audio:
        transcription=model.transcribe(audio,batch_size=batch_size)
        return transcription
    else:
        return "no Audio received"

async def text_send():
     await sio.emit(transcribe(audio_receive))

if __name__ == '__main__':
    web.run_app(app, port=5000)