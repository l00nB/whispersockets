import socketio
import asyncio
import numpy as np
import whisperx
import torch
import logging
from aiohttp import web
from queue import Queue

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

sio = socketio.AsyncServer(async_mode='aiohttp', cors_allowed_origins='*')
app = web.Application()
sio.attach(app)

# Whisper model configuration
DEVICE = "cpu"  # Change to "cuda" if using GPU
COMPUTE_TYPE = "float32"  # Change to "float16" or "int8" if low on GPU memory
MODEL_SIZE = "base"  # Change to "small", "medium", or "large" as needed

# Audio configuration
SAMPLE_RATE = 16000
CHUNK_SIZE = 4000
MAX_BUFFER_SIZE = SAMPLE_RATE * 30  # 30 seconds of audio at 16kHz

model = whisperx.load_model(MODEL_SIZE, DEVICE, compute_type=COMPUTE_TYPE)
audio_buffer = Queue()

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")
    await sio.emit('connection_established', {'message': 'Connected to audio server'}, room=sid)

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")

@sio.event
async def start_stream(sid):
    logger.info(f"Starting stream for client: {sid}")
    await sio.emit('stream_started', {'message': 'Audio stream started'}, room=sid)

@sio.event
async def end_stream(sid):
    logger.info(f"Ending stream for client: {sid}")
    await sio.emit('stream_ended', {'message': 'Audio stream ended'}, room=sid)

@sio.event
async def audio_chunk(sid, data):
    audio_buffer.put(data)
    logger.debug(f"Received audio chunk from {sid} (size: {len(data)} bytes)")
    if audio_buffer.qsize() * CHUNK_SIZE >= SAMPLE_RATE * 2:  # Process every 2 seconds of audio
        await process_audio_buffer(sid)

async def process_audio_buffer(sid):
    try:
        audio_data = b''
        while not audio_buffer.empty() and len(audio_data) < MAX_BUFFER_SIZE:
            audio_data += audio_buffer.get()
        
        if audio_data:
            transcription = await transcribe(audio_data)
            if transcription:
                await sio.emit('transcription', {'text': transcription}, room=sid)
    except Exception as e:
        logger.error(f"Error processing audio buffer: {str(e)}")

async def transcribe(audio_data):
    try:
        audio_array = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0
        audio_tensor = torch.from_numpy(audio_array).to(DEVICE)
        
        result = model.transcribe(audio_tensor, batch_size=16)
        transcription = result["text"].strip()
        return transcription
    except Exception as e:
        logger.error(f"Error in transcription: {str(e)}")
        return None

async def cleanup(app):
    torch.cuda.empty_cache()

if __name__ == '__main__':
    app.on_cleanup.append(cleanup)
    web.run_app(app, host='0.0.0.0', port=5000)