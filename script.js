const socket = io('http://localhost:5000');

socket.on('connect', function() {
    console.log('Connected to server');
});

const form = document.getElementById('chat-form');
const messages = document.getElementById('chat-message');
const recordButton = document.getElementById('record-button');

recordButton.onclick = function(){
    alert("Pressed a Button");
}

function updateRecordingState(isRecording) {
    if (mediaRecorder) {
        if (isRecording) {
            recordButton.style.backgroundColor = '#ff4136'; // Red color when recording
        } else {
            recordButton.style.backgroundColor = '#2193b0'; // Original color when not recording
        }
    }
}