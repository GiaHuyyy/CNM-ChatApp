const express = require("express");
const router = express.Router();
const { sendOTP, verifyOTP } = require("../controller/otpController");
const registerUser = require("../controller/registerUser");

router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);
router.post("/register", registerUser);

module.exports = router;