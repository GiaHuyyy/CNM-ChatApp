const FriendModel = require("../../models/FriendModel");
const UserModel = require("../../models/UserModel");
const mongoose = require("mongoose");

const friendHandler = (io, socket, userId) => {
  console.log(`Initializing friendHandler for user: ${userId}`);

  // helper: đếm và emit count đến user
  const emitPendingCount = async (targetId) => {
    const cnt = await FriendModel.countDocuments({
      receiver: targetId,
      status: "pending",
    });
    io.to(targetId.toString()).emit("pendingRequestsCount", cnt);
  };

  // Send a friend request
  socket.on("sendFriendRequest", async (data) => {
    console.log(`Received sendFriendRequest event:`, data);
    try {
      const { receiverId } = data;
      
      if (!receiverId) {
        console.error("Invalid receiverId in sendFriendRequest");
        return socket.emit("friendRequestError", {
          success: false,
          message: "ID người nhận không hợp lệ"
        });
      }

      // Phản hồi nhanh để thông báo đang xử lý
      socket.emit("friendRequestProcessing", {
        success: true,
        message: "Đang xử lý lời mời kết bạn...",
        receiverId
      });

      // Kiểm tra xem có lời mời nào đã tồn tại không
      const existingRequest = await FriendModel.findOne({
        $or: [
          { sender: userId, receiver: receiverId },
          { sender: receiverId, receiver: userId },
        ],
      });

      if (existingRequest) {
        console.log(`Friend request already exists: ${existingRequest._id}`);
        return socket.emit("friendRequestError", {
          success: false,
          message: "Lời mời kết bạn đã tồn tại",
          status: existingRequest.status
        });
      }

      // Tạo lời mời kết bạn mới
      const newFriendRequest = await FriendModel.create({
        sender: userId,
        receiver: receiverId,
      });
      
      console.log(`New friend request created: ${newFriendRequest._id}`);
      
      // Lấy thông tin người gửi
      const sender = await UserModel.findById(userId).select("name email profilePic");
      
      // Thông báo cho người gửi
      socket.emit("friendRequestSent", {
        success: true,
        message: "Đã gửi lời mời kết bạn",
        data: newFriendRequest
      });

      // Thông báo cho người nhận
      console.log(`Sending receiveFriendRequest to user: ${receiverId}`);
      io.to(receiverId.toString()).emit("receiveFriendRequest", {
        requestId: newFriendRequest._id,
        sender: sender
      });
      await emitPendingCount(receiverId);   // <= thêm
    } catch (error) {
      console.error("Send friend request error:", error);
      socket.emit("friendRequestError", {
        success: false,
        message: "Lỗi khi gửi lời mời kết bạn: " + (error.message || "Không xác định")
      });
    }
  });

  // Cancel a friend request
  socket.on("cancelFriendRequest", async (data) => {
    try {
      const { requestId, receiverId } = data;
      
      // Validate required fields
      if (!requestId || !receiverId) {
        return socket.emit("friendRequestError", {
          success: false,
          message: "Thiếu thông tin cần thiết"
        });
      }

      // Find the friend request
      const friendRequest = await FriendModel.findOne({
        _id: requestId,
        sender: userId,
        receiver: receiverId,
        status: "pending"
      });

      if (!friendRequest) {
        return socket.emit("friendRequestError", {
          success: false,
          message: "Không tìm thấy lời mời kết bạn hoặc bạn không có quyền hủy"
        });
      }

      // Get sender details to include in notification
      const sender = await UserModel.findById(userId).select("name email profilePic");

      // Delete the friend request
      await FriendModel.findByIdAndDelete(requestId);

      // Notify the sender
      socket.emit("friendRequestCancelled", {
        success: true,
        message: "Đã hủy lời mời kết bạn",
        requestId: requestId
      });

      // Notify the receiver
      io.to(receiverId.toString()).emit("friendRequestCancelled", {
        requestId: requestId,
        sender: sender
      });
      await emitPendingCount(receiverId);   // <= thêm
    } catch (error) {
      console.error("Cancel friend request error:", error);
      socket.emit("friendRequestError", {
        success: false,
        message: "Lỗi khi hủy lời mời kết bạn"
      });
    }
  });

  // Accept a friend request
  socket.on("acceptFriendRequest", async (data) => {
    try {
      const { requestId, senderId } = data;

      // Find the friend request
      const friendRequest = await FriendModel.findById(requestId);

      if (!friendRequest) {
        return socket.emit("friendRequestError", {
          success: false,
          message: "Không tìm thấy lời mời kết bạn"
        });
      }

      if (friendRequest.receiver.toString() !== userId.toString()) {
        return socket.emit("friendRequestError", {
          success: false,
          message: "Bạn không có quyền chấp nhận lời mời này"
        });
      }

      // Update the friend request status
      friendRequest.status = "accepted";
      await friendRequest.save();

      // Get user details
      const receiver = await UserModel.findById(userId).select("name email profilePic");

      // Notify the receiver (current user)
      socket.emit("friendRequestAccepted", {
        success: true,
        message: "Đã chấp nhận lời mời kết bạn",
        requestId: requestId,
        data: friendRequest
      });

      // Notify the sender
      io.to(senderId.toString()).emit("friendRequestAccepted", {
        requestId: requestId,
        receiver: receiver
      });
      await emitPendingCount(userId);       // <= thêm
    } catch (error) {
      console.error("Accept friend request error:", error);
      socket.emit("friendRequestError", {
        success: false,
        message: "Lỗi khi chấp nhận lời mời kết bạn"
      });
    }
  });

  // Reject a friend request - Xóa luôn thay vì set trạng thái reject
  socket.on("rejectFriendRequest", async (data) => {
    try {
      const { requestId, senderId } = data;

      // Find the friend request
      const friendRequest = await FriendModel.findById(requestId);

      if (!friendRequest) {
        return socket.emit("friendRequestError", {
          success: false,
          message: "Không tìm thấy lời mời kết bạn"
        });
      }

      if (friendRequest.receiver.toString() !== userId.toString()) {
        return socket.emit("friendRequestError", {
          success: false,
          message: "Bạn không có quyền từ chối lời mời này"
        });
      }

      // Get user details before deleting
      const receiver = await UserModel.findById(userId).select("name email profilePic");
      const sender = await UserModel.findById(friendRequest.sender).select("name email profilePic");

      // Delete the friend request instead of updating status
      await FriendModel.findByIdAndDelete(requestId);

      // Notify the receiver (current user)
      socket.emit("friendRequestRejected", {
        success: true,
        message: "Đã từ chối lời mời kết bạn",
        requestId: requestId
      });

      // Notify the sender with additional info to help identify which request was rejected
      io.to(senderId.toString()).emit("friendRequestRejected", {
        requestId: requestId,
        receiver: receiver,
        sender: sender    // Thêm thông tin sender để có thể xác định chính xác người gửi
      });
      await emitPendingCount(userId);       // <= thêm
    } catch (error) {
      console.error("Reject friend request error:", error);
      socket.emit("friendRequestError", {
        success: false,
        message: "Lỗi khi từ chối lời mời kết bạn"
      });
    }
  });

  // Remove a friend
  socket.on("removeFriend", async (data) => {
    try {
      const { friendId } = data;

      const friendRecord = await FriendModel.findOne({
        $or: [
          { sender: userId, receiver: friendId, status: "accepted" },
          { sender: friendId, receiver: userId, status: "accepted" }
        ]
      });

      if (!friendRecord) {
        return socket.emit("friendRequestError", {
          success: false,
          message: "Không tìm thấy mối quan hệ bạn bè"
        });
      }

      await FriendModel.findByIdAndDelete(friendRecord._id);

      // Notify the current user
      socket.emit("friendRemoved", {
        success: true,
        message: "Đã xóa khỏi danh sách bạn bè",
        friendId: friendId
      });

      // Notify the other user
      io.to(friendId.toString()).emit("friendRemoved", {
        friendId: userId.toString()
      });
    } catch (error) {
      console.error("Remove friend error:", error);
      socket.emit("friendRequestError", {
        success: false,
        message: "Lỗi khi xóa bạn bè"
      });
    }
  });

  // Get friend requests
  socket.on("getFriendRequests", async () => {
    console.log(`Received getFriendRequests from user: ${userId}`);
    try {
      // Phản hồi nhanh
      socket.emit("friendRequestsProcessing", { message: "Đang tải danh sách..." });

      const pendingRequests = await FriendModel.find({
        receiver: userId,
        status: "pending"
      })
      .populate("sender", "name email profilePic")
      .sort({ createdAt: -1 });

      console.log(`Sending ${pendingRequests.length} friend requests to user: ${userId}`);
      socket.emit("friendRequests", {
        success: true,
        data: pendingRequests
      });
    } catch (error) {
      console.error("Get friend requests error:", error);
      socket.emit("friendRequestError", {
        success: false,
        message: "Lỗi khi lấy danh sách lời mời kết bạn"
      });
    }
  });

  // Get friend list
  socket.on("getFriendsList", async () => {
    console.log(`Received getFriendsList from user: ${userId}`);
    try {
      const friends = await FriendModel.find({
        $or: [{ sender: userId }, { receiver: userId }],
        status: "accepted",
      })
        .populate("sender", "-password")
        .populate("receiver", "-password");

      console.log(`Sending ${friends.length} friends to user: ${userId}`);
      socket.emit("friendsList", {
        success: true,
        data: friends
      });
    } catch (error) {
      console.error("Get friends list error:", error);
      socket.emit("friendRequestError", {
        success: false,
        message: "Lỗi khi lấy danh sách bạn bè"
      });
    }
  });

  // Add this new socket handler for fast friend status checking
  socket.on("checkFriendStatus", async (data, callback) => {
    try {
      const { userId: targetUserId } = data;
      
      if (!targetUserId) {
        return callback({
          success: false,
          error: "Missing target user ID"
        });
      }
      
      console.log(`Checking friend status between ${userId} and ${targetUserId}`);
      
      const friendRequest = await FriendModel.findOne({
        $or: [
          { sender: userId, receiver: targetUserId },
          { sender: targetUserId, receiver: userId }
        ]
      });

      if (!friendRequest) {
        return callback({
          success: true,
          data: {
            status: "none",
            requestId: null,
            isSender: false
          }
        });
      }

      callback({
        success: true,
        data: {
          status: friendRequest.status,
          requestId: friendRequest._id,
          isSender: friendRequest.sender.toString() === userId.toString()
        }
      });
    } catch (error) {
      console.error("Error checking friend status via socket:", error);
      callback({
        success: false,
        error: "Internal server error"
      });
    }
  });
};

module.exports = friendHandler;
