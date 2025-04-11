// Import the shared otpStore from sendOtp.js
const { otpStore } = require("./sendOtp");

const verifyOtp = async (req, res) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        message: "Số điện thoại và mã OTP không được để trống",
      });
    }

    // Format phone number consistently with how it was stored
    let formattedPhone = phone.replace(/\s+/g, ""); // Remove any spaces
    if (!formattedPhone.startsWith("+")) {
      // If it starts with 0, replace with +84 (Vietnam)
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "+84" + formattedPhone.substring(1);
      } else {
        // Otherwise, just add + prefix
        formattedPhone = "+" + formattedPhone;
      }
    }

    console.log("Verifying OTP for phone:", formattedPhone);
    console.log("Entered OTP code:", code);

    // Log all stored OTPs for debugging
    console.log("Current OTP store at verification time:");
    for (const [key, value] of otpStore.entries()) {
      console.log(`- ${key}: ${value.code} (expires in ${Math.floor((value.expiresAt - Date.now()) / 1000)}s)`);
    }

    // Check if OTP exists and is valid
    const otpData = otpStore.get(formattedPhone);

    if (!otpData) {
      return res.status(400).json({
        success: false,
        message: "Mã OTP không tồn tại hoặc đã hết hạn, vui lòng gửi lại",
      });
    }

    // Check if OTP has expired
    if (Date.now() > otpData.expiresAt) {
      otpStore.delete(formattedPhone);
      return res.status(400).json({
        success: false,
        message: "Mã OTP đã hết hạn, vui lòng gửi lại",
      });
    }

    // Check if OTP matches
    if (otpData.code !== code) {
      return res.status(400).json({
        success: false,
        message: "Mã OTP không chính xác",
      });
    }

    // OTP is valid, delete it to prevent reuse
    otpStore.delete(formattedPhone);

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
