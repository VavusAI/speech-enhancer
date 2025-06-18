class SpeechEnhancer extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div>
        <button id="startBtn">Start Recording</button>
        <button id="stopBtn" disabled>Stop</button>
        <p id="status">Idle</p>
      </div>
    `;

    const status = this.querySelector('#status');
    const startBtn = this.querySelector('#startBtn');
    const stopBtn = this.querySelector('#stopBtn');

    let mediaRecorder;
    let chunks = [];

    startBtn.onclick = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        chunks = [];

        mediaRecorder.ondataavailable = e => chunks.push(e.data);
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          console.log('Recording complete', blob);
          status.innerText = 'Recorded!';
          // You can send this blob to your backend here.
        };

        mediaRecorder.start();
        status.innerText = 'Recording...';
        startBtn.disabled = true;
        stopBtn.disabled = false;
      } catch (err) {
        console.error('Mic error:', err);
        status.innerText = 'Mic access denied';
      }
    };

    stopBtn.onclick = () => {
      mediaRecorder.stop();
      startBtn.disabled = false;
      stopBtn.disabled = true;
      status.innerText = 'Stopping...';
    };
  }
}

customElements.define('speech-enhancer', SpeechEnhancer);
