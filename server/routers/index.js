const express = require("express");
const OTPModel = require("../models/OTPModel"); // Add this import at the top
const registerUser = require("../controller/registerUser");
const checkPhone = require("../controller/checkPhone");
const checkPassword = require("../controller/checkPassword");
const loginUser = require("../controller/loginUser");
const userDetails = require("../controller/userDetails");
const updateUserDetails = require("../controller/updateUserDetails");
const logout = require("../controller/logout");
const searchUser = require("../controller/searchUser");
const searchFriendUser = require("../controller/searchFriendUser");
const { sendOtp } = require("../controller/sendOtp"); // Updated import
const verifyOtp = require("../controller/verifyOtp");

const router = express.Router();

// Create user api
router.post("/register", registerUser);

// Check user phone
router.post("/phone", checkPhone);

// Check user password (Login)
router.post("/password", checkPassword);

// Login user with phone and password
router.post("/login", loginUser);

// Get user details
router.get("/user-details", userDetails);

// Update user details
router.post("/update-user", updateUserDetails);

// Search user
router.post("/search-user", searchUser);

// Search Friend & User
router.post("/search-friend-user", searchFriendUser);

// OTP routes
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

// Registration and Login routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Logout user
router.get("/logout", logout);

// Temporary route to check OTPs (remove in production)
// Debug route to check stored OTPs
router.get("/debug/otps", async (req, res) => {
  try {
    const otps = await OTPModel.find({});
    res.json({
      count: otps.length,
      otps: otps
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch OTPs",
      details: error.message
    });
  }
});

module.exports = router;
