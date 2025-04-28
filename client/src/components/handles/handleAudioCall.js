import { toast } from "sonner";

export default function handleAudioCall({ callUser, dataUser, params }) {
  if (dataUser?.isGroup) {
    toast.error("Không thể gọi điện cho nhóm chat");
    return;
  }
  console.log("dataUser", callUser);
  if (!callUser) {
    toast.error("Chức năng gọi điện đang không khả dụng");
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    toast.error("Trình duyệt của bạn không hỗ trợ cuộc gọi");
    return;
  }

  if (!dataUser.online) {
    toast.error("Người dùng hiện không trực tuyến, không thể gọi điện");
    return;
  }

  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      stream.getTracks().forEach((track) => track.stop());
      callUser(params.userId, dataUser.name, dataUser.profilePic, false);
    })
    .catch((err) => {
      console.error("Permission check failed:", err);
      if (err.name === "NotAllowedError") {
        toast.error("Vui lòng cấp quyền truy cập microphone để thực hiện cuộc gọi");
      } else {
        toast.error("Không thể truy cập thiết bị âm thanh");
      }
    });
}
