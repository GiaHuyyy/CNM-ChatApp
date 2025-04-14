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
    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email không tồn tại",
        error: true
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP
    await OTPModel.deleteMany({ email }); // Remove existing OTPs
    const otpDoc = new OTPModel({
      email,
      otp
    });
    await otpDoc.save();

    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Reset Password OTP",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Reset Password</h2>
          <p>Your OTP for password reset is: <strong>${otp}</strong></p>
          <p>This OTP will expire in 5 minutes.</p>
        </div>
      `
    });

    res.status(200).json({
      success: true,
      message: "OTP đã được gửi đến email của bạn",
      email
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Không thể gửi OTP",
      error: true
    });
  }
};

module.exports = forgotPassword;