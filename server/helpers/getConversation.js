const { ConversationModel } = require("../models/ConversationModel");

const getConversation = async (currentUserId) => {
  if (currentUserId) {
    const currentUserConversations = await ConversationModel.find({
        $or: [{ sender: currentUserId }, { receiver: currentUserId }],
      })
        .sort({ updatedAt: -1 })
        .populate("messages")
        .populate("sender")
        .populate("receiver");
    
      const conversation = currentUserConversations.map((conv) => {
        const countUnseenMessages = conv?.messages.reduce((preve, curr) => {
          if (curr?.msgByUserId?.toString() !== currentUserId) {
            return preve + (curr?.seen ? 0 : 1);
          }
          return preve;
        }, 0);
        return {
          _id: conv?._id,
          sender: conv?.sender,
          receiver: conv?.receiver,
          unseenMessages: countUnseenMessages,
          latestMessage: conv?.messages[conv?.messages.length - 1],
        };
      });
    
      return conversation;
  }
};

module.exports = getConversation;
