const UserModel = require("../models/UserModel");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");

async function loginUser(request, response) {
  try {
    const { email, password } = request.body;

    const user = await UserModel.findOne({ email });
    if (!user) {
      return response.status(400).json({
        success: false,
        message: "Email không tồn tại",
        error: true
      });
    }

    const verifyPassword = await bcryptjs.compare(password, user.password);
    if (!verifyPassword) {
      return response.status(400).json({
        success: false,
        message: "Sai mật khẩu",
        error: true
      });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY);

    response.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none"
    });

    response.status(200).json({
      success: true,
      message: "Đăng nhập thành công",
      token
    });
  } catch (error) {
    response.status(500).json({
      success: false,
      message: "Đăng nhập thất bại",
      error: true
    });
  }
}

module.exports = loginUser;
