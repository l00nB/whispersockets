const form = document.getElementById('chat-form');
const recordButton = document.getElementById('record-button');
const micSelect = document.getElementById('mic-select');
const socket = io();
let sendlength = 5;

let isRecording = false;
let recorder;

// Helper function to convert blob to base64
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => {
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = (error) => reject(error);
    });
}

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
        
        // Setup RecordRTC
        recorder = RecordRTC(stream, {
            type: 'audio',
            recorderType: StereoAudioRecorder,
            mimeType: 'audio/wav',
            timeSlice: sendlength * 1000, // Convert to milliseconds
            desiredSampRate: 16000,
            numberOfAudioChannels: 1,
            ondataavailable: async (blob) => {
                if (blob.size > 0) {
                    try {
                        const base64Data = await blobToBase64(blob);
                        socket.emit('audio', base64Data);
                        console.log('Sent audio chunk', blob.size);
                    } catch (error) {
                        console.error('Error converting blob to base64:', error);
                    }
                }
            }
        });

        recorder.startRecording();
        isRecording = true;
        updateRecordingState();

    } catch (err) {
        console.error('Error accessing the microphone:', err);
    }
}

function stopRecording() {
    if (isRecording) {
        isRecording = false;
        updateRecordingState();
        recorder.stopRecording(() => {
            recorder.getDataURL((dataURL) => {
                // Send final audio chunk if needed
                const base64Data = dataURL.split(',')[1];
                socket.emit('audio', base64Data);
                console.log('Sent final audio chunk');
            });
        });
    }
}

socket.on('transcription', (text) => {
    console.log('Transcription received from server');
    const chatBox = document.getElementById('chat');
    const newMessage = document.createElement('p');
    newMessage.textContent = text;
    chatBox.appendChild(newMessage);
});

socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

socket.on('error', (error) => {
    console.error('Socket error:', error);
});

function updateRecordingState() {
    recordButton.style.backgroundColor = isRecording ? '#ff4136' : '#2193b0';
    recordButton.textContent = isRecording ? 'Stop Recording' : 'Start Recording';
}