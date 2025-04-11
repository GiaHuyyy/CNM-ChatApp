const { otpStore } = require("./sendOtp");

const verifyOtp = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: "Email và mã OTP không được để trống",
      });
    }

    const otpData = otpStore.get(email);

    if (!otpData) {
      return res.status(400).json({
        success: false,
        message: "Mã OTP không tồn tại hoặc đã hết hạn",
      });
    }

    if (Date.now() > otpData.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({
        success: false,
        message: "Mã OTP đã hết hạn",
      });
    }

    if (otpData.code !== code) {
      return res.status(400).json({
        success: false,
        message: "Mã OTP không chính xác",
      });
    }

    otpStore.delete(email);

    return res.status(200).json({
      success: true,
      message: "Xác thực thành công",
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi xác thực mã OTP",
    });
  }
};

module.exports = verifyOtp;
