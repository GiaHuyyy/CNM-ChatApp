const { ConversationModel } = require("../../models/ConversationModel");
const getConversation = require("../../helpers/getConversation");

const userHandler = (io, socket, userId, onlineUser) => {
  // Handle user logout
  socket.on("user-logout", () => {
    console.log("User logged out: ", userId.toString());
    onlineUser.delete(userId.toString());
    io.emit("onlineUser", Array.from(onlineUser));
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
    onlineUser.delete(userId.toString());
    io.emit("onlineUser", Array.from(onlineUser));
  });

  // Handle sidebar conversations
  socket.on("sidebar", async (currentUserId) => {
    try {
      const conversations = await getConversation(currentUserId);
      io.to(currentUserId).emit("conversation", conversations);
    } catch (error) {
      console.error("Error fetching sidebar conversations:", error);
    }
  });
};

module.exports = userHandler;