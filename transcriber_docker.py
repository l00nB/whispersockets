import socketio
import numpy as np
import whisper
import torch
import logging
from aiohttp import web
import io
import soundfile as sf

logging.basicConfig(level=logging.DEBUG)  # Set to DEBUG for more detailed logs
logger = logging.getLogger(__name__)

sio = socketio.AsyncServer(async_mode='aiohttp', cors_allowed_origins='*')
app = web.Application()
sio.attach(app)

# Whisper model configuration
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
COMPUTE_TYPE = "float32"  # Change to "float16" or "int8" if GPU-Poor
MODEL_SIZE = "small"  # Change to "small", "medium", or "large" as needed

# Audio configuration
SAMPLE_RATE = 16000
CHUNK_SIZE = 4000
MAX_BUFFER_SIZE = SAMPLE_RATE * 30  # 30 seconds of audio at 16kHz

# Load the model once at startup
model = whisper.load_model(MODEL_SIZE)


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
async def transcribe(sid, audio_data):
    logger.debug(f"Received audio chunk from {sid} (size: {len(audio_data)} bytes)")
    print(audio_data[:10])
    transcription = await transcribe_audio(audio_data)
    if transcription:
        await sio.emit('transcription', {'text': transcription}, room=sid)

async def transcribe_audio(audio_data):
    try:
        audio_array = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0

        # Log audio array information for debugging
        logger.debug(f"Audio array shape: {audio_array.shape}, dtype: {audio_array.dtype}")
        if len(audio_array)%2 != 0:
            audio_array = audio_array[:-1]

        if len(audio_array) != MAX_BUFFER_SIZE:
            logger.warning(f"Unexpected audio length: {len(audio_array)}. Expected: {MAX_BUFFER_SIZE}")
        # Perform using the Whisper model
        result = model.transcribe(audio_data)
        print(result)
        # Debugging: Log the entire result to inspect the output structure
        logger.debug(f"Transcription result: {result}")
        # Check if result is a dictionary
        if type(result)==str:
            return result
        else:
            logger.error(f"Unexpected result type: {type(result)}. Content: {result}")
            return None

    except Exception as e:
        logger.error(f"Error in transcription: {str(e)}")
        return None

async def cleanup(app):
    torch.cuda.empty_cache()

if __name__ == '__main__':
    app.on_cleanup.append(cleanup)
    web.run_app(app, host='0.0.0.0', port=5000)
