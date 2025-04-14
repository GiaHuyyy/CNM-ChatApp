// ... existing socket.io setup code ...

const setupFriendRequestSocket = (io) => {
  const connectedUsers = new Map();

  io.on('connection', (socket) => {
    if (socket.user) {
      connectedUsers.set(socket.user._id.toString(), socket.id);
    }

    socket.on('disconnect', () => {
      if (socket.user) {
        connectedUsers.delete(socket.user._id.toString());
      }
    });

    socket.on("sendFriendRequest", async (data) => {
      try {
        const { receiverId } = data;
        const receiverSocketId = connectedUsers.get(receiverId);
        
        const sender = {
          _id: socket.user._id,
          name: socket.user.name,
          email: socket.user.email,
          profilePic: socket.user.profilePic
        };

        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receiveFriendRequest", {
            ...data,
            sender
          });
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on("cancelFriendRequest", (data) => {
      const { receiverId } = data;
      const receiverSocketId = connectedUsers.get(receiverId);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("friendRequestCancelled", data);
      }
    });
  });
};

module.exports = setupFriendRequestSocket;