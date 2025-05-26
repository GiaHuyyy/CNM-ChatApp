import { toast } from "sonner";

export default function handleToggleMute({
  socketConnection,
  setConfirmModal,
  params,
  user,
  dataUser,
  memberId,
  memberName,
  isMuted,
}) {
  if (!socketConnection || !dataUser.isGroup) return;

  // Check if user is either admin or deputy admin
  const isAdmin = user._id === dataUser.groupAdmin?._id;
  const isDeputyAdmin =
    Array.isArray(dataUser.deputyAdmins) &&
    dataUser.deputyAdmins.some((id) => {
      const deputyId = typeof id === "object" ? (id._id ? id._id.toString() : id.toString()) : id.toString();
      return deputyId === user._id.toString();
    });

  // Check if target member is a deputy admin
  const isTargetDeputy =
    Array.isArray(dataUser.deputyAdmins) &&
    dataUser.deputyAdmins.some((id) => {
      const deputyId = typeof id === "object" ? (id._id ? id._id.toString() : id.toString()) : id.toString();
      return deputyId === memberId.toString();
    });

  // Only admin can mute deputy, and only admin/deputy can mute regular members
  if (!isAdmin && !isDeputyAdmin) {
    toast.error("Bạn không có quyền thực hiện hành động này");
    return;
  }

  // Deputy admins cannot mute other deputies or the admin
  if (isDeputyAdmin && !isAdmin && (isTargetDeputy || memberId === dataUser.groupAdmin?._id)) {
    toast.error("Phó nhóm không thể tắt quyền chat của admin hoặc phó nhóm khác");
    return;
  }

  // Don't allow muting the group admin
  if (memberId === dataUser.groupAdmin?._id) {
    toast.error("Không thể tắt quyền chat của quản trị viên nhóm");
    return;
  }

  setConfirmModal({
    isOpen: true,
    title: isMuted ? "Bỏ tắt quyền chat thành viên" : "Tắt quyền chat thành viên",
    message: isMuted
      ? `Bạn có chắc chắn muốn cho phép ${memberName} nhắn tin trong nhóm?`
      : `Bạn có chắc chắn muốn tắt quyền nhắn tin của ${memberName}?`,
    action: () => {
      const cleanAdminId = typeof user._id === "object" ? user._id.toString() : user._id;
      const cleanMemberId = typeof memberId === "object" ? memberId.toString() : memberId;

      socketConnection.emit("toggleMuteMember", {
        groupId: params.userId,
        memberId: cleanMemberId,
        adminId: cleanAdminId,
        isMuting: !isMuted,
      });

      socketConnection.once("memberMuteToggled", (response) => {
        if (response.success) {
          toast.success(response.message);
        } else {
          toast.error(response.message);
        }
      });
    },
  });
}
