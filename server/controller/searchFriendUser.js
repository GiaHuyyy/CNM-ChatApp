const UserModel = require("../models/UserModel");

async function searchFriendUser(request, response) {
  try {
    const { search } = request.body;

    const query = new RegExp(search, "i", "g");

    const users = await UserModel.find({ $or: [{ name: query }, { email: query }] }).select("-password");

    if (users.length === 0) {
      return response.status(404).json({ message: "Not found" });
    }

    return response.status(200).json({ message: "All user", data: users, success: true });
  } catch (error) {
    return response.status(500).json({ message: error.message || error, error: true });
  }
}

module.exports = searchFriendUser;
