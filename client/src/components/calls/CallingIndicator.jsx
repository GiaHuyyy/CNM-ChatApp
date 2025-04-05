import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPhoneSlash } from "@fortawesome/free-solid-svg-icons";
import { useCallContext } from "../../context/CallProvider";

export default function CallingIndicator() {
  const { callState, endCall } = useCallContext();

  // Only show when calling and not yet accepted
  if (!callState.isCalling || callState.isCallAccepted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="w-80 rounded-lg bg-white p-6 text-center shadow-xl">
        <div className="mb-4 text-xl font-bold">Đang gọi...</div>

        <div className="mb-6 flex flex-col items-center">
          <img
            src={callState.receiverImage}
            alt={callState.receiverName}
            className="mb-2 h-20 w-20 rounded-full object-cover"
          />
          <div className="text-lg font-semibold">{callState.receiverName}</div>
          <div className="text-sm text-gray-500">{callState.isVideoCall ? "Cuộc gọi video" : "Cuộc gọi thoại"}</div>

          <div className="mt-2 flex justify-center space-x-2">
            <div className="h-3 w-3 animate-bounce rounded-full bg-blue-500"></div>
            <div className="h-3 w-3 animate-bounce rounded-full bg-blue-500" style={{ animationDelay: "0.2s" }}></div>
            <div className="h-3 w-3 animate-bounce rounded-full bg-blue-500" style={{ animationDelay: "0.4s" }}></div>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={endCall}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600"
            title="Hủy cuộc gọi"
          >
            <FontAwesomeIcon icon={faPhoneSlash} size="lg" />
          </button>
        </div>
      </div>
    </div>
  );
}
