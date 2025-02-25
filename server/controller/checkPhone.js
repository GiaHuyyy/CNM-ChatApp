const UserModel = require("../models/UserModel");

async function checkPhone(request, response) {
  try {
    const { phone } = request.body;

    const checkPhone = await UserModel.findOne({ phone }).select("-password");

    if (!checkPhone) {
      return response.status(400).json({ message: "User not exit", error: true });
    }

    return response.status(200).json({ message: "Phone verify", data: checkPhone, success: true, data: checkPhone });
  } catch (error) {
    response.status(500).json({ message: error.message || error, error: true });
  }
}

module.exports = checkPhone;
