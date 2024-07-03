var messagewindow = document.getElementById('message-input');
messagewindow.addEventListener('focus', function() {
    messagewindow.setAttribute('placeholder', '')

})
messagewindow.addEventListener('blur', function() {
    messagewindow.setAttribute('placeholder', 'Placeholder')

})

const form = document.getElementById('chat-form')
const input = document.getElementById('message-input')
const messages = document.getElementById('chat-message')

const recordbutton = document.getElementById('record-button')


var socket = new Websocket('Flask Server here')

navigator.mediaDevices.getUserMedia({ audio: true})
    .then(function(stream){
        var mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = function(event) {
            if (event.data.size > 0){
                socket.send(event.data);
        }
    }
});

recordbutton.addEventListener('click', function(){
    if (mediaRecorder.state == 'inactive'){
        alert('Recording Started')
        mediaRecorder.start();
    }else{
        alert('Recording Stopped')
        mediaRecorder.stop();
    }
});



