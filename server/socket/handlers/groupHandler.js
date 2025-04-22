const { ConversationModel, MessageModel } = require("../../models/ConversationModel");
const UserModel = require("../../models/UserModel");
const getConversation = require("../../helpers/getConversation");

const groupHandler = (io, socket, userId) => {
  // Create Group Chat
  socket.on("createGroupChat", async (groupData) => {
    try {
      const { name, members, creator } = groupData;

      if (!name || !members || members.length < 3) {
        socket.emit("groupCreated", {
          success: false,
          message: "Nhóm phải có ít nhất 3 thành viên (bạn và 2 người khác)",
        });
        return;
      }

      // Get creator details for welcome message
      const creatorUser = await UserModel.findById(creator);
      if (!creatorUser) {
        socket.emit("groupCreated", {
          success: false,
          message: "Không thể tìm thấy thông tin người tạo nhóm",
        });
        return;
      }

      const memberIds = members.map((id) => (typeof id === "object" ? id.toString() : id));

      const welcomeMessage = await MessageModel.create({
        text: `${creatorUser.name} đã tạo nhóm "${name}"`,
        msgByUserId: creator,
      });

      const newGroupConversation = await ConversationModel.create({
        name,
        sender: creator,
        receiver: creator,
        isGroup: true,
        members: memberIds,
        groupAdmin: creator,
        messages: [welcomeMessage._id],
      });

      const populatedConversation = await ConversationModel.findById(newGroupConversation._id)
        .populate("members")
        .populate("messages");

      for (const memberId of memberIds) {
        const memberConversations = await getConversation(memberId);
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

      const messageUpdateResults = await Promise.all(
        conversation.messages.map(async (messageId) => {
          return MessageModel.updateOne(
            {
              _id: messageId,
              msgByUserId: { $ne: userId },
              seenBy: { $ne: userId },
            },
            { $addToSet: { seenBy: userId } }
          );
        })
      );

      const updatedCount = messageUpdateResults.reduce((count, result) => count + (result.modifiedCount || 0), 0);

      if (updatedCount > 0) {
        console.log(`Marked ${updatedCount} messages as seen for user ${userId}`);

        for (const memberId of conversation.members) {
          const memberConversations = await getConversation(memberId.toString());
          io.to(memberId.toString()).emit("conversation", memberConversations);
        }
      }
    } catch (error) {
      console.error("Error handling seenGroup event:", error);
    }
  });

  // Add members to group
  socket.on("addMembersToGroup", async (data) => {
    try {
      const { groupId, newMembers, addedBy } = data;

      const groupConversation = await ConversationModel.findById(groupId).populate("members").populate("groupAdmin");

      if (!groupConversation || !groupConversation.isGroup) {
        socket.emit("membersAddedToGroup", {
          success: false,
          message: "Nhóm không tồn tại",
        });
        return;
      }

      if (!groupConversation.members.some((member) => member._id.toString() === addedBy)) {
        socket.emit("membersAddedToGroup", {
          success: false,
          message: "Bạn không có quyền thêm thành viên vào nhóm này",
        });
        return;
      }

      const currentMemberIds = groupConversation.members.map((member) => member._id.toString());
      const validNewMembers = newMembers.filter((id) => !currentMemberIds.includes(id));

      if (validNewMembers.length === 0) {
        socket.emit("membersAddedToGroup", {
          success: false,
          message: "Tất cả người dùng đã trong nhóm",
        });
        return;
      }

      const adder = await UserModel.findById(addedBy);

      await ConversationModel.findByIdAndUpdate(
        groupId,
        { $push: { members: { $each: validNewMembers } } },
        { new: true }
      );

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

      await ConversationModel.findByIdAndUpdate(groupId, { $push: { messages: notificationMessage._id } });

      // Notify all members including new ones
      const updatedGroup = await ConversationModel.findById(groupId)
        .populate("messages")
        .populate("members")
        .populate("groupAdmin");

      const allMembers = [...currentMemberIds, ...validNewMembers];
      for (const memberId of allMembers) {
        const memberConversations = await getConversation(memberId);
        io.to(memberId).emit("conversation", memberConversations);
        io.to(memberId).emit("groupMessage", updatedGroup);
      }

      socket.emit("membersAddedToGroup", {
        success: true,
        message: "Đã thêm thành viên vào nhóm thành công",
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

      const groupConversation = await ConversationModel.findById(groupId);

      if (!groupConversation || !groupConversation.isGroup) {
        socket.emit("memberRemovedFromGroup", {
          success: false,
          message: "Nhóm không tồn tại",
        });
        return;
      }

      const adminIdStr = typeof adminId === "object" ? adminId.toString() : adminId;
      const groupAdminIdStr = groupConversation.groupAdmin.toString();

      if (adminIdStr !== groupAdminIdStr) {
        socket.emit("memberRemovedFromGroup", {
          success: false,
          message: "Bạn không có quyền xóa thành viên khỏi nhóm này",
        });
        return;
      }

      const memberToRemove = await UserModel.findById(memberId);
      const admin = await UserModel.findById(adminId);

      await ConversationModel.findByIdAndUpdate(groupId, { $pull: { members: memberId } });

      const notificationMessage = await MessageModel.create({
        text: `${admin.name} đã xóa ${memberToRemove.name} khỏi nhóm`,
        msgByUserId: adminId,
        seenBy: [adminId],
      });

      await ConversationModel.findByIdAndUpdate(groupId, { $push: { messages: notificationMessage._id } });

      const updatedGroup = await ConversationModel.findById(groupId)
        .populate("messages")
        .populate("members")
        .populate("groupAdmin");

      const remainingMembers = groupConversation.members
        .filter((id) => id.toString() !== memberId.toString())
        .map((id) => id.toString());

      for (const currentMemberId of remainingMembers) {
        io.to(currentMemberId).emit("groupMessage", updatedGroup);
        const memberConversations = await getConversation(currentMemberId);
        io.to(currentMemberId).emit("conversation", memberConversations);
      }

      const removedMemberConversations = await getConversation(memberId);
      io.to(memberId).emit("conversation", removedMemberConversations);
      io.to(memberId).emit("removedFromGroup", { groupId });

      socket.emit("memberRemovedFromGroup", {
        success: true,
        message: "Đã xóa thành viên khỏi nhóm",
      });
    } catch (error) {
      console.error("Error removing member from group:", error);
      socket.emit("memberRemovedFromGroup", {
        success: false,
        message: "Có lỗi xảy ra khi xóa thành viên",
      });
    }
  });
};

module.exports = groupHandler;
