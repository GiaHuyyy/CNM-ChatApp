const UserModel = require("../models/UserModel");

async function searchUser(request, response) {
  try {
    const { email } = request.body;
    const user = await UserModel.findOne({ email }).select("-password");

    if (!user) {
      return response.status(404).json({ message: "User not found" });
    }

    return response.status(200).json({ message: "User found", data: user, success: true });
  } catch (error) {
    return response.status(500).json({ message: error.message || error, error: true });
  }
}

module.exports = searchUser;
