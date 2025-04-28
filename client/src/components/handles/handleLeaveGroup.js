import { toast } from "sonner";

export default function handleLeaveGroup({ socketConnection, setConfirmModal, params, user, dataUser, navigate }) {
  if (!socketConnection || !dataUser.isGroup) return;

  setConfirmModal({
    isOpen: true,
    title: "Rời nhóm chat",
    message: "Bạn có chắc chắn muốn rời khỏi nhóm này?",
    action: () => {
      let cleanUserId;

      if (typeof user._id === "object" && user._id !== null) {
        cleanUserId = user._id.toString();
      } else if (typeof user._id === "string") {
        cleanUserId = user._id;
      } else {
        cleanUserId = user._id;
        console.warn("Unexpected user ID format:", user._id);
      }

      socketConnection.emit("leaveGroup", {
        groupId: params.userId,
        userId: cleanUserId,
      });

      socketConnection.once("leftGroup", (response) => {
        if (response.success) {
          toast.success(response.message);
          navigate("/chat");
        } else {
          toast.error(response.message);
        }
      });
    },
  });
}
