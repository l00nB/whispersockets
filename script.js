const form = document.getElementById('chat-form');
const recordButton = document.getElementById('record-button');
const micSelect = document.getElementById('mic-select');
const socket = io();
let sendlength = 5;

let isRecording = false;
let audioContext;
let scriptProcessor;
let audioInput;
let audioBuffer = [];

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
      deviceId: selectedMic ? { exact: selectedMic } : undefined
    }
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioInput = audioContext.createMediaStreamSource(stream);
    scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

    audioInput.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);

    scriptProcessor.onaudioprocess = (event) => {
      const inputBuffer = event.inputBuffer;
      const inputData = inputBuffer.getChannelData(0);
      audioBuffer = audioBuffer.concat(Array.from(inputData));
    };

    isRecording = true;
    updateRecordingState();

    // Set up interval to send audio every 5 seconds
    const sendInterval = setInterval(() => {
      if (audioBuffer.length > 0 && isRecording) {
        sendAudioBuffer();
      } else if (!isRecording) {
        clearInterval(sendInterval);
      }
    }, sendlength * 1000);

  } catch (err) {
    console.error('Error accessing the microphone:', err);
  }
}

function stopRecording() {
  if (audioContext && isRecording) {
    scriptProcessor.disconnect();
    audioInput.disconnect();
    audioContext.close();
    isRecording = false;
    updateRecordingState();
    // Send any remaining audio buffer
    if (audioBuffer.length > 0) {
      sendAudioBuffer();
    }
  }
}

function sendAudioBuffer() {
  if (audioBuffer.length > 0) {
    // Convert to 16-bit PCM
    const pcmBuffer = new Int16Array(audioBuffer.length);
    for (let i = 0; i < audioBuffer.length; i++) {
      const s = Math.max(-1, Math.min(1, audioBuffer[i]));
      pcmBuffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    // Send the buffer
    socket.emit('audio', pcmBuffer.buffer);
    
    // Clear the buffer after sending
    audioBuffer = [];
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
  if (audioContext) {
    recordButton.style.backgroundColor = isRecording ? '#ff4136' : '#2193b0';
    recordButton.textContent = isRecording ? 'Stop Recording' : 'Start Recording;
  }
}'
