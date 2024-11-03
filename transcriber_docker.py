import socketio
import numpy as np
import whisper
import torch
import logging
from aiohttp import web
import io
import tempfile
import base64
import traceback

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

sio = socketio.AsyncServer(async_mode='aiohttp', cors_allowed_origins='*')
app = web.Application()
sio.attach(app)

# Load the model once at startup
model = whisper.load_model('base.en')

def process_wav_bytes(webm_bytes: bytes, sample_rate: int = 16000):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=True) as temp_file:
        temp_file.write(webm_bytes)
        temp_file.flush()
        waveform = whisper.load_audio(temp_file.name, sr=sample_rate)
        return waveform

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")
    await sio.emit('connection_established', {'message': 'Connected to audio server'}, room=sid)

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")

@sio.event
async def transcribe(sid, audio_data):
    logger.debug(f"Received audio chunk from {sid} (size: {len(audio_data)} bytes)")
    try:
        # Handle base64 string
        if isinstance(audio_data, str):
            audio_data = base64.b64decode(audio_data)
        
        # Process audio
        audio = process_wav_bytes(bytes(audio_data))
        
        # Make sure audio is the right shape
        if len(audio.shape) == 1:
            audio = audio.reshape(1, -1)
        
        # Convert to float32 if not already
        audio = audio.astype(np.float32)
        
        # Pad or trim the audio
        audio = whisper.pad_or_trim(audio.flatten())
        
        # Decode the audio
        result = whisper.transcribe(model,audio)
        print(result['text'])
        await sio.emit('transcription',result['text'])

    except Exception as e:
        logger.error(f"Error in transcription: {str(e)}")
        traceback.print_exc()

async def cleanup(app):
    torch.cuda.empty_cache()

if __name__ == '__main__':
    app.on_cleanup.append(cleanup)
    web.run_app(app, host='0.0.0.0', port=5000)