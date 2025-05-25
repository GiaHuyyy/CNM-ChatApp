const { ConversationModel, MessageModel } = require("../../models/ConversationModel");
const UserModel = require("../../models/UserModel");
const getConversation = require("../../helpers/getConversation");

const conversationHandler = (io, socket, userId, onlineUser) => {
  // Add onlineUser parameter
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
  socket.on("deleteConversation", async (data) => {
    try {
      // Extract conversation ID from data
      let conversationId = typeof data === "object" ? data.conversationId : data;
      let requestingUserId = typeof data === "object" ? data.userId : userId;

      if (!conversationId) {
        socket.emit("error", { message: "Missing conversation ID" });
        return;
      }

      // For one-on-one chats: find conversation between users
      // For group chats: find conversation directly by ID
      const mongoose = require("mongoose");

      // Try to find a group chat first
      let conversation = await ConversationModel.findOne({
        _id: conversationId,
        isGroup: true,
      });

      if (!conversation) {
        // Not a group - look for one-on-one conversation
        conversation = await ConversationModel.findOne({
          $or: [
            { sender: requestingUserId, receiver: conversationId },
            { sender: conversationId, receiver: requestingUserId },
          ],
          isGroup: false,
        });
      }

      if (!conversation) {
        socket.emit("error", { message: "Cuộc trò chuyện không tồn tại" });
        return;
      }

      // Get affected users for notification
      const affectedUserIds = conversation.isGroup
        ? conversation.members.map((id) => id.toString())
        : [conversation.sender.toString(), conversation.receiver.toString()];

      // Delete messages
      await MessageModel.deleteMany({ _id: { $in: conversation.messages } });

      // Delete the conversation
      await ConversationModel.findByIdAndDelete(conversation._id);

      // Notify requester
      socket.emit("conversationDeleted", {
        success: true,
        message: "Đã xóa cuộc trò chuyện thành công",
        conversationId: conversation._id,
      });

      // Update sidebars for affected users
      for (const userId of affectedUserIds) {
        const userConversations = await getConversation(userId, true);
        io.to(userId).emit("conversation", userConversations);
      }
    } catch (error) {
      socket.emit("error", {
        message: "Có lỗi xảy ra khi xóa cuộc trò chuyện",
        details: error.message,
      });
    }
  });

  // Leave group
  socket.on("leaveGroup", async (data) => {
    try {
      const { groupId, userId: requestingUserId } = data;

      // Use provided userId or default to socket's userId
      const userIdToUse = requestingUserId || userId;

      // Find the group conversation
      const groupConversation = await ConversationModel.findById(groupId);

      if (!groupConversation || !groupConversation.isGroup) {
        socket.emit("leftGroup", {
          success: false,
          message: "Nhóm không tồn tại",
        });
        return;
      }

      // Check if user is a member of the group
      const isMember = groupConversation.members.some((memberId) => memberId.toString() === userIdToUse.toString());

      if (!isMember) {
        socket.emit("leftGroup", {
          success: false,
          message: "Bạn không phải là thành viên của nhóm này",
        });
        return;
      }

      // Check if user is the admin
      const isAdmin = groupConversation.groupAdmin.toString() === userIdToUse.toString();

      if (isAdmin) {
        socket.emit("leftGroup", {
          success: false,
          message: "Quản trị viên không thể rời nhóm. Bạn phải chuyển quyền quản trị hoặc xóa nhóm.",
        });
        return;
      }

      // Remove user from the group members
      await ConversationModel.findByIdAndUpdate(groupId, {
        $pull: { members: userIdToUse },
      });

      // Get user details for notification
      const leavingUser = await UserModel.findById(userIdToUse);

      if (!leavingUser) {
        socket.emit("leftGroup", {
          success: true,
          message: "Bạn đã rời khỏi nhóm, nhưng có lỗi khi tạo thông báo.",
        });
        return;
      }

      // Create a notification message
      const notificationMessage = await MessageModel.create({
        text: `${leavingUser.name} đã rời khỏi nhóm`,
        msgByUserId: userIdToUse,
      });

      // Add notification to conversation
      await ConversationModel.findByIdAndUpdate(groupId, {
        $push: { messages: notificationMessage._id },
      });

      // Get updated group
      const updatedGroup = await ConversationModel.findById(groupId)
        .populate("members")
        .populate("messages")
        .populate("groupAdmin");

      // Notify remaining members
      for (const member of updatedGroup.members) {
        const memberId = typeof member === "object" ? member._id.toString() : member.toString();

        // Send updated group data
        io.to(memberId).emit("groupMessage", updatedGroup);

        // Update sidebar
        const memberConversations = await getConversation(memberId);
        io.to(memberId).emit("conversation", memberConversations);
      }

      // Update conversation list for the user who left
      const userIdStr = userIdToUse.toString();
      const userConversations = await getConversation(userIdStr);
      io.to(userIdStr).emit("conversation", userConversations);

      socket.emit("leftGroup", {
        success: true,
        message: "Bạn đã rời khỏi nhóm",
      });
    } catch (error) {
      console.error("Error leaving group:", error);
      socket.emit("leftGroup", {
        success: false,
        message: "Có lỗi xảy ra khi rời nhóm",
      });
    }
  });

  // Pin / Unpin conversation
  socket.on("pinConversation", async ({ conversationId, pin }) => {
    try {
      if (pin) {
        await ConversationModel.updateOne({ _id: conversationId }, { $addToSet: { pinnedBy: userId } });
      } else {
        await ConversationModel.updateOne({ _id: conversationId }, { $pull: { pinnedBy: userId } });
      }
      const updatedList = await getConversation(userId.toString());
      socket.emit("conversation", updatedList);
    } catch (err) {
      socket.emit("error", { message: "Không thể ghim cuộc trò chuyện" });
    }
  });
};

module.exports = conversationHandler;
