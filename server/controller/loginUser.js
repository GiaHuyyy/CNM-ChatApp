const UserModel = require("../models/UserModel");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");

async function loginUser(request, response) {
  try {
    const { phone, password } = request.body;

    const user = await UserModel.findOne({ phone });

    if (!user) {
      return response.status(400).json({ message: "User not exist", error: true });
    }

    const verifyPassword = await bcryptjs.compare(password, user.password);

    if (!verifyPassword) {
      return response.status(400).json({ message: "Please check password", error: true });
    }

    const tokenData = {
      _id: user._id,
      phone: user.phone,
    };
    const token = await jwt.sign(tokenData, process.env.JWT_SECRET_KEY, { expiresIn: "1h" });

    const cookieOptions = {
      httpOnly: true,
      expires: new Date(Date.now() + 60 * 60 * 1000),
      secure: true,
      sameSite: "None",
    };

    return response
      .cookie("token", token, cookieOptions)
      .status(200)
      .json({ message: "Login successfully", token: token, success: true });
  } catch (error) {
    response.status(500).json({ message: error.message || error, error: true });
  }
}

module.exports = loginUser;
