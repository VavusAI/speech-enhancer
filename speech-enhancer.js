// === Configuration ===
// 🔄 UPDATE this to your current tunnel URL (copy–paste the full HTTPS address ngrok prints)
const NGROK_URL = 'https://7b67-2a02-2f0b-a209-2500-3adb-d7b8-9750-98.ngrok-free.app';

let mediaRecorder = null;
let audioChunks = [];
let selectedModel = 'whisper';
let latestAudioURL = null;

// Inject basic styling
const style = document.createElement('style');
style.textContent = `
  body { font-family: Arial, sans-serif; margin: 20px; max-width: 600px; }
  button, select, input[type="file"] { margin: 10px 0; display: block; }
  textarea { width: 100%; height: 100px; margin: 10px 0; }
  #recording-indicator { color: red; font-weight: bold; margin: 10px 0; display: none; }
  #download-link { display: none; margin: 10px 0; }
`;
document.head.appendChild(style);

// Build UI
document.body.innerHTML = `
  <h1>Speech Enhancer</h1>
  <label for="model-select">Choose Speech-to-Text Model:</label>
  <select id="model-select">
    <option value="whisper">Whisper</option>
    <option value="vosk">Vosk</option>
  </select>

  <button id="start-recording">🎙️ Start Recording</button>
  <button id="stop-recording" disabled>⏹️ Stop Recording</button>
  <div id="recording-indicator">● Recording...</div>

  <label for="audio-upload">Or upload an audio file:</label>
  <input type="file" id="audio-upload" accept="audio/*" />

  <label for="transcript">Transcribed Text:</label>
  <textarea id="transcript" placeholder="Transcript will appear here..."></textarea>

  <button id="play-tts" disabled>▶️ Play Again</button>
  <a id="download-link">⬇️ Download Piper Audio</a>
`;

const modelSelect        = document.getElementById('model-select');
const startBtn           = document.getElementById('start-recording');
const stopBtn            = document.getElementById('stop-recording');
const recordingIndicator = document.getElementById('recording-indicator');
const uploadInput        = document.getElementById('audio-upload');
const transcriptBox      = document.getElementById('transcript');
const playBtn            = document.getElementById('play-tts');
const downloadLink       = document.getElementById('download-link');

playBtn.disabled      = true;
downloadLink.style.display = 'none';

// Handlers
modelSelect.addEventListener('change', () => {
  selectedModel = modelSelect.value;
});

startBtn.addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop        = handleRecordingStop;

    mediaRecorder.start();
    recordingIndicator.style.display = 'block';
    startBtn.disabled = true;
    stopBtn.disabled  = false;
  } catch (err) {
    console.error('Microphone access error:', err);
    alert('Cannot access microphone. Please allow permission.');
  }
});

stopBtn.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
});

uploadInput.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (file) await sendToBackend(file);
});

playBtn.addEventListener('click', () => {
  if (latestAudioURL) new Audio(latestAudioURL).play();
});

async function handleRecordingStop() {
  recordingIndicator.style.display = 'none';
  startBtn.disabled            = false;
  stopBtn.disabled             = true;

  const blob = new Blob(audioChunks, { type: 'audio/wav' });
  await sendToBackend(blob);
}

async function sendToBackend(audioBlob) {
  transcriptBox.value        = 'Processing…';
  playBtn.disabled           = true;
  downloadLink.style.display = 'none';

  const formData = new FormData();
  formData.append('audio', audioBlob);
  formData.append('engine', selectedModel);

  try {
    const resp = await fetch(`${NGROK_URL}/process`, {
      method: 'POST',
      body: formData
    });
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`HTTP ${resp.status}: ${errText || resp.statusText}`);
    }
    const data = await resp.json();
    transcriptBox.value = data.transcript || '';

    if (!data.audio_url) {
      throw new Error('No audio_url returned by server');
    }

    latestAudioURL    = data.audio_url;
    playBtn.disabled  = false;
    downloadLink.href = data.audio_url;
    downloadLink.download = 'piper_output.wav';
    downloadLink.style.display = 'inline';
    new Audio(data.audio_url).play();

  } catch (err) {
    console.error('Backend error:', err);
    transcriptBox.value = `Error: ${err.message}`;
    alert(`Error processing audio:\n${err.message}`);
  }
}
