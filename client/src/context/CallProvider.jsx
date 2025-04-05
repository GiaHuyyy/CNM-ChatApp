// Polyfill for global - must be at the very top of the file
if (typeof global === "undefined") {
  window.global = window;
}
// Ensure all required globals are defined
if (typeof process === "undefined") {
  window.process = { env: { DEBUG: undefined }, nextTick: (cb) => setTimeout(cb, 0) };
}
// Add Buffer polyfill
if (typeof window !== "undefined" && !window.Buffer) {
  window.Buffer = {
    isBuffer: () => false,
    from: () => ({}),
  };
}

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { useGlobalContext } from "./GlobalProvider";
import { toast } from "sonner";

// Create a better WebRTC wrapper to fix audio issues
const createPeerConnection = (config) => {
  const { initiator, stream, onSignal, onStream, onError, onClose } = config;

  // Create RTCPeerConnection with ICE servers
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:global.stun.twilio.com:3478" },
    ],
    // Add these configurations to improve connectivity
    iceTransportPolicy: "all",
    bundlePolicy: "balanced",
    rtcpMuxPolicy: "require",
    sdpSemantics: "unified-plan",
  });

  // Add local stream tracks to connection
  if (stream) {
    stream.getTracks().forEach((track) => {
      console.log(`Adding ${track.kind} track to peer connection`);
      pc.addTrack(track, stream);
    });
  }

  // Handle ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("ICE candidate generated", event.candidate.candidate.substring(0, 50) + "...");
      onSignal({ candidate: event.candidate });
    }
  };

  pc.onicegatheringstatechange = () => {
    console.log("ICE gathering state:", pc.iceGatheringState);
  };

  pc.oniceconnectionstatechange = () => {
    console.log("ICE connection state:", pc.iceConnectionState);
    if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
      console.log("ICE connected/completed - media should be flowing");
    }
    if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
      onError(new Error("ICE connection failed or disconnected"));
    }
  };

  // Get remote stream
  pc.ontrack = (event) => {
    console.log(`Received ${event.track.kind} track from remote peer`);

    if (event.streams && event.streams[0]) {
      // Important: Ensure audio is unmuted/enabled
      event.streams[0].getAudioTracks().forEach((track) => {
        track.enabled = true;
        console.log("Remote audio track enabled:", track.enabled, "readyState:", track.readyState);
      });

      onStream(event.streams[0]);
    } else {
      console.warn("Received track but no stream");
    }
  };

  // Handle connection state changes
  pc.onconnectionstatechange = () => {
    console.log("Connection state change:", pc.connectionState);
    if (pc.connectionState === "connected") {
      console.log("Connection established successfully");
    }
    if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
      onError(new Error("Connection failed or disconnected"));
    } else if (pc.connectionState === "closed") {
      onClose?.();
    }
  };

  // Start connection process based on initiator role
  const start = async () => {
    if (initiator) {
      try {
        console.log("Creating offer as initiator");
        // Add audio configuration to SDP
        const offerOptions = {
          offerToReceiveAudio: true,
          offerToReceiveVideo: config.isVideoCall,
        };

        const offer = await pc.createOffer(offerOptions);

        // Make sure audio is prioritized and enabled
        let modifiedSdp = offer.sdp;
        // Ensure audio is given higher priority
        modifiedSdp = modifiedSdp.replace(/(a=mid:audio\r\n)/, "$1a=setup:actpass\r\n");
        offer.sdp = modifiedSdp;

        await pc.setLocalDescription(offer);
        console.log("Local description set (offer)");
        onSignal(pc.localDescription);
      } catch (err) {
        console.error("Error creating offer:", err);
        onError(err);
      }
    }
  };

  // Process incoming signal
  const processSignal = async (signal) => {
    try {
      if (signal.type === "offer") {
        console.log("Received offer, setting remote description");
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        console.log("Creating answer");
        const answer = await pc.createAnswer();

        // Modify SDP to ensure audio works
        let modifiedSdp = answer.sdp;
        modifiedSdp = modifiedSdp.replace(/(a=mid:audio\r\n)/, "$1a=setup:active\r\n");
        answer.sdp = modifiedSdp;

        await pc.setLocalDescription(answer);
        console.log("Local description set (answer)");
        onSignal(pc.localDescription);
      } else if (signal.type === "answer") {
        console.log("Received answer, setting remote description");
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        console.log("Remote description set");
      } else if (signal.candidate) {
        // Only add candidate if remote description has been set
        if (pc.remoteDescription) {
          console.log("Adding ICE candidate");
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch((err) => {
            console.log("Non-fatal ICE candidate error:", err);
          });
        } else {
          console.log("Received ICE candidate before remote description, queueing");
          setTimeout(() => {
            if (pc.remoteDescription) {
              pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch((err) =>
                console.log("Non-fatal ICE candidate error:", err),
              );
            }
          }, 500);
        }
      }
    } catch (err) {
      console.error("Error processing signal:", err);
      onError(err);
    }
  };

  // Clean up method
  const close = () => {
    console.log("Closing peer connection");
    pc.close();
  };

  // Start the connection process if we're the initiator
  start();

  // Return interface for controlling the connection
  return {
    processSignal,
    close,
  };
};

const CallContext = createContext();

export const useCallContext = () => useContext(CallContext);

export default function CallProvider({ children }) {
  const { socketConnection } = useGlobalContext();
  const user = useSelector((state) => state.user);

  const [callState, setCallState] = useState({
    isReceivingCall: false,
    isCalling: false,
    isCallAccepted: false,
    isVideoCall: false,
    callerId: null,
    callerName: "",
    callerImage: "",
    receiverId: null,
    receiverName: "",
    receiverImage: "",
    messageId: null,
    callStartTime: null,
    callDuration: 0,
    signal: null,
  });

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  const peerConnectionRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callTimerRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  // Set up socket event listeners
  useEffect(() => {
    if (!socketConnection) return;

    socketConnection.on("incoming-call", ({ callerId, callerName, callerImage, isVideoCall, signal, messageId }) => {
      console.log("Received incoming call", { callerId, isVideoCall });
      setCallState({
        isReceivingCall: true,
        isVideoCall,
        callerId,
        callerName,
        callerImage,
        messageId,
        signal,
      });
    });

    socketConnection.on("call-accepted", ({ signal }) => {
      console.log("Call accepted with signal", signal);
      setCallState((prev) => ({
        ...prev,
        isCallAccepted: true,
        callStartTime: new Date(),
      }));

      startCallTimer();

      if (peerConnectionRef.current) {
        peerConnectionRef.current.processSignal(signal);
      }
    });

    socketConnection.on("call-rejected", ({ reason }) => {
      console.log("Call rejected:", reason);
      toast.info(reason || "Cuộc gọi đã bị từ chối");
      endCall();
    });

    socketConnection.on("call-ended", ({ duration }) => {
      toast.info(`Cuộc gọi đã kết thúc (${formatDuration(duration)})`);
      endCall();
    });

    socketConnection.on("ice-candidate", ({ candidate }) => {
      console.log("Received ICE candidate", candidate);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.processSignal({ candidate });
      } else {
        pendingCandidatesRef.current.push(candidate);
      }
    });

    socketConnection.on("call-failed", ({ message }) => {
      toast.error(message || "Không thể kết nối cuộc gọi");
      endCall();
    });

    socketConnection.on("call-terminated", () => {
      console.log("Call terminated by the other party");

      // Immediately clean up local resources
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      // Reset UI state with a terminated status message
      setLocalStream(null);
      setRemoteStream(null);
      setCallState({
        isReceivingCall: false,
        isCalling: false,
        isCallAccepted: false,
        isVideoCall: false,
        callerId: null,
        callerName: "",
        callerImage: "",
        receiverId: null,
        receiverName: "",
        receiverImage: "",
        signal: null,
        messageId: null,
        callStartTime: null,
        callDuration: 0,
      });

      // Clear the timer
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }

      toast.info("Cuộc gọi đã kết thúc");
    });

    navigator.mediaDevices.addEventListener("devicechange", () => {
      console.log("Media devices changed");
      if (localStream) {
        const kind = callState.isVideoCall ? "videoinput" : "audioinput";
        navigator.mediaDevices.enumerateDevices().then((devices) => {
          const hasCorrectDevices = devices.some((device) => device.kind === kind);
          if (!hasCorrectDevices) {
            toast.warning("Thiết bị âm thanh/hình ảnh đã bị thay đổi hoặc ngắt kết nối");
          }
        });
      }
    });

    return () => {
      socketConnection.off("incoming-call");
      socketConnection.off("call-accepted");
      socketConnection.off("call-rejected");
      socketConnection.off("call-ended");
      socketConnection.off("ice-candidate");
      socketConnection.off("call-failed");
      socketConnection.off("call-terminated");
      navigator.mediaDevices.removeEventListener("devicechange", () => {});
    };
  }, [socketConnection, callState]);

  const startCallTimer = () => {
    console.log("Starting call timer");

    // First clear any existing timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    // Store the start time as a timestamp for easier duration calculation
    const startTimestamp = Date.now();

    // Update the call state with the timestamp
    setCallState((prev) => ({
      ...prev,
      callStartTime: startTimestamp,
      callDuration: 0,
    }));

    // Set up the interval to update every second
    callTimerRef.current = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startTimestamp) / 1000);
      console.log("Timer tick:", elapsedSeconds);
      setCallState((prev) => ({
        ...prev,
        callDuration: elapsedSeconds,
      }));
    }, 1000);

    console.log("Timer started with ID:", callTimerRef.current);
  };

  const formatDuration = (seconds) => {
    // Add safety checks for NaN or undefined
    if (seconds === undefined || seconds === null || isNaN(seconds)) {
      return "00:00";
    }

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60); // Ensure we have an integer
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const cleanupStreams = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop();
      });
      setLocalStream(null);
    }
    setRemoteStream(null);
  };

  const processPendingCandidates = () => {
    if (peerConnectionRef.current && pendingCandidatesRef.current.length > 0) {
      console.log("Processing pending ICE candidates:", pendingCandidatesRef.current.length);
      pendingCandidatesRef.current.forEach((candidate) => {
        peerConnectionRef.current.processSignal({ candidate });
      });
      pendingCandidatesRef.current = [];
    }
  };

  const callUser = async (receiverId, receiverName, receiverImage, isVideoCall) => {
    try {
      // Cleanup any existing call
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      }

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      // Get user media with appropriate constraints
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: isVideoCall
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user",
            }
          : false,
      };

      console.log(`Getting user media for ${isVideoCall ? "video" : "audio"} call`);

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Log track info for debugging
      stream.getTracks().forEach((track) => {
        console.log(`Track of kind ${track.kind}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
      });

      // Save stream and attach to video element
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        try {
          await localVideoRef.current.play();
          console.log("Local video playing");
        } catch (err) {
          console.error("Error playing local video:", err);
        }
      }

      // Update call state
      setCallState({
        isCalling: true,
        isVideoCall,
        receiverId,
        receiverName,
        receiverImage,
      });

      const peerConnection = createPeerConnection({
        initiator: true,
        stream,
        isVideoCall,
        onSignal: (signal) => {
          console.log("Local signal generated:", signal.type || "ICE candidate");

          if (signal.type) {
            socketConnection.emit("call-user", {
              callerId: user._id,
              receiverId: receiverId,
              callerName: user.name,
              callerImage: user.profilePic,
              isVideoCall,
              signal,
            });
          } else if (signal.candidate) {
            socketConnection.emit("ice-candidate", {
              userId: receiverId,
              candidate: signal.candidate,
            });
          }
        },
        onStream: (remoteMediaStream) => {
          console.log("Received remote stream");
          remoteMediaStream.getAudioTracks().forEach((track) => {
            track.enabled = true;
            console.log("Remote audio track enabled:", track.enabled);
          });

          setRemoteStream(remoteMediaStream);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteMediaStream;
            remoteVideoRef.current.play().catch((e) => console.log("Video play error:", e));
          }
        },
        onError: (err) => {
          console.error("Peer connection error:", err);
          toast.error("Có lỗi kết nối WebRTC: " + err.message);
          endCall();
        },
        onClose: () => {
          console.log("Peer connection closed");
        },
      });

      peerConnectionRef.current = peerConnection;
      processPendingCandidates();
    } catch (error) {
      console.error("Error in callUser:", error);
      toast.error(error.message || "Không thể kết nối cuộc gọi");
    }
  };

  const answerCall = async () => {
    try {
      // Cleanup any existing call
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      }

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      // Get user media with appropriate constraints
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: callState.isVideoCall
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user",
            }
          : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Log track info for debugging
      stream.getTracks().forEach((track) => {
        console.log(`Track of kind ${track.kind}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
      });

      // Save stream and attach to video element
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        try {
          await localVideoRef.current.play();
          console.log("Local video playing");
        } catch (err) {
          console.error("Error playing local video:", err);
        }
      }

      // For audio-only calls, make sure audio tracks are enabled
      if (!callState.isVideoCall) {
        console.log("Setting up audio-only call");
        stream.getAudioTracks().forEach((track) => {
          track.enabled = true;
          console.log("Audio track enabled:", track.enabled, "readyState:", track.readyState);
        });
      }

      const peerConnection = createPeerConnection({
        initiator: false,
        stream,
        isVideoCall: callState.isVideoCall,
        onSignal: (signal) => {
          console.log("Answer signal generated:", signal.type || "ICE candidate");

          if (signal.type) {
            socketConnection.emit("answer-call", {
              callerId: callState.callerId,
              signal,
              messageId: callState.messageId,
            });
          } else if (signal.candidate) {
            socketConnection.emit("ice-candidate", {
              userId: callState.callerId,
              candidate: signal.candidate,
            });
          }
        },
        onStream: (remoteMediaStream) => {
          console.log("Received remote stream in answering call");
          remoteMediaStream.getAudioTracks().forEach((track) => {
            track.enabled = true;
            console.log("Remote audio track enabled on answer:", track.enabled);
          });

          setRemoteStream(remoteMediaStream);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteMediaStream;
            remoteVideoRef.current.play().catch((e) => console.log("Video play error:", e));
          }
        },
        onError: (err) => {
          console.error("Peer connection error in answer:", err);
          toast.error("Có lỗi kết nối WebRTC");
          endCall();
        },
        onClose: () => {
          console.log("Peer connection closed in answer");
        },
      });

      peerConnectionRef.current = peerConnection;

      if (callState.signal) {
        console.log("Processing incoming signal:", callState.signal);
        peerConnection.processSignal(callState.signal);
      }

      processPendingCandidates();

      // Update call state with current timestamp for duration tracking
      const currentTime = Date.now();
      setCallState((prev) => ({
        ...prev,
        isReceivingCall: false,
        isCallAccepted: true,
        callStartTime: currentTime,
        callDuration: 0,
      }));

      // Start call timer
      startCallTimer();
    } catch (error) {
      console.error("Error in answerCall:", error);
      toast.error(error.message || "Không thể kết nối cuộc gọi");
      rejectCall("Không thể kết nối camera hoặc microphone");
    }
  };

  const rejectCall = (reason = "Người nhận đã từ chối cuộc gọi") => {
    if (socketConnection && callState.callerId) {
      socketConnection.emit("reject-call", {
        callerId: callState.callerId,
        messageId: callState.messageId,
        reason,
      });
    }

    resetCallState();
  };

  const endCall = () => {
    console.log("Ending call with state:", callState);

    // Notify other user that call has ended
    if (socketConnection) {
      // Determine the partner ID - it could be either callerId or receiverId depending on who initiated the call
      const partnerId = callState.isCalling ? callState.receiverId : callState.callerId;

      if (partnerId) {
        console.log("Sending end-call event to:", partnerId);

        socketConnection.emit("end-call", {
          userId: user._id,
          partnerId,
          messageId: callState.messageId,
          duration: callState.callDuration,
        });

        // After ending call, manually trigger a message update by re-joining the room
        setTimeout(() => {
          if (partnerId) socketConnection.emit("joinRoom", partnerId);
        }, 800);
      }
    }

    // Clean up streams
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Reset state
    setLocalStream(null);
    setRemoteStream(null);
    setCallState({
      isReceivingCall: false,
      isCalling: false,
      isCallAccepted: false,
      isVideoCall: false,
      callerId: null,
      callerName: "",
      callerImage: "",
      receiverId: null,
      receiverName: "",
      receiverImage: "",
      signal: null,
      messageId: null,
      callStartTime: null,
      callDuration: 0,
    });

    // Clear the timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);

    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = isSpeakerOn;
    }

    const audioElements = document.querySelectorAll("audio");
    audioElements.forEach((audio) => {
      audio.muted = isSpeakerOn;
    });

    toast.info(isSpeakerOn ? "Đã tắt loa" : "Đã bật loa");
  };

  const resetCallState = () => {
    setCallState({
      isReceivingCall: false,
      isCalling: false,
      isCallAccepted: false,
      isVideoCall: false,
      callerId: null,
      callerName: "",
      callerImage: "",
      receiverId: null,
      receiverName: "",
      receiverImage: "",
      messageId: null,
      callStartTime: null,
      callDuration: 0,
      signal: null,
    });
  };

  useEffect(() => {
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }

      cleanupStreams();
    };
  }, []);

  const contextValue = {
    callState,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    isSpeakerOn,
    localVideoRef,
    remoteVideoRef,
    callUser,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    formatDuration,
  };

  return <CallContext.Provider value={contextValue}>{children}</CallContext.Provider>;
}
