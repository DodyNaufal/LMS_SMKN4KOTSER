const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Middleware token
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Akses ditolak, token tidak ditemukan" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Token tidak valid" });
  }
};

// Role access
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

// Upload config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploadss/tugas");
  },
  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const uploadTugas = multer({ storage });

module.exports = { authMiddleware, roleMiddleware, uploadTugas };
