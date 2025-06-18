console.log('SpeechEnhancer script loaded');

class SpeechEnhancer extends HTMLElement {
  connectedCallback() {
    console.log('SpeechEnhancer element connected');

    // Basic UI without extra styling
    this.innerHTML = `
      <div>
        <button id="recordBtn">Start Recording</button>
        <button id="stopBtn" disabled>Stop Recording</button><br><br>
        <input type="file" id="audioFile" accept="audio/*">
        <button id="uploadBtn">Upload & Convert</button><br><br>

        <h3>Transcript:</h3>
        <div id="transcriptBox" style="white-space: pre-wrap; min-height: 2em; border: 1px solid #ccc; padding: 5px;"></div>

        <h3>Enhanced Audio:</h3>
        <audio id="enhancedAudio" controls></audio><br>
        <a id="downloadLink" href="#" download="enhanced.wav">Download Audio</a>
      </div>
    `;

    const recordBtn = this.querySelector('#recordBtn');
    const stopBtn = this.querySelector('#stopBtn');
    const uploadBtn = this.querySelector('#uploadBtn');
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
        mediaRecorder.ondataavailable = e => recordedChunks.push(e.data);
        mediaRecorder.onstop = () => processAudio(new Blob(recordedChunks, { type: 'audio/webm' }));
        mediaRecorder.start();
        transcriptBox.textContent = 'Recording...';
        recordBtn.disabled = true;
        stopBtn.disabled = false;
      } catch (err) {
        console.error(err);
        transcriptBox.textContent = 'Mic access error.';
      }
    };

    stopBtn.onclick = () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        recordBtn.disabled = false;
        stopBtn.disabled = true;
        transcriptBox.textContent = 'Processing...';
      }
    };

    uploadBtn.onclick = () => {
      const file = audioFile.files[0];
      if (file) {
        transcriptBox.textContent = 'Uploading...';
        processAudio(file);
      }
    };

    async function processAudio(blob) {
      const fd = new FormData();
      fd.append('audio', blob);
      fd.append('engine', 'whisper');

      try {
        const res = await fetch('https://6b4e-89-136-179-174.ngrok-free.app/process', {
          method: 'POST',
          body: fd
        });
        const data = await res.json();
        console.log('Received JSON:', data);
        transcriptBox.textContent = data.transcript ?? '[no transcript]';
        audioElement.src = data.audio_url;
        downloadLink.href = data.audio_url;
      } catch (err) {
        console.error(err);
        transcriptBox.textContent = 'Processing error.';
      }
    }
  }
}

customElements.define('speech-enhancer', SpeechEnhancer);
