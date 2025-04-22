const { ConversationModel, MessageModel } = require("../../models/ConversationModel");
const UserModel = require("../../models/UserModel");
const getConversation = require("../../helpers/getConversation");

const conversationHandler = (io, socket, userId, onlineUser) => { // Add onlineUser parameter
  socket.on("joinRoom", async (targetUserId) => {
    try {
      if (targetUserId === "chat" || targetUserId === "") {
        console.log("Base chat route detected, skipping conversation lookup");
        socket.emit("message", {
          messages: [],
          _id: "welcome",
          isWelcome: true,
        });
        return;
      }

      let cleanTargetId = targetUserId;

      if (typeof targetUserId === "string" && targetUserId.includes("chat/")) {
        cleanTargetId = targetUserId.split("chat/")[1];
        console.log("Extracted ID from path:", cleanTargetId);
      }

      if (!cleanTargetId || typeof cleanTargetId !== "string" || cleanTargetId.length !== 24) {
        console.error("Invalid conversation ID format:", cleanTargetId);
        socket.emit("error", {
          message: "Invalid conversation ID format",
          invalidId: cleanTargetId,
        });
        return;
      }

      const isGroupChat = await ConversationModel.exists({
        _id: cleanTargetId,
        isGroup: true,
        members: userId,
      });

      if (isGroupChat) {
        const groupConversation = await ConversationModel.findById(cleanTargetId)
          .populate("messages")
          .populate("members")
          .populate("groupAdmin");

        await Promise.all(
          (groupConversation?.messages || []).map(async (messageId) => {
            await MessageModel.updateOne(
              {
                _id: messageId,
                msgByUserId: { $ne: userId },
                seenBy: { $ne: userId },
              },
              { $addToSet: { seenBy: userId } }
            );
          })
        );

        socket.emit("groupMessage", groupConversation);

        if (groupConversation && Array.isArray(groupConversation.members)) {
          for (const member of groupConversation.members) {
            const memberId = member._id ? member._id.toString() : member.toString();
            const memberConversations = await getConversation(memberId);
            io.to(memberId).emit("conversation", memberConversations);
          }
        }
        return;
      }

      const userDetail = await UserModel.findById(cleanTargetId).select("-password");

      if (!userDetail) {
        console.log("User not found:", cleanTargetId);
        return;
      }

      const payload = {
        _id: userDetail?._id,
        name: userDetail?.name,
        phone: userDetail?.phone,
        profilePic: userDetail?.profilePic,
        online: onlineUser.has(cleanTargetId),
      };

      socket.emit("messageUser", payload);

      const conversation = await ConversationModel.findOne({
        $or: [
          { sender: userId, receiver: cleanTargetId },
          { sender: cleanTargetId, receiver: userId },
        ],
      })
        .populate("messages")
        .sort({ createdAt: -1 });

      if (conversation) {
        await MessageModel.updateMany(
          {
            _id: { $in: conversation.messages },
            msgByUserId: cleanTargetId,
            seen: false,
          },
          { $set: { seen: true } }
        );

        socket.emit("message", conversation);

        const conversationSender = await getConversation(userId.toString());
        const conversationReceiver = await getConversation(cleanTargetId);

        io.to(userId.toString()).emit("conversation", conversationSender);
        io.to(cleanTargetId).emit("conversation", conversationReceiver);
      } else {
        socket.emit("message", { messages: [] });
      }
    } catch (error) {
      console.error("Error in joinRoom event:", error);
      socket.emit("error", { message: "Failed to join conversation" });
    }
  });

  // Delete conversation
  socket.on("deleteConversation", async (conversationId) => {
    try {
      const conversation = await ConversationModel.findById(conversationId);
      
      if (!conversation) {
        socket.emit("error", { message: "Cuộc trò chuyện không tồn tại" });
        return;
      }

      // Delete all messages in the conversation
      await MessageModel.deleteMany({ _id: { $in: conversation.messages } });

      // Delete the conversation itself
      await ConversationModel.findByIdAndDelete(conversationId);

      // Update sidebar for involved users
      if (conversation.isGroup) {
        for (const memberId of conversation.members) {
          const memberConversations = await getConversation(memberId.toString());
          io.to(memberId.toString()).emit("conversation", memberConversations);
        }
      } else {
        const senderConversations = await getConversation(conversation.sender.toString());
        const receiverConversations = await getConversation(conversation.receiver.toString());

        io.to(conversation.sender.toString()).emit("conversation", senderConversations);
        io.to(conversation.receiver.toString()).emit("conversation", receiverConversations);
      }

      socket.emit("conversationDeleted", { success: true });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      socket.emit("error", { message: "Có lỗi xảy ra khi xóa cuộc trò chuyện" });
    }
  });
};

module.exports = conversationHandler;


