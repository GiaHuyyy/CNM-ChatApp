const UserModel = require("../models/UserModel");
const OTPModel = require("../models/OTPModel");
const bcryptjs = require("bcryptjs");

const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Verify OTP
    const otpRecord = await OTPModel.findOne({
      email,
      otp,
      createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) }
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "OTP không hợp lệ hoặc đã hết hạn",
        error: true
      });
    }

    // Hash new password
    const hashedPassword = await bcryptjs.hash(newPassword, 10);

    // Update password
    await UserModel.updateOne(
      { email },
      { $set: { password: hashedPassword } }
    );

    // Delete used OTP
    await OTPModel.deleteOne({ _id: otpRecord._id });

    res.status(200).json({
      success: true,
      message: "Mật khẩu đã được cập nhật thành công"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Không thể cập nhật mật khẩu",
      error: true
    });
  }
};

module.exports = resetPassword;