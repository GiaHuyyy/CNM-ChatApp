const UserModel = require("../models/UserModel");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");

async function loginUser(request, response) {
  try {
    const { email, password } = request.body;

    const user = await UserModel.findOne({ email });

    if (!user) {
      return response.status(400).json({ message: "Tài khoản không tồn tại!", error: true });
    }

    const verifyPassword = await bcryptjs.compare(password, user.password);

    if (!verifyPassword) {
      return response.status(400).json({ message: "Vui lòng kiểm tra lại mật khẩu!", error: true });
    }

    const tokenData = {
      _id: user._id,
      email: user.email,
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
      .json({ message: "Đăng nhập thành công!", token: token, success: true });
  } catch (error) {
    response.status(500).json({ message: error.message || error, error: true });
  }
}

module.exports = loginUser;
