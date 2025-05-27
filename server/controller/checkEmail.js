const UserModel = require("../models/UserModel");

/**
 * Check if an email exists in the database
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function checkEmail(req, res) {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
        error: true
      });
    }

    // Check if the email exists
    const user = await UserModel.findOne({ email });
    
    return res.status(200).json({
      success: true,
      exists: !!user,
      message: user ? "Email already registered" : "Email is available"
    });
  } catch (error) {
    console.error("Error checking email:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking email",
      error: true
    });
  }
}

module.exports = checkEmail;
