const UserModel = require("../models/UserModel");
const OTPModel = require("../models/OTPModel");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
        error: true
      });
    }
    
    // Check if user exists
    const user = await UserModel.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản với email này",
        error: true
      });
    }
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiration time to exactly 5 minutes from now
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 5);
    
    // Remove any existing OTP for this email
    await OTPModel.deleteMany({ email });
    
    // Create and save new OTP record
    const otpDoc = new OTPModel({
      email,
      otp,
      expiresAt: expirationTime
    });
    
    await otpDoc.save();
    console.log(`OTP saved for password reset: ${email}, OTP: ${otp}, expires: ${expirationTime}`);
    
    // Send email with improved formatting matching the registration system
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Đặt lại mật khẩu ChatNow",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #0190f3; text-align: center;">Đặt lại mật khẩu</h2>
          <div style="text-align: center; margin: 30px 0; padding: 15px; background-color: #f5f5f5; border-radius: 4px;">
            <p style="font-size: 16px; margin-bottom: 10px;">Mã xác thực của bạn là:</p>
            <h1 style="font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h1>
          </div>
          <p style="color: #666; margin-bottom: 20px;">Mã xác thực này sẽ hết hạn sau <strong>5 phút</strong>.</p>
          <p style="color: #666;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
        </div>
      `
    });
    
    res.status(200).json({
      success: true,
      message: "Mã OTP đã được gửi đến email của bạn",
      email
    });
    
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Không thể gửi mã OTP: " + (error.message || "Lỗi không xác định"),
      error: true
    });
  }
};

module.exports = forgotPassword;