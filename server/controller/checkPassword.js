const UserModel = require("../models/UserModel");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");

async function checkPassword(request, response) {
  try {
    const { password, userId } = request.body;

    const user = await UserModel.findById(userId);

    const verifyPassword = await bcryptjs.compare(password, user.password);

    if (!verifyPassword) {
      return response.status(400).json({ message: "Pls check password", error: true });
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
    };

    return response
      .cookie("token", token, cookieOptions)
      .status(200)
      .json({ message: "Login successfully", token: token, success: true });
  } catch (error) {
    response.status(500).json({ message: error.message || error, error: true });
  }
}

module.exports = checkPassword;
