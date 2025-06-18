console.log('SpeechEnhancer script loaded');

class SpeechEnhancer extends HTMLElement {
  connectedCallback() {
    console.log('SpeechEnhancer element connected');

    this.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto;">
        <h2>Assistive Speech Enhancer</h2>
        <div id="controls" style="margin-bottom: 20px;">
          <label for="sttSelect"><strong>Choose STT Engine:</strong></label><br>
          <select id="sttSelect" style="margin-bottom: 10px;">
            <option value="whisper">Whisper</option>
            <option value="vosk">Vosk</option>
          </select><br>

          <button id="recordBtn" style="margin-top: 10px;">🎙 Start Recording</button>
          <button id="stopBtn" disabled>⏹ Stop Recording</button><br><br>

          <input type="file" id="audioFile" accept="audio/*">
          <button id="uploadBtn">Upload & Convert</button>
        </div>

        <div style="margin-bottom: 20px;">
          <h3>Transcript</h3>
          <div id="transcriptBox" style="border: 1px solid #ccc; padding: 15px; background: #f9f9f9; border-radius: 8px; min-height: 50px; white-space: pre-wrap;"></div>
        </div>

        <div>
          <h3>Enhanced Audio</h3>
          <audio id="enhancedAudio" controls style="width: 100%;"></audio><br><br>
          <a id="downloadLink" href="#" download="enhanced.wav">⬇️ Download Audio</a>
        </div>
      </div>
    `;

    const recordBtn = this.querySelector('#recordBtn');
    const stopBtn = this.querySelector('#stopBtn');
    const uploadBtn = this.querySelector('#uploadBtn');
    const sttSelect = this.querySelector('#sttSelect');
    const audioFile = this.querySelector('#audioFile');
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

        mediaRecorder.ondataavailable = event => recordedChunks.push(event.data);

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });
          processAudio(audioBlob);
        };

        mediaRecorder.start();
        transcriptBox.innerText = 'Recording...';
        recordBtn.disabled = true;
        stopBtn.disabled = false;
      } catch (error) {
        console.error('Microphone access error:', error);
        transcriptBox.innerText = 'Microphone access denied or error occurred.';
      }
    };

    stopBtn.onclick = () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        recordBtn.disabled = false;
        stopBtn.disabled = true;
        transcriptBox.innerText = 'Processing...';
      }
    };

    uploadBtn.onclick = () => {
      const file = audioFile.files[0];
      if (file) {
        transcriptBox.innerText = 'Uploading and processing...';
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

        if (!response.ok) throw new Error(`Server error: ${response.statusText}`);

        const data = await response.json();
        console.log('Server responded with:', data);

        transcriptBox.innerText = data.transcript || 'No transcription returned.';
        audioElement.src = data.audio_url;
        audioElement.load();
        downloadLink.href = data.audio_url;
      } catch (err) {
        console.error('Error during processing:', err);
        transcriptBox.innerText = 'Error processing audio.';
      } finally {
        recordBtn.disabled = false;
        stopBtn.disabled = true;
      }
    }
  }
}

customElements.define('speech-enhancer', SpeechEnhancer);
