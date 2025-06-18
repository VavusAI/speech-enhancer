console.log('SpeechEnhancer script loaded');

class SpeechEnhancer extends HTMLElement {
  connectedCallback() {
    console.log('SpeechEnhancer element connected');

    this.innerHTML = `
      <div>
        <h2>Assistive Speech Enhancer</h2>

        <label for="sttSelect">Choose STT Engine:</label>
        <select id="sttSelect">
          <option value="whisper">Whisper</option>
          <option value="vosk">Vosk</option>
        </select><br><br>

        <button id="recordBtn">Start Recording</button>
        <button id="stopBtn" disabled>Stop Recording</button><br><br>

        <input type="file" id="audioFile" accept="audio/*">
        <button id="uploadBtn">Upload & Convert</button><br><br>

        <h3>Status:</h3>
        <div id="statusBox" style="margin-bottom: 10px; color: #555;"></div>

        <h3>Transcript:</h3>
        <textarea id="transcriptBox" rows="5" cols="60" readonly style="resize: vertical;"></textarea>

        <h3>Enhanced Audio:</h3>
        <audio id="enhancedAudio" controls></audio><br>
        <a id="downloadLink" href="#" download="enhanced.wav">Download Audio</a>
      </div>
    `;

    const recordBtn = this.querySelector('#recordBtn');
    const stopBtn = this.querySelector('#stopBtn');
    const uploadBtn = this.querySelector('#uploadBtn');
    const sttSelect = this.querySelector('#sttSelect');
    const audioFile = this.querySelector('#audioFile');
    const statusBox = this.querySelector('#statusBox');
    const transcriptBox = this.querySelector('#transcriptBox');
    const audioElement = this.querySelector('#enhancedAudio');
    const downloadLink = this.querySelector('#downloadLink');

    let mediaRecorder;
    let recordedChunks = [];

    recordBtn.onclick = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recordedChunks = [];
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = e => recordedChunks.push(e.data);
        mediaRecorder.onstop = () => processAudio(new Blob(recordedChunks, { type: 'audio/webm' }));
        mediaRecorder.start();
        statusBox.textContent = 'Recording...';
        transcriptBox.value = '';
        recordBtn.disabled = true;
        stopBtn.disabled = false;
      } catch (err) {
        console.error('Microphone access error:', err);
        statusBox.textContent = 'Microphone access denied.';
      }
    };

    stopBtn.onclick = () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        statusBox.textContent = 'Processing...';
        recordBtn.disabled = false;
        stopBtn.disabled = true;
      }
    };

    uploadBtn.onclick = () => {
      const file = audioFile.files[0];
      if (file) {
        statusBox.textContent = 'Uploading and processing...';
        transcriptBox.value = '';
        processAudio(file);
      }
    };

    async function processAudio(blob) {
      const fd = new FormData();
      fd.append('audio', blob);
      fd.append('engine', sttSelect.value);

      try {
        const res = await fetch('https://6b4e-89-136-179-174.ngrok-free.app/process', {
          method: 'POST',
          body: fd
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error('Server response error:', errText);
          statusBox.textContent = `Error: ${res.status} ${res.statusText}`;
          return;
        }

        const data = await res.json();
        console.log('Backend JSON:', data);

        transcriptBox.value = data.transcript ?? '[No transcript returned]';
        statusBox.textContent = 'Transcription complete.';
        audioElement.src = data.audio_url;
        audioElement.load();
        downloadLink.href = data.audio_url;
      } catch (err) {
        console.error('Fetch or JSON error:', err);
        statusBox.textContent = 'Error contacting server.';
      } finally {
        recordBtn.disabled = false;
        stopBtn.disabled = true;
      }
    }
  }
}

customElements.define('speech-enhancer', SpeechEnhancer);
