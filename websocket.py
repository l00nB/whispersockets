from flask import Flask, render_template
from flask_socketio import SocketIO
from flask_cors import CORS
import eventlet
import base64
from pydub import AudioSegment
import pyaudio
import wave
import io
import torch
import transformers

app = Flask(__name__)
CORS(app)
eventlet.monkey_patch()
socketio = SocketIO(app, cors_allowed_origins="*")

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def test_connect():
    print('Client connected')

@socketio.on('audio')
def handle_audio(data):
    audio_data = base64.b64decode(data)
    
    # Convert audio to WAV format for playback
    audio = AudioSegment.from_file(io.BytesIO(audio_data), format="ogg")
    wav_data = io.BytesIO()
    audio.export(wav_data, format='wav')
    wav_data.seek(0)

    # Play the audio using PyAudio
    p = pyaudio.PyAudio()
    wf = wave.open(wav_data, 'rb')

    def callback(in_data, frame_count, time_info, status):
        data = wf.readframes(frame_count)
        return (data, pyaudio.paContinue)

    stream = p.open(format=p.get_format_from_width(wf.getsampwidth()),
                    channels=wf.getnchannels(),
                    rate=wf.getframerate(),
                    output=True,
                    stream_callback=callback)

    stream.start_stream()

    while stream.is_active():
        eventlet.sleep(0.1)

    stream.stop_stream()
    stream.close()
    wf.close()
    p.terminate()

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)