const UserModel = require("../models/UserModel");
const mongoose = require("mongoose");

const updateUser = async (req, res) => {
  try {
    console.log("Update user request received:", req.body);
    console.log("User info from token:", req.user);
    
    const { name, profilePic } = req.body;
    
    // Ensure we have a valid MongoDB ObjectId
    const userId = mongoose.Types.ObjectId.isValid(req.user._id) 
      ? req.user._id 
      : new mongoose.Types.ObjectId(req.user._id.toString());
    
    console.log("Processing update for user ID:", userId);

    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Tên người dùng không được để trống",
        error: true
      });
    }

    const updateData = { 
      name: name.trim(),
    };
    
    // Only update profile pic if provided
    if (profilePic) {
      updateData.profilePic = profilePic;
    }

    console.log("Updating user with data:", updateData);
    
    // Direct MongoDB update to ensure it executes
    const result = await UserModel.updateOne(
      { _id: userId },
      { $set: updateData }
    );
    
    console.log("MongoDB update result:", result);
    
    if (result.matchedCount === 0) {
      console.log("User not found with ID:", userId);
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng",
        error: true
      });
    }
    
    // Fetch updated document to return to client
    const updatedUser = await UserModel.findById(userId).select("-password");
    
    console.log("User updated successfully:", updatedUser);
    
    // Send the updated user data back to the client
    res.status(200).json({
      success: true,
      message: "Cập nhật thông tin thành công",
      data: updatedUser
    });
    
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      success: false,
      message: "Không thể cập nhật thông tin người dùng: " + error.message,
      error: true
    });
  }
};

module.exports = updateUser;
