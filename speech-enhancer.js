console.log('SpeechEnhancer script loaded');

class SpeechEnhancer extends HTMLElement {
  constructor() {
    super();
    // Bind the method so calling this.processAudio works
    this.processAudio = this.processAudio.bind(this);
  }

  connectedCallback() {
    console.log('SpeechEnhancer element connected');

    this.innerHTML = `
      <div>
        <button id="recordBtn">Start Recording</button>
        <button id="stopBtn" disabled>Stop Recording</button><br><br>
        <input type="file" id="audioFile" accept="audio/*">
        <button id="uploadBtn">Upload & Convert</button><br><br>

        <h3>Transcript:</h3>
        <textarea id="transcriptBox" rows="5" cols="60" readonly></textarea>

        <h3>Enhanced Audio:</h3>
        <audio id="enhancedAudio" controls></audio><br>
        <a id="downloadLink" href="#" download="enhanced.wav">Download Audio</a>
      </div>
    `;

    this.recordBtn = this.querySelector('#recordBtn');
    this.stopBtn = this.querySelector('#stopBtn');
    this.uploadBtn = this.querySelector('#uploadBtn');
    this.audioFile = this.querySelector('#audioFile');
    this.transcriptBox = this.querySelector('#transcriptBox');
    this.audioElement = this.querySelector('#enhancedAudio');
    this.downloadLink = this.querySelector('#downloadLink');

    this.mediaRecorder = null;
    this.recordedChunks = [];

    this.recordBtn.onclick = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.recordedChunks = [];
        this.mediaRecorder = new MediaRecorder(stream);
        this.mediaRecorder.ondataavailable = e => this.recordedChunks.push(e.data);
        this.mediaRecorder.onstop = () => this.processAudio(new Blob(this.recordedChunks, { type: 'audio/webm' }));
        this.mediaRecorder.start();
        this.transcriptBox.value = 'Recording...';
        this.recordBtn.disabled = true;
        this.stopBtn.disabled = false;
      } catch (err) {
        console.error('Mic access error:', err);
        this.transcriptBox.value = 'Microphone access denied.';
      }
    };

    this.stopBtn.onclick = () => {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
        this.recordBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.transcriptBox.value = 'Processing...';
      }
    };

    this.uploadBtn.onclick = () => {
      const file = this.audioFile.files[0];
      if (file) {
        this.transcriptBox.value = 'Uploading...';
        this.processAudio(file);
      }
    };
  }

  async processAudio(blob) {
    const fd = new FormData();
    fd.append('audio', blob);
    fd.append('engine', 'whisper');
    try {
      const res = await fetch('https://6b4e-89-136-179-174.ngrok-free.app/process', {
        method: 'POST',
        body: fd
      });
      console.log('Fetch response status:', res.status);

      if (!res.ok) {
        const errText = await res.text();
        console.error('Server error:', errText);
        this.transcriptBox.value = `Error: ${res.status} ${res.statusText}`;
        return;
      }

      const data = await res.json();
      console.log('Backend JSON:', data);
      this.transcriptBox.value = data.transcript ?? '[No transcript returned]';
      this.audioElement.src = data.audio_url;
      this.audioElement.load();
      this.downloadLink.href = data.audio_url;
    } catch (err) {
      console.error('Fetch/JSON error:', err);
      this.transcriptBox.value = 'Client error during fetch.';
    } finally {
      this.recordBtn.disabled = false;
      this.stopBtn.disabled = true;
    }
  }
}

customElements.define('speech-enhancer', SpeechEnhancer);
