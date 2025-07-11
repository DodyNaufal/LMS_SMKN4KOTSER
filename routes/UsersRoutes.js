const express = require("express");
const router = express.Router();
const {
  register,
  login,
  loginAdmin,
  forgotPassword,
  resetPassword,
  updatePassword,
  // updateProfilePicture,
} = require("../controllers/UsersControllers");
const db = require("../config/db");

router.post("/register", register);
router.post("/login", login);
router.post("/login-admin", loginAdmin);
router.post("/forgot-password", forgotPassword);
router.post("/update-password", updatePassword);
router.get("/reset-password/:token", resetPassword);

module.exports = router;
