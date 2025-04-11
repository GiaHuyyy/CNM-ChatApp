const UserModel = require("../models/UserModel");
const { sendOTPEmail } = require("../helpers/emailService");

// Store OTP codes temporarily (in production use Redis or database)
const otpStore = new Map();

const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email không được để trống",
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP with 10-minute expiration
    otpStore.set(email, {
      code: otp,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    });

    // Send OTP via email
    await sendOTPEmail(email, otp);

    return res.status(200).json({
      success: true,
      message: "Mã OTP đã được gửi đến email của bạn",
      email: email
    });

  } catch (error) {
    console.error("Error sending OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi gửi mã OTP",
      error: error.toString()
    });
  }
};

module.exports = { sendOtp, otpStore };
