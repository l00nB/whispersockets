const socket = io('http://localhost:5000');

socket.on('connect', function() {
    console.log('Connected to server');
});

const messageWindow = document.getElementById('message-input');
const form = document.getElementById('chat-form');
const input = document.getElementById('message-input');
const messages = document.getElementById('chat-message');
const recordButton = document.getElementById('record-button');

let mediaRecorder;
let audioChunks = [];

messageWindow.addEventListener('focus', function() {
    messageWindow.setAttribute('placeholder', '');
});

messageWindow.addEventListener('blur', function() {
    messageWindow.setAttribute('placeholder', 'Type your message...');
});

recordButton.disabled = true;

navigator.mediaDevices.getUserMedia({ audio: true })
    .then(function(stream) {
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = function(event) {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = function() {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav; codecs=opus' });
            audioChunks = [];
            
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = function() {
                let base64data = reader.result.split(',')[1];
                socket.emit('audio', base64data);
            };
        };

        // Enable the button once mediaRecorder is initialized
        recordButton.disabled = false;
    })
    .catch(function(err) {
        console.error('Error accessing the microphone:', err);
    });

recordButton.addEventListener('click', function() {
    if (mediaRecorder && mediaRecorder.state === 'inactive') {
        mediaRecorder.start();
        recordButton.textContent = 'Stop Recording';
        updateRecordingState(true);
        console.log('Recording Started');
        } else if (mediaRecorder) {
        mediaRecorder.stop();
        recordButton.textContent = 'Start Recording';
        updateRecordingState(false);
        console.log('Recording Stopped');
    }
});

form.addEventListener('submit', function(e) {
    e.preventDefault();
    if (input.value) {
        console.log('Message sent:', input.value);
        input.value = '';
    }
});

socket.on('connect_error', (error) => {
    console.log('Connection Error:', error);
});

socket.on('error', (error) => {
    console.log('Socket Error:', error);
});

function addMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.classList.add('message-box');
    messages.appendChild(messageElement);
    messages.scrollTop = messages.scrollHeight;
}
recordButton.addEventListener('click', function(){
    addMessage('Test')
});
socket.on('transcription', function(data) {
    addMessage('Transcription: ' + data);
});

function updateRecordingState(isRecording) {
    if (mediaRecorder) {
        if (isRecording) {
            recordButton.style.backgroundColor = '#ff4136'; // Red color when recording
        } else {
            recordButton.style.backgroundColor = '#2193b0'; // Original color when not recording
        }
    }
}

// Add this to ensure the recording stops if the page is closed
window.onbeforeunload = function() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
};