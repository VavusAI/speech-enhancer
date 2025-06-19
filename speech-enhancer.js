// === Configuration ===
const NGROK_URL = 'https://267b-2a02-2f0b-a209-2500-2b52-36b2-387d-62.ngrok-free.app';

let mediaRecorder = null;
let audioChunks = [];
let selectedModel = 'whisper';
let latestAudioURL = null;

// === Build UI Dynamically ===
document.body.style.fontFamily = 'Arial, sans-serif';
document.body.style.margin = '20px';
document.body.style.maxWidth = '600px';
document.body.innerHTML = `
  <h1>Speech Enhancer</h1>

  <label for="model-select">Choose Speech-to-Text Model:</label>
  <select id="model-select">
    <option value="whisper">Whisper</option>
    <option value="vosk">Vosk</option>
  </select>

  <button id="start-recording">🎙️ Start Recording</button>
  <button id="stop-recording">⏹️ Stop Recording</button>
  <div id="recording-indicator" style="display:none; color:red; margin:10px 0;">● Recording...</div>

  <label for="audio-upload">Or upload an audio file:</label>
  <input type="file" id="audio-upload" accept="audio/*" />

  <label for="transcript">Transcribed Text:</label>
  <textarea id="transcript" placeholder="Transcript will appear here..." style="width:100%;height:100px;"></textarea>

  <button id="play-tts">▶️ Play Again</button>
  <a id="download-link" style="display:none;" href="#">⬇️ Download Piper Audio</a>
`;

// === DOM References ===
const modelSelect = document.getElementById('model-select');
const startBtn = document.getElementById('start-recording');
const stopBtn = document.getElementById('stop-recording');
const recordingIndicator = document.getElementById('recording-indicator');
const uploadInput = document.getElementById('audio-upload');
const transcriptBox = document.getElementById('transcript');
const playBtn = document.getElementById('play-tts');
const downloadLink = document.getElementById('download-link');

// Initial UI state
stopBtn.disabled = true;

// === Event Handlers ===
modelSelect.addEventListener('change', () => {
  selectedModel = modelSelect.value;
});

startBtn.addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = event => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      // Hide recording indicator & reset buttons
      recordingIndicator.style.display = 'none';
      startBtn.disabled = false;
      stopBtn.disabled = true;

      // Send recorded audio
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      await sendToBackend(audioBlob);
    };

    // Start recording & update UI
    mediaRecorder.start();
    recordingIndicator.style.display = 'block';
    startBtn.disabled = true;
    stopBtn.disabled = false;

  } catch (err) {
    console.error('Error accessing microphone:', err);
    alert('Could not access microphone. Please check permissions.');
  }
});

stopBtn.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
});

uploadInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (file) {
    await sendToBackend(file);
  }
});

playBtn.addEventListener('click', () => {
  if (latestAudioURL) {
    const audio = new Audio(latestAudioURL);
    audio.play();
  }
});

// === Helper Functions ===
async function sendToBackend(audioBlob) {
  const formData = new FormData();
  formData.append('audio', audioBlob);
  formData.append('engine', selectedModel);

  try {
    const response = await fetch(`${NGROK_URL}/process`, {
      method: 'POST',
      body: formData
    });
    const data = await response.json();

    // Update transcript
    transcriptBox.value = data.transcript || '[No transcription received]';

    // Handle Piper audio
    if (data.audio_url) {
      latestAudioURL = data.audio_url;
      const audio = new Audio(latestAudioURL);
      audio.play();

      downloadLink.href = latestAudioURL;
      downloadLink.download = 'piper_output.wav';
      downloadLink.style.display = 'inline';
    } else {
      downloadLink.style.display = 'none';
    }

  } catch (err) {
    console.error('Error communicating with backend:', err);
    alert('Failed to process audio.');
  }
}
