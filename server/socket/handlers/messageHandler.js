const { ConversationModel, MessageModel } = require("../../models/ConversationModel");
const getConversation = require("../../helpers/getConversation");
const UserModel = require("../../models/UserModel");

const messageHandler = (io, socket, userId) => {
  // New message
  socket.on("newMessage", async (data) => {
    try {
      const { sender, receiver, text, files } = data;

      // Create a new message object
      const newMessageData = {
        text: text || "",
        msgByUserId: userId,
        seenBy: [userId],
      };

      // If legacy file format is provided (for backward compatibility)
      if (data.imageUrl) {
        newMessageData.imageUrl = data.imageUrl;
      }
      if (data.fileUrl) {
        newMessageData.fileUrl = data.fileUrl;
        newMessageData.fileName = data.fileName || "File";
      }

      // Add replyTo if present
      if (data.replyTo) {
        newMessageData.replyTo = data.replyTo;
      }

      // Add shared content if present
      if (data.sharedContent) {
        newMessageData.sharedContent = data.sharedContent;
        newMessageData.isShared = true;
      }

      // Handle multiple files
      if (files && Array.isArray(files) && files.length > 0) {
        newMessageData.files = files;
      }

      // Create message
      const newMessage = await MessageModel.create(newMessageData);

      let conversation = await ConversationModel.findOne({
        $or: [
          { sender: sender, receiver: receiver },
          { sender: receiver, receiver: sender },
        ],
      });

      if (!conversation) {
        conversation = await ConversationModel.create({
          sender: sender,
          receiver: receiver,
        });
      }

      await ConversationModel.updateOne({ _id: conversation?._id }, { $push: { messages: newMessage?._id } });

      const getConversationMessage = await ConversationModel.findOne({
        $or: [
          { sender: sender, receiver: receiver },
          { sender: receiver, receiver: sender },
        ],
      })
        .populate("messages")
        .sort({ createdAt: -1 });

      io.to(sender).emit("message", getConversationMessage);
      io.to(receiver).emit("message", getConversationMessage);

      const conversationSender = await getConversation(sender);
      const conversationReceiver = await getConversation(receiver);

      io.to(sender).emit("conversation", conversationSender);
      io.to(receiver).emit("conversation", conversationReceiver);
    } catch (error) {
      console.error("Error handling newMessage event:", error);
    }
  });

  // New message for group chats
  socket.on("newGroupMessage", async (data) => {
    try {
      const { conversationId, text, files } = data;

      // Create a new message object
      const newMessageData = {
        text: text || "",
        msgByUserId: userId,
        seenBy: [userId],
      };

      // If legacy file format is provided (for backward compatibility)
      if (data.imageUrl) {
        newMessageData.imageUrl = data.imageUrl;
      }
      if (data.fileUrl) {
        newMessageData.fileUrl = data.fileUrl;
        newMessageData.fileName = data.fileName || "File";
      }

      // Add replyTo if present
      if (data.replyTo) {
        newMessageData.replyTo = data.replyTo;
      }

      // Add shared content if present
      if (data.sharedContent) {
        newMessageData.sharedContent = data.sharedContent;
        newMessageData.isShared = true;
      }

      // Handle multiple files
      if (files && Array.isArray(files) && files.length > 0) {
        newMessageData.files = files;
      }

      // Create message
      const newMessage = await MessageModel.create(newMessageData);

      const conversation = await ConversationModel.findById(conversationId);

      if (!conversation || !conversation.isGroup) {
        console.error("Group conversation not found:", conversationId);
        return;
      }

      if (!conversation.members.includes(userId)) {
        console.error("User not authorized to send message to this group");
        return;
      }

      await ConversationModel.updateOne({ _id: conversationId }, { $push: { messages: newMessage._id } });

      const updatedConversation = await ConversationModel.findById(conversationId)
        .populate("messages")
        .populate("members")
        .populate("groupAdmin");

      for (const memberId of conversation.members) {
        const memberString = memberId.toString();
        io.to(memberString).emit("groupMessage", updatedConversation);
        const memberConversations = await getConversation(memberString);
        io.to(memberString).emit("conversation", memberConversations);
      }
    } catch (error) {
      console.error("Error handling newGroupMessage event:", error);
    }
  });

  // Add reaction to message
  socket.on("addReaction", async (data) => {
    try {
      const { messageId, conversationId, emoji, userId, isGroup } = data;

      const message = await MessageModel.findById(messageId);
      if (!message) {
        return socket.emit("error", { message: "Tin nhắn không tồn tại" });
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        return socket.emit("error", { message: "Người dùng không tồn tại" });
      }

      const existingReactionIndex = message.reactions?.findIndex(
        (reaction) => reaction.userId.toString() === userId.toString() && reaction.emoji === emoji
      );

      if (existingReactionIndex !== -1) {
        message.reactions.splice(existingReactionIndex, 1);
      } else {
        if (!message.reactions) {
          message.reactions = [];
        }
        message.reactions.push({
          emoji,
          userId,
          userName: user.name,
        });
      }

      await message.save();

      let updatedConversation;
      if (isGroup) {
        updatedConversation = await ConversationModel.findById(conversationId)
          .populate("messages")
          .populate("members")
          .populate("groupAdmin");

        for (const memberId of updatedConversation.members) {
          const memberIdStr =
            typeof memberId === "object" ? (memberId._id ? memberId._id.toString() : memberId.toString()) : memberId;

          io.to(memberIdStr).emit("groupMessage", updatedConversation);
        }
      } else {
        updatedConversation = await ConversationModel.findOne({
          $or: [
            { _id: conversationId },
            { $and: [{ sender: userId }, { receiver: conversationId }] },
            { $and: [{ sender: conversationId }, { receiver: userId }] },
          ],
        }).populate("messages");

        const senderStr = updatedConversation.sender.toString();
        const receiverStr = updatedConversation.receiver.toString();

        io.to(senderStr).emit("message", updatedConversation);
        io.to(receiverStr).emit("message", updatedConversation);
      }

      socket.emit("reactionAdded", { success: true });
    } catch (error) {
      console.error("Error adding reaction:", error);
      socket.emit("error", { message: "Có lỗi xảy ra khi thêm cảm xúc" });
    }
  });

  // Seen status
  socket.on("seen", async (msgByUserId) => {
    try {
      let conversation = await ConversationModel.findOne({
        $or: [
          { sender: userId, receiver: msgByUserId },
          { sender: msgByUserId, receiver: userId },
        ],
      });

      if (!conversation) {
        console.log("Direct conversation not found");
        return;
      }

      const conversationMessageId = conversation?.messages || [];

      const updateMessage = await MessageModel.updateMany(
        {
          _id: { $in: conversationMessageId },
          msgByUserId: msgByUserId,
          seen: false,
        },
        { $set: { seen: true } }
      );

      console.log(`Marked ${updateMessage.modifiedCount} direct messages as seen`);

      const conversationSender = await getConversation(userId.toString());
      const conversationReceiver = await getConversation(msgByUserId);

      io.to(userId.toString()).emit("conversation", conversationSender);
      io.to(msgByUserId).emit("conversation", conversationReceiver);
    } catch (error) {
      console.error("Error handling seen event:", error);
    }
  });

  // Delete message (soft delete)
  socket.on("deleteMessage", async (data) => {
    try {
      const { messageId, conversationId, userId, isGroup } = data;

      // Find the message
      const message = await MessageModel.findById(messageId);
      if (!message) {
        return socket.emit("error", { message: "Tin nhắn không tồn tại" });
      }

      // Only allow the sender to delete
      if (message.msgByUserId.toString() !== userId.toString()) {
        return socket.emit("error", { message: "Bạn không có quyền xóa tin nhắn này" });
      }

      // Soft delete: update message content, do NOT remove from conversation
      await MessageModel.findByIdAndUpdate(messageId, {
        text: "Tin nhắn đã được xóa",
        imageUrl: "",
        fileUrl: "",
        fileName: "",
        isDeleted: true,
      });

      // Retrieve updated conversation using flexible query
      let updatedConversation;
      if (isGroup) {
        updatedConversation = await ConversationModel.findById(conversationId)
          .populate("messages")
          .populate("members")
          .populate("groupAdmin");
        if (!updatedConversation) {
          return socket.emit("error", { message: "Không thể tải cuộc trò chuyện" });
        }
        for (const member of updatedConversation.members) {
          const memberId = member._id ? member._id.toString() : member.toString();
          io.to(memberId).emit("groupMessage", updatedConversation);
        }
      } else {
        updatedConversation = await ConversationModel.findOne({
          $or: [
            { _id: conversationId },
            { $and: [{ sender: userId }, { receiver: conversationId }] },
            { $and: [{ sender: conversationId }, { receiver: userId }] },
          ],
        }).populate("messages");
        if (!updatedConversation) {
          return socket.emit("error", { message: "Không thể tải cuộc trò chuyện" });
        }
        const senderStr = updatedConversation.sender.toString();
        const receiverStr = updatedConversation.receiver.toString();
        io.to(senderStr).emit("message", updatedConversation);
        io.to(receiverStr).emit("message", updatedConversation);
      }
    } catch (error) {
      socket.emit("error", {
        message: "Không thể xóa tin nhắn",
        error: error.message,
      });
    }
  });

  // Edit message
  socket.on("editMessage", async (data) => {
    try {
      const { messageId, text, userId, conversationId, isGroup } = data;

      // Find the message and check permission
      const message = await MessageModel.findById(messageId);
      if (!message) {
        return socket.emit("error", { message: "Tin nhắn không tồn tại" });
      }
      if (message.msgByUserId.toString() !== userId.toString()) {
        return socket.emit("error", { message: "Bạn không có quyền sửa tin nhắn này" });
      }

      // Update the message
      await MessageModel.findByIdAndUpdate(messageId, {
        text,
        isEdited: true,
        editedAt: new Date(),
      });

      // Get updated conversation and notify members
      let updatedConversation;
      if (isGroup) {
        updatedConversation = await ConversationModel.findById(conversationId)
          .populate("messages")
          .populate("members")
          .populate("groupAdmin");

        if (!updatedConversation) {
          return socket.emit("error", { message: "Không thể tải cuộc trò chuyện" });
        }

        for (const member of updatedConversation.members) {
          const memberId = member._id ? member._id.toString() : member.toString();
          io.to(memberId).emit("groupMessage", updatedConversation);
        }
      } else {
        updatedConversation = await ConversationModel.findOne({
          $or: [
            { _id: conversationId },
            { $and: [{ sender: userId }, { receiver: conversationId }] },
            { $and: [{ sender: conversationId }, { receiver: userId }] },
          ],
        }).populate("messages");

        if (!updatedConversation) {
          return socket.emit("error", { message: "Không thể tải cuộc trò chuyện" });
        }

        const senderStr = updatedConversation.sender.toString();
        const receiverStr = updatedConversation.receiver.toString();
        io.to(senderStr).emit("message", updatedConversation);
        io.to(receiverStr).emit("message", updatedConversation);
      }

      socket.emit("messageEdited", { success: true });
    } catch (error) {
      socket.emit("error", {
        message: "Không thể sửa tin nhắn",
        error: error.message,
      });
    }
  });

  // Pin/unpin message handler
  socket.on("pinMessage", async (data) => {
    try {
      const { conversationId, messageId, action, isGroup } = data;

      if (!conversationId || !messageId || !action) {
        return socket.emit("pinMessageError", {
          message: "Thiếu thông tin cần thiết",
        });
      }

      // Kiểm tra xem tin nhắn có tồn tại không
      const message = await MessageModel.findById(messageId);
      if (!message) {
        return socket.emit("pinMessageError", {
          message: "Tin nhắn không tồn tại",
        });
      }

      // Lấy thông tin cuộc trò chuyện
      const conversation = await ConversationModel.findById(conversationId).populate({
        path: "pinnedMessages",
        populate: {
          path: "msgByUserId",
          select: "name profilePic",
        },
      });

      if (!conversation) {
        return socket.emit("pinMessageError", {
          message: "Cuộc trò chuyện không tồn tại",
        });
      }

      // Kiểm tra giới hạn tin nhắn ghim
      if (action === "pin" && conversation.pinnedMessages && conversation.pinnedMessages.length >= 5) {
        return socket.emit("pinMessageError", {
          message: "Chỉ có thể ghim tối đa 5 tin nhắn",
          type: "PIN_LIMIT_EXCEEDED",
        });
      }

      // Thực hiện ghim hoặc bỏ ghim
      if (action === "pin") {
        // Ghim tin nhắn
        conversation.pinnedMessages = conversation.pinnedMessages || [];
        if (!conversation.pinnedMessages.some((pin) => pin._id.toString() === messageId.toString())) {
          conversation.pinnedMessages.push(messageId);
        }
      } else if (action === "unpin") {
        // Bỏ ghim tin nhắn
        if (conversation.pinnedMessages) {
          conversation.pinnedMessages = conversation.pinnedMessages.filter(
            (pin) => pin._id.toString() !== messageId.toString()
          );
        }
      }

      // Lưu thay đổi
      await conversation.save();

      // Lấy conversation đã cập nhật với đầy đủ thông tin
      let updatedConversation;
      if (isGroup) {
        updatedConversation = await ConversationModel.findById(conversationId)
          .populate("messages")
          .populate("members")
          .populate("groupAdmin")
          .populate({
            path: "pinnedMessages",
            populate: {
              path: "msgByUserId",
              select: "name profilePic",
            },
          });

        // Thông báo cho tất cả thành viên trong nhóm
        for (const memberId of updatedConversation.members) {
          const memberIdStr =
            typeof memberId === "object" ? (memberId._id ? memberId._id.toString() : memberId.toString()) : memberId;

          io.to(memberIdStr).emit("groupMessage", updatedConversation);
        }
      } else {
        updatedConversation = await ConversationModel.findById(conversationId)
          .populate("messages")
          .populate({
            path: "pinnedMessages",
            populate: {
              path: "msgByUserId",
              select: "name profilePic",
            },
          });

        // Xác định receiver là ai
        const receiverId = updatedConversation.members.find((member) => member.toString() !== userId.toString());

        // Thông báo cho cả người gửi và người nhận
        io.to(userId.toString()).emit("message", updatedConversation);
        if (receiverId) {
          io.to(receiverId.toString()).emit("message", updatedConversation);
        }
      }

      // Gửi thông báo thành công
      socket.emit("messagePinnedUnpinned", {
        success: true,
        action: action,
        messageId: messageId,
      });
    } catch (error) {
      console.error("Error handling pinMessage event:", error);
      socket.emit("pinMessageError", {
        message: "Có lỗi xảy ra khi ghim tin nhắn: " + error.message,
      });
    }
  });

  // Update the joinRoom handler to validate pinnedMessages
  socket.on("joinRoom", async (roomId) => {
    try {
      console.log(`User ${userId} attempting to join room: ${roomId}`);

      if (!roomId || roomId === "undefined") {
        console.log("Invalid room ID received:", roomId);
        socket.emit("error", { message: "Invalid room ID" });
        return;
      }

      // Clean up the roomId if it contains path prefixes
      let cleanRoomId = roomId;
      if (typeof roomId === "string" && roomId.includes("chat/")) {
        cleanRoomId = roomId.split("chat/")[1];
        console.log("Extracted ID from path:", cleanRoomId);
      }

      // First try: Look for a group conversation where user is a member
      let conversation;
      try {
        conversation = await ConversationModel.findOne({
          _id: cleanRoomId,
          isGroup: true,
          members: userId,
        });

        if (conversation) {
          console.log("Found group conversation:", cleanRoomId);
        }
      } catch (err) {
        console.log("Error looking up group conversation:", err.message);
        // Continue to next lookup strategy
      }

      // Second try: Look for direct message conversation between current user and target user
      if (!conversation) {
        try {
          conversation = await ConversationModel.findOne({
            $or: [
              { sender: userId, receiver: cleanRoomId },
              { sender: cleanRoomId, receiver: userId },
            ],
            isGroup: { $ne: true },
          });

          if (conversation) {
            console.log("Found direct message conversation between users");
          }
        } catch (err) {
          console.log("Error looking up direct conversation:", err.message);
          // Continue to next lookup strategy
        }
      }

      // Third try: Look for conversation by ID
      if (!conversation) {
        try {
          conversation = await ConversationModel.findById(cleanRoomId);
          if (conversation) {
            console.log("Found conversation by ID");
          }
        } catch (err) {
          console.log("Error looking up conversation by ID:", err.message);
          // This is not necessarily an error - might be a new conversation
        }
      }

      // Handle the case when no conversation exists - could be a new direct message
      if (!conversation) {
        // Check if the target ID is a valid user ID
        const targetUser = await UserModel.findById(cleanRoomId);

        if (targetUser) {
          console.log("No conversation found, but valid user ID. Creating empty conversation view.");

          // Send user details
          socket.emit("messageUser", {
            _id: targetUser._id,
            name: targetUser.name,
            phone: targetUser.phone,
            profilePic: targetUser.profilePic,
            online: false, // Will be updated by onlineUser event
          });

          // Send empty message list
          socket.emit("message", { messages: [], _id: "new-conversation" });
          return;
        } else {
          console.log("Neither conversation nor valid user found for ID:", cleanRoomId);
          socket.emit("error", { message: "Conversation not found" });
          return;
        }
      }

      // Continue with existing conversation handling...

      // Check for invalid pinnedMessages references and clean them up
      if (conversation.pinnedMessages && Array.isArray(conversation.pinnedMessages)) {
        // Create a new array with valid message references only
        const validPinnedMessages = [];

        for (const msgRef of conversation.pinnedMessages) {
          try {
            // Skip if msgRef is null or undefined
            if (!msgRef) continue;

            const msgExists = await MessageModel.exists({ _id: msgRef });
            if (msgExists) {
              validPinnedMessages.push(msgRef);
            } else {
              console.log(`Removing invalid pinned message reference: ${msgRef}`);
            }
          } catch (err) {
            console.error(`Error validating pinned message: ${err.message}`);
          }
        }

        // Update conversation if any invalid references were removed
        if (validPinnedMessages.length !== conversation.pinnedMessages.length) {
          console.log(
            `Updated pinnedMessages from ${conversation.pinnedMessages.length} to ${validPinnedMessages.length} items`
          );
          conversation.pinnedMessages = validPinnedMessages;
          await conversation.save();
        }
      }

      // Populate pinned messages
      try {
        // If conversation has pinned messages, fully populate them first
        if (conversation && conversation.pinnedMessages && conversation.pinnedMessages.length > 0) {
          // Use deep population to ensure all pinned messages have complete data
          await conversation.populate({
            path: "pinnedMessages",
            model: "Message",
            select: "_id text files imageUrl fileUrl fileName reactions createdAt isEdited isDeleted",
            populate: {
              path: "msgByUserId",
              model: "User",
              select: "name email profilePic",
            },
          });
        }
      } catch (err) {
        console.error("Error populating pinned messages:", err.message);
      }

      // Handle group vs direct conversation
      if (conversation.isGroup) {
        try {
          await conversation.populate("groupAdmin");
          await conversation.populate("members");
          await conversation.populate({
            path: "messages",
            populate: {
              path: "msgByUserId",
              select: "name email profilePic",
            },
          });

          socket.join(cleanRoomId);
          socket.emit("groupMessage", conversation);
        } catch (err) {
          console.error("Error populating group conversation:", err.message);
          socket.emit("error", { message: "Error loading group conversation" });
          return;
        }
      } else {
        try {
          // Populate messages for direct conversations
          await conversation.populate({
            path: "messages",
            populate: {
              path: "msgByUserId",
              select: "name email profilePic",
            },
          });

          // For direct conversations, make sure we have members
          if (!conversation.members || conversation.members.length === 0) {
            // Initialize members array if it doesn't exist
            conversation.members = [conversation.sender, conversation.receiver];
            await conversation.save();
          }

          // Emit conversation data to client
          socket.emit("message", conversation);

          // Find other user to send user details
          const otherUserId =
            conversation.sender.toString() === userId.toString()
              ? conversation.receiver.toString()
              : conversation.sender.toString();

          const otherUser = await UserModel.findById(otherUserId).select("-password");

          if (otherUser) {
            socket.emit("messageUser", {
              _id: otherUser._id,
              name: otherUser.name,
              phone: otherUser.phone,
              profilePic: otherUser.profilePic,
              online: false, // Will be updated by onlineUser event
            });
          }
        } catch (err) {
          console.error("Error handling direct conversation:", err.message);
          socket.emit("error", { message: "Error loading conversation details" });
          return;
        }
      }

      console.log(`User ${userId} successfully joined room: ${cleanRoomId}`);
    } catch (error) {
      console.error("Error joining room:", error);
      socket.emit("error", { message: "Error joining room", details: error.message });
    }
  });
};

module.exports = messageHandler;
