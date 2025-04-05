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

    // Emit updated online users to all connected clients
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

    // Add members to a group
    socket.on("addMembersToGroup", async (data) => {
      try {
        const { groupId, newMembers, addedBy } = data;

        // Find the group conversation
        const groupConversation = await ConversationModel.findById(groupId).populate("members").populate("groupAdmin");

        if (!groupConversation || !groupConversation.isGroup) {
          socket.emit("membersAddedToGroup", {
            success: false,
            message: "Nhóm không tồn tại",
          });
          return;
        }

        // Check if the user adding members is a member of the group
        if (!groupConversation.members.some((member) => member._id.toString() === addedBy)) {
          socket.emit("membersAddedToGroup", {
            success: false,
            message: "Bạn không có quyền thêm thành viên vào nhóm này",
          });
          return;
        }

        // Get current member IDs
        const currentMemberIds = groupConversation.members.map((member) => member._id.toString());

        // Filter out members that are already in the group
        const validNewMembers = newMembers.filter((id) => !currentMemberIds.includes(id));

        if (validNewMembers.length === 0) {
          socket.emit("membersAddedToGroup", {
            success: false,
            message: "Tất cả người dùng đã trong nhóm",
          });
          return;
        }

        // Get the details of the user who is adding members
        const adder = await UserModel.findById(addedBy);

        // Add new members to the group
        await ConversationModel.findByIdAndUpdate(
          groupId,
          { $push: { members: { $each: validNewMembers } } },
          { new: true }
        );

        // Create a notification message
        let notificationText = "";
        if (validNewMembers.length === 1) {
          const newMember = await UserModel.findById(validNewMembers[0]);
          notificationText = `${adder.name} đã thêm ${newMember.name} vào nhóm`;
        } else {
          notificationText = `${adder.name} đã thêm ${validNewMembers.length} người dùng vào nhóm`;
        }

        const notificationMessage = await MessageModel.create({
          text: notificationText,
          msgByUserId: addedBy,
          seenBy: [addedBy],
        });

        // Add the notification message to the conversation
        await ConversationModel.findByIdAndUpdate(groupId, { $push: { messages: notificationMessage._id } });

        // Get updated group information
        const updatedGroup = await ConversationModel.findById(groupId)
          .populate("members")
          .populate("messages")
          .populate("groupAdmin");

        // Notify all members including new ones about the update
        const allMemberIds = [...currentMemberIds, ...validNewMembers];

        for (const memberId of allMemberIds) {
          // Send updated group data
          io.to(memberId).emit("groupMessage", updatedGroup);

          // Update sidebar conversations
          const memberConversations = await getConversation(memberId);
          io.to(memberId).emit("conversation", memberConversations);
        }

        socket.emit("membersAddedToGroup", {
          success: true,
          message: `Đã thêm ${validNewMembers.length} thành viên vào nhóm`,
        });
      } catch (error) {
        console.error("Error adding members to group:", error);
        socket.emit("membersAddedToGroup", {
          success: false,
          message: "Có lỗi xảy ra khi thêm thành viên",
        });
      }
    });

    // Remove member from group
    socket.on("removeMemberFromGroup", async (data) => {
      try {
        const { groupId, memberId, adminId } = data;

        // Find the group conversation
        const groupConversation = await ConversationModel.findById(groupId);

        if (!groupConversation || !groupConversation.isGroup) {
          socket.emit("memberRemovedFromGroup", {
            success: false,
            message: "Nhóm không tồn tại",
          });
          return;
        }

        // Check if user is admin of the group
        const adminIdStr = typeof adminId === "object" ? adminId.toString() : adminId;
        const groupAdminIdStr = groupConversation.groupAdmin.toString();

        if (adminIdStr !== groupAdminIdStr) {
          socket.emit("memberRemovedFromGroup", {
            success: false,
            message: "Bạn không có quyền xóa thành viên",
          });
          return;
        }

        // Check if member exists in the group
        const memberIdStr = typeof memberId === "object" ? memberId.toString() : memberId;
        const memberIds = groupConversation.members.map((m) => (typeof m === "object" ? m.toString() : m));

        if (!memberIds.includes(memberIdStr)) {
          socket.emit("memberRemovedFromGroup", {
            success: false,
            message: "Thành viên không tồn tại trong nhóm",
          });
          return;
        }

        // Cannot remove yourself as admin
        if (memberIdStr === adminIdStr) {
          socket.emit("memberRemovedFromGroup", {
            success: false,
            message: "Quản trị viên không thể tự xóa mình khỏi nhóm",
          });
          return;
        }

        // Create a proper ObjectId for the query
        const memberObjectId = new mongoose.Types.ObjectId(memberIdStr);

        // Remove member from the group
        await ConversationModel.findByIdAndUpdate(groupId, { $pull: { members: memberObjectId } });

        // Get removed member details for notification
        const removedMember = await UserModel.findById(memberIdStr);
        const admin = await UserModel.findById(adminIdStr);

        if (!removedMember || !admin) {
          socket.emit("memberRemovedFromGroup", {
            success: false,
            message: "Không thể tìm thấy thông tin người dùng",
          });
          return;
        }

        // Create a notification message
        const notificationMessage = await MessageModel.create({
          text: `${admin.name} đã xóa ${removedMember.name} khỏi nhóm`,
          msgByUserId: adminId,
          seenBy: [adminId],
        });

        // Add notification to conversation
        await ConversationModel.findByIdAndUpdate(groupId, { $push: { messages: notificationMessage._id } });

        // Get updated group
        const updatedGroup = await ConversationModel.findById(groupId)
          .populate("members")
          .populate("messages")
          .populate("groupAdmin");

        // Notify remaining members about the update
        for (const memberId of updatedGroup.members) {
          const memberIdStr =
            typeof memberId === "object"
              ? memberId._id
                ? memberId._id.toString()
                : memberId.toString()
              : memberId.toString();

          // Send updated group data
          io.to(memberIdStr).emit("groupMessage", updatedGroup);

          // Update sidebar conversations
          const memberConversations = await getConversation(memberIdStr);
          io.to(memberIdStr).emit("conversation", memberConversations);
        }

        // Update conversation list for removed member
        const removedMemberConversations = await getConversation(memberIdStr);
        io.to(memberIdStr).emit("conversation", removedMemberConversations);

        socket.emit("memberRemovedFromGroup", {
          success: true,
          message: `Đã xóa ${removedMember.name} khỏi nhóm`,
        });
      } catch (error) {
        console.error("Error removing member from group:", error);
        socket.emit("memberRemovedFromGroup", {
          success: false,
          message: "Có lỗi xảy ra khi xóa thành viên khỏi nhóm",
        });
      }
    });

    // Leave group
    socket.on("leaveGroup", async (data) => {
      try {
        const { groupId, userId } = data;

        // Ensure userId is properly handled
        let userIdToUse;

        if (typeof userId === "object" && userId !== null) {
          // If it's a Mongoose object ID
          if (userId._id) {
            userIdToUse = userId._id.toString();
          } else {
            userIdToUse = userId.toString();
          }
        } else if (typeof userId === "string") {
          // If it appears to be a stringified object (JSON), extract the ID
          if (userId.includes("ObjectId")) {
            try {
              // Try to extract just the ID part from the string
              const idMatch = userId.match(/ObjectId\('([^']+)'\)/);
              if (idMatch && idMatch[1]) {
                userIdToUse = idMatch[1];
              } else {
                userIdToUse = userId;
              }
            } catch {
              userIdToUse = userId;
            }
          } else {
            userIdToUse = userId;
          }
        } else {
          console.error("Invalid userId format:", userId);
          socket.emit("leftGroup", {
            success: false,
            message: "ID người dùng không hợp lệ",
          });
          return;
        }

        // Find the group conversation
        const groupConversation = await ConversationModel.findById(groupId);

        if (!groupConversation || !groupConversation.isGroup) {
          socket.emit("leftGroup", {
            success: false,
            message: "Nhóm không tồn tại",
          });
          return;
        }

        // Convert all member IDs to strings for safe comparison
        const memberIds = groupConversation.members.map((m) =>
          typeof m === "object" && m !== null ? (m._id ? m._id.toString() : m.toString()) : m.toString()
        );

        // Check if user is a member of the group
        if (!memberIds.includes(userIdToUse)) {
          socket.emit("leftGroup", {
            success: false,
            message: "Bạn không phải là thành viên của nhóm này",
          });
          return;
        }

        // Check if user is the admin
        const adminId =
          typeof groupConversation.groupAdmin === "object" && groupConversation.groupAdmin !== null
            ? groupConversation.groupAdmin._id
              ? groupConversation.groupAdmin._id.toString()
              : groupConversation.groupAdmin.toString()
            : groupConversation.groupAdmin.toString();

        if (adminId === userIdToUse) {
          socket.emit("leftGroup", {
            success: false,
            message: "Quản trị viên không thể rời nhóm. Bạn phải chuyển quyền quản trị hoặc xóa nhóm.",
          });
          return;
        }

        // Create a proper ObjectId for the query
        const userObjectId = new mongoose.Types.ObjectId(userIdToUse);

        // Remove user from group members - use findByIdAndUpdate with the clean ObjectId
        await ConversationModel.findByIdAndUpdate(groupId, { $pull: { members: userObjectId } });

        // Get user details for notification
        const leavingUser = await UserModel.findById(userIdToUse);

        if (!leavingUser) {
          console.error("User not found for notification:", userIdToUse);
          socket.emit("leftGroup", {
            success: true,
            message: "Bạn đã rời khỏi nhóm, nhưng có lỗi khi tạo thông báo.",
          });
          return;
        }

        // Create a notification message
        const notificationMessage = await MessageModel.create({
          text: `${leavingUser.name} đã rời khỏi nhóm`,
          msgByUserId: userObjectId,
        });

        // Add notification to conversation
        await ConversationModel.findByIdAndUpdate(groupId, { $push: { messages: notificationMessage._id } });

        // Get updated group
        const updatedGroup = await ConversationModel.findById(groupId)
          .populate("members")
          .populate("messages")
          .populate("groupAdmin");

        // Notify remaining members about the update
        for (const memberId of updatedGroup.members) {
          const memberIdStr =
            typeof memberId === "object" && memberId !== null
              ? memberId._id
                ? memberId._id.toString()
                : memberId.toString()
              : memberId.toString();

          // Send updated group data
          io.to(memberIdStr).emit("groupMessage", updatedGroup);

          // Update sidebar conversations
          const memberConversations = await getConversation(memberIdStr);
          io.to(memberIdStr).emit("conversation", memberConversations);
        }

        // Update conversation list for the user who left
        const userConversations = await getConversation(userIdToUse);
        io.to(userIdToUse).emit("conversation", userConversations);

        socket.emit("leftGroup", {
          success: true,
          message: "Bạn đã rời khỏi nhóm",
        });
      } catch (error) {
        console.error("Error leaving group:", error);
        socket.emit("leftGroup", {
          success: false,
          message: "Có lỗi xảy ra khi rời nhóm",
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

    // Delete conversation
    socket.on("deleteConversation", async (data) => {
      try {
        const { conversationId, userId } = data;

        console.log("Deleting conversation. ID:", conversationId, "User:", userId);

        // Ensure userIdString is properly handled
        const userIdString = typeof userId === "object" ? userId.toString() : userId;

        // Ensure conversationId is properly formatted for MongoDB
        let conversationObjectId;
        try {
          conversationObjectId = new mongoose.Types.ObjectId(conversationId);
        } catch (err) {
          console.error("Invalid conversation ID format:", conversationId, err);
          socket.emit("conversationDeleted", {
            success: false,
            message: "ID cuộc trò chuyện không hợp lệ",
          });
          return;
        }

        // Find the conversation with more flexible query
        const conversation = await ConversationModel.findOne({
          $or: [
            { _id: conversationObjectId },
            // For direct messages, also try to find by sender/receiver
            {
              $and: [{ sender: userIdString }, { receiver: conversationId }],
            },
            {
              $and: [{ sender: conversationId }, { receiver: userIdString }],
            },
          ],
        });

        if (!conversation) {
          console.error("Conversation not found:", conversationId);
          socket.emit("conversationDeleted", {
            success: false,
            message: "Cuộc trò chuyện không tồn tại",
          });
          return;
        }

        console.log("Found conversation:", conversation._id, "isGroup:", conversation.isGroup);

        let canDelete = false;
        let affectedUserIds = [];

        // Handle group conversations
        if (conversation.isGroup) {
          // Only allow admin to delete the group
          const groupAdminId = conversation.groupAdmin.toString();

          if (groupAdminId === userIdString) {
            canDelete = true;
            // Get all member IDs to update their conversation lists
            affectedUserIds = conversation.members.map((id) => id.toString());
          } else {
            socket.emit("conversationDeleted", {
              success: false,
              message: "Chỉ quản trị viên mới có thể xóa nhóm chat",
            });
            return;
          }
        }
        // Handle direct conversations
        else {
          // Check if user is part of the conversation
          const senderStr = conversation.sender.toString();
          const receiverStr = conversation.receiver.toString();

          console.log("Direct conversation - Sender:", senderStr, "Receiver:", receiverStr, "User:", userIdString);

          if (senderStr === userIdString || receiverStr === userIdString) {
            canDelete = true;
            // Store sender and receiver to update their conversations list
            affectedUserIds = [senderStr, receiverStr];
          } else {
            socket.emit("conversationDeleted", {
              success: false,
              message: "Bạn không thể xóa cuộc trò chuyện này",
            });
            return;
          }
        }

        if (canDelete) {
          // Get message IDs to delete
          const messageIds = conversation.messages || [];

          // Delete all messages in the conversation
          if (messageIds.length > 0) {
            await MessageModel.deleteMany({ _id: { $in: messageIds } });
          }

          // Delete the conversation
          await ConversationModel.findByIdAndDelete(conversation._id);

          // Update conversation lists for all affected users
          for (const affectedUserId of affectedUserIds) {
            const memberConversations = await getConversation(affectedUserId);
            io.to(affectedUserId).emit("conversation", memberConversations);
          }

          socket.emit("conversationDeleted", {
            success: true,
            message: conversation.isGroup ? "Nhóm chat đã được xóa" : "Cuộc trò chuyện đã được xóa",
          });
        }
      } catch (error) {
        console.error("Error deleting conversation:", error);
        socket.emit("conversationDeleted", {
          success: false,
          message: "Có lỗi xảy ra khi xóa cuộc trò chuyện",
        });
      }
    });

    // Delete message (soft delete with content replacement)
    socket.on("deleteMessage", async (data) => {
      try {
        const { messageId, conversationId, userId, isGroup } = data;

        // Find the message
        const message = await MessageModel.findById(messageId);

        if (!message) {
          return socket.emit("error", { message: "Tin nhắn không tồn tại" });
        }

        // Check if user is authorized to delete the message
        if (message.msgByUserId.toString() !== userId.toString()) {
          return socket.emit("error", { message: "Bạn không có quyền xóa tin nhắn này" });
        }

        // Soft delete - keep the message but replace its content
        await MessageModel.findByIdAndUpdate(messageId, {
          text: "Tin nhắn đã được xóa",
          imageUrl: "",
          fileUrl: "",
          fileName: "",
          isDeleted: true,
          // Keep reactions, timestamps, and other metadata
        });

        // No need to remove from conversation - we're keeping the message

        // Retrieve updated conversation
        let updatedConversation;

        if (isGroup) {
          // For group chats, find by ID directly without using query with members array
          updatedConversation = await ConversationModel.findById(conversationId)
            .populate("messages")
            .populate("members")
            .populate("groupAdmin");

          if (!updatedConversation) {
            console.error("Group conversation not found:", conversationId);
            return socket.emit("error", { message: "Không tìm thấy cuộc trò chuyện nhóm" });
          }

          // Extract member IDs safely
          const memberIds = [];

          if (updatedConversation.members && Array.isArray(updatedConversation.members)) {
            for (const member of updatedConversation.members) {
              if (member) {
                let memberId;
                if (typeof member === "object") {
                  memberId = member._id ? member._id.toString() : member.toString();
                } else {
                  memberId = member.toString();
                }
                memberIds.push(memberId);
              }
            }
          }

          // Notify all group members using the clean IDs
          for (const memberId of memberIds) {
            io.to(memberId).emit("groupMessage", updatedConversation);

            // Update sidebar for all members
            const memberConversations = await getConversation(memberId);
            io.to(memberId).emit("conversation", memberConversations);
          }
        } else {
          // Non-group chat logic remains unchanged
          updatedConversation = await ConversationModel.findOne({
            $or: [
              { _id: conversationId },
              { $and: [{ sender: userId }, { receiver: conversationId }] },
              { $and: [{ sender: conversationId }, { receiver: userId }] },
            ],
          }).populate("messages");

          const senderStr = updatedConversation.sender.toString();
          const receiverStr = updatedConversation.receiver.toString();

          // Emit updated conversation to both users
          io.to(senderStr).emit("message", updatedConversation);
          io.to(receiverStr).emit("message", updatedConversation);

          // Update sidebar for both users
          const senderConversations = await getConversation(senderStr);
          const receiverConversations = await getConversation(receiverStr);

          io.to(senderStr).emit("conversation", senderConversations);
          io.to(receiverStr).emit("conversation", receiverConversations);
        }

        socket.emit("messageDeleted", { success: true });
      } catch (error) {
        console.error("Error deleting message:", error);
        socket.emit("error", { message: "Có lỗi xảy ra khi xóa tin nhắn" });
      }
    });

    // Edit message
    socket.on("editMessage", async (data) => {
      try {
        const { messageId, conversationId, text, userId, isGroup } = data;

        // Find the message
        const message = await MessageModel.findById(messageId);

        if (!message) {
          return socket.emit("error", { message: "Tin nhắn không tồn tại" });
        }

        // Check if user is authorized to edit the message
        if (message.msgByUserId.toString() !== userId.toString()) {
          return socket.emit("error", { message: "Bạn không có quyền sửa tin nhắn này" });
        }

        // Update the message
        await MessageModel.findByIdAndUpdate(messageId, {
          text,
          isEdited: true,
        });

        // Retrieve updated conversation
        let updatedConversation;

        if (isGroup) {
          // For group chats, find by ID directly without querying by members
          updatedConversation = await ConversationModel.findById(conversationId)
            .populate("messages")
            .populate("members")
            .populate("groupAdmin");

          if (!updatedConversation) {
            console.error("Group conversation not found:", conversationId);
            return socket.emit("error", { message: "Không tìm thấy cuộc trò chuyện nhóm" });
          }

          // Extract member IDs safely
          const memberIds = [];

          if (updatedConversation.members && Array.isArray(updatedConversation.members)) {
            for (const member of updatedConversation.members) {
              if (member) {
                let memberId;
                if (typeof member === "object") {
                  memberId = member._id ? member._id.toString() : member.toString();
                } else {
                  memberId = member.toString();
                }
                memberIds.push(memberId);
              }
            }
          }

          // Notify all group members using the clean IDs
          for (const memberId of memberIds) {
            io.to(memberId).emit("groupMessage", updatedConversation);

            // Update sidebar for all members
            const memberConversations = await getConversation(memberId);
            io.to(memberId).emit("conversation", memberConversations);
          }
        } else {
          // Non-group chat logic remains unchanged
          updatedConversation = await ConversationModel.findOne({
            $or: [
              { _id: conversationId },
              { $and: [{ sender: userId }, { receiver: conversationId }] },
              { $and: [{ sender: conversationId }, { receiver: userId }] },
            ],
          }).populate("messages");

          const senderStr = updatedConversation.sender.toString();
          const receiverStr = updatedConversation.receiver.toString();

          // Emit updated conversation to both users
          io.to(senderStr).emit("message", updatedConversation);
          io.to(receiverStr).emit("message", updatedConversation);

          // Update sidebar for both users
          const senderConversations = await getConversation(senderStr);
          const receiverConversations = await getConversation(receiverStr);

          io.to(senderStr).emit("conversation", senderConversations);
          io.to(receiverStr).emit("conversation", receiverConversations);
        }

        socket.emit("messageEdited", { success: true });
      } catch (error) {
        console.error("Error editing message:", error);
        socket.emit("error", { message: "Có lỗi xảy ra khi sửa tin nhắn" });
      }
    });

    // Add reaction to message
    socket.on("addReaction", async (data) => {
      try {
        const { messageId, conversationId, emoji, userId, isGroup } = data;

        // Find the message
        const message = await MessageModel.findById(messageId);

        if (!message) {
          return socket.emit("error", { message: "Tin nhắn không tồn tại" });
        }

        // Get user's name for displaying in reaction
        const user = await UserModel.findById(userId);

        if (!user) {
          return socket.emit("error", { message: "Người dùng không tồn tại" });
        }

        // Check if user has already reacted with this emoji
        const existingReactionIndex = message.reactions?.findIndex(
          (reaction) => reaction.userId.toString() === userId.toString() && reaction.emoji === emoji
        );

        if (existingReactionIndex !== -1) {
          // Remove the reaction if it already exists (toggle behavior)
          message.reactions.splice(existingReactionIndex, 1);
        } else {
          // Add the new reaction
          if (!message.reactions) {
            message.reactions = [];
          }

          message.reactions.push({
            emoji,
            userId,
            userName: user.name,
          });
        }

        // Save the updated message
        await message.save();

        // Retrieve updated conversation
        let updatedConversation;
        if (isGroup) {
          updatedConversation = await ConversationModel.findById(conversationId)
            .populate("messages")
            .populate("members")
            .populate("groupAdmin");

          // Notify all group members
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

          // Emit updated conversation to both users
          io.to(senderStr).emit("message", updatedConversation);
          io.to(receiverStr).emit("message", updatedConversation);
        }

        socket.emit("reactionAdded", { success: true });
      } catch (error) {
        console.error("Error adding reaction:", error);
        socket.emit("error", { message: "Có lỗi xảy ra khi thêm cảm xúc" });
      }
    });

    // Call signaling events
    socket.on("call-user", async (data) => {
      try {
        const { callerId, receiverId, callerName, callerImage, isVideoCall, signal } = data;

        // Check if receiver is online - enhanced check
        if (!onlineUser.has(receiverId)) {
          socket.emit("call-failed", { message: "Người dùng hiện không trực tuyến" });
          return;
        }

        // Create a call notification message
        const callNotificationMessage = await MessageModel.create({
          text: isVideoCall ? "Cuộc gọi video" : "Cuộc gọi thoại",
          msgByUserId: callerId,
          callData: {
            callType: isVideoCall ? "video" : "audio",
            callStatus: "missed", // Initially set as missed, will be updated if answered
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

        // Emit the call to the receiver
        io.to(receiverId).emit("incoming-call", {
          callerId,
          callerName,
          callerImage,
          isVideoCall,
          signal,
          messageId: callNotificationMessage._id,
        });

        // Update sidebar for both users
        const callerConversations = await getConversation(callerId);
        const receiverConversations = await getConversation(receiverId);

        io.to(callerId).emit("conversation", callerConversations);
        io.to(receiverId).emit("conversation", receiverConversations);
      } catch (error) {
        console.error("Error in call-user event:", error);
        socket.emit("call-failed", { message: "Có lỗi xảy ra khi gọi điện" });
      }
    });

    socket.on("answer-call", async (data) => {
      try {
        const { callerId, signal, messageId } = data;

        // Update the call message to "answered"
        if (messageId) {
          await MessageModel.findByIdAndUpdate(messageId, { "callData.callStatus": "answered" });
        }

        // Emit answer to the caller
        io.to(callerId).emit("call-accepted", { signal });
      } catch (error) {
        console.error("Error in answer-call event:", error);
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

    // Handle explicit user logout
    socket.on("user-logout", () => {
      console.log("User logged out: ", userId.toString());
      onlineUser.delete(userId.toString());
      io.emit("onlineUser", Array.from(onlineUser));
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log("User disconnected", socket.id);
      onlineUser.delete(userId.toString());
      io.emit("onlineUser", Array.from(onlineUser));
    });
  } catch (error) {
    console.error("Error during socket connection:", error);
  }
});

module.exports = {
  app,
  server,
};
