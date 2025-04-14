const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');

const protect = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token"
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // Get user from token
    req.user = await UserModel.findById(decoded._id).select("-password");
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Not authorized, token failed"
    });
  }
};

module.exports = { protect };