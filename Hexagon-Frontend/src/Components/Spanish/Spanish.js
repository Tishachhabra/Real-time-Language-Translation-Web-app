import React, { useState, useEffect } from "react";
import { Device } from "@twilio/voice-sdk";
import { UserSwitchOutlined } from "@ant-design/icons";
import EditIcon from "@mui/icons-material/Edit";
import DownloadIcon from '@mui/icons-material/Download';
import clear_day from "../../Assets/clear_day.svg";
import iVaani from "../../Assets/iVaani.svg";
import spark from "../../Assets/spark.svg";
import callerlang from "../../Assets/callerlang.svg";
import operatorlang from "../../Assets/operatorlang.svg";
import { Layout, theme } from "antd";
import BackgroundAudioProcessor from "./BackgroundAudioProcessor";
const { Header, Content, Sider } = Layout;

const Spanish = () => {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const [currentTime, setCurrentTime] = useState("");
  // eslint-disable-next-line no-unused-vars
  const [device, setDevice] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [showIncomingCallUI, setShowIncomingCallUI] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callTimer, setCallTimer] = useState(null);
  //const [isMuted, setIsMuted] = useState(false);
  //const [isOnHold, setIsOnHold] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [messages, setMessages] = useState([]);
  const [transcriptions, setTranscriptions] = useState([]);
  const [translatedTranscriptions, setTranslatedTranscriptions] = useState([]);
  const [allMessages, setAllMessages] = useState([]);
  useEffect(() => {
    const mergedMessages = [...messages, ...translatedTranscriptions];
    mergedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    setAllMessages(mergedMessages);
  }, [messages, translatedTranscriptions]);

  useEffect(() => {
    const interval = setInterval(() => {
      const date = new Date();
      const options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      };
      setCurrentTime(date.toLocaleString("en-US", options));
    }, 1000);
    return () => clearInterval(interval);
  }, []);




  const languageNames = {
    'en-us': 'English',  // Changed to lowercase
    'de-de': 'German',    // Changed to lowercase
    'hi-in': 'Hindi',   // Changed to lowercase
    'es-es': 'Spanish',   // Changed to lowercase
    'ur-in': 'Urdu',   // Changed to lowercase
    'ur-pk': 'Urdu',   // Changed to lowercase
  };

  const handleTranscription = (transcriptionData) => {
    setTranscriptions(prevTranscriptions => [...prevTranscriptions, transcriptionData]);
  };
  const translatedtextCallback = (eventData) => {
    setTranslatedTranscriptions(prevTranslations => [...prevTranslations, eventData]);
  };

  useEffect(() => {
    const baseUrl = "https://ivaanibackendes.indikaai.com/";
    //const baseUrl = "https://m6d6orhpoa.execute-api.ap-south-1.amazonaws.com/dev/"
    let localDevice = null;
    const setupTwilioDevice = async () => {
      try {
        const tokenResponse = await fetch(`${baseUrl}token`);
        if (!tokenResponse.ok) {
          throw new Error("Failed to fetch token");
        }
        const { token } = await tokenResponse.json();

        console.log("Token:", token);

        const device = new Device(token, {
          codecPreferences: ["opus", "pcmu"],
          enableRingingState: true,
          logLevel: "debug",
        });
        const processor = new BackgroundAudioProcessor(null, handleTranscription, translatedtextCallback);
        await device.audio.addProcessor(processor);

        device.on("ready", async () => {
          console.log("Twilio.Device Ready!");
        });

        device.on("error", (error) => {
          console.log("Error:", error);
          console.error("Twilio.Device Error:", error.message);
        });

        device.on("connect", (conn) => {
          console.log("Successfully established call!");
          startCallTimer();
        });

        device.on("disconnect", (conn) => {
          console.log("Call ended.");
          clearInterval(callTimer);
          setShowIncomingCallUI(false);
          setIncomingCallData(null);
          setCallDuration(0);
          //setIsOnHold(false);
          //setIsMuted(false);
        });

        device.on("incoming", (conn) => {
          console.log("Incoming connection from", conn.parameters.From);
          setIncomingCall(conn);
          setShowIncomingCallUI(true);

          setIncomingCallData({
            callerPhoneNumber: conn.parameters.From,
          });

          console.log("conn", conn);
        });

        await device.register();
        setDevice(device);
        localDevice = device; // Store the device for cleanup
      } catch (error) {
        console.log('Error:', error);
        console.error("Error setting up Twilio Device:", error.message);
      }
    };

    setupTwilioDevice();
    return () => {
      localDevice?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Function to accept an incoming call
  const acceptCall = () => {
    if (incomingCall) {
      incomingCall.accept();
      console.log("Call accepted");
      setShowIncomingCallUI(false);
      startCallTimer();
    }
  };

  // Function to reject an incoming call
  const rejectCall = () => {
    if (incomingCall) {
      incomingCall.reject();
      console.log("Call rejected");
      setShowIncomingCallUI(false);
      setIncomingCallData(null);
      setCallDuration(0);
    }
  };

  // Function to hang up an ongoing call
  const hangUpCall = () => {
    if (incomingCall) {
      incomingCall.disconnect();
      console.log("Call hangup");
      setShowIncomingCallUI(false); // Reset showIncomingCallUI
      setIncomingCallData(null); // Clear incoming call data
      setCallDuration(0); // Reset call duration
      //setIsOnHold(false); // Reset hold status
      //setIsMuted(false); // Reset mute status
    }
  };

  // Function to start the call timer do not use setInterval 
  const startCallTimer = () => {
    const startTime = new Date().getTime();
    const timer = setInterval(() => {
      const currentTime = new Date().getTime();
      const duration = Math.floor((currentTime - startTime) / 1000);
      setCallDuration(duration);
    }, 1000);
    setCallTimer(timer);
  };





  // useEffect(() => {
  //   const ws = new WebSocket('ws://localhost:5000/ws');
  //   ws.onopen = () => console.log("Connected to WS Server");
  //   ws.onmessage = (event) => {
  //     try {
  //       const data = JSON.parse(event.data);
  //       console.log("Parsed data:", data);
  //       if (data) {
  //         console.log("Final message:", data.transcription);
  //         //setFinalMessage(data.transcription);
  //         //setFinalTranslated(data.translated_text);
  //         setMessages(prevMessages => [...prevMessages, {
  //           transcription: data.transcription,
  //           translation: data.translated_text,
  //         }]);
  //         //addMessage({ type: 'Caller', transcription: data.transcription, translation: data.translated_text });
  //         if (data.detected_language) {
  //           const detectedLangName = languageNames[data.detected_language] || "Unknown Language";
  //           setDetectedLanguage(detectedLangName);
  //         }
  //       } else {

  //         console.log("Interim message received");
  //       }
  //     } catch (error) {
  //       console.error("Error parsing JSON:", error);
  //     }
  //   };
  //   ws.onerror = (event) => {
  //     console.error("WebSocket error observed:", event);
  //   };
  //   ws.onclose = (event) => console.log("Disconnected from WS Server", event.code, "Reason:", event.reason);

  //   return () => {
  //     ws.close();
  //   };
  // }, []);
  // useEffect(() => {
  //   debugger;
  //   let ws;
  //   let reconnectInterval = 3000;
  //   function connect() {
  //     ws = new WebSocket('ws://localhost:5000/ws');

  //     ws.onopen = () => {
  //       console.log("Connected to WS Server");
  //       reconnectInterval = 3000;  // Reset reconnection interval after a successful connection

  //     };

  //     ws.onmessage = (event) => {
  //       try {
  //         const data = JSON.parse(event.data);
  //         console.log("Received data:", data);
  //         setMessages(prevMessages => [...prevMessages, data]);
  //         if (data.detected_language) {
  //           const detectedLangName = languageNames[data.detected_language] || "Unknown Language";
  //           setDetectedLanguage(detectedLangName);
  //         }
  //       } catch (error) {
  //         console.error("Error parsing JSON:", error);
  //       }
  //     };

  //     ws.onerror = (event) => {
  //       console.error("WebSocket error observed:", event);
  //     };

  //     ws.onclose = (event) => {
  //       console.log("Disconnected from WS Server", event.code, "Reason:", event.reason);
  //       if (event.code !== 1000) {
  //         console.log("Attempting to reconnect...");
  //         setTimeout(connect, reconnectInterval); // attempt to reconnect in 3 seconds
  //       }
  //     };
  //   }

  //   connect();
  // }, []);


  useEffect(() => {
    let ws = new WebSocket('wss://ivaanibackendes.indikaai.com/ws');

    const handleOpen = () => {
      console.log("Connected to WebSocket Server");
    };

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received data:", data);
        if (data.type === "keep_alive") {
          console.log("Received keep-alive message");
          return; // Ignore keep-alive messages
        }
        if (data) {
          console.log("Final message:", data.transcription);
          setMessages(prevMessages => [...prevMessages, data]);
          if (data.detected_language) {
            const detectedLangName = languageNames[data.detected_language] || "Unknown Language";
            setDetectedLanguage(detectedLangName);
          }
        } else {
          console.log("Interim message received");
        }
      } catch (error) {
        console.error("Error parsing JSON:", error);
      }
    };

    const handleError = (event) => {
      console.error("WebSocket error observed:", event);
      // Attempt to reconnect on error
      ws.close();
    };

    const handleClose = (event) => {
      console.log("Disconnected from WebSocket Server", event.code, "Reason:", event.reason);
      // Reconnect after a short delay
      setTimeout(() => {
        ws = new WebSocket('wss://ivaanibackendes.indikaai.com/ws');
        ws.addEventListener('open', handleOpen);
        ws.addEventListener('message', handleMessage);
        ws.addEventListener('error', handleError);
        ws.addEventListener('close', handleClose);
      }, 3000); // Reconnect after 3 seconds
    };

    ws.addEventListener('open', handleOpen);
    ws.addEventListener('message', handleMessage);
    ws.addEventListener('error', handleError);
    ws.addEventListener('close', handleClose);

    // Heartbeat mechanism
    const sendHeartbeat = () => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log("Sending heartbeat message");
        ws.send('{"type": "heartbeat"}');
      }
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 5000); // Send heartbeat every 5 seconds

    return () => {
      clearInterval(heartbeatInterval);
      ws.close();
    };
  }, []);


  const downloadTranscriptions = () => {
    const combinedData = allMessages.map((message) => ({
      speaker: message.transcription ? 'Caller' : 'Callee',
      transcription: message.transcription || message.callee_transcription,
      translation: message.translated_text || message.callee_translatedText,
      timestamp: message.timestamp || message.callee_timestamp,
    }));

    // Convert combined data to text format
    const textData = combinedData.map(data => `${new Date(data.timestamp).toISOString()}: ${data.speaker}: ${data.transcription}\nTranslation: ${data.translation}\n`).join('\n');

    // Create a Blob with the text data
    const blob = new Blob([textData], { type: 'text/plain' });

    // Create a URL for the Blob
    const url = URL.createObjectURL(blob);

    // Create a link element
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ivaani.txt';

    // Simulate a click on the link to trigger the download
    document.body.appendChild(link);
    link.click();

    // Clean up by revoking the URL object
    URL.revokeObjectURL(url);
    document.body.removeChild(link);
  };


  return (
    <Layout>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#FFF",
        }}>
        <div
          className="demo-logo"
          style={{ marginRight: "24px", color: "white" }}>
          <img
            src={clear_day}
            alt="logo"
            style={{ display: "flex", alignItems: "center" }}
          />
        </div>
        <div
          className="demo-logo"
          style={{ marginRight: "24px", color: "white" }}>
          <img
            src={iVaani}
            alt="logo"
            style={{ display: "flex", alignItems: "center" }}
          />
        </div>
        <div className="mr-24 font-bold text-gray-800">{currentTime}</div>
      </Header>
      <Layout style={{ minHeight: "90vh" }}>
        <Sider
          width={350}
          style={{
            display: "flex",
            background: colorBgContainer,
            minHeight: "90vh",
            borderRadius: borderRadiusLG,
            borderRight: "1px solid #cacaca",
            padding: "24px 24px",
            justifyContent: "center",
          }}>
          <div
            className="flex border-b-2 border-gray-200 mb-4 justify-center"
            style={{ width: 350 }}>
            <UserSwitchOutlined size={32} /> Caller Information
          </div>
          <div
            className="flex border-gray-200 p-4 m-4 items-center"
            style={{ backgroundColor: "#EFF6FF" }}>
            <div className="flex flex-col">
              <img
                src={spark}
                alt="spark"
                style={{ marginRight: 12, width: 40, height: 40 }}
              />
            </div>
            <div className="flex flex-col">
              <div className="font-semi-bold">
                This icon indicates that the information is automatically
                detected by AI.
              </div>
            </div>
          </div>
          <div
            className="flex border-gray-200 p-4 m-4 items-center"
            style={{ backgroundColor: "#EFF6FF" }}>
            <EditIcon style={{ marginRight: 12 }} />
            You can click this icon to edit any field’s information.
          </div>
          <div
            className="flex border-gray-200 p-4 m-4 items-center justify-between"
            style={{ backgroundColor: "#F8F8F8" }}>
            <div className="flex flex-col">
              <div className="font-semi-bold" style={{ color: "black" }}>
                Caller's language
              </div>
              <div className="font-bold" style={{ color: "black" }}>
                {detectedLanguage}
              </div>
            </div>
            <div className="flex flex-row items-center">
              <img
                src={spark}
                alt="spark"
                style={{ marginRight: 12, width: 30, height: 30 }}
              />
              <EditIcon style={{ marginRight: 12 }} />
            </div>

          </div>
          <div className="flex border-gray-200 p-4 m-4 items-center justify-between" style={{ backgroundColor: "#F8F8F8" }}>
            <div className="font-semi-bold" style={{ color: "black" }}>Download Transcriptions</div>
            <DownloadIcon onClick={downloadTranscriptions} style={{ marginRight: 12, cursor: 'pointer' }} />
          </div>
        </Sider>
        <Layout
          style={{
            padding: "8px 24px 24px",
          }}>
          <Content
            style={{
              display: "flex",
              flexDirection: "column",
              padding: 0,
              margin: 0,
              height: "100%",
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}>

            <div
              className="flex flex-row border-gray-200 p-8 items-center"
              style={{ backgroundColor: "#37007C" }}>
              {incomingCallData && !showIncomingCallUI ? (
                <div>
                  <p className="font-bold text-gray-200">
                    In call with: {incomingCallData.callerPhoneNumber}
                  </p>
                  <p className="font-bold text-gray-200">Call Duration: {callDuration} seconds</p>
                  <div>
                    {/* <button onClick={toggleHold}>
                      {isOnHold ? "Unhold" : "Put on hold"}
                    </button>
                    <button onClick={toggleMute}>
                      {isMuted ? "Unmute" : "Mute"}
                    </button> */}
                    <button onClick={hangUpCall} style={{ backgroundColor: "red", color: "white" }}>Hangup</button>
                  </div>
                </div>
              ) : (
                <div>
                  {incomingCallData && (
                    <div>
                      <p className="font-bold text-gray-200">
                        Incoming Call from: {incomingCallData.callerPhoneNumber}
                      </p>
                      <div>
                        <button
                          onClick={acceptCall}
                          style={{
                            backgroundColor: "blue",
                            color: "white",
                            marginRight: "5px",
                          }}>
                          Accept
                        </button>
                        <button
                          onClick={rejectCall}
                          style={{ backgroundColor: "red", color: "white" }}>
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div
              className="flex border-gray-200 p-4 m-4 items-center"
              style={{ backgroundColor: "#F8F8F8" }}>
              <div className="flex justify-between w-full">
                <div className="w-1/2 pr-2 flex items-center">
                  <img
                    src={callerlang}
                    alt="Caller Language"
                    style={{ marginRight: 12, width: 70, height: 70 }}
                  />

                  <div className="flex flex-col">

                    <div className="font-semi-bold">Caller Language</div>
                    <div className="font-bold">{detectedLanguage}</div>
                  </div>
                </div>
                <div className="w-1/2 pl-2 border-l-2 border-gray-400 flex items-center">
                  <img
                    src={operatorlang}
                    alt="Operator Language"
                    style={{ marginRight: 12, width: 70, height: 70 }}
                  />
                  <div className="flex flex-col">
                    <div className="font-semi-bold">Your Language</div>
                    <div className="font-bold">English</div>
                    {/* <div className="font-semi-bold text-[#2200F3]">
                      Change your language
                    </div> */}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col border-gray-200 p-4 m-4 items-start" style={{ backgroundColor: "#F8F8F8", minHeight: '55vh', maxHeight: '55vh', overflowY: 'auto' }}>
              {allMessages.map((conversation, index) => (
                <div
                  key={index}
                  className={`flex border-gray-200 p-4 m-4 ${conversation.transcription ? 'justify-end' : 'justify-start'} ${conversation.transcription ? 'ml-auto' : ''}`}
                  style={{ backgroundColor: conversation.transcription ? "#E6E0FD" : "#FFFFFF" }}
                >
                  <div className="flex flex-col">
                    <div className={`flex items-center ${conversation.transcription ? 'ml-auto' : ''}`}>
                      <img
                        src={conversation.transcription ? callerlang : operatorlang}
                        alt={conversation.transcription ? "Caller Language" : "Operator Language"}
                        style={{ marginRight: 12, width: 50, height: 50 }}
                      />
                      <div className="font-semi-bold">{conversation.transcription ? "Caller" : "You"}</div>
                    </div>
                    <div className="font-bold">{conversation.transcription || conversation.callee_transcription}</div>
                    <div className="font-semi-bold text-[#2200F3]">{conversation.translated_text || conversation.callee_translatedText}</div>
                    <div className="font-semi-bold">{conversation.caller || conversation.callee_caller}</div>
                    <div className="font-semi-bold">{new Date(conversation.timestamp || conversation.callee_timestamp).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};
export default Spanish;


