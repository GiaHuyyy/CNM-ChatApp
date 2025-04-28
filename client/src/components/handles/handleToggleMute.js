import { toast } from "sonner";

export default  function handleToggleMute ({ socketConnection, setConfirmModal, params, user, dataUser, memberId, memberName, isMuted }) {
    if (!socketConnection || !dataUser.isGroup) return;

    setConfirmModal({
      isOpen: true,
      title: isMuted ? "Bỏ tắt quyền chat" : "Tắt quyền chat",
      message: isMuted
        ? `Bạn có chắc chắn muốn mở lại quyền nhắn tin cho ${memberName}?`
        : `Bạn có chắc chắn muốn tắt quyền nhắn tin của ${memberName}?`,
      action: () => {
        const cleanAdminId = typeof user._id === "object" ? user._id.toString() : user._id;
        const cleanMemberId = typeof memberId === "object" ? memberId.toString() : memberId;

        socketConnection.emit(isMuted ? "unmuteMember" : "muteMember", {
          groupId: params.userId,
          memberId: cleanMemberId,
          adminId: cleanAdminId,
        });

        socketConnection.once("memberMuteToggled", (response) => {
          if (response.success) {
            toast.success(response.message);

            socketConnection.emit("joinRoom", params.userId);
          } else {
            toast.error(response.message);
          }
        });
      },
    });
  };