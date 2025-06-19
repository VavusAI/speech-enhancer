from flask import Flask, request, jsonify, send_from_directory, url_for
from flask_cors import CORS
import os
import uuid
from werkzeug.utils import secure_filename
import whisper
from vosk import Model as VoskModel, KaldiRecognizer
import wave
import subprocess
import json

def synthesize_with_piper(text, output_path):
    subprocess.run([
        "./piper",
        "--model", "en_US-amy-medium.onnx",
        "--output_file", output_path,
        "--text", text
    ], check=True, cwd="models/piper", env={
        **os.environ,
        "LD_LIBRARY_PATH": os.path.abspath("models/piper")
    })

app = Flask(__name__)

# Enable CORS on all routes
CORS(app, resources={r"/*": {"origins": "*"}})

# Ensure every response has the proper CORS headers
@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"]  = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return response

# Create upload/output directories
UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'outputs'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# Load models once at startup
whisper_model = whisper.load_model("base")
vosk_model    = VoskModel("models/vosk/vosk-model-small-en-us-0.15")

@app.route('/process', methods=['POST'])
def process():
    try:
        # Receive audio file and selected engine
        audio  = request.files['audio']
        engine = request.form.get('engine', 'whisper')

        # Save incoming audio
        filename   = secure_filename(audio.filename)
        uid        = uuid.uuid4().hex
        input_path = os.path.join(UPLOAD_FOLDER, f"{uid}_{filename}")
        audio.save(input_path)

        # Transcription
        if engine == 'whisper':
            result     = whisper_model.transcribe(input_path)
            transcript = result['text']

        elif engine == 'vosk':
            converted_path = input_path + ".wav"
            subprocess.run([
                "ffmpeg", "-y", "-i", input_path,
                "-ar", "16000", "-ac", "1", converted_path
            ], check=True)
            wf  = wave.open(converted_path, "rb")
            rec = KaldiRecognizer(vosk_model, wf.getframerate())
            transcript = ""
            while True:
                data = wf.readframes(4000)
                if not data:
                    break
                if rec.AcceptWaveform(data):
                    part = json.loads(rec.Result())
                    transcript += part.get("text", "") + " "
            wf.close()

        else:
            return jsonify({'error': 'Invalid STT engine'}), 400

        transcript = transcript.strip()
        print("Transcript:", transcript)

        # Synthesize with Piper
        out_filename   = f"{uid}.wav"
        out_audio_path = os.path.join(OUTPUT_FOLDER, out_filename)
        try:
            synthesize_with_piper(transcript, out_audio_path)
        except subprocess.CalledProcessError as e:
            return jsonify({
                'error': 'TTS synthesis failed',
                'details': str(e)
            }), 500

        # Dynamically build URL for the generated file
        audio_url = url_for('serve_audio', filename=out_filename, _external=True)

        return jsonify({
            'transcript': transcript,
            'audio_url':  audio_url
        })

    except Exception as e:
        return jsonify({
            'error':   'Processing failed',
            'details': str(e)
        }), 500

@app.route('/outputs/<filename>')
def serve_audio(filename):
    return send_from_directory(OUTPUT_FOLDER, filename)

if __name__ == '__main__':
    # Listen on all interfaces so ngrok can reach it
    app.run(debug=True, host='0.0.0.0', port=5000)
