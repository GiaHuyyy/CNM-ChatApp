import { toast } from "sonner";

export default function handleVideoCall({ callUser, dataUser, params }) {
  if (dataUser?.isGroup) {
    toast.error("Không thể gọi video cho nhóm chat");
    return;
  }

  if (!callUser) {
    toast.error("Chức năng gọi video đang không khả dụng");
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    toast.error("Trình duyệt của bạn không hỗ trợ cuộc gọi video");
    return;
  }

  if (!dataUser.online) {
    toast.error("Người dùng hiện không trực tuyến, không thể gọi video");
    return;
  }

  navigator.mediaDevices
    .getUserMedia({ audio: true, video: true })
    .then((stream) => {
      stream.getTracks().forEach((track) => track.stop());
      callUser(params.userId, dataUser.name, dataUser.profilePic, true);
    })
    .catch((err) => {
      console.error("Permission check failed:", err);
      if (err.name === "NotAllowedError") {
        toast.error("Vui lòng cấp quyền truy cập camera và microphone để thực hiện cuộc gọi video");
      } else {
        toast.error("Không thể truy cập camera hoặc microphone");
      }
    });
}
