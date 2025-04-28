import { toast } from "sonner";

export default function handleDeleteConversation ({socketConnection, setConfirmModal, params, user, dataUser, navigate}) {
    if (!socketConnection) return;

    setConfirmModal({
      isOpen: true,
      title: dataUser.isGroup ? "Xóa nhóm chat" : "Xóa lịch sử trò chuyện",
      message: dataUser.isGroup
        ? "Bạn có chắc chắn muốn xóa nhóm chat này? Thao tác này không thể hoàn tác."
        : "Bạn có chắc chắn muốn xóa lịch sử trò chuyện này? Thao tác này không thể hoàn tác.",
      action: () => {
        // Get clean IDs
        const cleanUserId = typeof user._id === "object" ? user._id.toString() : user._id;
        const cleanConversationId = params.userId;
        // Send delete request
        socketConnection.emit("deleteConversation", {
          conversationId: cleanConversationId,
          userId: cleanUserId,
        });

        // Set up one-time handler for response
        socketConnection.once("conversationDeleted", (response) => {
          if (response.success) {
            // Force refresh sidebar
            socketConnection.emit("sidebar", cleanUserId);

            toast.success("Cuộc trò chuyện đã được xóa thành công");

            // Navigate away first
            navigate("/chat", { replace: true });
          } else {
            toast.error("Không thể xóa cuộc trò chuyện");
          }
        });
      },
    });
  };