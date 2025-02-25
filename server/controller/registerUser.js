const UserModel = require("../models/UserModel");
const bcryptjs = require("bcryptjs");

async function registerUser(request, response) {
  try {
    const { phone, password, name, profilePic } = request.body;
    // if (!phone || !password || !name || !profilePic) {
    //   return response.status(400).json({ message: "Please provide all fields" });
    // }

    const checkPhone = await UserModel.findOne({ phone });
    if (checkPhone) {
      return response.status(400).json({ message: "User already exists", error: true });
    }

    // password into hashpassword
    const salt = await bcryptjs.genSalt(10);
    const hashPassword = await bcryptjs.hash(password, salt);

    const payload = {
      phone,
      password: hashPassword,
      name,
      profilePic,
    };

    const user = new UserModel(payload);

    const userSave = await user.save();
    return response.status(201).json({ message: "User registered successfully", data: userSave, success: true });
  } catch (error) {
    response.status(500).json({ message: "Internal server error" || error, error: true });
  }
}

module.exports = registerUser;
