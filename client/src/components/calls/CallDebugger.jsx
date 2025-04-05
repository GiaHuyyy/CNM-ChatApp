import { useState, useEffect } from "react";
import { useCallContext } from "../../context/CallProvider";

export default function CallDebugger() {
  const { callState, localStream, remoteStream } = useCallContext();
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState({
    localTracks: [],
    remoteTracks: [],
    callInfo: {},
  });

  useEffect(() => {
    if (!isOpen) return;

    const updateStats = () => {
      // Get local stream info
      const localTracks = localStream
        ? localStream.getTracks().map((track) => ({
            kind: track.kind,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
            id: track.id.slice(0, 8) + "...",
          }))
        : [];

      // Get remote stream info
      const remoteTracks = remoteStream
        ? remoteStream.getTracks().map((track) => ({
            kind: track.kind,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
            id: track.id.slice(0, 8) + "...",
          }))
        : [];

      // Get call state info
      const callInfo = {
        isCalling: callState.isCalling,
        isReceivingCall: callState.isReceivingCall,
        isCallAccepted: callState.isCallAccepted,
        isVideoCall: callState.isVideoCall,
        callDuration: callState.callDuration,
        callStartTime: callState.callStartTime,
      };

      setStats({
        localTracks,
        remoteTracks,
        callInfo,
      });
    };

    updateStats();
    const interval = setInterval(updateStats, 1000);

    return () => clearInterval(interval);
  }, [isOpen, localStream, remoteStream, callState]);

  if (!callState.isCalling && !callState.isCallAccepted && !callState.isReceivingCall) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-md bg-gray-800 px-3 py-1 text-xs text-white opacity-50 hover:opacity-100"
      >
        {isOpen ? "Hide Debug" : "Debug Call"}
      </button>

      {isOpen && (
        <div className="mt-2 w-80 rounded-md bg-black bg-opacity-70 p-3 text-xs text-white">
          <h3 className="mb-2 font-bold">Call Debug Info</h3>

          <div className="mb-2">
            <h4 className="font-semibold">Call State:</h4>
            <pre className="mt-1 overflow-x-auto text-xs">{JSON.stringify(stats.callInfo, null, 2)}</pre>
          </div>

          <div className="mb-2">
            <h4 className="font-semibold">Local Tracks ({stats.localTracks.length}):</h4>
            {stats.localTracks.map((track, i) => (
              <div key={i} className="mt-1">
                <span className={`mr-1 ${track.enabled ? "text-green-400" : "text-red-400"}`}>{track.kind}</span>
                <span className="opacity-70">
                  {track.enabled ? "enabled" : "disabled"}, {track.readyState}
                </span>
              </div>
            ))}
          </div>

          <div>
            <h4 className="font-semibold">Remote Tracks ({stats.remoteTracks.length}):</h4>
            {stats.remoteTracks.map((track, i) => (
              <div key={i} className="mt-1">
                <span className={`mr-1 ${track.enabled ? "text-green-400" : "text-red-400"}`}>{track.kind}</span>
                <span className="opacity-70">
                  {track.enabled ? "enabled" : "disabled"}, {track.readyState}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
