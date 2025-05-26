const FriendModel = require("../models/FriendModel");
const UserModel = require("../models/UserModel");

// Gửi lời mời kết bạn
const sendFriendRequest = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user._id;

    // Kiểm tra xem đã có lời mời trước đó chưa
    const existingRequest = await FriendModel.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId },
      ],
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: "Lời mời kết bạn đã tồn tại",
      });
    }

    const newFriendRequest = await FriendModel.create({
      sender: senderId,
      receiver: receiverId,
    });

    res.status(200).json({
      success: true,
      message: "Đã gửi lời mời kết bạn",
      data: newFriendRequest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Chấp nhận/từ chối lời mời
const respondToFriendRequest = async (req, res) => {
  try {
    const { requestId, status } = req.body;
    const userId = req.user._id;

    const friendRequest = await FriendModel.findById(requestId);

    if (!friendRequest) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lời mời kết bạn",
      });
    }

    if (friendRequest.receiver.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền thực hiện hành động này",
      });
    }

    if (status === "accepted") {
      // Chấp nhận lời mời kết bạn
      friendRequest.status = "accepted";
      await friendRequest.save();
      
      res.status(200).json({
        success: true,
        message: "Đã chấp nhận lời mời kết bạn",
        data: friendRequest,
      });
    } else {
      // Từ chối: xóa lời mời kết bạn thay vì cập nhật trạng thái
      await FriendModel.findByIdAndDelete(requestId);
      
      res.status(200).json({
        success: true,
        message: "Đã từ chối lời mời kết bạn",
        data: { 
          _id: requestId,
          status: "deleted"
        },
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Lấy danh sách bạn bè
const getFriendList = async (req, res) => {
  try {
    const userId = req.user._id;

    const friends = await FriendModel.find({
      $or: [{ sender: userId }, { receiver: userId }],
      status: "accepted",
    })
      .populate("sender", "-password")
      .populate("receiver", "-password");

    res.status(200).json({
      success: true,
      data: friends,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Lấy danh sách lời mời kết bạn đang chờ
const getPendingRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const pendingRequests = await FriendModel.find({
      receiver: userId,
      status: "pending"
    })
    .populate("sender", "name email profilePic")
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: pendingRequests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Remove friend
const removeFriend = async (req, res) => {
  try {
    const { friendId } = req.body;
    const userId = req.user._id;

    const friendRecord = await FriendModel.findOne({
      $or: [
        { sender: userId, receiver: friendId, status: "accepted" },
        { sender: friendId, receiver: userId, status: "accepted" }
      ]
    });

    if (!friendRecord) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy mối quan hệ bạn bè"
      });
    }

    await FriendModel.findByIdAndDelete(friendRecord._id);

    res.status(200).json({
      success: true,
      message: "Đã xóa khỏi danh sách bạn bè"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Check friend request status
const checkFriendStatus = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    const friendRequest = await FriendModel.findOne({
      $or: [
        { sender: currentUserId, receiver: targetUserId },
        { sender: targetUserId, receiver: currentUserId }
      ]
    });

    if (!friendRequest) {
      return res.status(200).json({
        success: true,
        data: {
          status: "none",
          requestId: null,
          isSender: false
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        status: friendRequest.status,
        requestId: friendRequest._id,
        isSender: friendRequest.sender.toString() === currentUserId.toString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Cancel friend request
const cancelFriendRequest = async (req, res) => {
  try {
    const { requestId, receiverId } = req.body;
    const userId = req.user._id;

    // Validate required fields
    if (!requestId || !receiverId) {
      return res.status(400).json({
        success: false,
        message: "requestId và receiverId là bắt buộc"
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
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lời mời kết bạn hoặc bạn không có quyền hủy"
      });
    }

    // Delete the friend request
    await FriendModel.findByIdAndDelete(requestId);

    res.status(200).json({
      success: true,
      message: "Đã hủy lời mời kết bạn thành công",
      data: {
        requestId: requestId,
        status: "cancelled"
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  sendFriendRequest,
  respondToFriendRequest,
  getFriendList,
  getPendingRequests,
  removeFriend,
  checkFriendStatus,
  cancelFriendRequest
};