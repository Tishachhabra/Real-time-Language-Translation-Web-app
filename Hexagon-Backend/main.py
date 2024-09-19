import base64
from io import BytesIO
import time
import json
import threading
import os
import assemblyai as aai
from gtts import gTTS
from flask import Flask, request, Response, jsonify
from flask_sock import Sock
from twilio.rest import Client
from dotenv import load_dotenv
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VoiceGrant
from twilio.twiml.voice_response import VoiceResponse, Dial, Stream, Start, Connect, Conference
import uuid
from twilio_transcriber import TwilioTranscriber
from flask_cors import CORS
from message_handler import messages
from google.cloud.speech import RecognitionConfig, StreamingRecognitionConfig
from google.cloud import translate_v2 as translate
from google.cloud import texttospeech
from SpeechClientBridge import SpeechClientBridge
from collections import defaultdict
load_dotenv()

# Flask settings
PORT = 5000  # Adjust the port if needed
DEBUG = True  # Adjust the debug mode as per your requirements
WEBSOCKET_ROUTE = '/realtime'

# Twilio authentication
account_sid = os.environ['TWILIO_ACCOUNT_SID']
auth_token = os.environ['TWILIO_AUTH_TOKEN']
api_key = os.environ['TWILIO_API_KEY_SID']
api_secret = os.environ['TWILIO_API_KEY_SECRET']
twiml_app_sid = os.environ['TWIML_APP_SID']
twilio_number = os.environ['TWILIO_NUMBER']
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = os.environ.get(
    'GOOGLE_APPLICATION_CREDENTIALS')
project_id = os.environ.get('GOOGLE_CLOUD_PROJECT')
transcription_config = aai.TranscriptionConfig(language_detection=True)
app = Flask(__name__)
sock = Sock(app)
CORS(app, origins=["http://localhost:3000"])

config = RecognitionConfig(
    encoding=RecognitionConfig.AudioEncoding.MULAW,
    sample_rate_hertz=8000,
    language_code='en-US',
    alternative_language_codes=['hi-IN', 'fr-FR', 'es-ES'],
    enable_automatic_punctuation=True,
)
streaming_config = StreamingRecognitionConfig(
    config=config, interim_results=False)
translate_client = translate.Client()


@app.route('/handle_calls', methods=['POST'])
def call():
    response = VoiceResponse()
    if 'To' in request.form and request.form['To'] != twilio_number:
        print('Outbound call')
        dial = Dial(callerId=twilio_number)
        dial.number(request.form['To'])
        response.append(dial)
    else:
        print('Incoming call')
        caller = request.form['Caller']
        response.start().stream(url=f'wss://{request.host}{WEBSOCKET_ROUTE}')
        response.say("Please wait while we connect you to the call.")
        dial = Dial(callerId=caller)
        dial.client(twilio_number)
        response.append(dial)
    return str(response)



def on_transcription_response(response, detected_language):
    if not response.results:
        return

    result = response.results[0]
    if not result.alternatives:
        return

    transcription = result.alternatives[0].transcript
    print("Transcription: " + transcription)
    if result.language_code:
        detected_language = result.language_code
        print(f"Detected language: {detected_language}")
    # Translate the transcription to English
    translation = translate_client.translate(
        transcription,
        source_language=detected_language,
        target_language='en'
    )
    translated_text = translation['translatedText']
    print("Translated text: " + translated_text)
    message = {
        'transcription': transcription,
        'translated_text': translated_text,
        'detected_language': detected_language
    }
    messages.append(message)


def process_incoming_message(message):
    print(f"Processing received message: {message}")


@sock.route(WEBSOCKET_ROUTE)
def transcript(ws):
    print("WS connection opened")
    transcriber = SpeechClientBridge(
        streaming_config, on_transcription_response)
    t = threading.Thread(target=transcriber.start)
    t.start()

    while True:
        data = json.loads(ws.receive())
        if data['event'] == "connected":
            # transcriber = TwilioTranscriber(websocket=ws)
            # transcriber.connect()
            print('transcriber connected')
        elif data['event'] == "start":
            print('twilio started')
        elif data['event'] == "media":
            payload_b64 = data['media']['payload']
            payload_mulaw = base64.b64decode(payload_b64)
            transcriber.add_request(payload_mulaw)
        elif data['event'] == "stop":
            print('twilio stopped')
            # transcriber.close()
            print('transcriber closed')


@sock.route('/ws')
def realtime(ws):
    print("WebSocket connection opened")
    global messages
    while True:
        if messages:
            message = messages.pop(0)
            message_str = json.dumps(message)
            try:
                print(f"Sending message: {message_str}")
                ws.send(message_str)
            except Exception as e:
                print(f"Error sending message: {e}")
                break
        else:
            time.sleep(1)
    print("WebSocket connection closed")


@sock.route('/callee_transcription')
def process_callee_transcription(ws):
    print("WebSocket connection opened for callee transcription")
    while True:
        data = json.loads(ws.receive())
        print(data)
        if data.get('transcription'):
            transcription = data['transcription']
            translated_callee_text = translate_client.translate(
                transcription,
                source_language='en',
                target_language='hi-IN'
            )['translatedText']
            print("Translated callee text: " + translated_callee_text)

            # Convert translated text to speech
            tts_client = texttospeech.TextToSpeechClient()
            synthesis_input = texttospeech.SynthesisInput(
                text=translated_callee_text)
            voice = texttospeech.VoiceSelectionParams(
                language_code='hi-IN',  # Target language
                name='hi-IN-Wavenet-A'  # Voice name
            )
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MULAW,  # 16-bit PCM WAV format
                sample_rate_hertz=8000  # 8 kHz sample rate
            )
            response = tts_client.synthesize_speech(
                input=synthesis_input, voice=voice, audio_config=audio_config
            )

            # Convert audio content to base64
            audio_content = response.audio_content
            audio_base64 = base64.b64encode(audio_content).decode('utf-8')

            # Send the base64-encoded audio and translated text to the frontend
            print("Sending audio to the frontend" + translated_callee_text)
            # ws.send(json.dumps({"audio_base64": audio_base64}))
            ws.send(json.dumps({
                "audio_base64": audio_base64,
                "translated_text": translated_callee_text
            }))
        elif data.get('stop'):
            print('Transcription stopped')
            break
    print("WebSocket connection for callee transcription closed")


@app.route('/token', methods=['GET'])
def get_token():
    identity = twilio_number
    outgoing_application_sid = twiml_app_sid

    access_token = AccessToken(
        account_sid, api_key, api_secret, identity=identity)
    voice_grant = VoiceGrant(
        outgoing_application_sid=outgoing_application_sid, incoming_allow=True)
    access_token.add_grant(voice_grant)

    response = jsonify({'token': access_token.to_jwt(), 'identity': identity})
    response.headers.add('Access-Control-Allow-Origin', '*')

    return response


if __name__ == "__main__":
    print(f"Server running on http://localhost:{PORT}")
    app.run(port=PORT, debug=DEBUG)
