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

    const otpRecord = await OTPModel.findOne({
      email: email,
      otp: otpString,
      createdAt: {
        $gt: new Date(Date.now() - 5 * 60 * 1000)
      }
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP or OTP expired",
        error: true
      });
    }

    // Delete the used OTP
    await OTPModel.deleteOne({ _id: otpRecord._id });

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
