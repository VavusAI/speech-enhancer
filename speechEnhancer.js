class SpeechEnhancer extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div style="font-family: Arial; padding: 1em; border: 2px solid #eee; border-radius: 10px;">
        <h2>Speech Enhancer</h2>
        <label for="modelSelect">STT Model:</label>
        <select id="modelSelect">
          <option value="whisper">Whisper</option>
          <option value="vosk">Vosk</option>
        </select>
        <br/><br/>

        <button id="recordBtn">🎤 Start Recording</button>
        <button id="stopBtn" disabled>⏹ Stop</button>
        <br/><br/>

        <input type="file" id="audioFile" accept="audio/*" />
        <button id="uploadBtn">Upload & Convert</button>
        <br/><br/>

        <h3>Transcript:</h3>
        <div id="transcriptBox" style="white-space: pre-wrap; min-height: 2em; border: 1px solid #ccc; padding: 5px;"></div>

        <h3>Enhanced Audio:</h3>
        <audio id="audioPlayer" controls style="display:none;"></audio>
        <a id="downloadLink" style="display:none;" download="enhanced.wav">Download Audio</a>
      </div>
    `;

    const recordBtn = this.querySelector("#recordBtn");
    const stopBtn = this.querySelector("#stopBtn");
    const uploadBtn = this.querySelector("#uploadBtn");
    const audioFile = this.querySelector("#audioFile");
    const transcriptBox = this.querySelector("#transcriptBox");
    const audioPlayer = this.querySelector("#audioPlayer");
    const downloadLink = this.querySelector("#downloadLink");
    const modelSelect = this.querySelector("#modelSelect");

    let mediaRecorder;
    let audioChunks = [];

    recordBtn.onclick = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);

        mediaRecorder.onstop = async () => {
          const blob = new Blob(audioChunks, { type: 'audio/webm' });
          await sendAudio(blob);
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

    uploadBtn.onclick = async () => {
      const file = audioFile.files[0];
      if (!file) {
        alert("Please select an audio file.");
        return;
      }
      await sendAudio(file);
    };

    async function sendAudio(file) {
      const formData = new FormData();
      formData.append("audio", file);
      formData.append("model", modelSelect.value);

      try {
        const res = await fetch("https://<your-ngrok-url>/process", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (data.transcript) {
          transcriptBox.innerText = data.transcript;
        } else {
          transcriptBox.innerText = "No transcript returned.";
        }

        if (data.audio_url) {
          audioPlayer.src = data.audio_url;
          audioPlayer.style.display = "block";
          downloadLink.href = data.audio_url;
          downloadLink.style.display = "inline";
        }
      } catch (err) {
        transcriptBox.innerText = "Error processing audio.";
        console.error(err);
      }
    }
  }
}

customElements.define('speech-enhancer', SpeechEnhancer);
