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

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { useGlobalContext } from "./GlobalProvider";

// Create a better WebRTC wrapper to fix audio issues
const createPeerConnection = (config) => {
  const { initiator, stream, onSignal, onStream, onError, onClose, isVideoCall } = config;

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
      console.log("Processing signal:", JSON.stringify(signal, null, 2));

      // Handle simulated SDPs from mobile clients
      if (signal.sdp === 'simulated-sdp-offer' || signal.sdp === 'simulated-sdp-answer' ||
        signal.sdp?.includes('simulated-sdp')) {
        console.log("Received simulated SDP from mobile client, creating compatible format");

        // Generate valid ICE parameters that meet WebRTC requirements
        const iceUfrag = generateRandomString(8); // At least 4 chars
        const icePwd = generateRandomString(32);  // At least 22 chars
        const fingerprint = generateFingerprint();

        // Create a minimal valid SDP for WebRTC with proper ICE parameters and MAINTAINING ORDER
        // The critical fix: we need to ensure the order of m-lines matches exactly what was in the offer
        // For offers and answers, audio MUST come before video
        let validSdp = `v=0\r\n` +
          `o=- ${Date.now()} 2 IN IP4 127.0.0.1\r\n` +
          `s=-\r\n` +
          `t=0 0\r\n` +
          `a=group:BUNDLE audio${isVideoCall ? ' video' : ''}\r\n` +
          `a=msid-semantic: WMS\r\n`;

        // Always include audio first
        validSdp += `m=audio 9 UDP/TLS/RTP/SAVPF 111\r\n` +
          `c=IN IP4 0.0.0.0\r\n` +
          `a=rtcp:9 IN IP4 0.0.0.0\r\n` +
          `a=ice-ufrag:${iceUfrag}\r\n` +
          `a=ice-pwd:${icePwd}\r\n` +
          `a=fingerprint:sha-256 ${fingerprint}\r\n` +
          `a=setup:${signal.type === 'offer' ? 'actpass' : 'active'}\r\n` +
          `a=mid:audio\r\n` +
          `a=rtcp-mux\r\n` + // Add rtcp-mux attribute - critical fix
          `a=sendrecv\r\n` +
          `a=rtpmap:111 opus/48000/2\r\n` +
          `a=rtcp-fb:111 transport-cc\r\n` +
          `a=fmtp:111 minptime=10;useinbandfec=1\r\n`;

        // Add video section only for video calls and only after audio
        if (isVideoCall) {
          validSdp += `m=video 9 UDP/TLS/RTP/SAVPF 96\r\n` +
            `c=IN IP4 0.0.0.0\r\n` +
            `a=rtcp:9 IN IP4 0.0.0.0\r\n` +
            `a=ice-ufrag:${iceUfrag}\r\n` +
            `a=ice-pwd:${icePwd}\r\n` +
            `a=fingerprint:sha-256 ${fingerprint}\r\n` +
            `a=setup:${signal.type === 'offer' ? 'actpass' : 'active'}\r\n` +
            `a=mid:video\r\n` +
            `a=rtcp-mux\r\n` + // Add rtcp-mux attribute - critical fix
            `a=sendrecv\r\n` +
            `a=rtpmap:96 H264/90000\r\n` +
            `a=rtcp-fb:96 nack\r\n` +
            `a=rtcp-fb:96 nack pli\r\n`;
        }

        // Replace the simulated SDP with our valid one
        signal.sdp = validSdp;

        console.log("Created valid SDP replacement with correct m-line order:", {
          type: signal.type,
          hasAudio: true,
          hasVideo: isVideoCall,
          hasRtcpMux: true, // Log that rtcp-mux is included
          ufrag: iceUfrag.substring(0, 4) + '...',
          pwdLength: icePwd.length
        });
      } else if (signal.sdp) {
        // For real SDP (not simulated), ensure rtcp-mux is present
        if (!signal.sdp.includes('a=rtcp-mux')) {
          console.warn("Received SDP without rtcp-mux, adding it");

          // Add rtcp-mux to each media section if missing
          let modifiedSdp = signal.sdp;
          const mediaMatches = modifiedSdp.match(/m=[^\r\n]+\r\n/g) || [];

          for (const mediaLine of mediaMatches) {
            const mediaSection = mediaLine.trim();
            const mediaType = mediaSection.split(' ')[0].substring(2); // Extract "audio" or "video"

            // Find the end of this media section
            const mediaStartIndex = modifiedSdp.indexOf(mediaSection);
            if (mediaStartIndex !== -1) {
              // Find if rtcp-mux is already present in this media section
              const nextMediaIndex = modifiedSdp.indexOf('m=', mediaStartIndex + mediaSection.length);
              const endIndex = nextMediaIndex !== -1 ? nextMediaIndex : modifiedSdp.length;
              const mediaBlock = modifiedSdp.substring(mediaStartIndex, endIndex);

              if (!mediaBlock.includes('a=rtcp-mux')) {
                // Insert rtcp-mux after the mid attribute
                const midIndex = modifiedSdp.indexOf('a=mid:', mediaStartIndex);
                if (midIndex !== -1 && midIndex < endIndex) {
                  const midEndIndex = modifiedSdp.indexOf('\r\n', midIndex) + 2;
                  modifiedSdp =
                    modifiedSdp.substring(0, midEndIndex) +
                    'a=rtcp-mux\r\n' +
                    modifiedSdp.substring(midEndIndex);
                }
              }
            }
          }

          signal.sdp = modifiedSdp;
          console.log("Added rtcp-mux to SDP");
        }
      }

      if (signal.type === "offer") {
        console.log("Received offer, setting remote description");
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          console.log("Remote description set successfully (offer)");
          console.log("Creating answer");

          const answer = await pc.createAnswer();

          // Modify SDP to ensure audio works
          let modifiedSdp = answer.sdp;
          modifiedSdp = modifiedSdp.replace(/(a=mid:audio\r\n)/, "$1a=setup:active\r\n");

          // Ensure rtcp-mux is present in our answer
          if (!modifiedSdp.includes('a=rtcp-mux')) {
            modifiedSdp = modifiedSdp.replace(/(a=mid:(audio|video)\r\n)/g, "$1a=rtcp-mux\r\n");
          }

          answer.sdp = modifiedSdp;

          await pc.setLocalDescription(answer);
          console.log("Local description set (answer)");
          onSignal(pc.localDescription);
        } catch (err) {
          console.error("Error setting remote offer:", err);

          // Special handling for rtcp-mux errors
          if (err.message && err.message.includes('rtcp-mux must be enabled')) {
            console.warn("rtcp-mux error detected, attempting to fix the SDP");

            // Create a modified offer with rtcp-mux
            let fixedOfferSdp = signal.sdp;
            if (!fixedOfferSdp.includes('a=rtcp-mux')) {
              fixedOfferSdp = fixedOfferSdp.replace(/(a=mid:(audio|video)\r\n)/g, "$1a=rtcp-mux\r\n");

              try {
                const fixedOffer = new RTCSessionDescription({
                  type: "offer",
                  sdp: fixedOfferSdp
                });

                await pc.setRemoteDescription(fixedOffer);
                const answer = await pc.createAnswer();

                // Ensure our answer also has rtcp-mux
                let modifiedSdp = answer.sdp;
                if (!modifiedSdp.includes('a=rtcp-mux')) {
                  modifiedSdp = modifiedSdp.replace(/(a=mid:(audio|video)\r\n)/g, "$1a=rtcp-mux\r\n");
                }

                answer.sdp = modifiedSdp;
                await pc.setLocalDescription(answer);
                onSignal(pc.localDescription);
                console.log("Recovery successful: fixed rtcp-mux issue");
                return;
              } catch (recoveryErr) {
                console.error("Recovery attempt failed:", recoveryErr);
              }
            }
          }

          throw err;
        }
      } else if (signal.type === "answer") {
        console.log("Received answer, setting remote description");
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          console.log("Remote description set successfully");
        } catch (err) {
          console.error("Failed to set remote description:", err);

          // Recovery attempt for m-line order issues
          if (err.message?.includes("order of m-lines") || err.name === "InvalidAccessError") {
            console.warn("Detected m-line order issue, attempting recovery...");

            // Create a compatible answer by cloning our local description and modifying SDP
            const localDesc = pc.localDescription;
            if (localDesc && localDesc.sdp) {
              // Extract media sections from local description to ensure same order
              const mediaPattern = /m=(?:audio|video).*?(?=m=|$)/gs;
              const localMedia = localDesc.sdp.match(mediaPattern) || [];

              if (localMedia.length > 0) {
                console.log("Creating compatible answer based on our offer structure");

                // Create basic SDP with session-level attributes
                const sessionPattern = /(v=.*?)m=/s;
                const sessionMatch = localDesc.sdp.match(sessionPattern);
                const sessionPart = sessionMatch ? sessionMatch[1] : "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n";

                // Reuse the local media sections but change attributes as needed
                let fixedSdp = sessionPart;

                // Add media sections in the same order as the local description
                localMedia.forEach(section => {
                  // Modify setup attribute for answer
                  fixedSdp += section.replace(/a=setup:actpass/g, "a=setup:active");
                });

                // Create a fixed answer and apply it
                const fixedAnswer = new RTCSessionDescription({
                  type: "answer",
                  sdp: fixedSdp
                });

                try {
                  await pc.setRemoteDescription(fixedAnswer);
                  console.log("Recovery successful: set compatible remote description");
                  return; // Exit early on success
                } catch (recoveryErr) {
                  console.error("Recovery attempt failed:", recoveryErr);
                  // Continue to normal error handling
                }
              }
            }
          }

          // If we get here, we couldn't recover
          throw err;
        }
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
      console.error("Signal that caused error:", signal);

      // More descriptive error
      if (err.message?.includes("rtcp-mux must be enabled")) {
        console.error("SDP format issue: rtcp-mux is required when BUNDLE is enabled");
      } else if (err.message?.includes("order of m-lines")) {
        console.error("SDP format issue: The order of media lines in the SDP doesn't match between offer and answer");
      } else if (err.message?.includes("ICE pwd")) {
        console.error("ICE password length issue detected. Needs to be 22-256 characters.");
      }

      onError(err);
    }
  };

  // Helper function to generate random string of specific length
  function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    const randomValues = new Uint8Array(length);
    window.crypto.getRandomValues(randomValues);
    randomValues.forEach(val => result += chars[val % chars.length]);
    return result;
  }

  // Helper function to generate valid fingerprint
  function generateFingerprint() {
    // Generate 32 random bytes as hex pairs separated by colons
    const randomBytes = new Uint8Array(32);
    window.crypto.getRandomValues(randomBytes);
    return Array.from(randomBytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join(':');
  }

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

// Export the hook separately before the component
export const useCallContext = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCallContext must be used within a CallProvider");
  }
  return context;
};

// Export the provider as default
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

    socketConnection.on("reconnect", (attempt) => {
      console.log("Reconnected to server, attempt:", attempt);

      // Re-join the call room to recover from disconnection
      if (callState.callerId) {
        setTimeout(() => {
          socketConnection.emit("joinRoom", callState.callerId);
        }, 1000);
      }
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
      navigator.mediaDevices.removeEventListener("devicechange", () => { });
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
        isVideoCall, // Pass isVideoCall to createPeerConnection
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
        isVideoCall: callState.isVideoCall, // Pass isVideoCall to createPeerConnection
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
