console.log('SpeechEnhancer script loaded');

class SpeechEnhancer extends HTMLElement {
  connectedCallback() {
    console.log('SpeechEnhancer element connected');

    this.innerHTML = `
      <div style="font-family: Arial; padding: 20px;">
        <h2>Assistive Speech Enhancer</h2>
        <div id="controls" style="margin-bottom: 20px;">
          <label for="sttSelect">Choose STT Engine:</label>
          <select id="sttSelect">
            <option value="whisper">Whisper</option>
            <option value="vosk">Vosk</option>
          </select><br><br>

          <button id="recordBtn">Start Recording</button>
          <button id="stopBtn" disabled>Stop Recording</button><br><br>

          <input type="file" id="audioFile" accept="audio/*">
          <button id="uploadBtn">Upload & Convert</button>
        </div>

        <h3>Transcription</h3>
        <div id="transcript" style="white-space: pre-wrap;"></div>

        <h3>Enhanced Audio</h3>
        <audio id="enhancedAudio" controls></audio>
        <br>
        <a id="downloadLink" href="#" download="enhanced.wav">Download Audio</a>
      </div>
    `;

    const recordBtn = this.querySelector('#recordBtn');
    const stopBtn = this.querySelector('#stopBtn');
    const uploadBtn = this.querySelector('#uploadBtn');
    const sttSelect = this.querySelector('#sttSelect');
    const audioFile = this.querySelector('#audioFile');
    const transcriptDiv = this.querySelector('#transcript');
    const audioElement = this.querySelector('#enhancedAudio');
    const downloadLink = this.querySelector('#downloadLink');

    let mediaRecorder;
    let recordedChunks = [];

    recordBtn.onclick = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recordedChunks = [];
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = event => recordedChunks.push(event.data);

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });
          processAudio(audioBlob);
        };

        mediaRecorder.start();
        transcriptDiv.innerText = 'Recording...';
        recordBtn.disabled = true;
        stopBtn.disabled = false;
      } catch (error) {
        console.error('Microphone access error:', error);
        transcriptDiv.innerText = 'Microphone access denied or error occurred.';
      }
    };

    stopBtn.onclick = () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        recordBtn.disabled = false;
        stopBtn.disabled = true;
        transcriptDiv.innerText = 'Processing...';
      }
    };

    uploadBtn.onclick = () => {
      const file = audioFile.files[0];
      if (file) {
        transcriptDiv.innerText = 'Uploading and processing...';
        processAudio(file);
      }
    };

    async function processAudio(audioBlob) {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('engine', sttSelect.value);

      try {
        const response = await fetch('https://6b4e-89-136-179-174.ngrok-free.app/process', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.statusText}`);
        }

        const data = await response.json();

        transcriptDiv.innerText = data.transcript || 'No transcription returned.';
        audioElement.src = data.audio_url;
        audioElement.load();
        downloadLink.href = data.audio_url;
      } catch (err) {
        console.error('Error during processing:', err);
        transcriptDiv.innerText = 'Error processing audio.';
      } finally {
        recordBtn.disabled = false;
        stopBtn.disabled = true;
      }
    }
  }
}

customElements.define('speech-enhancer', SpeechEnhancer);
