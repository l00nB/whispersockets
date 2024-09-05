const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { io: ioClient } = require('socket.io-client');


app.use(express.static(__dirname));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/transcriber.html');
});

const whisperSocket = ioClient('http://whisper-container:3000');

io.on('connection', (socket) => {
  console.log('User Connected');
  
  socket.on('audio', (audioChunk) => {
    console.log('Received Audio');
    
    // Audio-Daten an den Whisper-Container senden
    whisperSocket.emit('transcribe', audioChunk);

    });
  });
   socket.on('disconnect', () => {
    console.log('User Disconnected');
  });

whisperSocket.on('transcription', (text) => {
  console.log('Transcription received:', text);
  io.emit('transcription', text);
});

const PORT = 8080;

http.listen(PORT, () => {
  console.log('Server running on Port', PORT);
});