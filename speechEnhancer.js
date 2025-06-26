const BACKEND_URL = "https://df9e-2a02-2f0b-a209-2500-a78-bf42-b5f5-98fa.ngrok-free.app";

class SpeechEnhancer extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div style="
        font-family: 'Segoe UI', sans-serif;
        background-color: #111;
        color: #eee;
        padding: 24px;
        border-radius: 12px;
        max-width: 600px;
        margin: auto;
        box-shadow: 0 0 10px rgba(0,0,0,0.5);
      ">
        <h2 style="margin-bottom: 20px;">🎧 Speech Enhancer</h2>

        <label for="modelSelect">Choose STT Model:</label><br>
        <select id="modelSelect" style="
          margin-bottom: 20px;
          padding: 8px;
          border-radius: 6px;
          border: 1px solid #444;
          background: #222;
          color: #eee;
        ">
          <option value="whisper">Whisper</option>
          <option value="vosk">Vosk</option>
        </select><br>

        <div style="
          border: 1px solid #333;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          background: #1a1a1a;
        ">
          <button id="recordBtn" style="
            padding: 10px 20px;
            margin-right: 10px;
            background: #0059ff;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
          ">🎙️ Start Recording</button>
          <button id="stopBtn" disabled style="
            padding: 10px 20px;
            background: #888;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: not-allowed;
          ">⏹️ Stop</button>
        </div>

        <input type="file" id="audioFile" accept="audio/*" style="color:#ccc;">
        <button id="uploadBtn" style="
          padding: 10px 20px;
          margin-left: 10px;
          background: #444;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        ">Upload & Convert</button><br><br>

        <h3>Transcription:</h3>
        <div id="transcriptBox" style="
          white-space: pre-wrap;
          border: 1px solid #444;
          padding: 12px;
          min-height: 60px;
          background: #222;
          color: #ddd;
          border-radius: 6px;
        "></div><br>

        <button id="ttsBtn" disabled style="
          padding: 10px 20px;
          background: #444;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: not-allowed;
        ">🔊 Synthesize with Piper</button><br><br>

        <audio id="audioPlayer" controls style="display:none; width: 100%; margin-top: 10px;"></audio><br>
        <a id="downloadLink" style="
          display:none;
          color: #00ffff;
          margin-top: 10px;
          text-decoration: none;
        " download="piper_output.wav">⬇️ Download Audio</a>
      </div>
    `;

    const recordBtn = this.querySelector("#recordBtn");
    const stopBtn = this.querySelector("#stopBtn");
    const uploadBtn = this.querySelector("#uploadBtn");
    const audioFile = this.querySelector("#audioFile");
    const transcriptBox = this.querySelector("#transcriptBox");
    const ttsBtn = this.querySelector("#ttsBtn");
    const modelSelect = this.querySelector("#modelSelect");
    const audioPlayer = this.querySelector("#audioPlayer");
    const downloadLink = this.querySelector("#downloadLink");

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
        recordBtn.style.background = "#888";
        stopBtn.disabled = false;
        stopBtn.style.cursor = "pointer";
        stopBtn.style.background = "#ff0033";
        transcriptBox.textContent = "🎤 Recording...";
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
      recordBtn.style.background = "#0059ff";
      stopBtn.disabled = true;
      stopBtn.style.cursor = "not-allowed";
      stopBtn.style.background = "#888";
    };

    uploadBtn.onclick = () => {
      const file = audioFile.files[0];
      if (file) sendAudio(file);
    };

    function sendAudio(blob) {
      const formData = new FormData();
      formData.append("audio", blob);
      formData.append("model", modelSelect.value);

      transcriptBox.textContent = "🧠 Processing...";
      ttsBtn.disabled = true;
      ttsBtn.style.cursor = "not-allowed";
      audioPlayer.style.display = "none";
      downloadLink.style.display = "none";

      fetch(`${BACKEND_URL}/transcribe`, {
        method: "POST",
        body: formData,
      })
        .then(res => res.json())
        .then(data => {
          transcriptBox.textContent = data.text || "No transcription returned.";
          ttsBtn.disabled = false;
          ttsBtn.style.cursor = "pointer";
        })
        .catch(err => {
          transcriptBox.textContent = "❌ Error: " + err.message;
          console.error("STT error:", err);
        });
    }

    ttsBtn.onclick = () => {
      const formData = new FormData();
      formData.append("text", transcriptBox.textContent);

      fetch(`${BACKEND_URL}/synthesize`, {
        method: "POST",
        body: formData,
      })
        .then(res => res.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob);
          audioPlayer.src = url;
          audioPlayer.style.display = "block";
          downloadLink.href = url;
          downloadLink.style.display = "inline";
        })
        .catch(err => {
          alert("TTS synthesis failed: " + err.message);
          console.error("TTS error:", err);
        });
    };
  }
}

customElements.define("speech-enhancer", SpeechEnhancer);
