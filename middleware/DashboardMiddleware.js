const jwt = require("jsonwebtoken");
require("dotenv").config();

// Middleware untuk verifikasi token JWT
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Akses ditolak, token tidak ditemukan" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // ✔️ gunakan JWT_SECRET yang benar
    req.user = decoded; // ✔️ ini penting agar req.user.id bisa dipakai
    next();
  } catch (err) {
    return res.status(403).json({ message: "Token tidak valid" });
  }
};

// Middleware untuk role-based access
const roleMiddleware = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Akses ditolak, Anda tidak memiliki izin" });
    }
    next();
  };
};

module.exports = { authMiddleware, roleMiddleware };
