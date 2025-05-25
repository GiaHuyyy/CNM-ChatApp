const getUserDetailsFromToken = require("../helpers/getUserDetailsFromToken");

async function userDetails(request, response) {
  try {
    // Lấy token từ cookie (cho web)
    let token = request.cookies?.token;

    // Nếu không có, thử lấy từ Authorization header (cho React Native)
    if (!token) {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    const user = await getUserDetailsFromToken(token);

    if (user?.error) {
      return response.status(401).json({ message: user.message, logout: true, error: true });
    }

    return response.status(200).json({
      message: "Thông tin người dùng",
      data: user,
      success: true,
    });
  } catch (error) {
    console.error("userDetails error:", error);
    response.status(500).json({ message: error.message || error, error: true });
  }
}

module.exports = userDetails;
