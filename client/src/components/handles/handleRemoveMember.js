import { toast } from "sonner";

export default function handleRemoveMember({
  socketConnection,
  setConfirmModal,
  params,
  user,
  dataUser,
  memberId,
  memberName,
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

  // Only admin can remove deputy, and only admin/deputy can remove regular members
  if (!isAdmin && !isDeputyAdmin) {
    toast.error("Bạn không có quyền xóa thành viên");
    return;
  }

  // Deputy admins cannot remove other deputies or the admin
  if (isDeputyAdmin && !isAdmin && (isTargetDeputy || memberId === dataUser.groupAdmin?._id)) {
    toast.error("Phó nhóm không thể xóa admin hoặc phó nhóm khác");
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
}
