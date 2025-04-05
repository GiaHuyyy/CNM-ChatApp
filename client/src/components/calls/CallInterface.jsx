import React, { useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMicrophone,
  faMicrophoneSlash,
  faVideo,
  faVideoSlash,
  faPhoneSlash,
  faExpand,
  faCompress,
  faVolumeHigh,
  faVolumeXmark,
} from "@fortawesome/free-solid-svg-icons";
import { useCallContext } from "../../context/CallProvider";
import { toast } from "sonner";

export default function CallInterface() {
  const {
    callState,
    localVideoRef,
    remoteVideoRef,
    endCall,
    toggleMute,
    toggleVideo,
    isMuted,
    isVideoOff,
    formatDuration,
    toggleSpeaker,
    isSpeakerOn,
    localStream,
    remoteStream,
  } = useCallContext();

  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [audioVolume, setAudioVolume] = React.useState(1);
  const callContainerRef = useRef(null);
  const audioRef = useRef(null);

  // Debug logging to show current call state
  useEffect(() => {
    console.log("Call state updated:", callState);
    console.log("Local stream:", localStream ? "Available" : "Not available");
    console.log("Remote stream:", remoteStream ? "Available" : "Not available");

    if (callState.callStartTime) {
      console.log("Call duration:", callState.callDuration);
      console.log("Start time:", callState.callStartTime);
    }
  }, [callState, localStream, remoteStream]);

  // Attach streams to video elements when they become available
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      console.log("Attaching local stream to video element");
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch((err) => {
        console.error("Error playing local video:", err);
      });
    }

    if (remoteStream && remoteVideoRef.current) {
      console.log("Attaching remote stream to video element");
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch((err) => {
        console.error("Error playing remote video:", err);
      });
    }
  }, [localStream, remoteStream, localVideoRef, remoteVideoRef]);

  // Specifically handle audio for audio calls
  useEffect(() => {
    if (remoteStream && !callState.isVideoCall) {
      console.log("Setting up audio for audio-only call");
      if (audioRef.current) {
        audioRef.current.srcObject = remoteStream;
        audioRef.current.volume = audioVolume;

        audioRef.current.play().catch((err) => {
          console.error("Error playing audio:", err);
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              toast.error("Vui lòng nhấp vào màn hình để bật âm thanh");
              document.addEventListener(
                "click",
                function playAudio() {
                  audioRef.current.play();
                  document.removeEventListener("click", playAudio);
                },
                { once: true },
              );
            });
          }
        });
      }
    }
  }, [remoteStream, callState.isVideoCall, audioVolume]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      callContainerRef.current.requestFullscreen().catch((err) => {
        toast.error(`Không thể bật chế độ toàn màn hình: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleVolumeChange = (e) => {
    const volume = parseFloat(e.target.value);
    setAudioVolume(volume);
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.volume = volume;
    }
  };

  useEffect(() => {
    if (callState.isCallAccepted) {
      console.log("Call duration state:", {
        duration: callState.callDuration,
        startTime: callState.callStartTime,
        formatted: formatDuration(callState.callDuration),
      });
    }
  }, [callState.callDuration, callState.callStartTime, callState.isCallAccepted, formatDuration]);

  // If there's no call data, don't render
  if (!callState.isCalling && !callState.isCallAccepted) return null;

  // Determine name and image of the other party
  const partnerName = callState.isCalling ? callState.receiverName : callState.callerName;
  const partnerImage = callState.isCalling ? callState.receiverImage : callState.callerImage;

  return (
    <div ref={callContainerRef} className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
      {/* Call duration */}
      <div className="absolute top-4 z-10 rounded-full bg-black bg-opacity-50 px-4 py-2 text-white">
        {callState.isCallAccepted
          ? isNaN(callState.callDuration)
            ? "00:00"
            : formatDuration(callState.callDuration)
          : "Đang kết nối..."}
      </div>

      {/* Audio element for call audio - fixed by removing playsInline */}
      <audio ref={audioRef} autoPlay className="hidden" />

      {/* Video container */}
      <div className="relative h-full w-full">
        {/* Remote video (or avatar if audio call) */}
        {callState.isVideoCall && remoteStream ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gray-900">
            <img
              src={partnerImage}
              alt={partnerName}
              className="h-40 w-40 rounded-full border-4 border-blue-500 object-cover"
            />
            <div className="mt-4 text-2xl font-semibold text-white">{partnerName}</div>
            <div className="mt-2 text-lg text-gray-300">
              {callState.isCallAccepted ? "Đang nói chuyện..." : "Đang gọi..."}
            </div>
            {/* Audio waveform visualization */}
            {callState.isCallAccepted && (
              <div className="mt-6 flex items-center space-x-1">
                <div className="h-4 w-1 animate-pulse bg-blue-400" style={{ animationDelay: "0s" }}></div>
                <div className="h-6 w-1 animate-pulse bg-blue-500" style={{ animationDelay: "0.1s" }}></div>
                <div className="h-8 w-1 animate-pulse bg-blue-600" style={{ animationDelay: "0.2s" }}></div>
                <div className="h-10 w-1 animate-pulse bg-blue-700" style={{ animationDelay: "0.3s" }}></div>
                <div className="h-8 w-1 animate-pulse bg-blue-600" style={{ animationDelay: "0.4s" }}></div>
                <div className="h-6 w-1 animate-pulse bg-blue-500" style={{ animationDelay: "0.5s" }}></div>
                <div className="h-4 w-1 animate-pulse bg-blue-400" style={{ animationDelay: "0.6s" }}></div>
              </div>
            )}
            {/* Large timer display for audio calls */}
            {callState.isCallAccepted && (
              <div className="mt-8 text-5xl font-bold text-white">
                {isNaN(callState.callDuration) ? "00:00" : formatDuration(callState.callDuration)}
              </div>
            )}
          </div>
        )}

        {/* Local video */}
        {callState.isVideoCall && (
          <div className="absolute bottom-4 right-4 h-48 w-64 overflow-hidden rounded-lg bg-black shadow-lg">
            <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full rounded-lg object-cover" />
            {isVideoOff && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-gray-800 bg-opacity-80">
                <FontAwesomeIcon icon={faVideoSlash} className="text-3xl text-white" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Volume slider */}
      <div className="absolute right-8 top-4 z-10 flex items-center space-x-2 rounded-full bg-black bg-opacity-50 px-3 py-1">
        <FontAwesomeIcon icon={isSpeakerOn ? faVolumeHigh : faVolumeXmark} className="text-white" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={audioVolume}
          onChange={handleVolumeChange}
          className="w-24 accent-blue-500"
        />
      </div>

      {/* Call controls */}
      <div className="absolute bottom-8 z-10 flex items-center space-x-4 rounded-full bg-black bg-opacity-50 p-4">
        <button
          onClick={toggleMute}
          className={`flex h-12 w-12 items-center justify-center rounded-full ${isMuted ? "bg-red-500" : "bg-gray-700"} text-white transition-colors hover:bg-opacity-80`}
          title={isMuted ? "Bật mic" : "Tắt mic"}
        >
          <FontAwesomeIcon icon={isMuted ? faMicrophoneSlash : faMicrophone} size="lg" />
        </button>

        <button
          onClick={toggleSpeaker}
          className={`flex h-12 w-12 items-center justify-center rounded-full ${!isSpeakerOn ? "bg-red-500" : "bg-gray-700"} text-white transition-colors hover:bg-opacity-80`}
          title={isSpeakerOn ? "Tắt loa" : "Bật loa"}
        >
          <FontAwesomeIcon icon={isSpeakerOn ? faVolumeHigh : faVolumeXmark} size="lg" />
        </button>

        {callState.isVideoCall && (
          <button
            onClick={toggleVideo}
            className={`flex h-12 w-12 items-center justify-center rounded-full ${isVideoOff ? "bg-red-500" : "bg-gray-700"} text-white transition-colors hover:bg-opacity-80`}
            title={isVideoOff ? "Bật camera" : "Tắt camera"}
          >
            <FontAwesomeIcon icon={isVideoOff ? faVideoSlash : faVideo} size="lg" />
          </button>
        )}

        <button
          onClick={endCall}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white transition-colors hover:bg-red-700"
          title="Kết thúc cuộc gọi"
        >
          <FontAwesomeIcon icon={faPhoneSlash} size="lg" />
        </button>

        <button
          onClick={handleFullscreenToggle}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-700 text-white transition-colors hover:bg-opacity-80"
          title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
        >
          <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} size="lg" />
        </button>
      </div>
    </div>
  );
}
