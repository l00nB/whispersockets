const form = document.getElementById('chat-form');
const messages = document.getElementById('chat-message');
const recordButton = document.getElementById('record-button');
const micselect = document.getElementById('mic-select')
const socket = io();

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
    var opt = document.createElement('option');
    opt.innerHTML = "Kein Mikrofon gefunden";
    micselect.appendChild(opt);
  });

recordButton.onclick = async() =>{
  const selectedMic = micselect.value;
  console.log(selectedMic);
      const constraints = {
        audio: {
            deviceId: selectedMic ? { exact: selectedMic } : undefined
        }
    };
    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('Using microphone:', selectedMic);
        mediaRecorder = new MediaRecorder(stream);
        let audioChunks = [];
        mediaRecorder.ondataavailable = (event) =>{
          audioChunks.push(event.data);
        };
        mediaRecorder.onstop = () =>{
        const audioBlob = new Blob(audioChunks,{type:'audio/wav'});
        socket.emit('audio',audioBlob);
        };
      mediaRecorder.start();
      recordButton.onclick = () =>{
        mediaRecorder.stop();
      };
    } catch (err) {
        console.error('Error accessing the microphone:', err);
    }
};

socket.on('transcription',(text) =>{
  console.log('transcription received from Server');
  const chatBox = document.getElementById('chat');
  const newMessage = document.createElement('p');
  newMessage.textContent = text;
  chatBox.appendChild(newMessage);
});

function updateRecordingState(isRecording) {
    if (mediaRecorder) {
        if (isRecording) {
            recordButton.style.backgroundColor = '#ff4136'; 
        } else {
            recordButton.style.backgroundColor = '#2193b0';
        }
    }
}
