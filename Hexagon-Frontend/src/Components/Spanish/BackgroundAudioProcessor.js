export default class BackgroundAudioProcessor {
    constructor(audioContext, transcriptionCallback, translatedtextCallback) {
      this.audioContext = audioContext || new AudioContext();
      this.destination = this.audioContext.createMediaStreamDestination();  // Create once and reuse
      this.background = null;
      this.ws = null; // Initialize WebSocket outside the constructor
      this.mediaRecorder = null;
      this.recognition = null;
      this.isRecognizing = false;
      this.transcriptionCallback = transcriptionCallback;
      this.translatedtextCallback = translatedtextCallback;
    }
  
    async createProcessedStream(stream) {
      if (!this.ws) {
        this.ws = new WebSocket("wss://ivaanibackendes.indikaai.com/callee_transcription");
        this.ws.onopen = () => {
          console.log("WebSocket connection established for callee transcription");
          this.transcribeAudio(stream).then(transcription => {
            console.log("Transcription process completed:", transcription);
          }).catch(error => {
            console.error("Transcription error:", error);
          });
        };
  
        this.ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          console.log('Received data:', data);
          const eventData = {
            callee_transcription: data.callee_transcription, // Assuming 'callee_transcription' is the key for transcription data
            callee_translatedText: data.translated_text, // Already included
            audioBase64: data.audio_base64, // Including audio data if needed elsewhere in your application
            callee_caller: data.caller, // Including caller information
            timestamp: data.timestamp // Including the timestamp
          };
          if (data.translated_text && this.translatedtextCallback) {
            console.log("Invoking translatedtextCallback with eventData:", eventData);
            this.translatedtextCallback(eventData);
          } else {
            console.error("translated_text is missing or translatedtextCallback is not defined.");
          }
          if (data.audio_base64) {
            const audioBase64 = data.audio_base64;
            console.log('Received audio base64:', audioBase64);
            // Ensure audio context is resumed
            if (this.audioContext.state === 'suspended') {
              this.audioContext.resume().then(() => {
                console.log("AudioContext resumed successfully.");
              }).catch(e => {
                console.error("Error resuming AudioContext:", e);
              });
            }
            // Proper cleanup of previous resources
            if (this.background) {
              this.background.disconnect();
              this.background = null;
            }
            const audioUrl = `data:audio/wav;base64,${audioBase64}`;
            // If there's an existing audio source, disconnect it to clean up resources
            if (this.background) {
              this.background.disconnect();
            }
  
            // Create a new Audio element to play the received audio
            const audioEl = new Audio(audioUrl);
            // audioEl.loop = true;  // Set looping to true
  
            // Add event listener to play the audio once it can be played through
            audioEl.addEventListener('canplaythrough', () => {
              audioEl.play().catch(e => console.error("Error playing the audio:", e));
            });
  
            // Connect the audio element to the Web Audio API context
            this.background = this.audioContext.createMediaElementSource(audioEl);
            this.background.connect(this.destination);
  
            // Ensure the audio plays smoothly
            audioEl.addEventListener('error', (e) => {
              console.error("Error with the audio element:", e);
            });
  
            // Return the destination's stream to be used elsewhere if needed
            return this.destination.stream;
  
          }
          if (data.transcription) {
            const transcription = data.transcription;
            console.log('Received transcription:', transcription);
          }
          if (data.caller) {
            const caller = data.caller;
            console.log('Received caller:', caller);
          }
          if (data.timestamp) {
            const timestamp = data.timestamp;
            console.log('Received timestamp:', timestamp);
          }
          if (!data.audio_base64 && !data.translated_text) {
            console.log("Received message does not contain expected data.");
          }
        };
  
        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          this.cleanup(); // Handle errors by cleaning up resources
        };
  
        // this.ws.onclose = () => {
        //   console.log("WebSocket connection closed");
        //   this.cleanup(); // Clean up on close as well
        // };
      } else {
        // If WebSocket is already open, send the stream immediately
        this.transcribeAudio(stream).then(transcription => {
          console.log("Transcription process completed:", transcription);
        }).catch(error => {
          console.error("Transcription error:", error);
        });
      }
      return this.destination.stream;
    }
  
    // async transcribeAudio(stream) {
    //   return new Promise((resolve, reject) => {
    //     const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    //     recognition.lang = 'en-US';
    //     recognition.continuous = true;
    //     recognition.interimResults = false;
    //     //let isRecognizing = false;
    //     const startRecognition = () => {
    //       console.log('Restarting recognition...');
    //       recognition.start();
    //     };
    //     recognition.onresult = event => {
    //       let transcription = '';
    //       for (let i = event.resultIndex; i < event.results.length; ++i) {
    //         if (event.results[i].isFinal) {
    //           transcription += event.results[i][0].transcript;
    //           if (this.transcriptionCallback) {
    //             this.transcriptionCallback(transcription);
    //           }
  
    //           // Send the transcription over WebSocket if the connection is open
    //           if (this.ws && this.ws.readyState === WebSocket.OPEN) {
    //             this.ws.send(JSON.stringify({
    //               transcription: transcription
    //             }));
    //             console.log('Transcript sent:', transcription);
    //           } else {
    //             console.error('WebSocket is not open. Cannot send transcription.');
    //           }
    //         }
    //       }
    //       console.log('Final Transcript:', transcription);
    //       resolve(transcription);
    //     };
    //     recognition.onerror = error => {
    //       console.error('Speech recognition error:', error);
    //       if (error.error === 'no-speech') {
    //         console.log('No speech detected. Restarting recognition...');
    //         recognition.stop();
    //         setTimeout(startRecognition, 1000)
    //       } else {
    //         reject(error);
    //       }
    //     };      
    //     recognition.onend = () => {
    //       console.log('Speech recognition service disconnected. Restarting...');
    //     };
  
    //     recognition.stream = stream;
    //     startRecognition();
    //   });
    // }
  
    async transcribeAudio(stream) {
      return new Promise((resolve, reject) => {
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'en-US';
        recognition.continuous = true;
        recognition.interimResults = false;
        let timeoutId = null; // Variable to store the timeout ID
        let isRecognitionStarted = false;
        // const startRecognition = () => {
        //   console.log('Starting recognition...');
        //   recognition.start();
        // };
        const startRecognition = () => {
          if (!isRecognitionStarted) { // Check if recognition has not started
            console.log('Starting recognition...');
            recognition.start();
            isRecognitionStarted = true; // Update the flag
          }
        };
  
        recognition.onresult = event => {
          clearTimeout(timeoutId); // Clear the timeout when speech is detected
          let transcription = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              transcription += event.results[i][0].transcript;
              if (this.transcriptionCallback) {
                this.transcriptionCallback(transcription);
              }
  
              // Send the transcription over WebSocket if the connection is open
              if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                  transcription: transcription
                }));
                console.log('Transcript sent:', transcription);
              } else {
                console.error('WebSocket is not open. Cannot send transcription.');
              }
            }
          }
          console.log('Final Transcript:', transcription);
          resolve(transcription);
        };
  
        recognition.onerror = error => {
          console.error('Speech recognition error:', error);
          if (error.error === 'no-speech') {
            console.log('No speech detected. Restarting recognition...');
            recognition.stop();
            isRecognitionStarted = false;
            setTimeout(startRecognition, 2000);
          } else {
            reject(error);
          }
        };
  
        recognition.onend = () => {
          console.log('Speech recognition service disconnected. Restarting...');
          // Start recognition after a period of silence (5 seconds)
          isRecognitionStarted = false;
          startRecognition();
        };
  
        recognition.stream = stream;
        startRecognition();
      });
    }
  
  
    async destroyProcessedStream() {
      this.cleanup();
    }
  
    cleanup() {
      if (this.background) {
        this.background.disconnect();
        this.background = null;
      }
  
      if (this.destination) {
        this.destination.disconnect();
      }
  
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
  
      if (this.mediaRecorder) {
        this.mediaRecorder.stop();
        this.mediaRecorder = null;
      }
  
      if (this.recognition && this.isRecognizing) {
        this.recognition.stop();
      }
  
    }
  }
  
  