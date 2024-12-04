const form = document.getElementById('chat-form');
const recordButton = document.getElementById('record-button');
const micSelect = document.getElementById('mic-select');
const socket = io();
let sendlength = 5;

let isRecording = false;
let recorder;
let audioContext;
let mediaStreamSource;
let scriptProcessor;
let vadEnabled = false;
const SILENCE_THRESHOLD = 0.009;
let activityIndicator;

// Neue VAD-bezogene Variablen
let audioBuffer = [];
const BUFFER_SIZE = 10;
let silenceTimer = null;
const SILENCE_DELAY = 1000;

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

function createActivityIndicator() {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.gap = '10px';
    container.style.alignItems = 'center';
    container.style.margin = '10px 0';

    const originalButton = document.getElementById('record-button');
    const parentElement = originalButton.parentElement;
    container.appendChild(originalButton);

    const indicator = document.createElement('div');
    indicator.id = 'activity-indicator';
    indicator.style.width = '20px';
    indicator.style.height = '20px';
    indicator.style.borderRadius = '50%';
    indicator.style.backgroundColor = '#666';
    indicator.style.transition = 'background-color 0.1s';

    container.appendChild(indicator);
    parentElement.appendChild(container);

    return indicator;
}

function updateActivityIndicator(isActive, level = 0) {
    if (!activityIndicator) return;
    
    level = Math.min(1, level * 5);
    
    if (isActive) {
        const hue = 90 + (level * 30);
        activityIndicator.style.backgroundColor = `hsl(${hue}, 80%, 50%)`;
        
        const size = 20 + (level * 10);
        activityIndicator.style.width = `${size}px`;
        activityIndicator.style.height = `${size}px`;
    } else {
        activityIndicator.style.backgroundColor = '#666';
        activityIndicator.style.width = '20px';
        activityIndicator.style.height = '20px';
    }
}

navigator.mediaDevices.getUserMedia({ audio: true })
    .then(function(stream) {
        console.log('Mic Permissions granted');
        populateMicrophoneList();
        activityIndicator = createActivityIndicator();
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
    if (vadEnabled) {
        cleanup();
        recordButton.textContent = 'Start Recording';
    } else {
        startRecording();
        recordButton.textContent = 'Stop Recording';
    }
};

async function startRecording() {
    const selectedMic = micSelect.value;
    console.log(`Selected microphone: ${selectedMic}`);
    const constraints = {
        audio: {
            deviceId: selectedMic ? { exact: selectedMic } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        }
    };

    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        mediaStreamSource = audioContext.createMediaStreamSource(stream);
        scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);

        mediaStreamSource.connect(scriptProcessor);
        scriptProcessor.connect(audioContext.destination);

        // Verbesserte Voice Activity Detection
        scriptProcessor.onaudioprocess = function(event) {
            if (!vadEnabled) return;

            const input = event.inputBuffer.getChannelData(0);
            let sum = 0;
            
            for (let i = 0; i < input.length; i++) {
                sum += Math.abs(input[i]);
            }
            const average = sum / input.length;

            // Add to buffer
            audioBuffer.push(average);
            if (audioBuffer.length > BUFFER_SIZE) {
                audioBuffer.shift();
            }

            // Calculate rolling average
            const rollingAverage = audioBuffer.reduce((a, b) => a + b, 0) / audioBuffer.length;

            // Update activity indicator
            updateActivityIndicator(rollingAverage > SILENCE_THRESHOLD, average);

            // Check if sound is above threshold
            if (rollingAverage > SILENCE_THRESHOLD) {
                if (!isRecording) {
                    console.log('Voice detected - starting recording');
                    startActualRecording(stream);
                }
                // Reset silence timer
                if (silenceTimer) {
                    clearTimeout(silenceTimer);
                    silenceTimer = null;
                }
            } else {
                if (isRecording && !silenceTimer) {
                    silenceTimer = setTimeout(() => {
                        console.log('Silence detected - stopping recording');
                        stopRecording();
                        silenceTimer = null;
                    }, SILENCE_DELAY);
                }
            }
        };

        vadEnabled = true;
        updateRecordingState();

    } catch (err) {
        console.error('Error accessing the microphone:', err);
    }
}

function startActualRecording(stream) {
    recorder = RecordRTC(stream, {
        type: 'audio',
        recorderType: StereoAudioRecorder,
        mimeType: 'audio/wav',
        timeSlice: sendlength * 1000,
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
}

function stopRecording() {
    if (isRecording) {
        isRecording = false;
        updateRecordingState();
        recorder.stopRecording(() => {
            recorder.getDataURL((dataURL) => {
                const base64Data = dataURL.split(',')[1];
                socket.emit('audio', base64Data);
                console.log('Sent final audio chunk');
            });
        });
    }
}

function cleanup() {
    if (scriptProcessor) {
        scriptProcessor.disconnect();
        mediaStreamSource.disconnect();
    }
    if (audioContext) {
        audioContext.close();
    }
    vadEnabled = false;
    isRecording = false;
    // Reset VAD variables
    audioBuffer = [];
    if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
    }
    updateRecordingState();
    updateActivityIndicator(false);
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
    if (vadEnabled) {
        recordButton.style.backgroundColor = '#ff4136';
        recordButton.textContent = 'Stop Recording';
    } else if (isRecording) {
        recordButton.style.backgroundColor = '#ff4136';
        recordButton.textContent = 'Recording...';
    } else {
        recordButton.style.backgroundColor = '#2193b0';
        recordButton.textContent = 'Start Recording';
    }
}
