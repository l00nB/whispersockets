/*const socket = io('http://localhost:5000');

socket.on('connect', function() {
    console.log('Connected to server');
}); */

const form = document.getElementById('chat-form');
const messages = document.getElementById('chat-message');
const recordButton = document.getElementById('record-button');
const micselect = document.getElementById('mic-select')

navigator.mediaDevices.getUserMedia({ audio: true })
  .then(function(stream) {
    console.log('Mic Permissions granted');
    
    var temp = document.createElement('option');
    temp.innerHTML = 'Kein Mikrofon ausgewählt';
    micselect.appendChild(temp);

    navigator.mediaDevices.enumerateDevices()
      .then(function(devices) {
        var mics = devices.filter(function(device) {
          return device.kind === 'audioinput';
        });
        
        mics.forEach(function(mic) {
          console.log("Microphone: " + mic.label + " id = " + mic.deviceId);
          var opt = document.createElement('option');
          opt.value = mic.deviceId;
          opt.innerHTML = mic.label || `Microphone ${micselect.length}`;
          micselect.appendChild(opt);
        });
      })
      .catch(function(err) {
        console.error(`You got an error: ${err}`);
      });
  })
  .catch(function(err) {
    console.log('Mic Permissions not granted');
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
