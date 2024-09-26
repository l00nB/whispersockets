const form = document.getElementById('chat-form');
const recordButton = document.getElementById('record-button');
const micSelect = document.getElementById('mic-select');
const socket = io();
let sendlength = 5;

let mediaRecorder;
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

async function sendAudio(audioChunks){
  const audioBlob = new Blob(audioChunks, {type:'audio/wav'});
  socket.emit('audio', audioBlob);
}

async function startRecording() {
  const selectedMic = micSelect.value;
  console.log(`Selected microphone: ${selectedMic}`);
  const constraints = {
    audio: {
      deviceId: selectedMic ? { exact: selectedMic } : undefined
    }
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    mediaRecorder = new MediaRecorder(stream);
    
    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    // Set up a single interval to send audio every 5 seconds
    const sendInterval = setInterval(() => {
      if (audioChunks.length > 0 && isRecording) {
        sendAudio(audioChunks);
        audioChunks = []; // Clear the chunks after sending
      } else if (!isRecording) {
        clearInterval(sendInterval); // Stop the interval if recording has stopped
      }
    }, sendlength * 1000);

    mediaRecorder.start(1000); // Trigger ondataavailable every second
    isRecording = true;
    updateRecordingState();
  } catch (err) {
    console.error('Error accessing the microphone:', err);
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    isRecording = false;
    updateRecordingState();
    // Send any remaining audio chunks
    if (audioChunks.length > 0) {
      sendAudio(audioChunks);
      audioChunks = [];
    }
  }
}

socket.on('transcription', (text) => {
  console.log('Transcription received from server');
  const chatBox = document.getElementById('chat');
  const newMessage = document.createElement('p');
  newMessage.textContent = text;
  chatBox.appendChild(newMessage);
});

function updateRecordingState() {
  if (mediaRecorder) {
    recordButton.style.backgroundColor = isRecording ? '#ff4136' : '#2193b0';
    recordButton.textContent = isRecording ? 'Stop Recording' : 'Start Recording';
  }
}