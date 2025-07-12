import React, { useRef, useState } from "react";
import { DailyProvider } from "@daily-co/daily-react";
import DailyIframe, { DailyCall } from "@daily-co/daily-js";
import VideoBox from "@/app/Components/VideoBox";
import cn from "./utils/TailwindMergeAndClsx";
import IconSparkleLoader from "@/media/IconSparkleLoader";

interface SimliAgentProps {
  onStart: () => void;
  onClose: () => void;
}

// Get your Simli API key from https://app.simli.com/
const SIMLI_API_KEY = process.env.NEXT_PUBLIC_SIMLI_API_KEY;
const DEFAULT_FACE_ID = process.env.NEXT_PUBLIC_SIMLI_FACE_ID || "6ebf0aa7-6fed-443d-a4c6-fd1e3080b215";

const SimliAgent: React.FC<SimliAgentProps> = ({ onStart, onClose }) => {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [isAvatarVisible, setIsAvatarVisible] = useState(false);
  const [faceId, setFaceId] = useState<string>(DEFAULT_FACE_ID);

  const [tempRoomUrl, setTempRoomUrl] = useState<string>("");
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const myCallObjRef = useRef<DailyCall | null>(null);
  const [chatbotId, setChatbotId] = useState<string | null>(null);

  /**
   * Create a new Simli room and join it using Daily
   */
  const handleJoinRoom = async () => {
    // Set loading state
    setIsLoading(true);

    // 1- Create a new simli avatar at https://app.simli.com/
    // 2- Cutomize your agent and copy the code output
    // 3- PASTE YOUR CODE OUTPUT FROM SIMLI BELOW 👇
    /**********************************/

    const response = await fetch("https://api.simli.ai/startE2ESession", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiKey: SIMLI_API_KEY,
        faceId: faceId,
        voiceId: "",
        firstMessage: "",
        systemPrompt: "",
        // Request highest quality if these parameters are supported
        quality: "high",
        resolution: "1080p",
        videoQuality: "highest",
        // Additional quality parameters
        videoWidth: 1920,
        videoHeight: 1080,
        videoBitrate: 2500000,
        maxResolution: "1920x1080",
      }),
    });

    const data = await response.json();
    const roomUrl = data.roomUrl;

    /**********************************/
    
    // Print the API response 
    console.log("API Response", data);

    // Create a new Daily call object
    let newCallObject = DailyIframe.getCallInstance();
    if (newCallObject === undefined) {
      newCallObject = DailyIframe.createCallObject({
        videoSource: false,
        subscribeToTracksAutomatically: false,
        inputSettings: {
          video: {
            settings: {
              width: { ideal: 1920, min: 1280 },
              height: { ideal: 1080, min: 720 },
              frameRate: { ideal: 30 },
            },
          },
        },
        sendSettings: {
          video: {
            encodings: {
              low: {
                maxBitrate: 300000,
                scaleResolutionDownBy: 4,
                maxFramerate: 15,
              },
              medium: {
                maxBitrate: 1000000,
                scaleResolutionDownBy: 2,
                maxFramerate: 30,
              },
              high: {
                maxBitrate: 2500000,
                scaleResolutionDownBy: 1,
                maxFramerate: 30,
              },
            },
          },
        },
      });
    }

    // Setting my default username
    newCallObject.setUserName("User");

    // Join the Daily room
    await newCallObject.join({ 
      url: roomUrl,
      videoSource: false,
    });
    
    // Update receive settings for all participants after joining
    await newCallObject.updateReceiveSettings({
      '*': {
        video: {
          layer: 2, // Request highest quality layer
        },
      },
    });
    
    // Set bandwidth constraints
    await newCallObject.setBandwidth({
      kbs: 2500,
    });
    
    // Update input settings for video constraints
    await newCallObject.updateInputSettings({
      video: {
        settings: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
      },
    });
    
    myCallObjRef.current = newCallObject;
    console.log("Joined the room with callObject", newCallObject);
    setCallObject(newCallObject);

    // Start checking if Simli's Chatbot Avatar is available
    loadChatbot();
  };  

  /**
   * Checking if Simli's Chatbot avatar is available then render it
   */
  const loadChatbot = async () => {
    if (myCallObjRef.current) {
      let chatbotFound: boolean = false;

      const participants = myCallObjRef.current.participants();
      for (const [key, participant] of Object.entries(participants)) {
        if (participant.user_name === "Chatbot") {
          setChatbotId(participant.session_id);
          chatbotFound = true;
          
          // Subscribe to tracks manually with highest quality
          await myCallObjRef.current.updateParticipant(participant.session_id, {
            setSubscribedTracks: true,
          });
          
          // Update receive settings specifically for the Chatbot to ensure highest quality
          await myCallObjRef.current.updateReceiveSettings({
            [participant.session_id]: {
              video: {
                layer: 2, // Request highest quality layer
              },
            },
          });
          
          // Also update input settings to request higher resolution
          await myCallObjRef.current.updateInputSettings({
            video: {
              processor: {
                type: 'none', // Disable any processing that might reduce quality
              },
            },
          });
          
          // Log video track info for debugging
          const updatedParticipants = myCallObjRef.current.participants();
          const chatbot = updatedParticipants[participant.session_id];
          console.log('Chatbot video track info:', {
            videoTrack: chatbot?.tracks?.video,
            audioTrack: chatbot?.tracks?.audio,
            participant: chatbot,
          });
          
          setIsLoading(false);
          setIsAvatarVisible(true);
          onStart();
          break; // Stop iteration if you found the Chatbot
        }
      }
      if (!chatbotFound) {
        setTimeout(loadChatbot, 500);
      }
    } else {
      setTimeout(loadChatbot, 500);
    }
  };  

  /**
   * Leave the room
   */
  const handleLeaveRoom = async () => {
    if (callObject) {
      await callObject.leave();
      setCallObject(null);
      onClose();
      setIsAvatarVisible(false);
      setIsLoading(false);
    } else {
      console.log("CallObject is null");
    }
  };

  /**
   * Mute participant audio
   */
  const handleMute = async () => {
    if (callObject) {
      callObject.setLocalAudio(false);
    } else {
      console.log("CallObject is null");
    }
  };

  return (
    <>
      {isAvatarVisible && (
        <div className="h-[1200px] w-[1200px] max-w-[95vw] max-h-[85vh]">
          <div className="h-full w-full">
            <DailyProvider callObject={callObject}>
              {chatbotId && <VideoBox key={chatbotId} id={chatbotId} />}
            </DailyProvider>
          </div>
        </div>
      )}
      <div className="flex flex-col items-center">
        {!isAvatarVisible ? (
          <>
            <div className="w-full mb-4">
              <label htmlFor="faceId" className="block text-sm font-medium text-gray-700 mb-2">
                Simli Face ID
              </label>
              <input
                id="faceId"
                type="text"
                value={faceId}
                onChange={(e) => setFaceId(e.target.value)}
                placeholder="Enter your Simli Face ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-simliblue focus:border-transparent outline-none transition-all duration-200 text-black bg-white"
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-gray-500">
                Get your Face ID from <a href="https://app.simli.com/" target="_blank" rel="noopener noreferrer" className="text-simliblue hover:underline">app.simli.com</a>
              </p>
            </div>
            <button
              onClick={handleJoinRoom}
              disabled={isLoading || !faceId.trim()}
              className={cn(
                "w-full h-[52px] mt-4 disabled:bg-[#343434] disabled:text-white disabled:hover:rounded-[100px] bg-simliblue text-white py-3 px-6 rounded-[100px] transition-all duration-300 hover:text-black hover:bg-white hover:rounded-sm",
                "flex justify-center items-center"
              )}
            >
              {isLoading ? (
                <IconSparkleLoader className="h-[20px] animate-loader" />
              ) : (
                <span className="font-abc-repro-mono font-bold w-[164px]">
                  Test Interaction
                </span>
              )}
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-4 w-full">
              <button
                onClick={handleLeaveRoom}
                className={cn(
                  "mt-4 group text-white flex-grow bg-red hover:rounded-sm hover:bg-white h-[52px] px-6 rounded-[100px] transition-all duration-300"
                )}
              >
                <span className="font-abc-repro-mono group-hover:text-black font-bold w-[164px] transition-all duration-300">
                  Stop Interaction
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default SimliAgent;
