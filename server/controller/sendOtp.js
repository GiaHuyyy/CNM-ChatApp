const UserModel = require("../models/UserModel");
const { sendOTPEmail } = require("../helpers/emailService");
const OTPModel = require("../models/OTPModel");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Remove any existing OTP for this email
    await OTPModel.deleteMany({ email });

    // Create and save new OTP record
    const otpDoc = new OTPModel({
      email,
      otp
    });

    await otpDoc.save();
    console.log('OTP saved to database:', { email, otp }); // Debug log

    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP for Registration",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Email Verification</h2>
          <p>Your OTP is: <strong>${otp}</strong></p>
          <p>This OTP will expire in 5 minutes.</p>
        </div>
      `
    });

    res.status(200).json({
      success: true,
      message: "Mã OTP đã được gửi đến email của bạn",
      email: email
    });

  } catch (error) {
    console.error("Send OTP Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: true
    });
  }
};

module.exports = { sendOtp };
