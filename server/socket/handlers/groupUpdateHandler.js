const { ConversationModel, MessageModel } = require("../../models/ConversationModel");
const UserModel = require("../../models/UserModel");
const getConversation = require("../../helpers/getConversation");
const mongoose = require("mongoose");

const groupUpdateHandler = (io, socket, userId) => {
  socket.on("updateGroupDetails", async (data) => {
    try {
      const { groupId, adminId, name, profilePic } = data;

      // Find the group conversation
      const groupConversation = await ConversationModel.findById(groupId);

      if (!groupConversation || !groupConversation.isGroup) {
        socket.emit("groupDetailsUpdated", {
          success: false,
          message: "Nhóm không tồn tại",
        });
        return;
      }

      // Check if user is admin of the group
      const adminIdStr = typeof adminId === "object" ? adminId.toString() : adminId;
      const groupAdminIdStr = groupConversation.groupAdmin.toString();

      if (adminIdStr !== groupAdminIdStr) {
        socket.emit("groupDetailsUpdated", {
          success: false,
          message: "Bạn không có quyền chỉnh sửa thông tin nhóm",
        });
        return;
      }

      // Keep track of what was updated
      const updatedFields = [];

      // Check if name was changed
      if (name && name !== groupConversation.name) {
        updatedFields.push("tên nhóm");
        groupConversation.name = name;
      }

      // Check if profile picture was changed
      if (profilePic && profilePic !== groupConversation.profilePic) {
        updatedFields.push("ảnh nhóm");
        groupConversation.profilePic = profilePic;
      }

      // Save changes
      await groupConversation.save();

      // Get admin details for notification
      const admin = await UserModel.findById(adminId);

      if (!admin) {
        socket.emit("groupDetailsUpdated", {
          success: false,
          message: "Không thể tìm thấy thông tin người dùng",
        });
        return;
      }

      // Only create notification if something changed
      if (updatedFields.length > 0) {
        // Create notification message
        const notification = `${admin.name} đã thay đổi ${updatedFields.join(" và ")}`;

        const notificationMessage = await MessageModel.create({
          text: notification,
          msgByUserId: adminId,
          seenBy: [adminId],
        });

        // Add notification to conversation
        await ConversationModel.findByIdAndUpdate(groupId, {
          $push: { messages: notificationMessage._id },
        });
      }

      // Get updated group
      const updatedGroup = await ConversationModel.findById(groupId)
        .populate("members")
        .populate("messages")
        .populate("groupAdmin")
        .populate("mutedMembers");

      // Notify all members about the update
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

      socket.emit("groupDetailsUpdated", {
        success: true,
        message: `Cập nhật thông tin nhóm thành công`,
      });
    } catch (error) {
      console.error("Error updating group details:", error);
      socket.emit("groupDetailsUpdated", {
        success: false,
        message: "Có lỗi xảy ra khi cập nhật thông tin nhóm",
      });
    }
  });
};

module.exports = groupUpdateHandler;
