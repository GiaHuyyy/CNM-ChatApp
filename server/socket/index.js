const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const getUserDetailsFromToken = require("../helpers/getUserDetailsFromToken");
const getConversation = require("../helpers/getConversation");
const UserModel = require("../models/UserModel");
const { ConversationModel, MessageModel } = require("../models/ConversationModel");
const mongoose = require("mongoose");
const app = express();

// Socket connection
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
});

/***
 * Socket running at port 5000
 */

// Online user
const onlineUser = new Set();

io.on("connection", async (socket) => {
  console.log("Connected User: ", socket.id);

  try {
    const token = socket.handshake.auth.token;

    // Current user
    const user = await getUserDetailsFromToken(token);

    if (!user || !user._id) {
      console.error("Invalid user from token");
      return;
    }

    // Ensure user._id is a proper ObjectId
    const userId = typeof user._id === "object" ? user._id : mongoose.Types.ObjectId(user._id.toString());

    // Create a room with user id
    socket.join(userId.toString());
    onlineUser.add(userId.toString());

    io.emit("onlineUser", Array.from(onlineUser));

    socket.on("joinRoom", async (targetUserId) => {
      console.log("Join room", targetUserId);

      try {
        // Ensure valid targetUserId
        if (!targetUserId || typeof targetUserId !== "string") {
          console.error("Invalid targetUserId:", targetUserId);
          return;
        }

        // Check if this is a group chat - ensure ObjectId is properly handled
        const isGroupChat = await ConversationModel.exists({
          _id: targetUserId,
          isGroup: true,
          members: userId,
        });

        if (isGroupChat) {
          // Fetch group conversation
          const groupConversation = await ConversationModel.findById(targetUserId)
            .populate("messages")
            .populate("members")
            .populate("groupAdmin");

          // Mark all messages as seen immediately for group chats
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

          // Emit group data to the client
          socket.emit("groupMessage", groupConversation);

          // Update sidebar conversations for all group members
          if (groupConversation && Array.isArray(groupConversation.members)) {
            for (const member of groupConversation.members) {
              const memberId = member._id ? member._id.toString() : member.toString();
              const memberConversations = await getConversation(memberId);
              io.to(memberId).emit("conversation", memberConversations);
            }
          }

          return;
        }

        // Regular direct message conversation
        const userDetail = await UserModel.findById(targetUserId).select("-password");

        if (!userDetail) {
          console.log("User not found:", targetUserId);
          return;
        }

        const payload = {
          _id: userDetail?._id,
          name: userDetail?.name,
          phone: userDetail?.phone,
          profilePic: userDetail?.profilePic,
          online: onlineUser.has(targetUserId),
        };

        socket.emit("messageUser", payload);

        // Fetch all messages for the conversation
        const conversation = await ConversationModel.findOne({
          $or: [
            { sender: userId, receiver: targetUserId },
            { sender: targetUserId, receiver: userId },
          ],
        })
          .populate("messages")
          .sort({ createdAt: -1 });

        if (conversation) {
          // Mark all messages from the other user as seen
          await MessageModel.updateMany(
            {
              _id: { $in: conversation.messages },
              msgByUserId: targetUserId,
              seen: false,
            },
            { $set: { seen: true } }
          );

          // Emit conversation to client
          socket.emit("message", conversation);

          // Update sidebar for both users
          const conversationSender = await getConversation(userId.toString());
          const conversationReceiver = await getConversation(targetUserId);

          io.to(userId.toString()).emit("conversation", conversationSender);
          io.to(targetUserId).emit("conversation", conversationReceiver);
        } else {
          // If no conversation exists, send an empty one
          socket.emit("message", { messages: [] });
        }
      } catch (error) {
        console.error("Error in joinRoom event:", error);
      }
    });

    // New message
    socket.on("newMessage", async (message) => {
      try {
        // Check conversation is available both user
        let conversation = await ConversationModel.findOne({
          $or: [
            { sender: message?.sender, receiver: message?.receiver },
            { sender: message?.receiver, receiver: message?.sender },
          ],
        });

        // If conversation not available then create new conversation
        if (!conversation) {
          conversation = await ConversationModel.create({
            sender: message?.sender,
            receiver: message?.receiver,
          });
        }

        const newMessage = await MessageModel.create({
          text: message?.text,
          imageUrl: message?.imageUrl,
          fileUrl: message?.fileUrl,
          fileName: message?.fileName,
          msgByUserId: message?.msgByUserId,
        });

        const updatedConversation = await ConversationModel.updateOne(
          { _id: conversation?._id },
          { $push: { messages: newMessage?._id } }
        );

        const getConversationMessage = await ConversationModel.findOne({
          $or: [
            { sender: message?.sender, receiver: message?.receiver },
            { sender: message?.receiver, receiver: message?.sender },
          ],
        })
          .populate("messages")
          .sort({ createdAt: -1 });

        io.to(message?.sender).emit("message", getConversationMessage);
        io.to(message?.receiver).emit("message", getConversationMessage);

        // Send message to conversation room
        const conversationSender = await getConversation(message?.sender);
        const conversationReceiver = await getConversation(message?.receiver);

        io.to(message?.sender).emit("conversation", conversationSender);
        io.to(message?.receiver).emit("conversation", conversationReceiver);
      } catch (error) {
        console.error("Error handling newMessage event:", error);
      }
    });

    // New message for group chats
    socket.on("newGroupMessage", async (message) => {
      try {
        const { conversationId, text, imageUrl, fileUrl, fileName, msgByUserId } = message;

        // Find the group conversation
        const conversation = await ConversationModel.findById(conversationId);

        if (!conversation || !conversation.isGroup) {
          console.error("Group conversation not found:", conversationId);
          return;
        }

        // Check if the sender is a member of the group
        if (!conversation.members.includes(msgByUserId)) {
          console.error("User not authorized to send message to this group");
          return;
        }

        // Create new message - Important: add sender to seenBy array immediately
        const newMessage = await MessageModel.create({
          text,
          imageUrl: imageUrl || "",
          fileUrl: fileUrl || "",
          fileName: fileName || "",
          msgByUserId,
          seen: false,
          seenBy: [msgByUserId], // Add sender's ID to seenBy right away
        });

        // Add message to conversation
        await ConversationModel.updateOne({ _id: conversationId }, { $push: { messages: newMessage._id } });

        // Fetch updated conversation with messages
        const updatedConversation = await ConversationModel.findById(conversationId)
          .populate("messages")
          .populate("members")
          .populate("groupAdmin");

        // Notify all group members
        for (const memberId of conversation.members) {
          const memberString = memberId.toString();

          // Send updated group conversation
          io.to(memberString).emit("groupMessage", updatedConversation);

          // Update sidebar conversations for each member
          const memberConversations = await getConversation(memberString);
          io.to(memberString).emit("conversation", memberConversations);
        }
      } catch (error) {
        console.error("Error handling newGroupMessage event:", error);
      }
    });

    // Group chat seen status
    socket.on("seenGroup", async (groupId) => {
      try {
        const conversation = await ConversationModel.findById(groupId);

        if (!conversation) {
          console.log("Conversation not found:", groupId);
          return;
        }

        if (!conversation.isGroup) {
          console.log("Not a group conversation:", groupId);
          return;
        }

        // Mark messages as seen by adding current user to seenBy array
        // for messages that don't already have this user in seenBy
        const messageUpdateResults = await Promise.all(
          conversation.messages.map(async (messageId) => {
            return MessageModel.updateOne(
              {
                _id: messageId,
                msgByUserId: { $ne: userId }, // Only mark others' messages
                seenBy: { $ne: userId }, // Only if not already seen
              },
              { $addToSet: { seenBy: userId } }
            );
          })
        );

        const updatedCount = messageUpdateResults.reduce((count, result) => count + (result.modifiedCount || 0), 0);

        if (updatedCount > 0) {
          console.log(`Marked ${updatedCount} messages as seen for user ${userId}`);

          // Update sidebar conversations for all members
          for (const memberId of conversation.members) {
            const memberConversations = await getConversation(memberId.toString());
            io.to(memberId.toString()).emit("conversation", memberConversations);
          }
        }
      } catch (error) {
        console.error("Error handling seenGroup event:", error);
      }
    });

    // Create Group Chat
    socket.on("createGroupChat", async (groupData) => {
      try {
        const { name, members, creator } = groupData;

        if (!name || !members || members.length < 3) {
          // Creator + at least 2 more
          socket.emit("groupCreated", {
            success: false,
            message: "Nhóm phải có ít nhất 3 thành viên (bạn và 2 người khác)",
          });
          return;
        }

        // Ensure all member IDs are strings
        const memberIds = members.map((id) => (typeof id === "object" ? id.toString() : id));

        // Create a welcome message
        const welcomeMessage = await MessageModel.create({
          text: `${user.name} đã tạo nhóm "${name}"`,
          msgByUserId: creator,
        });

        // Create the group conversation
        const newGroupConversation = await ConversationModel.create({
          name,
          sender: creator,
          receiver: creator, // Set same as sender for group chats
          isGroup: true,
          members: memberIds,
          groupAdmin: creator,
          messages: [welcomeMessage._id],
        });

        // Populate the conversation with user details
        const populatedConversation = await ConversationModel.findById(newGroupConversation._id)
          .populate("members")
          .populate("messages");

        // Notify all members
        for (const memberId of memberIds) {
          // Get conversations for each member
          const memberConversations = await getConversation(memberId);
          // Emit to each member
          io.to(memberId).emit("conversation", memberConversations);
        }

        socket.emit("groupCreated", {
          success: true,
          message: "Nhóm đã được tạo thành công",
          conversationId: newGroupConversation._id,
        });
      } catch (error) {
        console.error("Error creating group chat:", error);
        socket.emit("groupCreated", {
          success: false,
          message: "Có lỗi xảy ra khi tạo nhóm",
        });
      }
    });

    // Sidebar
    socket.on("sidebar", async (currentUserId) => {
      try {
        console.log("Current User: ", currentUserId);

        const conversation = await getConversation(currentUserId);

        socket.emit("conversation", conversation);
      } catch (error) {
        console.error("Error handling sidebar event:", error);
      }
    });

    // Seen for direct messages
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

        // Mark messages as seen where:
        // 1. The message ID is in the conversation's messages array
        // 2. The message was sent by the other user (msgByUserId)
        // 3. The message hasn't been seen yet
        const updateMessage = await MessageModel.updateMany(
          {
            _id: { $in: conversationMessageId },
            msgByUserId: msgByUserId,
            seen: false,
          },
          { $set: { seen: true } }
        );

        console.log(`Marked ${updateMessage.modifiedCount} direct messages as seen`);

        // Send updated conversation data to both users
        const conversationSender = await getConversation(userId.toString());
        const conversationReceiver = await getConversation(msgByUserId);

        io.to(userId.toString()).emit("conversation", conversationSender);
        io.to(msgByUserId).emit("conversation", conversationReceiver);
      } catch (error) {
        console.error("Error handling seen event:", error);
      }
    });

    //   Disconnect
    socket.on("disconnect", () => {
      onlineUser.delete(userId);
      console.log("User disconnected", socket.id);
    });
  } catch (error) {
    console.error("Error during socket connection:", error);
  }
});

module.exports = {
  app,
  server,
};
