from flask import Flask, render_template
from flask_socketio import SocketIO
import eventlet
import base64
from pydub import AudioSegment
import simpleaudio as sa

app = Flask(__name__)
socketio = SocketIO(app, async_mode='eventlet')

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('audio')
def handle_audio(data):
    audio_data = base64.b64decode(data)
    with open('received_audio.ogg', 'wb') as audio_file:
        audio_file.write(audio_data)

    # Convert audio to WAV format for playback
    audio = AudioSegment.from_file('received_audio.ogg')
    audio.export('received_audio.wav', format='wav')

    # Play the audio
    wave_obj = sa.WaveObject.from_wave_file('received_audio.wav')
    play_obj = wave_obj.play()
    play_obj.wait_done()

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)

