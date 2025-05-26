const getUserDetailsFromToken = require("../helpers/getUserDetailsFromToken");
const UserModel = require("../models/UserModel");

async function updateUserDetails(request, response) {
  try {
    const token = request.cookies.token || "";
    const user = await getUserDetailsFromToken(token);

    // pull new fields
    const { name, profilePic, gender, dateOfBirth, phone } = request.body;

    // Create update data with all fields that should be updated
    const updateData = {
      name,
      gender,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      phone,
      profilePic,
    };

    // Add optional fields if they exist in the request
    // if (gender !== undefined) updateData.gender = gender;
    // if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);
    // if (phone) updateData.phone = phone;

    // perform update
    const updateResult = await UserModel.updateOne({ _id: user._id }, updateData);

    // Get the updated user information
    const userInformation = await UserModel.findById(user._id).select("-password");

    return response.status(200).json({
      message: "Cập nhật thông tin người dùng thành công!",
      data: userInformation,
      success: true,
    });
  } catch (error) {
    response.status(500).json({ message: error.message || error, error: true });
  }
}

module.exports = updateUserDetails;
