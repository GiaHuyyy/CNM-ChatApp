const UserModel = require("../models/UserModel");
const OTPModel = require("../models/OTPModel");
const bcryptjs = require("bcryptjs");

const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    console.log("Reset password request received for:", email);
    
    // Validate inputs
    if (!email || !otp || !newPassword) {
      console.log("Missing required fields:", { email: !!email, otp: !!otp, newPassword: !!newPassword });
      return res.status(400).json({
        success: false,
        message: "Email, OTP và mật khẩu mới là bắt buộc",
        error: true
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu mới phải có ít nhất 6 ký tự",
        error: true
      });
    }

    // Convert OTP to string for comparison if it's a number
    const otpString = otp.toString();
    
    console.log(`Checking OTP: ${otpString} for email: ${email}`);
    
    // Find the OTP record - with consistent time constraints (5 minutes)
    const otpRecord = await OTPModel.findOne({
      email,
      otp: otpString,
      createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) } // Changed from 15 minutes to 5 minutes
    });

    if (!otpRecord) {
      // Try to find an OTP without time constraints to give better error message
      const expiredOtp = await OTPModel.findOne({
        email,
        otp: otpString
      });
      
      if (expiredOtp) {
        console.log("OTP found but expired for email:", email);
        return res.status(400).json({
          success: false,
          message: "OTP đã hết hạn, vui lòng yêu cầu mã mới",
          error: true
        });
      } else {
        console.log("No matching OTP found for email:", email);
        return res.status(400).json({
          success: false,
          message: "OTP không hợp lệ, vui lòng kiểm tra lại",
          error: true
        });
      }
    }

    // Hash new password
    const hashedPassword = await bcryptjs.hash(newPassword, 10);
    console.log("Password hashed successfully");

    // Update password
    const updateResult = await UserModel.updateOne(
      { email },
      { $set: { password: hashedPassword } }
    );
    
    if (updateResult.matchedCount === 0) {
      console.log("User not found with email:", email);
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng với email này",
        error: true
      });
    }
    
    console.log("Password updated successfully for:", email);

    // Delete used OTP
    await OTPModel.deleteOne({ _id: otpRecord._id });
    console.log("OTP record deleted");

    res.status(200).json({
      success: true,
      message: "Mật khẩu đã được cập nhật thành công"
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Không thể cập nhật mật khẩu: " + (error.message || "Lỗi không xác định"),
      error: true
    });
  }
};

module.exports = resetPassword;