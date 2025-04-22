const { ConversationModel } = require("../models/ConversationModel");

const getConversation = async (currentUserId) => {
  if (currentUserId) {
    const currentUserConversations = await ConversationModel.find({
      $or: [{ sender: currentUserId }, { receiver: currentUserId }, { members: currentUserId }],
    })
      .sort({ updatedAt: -1 })
      .populate({
        path: "messages",
        options: { sort: { createdAt: 1 } },
      })
      .populate("sender")
      .populate("receiver")
      .populate("members")
      .populate("groupAdmin");

    const conversation = currentUserConversations.map((conv) => {
      // Count unseen messages with separate logic for group vs direct chats
      const countUnseenMessages = conv?.messages.reduce((total, message) => {
        // Skip messages sent by current user - always considered "seen"
        if (message.msgByUserId?.toString() === currentUserId) {
          return total;
        }

        // Group chat logic - use seenBy array
        if (conv.isGroup) {
          // Check if user's ID is in seenBy array
          if (Array.isArray(message.seenBy) && message.seenBy.some((id) => id?.toString() === currentUserId)) {
            return total; // Message seen, don't count
          }
          return total + 1; // Message not seen by this user
        }
        // Direct message logic - use seen boolean flag
        else {
          return message.seen ? total : total + 1;
        }
      }, 0);

      // Handle group conversations
      if (conv.isGroup) {
        return {
          _id: conv?._id,
          sender: conv?.sender,
          receiver: conv?.receiver,
          unseenMessages: countUnseenMessages,
          latestMessage: conv?.messages[conv?.messages.length - 1],
          isGroup: true,
          name: conv?.name,
          members: conv?.members,
          groupAdmin: conv?.groupAdmin,
          userDetails: {
            _id: conv?._id,
            name: conv?.name,
            profilePic: conv?.profilePic || "https://ui-avatars.com/api/?name=" + encodeURIComponent(conv?.name) + "&background=random",
            isGroup: true,
          },
        };
      }

      // Handle direct messages
      return {
        _id: conv?._id,
        sender: conv?.sender,
        receiver: conv?.receiver,
        unseenMessages: countUnseenMessages,
        latestMessage: conv?.messages[conv?.messages.length - 1],
        isGroup: false,
        userDetails: conv?.sender?._id?.toString() === currentUserId ? conv?.receiver : conv?.sender,
      };
    });

    return conversation;
  }
};

module.exports = getConversation;
