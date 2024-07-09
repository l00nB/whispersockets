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

