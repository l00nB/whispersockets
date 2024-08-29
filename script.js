const form = document.getElementById('chat-form');
const messages = document.getElementById('chat-message');
const recordButton = document.getElementById('record-button');
const micselect = document.getElementById('mic-select')

navigator.mediaDevices.getUserMedia({ audio: true })
  .then(function(stream) {
    console.log('Mic Permissions granted');
    
    var temp = document.createElement('option');
    temp.innerHTML = 'Kein Mikrofon ausgewaehlt';
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
    } catch (err) {
        console.error('Error accessing the microphone:', err);
    }
};

function updateRecordingState(isRecording) {
    if (mediaRecorder) {
        if (isRecording) {
            recordButton.style.backgroundColor = '#ff4136'; 
        } else {
            recordButton.style.backgroundColor = '#2193b0';
        }
    }
}
