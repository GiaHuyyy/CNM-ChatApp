const { ConversationModel, MessageModel } = require("../models/ConversationModel");
const mongoose = require("mongoose");

/**
 * Get conversations for a user
 * @param {string} userId - The user's ID
 * @param {boolean} forceRefresh - Whether to force a refresh and bypass caching
 * @returns {Array} - Array of conversations
 */
async function getConversation(userId, forceRefresh = false) {
  try {
    console.log(`Getting conversations for user ${userId}${forceRefresh ? " (forced refresh)" : ""}`);

    // Make sure userId is a valid ObjectId
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;

    console.log(`Using ObjectId: ${userObjectId}`);

    // Find all conversations where user is either sender, receiver, or group member
    const conversations = await ConversationModel.find({
      $or: [{ sender: userObjectId }, { receiver: userObjectId }, { members: userObjectId }],
    }).sort({ updatedAt: -1 });

    console.log(`Found ${conversations.length} conversations for user ${userId}`);

    // Process the conversations to include user details and latest messages
    const processedConversations = await Promise.all(
      conversations.map(async (conversation) => {
        try {
          // Group conversations
          if (conversation.isGroup) {
            await conversation.populate("members");
            await conversation.populate("groupAdmin");

            // Get latest message if available
            let latestMessage = null;
            let unseenMessages = 0;

            if (conversation.messages && conversation.messages.length > 0) {
              const latestMessageId = conversation.messages[conversation.messages.length - 1];
              latestMessage = await MessageModel.findById(latestMessageId);

              // Count unseen messages
              unseenMessages = await MessageModel.countDocuments({
                _id: { $in: conversation.messages },
                msgByUserId: { $ne: userObjectId },
                seenBy: { $ne: userObjectId },
              });
            }

            return {
              _id: conversation._id,
              userDetails: {
                _id: conversation._id,
                name: conversation.name || `Group ${conversation._id.toString().slice(-5)}`,
                profilePic:
                  conversation.profilePic ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    conversation.name || "Group"
                  )}&background=random`,
              },
              latestMessage,
              unseenMessages,
              isGroup: true,
              members: conversation.members,
              groupAdmin: conversation.groupAdmin,
            };
          }
          // Direct conversations
          else {
            // Determine other user
            const otherUserId = conversation.sender.toString() === userId ? conversation.receiver : conversation.sender;

            // Populate other user details
            await conversation.populate({
              path: conversation.sender.toString() === userId ? "receiver" : "sender",
              select: "name profilePic email",
            });

            // Get latest message
            let latestMessage = null;
            let unseenMessages = 0;

            if (conversation.messages && conversation.messages.length > 0) {
              const latestMessageId = conversation.messages[conversation.messages.length - 1];
              latestMessage = await MessageModel.findById(latestMessageId);

              // Count unseen messages
              unseenMessages = await MessageModel.countDocuments({
                _id: { $in: conversation.messages },
                msgByUserId: otherUserId,
                seen: false,
              });
            }

            const otherUser = conversation.sender.toString() === userId ? conversation.receiver : conversation.sender;

            return {
              _id: conversation._id,
              userDetails: otherUser,
              latestMessage,
              unseenMessages,
              isGroup: false,
            };
          }
        } catch (error) {
          console.error(`Error processing conversation ${conversation._id}:`, error);
          return null;
        }
      })
    );

    // Filter out nulls from processing errors
    const validConversations = processedConversations.filter(Boolean);
    console.log(`Returning ${validConversations.length} valid conversations`);

    return validConversations;
  } catch (error) {
    console.error("Error in getConversation:", error);
    return [];
  }
}

module.exports = getConversation;
