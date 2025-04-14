const UserModel = require("../models/UserModel");
const bcryptjs = require("bcryptjs");

async function registerUser(request, response) {
  try {
    const { email, password, name, profilePic, otp } = request.body;

    // Check if user already exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return response.status(400).json({
        success: false,
        message: "Email đã tồn tại",
        error: true
      });
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Create new user
    const newUser = new UserModel({
      email,
      password: hashedPassword,
      name,
      profilePic: profilePic || ""
    });

    await newUser.save();

    response.status(201).json({
      success: true,
      message: "Đăng ký thành công",
      data: {
        email: newUser.email,
        name: newUser.name,
        profilePic: newUser.profilePic
      }
    });
  } catch (error) {
    response.status(500).json({
      success: false,
      message: "Đăng ký thất bại",
      error: true
    });
  }
}

module.exports = registerUser;
