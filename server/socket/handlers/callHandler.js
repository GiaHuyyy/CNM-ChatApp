const { ConversationModel, MessageModel } = require("../../models/ConversationModel");
const getConversation = require("../../helpers/getConversation");

const callHandler = (io, socket, userId, onlineUser) => {
  // Call signaling events
  socket.on("call-user", async (data) => {
    try {
      const { callerId, receiverId, callerName, callerImage, isVideoCall, signal } = data;

      // Check if receiver is online - enhanced check
      if (!onlineUser.has(receiverId)) {
        socket.emit("call-failed", { message: "Người dùng hiện không trực tuyến" });
        return;
      }

      // Create a call notification message
      const callNotificationMessage = await MessageModel.create({
        text: isVideoCall ? "Cuộc gọi video" : "Cuộc gọi thoại",
        msgByUserId: callerId,
        callData: {
          callType: isVideoCall ? "video" : "audio",
          callStatus: "missed", // Initially set as missed, will be updated if answered
          callDuration: 0,
        },
      });

      // Find the conversation between users
      let conversation = await ConversationModel.findOne({
        $or: [
          { sender: callerId, receiver: receiverId },
          { sender: receiverId, receiver: callerId },
        ],
        isGroup: false,
      });

      // If no conversation exists, create one
      if (!conversation) {
        conversation = await ConversationModel.create({
          sender: callerId,
          receiver: receiverId,
          messages: [callNotificationMessage._id],
        });
      } else {
        // Add the call notification to the existing conversation
        await ConversationModel.findByIdAndUpdate(conversation._id, {
          $push: { messages: callNotificationMessage._id },
        });
      }

      // Emit the call to the receiver
      io.to(receiverId).emit("incoming-call", {
        callerId,
        callerName,
        callerImage,
        isVideoCall,
        signal,
        messageId: callNotificationMessage._id,
      });

      // Update sidebar for both users
      const callerConversations = await getConversation(callerId);
      const receiverConversations = await getConversation(receiverId);

      io.to(callerId).emit("conversation", callerConversations);
      io.to(receiverId).emit("conversation", receiverConversations);
    } catch (error) {
      console.error("Error in call-user event:", error);
      socket.emit("call-failed", { message: "Có lỗi xảy ra khi gọi điện" });
    }
  });

  socket.on("answer-call", async (data) => {
    try {
      const { callerId, signal, messageId } = data;

      // Update the call message to "answered"
      if (messageId) {
        await MessageModel.findByIdAndUpdate(messageId, { "callData.callStatus": "answered" });
      }

      // Emit answer to the caller
      io.to(callerId).emit("call-accepted", { signal });
    } catch (error) {
      console.error("Error in answer-call event:", error);
    }
  });

  socket.on("reject-call", async (data) => {
    try {
      const { callerId, messageId, reason } = data;

      // Update the call message to "rejected"
      if (messageId) {
        await MessageModel.findByIdAndUpdate(messageId, { "callData.callStatus": "rejected" });
      }

      // Emit rejection to the caller
      io.to(callerId).emit("call-rejected", { reason });
    } catch (error) {
      console.error("Error in reject-call event:", error);
    }
  });

  socket.on("end-call", async (data) => {
    try {
      const { userId, partnerId, messageId, duration } = data;

      // Update call duration and status
      if (messageId) {
        await MessageModel.findByIdAndUpdate(messageId, {
          "callData.callStatus": "completed",
          "callData.callDuration": duration,
        });
      }

      // Send call-ended for metrics/logging
      io.to(partnerId).emit("call-ended", { duration });

      // Send more direct call-terminated event to force UI closure
      io.to(partnerId).emit("call-terminated");

      // Update sidebar for both users
      const userConversations = await getConversation(userId);
      const partnerConversations = await getConversation(partnerId);

      io.to(userId).emit("conversation", userConversations);
      io.to(partnerId).emit("conversation", partnerConversations);
    } catch (error) {
      console.error("Error in end-call event:", error);
    }
  });

  socket.on("ice-candidate", (data) => {
    try {
      const { userId, candidate } = data;
      io.to(userId).emit("ice-candidate", { candidate });
    } catch (error) {
      console.error("Error in ice-candidate event:", error);
    }
  });
};

module.exports = callHandler;