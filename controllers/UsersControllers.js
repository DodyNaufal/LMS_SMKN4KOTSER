const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const path = require("path");
const transporter = require("../config/email");
require("dotenv").config();

// REGISTER USER
exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (role === "admin") {
    return res
      .status(403)
      .json({ message: "Anda tidak bisa mendaftar sebagai admin" });
  }

  try {
    const [existingUser] = await db.query(
      "SELECT email FROM users WHERE email = ?",
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user baru
    const [insertResult] = await db.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, role]
    );

    console.log("User ID baru:", insertResult.insertId);

    // Insert ke tabel verifications
    try {
      await db.query(
        "INSERT INTO verifications (user_id, status) VALUES (?, 'pending')",
        [insertResult.insertId]
      );
      console.log("Verifikasi berhasil ditambahkan.");
    } catch (verifError) {
      console.error("Gagal insert ke verifications:", verifError);
    }

    // Insert ke activity_logs
    await db.query(
      "INSERT INTO activity_logs (user_id, action) VALUES (?, ?)",
      [insertResult.insertId, `User registered as ${role}`]
    );

    const token = jwt.sign(
      { id: insertResult.insertId, role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(201).json({ token });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// LOGIN USER

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (users.length === 0) {
      return res.status(400).json({ message: "Email atau Password salah" });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Email atau Password salah" });
    }

    if (user.role !== "admin") {
      const [verif] = await db.query(
        "SELECT status FROM verifications WHERE user_id = ? ORDER BY requested_at DESC LIMIT 1",
        [user.id]
      );

      if (!verif.length || verif[0].status !== "approved") {
        return res.status(403).json({
          message: "Akun Anda belum diverifikasi oleh admin.",
        });
      }
    }

    const payload = { id: user.id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Insert log aktivitas
    await db.query(
      "INSERT INTO activity_logs (user_id, action) VALUES (?, ?)",
      [user.id, "User logged in"]
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [admins] = await db.query(
      "SELECT * FROM users WHERE email = ? AND role = 'admin'",
      [email]
    );

    if (admins.length === 0) {
      return res.status(400).json({ message: "Admin tidak ditemukan" });
    }

    const admin = admins[0];
    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Password salah" });
    }

    const token = jwt.sign(
      { id: admin.id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Insert log aktivitas
    await db.query(
      "INSERT INTO activity_logs (user_id, action) VALUES (?, ?)",
      [admin.id, "Admin logged in"]
    );

    res.json({
      token,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Login admin error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Forgot password
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const token = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    console.log("Generated token:", token); // Debug log

    // Encode token agar tidak rusak di URL
    const encodedToken = encodeURIComponent(token);
    const resetLink = `http://localhost:3000/reset.html?token=${encodedToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Reset Password LMS",
      text: `Klik link berikut untuk reset password: ${resetLink}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Email send error:", error);
        return res.status(500).json({ message: "Gagal mengirim email" });
      }
      res.json({ message: "Email reset password telah dikirim" });
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// RESET PASSWORD
exports.resetPassword = (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token decoded:", decoded);

    // Redirect ke halaman reset password dan sisipkan token ke query string
    return res.redirect(`/html/reset.html?token=${token}`);
  } catch (error) {
    console.error("Token verification failed:", error);

    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Token has expired" });
    }

    return res.status(400).json({ message: "Invalid or malformed token" });
  }
};

// UPDATE PASSWORD
exports.updatePassword = async (req, res) => {
  const { token, newPassword } = req.body;
  console.log("Received token:", token);

  if (!token || !newPassword) {
    return res.status(400).json({ message: "Token dan password diperlukan." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.email;

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const [result] = await db.query(
      "UPDATE users SET password = ? WHERE email = ?",
      [hashedPassword, email]
    );

    console.log("Password update result:", result);

    res.json({ message: "Password berhasil diubah." });
  } catch (error) {
    console.error("Error saat update password:", error);
    res
      .status(400)
      .json({ message: "Token tidak valid atau sudah kadaluarsa." });
  }
};
