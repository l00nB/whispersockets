const express = require('express')
const app = express()
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');

app.use(express.static(__dirname))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/transcriber.html');
});

io.on('connection',(socket) => {
  console.log('User Connected');
      socket.on('audio',(audioChunk) =>{
      console.log('received Audio')
        fs.appendFile('test.wav', audioChunk, (err) =>{
          if(err)throw err;
        });
    });
  socket.on('disconnect',() =>{
      console.log('User Disconnected');
  });    
});

const PORT = 8080;

http.listen(PORT,() =>{
  console.log('Server running on Port',{PORT});
});
    