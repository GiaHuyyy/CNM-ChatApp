const express = require("express");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const getUserDetailsFromToken = require("../helpers/getUserDetailsFromToken");

// Import handlers
const messageHandler = require("./handlers/messageHandler");
const groupHandler = require("./handlers/groupHandler");
const groupUpdateHandler = require("./handlers/groupUpdateHandler");
const callHandler = require("./handlers/callHandler");
const userHandler = require("./handlers/userHandler");
const conversationHandler = require("./handlers/conversationHandler");
const friendHandler = require("./handlers/friendHandler");

const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: [process.env.FRONTEND_URL, process.env.MOBILE_URL],
      credentials: true,
    },
  });

  // Online user set and connected users map
  const onlineUser = new Set();
  const connectedUsers = new Map();

  io.on("connection", async (socket) => {
    console.log("Connected User: ", socket.id);

    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        console.error("No token provided in socket connection");
        return;
      }

      const user = await getUserDetailsFromToken(token);

      if (!user || !user._id) {
        console.error("Invalid user from token");
        return;
      }

      const userId = typeof user._id === "object" ? user._id : mongoose.Types.ObjectId(user._id.toString());
      const userIdStr = userId.toString();

      // Store socket connection for friend requests
      socket.user = user;
      connectedUsers.set(userIdStr, socket.id);
      console.log(`User ${userIdStr} (${user.name}) connected with socket ${socket.id}`);

      // Create a room with user id
      socket.join(userIdStr);
      onlineUser.add(userIdStr);

      // Emit updated online users
      io.emit("onlineUser", Array.from(onlineUser));

      // Initialize all handlers
      messageHandler(io, socket, userId);
      groupHandler(io, socket, userId);
      groupUpdateHandler(io, socket, userId);
      callHandler(io, socket, userId, onlineUser);
      userHandler(io, socket, userId, onlineUser);
      conversationHandler(io, socket, userId, onlineUser);
      friendHandler(io, socket, userId, connectedUsers); // Truyền connectedUsers để dễ dàng tìm người dùng online

      // Handle disconnect
      socket.on("disconnect", () => {
        console.log(`User ${userIdStr} disconnected`);
        connectedUsers.delete(userIdStr);
        onlineUser.delete(userIdStr);
        io.emit("onlineUser", Array.from(onlineUser));
      });
    } catch (error) {
      console.error("Error in socket connection:", error);
    }
  });

  return io;
};

module.exports = setupSocket;
