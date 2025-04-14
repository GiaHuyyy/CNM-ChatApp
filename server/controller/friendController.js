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

    friendRequest.status = status;
    await friendRequest.save();

    res.status(200).json({
      success: true,
      message: status === "accepted" ? "Đã chấp nhận lời mời kết bạn" : "Đã từ chối lời mời kết bạn",
      data: friendRequest,
    });
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

module.exports = {
  sendFriendRequest,
  respondToFriendRequest,
  getFriendList,
  getPendingRequests  // Add this
};