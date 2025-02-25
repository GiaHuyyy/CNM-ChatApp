async function logout(request, response) {
  try {
    const cookieOptions = {
      httpOnly: true,
      expires: new Date(0),
      secure: true,
    };

    return response
      .cookie("token", "", cookieOptions)
      .status(200)
      .json({ message: "User logout successfully, Session expired", success: true });
  } catch (error) {
    return response.status(500).json({ message: error.message || error, error: true });
  }
}

module.exports = logout;
