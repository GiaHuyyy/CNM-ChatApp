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

  // Remove member from group - Update to allow deputy admins to remove regular members
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
      const memberIdStr = typeof memberId === "object" ? memberId.toString() : memberId;

      // Check if user trying to remove is either admin or deputy
      const isMainAdmin = adminIdStr === groupAdminIdStr;
      const isDeputyAdmin =
        groupConversation.deputyAdmins && groupConversation.deputyAdmins.some((id) => id.toString() === adminIdStr);

      // Check if target is admin or deputy
      const isTargetAdmin = memberIdStr === groupAdminIdStr;
      const isTargetDeputy =
        groupConversation.deputyAdmins && groupConversation.deputyAdmins.some((id) => id.toString() === memberIdStr);

      // Permission rules:
      // 1. Admin can remove anyone except themselves
      // 2. Deputy can remove regular members only (not admin or other deputies)
      if (!isMainAdmin && !isDeputyAdmin) {
        socket.emit("memberRemovedFromGroup", {
          success: false,
          message: "Bạn không có quyền xóa thành viên khỏi nhóm này",
        });
        return;
      }

      // Deputy admins cannot remove admin or other deputies
      if (isDeputyAdmin && !isMainAdmin && (isTargetAdmin || isTargetDeputy)) {
        socket.emit("memberRemovedFromGroup", {
          success: false,
          message: "Phó nhóm không thể xóa quản trị viên hoặc phó nhóm khác",
        });
        return;
      }

      // Get user details for notification message
      const memberToRemove = await UserModel.findById(memberId);
      const admin = await UserModel.findById(adminId);

      // Remove the member
      await ConversationModel.findByIdAndUpdate(groupId, { $pull: { members: memberId } });

      // Create notification message
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

  // Delete group
  socket.on("deleteGroup", async (data) => {
    try {
      const { groupId, userId } = data;

      // Clean and validate IDs
      const userIdStr = typeof userId === "object" ? userId.toString() : userId;

      console.log("Group deletion request received:", { groupId, userId: userIdStr });

      // Find the group
      const groupConversation = await ConversationModel.findById(groupId);

      if (!groupConversation || !groupConversation.isGroup) {
        socket.emit("groupDeleted", {
          success: false,
          message: "Nhóm không tồn tại",
        });
        return;
      }

      // Check permissions - only admin can delete
      const groupAdminId = groupConversation.groupAdmin.toString();

      if (groupAdminId !== userIdStr) {
        socket.emit("groupDeleted", {
          success: false,
          message: "Chỉ quản trị viên mới có thể giải tán nhóm",
        });
        return;
      }

      // Get all members for notification
      const memberIds = groupConversation.members.map((id) => id.toString());

      // Delete all messages in the group
      if (groupConversation.messages && groupConversation.messages.length > 0) {
        await MessageModel.deleteMany({ _id: { $in: groupConversation.messages } });
      }

      // Delete the group conversation
      await ConversationModel.findByIdAndDelete(groupId);

      // Send success response to requester
      socket.emit("groupDeleted", {
        success: true,
        message: "Nhóm đã được giải tán thành công",
      });

      // Update sidebar for all members
      for (const memberId of memberIds) {
        const memberConversations = await getConversation(memberId);
        io.to(memberId).emit("conversation", memberConversations);

        // Notify members that group was deleted
        if (memberId !== userIdStr) {
          io.to(memberId).emit("groupRemoved", {
            groupId,
            message: "Nhóm đã bị giải tán bởi quản trị viên",
          });
        }
      }

      console.log("Group deleted successfully:", groupId);
    } catch (error) {
      console.error("Error deleting group:", error);
      socket.emit("groupDeleted", {
        success: false,
        message: "Có lỗi xảy ra khi giải tán nhóm",
      });
    }
  });

  // For backwards compatibility - alias for deleteGroup
  socket.on("disbandGroup", async (data) => {
    try {
      console.log("Received disbandGroup event, forwarding to deleteGroup handler");
      // Forward the event to the main deleteGroup handler
      socket.emit("deleteGroup", data);
    } catch (error) {
      console.error("Error in disbandGroup handler:", error);
      socket.emit("groupDeleted", {
        success: false,
        message: "Có lỗi xảy ra khi giải tán nhóm",
      });
    }
  });

  // Add to the groupHandler function
  socket.on("toggleDeputyAdmin", async (data) => {
    try {
      const { groupId, memberId, isPromoting, adminId } = data;

      // Find the group conversation
      const groupConversation = await ConversationModel.findById(groupId);

      if (!groupConversation || !groupConversation.isGroup) {
        socket.emit("deputyAdminUpdated", {
          success: false,
          message: "Nhóm không tồn tại",
        });
        return;
      }

      // Check if the user is the admin
      const adminIdStr = typeof adminId === "object" ? adminId.toString() : adminId;
      const groupAdminStr = groupConversation.groupAdmin.toString();

      if (adminIdStr !== groupAdminStr) {
        socket.emit("deputyAdminUpdated", {
          success: false,
          message: "Bạn không có quyền thực hiện hành động này",
        });
        return;
      }

      // Initialize deputyAdmins array if it doesn't exist
      if (!groupConversation.deputyAdmins) {
        groupConversation.deputyAdmins = [];
      }

      const memberIdStr = typeof memberId === "object" ? memberId.toString() : memberId;

      // Check if member exists in the group
      if (!groupConversation.members.some((m) => m.toString() === memberIdStr)) {
        socket.emit("deputyAdminUpdated", {
          success: false,
          message: "Thành viên không tồn tại trong nhóm",
        });
        return;
      }

      // Get member details
      const member = await UserModel.findById(memberId);

      if (isPromoting) {
        // Add as deputy if not already one
        if (!groupConversation.deputyAdmins.some((id) => id.toString() === memberIdStr)) {
          await ConversationModel.findByIdAndUpdate(groupId, { $push: { deputyAdmins: memberId } }, { new: true });

          // Create notification message
          const notificationMessage = await MessageModel.create({
            text: `${member.name} đã được thêm làm phó nhóm`,
            msgByUserId: adminId,
            seenBy: [adminId],
          });

          await ConversationModel.findByIdAndUpdate(groupId, { $push: { messages: notificationMessage._id } });

          socket.emit("deputyAdminUpdated", {
            success: true,
            message: `Đã thêm ${member.name} làm phó nhóm`,
          });
        } else {
          socket.emit("deputyAdminUpdated", {
            success: false,
            message: "Người dùng đã là phó nhóm",
          });
        }
      } else {
        // Remove from deputy admins
        await ConversationModel.findByIdAndUpdate(groupId, { $pull: { deputyAdmins: memberId } }, { new: true });

        // Create notification message
        const notificationMessage = await MessageModel.create({
          text: `${member.name} đã bị hủy quyền phó nhóm`,
          msgByUserId: adminId,
          seenBy: [adminId],
        });

        await ConversationModel.findByIdAndUpdate(groupId, { $push: { messages: notificationMessage._id } });

        socket.emit("deputyAdminUpdated", {
          success: true,
          message: `Đã hủy quyền phó nhóm của ${member.name}`,
        });
      }

      // Update group data for all members
      const updatedGroup = await ConversationModel.findById(groupId)
        .populate("members")
        .populate("messages")
        .populate("groupAdmin")
        .populate("deputyAdmins");

      // Log to confirm deputyAdmins is included in the data
      console.log("Updated group with deputies:", {
        groupId,
        hasDeputies: Boolean(updatedGroup.deputyAdmins && updatedGroup.deputyAdmins.length),
        deputyCount: updatedGroup.deputyAdmins?.length || 0,
      });

      for (const memberId of groupConversation.members) {
        const memberIdStr =
          typeof memberId === "object"
            ? memberId._id
              ? memberId._id.toString()
              : memberId.toString()
            : memberId.toString();

        io.to(memberIdStr).emit("groupMessage", updatedGroup);

        // Update sidebar for all members
        const memberConversations = await getConversation(memberIdStr);
        io.to(memberIdStr).emit("conversation", memberConversations);
      }
    } catch (error) {
      console.error("Error toggling deputy admin status:", error);
      socket.emit("deputyAdminUpdated", {
        success: false,
        message: "Có lỗi xảy ra khi cập nhật quyền phó nhóm",
      });
    }
  });

  // Toggle mute member - Add to handle deputy admin permissions
  socket.on("toggleMuteMember", async (data) => {
    try {
      const { groupId, memberId, adminId, isMuting } = data;

      // Find the group conversation
      const groupConversation = await ConversationModel.findById(groupId);

      if (!groupConversation || !groupConversation.isGroup) {
        socket.emit("memberMuteToggled", {
          success: false,
          message: "Nhóm không tồn tại",
        });
        return;
      }

      // Convert IDs to strings for consistent comparison
      const adminIdStr = typeof adminId === "object" ? adminId.toString() : adminId;
      const groupAdminIdStr = groupConversation.groupAdmin.toString();
      const memberIdStr = typeof memberId === "object" ? memberId.toString() : memberId;

      // Check permissions - admin or deputy admin
      const isMainAdmin = adminIdStr === groupAdminIdStr;
      const isDeputyAdmin =
        groupConversation.deputyAdmins && groupConversation.deputyAdmins.some((id) => id.toString() === adminIdStr);

      // Check if target is admin or deputy
      const isTargetAdmin = memberIdStr === groupAdminIdStr;
      const isTargetDeputy =
        groupConversation.deputyAdmins && groupConversation.deputyAdmins.some((id) => id.toString() === memberIdStr);

      // Validate permissions
      if (!isMainAdmin && !isDeputyAdmin) {
        socket.emit("memberMuteToggled", {
          success: false,
          message: "Bạn không có quyền tắt quyền chat trong nhóm này",
        });
        return;
      }

      // Deputy admins cannot mute admin or other deputies
      if (isDeputyAdmin && !isMainAdmin && (isTargetAdmin || isTargetDeputy)) {
        socket.emit("memberMuteToggled", {
          success: false,
          message: "Phó nhóm không thể tắt quyền chat của quản trị viên hoặc phó nhóm khác",
        });
        return;
      }

      // No one can mute the admin
      if (isTargetAdmin) {
        socket.emit("memberMuteToggled", {
          success: false,
          message: "Không thể tắt quyền chat của quản trị viên nhóm",
        });
        return;
      }

      // Get user details
      const member = await UserModel.findById(memberId);
      const admin = await UserModel.findById(adminId);

      // Handle the mute/unmute operation
      if (isMuting) {
        // Add to muted members if not already muted
        await ConversationModel.findByIdAndUpdate(groupId, { $addToSet: { mutedMembers: memberId } }, { new: true });

        // Create notification message
        const notificationMessage = await MessageModel.create({
          text: `${admin.name} đã tắt quyền nhắn tin của ${member.name}`,
          msgByUserId: adminId,
          seenBy: [adminId],
        });

        await ConversationModel.findByIdAndUpdate(groupId, { $push: { messages: notificationMessage._id } });

        socket.emit("memberMuteToggled", {
          success: true,
          message: `Đã tắt quyền nhắn tin của ${member.name}`,
        });
      } else {
        // Remove from muted members
        await ConversationModel.findByIdAndUpdate(groupId, { $pull: { mutedMembers: memberId } }, { new: true });

        // Create notification message
        const notificationMessage = await MessageModel.create({
          text: `${admin.name} đã mở quyền nhắn tin cho ${member.name}`,
          msgByUserId: adminId,
          seenBy: [adminId],
        });

        await ConversationModel.findByIdAndUpdate(groupId, { $push: { messages: notificationMessage._id } });

        socket.emit("memberMuteToggled", {
          success: true,
          message: `Đã mở quyền nhắn tin cho ${member.name}`,
        });
      }

      // Update group data for all members
      const updatedGroup = await ConversationModel.findById(groupId)
        .populate("members")
        .populate("messages")
        .populate("groupAdmin")
        .populate("deputyAdmins");

      for (const memberId of groupConversation.members) {
        const memberIdStr =
          typeof memberId === "object"
            ? memberId._id
              ? memberId._id.toString()
              : memberId.toString()
            : memberId.toString();

        io.to(memberIdStr).emit("groupMessage", updatedGroup);
      }
    } catch (error) {
      console.error("Error toggling member mute status:", error);
      socket.emit("memberMuteToggled", {
        success: false,
        message: "Có lỗi xảy ra khi thay đổi quyền nhắn tin",
      });
    }
  });

  // When joining a room, make sure we populate deputyAdmins
  socket.on("joinRoom", async (roomName) => {
    try {
      // ...existing code...

      const conversation = await ConversationModel.findById(roomName)
        .populate("members")
        .populate({
          path: "messages",
          // ...existing code...
        })
        .populate("groupAdmin")
        .populate("deputyAdmins"); // Make sure this is added

      // ...existing code...
    } catch (error) {
      // ...existing code...
    }
  });

  // Handle transferring admin rights and leaving the group
  socket.on("transferAdminAndLeave", async (data) => {
    try {
      const { groupId, newAdminId, currentAdminId } = data;

      // Clean and validate IDs
      const newAdminIdStr = typeof newAdminId === "object" ? newAdminId.toString() : newAdminId;
      const currentAdminIdStr = typeof currentAdminId === "object" ? currentAdminId.toString() : currentAdminId;

      // Find the group conversation
      const groupConversation = await ConversationModel.findById(groupId);

      if (!groupConversation || !groupConversation.isGroup) {
        socket.emit("adminTransferred", {
          success: false,
          message: "Nhóm không tồn tại",
        });
        return;
      }

      // Check if the requester is the current admin
      const groupAdminStr = groupConversation.groupAdmin.toString();
      if (groupAdminStr !== currentAdminIdStr) {
        socket.emit("adminTransferred", {
          success: false,
          message: "Bạn không phải là quản trị viên của nhóm này",
        });
        return;
      }

      // Check if the new admin is a member of the group
      const isMember = groupConversation.members.some((id) => id.toString() === newAdminIdStr);
      if (!isMember) {
        socket.emit("adminTransferred", {
          success: false,
          message: "Người dùng được chọn không phải là thành viên của nhóm",
        });
        return;
      }

      // Get user details for notifications
      const currentAdmin = await UserModel.findById(currentAdminIdStr);
      const newAdmin = await UserModel.findById(newAdminIdStr);

      if (!currentAdmin || !newAdmin) {
        socket.emit("adminTransferred", {
          success: false,
          message: "Không thể tìm thấy thông tin người dùng",
        });
        return;
      }

      // Update group admin
      await ConversationModel.findByIdAndUpdate(groupId, {
        groupAdmin: newAdminIdStr,
        // If the current admin is also in deputyAdmins, remove them from there
        $pull: { deputyAdmins: currentAdminIdStr },
      });

      // Create notification message about admin transfer
      const transferMessage = await MessageModel.create({
        text: `${currentAdmin.name} đã chuyển quyền quản trị nhóm cho ${newAdmin.name}`,
        msgByUserId: currentAdminIdStr,
        seenBy: [currentAdminIdStr],
      });

      await ConversationModel.findByIdAndUpdate(groupId, { $push: { messages: transferMessage._id } });

      // Remove current admin from the group
      await ConversationModel.findByIdAndUpdate(groupId, { $pull: { members: currentAdminIdStr } });

      // Create notification message about admin leaving
      const leaveMessage = await MessageModel.create({
        text: `${currentAdmin.name} đã rời nhóm`,
        msgByUserId: currentAdminIdStr,
        seenBy: [currentAdminIdStr],
      });

      await ConversationModel.findByIdAndUpdate(groupId, { $push: { messages: leaveMessage._id } });

      // Get updated group data
      const updatedGroup = await ConversationModel.findById(groupId)
        .populate("members")
        .populate("messages")
        .populate("groupAdmin")
        .populate("deputyAdmins");

      // Notify all members of the change
      const remainingMembers = groupConversation.members
        .filter((id) => id.toString() !== currentAdminIdStr)
        .map((id) => id.toString());

      for (const memberId of remainingMembers) {
        io.to(memberId).emit("groupMessage", updatedGroup);
        const memberConversations = await getConversation(memberId);
        io.to(memberId).emit("conversation", memberConversations);
      }

      // Update conversation list for the admin who left
      const adminConversations = await getConversation(currentAdminIdStr);
      io.to(currentAdminIdStr).emit("conversation", adminConversations);

      // Send success response to the admin who initiated the transfer
      socket.emit("adminTransferred", {
        success: true,
        message: `Đã chuyển quyền quản trị cho ${newAdmin.name} và rời nhóm thành công`,
      });
    } catch (error) {
      console.error("Error transferring admin and leaving group:", error);
      socket.emit("adminTransferred", {
        success: false,
        message: "Có lỗi xảy ra khi chuyển quyền quản trị và rời nhóm",
      });
    }
  });
};

module.exports = groupHandler;
