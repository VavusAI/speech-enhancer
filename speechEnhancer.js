console.log("✅ SpeechEnhancer.js loaded with BACKEND_URL =", BACKEND_URL);

class SpeechEnhancer extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div style="font-family: sans-serif; background: black; color: white; padding: 20px; border-radius: 8px;">
        <h2>Speech Enhancer</h2>

        <label for="modelSelect">Choose STT Model:</label><br>
        <select id="modelSelect">
          <option value="whisper">Whisper</option>
          <option value="vosk">Vosk</option>
        </select><br><br>

        <button id="recordBtn">🎙️ Start Recording</button>
        <button id="stopBtn" disabled>⏹️ Stop Recording</button><br><br>

        <input type="file" id="audioFile" accept="audio/*">
        <button id="uploadBtn">Upload & Convert</button><br><br>

        <h3>Transcription:</h3>
        <div id="transcriptBox" style="white-space: pre-wrap; border: 1px solid white; padding: 10px; min-height: 60px; background: #111;"></div><br>

        <button id="ttsBtn" disabled>🔊 Synthesize with Piper</button><br>
        <audio id="audioPlayer" controls style="display:none; margin-top: 10px;"></audio>
        <a id="downloadLink" style="display:none;" download="piper_output.wav">⬇️ Download Audio</a>
      </div>
    `;

    const recordBtn = this.querySelector('#recordBtn');
    const stopBtn = this.querySelector('#stopBtn');
    const uploadBtn = this.querySelector('#uploadBtn');
    const audioFile = this.querySelector('#audioFile');
    const transcriptBox = this.querySelector('#transcriptBox');
    const ttsBtn = this.querySelector('#ttsBtn');
    const modelSelect = this.querySelector('#modelSelect');
    const audioPlayer = this.querySelector('#audioPlayer');
    const downloadLink = this.querySelector('#downloadLink');

    const BACKEND_URL = 'https://9d1d-2a02-2f0b-a209-2500-3adb-d7b8-9750-98.ngrok-free.app';
    let mediaRecorder, audioChunks = [];

    recordBtn.onclick = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunks, { type: 'audio/wav' });
          sendAudio(blob);
        };

        mediaRecorder.start();
        recordBtn.disabled = true;
        stopBtn.disabled = false;
      } catch (err) {
        alert("Microphone access denied.");
        console.error("Mic access error:", err);
      }
    };

    stopBtn.onclick = () => {
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
      recordBtn.disabled = false;
      stopBtn.disabled = true;
    };

    uploadBtn.onclick = () => {
      const file = audioFile.files[0];
      if (file) sendAudio(file);
    };

    function sendAudio(blob) {
      const formData = new FormData();
      formData.append('audio', blob);
      formData.append('model', modelSelect.value);

      transcriptBox.textContent = 'Processing...';
      ttsBtn.disabled = true;
      audioPlayer.style.display = 'none';
      downloadLink.style.display = 'none';

      fetch(`${BACKEND_URL}/transcribe`, { method: 'POST', body: formData })
        .then(res => res.json())
        .then(data => {
          transcriptBox.textContent = data.text || 'No transcription';
          ttsBtn.disabled = false;
        })
        .catch(err => {
          transcriptBox.textContent = 'Error: ' + err.message;
          console.error("STT error:", err);
        });
    }

    ttsBtn.onclick = () => {
      const formData = new FormData();
      formData.append('text', transcriptBox.textContent);

      fetch(`${BACKEND_URL}/synthesize`, { method: 'POST', body: formData })
        .then(res => res.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob);
          audioPlayer.src = url;
          audioPlayer.style.display = 'block';
          downloadLink.href = url;
          downloadLink.style.display = 'inline';
        })
        .catch(err => {
          alert('Synthesis failed: ' + err.message);
          console.error("TTS error:", err);
        });
    };
  }
}

customElements.define('speech-enhancer', SpeechEnhancer);
