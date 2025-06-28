const jwt = require("jsonwebtoken");

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "2s" }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
};

module.exports = { generateAccessToken, generateRefreshToken };
