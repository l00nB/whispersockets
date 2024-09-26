const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { io: ioClient } = require('socket.io-client');
const fs = require('fs');
const path = require('path');

// Serve the HTML client
app.use(express.static(__dirname));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'transcriber.html'));
});

// Connect to Whisper transcription service
const whisperSocket = ioClient('http://0.0.0.0:5000');

io.on('connection', (socket) => {
  console.log('User Connected');
  
  // Handle incoming audio data
  socket.on('audio', (audioBlob) => {
    console.log('Received Audio');

    // Handle the binary audio data (audioBlob)
    const buffer = Buffer.from(new Uint8Array(audioBlob));

    // Send the audio buffer to the Whisper transcription service
    whisperSocket.emit('transcribe', buffer);
  });

  // Handle client disconnection
  socket.on('disconnect', () => {
    console.log('User Disconnected');
  });
});

// Handle transcription result from Whisper service
whisperSocket.on('transcription', (text) => {
  console.log('Transcription received:', text);
  
  // Emit transcription result to all connected clients
  io.emit('transcription', text);
});

// Start the server
const PORT = 8080;
http.listen(PORT, () => {
  console.log(`Server running on Port ${PORT}`);
});
