<script>
console.log('SpeechEnhancer script loaded');

class SpeechEnhancer extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div>
        <h2>Assistive Speech Enhancer</h2>

        <label for="sttSelect">Choose STT Engine:</label>
        <select id="sttSelect">
          <option value="whisper">Whisper</option>
          <option value="vosk">Vosk</option>
        </select>
        <br><br>

        <button id="recordBtn">Record</button>
        <button id="stopBtn" disabled>Stop</button>
        <br><br>

        <div id="recordedAudioContainer"></div>
        <br>

        <h3>Transcript:</h3>
        <textarea id="transcriptBox" rows="4" cols="60" readonly></textarea>
        <br><br>

        <h3>Enhanced Audio (Piper):</h3>
        <audio id="enhancedAudio" controls></audio>
        <br>
        <a id="downloadLink" href="#" download="enhanced.wav">Download Enhanced Audio</a>
      </div>
    `;

    const recordBtn = this.querySelector('#recordBtn');
    const stopBtn = this.querySelector('#stopBtn');
    const sttSelect = this.querySelector('#sttSelect');
    const transcriptBox = this.querySelector('#transcriptBox');
    const audioContainer = this.querySelector('#recordedAudioContainer');
    const audioElement = this.querySelector('#enhancedAudio');
    const downloadLink = this.querySelector('#downloadLink');

    let mediaRecorder, recordedChunks = [];

    recordBtn.onclick = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recordedChunks = [];
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = e => recordedChunks.push(e.data);
        mediaRecorder.onstop = () => finalizeRecording();
        mediaRecorder.start();
        recordBtn.disabled = true;
        stopBtn.disabled = false;
        transcriptBox.value = 'Recording...';
        audioContainer.innerHTML = '';
      } catch {
        transcriptBox.value = 'Microphone access error.';
      }
    };

    stopBtn.onclick = () => {
      if (mediaRecorder?.state === 'recording') {
        mediaRecorder.stop();
        recordBtn.disabled = false;
        stopBtn.disabled = true;
        transcriptBox.value = 'Processing audio...';
      }
    };

    function finalizeRecording() {
      const blob = new Blob(recordedChunks, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      audioContainer.innerHTML = '';
      const download = document.createElement('a');
      download.href = url;
      download.download = 'input_audio.webm';
      download.textContent = 'Download Recorded Audio';
      audioContainer.appendChild(download);

      processAudio(blob);
    }

    async function processAudio(blob) {
      const fd = new FormData();
      fd.append('audio', blob);
      fd.append('engine', sttSelect.value);

      try {
        const res = await fetch('https://6b4e-89-136-179-174.ngrok-free.app/process', {
          method: 'POST', body: fd
        });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        transcriptBox.value = data.transcript || '[No transcript]';
        audioElement.src = data.audio_url;
        downloadLink.href = data.audio_url;
        audioElement.load();
      } catch (err) {
        console.error(err);
        transcriptBox.value = 'Error processing audio.';
      }
    }
  }
}

customElements.define('speech-enhancer', SpeechEnhancer);
</script>

<speech-enhancer></speech-enhancer>
