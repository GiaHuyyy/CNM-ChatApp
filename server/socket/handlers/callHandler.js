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

      // Log signal type for debugging
      console.log(`Call from ${callerId} to ${receiverId}`, {
        signalType: signal?.type || "unknown",
        hasRealSdp: signal?.sdp?.startsWith('v=') || false,
        hasMobileSimulatedSdp: signal?.sdp?.includes('simulated-sdp') || false
      });

      // Create a call notification message
      const callNotificationMessage = await MessageModel.create({
        text: isVideoCall ? "Cuộc gọi video" : "Cuộc gọi thoại",
        msgByUserId: callerId,
        callData: {
          callType: isVideoCall ? "video" : "audio",
          callStatus: "missed",
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

      // Forward the call data to the receiver
      io.to(receiverId).emit("incoming-call", {
        callerId,
        callerName,
        callerImage,
        isVideoCall,
        signal,
        messageId: callNotificationMessage._id
      });
    } catch (error) {
      console.error("Error in call-user event:", error);
      socket.emit("call-failed", { message: "Có lỗi xảy ra khi gọi điện" });
    }
  });

  // Add this handler for call answers
  socket.on("answer-call", async (data) => {
    try {
      const { callerId, signal, messageId } = data;

      console.log(`Call answer from ${userId} to ${callerId}`, {
        signalType: signal?.type || "unknown",
        hasRealSdp: signal?.sdp?.startsWith('v=') || false,
        hasMobileSimulatedSdp: signal?.sdp?.includes('simulated-sdp') || false
      });

      // Forward the answer to the caller
      io.to(callerId).emit("call-accepted", { signal });

      // Update call status if we have a message ID
      if (messageId) {
        await MessageModel.findByIdAndUpdate(messageId, {
          "callData.callStatus": "in-progress"
        });
      }
    } catch (error) {
      console.error("Error in answer-call handler:", error);
      socket.emit("call-failed", { message: "Không thể kết nối cuộc gọi" });
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