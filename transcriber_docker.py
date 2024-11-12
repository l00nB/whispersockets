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
import os
import multiprocessing
from silero_vad import load_silero_vad, read_audio, get_speech_timestamps


logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
torch.cuda.empty_cache()
os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'expandable_segments:True'

sio = socketio.AsyncServer(async_mode='aiohttp', cors_allowed_origins='*')
app = web.Application()
sio.attach(app)

# Load the model once at startup
model = whisper.load_model('turbo')
if not torch.cuda.is_available():
    total_cores = multiprocessing.cpu_count()
    num_cores_to_use = (total_cores * 0.8)
    torch.set_num_threads(int(num_cores_to_use))


TEMP_DIR = os.path.join(os.getcwd(), 'temp_audio')
os.makedirs(TEMP_DIR, exist_ok=True)

#use Silero VAD to detect speech
vad_model = load_silero_vad()
def has_speech(wavfile)->bool:
    wav = read_audio(wavfile)
    speech_timestamps = get_speech_timestamps(
    wav,
    vad_model,
    return_seconds=True,
    )
    return bool(speech_timestamps)
def remove_file(filepath):
    try:
        os.remove(filepath)
    except Exception as e:
        logger.error(f"Error deleting File: {e}")

def process_wav_bytes(webm_bytes: bytes, sample_rate: int = 16000):
    try:
        # Use delete=False to ensure the file isn't locked
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False, dir=TEMP_DIR) as temp_file:
            temp_file.write(webm_bytes)
            temp_file.flush()
            temp_file_path = temp_file.name

        return temp_file_path
    except Exception as e:
        logger.error(f"Error processing audio: {e}")
        raise

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
        audio_path= process_wav_bytes(bytes(audio_data))
        
        if has_speech(audio_path) is False:
            print("Audio not Found")
            remove_file(audio_path)
            return
        audio = whisper.load_audio(audio_path, sr=16000)
        # Make sure audio is the right shape
        remove_file(audio_path)
        if len(audio.shape) == 1:
            audio = audio.reshape(1, -1)
        
        # Convert to float32 if not already
        audio = audio.astype(np.float32)
        
        # Pad or trim the audio
        audio = whisper.pad_or_trim(audio.flatten())
        
        # Decode the audio
        result = whisper.transcribe(model,audio,language='de')
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
