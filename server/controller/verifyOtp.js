const { otpStore } = require("./sendOtp");
const OTPModel = require("../models/OTPModel");

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP code are required",
        error: true
      });
    }

    // Convert OTP to string for comparison
    const otpString = otp.toString();

    console.log(`Verifying OTP: ${otpString} for email: ${email}`);

    const otpRecord = await OTPModel.findOne({
      email: email,
      otp: otpString,
      createdAt: {
        $gt: new Date(Date.now() - 15 * 60 * 1000) // Extended from 5 minutes to 15
      }
    });

    if (!otpRecord) {
      console.log(`Invalid OTP or expired: ${otpString} for email: ${email}`);
      return res.status(400).json({
        success: false,
        message: "Invalid OTP or OTP expired",
        error: true
      });
    }

    // Do NOT delete the used OTP yet - we'll need it for the password reset step
    // We'll delete it after password is reset successfully

    console.log(`OTP verified successfully for email: ${email}`);
    res.status(200).json({
      success: true,
      message: "Xác thực thành công",
      email: email
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({
      success: false,
      message: "OTP verification failed",
      error: true
    });
  }
};

module.exports = verifyOtp;
