const express = require("express");
const registerUser = require("../controller/registerUser");
const checkPhone = require("../controller/checkPhone");
const checkPassword = require("../controller/checkPassword");
const loginUser = require("../controller/loginUser");
const userDetails = require("../controller/userDetails");
const updateUserDetails = require("../controller/updateUserDetails");
const logout = require("../controller/logout");
const searchUser = require("../controller/searchUser");
const searchFriendUser = require("../controller/searchFriendUser");

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

// Logout user
router.get("/logout", logout);

module.exports = router;
