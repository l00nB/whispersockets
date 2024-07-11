/*const socket = io('http://localhost:5000');

socket.on('connect', function() {
    console.log('Connected to server');
}); */

const form = document.getElementById('chat-form');
const messages = document.getElementById('chat-message');
const recordButton = document.getElementById('record-button');
const micselect = document.getElementById('mic-select')

recordButton.onclick = function(){
    alert("Pressed a Button");
}


function getLocalStream() {
     navigator.mediaDevices
      .getUserMedia({ video: false, audio: true })
      .then((stream) => {
        window.localStream = stream; // A
        window.localAudio.srcObject = stream; // B
        window.localAudio.autoplay = true; // C
      })
      .catch((err) => {
        console.error(`you got an error: ${err}`);
      });
  }
getLocalStream();


var temp = document.createElement('option');
temp.innerHTML = 'Kein Mikrofon ausgewählt';
micselect.appendChild(temp);


navigator.mediaDevices.enumerateDevices()
.then(function(devices) {
  devices.forEach(function(device) { 
    if (device.kind === 'audioinput') {
      console.log("Microphone: " + device.label + " id = " + device.deviceId);
      var opt = document.createElement('option');
      opt.value = device.deviceId;  
      opt.innerHTML = device.label || `Microphone ${micselect.length}`+ device.deviceId;
      micselect.appendChild(opt);
    }
  });
})
.catch(function(err) {
    console.error(`you got an error: ${err}`);
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
