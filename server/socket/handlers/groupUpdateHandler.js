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

  socket.on("muteMember", async (data) => {
    try {
      const { groupId, memberId, adminId } = data;

      // Find the group conversation
      const groupConversation = await ConversationModel.findById(groupId);

      if (!groupConversation || !groupConversation.isGroup) {
        socket.emit("memberMuteToggled", {
          success: false,
          message: "Nhóm không tồn tại",
        });
        return;
      }

      // Check if user is admin of the group
      const adminIdStr = typeof adminId === "object" ? adminId.toString() : adminId;
      const groupAdminIdStr = groupConversation.groupAdmin.toString();

      if (adminIdStr !== groupAdminIdStr) {
        socket.emit("memberMuteToggled", {
          success: false,
          message: "Bạn không có quyền áp dụng tính năng này",
        });
        return;
      }

      // Check if member is in the group
      const memberIdObj = mongoose.Types.ObjectId.isValid(memberId) ? new mongoose.Types.ObjectId(memberId) : memberId;

      const isMember = groupConversation.members.some((m) => m.toString() === memberIdObj.toString());

      if (!isMember) {
        socket.emit("memberMuteToggled", {
          success: false,
          message: "Thành viên không thuộc nhóm này",
        });
        return;
      }

      // Check if member is already muted
      const isMuted =
        groupConversation.mutedMembers &&
        groupConversation.mutedMembers.some((m) => m.toString() === memberIdObj.toString());

      if (isMuted) {
        socket.emit("memberMuteToggled", {
          success: false,
          message: "Thành viên đã bị tắt quyền chat",
        });
        return;
      }

      // Add to mutedMembers array
      await ConversationModel.findByIdAndUpdate(groupId, { $addToSet: { mutedMembers: memberIdObj } });

      // Get updated group and member info
      const updatedGroup = await ConversationModel.findById(groupId)
        .populate("members")
        .populate("messages")
        .populate("groupAdmin")
        .populate("mutedMembers");

      const mutedMember = await UserModel.findById(memberId);
      const admin = await UserModel.findById(adminId);

      // Create notification message
      const notificationMessage = await MessageModel.create({
        text: `${admin.name} đã tắt quyền nhắn tin của ${mutedMember.name}`,
        msgByUserId: adminId,
        seenBy: [adminId],
      });

      // Add notification to conversation
      await ConversationModel.findByIdAndUpdate(groupId, {
        $push: { messages: notificationMessage._id },
      });

      // Notify all members about the update
      for (const member of updatedGroup.members) {
        const memberIdStr =
          typeof member === "object" ? (member._id ? member._id.toString() : member.toString()) : member.toString();

        // Send updated group data
        io.to(memberIdStr).emit("groupMessage", updatedGroup);

        // Update sidebar conversations
        const memberConversations = await getConversation(memberIdStr);
        io.to(memberIdStr).emit("conversation", memberConversations);
      }

      socket.emit("memberMuteToggled", {
        success: true,
        message: `Đã tắt quyền nhắn tin của ${mutedMember.name}`,
        action: "muted",
        memberId: memberId,
      });
    } catch (error) {
      console.error("Error muting member:", error);
      socket.emit("memberMuteToggled", {
        success: false,
        message: "Có lỗi xảy ra khi tắt quyền chat",
      });
    }
  });

  socket.on("unmuteMember", async (data) => {
    try {
      const { groupId, memberId, adminId } = data;

      // Find the group conversation
      const groupConversation = await ConversationModel.findById(groupId);

      if (!groupConversation || !groupConversation.isGroup) {
        socket.emit("memberMuteToggled", {
          success: false,
          message: "Nhóm không tồn tại",
        });
        return;
      }

      // Check if user is admin of the group
      const adminIdStr = typeof adminId === "object" ? adminId.toString() : adminId;
      const groupAdminIdStr = groupConversation.groupAdmin.toString();

      if (adminIdStr !== groupAdminIdStr) {
        socket.emit("memberMuteToggled", {
          success: false,
          message: "Bạn không có quyền áp dụng tính năng này",
        });
        return;
      }

      // Check if member is in the group
      const memberIdObj = mongoose.Types.ObjectId.isValid(memberId) ? new mongoose.Types.ObjectId(memberId) : memberId;

      const isMember = groupConversation.members.some((m) => m.toString() === memberIdObj.toString());

      if (!isMember) {
        socket.emit("memberMuteToggled", {
          success: false,
          message: "Thành viên không thuộc nhóm này",
        });
        return;
      }

      // Check if member is muted
      const isMuted =
        groupConversation.mutedMembers &&
        groupConversation.mutedMembers.some((m) => m.toString() === memberIdObj.toString());

      if (!isMuted) {
        socket.emit("memberMuteToggled", {
          success: false,
          message: "Thành viên đã có quyền chat",
        });
        return;
      }

      // Remove from mutedMembers array
      await ConversationModel.findByIdAndUpdate(groupId, { $pull: { mutedMembers: memberIdObj } });

      // Get updated group and member info
      const updatedGroup = await ConversationModel.findById(groupId)
        .populate("members")
        .populate("messages")
        .populate("groupAdmin")
        .populate("mutedMembers");

      const unmutedMember = await UserModel.findById(memberId);
      const admin = await UserModel.findById(adminId);

      // Create notification message
      const notificationMessage = await MessageModel.create({
        text: `${admin.name} đã mở quyền nhắn tin cho ${unmutedMember.name}`,
        msgByUserId: adminId,
        seenBy: [adminId],
      });

      // Add notification to conversation
      await ConversationModel.findByIdAndUpdate(groupId, {
        $push: { messages: notificationMessage._id },
      });

      // Notify all members about the update
      for (const member of updatedGroup.members) {
        const memberIdStr =
          typeof member === "object" ? (member._id ? member._id.toString() : member.toString()) : member.toString();

        // Send updated group data
        io.to(memberIdStr).emit("groupMessage", updatedGroup);

        // Update sidebar conversations
        const memberConversations = await getConversation(memberIdStr);
        io.to(memberIdStr).emit("conversation", memberConversations);
      }

      socket.emit("memberMuteToggled", {
        success: true,
        message: `Đã mở quyền nhắn tin cho ${unmutedMember.name}`,
        action: "unmuted",
        memberId: memberId,
      });
    } catch (error) {
      console.error("Error unmuting member:", error);
      socket.emit("memberMuteToggled", {
        success: false,
        message: "Có lỗi xảy ra khi mở lại quyền chat",
      });
    }
  });
};

module.exports = groupUpdateHandler;
