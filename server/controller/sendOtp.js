const twilio = require("twilio");
const UserModel = require("../models/UserModel");

// Store OTP codes temporarily (in production use Redis or database)
// Make it accessible to other modules
const otpStore = new Map();
let cleanPhoneFormat = "";

const sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Số điện thoại không được để trống",
      });
    }

    // Check if phone number already exists
    const existingUser = await UserModel.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Số điện thoại đã được sử dụng",
      });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Format phone number for Twilio and for storage key (must start with +)
    cleanPhoneFormat = phone.replace(/\s+/g, ""); // Remove any spaces
    if (!cleanPhoneFormat.startsWith("+")) {
      // If it starts with 0, replace with +84 (Vietnam)
      if (cleanPhoneFormat.startsWith("0")) {
        cleanPhoneFormat = "+84" + cleanPhoneFormat.substring(1);
      } else {
        // Otherwise, just add + prefix
        cleanPhoneFormat = "+" + cleanPhoneFormat;
      }
    }

    console.log("Phone for OTP storage:", cleanPhoneFormat);
    console.log("Generated OTP:", otp);

    // Store OTP with expiration (increase to 10 minutes for better user experience)
    otpStore.set(cleanPhoneFormat, {
      code: otp,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // Log all stored OTPs for debugging
    console.log("Current OTP store:");
    for (const [key, value] of otpStore.entries()) {
      console.log(`- ${key}: ${value.code} (expires in ${Math.floor((value.expiresAt - Date.now()) / 1000)}s)`);
    }

    // Get Twilio credentials from environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !twilioPhone) {
      throw new Error("Missing Twilio credentials");
    }

    console.log("IMPORTANT: In Twilio trial mode, you can only send to verified numbers!");
    console.log("Make sure", cleanPhoneFormat, "is verified in your Twilio account");

    // Log message for better troubleshooting
    console.log(`Attempting to send SMS from ${twilioPhone} to ${cleanPhoneFormat}`);

    // Check if the twilioPhone and the cleanPhoneFormat are the same
    if (twilioPhone === cleanPhoneFormat) {
      console.error("Error: Your Twilio phone number and destination number are the same");
      throw new Error("Cannot send SMS to the same number as the sender");
    }

    // Create Twilio client
    const client = twilio(accountSid, authToken);

    // Send the message with improved error handling
    const messageSent = await client.messages.create({
      body: `Mã xác thực OTP của bạn là: ${otp}`,
      from: twilioPhone,
      to: cleanPhoneFormat,
    });

    console.log("Twilio message SID:", messageSent.sid);
    console.log(`SMS sent to ${cleanPhoneFormat} with OTP: ${otp}`);
    console.log("Message status:", messageSent.status);

    return res.status(200).json({
      success: true,
      message: "Mã OTP đã được gửi đến số điện thoại của bạn",
      smsStatus: messageSent.status,
      otp: otp,
      phoneForVerification: cleanPhoneFormat, // Return the formatted phone so client can use it for verification
    });
  } catch (twilioError) {
    console.error("Twilio error:", twilioError);

    return res.status(500).json({
      success: false,
      message: `Lỗi gửi SMS: ${twilioError.message}`,
      // Include error details for debugging
      error: twilioError.toString(),
      ...(process.env.NODE_ENV !== "production" && { otp }),
    });
  }
};

module.exports = { sendOtp, otpStore };
