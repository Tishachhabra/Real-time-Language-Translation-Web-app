import queue
from message_handler import messages
from google.cloud import speech


class SpeechClientBridge:
    def __init__(self, streaming_config, on_response):
        self._on_response = on_response
        self._queue = queue.Queue()
        self._ended = False
        self.streaming_config = streaming_config

    def start(self):
        client = speech.SpeechClient()
        stream = self.generator()
        requests = (
            speech.StreamingRecognizeRequest(audio_content=content)
            for content in stream
        )
        responses = client.streaming_recognize(self.streaming_config, requests)
        self.process_responses_loop(responses)

    def terminate(self):
        self._ended = True

    def add_request(self, buffer):
        self._queue.put(bytes(buffer), block=False)

    # def process_responses_loop(self, responses):
    #     for response in responses:
    #         self._on_response(response)

    #         if self._ended:
    #             break
    def process_responses_loop(self, responses):
        for response in responses:
        # Example: Handling language detection in the first response
            if response.results and response.results[0].language_code:
                detected_language = response.results[0].language_code
                print(f"Detected language: {detected_language}")
                # You can adjust your transcription settings here if needed

            self._on_response(response, detected_language)

            if self._ended:
                break


    def generator(self):
        while not self._ended:
            chunk = self._queue.get()
            if chunk is None:
                return
            data = [chunk]
            while True:
                try:
                    chunk = self._queue.get(block=False)
                    if chunk is None:
                        return
                    data.append(chunk)
                except queue.Empty:
                    break

            yield b"".join(data)