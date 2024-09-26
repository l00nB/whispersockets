import socketio
import asyncio
import numpy as np
import whisperx
import torch
import logging
from aiohttp import web
from queue import Queue

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
model = whisperx.load_model(MODEL_SIZE, DEVICE, compute_type=COMPUTE_TYPE)
audio_buffer = Queue()

# Global variable to store any leftover audio data from previous chunks
audio_buffer_incomplete = b''

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
    transcription = await transcribe_audio(audio_data)
    if transcription:
        await sio.emit('transcription', {'text': transcription}, room=sid)

# there is something particularly wrong with this
# i think giving Whisper less than 30 seconds just breaks it completly

async def transcribe_audio(audio_data):
    global audio_buffer_incomplete
    try:
        # Append incoming audio data to any incomplete data from previous chunks
        audio_data = audio_buffer_incomplete + audio_data
        # Check if the length of the audio data is a multiple of 2 (int16 alignment)
        if len(audio_data) % 2 != 0:
            # Save the incomplete byte(s) to buffer and process the rest
            audio_buffer_incomplete = audio_data[-1:]  # Save the last incomplete byte
            audio_data = audio_data[:-1]  # Process the rest (complete audio data)
        else:
            audio_buffer_incomplete = b''  # Clear buffer if the data is complete

        # Proceed only if we have valid audio data to process
        if len(audio_data) == 0:
            logger.debug("No valid audio data to process")
            return None

        # Convert audio bytes to numpy array
        audio_array = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0

        # Log audio array information for debugging
        logger.debug(f"Audio array shape: {audio_array.shape}, dtype: {audio_array.dtype}")

        # Ensure the audio is at the correct sample rate (16000 Hz)
        if len(audio_array) != SAMPLE_RATE:
            logger.warning(f"Unexpected audio length: {len(audio_array)}. Expected: {SAMPLE_RATE}")
        # You can implement resampling here if needed

        # Perform using the Whisper model
        result = model.transcribe(audio_array, batch_size=16)
        print(result)
        # Debugging: Log the entire result to inspect the output structure
        logger.debug(f"Transcription result: {result}")
        # Check if result is a dictionary
        if isinstance(result, dict):
            # If 'text' is directly in the result
            if "text" in result:
                transcription = result["text"].strip()
                return transcription
            # If 'segments' is in the result (common structure for some Whisper models)
            elif "segments" in result and isinstance(result["segments"], list):
                transcription = " ".join([segment.get("text", "").strip() for segment in result["segments"]])
                return transcription
            else:
                logger.error(f"Unexpected result structure. Keys found: {result.keys()}")
                return None
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