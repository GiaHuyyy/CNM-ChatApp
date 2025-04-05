import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPhone, faVideo, faPhoneSlash } from "@fortawesome/free-solid-svg-icons";
import { useCallContext } from "../../context/CallProvider";
import { toast } from "sonner";

export default function IncomingCallDialog() {
  const { callState, answerCall, rejectCall } = useCallContext();

  if (!callState.isReceivingCall) return null;

  const handleAnswerCall = () => {
    try {
      // Check browser compatibility first
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Trình duyệt không hỗ trợ cuộc gọi video/audio");
        rejectCall("Thiết bị không hỗ trợ");
        return;
      }

      answerCall();
    } catch (error) {
      console.error("Error answering call:", error);
      toast.error("Không thể kết nối cuộc gọi");
      rejectCall("Lỗi khi kết nối");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="w-80 rounded-lg bg-white p-6 text-center shadow-xl">
        <div className="mb-4 text-xl font-bold">Cuộc gọi đến</div>

        <div className="mb-6 flex flex-col items-center">
          <img
            src={callState.callerImage}
            alt={callState.callerName}
            className="mb-2 h-20 w-20 rounded-full object-cover"
          />
          <div className="text-lg font-semibold">{callState.callerName}</div>
          <div className="text-sm text-gray-500">{callState.isVideoCall ? "Cuộc gọi video" : "Cuộc gọi thoại"}</div>
        </div>

        <div className="flex justify-center space-x-8">
          <button
            onClick={() => rejectCall()}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600"
            title="Từ chối"
          >
            <FontAwesomeIcon icon={faPhoneSlash} size="lg" />
          </button>

          <button
            onClick={handleAnswerCall}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white transition-colors hover:bg-green-600"
            title={callState.isVideoCall ? "Trả lời với video" : "Trả lời"}
          >
            <FontAwesomeIcon icon={callState.isVideoCall ? faVideo : faPhone} size="lg" />
          </button>
        </div>
      </div>
    </div>
  );
}
