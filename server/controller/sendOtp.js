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

    // Set expiration time to 5 minutes from now
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 5);

    // Remove any existing OTP for this email
    await OTPModel.deleteMany({ email });

    // Create and save new OTP record with explicit expiration time
    const otpDoc = new OTPModel({
      email,
      otp,
      expiresAt: expirationTime // Add explicit expiration time if your schema supports it
    });

    await otpDoc.save();
    console.log('OTP saved to database:', { email, otp, expiresAt: expirationTime });

    // Send email with improved formatting and clear expiration time
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Mã xác thực ChatNow",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #0190f3; text-align: center;">Xác thực email của bạn</h2>
          <div style="text-align: center; margin: 30px 0; padding: 15px; background-color: #f5f5f5; border-radius: 4px;">
            <p style="font-size: 16px; margin-bottom: 10px;">Mã xác thực của bạn là:</p>
            <h1 style="font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h1>
          </div>
          <p style="color: #666; margin-bottom: 20px;">Mã xác thực này sẽ hết hạn sau <strong>5 phút</strong>.</p>
          <p style="color: #666;">Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
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
