const UserModel = require("../models/UserModel");
const bcryptjs = require("bcryptjs");
const OTPModel = require("../models/OTPModel");

async function registerUser(request, response) {
  try {
    const { phone, email, password, name, profilePic, otp } = request.body;

    // Verify OTP first
    const validOTP = await OTPModel.findOne({ email, otp });
    if (!validOTP) {
      return response.status(400).json({ 
        message: "Invalid OTP or OTP expired", 
        error: true 
      });
    }

    const checkPhone = await UserModel.findOne({ phone });
    if (checkPhone) {
      return response.status(400).json({ message: "Phone number already exists", error: true });
    }

    const checkEmail = await UserModel.findOne({ email });
    if (checkEmail) {
      return response.status(400).json({ message: "Email already exists", error: true });
    }

    const salt = await bcryptjs.genSalt(10);
    const hashPassword = await bcryptjs.hash(password, salt);

    const payload = {
      phone,
      email,
      password: hashPassword,
      name,
      profilePic,
    };

    const user = new UserModel(payload);
    const userSave = await user.save();

    // Delete the OTP after successful registration
    await OTPModel.deleteOne({ email, otp });

    return response.status(201).json({ 
      message: "User registered successfully", 
      data: userSave, 
      success: true 
    });
  } catch (error) {
    response.status(500).json({ 
      message: error.message || "Internal server error", 
      error: true 
    });
  }
}

module.exports = registerUser;
