const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const getUserDetailsFromToken = require("../helpers/getUserDetailsFromToken");
const getConversation = require("../helpers/getConversation");
const UserModel = require("../models/UserModel");
const { ConversationModel, MessageModel } = require("../models/ConversationModel");
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

    // Create a room with user id
    socket.join(user?._id?.toString());
    onlineUser.add(user?._id?.toString());

    io.emit("onlineUser", Array.from(onlineUser));

    socket.on("joinRoom", async (userId) => {
      console.log("Join room", userId);
      const userDetail = await UserModel.findById(userId).select("-password");

      const payload = {
        _id: userDetail?._id,
        name: userDetail?.name,
        phone: userDetail?.phone,
        profilePic: userDetail?.profilePic,
        online: onlineUser.has(userId),
      };

      socket.emit("messageUser", payload);

      // Fetch all messages for the conversation
      const conversation = await ConversationModel.findOne({
        $or: [
          { sender: user._id, receiver: userId },
          { sender: userId, receiver: user._id },
        ],
      })
        .populate("messages")
        .sort({ createdAt: -1 });

      socket.emit("message", conversation);
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

    // Seen
    socket.on("seen", async (msgByUserId) => {
      try {
        let conversation = await ConversationModel.findOne({
          $or: [
            { sender: user?._id, receiver: msgByUserId },
            { sender: msgByUserId, receiver: user?._id },
          ],
        });

        const conversationMessageId = conversation?.messages || [];

        const updateMessage = await MessageModel.updateMany(
          {
            _id: { $in: conversationMessageId },
            msgByUserId: msgByUserId,
            seen: false, // Chỉ cập nhật tin nhắn chưa được xem
          },
          { $set: { seen: true } }
        );

        // Send message to conversation room
        const conversationSender = await getConversation(user?._id?.toString());
        const conversationReceiver = await getConversation(msgByUserId);

        io.to(user?._id?.toString()).emit("conversation", conversationSender);
        io.to(msgByUserId).emit("conversation", conversationReceiver);
      } catch (error) {
        console.error("Error handling seen event:", error);
      }
    });

    //   Disconnect
    socket.on("disconnect", () => {
      onlineUser.delete(user?._id);
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