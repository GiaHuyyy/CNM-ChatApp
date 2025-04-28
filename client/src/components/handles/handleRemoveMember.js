import { toast } from "sonner";

export default function handleRemoveMember ({ socketConnection, setConfirmModal, params, user, dataUser, memberId, memberName }) {
    if (!socketConnection || !dataUser.isGroup) return;

    if (user._id !== dataUser.groupAdmin?._id) {
      toast.error("Chỉ quản trị viên mới có thể xóa thành viên");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Xóa thành viên khỏi nhóm",
      message: `Bạn có chắc chắn muốn xóa ${memberName} khỏi nhóm?`,
      action: () => {
        const cleanAdminId = typeof user._id === "object" ? user._id.toString() : user._id;
        const cleanMemberId = typeof memberId === "object" ? memberId.toString() : memberId;

        socketConnection.emit("removeMemberFromGroup", {
          groupId: params.userId,
          memberId: cleanMemberId,
          adminId: cleanAdminId,
        });

        socketConnection.once("memberRemovedFromGroup", (response) => {
          if (response.success) {
            toast.success(response.message);
          } else {
            toast.error(response.message);
          }
        });
      },
    });
  };