const form = document.getElementById('chat-form');
const recordButton = document.getElementById('record-button');
const micSelect = document.getElementById('mic-select');
const socket = io();
let sendlength = 5;

let isRecording = false;
let audioChunks = [];

navigator.mediaDevices.getUserMedia({ audio: true })
  .then(function(stream) {
    console.log('Mic Permissions granted');
    populateMicrophoneList();
  })
  .catch(function(err) {
    console.log('Mic Permissions not granted');
    const opt = document.createElement('option');
    opt.innerHTML = "Kein Mikrofon gefunden";
    micSelect.appendChild(opt);
  });

function populateMicrophoneList() {
  const defaultOption = document.createElement('option');
  defaultOption.innerHTML = 'Kein Mikrofon ausgewählt';
  micSelect.appendChild(defaultOption);

  navigator.mediaDevices.enumerateDevices()
    .then(function(devices) {
      const mics = devices.filter(device => device.kind === 'audioinput');
      mics.forEach(function(mic, index) {
        console.log(`Microphone: ${mic.label} id = ${mic.deviceId}`);
        const opt = document.createElement('option');
        opt.value = mic.deviceId;
        opt.innerHTML = mic.label || `Microphone ${index + 1}`;
        micSelect.appendChild(opt);
      });
    })
    .catch(function(err) {
      console.error(`Error enumerating devices: ${err}`);
    });
}

recordButton.onclick = async () => {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
};

async function startRecording() {
  const selectedMic = micSelect.value;
  console.log(`Selected microphone: ${selectedMic}`);
  const constraints = {
    audio: {
      deviceId: selectedMic ? { exact: selectedMic } : undefined,
    }
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (event) =>{
      audioChunks.push(event.data);
      console.log(mediaRecorder.state);
      console.log(mediaRecorder.mimeType);
    };
    mediaRecorder.start(1000);
    isRecording = true;
    updateRecordingState();
    console.log(audioChunks.length)
    // Set up interval to send audio every 5 seconds
    const sendInterval = setInterval(() => {
      if (audioChunks.length > 0 && isRecording) {
        sendAudioChunks();
      } else if (!isRecording) {
        clearInterval(sendInterval);
      }
    }, sendlength * 1000);

  } catch (err) {
    console.error('Error accessing the microphone:', err);
  }
}

function stopRecording() {
  if (isRecording)
    isRecording = false;
    updateRecordingState();
    // Send any remaining audio buffer
    if (audioChunks.length > 0) {
      sendAudioChunks();
    }
    mediaRecorder.stop()
}

function sendAudioChunks() {
  //audioBlob = new Blob(audioChunks);    
  socket.emit('audio', audioChunks);
  audioChunks = [];
}


socket.on('transcription', (text) => {
  console.log('Transcription received from server');
  const chatBox = document.getElementById('chat');
  const newMessage = document.createElement('p');
  newMessage.textContent = text;
  chatBox.appendChild(newMessage);
});

function updateRecordingState() {
    recordButton.style.backgroundColor = isRecording ? '#ff4136' : '#2193b0';
    recordButton.textContent = isRecording ? 'Stop Recording' : 'Start Recording';
}
