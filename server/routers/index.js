const express = require("express");
const OTPModel = require("../models/OTPModel");
const registerUser = require("../controller/registerUser");
const loginUser = require("../controller/loginUser");
const userDetails = require("../controller/userDetails");
const updateUserDetails = require("../controller/updateUserDetails");
const logout = require("../controller/logout");
const searchUser = require("../controller/searchUser");
const searchFriendUser = require("../controller/searchFriendUser");
const { sendOtp } = require("../controller/sendOtp");
const verifyOtp = require("../controller/verifyOtp");
const forgotPassword = require("../controller/forgotPassword");
const resetPassword = require("../controller/resetPassword");

const router = express.Router();

// Authentication routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/logout", logout);

// User management routes
router.get("/user-details", userDetails);
router.post("/update-user", updateUserDetails);
router.post("/search-user", searchUser);
router.post("/search-friend-user", searchFriendUser);

// OTP routes
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

// Debug route
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

// Password reset routes
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
