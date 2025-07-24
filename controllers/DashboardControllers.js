const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const path = require("path");
const transporter = require("../config/email");
const cloudinary = require("../config/cloudinary");
require("dotenv").config();

exports.adminDashboard = (req, res) => {
  res.json({
    message: "Selamat datang di Dashboard Admin",
    user: req.user,
  });
};

exports.guruDashboard = (req, res) => {
  res.json({
    message: "Selamat datang di Dashboard Guru",
    user: req.user,
  });
};

exports.siswaDashboard = (req, res) => {
  res.json({
    message: "Selamat datang di Dashboard Siswa",
    user: req.user,
  });
};

// API: Data statistik admin
exports.getAdminStats = async (req, res) => {
  try {
    const [siswa] = await db.query(
      "SELECT COUNT(*) AS total FROM users WHERE role = 'siswa'"
    );
    const [guru] = await db.query(
      "SELECT COUNT(*) AS total FROM users WHERE role = 'guru'"
    );
    const [mapel] = await db.query("SELECT COUNT(*) AS total FROM courses");
    const [aktivitas] = await db.query(
      "SELECT COUNT(*) AS total FROM activity_logs WHERE DATE(created_at) = CURDATE()"
    );

    res.json({
      totalSiswa: siswa[0].total,
      totalGuru: guru[0].total,
      totalMapel: mapel[0].total,
      aktivitasHariIni: aktivitas[0].total,
    });
  } catch (err) {
    console.error("Error fetching admin stats:", err);
    res.status(500).json({ message: "Gagal memuat data statistik admin" });
  }
};

exports.getPendingVerifications = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT v.id, u.name, u.role
      FROM verifications v
      JOIN users u ON v.user_id = u.id
      WHERE v.status = 'pending'
      ORDER BY v.requested_at DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching pending verifications:", err);
    res.status(500).json({ message: "Gagal mengambil data verifikasi" });
  }
};
// API: Verifikasi yang sudah disetujui
exports.updateVerificationStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Status tidak valid" });
  }

  try {
    await db.query(`UPDATE verifications SET status = ? WHERE id = ?`, [
      status,
      id,
    ]);

    // Ambil user_id dari verifikasi
    const [userResult] = await db.query(
      "SELECT user_id FROM verifications WHERE id = ?",
      [id]
    );
    const userId = userResult[0]?.user_id;

    // Simpan log ke activity_logs
    if (userId) {
      await db.query(
        "INSERT INTO activity_logs (user_id, action) VALUES (?, ?)",
        [userId, `Verification ${status}`]
      );
    }

    res.json({ message: `Status diperbarui menjadi ${status}` });
  } catch (err) {
    console.error("Update verifikasi gagal:", err);
    res.status(500).json({ message: "Gagal memperbarui status verifikasi" });
  }
};

// API: Log aktivitas terbaru
exports.getRecentLogs = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT a.action, u.name, a.created_at
      FROM activity_logs a
      JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 5
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching logs:", err);
    res.status(500).json({ message: "Gagal memuat log aktivitas" });
  }
};

// Pertumbuhan bulanan siswa dan guru
exports.getMonthlyGrowth = async (req, res) => {
  try {
    const [siswa] = await db.query(`
      SELECT MONTH(created_at) AS bulan, COUNT(*) AS total
      FROM users
      WHERE role = 'siswa'
      GROUP BY bulan
      ORDER BY bulan
    `);

    const [guru] = await db.query(`
      SELECT MONTH(created_at) AS bulan, COUNT(*) AS total
      FROM users
      WHERE role = 'guru'
      GROUP BY bulan
      ORDER BY bulan
    `);

    res.json({ siswa, guru });
  } catch (err) {
    console.error("Growth fetch error:", err);
    res.status(500).json({ message: "Gagal mengambil data pertumbuhan" });
  }
};

// Distribusi siswa berdasarkan program (asumsinya: program = jurusan)
exports.getStudentPrograms = async (req, res) => {
  try {
    const [programs] = await db.query(`
      SELECT role, COUNT(*) AS total
      FROM users
      WHERE role = 'siswa'
      GROUP BY role
    `);

    res.json(programs);
  } catch (err) {
    console.error("Program fetch error:", err);
    res.status(500).json({ message: "Gagal mengambil data program" });
  }
};

// Statistik penggunaan platform (misal: jumlah login per hari)
exports.getUsageStats = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT DATE(created_at) AS tanggal, COUNT(*) AS total
      FROM activity_logs
      GROUP BY tanggal
      ORDER BY tanggal DESC
      LIMIT 7
    `);

    res.json(rows);
  } catch (err) {
    console.error("Usage stats error:", err);
    res.status(500).json({ message: "Gagal mengambil statistik penggunaan" });
  }
};

// join menggunakan LEFT JOIN
exports.getAllStudents = async (req, res) => {
  try {
    const [students] = await db.query(`
      SELECT u.id, u.name, u.email, sd.nisn, sd.jurusan, k.nama_kelas AS kelas
      FROM users u
      LEFT JOIN siswa_details sd ON sd.user_id = u.id
      LEFT JOIN kelas k ON k.id = sd.kelas_id
      WHERE u.role = 'siswa'
    `);

    res.json(students);
  } catch (error) {
    console.error("Gagal mengambil data siswa:", error);
    res.status(500).json({ message: "Gagal mengambil data siswa" });
  }
};

// action pada AdminSiswa.html
exports.getStudentById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, sd.nisn, sd.jurusan, k.nama_kelas AS kelas
       FROM users u
       LEFT JOIN siswa_details sd ON u.id = sd.user_id
       LEFT JOIN kelas k ON k.id = sd.kelas_id
       WHERE u.id = ? AND u.role = 'siswa'`,
      [id]
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Siswa tidak ditemukan" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Gagal mengambil detail siswa" });
  }
};

// hapus siswa
exports.deleteStudent = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM users WHERE id = ? AND role = 'siswa'", [id]);
    res.json({ message: "Siswa berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ message: "Gagal menghapus siswa" });
  }
};

exports.updateStudent = async (req, res) => {
  const { id } = req.params;
  const { nisn, jurusan, kelas } = req.body;

  try {
    // Default kelas_id null
    let kelas_id = null;

    // Jika input kelas diisi, cari atau tambahkan ke tabel kelas
    if (kelas && kelas.trim() !== "") {
      const [kelasRows] = await db.query(
        "SELECT id FROM kelas WHERE nama_kelas = ?",
        [kelas.trim()]
      );

      if (kelasRows.length > 0) {
        kelas_id = kelasRows[0].id;
      } else {
        // Tambahkan kelas baru ke tabel kelas
        const [inserted] = await db.query(
          "INSERT INTO kelas (nama_kelas) VALUES (?)",
          [kelas.trim()]
        );
        kelas_id = inserted.insertId;
      }
    }

    // Cek apakah NISN sudah digunakan oleh user_id lain
    const [dup] = await db.query(
      "SELECT * FROM siswa_details WHERE nisn = ? AND user_id != ?",
      [nisn, id]
    );

    if (dup.length > 0) {
      return res
        .status(400)
        .json({ message: "NISN sudah digunakan oleh siswa lain." });
    }

    // Cek apakah data siswa_details sudah ada
    const [exists] = await db.query(
      "SELECT * FROM siswa_details WHERE user_id = ?",
      [id]
    );

    if (exists.length > 0) {
      await db.query(
        "UPDATE siswa_details SET nisn = ?, jurusan = ?, kelas_id = ? WHERE user_id = ?",
        [nisn, jurusan, kelas_id, id]
      );
    } else {
      await db.query(
        "INSERT INTO siswa_details (user_id, nisn, jurusan, kelas_id) VALUES (?, ?, ?, ?)",
        [id, nisn, jurusan, kelas_id]
      );
    }

    res.json({ message: "Data siswa berhasil diperbarui" });
  } catch (err) {
    console.error("Update siswa gagal:", err);
    res.status(500).json({ message: "Gagal memperbarui data siswa" });
  }
};

exports.createStudent = async (req, res) => {
  const { name, email, password, nisn, jurusan, kelas } = req.body;

  try {
    // Cek duplikat email
    const [existing] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (existing.length > 0) {
      return res
        .status(400)
        .json({ message: "Email sudah digunakan oleh pengguna lain." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user (tanpa is_verified)
    const [userResult] = await db.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'siswa')",
      [name, email, hashedPassword]
    );
    const userId = userResult.insertId;

    // ✅ Langsung approve di tabel verifications
    await db.query(
      "INSERT INTO verifications (user_id, status) VALUES (?, 'approved')",
      [userId]
    );

    // Handle kelas jika diisi
    let kelas_id = null;
    if (kelas && kelas.trim() !== "") {
      const [kelasRows] = await db.query(
        "SELECT id FROM kelas WHERE nama_kelas = ?",
        [kelas.trim()]
      );

      if (kelasRows.length > 0) {
        kelas_id = kelasRows[0].id;
      } else {
        const [inserted] = await db.query(
          "INSERT INTO kelas (nama_kelas) VALUES (?)",
          [kelas.trim()]
        );
        kelas_id = inserted.insertId;
      }
    }

    // Insert ke siswa_details
    await db.query(
      "INSERT INTO siswa_details (user_id, nisn, jurusan, kelas_id) VALUES (?, ?, ?, ?)",
      [userId, nisn, jurusan, kelas_id]
    );

    res.json({
      message: "Siswa berhasil ditambahkan dan otomatis diverifikasi.",
    });
  } catch (err) {
    console.error("Gagal menambahkan siswa:", err);
    res
      .status(500)
      .json({ message: "Terjadi kesalahan saat menambahkan siswa." });
  }
};

exports.searchStudents = async (req, res) => {
  const keyword = req.query.keyword;

  try {
    const [rows] = await db.query(
      `
      SELECT u.id, u.name, u.email, sd.nisn, sd.jurusan, k.nama_kelas AS kelas
      FROM users u
      LEFT JOIN siswa_details sd ON sd.user_id = u.id
      LEFT JOIN kelas k ON k.id = sd.kelas_id
      WHERE u.role = 'siswa' AND (
        u.name LIKE ? OR
        u.email LIKE ? OR
        sd.nisn LIKE ? OR
        sd.jurusan LIKE ? OR
        k.nama_kelas LIKE ?
      )
      `,
      Array(5).fill(`%${keyword}%`)
    );

    res.json(rows);
  } catch (error) {
    console.error("Gagal mencari siswa:", error);
    res.status(500).json({ message: "Gagal mencari siswa" });
  }
};

exports.filterStudents = async (req, res) => {
  const { jurusan, kelas } = req.query;

  try {
    const conditions = [];
    const params = [];

    if (jurusan) {
      conditions.push("sd.jurusan LIKE ?");
      params.push(`%${jurusan}%`);
    }

    if (kelas) {
      conditions.push("k.nama_kelas LIKE ?");
      params.push(`%${kelas}%`);
    }

    const whereClause = conditions.length
      ? `AND ${conditions.join(" AND ")}`
      : "";

    const [results] = await db.query(
      `
      SELECT u.id, u.name, u.email, sd.nisn, sd.jurusan, k.nama_kelas AS kelas
      FROM users u
      LEFT JOIN siswa_details sd ON sd.user_id = u.id
      LEFT JOIN kelas k ON k.id = sd.kelas_id
      WHERE u.role = 'siswa' ${whereClause}
      `,
      params
    );

    res.json(results);
  } catch (err) {
    console.error("Filter siswa gagal:", err);
    res.status(500).json({ message: "Gagal memfilter data siswa" });
  }
};

// admin guru
// GET all teachers
exports.getAllTeachers = async (req, res) => {
  try {
    const [results] = await db.query(`
      SELECT 
        u.id, u.name, u.email, gd.nip, gd.mapel,
        GROUP_CONCAT(k.nama_kelas SEPARATOR ', ') AS kelas
      FROM users u
      LEFT JOIN guru_details gd ON gd.user_id = u.id
      LEFT JOIN guru_kelas gk ON gk.guru_id = gd.id
      LEFT JOIN kelas k ON k.id = gk.kelas_id
      WHERE u.role = 'guru'
      GROUP BY u.id, u.name, u.email, gd.nip, gd.mapel
    `);

    res.json(results);
  } catch (error) {
    console.error("Gagal mengambil data guru:", error);
    res.status(500).json({ message: "Gagal mengambil data guru" });
  }
};

// GET teacher by ID
exports.getTeacherById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      `
      SELECT 
        u.id, u.name, u.email, gd.nip, gd.mapel,
        GROUP_CONCAT(k.nama_kelas SEPARATOR ', ') AS kelas
      FROM users u
      LEFT JOIN guru_details gd ON gd.user_id = u.id
      LEFT JOIN guru_kelas gk ON gk.guru_id = gd.id
      LEFT JOIN kelas k ON k.id = gk.kelas_id
      WHERE u.role = 'guru' AND u.id = ?
      GROUP BY u.id, u.name, u.email, gd.nip, gd.mapel
    `,
      [id]
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Guru tidak ditemukan" });

    res.json(rows[0]);
  } catch (error) {
    console.error("Gagal mengambil guru:", error);
    res.status(500).json({ message: "Gagal mengambil guru" });
  }
};

// POST create teacher
// POST create teacher
exports.createTeacher = async (req, res) => {
  const { name, email, password, nip, mapel, kelas } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const [userResult] = await db.query(
      `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'guru')`,
      [name, email, hashedPassword]
    );

    const userId = userResult.insertId;

    // Simpan ke guru_details
    const [guruResult] = await db.query(
      `INSERT INTO guru_details (user_id, nip, mapel) VALUES (?, ?, ?)`,
      [userId, nip, mapel]
    );
    const guruId = guruResult.insertId;

    // Simpan kelas (pisahkan dengan koma)
    const kelasArray = kelas.split(",").map((k) => k.trim());
    for (let nama_kelas of kelasArray) {
      const [kelasRows] = await db.query(
        "SELECT id FROM kelas WHERE nama_kelas = ?",
        [kelas]
      );
      if (kelasRows.length === 0) {
        return res.status(400).json({ message: "Kelas tidak ditemukan." });
      }

      if (kelasRows.length > 0) {
        await db.query(
          "UPDATE siswa_details SET nisn = ?, jurusan = ?, kelas_id = ? WHERE user_id = ?",
          [nisn, jurusan, kelas_id, id]
        );
      }
    }

    res.json({ message: "Guru berhasil ditambahkan" });
  } catch (error) {
    console.error("Gagal menambah guru:", error);
    res.status(500).json({ message: "Gagal menambah guru" });
  }
};

// PUT update teacher
exports.updateTeacher = async (req, res) => {
  const { id } = req.params;
  const { name, email, nip, mapel, kelas } = req.body;

  try {
    // Update tabel users
    await db.query(`UPDATE users SET name = ?, email = ? WHERE id = ?`, [
      name,
      email,
      id,
    ]);

    // Cek apakah guru_details sudah ada
    const [check] = await db.query(
      `SELECT * FROM guru_details WHERE user_id = ?`,
      [id]
    );

    let guruId;

    if (check.length > 0) {
      // Update guru_details
      await db.query(
        `UPDATE guru_details SET nip = ?, mapel = ? WHERE user_id = ?`,
        [nip, mapel, id]
      );
      guruId = check[0].id;
    } else {
      // Insert guru_details
      const [insertResult] = await db.query(
        `INSERT INTO guru_details (user_id, nip, mapel) VALUES (?, ?, ?)`,
        [id, nip, mapel]
      );
      guruId = insertResult.insertId;
    }

    // Hapus semua kelas lama dari guru_kelas
    await db.query(`DELETE FROM guru_kelas WHERE guru_id = ?`, [guruId]);

    // Tambahkan ulang kelas baru
    const kelasArray = kelas.split(",").map((k) => k.trim());

    for (let nama_kelas of kelasArray) {
      const [kelasRows] = await db.query(
        `SELECT id FROM kelas WHERE nama_kelas = ?`,
        [nama_kelas]
      );

      if (kelasRows.length > 0) {
        await db.query(
          `INSERT INTO guru_kelas (guru_id, kelas_id) VALUES (?, ?)`,
          [guruId, kelasRows[0].id]
        );
      }
    }

    res.json({ message: "Guru berhasil diperbarui" });
  } catch (error) {
    console.error("Gagal mengupdate guru:", error);
    res.status(500).json({ message: "Gagal mengupdate guru" });
  }
};

// DELETE teacher
exports.deleteTeacher = async (req, res) => {
  const { id } = req.params;

  try {
    // Ambil ID dari guru_details
    const [guruRows] = await db.query(
      `SELECT id FROM guru_details WHERE user_id = ?`,
      [id]
    );
    if (guruRows.length > 0) {
      const guruId = guruRows[0].id;
      // Hapus relasi di guru_kelas
      await db.query(`DELETE FROM guru_kelas WHERE guru_id = ?`, [guruId]);
    }

    // Hapus dari users (akan cascade ke guru_details karena foreign key)
    await db.query(`DELETE FROM users WHERE id = ?`, [id]);

    res.json({ message: "Guru berhasil dihapus" });
  } catch (error) {
    console.error("Gagal menghapus guru:", error);
    res.status(500).json({ message: "Gagal menghapus guru" });
  }
};

// search teachers
exports.searchTeachers = async (req, res) => {
  const { keyword } = req.query;

  try {
    const [results] = await db.query(
      `
      SELECT u.id, u.name, u.email, gd.nip, gd.mapel,
             GROUP_CONCAT(k.nama_kelas SEPARATOR ', ') AS kelas
      FROM users u
      LEFT JOIN guru_details gd ON gd.user_id = u.id
      LEFT JOIN guru_kelas gk ON gk.guru_id = gd.id
      LEFT JOIN kelas k ON k.id = gk.kelas_id
      WHERE u.role = 'guru' AND (
        u.name LIKE ? OR
        u.email LIKE ? OR
        gd.nip LIKE ? OR
        gd.mapel LIKE ? OR
        k.nama_kelas LIKE ?
      )
      GROUP BY u.id, u.name, u.email, gd.nip, gd.mapel
    `,
      [
        `%${keyword}%`,
        `%${keyword}%`,
        `%${keyword}%`,
        `%${keyword}%`,
        `%${keyword}%`,
      ]
    );

    res.json(results);
  } catch (error) {
    console.error("Gagal mencari guru:", error);
    res.status(500).json({ message: "Gagal mencari guru" });
  }
};

// filter teachers
exports.filterTeachers = async (req, res) => {
  const { mapel, kelas } = req.query;

  try {
    const conditions = [`u.role = 'guru'`];
    const params = [];

    if (mapel) {
      conditions.push(`gd.mapel LIKE ?`);
      params.push(`%${mapel}%`);
    }

    if (kelas) {
      conditions.push(`k.nama_kelas LIKE ?`);
      params.push(`%${kelas}%`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const [results] = await db.query(
      `
      SELECT u.id, u.name, u.email, gd.nip, gd.mapel,
             GROUP_CONCAT(k.nama_kelas SEPARATOR ', ') AS kelas
      FROM users u
      LEFT JOIN guru_details gd ON gd.user_id = u.id
      LEFT JOIN guru_kelas gk ON gk.guru_id = gd.id
      LEFT JOIN kelas k ON k.id = gk.kelas_id
      ${whereClause}
      GROUP BY u.id, u.name, u.email, gd.nip, gd.mapel
    `,
      params
    );

    res.json(results);
  } catch (error) {
    console.error("Gagal memfilter guru:", error);
    res.status(500).json({ message: "Gagal memfilter guru" });
  }
};

// GET all classes
exports.getAllKelas = async (req, res) => {
  try {
    const [kelas] = await db.query(`SELECT * FROM kelas`);
    res.json(kelas);
  } catch (err) {
    console.error("Gagal mengambil data kelas:", err);
    res.status(500).json({ message: "Gagal mengambil data kelas" });
  }
};

// end admin guru

// admin courses
exports.getAllCourses = async (req, res) => {
  try {
    const [results] = await db.query(`
      SELECT c.*, u.name AS created_by_name 
      FROM courses c 
      LEFT JOIN users u ON c.created_by = u.id
      WHERE u.role = 'guru'
    `);
    res.json(results);
  } catch (error) {
    console.error("Gagal mengambil data courses:", error);
    res.status(500).json({ message: "Gagal mengambil data courses" });
  }
};

exports.getCoursesStats = async (req, res) => {
  try {
    const [result] = await db.query(`
      SELECT COUNT(*) as total
      FROM courses c
      JOIN users u ON c.created_by = u.id
      WHERE u.role = 'guru'
    `);
    res.json({ total: result[0].total });
  } catch (error) {
    console.error("Gagal mengambil statistik kursus guru:", error);
    res.status(500).json({ message: "Gagal mengambil statistik kursus guru" });
  }
};

// Get course by ID
exports.getCourseById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT c.*, u.name as creator_name FROM courses c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = ? AND u.role = 'guru'`,
      [id]
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Course tidak ditemukan" });

    res.json(rows[0]);
  } catch (error) {
    console.error("Gagal mengambil course:", error);
    res.status(500).json({ message: "Gagal mengambil course" });
  }
};

// Create new course
exports.createCourse = async (req, res) => {
  try {
    // 🔥 Tambahkan log debug di awal fungsi
    console.log("🔥 DEBUG: req.body =", req.body);
    console.log("🔥 DEBUG: kelas[] =", req.body["kelas[]"]);
    console.log("🔥 DEBUG: file =", req.file?.filename);

    const { name, description } = req.body;
    const file = req.file;
    const guruId = req.user?.id;

    if (!file) {
      return res.status(400).json({ message: "File tidak ditemukan." });
    }

    const filepath = `/uploads/courses/${file.filename}`;

    // Tangkap dan pastikan kelas[] masuk
    const kelasRaw = req.body.kelas || req.body["kelas[]"];

    const kelasArray = Array.isArray(kelasRaw)
      ? kelasRaw
      : kelasRaw
      ? [kelasRaw]
      : [];

    console.log("✅ Kelas[] diterima dari form:", kelasArray);

    // 🚨 Validasi jika tidak ada kelas dicentang
    if (kelasArray.length === 0) {
      return res.status(400).json({ message: "Pilih minimal satu kelas." });
    }

    // Simpan course ke tabel courses
    const [course] = await db.query(
      "INSERT INTO courses (name, description, created_by, file_path) VALUES (?, ?, ?, ?)",
      [name, description, guruId, filepath]
    );
    const courseId = course.insertId;
    console.log("🆔 ID course baru:", courseId);

    // Simpan kelas ke tabel course_kelas
    for (const kelasNama of kelasArray) {
      const [kelasRows] = await db.query(
        "SELECT id FROM kelas WHERE nama_kelas = ?",
        [kelasNama]
      );

      console.log(`🔍 Mencari ID kelas untuk: ${kelasNama}`, kelasRows);

      if (kelasRows.length > 0) {
        const kelasId = kelasRows[0].id;
        await db.query(
          "INSERT INTO course_kelas (course_id, kelas_id) VALUES (?, ?)",
          [courseId, kelasId]
        );
        console.log(
          `✅ Berhasil insert course_kelas: (${courseId}, ${kelasId})`
        );
      } else {
        console.warn(`⚠️ Kelas tidak ditemukan di database: ${kelasNama}`);
      }
    }

    res.json({ message: "Materi berhasil diunggah." });
  } catch (err) {
    console.error("❌ Gagal unggah materi:", err);
    res.status(500).json({ message: "Gagal unggah materi." });
  }
};

// Update course
exports.updateCourse = async (req, res) => {
  const { id } = req.params;
  const { name, description, kelas } = req.body;
  try {
    await db.query(
      `UPDATE courses SET name = ?, description = ?, kelas = ? WHERE id = ?`,
      [name, description, kelas, id]
    );
    res.json({ message: "Course berhasil diperbarui" });
  } catch (error) {
    console.error("Gagal mengupdate course:", error);
    res.status(500).json({ message: "Gagal mengupdate course" });
  }
};

// Delete course
exports.deleteCourse = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(`DELETE FROM courses WHERE id = ?`, [id]);
    res.json({ message: "Course berhasil dihapus" });
  } catch (error) {
    console.error("Gagal menghapus course:", error);
    res.status(500).json({ message: "Gagal menghapus course" });
  }
};

// Jumlah siswa berdasarkan course
exports.getStudentCountByCourse = async (req, res) => {
  const { courseId } = req.params;

  try {
    const [result] = await db.query(
      `SELECT COUNT(*) AS total FROM course_enrollments WHERE course_id = ?`,
      [courseId]
    );

    res.json({ total: result[0].total });
  } catch (err) {
    console.error("Gagal mengambil jumlah siswa:", err);
    res.status(500).json({ message: "Gagal mengambil data siswa" });
  }
};

// Daftar siswa dalam satu course
exports.getStudentsByCourse = async (req, res) => {
  const { courseId } = req.params;

  try {
    const [rows] = await db.query(
      `
      SELECT u.id, u.name, u.email, sd.kelas, sd.jurusan, sd.nisn
      FROM course_enrollments ce
      JOIN users u ON u.id = ce.student_id
      LEFT JOIN siswa_details sd ON sd.user_id = u.id
      WHERE ce.course_id = ?
    `,
      [courseId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Gagal mengambil data siswa untuk course:", err);
    res.status(500).json({ message: "Gagal mengambil data siswa" });
  }
};

// Dashboard Guru
exports.getCoursesByGuru = async (req, res) => {
  const guruId = req.params.guruId;

  try {
    const [checkGuru] = await db.query(
      "SELECT * FROM users WHERE id = ? AND role = 'guru'",
      [guruId]
    );
    if (checkGuru.length === 0) {
      return res.status(404).json({ message: "Guru tidak ditemukan." });
    }

    const [courses] = await db.query(
      `SELECT id, name, description, kelas FROM courses WHERE created_by = ?`,
      [guruId]
    );

    res.json(courses);
  } catch (err) {
    console.error("Gagal mengambil data mata pelajaran guru:", err);
    res.status(500).json({ message: "Gagal mengambil data" });
  }
};

// Ambil profil guru berdasarkan ID dari authMiddleware
exports.getGuruProfile = async (req, res) => {
  try {
    const guruId = req.user.id;

    const [rows] = await db.query(
      `SELECT u.name, u.email, u.foto, gd.nip, gd.mapel
       FROM users u
       LEFT JOIN guru_details gd ON gd.user_id = u.id
       WHERE u.id = ? AND u.role = 'guru'`,
      [guruId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Profil guru tidak ditemukan." });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Gagal mengambil profil guru:", error);
    res.status(500).json({ message: "Terjadi kesalahan server." });
  }
};

exports.updateGuruProfile = async (req, res) => {
  const guruId = req.user.id;
  const { name, email, nip, mapel } = req.body;

  try {
    // Update data users
    await db.query(`UPDATE users SET name = ?, email = ? WHERE id = ?`, [
      name,
      email,
      guruId,
    ]);

    // Update atau insert ke guru_details
    const [check] = await db.query(
      `SELECT * FROM guru_details WHERE user_id = ?`,
      [guruId]
    );

    if (check.length > 0) {
      await db.query(
        `UPDATE guru_details SET nip = ?, mapel = ? WHERE user_id = ?`,
        [nip, mapel, guruId]
      );
    } else {
      await db.query(
        `INSERT INTO guru_details (user_id, nip, mapel) VALUES (?, ?, ?)`,
        [guruId, nip, mapel]
      );
    }

    res.json({ message: "Profil guru berhasil diperbarui" });
  } catch (error) {
    console.error("Update profile gagal:", error);
    res.status(500).json({ message: "Gagal memperbarui profil" });
  }
};

// Get dashboard data khusus guru (jumlah mapel, siswa, dsb)
exports.getGuruDashboardStats = async (req, res) => {
  const guruId = req.user.id;

  try {
    // Total Mata Pelajaran (berdasarkan jumlah courses)
    const [mapel] = await db.query(
      `SELECT COUNT(*) AS total FROM courses WHERE created_by = ?`,
      [guruId]
    );

    // Ambil semua kelas yang terkait dengan courses guru ini
    const [kelas] = await db.query(
      `SELECT DISTINCT ck.kelas_id
       FROM courses c
       JOIN course_kelas ck ON ck.course_id = c.id
       WHERE c.created_by = ?`,
      [guruId]
    );

    // Ambil total siswa dari semua kelas yang diajar
    let totalSiswa = 0;
    for (const k of kelas) {
      const [jumlah] = await db.query(
        `SELECT COUNT(*) AS total
         FROM siswa_details
         WHERE kelas_id = ?`,
        [k.kelas_id]
      );
      totalSiswa += jumlah[0].total;
    }

    res.json({
      totalMapel: mapel[0].total,
      totalSiswa,
    });
  } catch (err) {
    console.error("Gagal ambil data dashboard guru:", err);
    res.status(500).json({ message: "Gagal memuat data dashboard guru" });
  }
};

exports.getGuruCoursesWithClassAndCount = async (req, res) => {
  const guruId = req.user.id;
  try {
    const [rows] = await db.query(
      `
      SELECT 
        c.name AS course_name,
        k.nama_kelas AS jurusan,
        (
          SELECT COUNT(*) FROM siswa_details sd 
          WHERE sd.kelas_id = k.id
        ) AS jumlah_siswa
      FROM courses c
      JOIN course_kelas ck ON ck.course_id = c.id
      JOIN kelas k ON k.id = ck.kelas_id
      WHERE c.created_by = ?
    `,
      [guruId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Gagal ambil kursus guru:", err);
    res.status(500).json({ message: "Gagal mengambil data kursus guru" });
  }
};

exports.getGuruCoursesWithClassAndCount = async (req, res) => {
  const guruId = req.user.id;
  try {
    const [rows] = await db.query(
      `
      SELECT 
        c.name AS course_name,
        k.nama_kelas AS jurusan,
        (
          SELECT COUNT(*) 
          FROM siswa_details sd 
          WHERE sd.kelas_id = k.id
        ) AS jumlah_siswa
      FROM courses c
      JOIN course_kelas ck ON ck.course_id = c.id
      JOIN kelas k ON k.id = ck.kelas_id
      WHERE c.created_by = ?
      ORDER BY k.nama_kelas
    `,
      [guruId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Gagal ambil kursus guru:", err);
    res.status(500).json({ message: "Gagal mengambil data kursus guru" });
  }
};

// ✅ CREATE TUGAS
// exports.createTugas = async (req, res) => {
//   const guruId = req.user.id;
//   const { judul, deskripsi, deadline } = req.body;
//   const file = req.file;
//   const kelasRaw = req.body.kelas || req.body["kelas[]"];
//   const kelasArray = Array.isArray(kelasRaw) ? kelasRaw : [kelasRaw];

//   if (!file)
//     return res.status(400).json({ message: "File tugas tidak ditemukan." });

//   if (!judul || !deskripsi || !deadline || kelasArray.length === 0) {
//     return res.status(400).json({ message: "Semua field wajib diisi." });
//   }

//   const filePath = `https://lmssmkn4kotser-production.up.railway.app/uploadss/tugas/${file.filename}`;

//   try {
//     const [tugas] = await db.query(
//       `INSERT INTO tugas (judul, deskripsi, deadline, file_path, created_by) VALUES (?, ?, ?, ?, ?)`,
//       [judul, deskripsi, deadline, filePath, guruId]
//     );
//     const tugasId = tugas.insertId;

//     for (const kelas of kelasArray) {
//       const [k] = await db.query("SELECT id FROM kelas WHERE nama_kelas = ?", [
//         kelas,
//       ]);
//       if (k.length > 0) {
//         await db.query(
//           "INSERT INTO tugas_kelas (tugas_id, kelas_id) VALUES (?, ?)",
//           [tugasId, k[0].id]
//         );
//       }
//     }

//     res.json({ message: "Tugas berhasil dibuat." });
//   } catch (err) {
//     console.error("Gagal membuat tugas:", err);
//     res.status(500).json({ message: "Gagal membuat tugas." });
//   }
// };

exports.createTugas = async (req, res) => {
  const guruId = req.user.id;
  const { judul, deskripsi, deadline } = req.body;
  const file = req.file;
  const kelasRaw = req.body.kelas || req.body["kelas[]"];
  const kelasArray = Array.isArray(kelasRaw) ? kelasRaw : [kelasRaw];

  if (!file)
    return res.status(400).json({ message: "File tugas tidak ditemukan." });
  if (!judul || !deskripsi || !deadline || kelasArray.length === 0) {
    return res.status(400).json({ message: "Semua field wajib diisi." });
  }

  try {
    const ext = path.extname(file.originalname);
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "auto",
          folder: "tugas",
          public_id: Date.now() + "-" + path.basename(file.originalname, ext),
        },
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      );
      stream.end(file.buffer);
    });

    const filePath = result.secure_url;

    const [tugas] = await db.query(
      `INSERT INTO tugas (judul, deskripsi, deadline, file_path, created_by) VALUES (?, ?, ?, ?, ?)`,
      [judul, deskripsi, deadline, filePath, guruId]
    );

    const tugasId = tugas.insertId;

    for (const kelas of kelasArray) {
      const [k] = await db.query("SELECT id FROM kelas WHERE nama_kelas = ?", [
        kelas,
      ]);
      if (k.length > 0) {
        await db.query(
          "INSERT INTO tugas_kelas (tugas_id, kelas_id) VALUES (?, ?)",
          [tugasId, k[0].id]
        );
      }
    }

    res.json({ message: "Tugas berhasil dibuat." });
  } catch (err) {
    console.error("Gagal membuat tugas:", err);
    res.status(500).json({ message: "Gagal membuat tugas." });
  }
};

// ✅ GET SEMUA TUGAS GURU
exports.getTugasGuru = async (req, res) => {
  const guruId = req.user.id;
  try {
    const [rows] = await db.query(
      `SELECT t.id, t.judul, t.deskripsi, t.deadline, t.created_at, t.file_path,
              GROUP_CONCAT(k.nama_kelas SEPARATOR ', ') AS kelas,
              COUNT(DISTINCT pt.id) AS jumlah_kumpul,
              COUNT(DISTINCT sd.user_id) AS jumlah_siswa
       FROM tugas t
       JOIN tugas_kelas tk ON tk.tugas_id = t.id
       JOIN kelas k ON k.id = tk.kelas_id
       LEFT JOIN siswa_details sd ON sd.kelas_id = k.id
       LEFT JOIN pengumpulan_tugas pt ON pt.tugas_id = t.id
       WHERE t.created_by = ?
       GROUP BY t.id
       ORDER BY t.created_at DESC`,
      [guruId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Gagal ambil tugas guru:", err);
    res.status(500).json({ message: "Gagal mengambil tugas." });
  }
};

// ✅ FILTER TUGAS BY TYPE (belum dinilai, deadline, selesai)
exports.filterTugasByType = async (req, res) => {
  const guruId = req.user.id;
  const { type } = req.params;

  let condition = "";
  if (type === "deadline") {
    condition = `AND t.deadline BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)`;
  } else if (type === "ungraded") {
    condition = `AND EXISTS (
      SELECT 1 FROM pengumpulan_tugas pt WHERE pt.tugas_id = t.id AND pt.nilai IS NULL
    )`;
  } else if (type === "completed") {
    condition = `AND t.deadline < CURDATE()`;
  }

  try {
    const [rows] = await db.query(
      `SELECT t.id, t.judul, t.deskripsi, t.deadline, t.created_at, t.file_path,
              GROUP_CONCAT(k.nama_kelas SEPARATOR ', ') AS kelas,
              COUNT(DISTINCT pt.id) AS jumlah_kumpul,
              COUNT(DISTINCT sd.user_id) AS jumlah_siswa
       FROM tugas t
       JOIN tugas_kelas tk ON tk.tugas_id = t.id
       JOIN kelas k ON k.id = tk.kelas_id
       LEFT JOIN siswa_details sd ON sd.kelas_id = k.id
       LEFT JOIN pengumpulan_tugas pt ON pt.tugas_id = t.id
       WHERE t.created_by = ? ${condition}
       GROUP BY t.id
       ORDER BY t.created_at DESC`,
      [guruId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Filter tugas gagal:", err);
    res.status(500).json({ message: "Gagal filter tugas." });
  }
};

exports.getTugasById = async (req, res) => {
  const guruId = req.user.id;
  const tugasId = req.params.id;

  try {
    const [[tugas]] = await db.query(
      `SELECT * FROM tugas WHERE id = ? AND created_by = ?`,
      [tugasId, guruId]
    );

    if (!tugas)
      return res.status(404).json({ message: "Tugas tidak ditemukan" });

    const [kelasRows] = await db.query(
      `SELECT k.nama_kelas FROM tugas_kelas tk 
       JOIN kelas k ON k.id = tk.kelas_id 
       WHERE tk.tugas_id = ?`,
      [tugasId]
    );

    tugas.kelas = kelasRows.map((k) => k.nama_kelas);

    res.json(tugas);
  } catch (err) {
    console.error("Gagal ambil tugas:", err);
    res.status(500).json({ message: "Gagal mengambil tugas." });
  }
};

// exports.updateTugas = async (req, res) => {
//   const guruId = req.user.id;
//   const tugasId = req.params.id;
//   const { judul, deskripsi, deadline } = req.body;
//   const file = req.file;
//   const kelasRaw = req.body.kelas || req.body["kelas[]"];
//   const kelasArray = Array.isArray(kelasRaw) ? kelasRaw : [kelasRaw];

//   try {
//     const [[cek]] = await db.query(
//       `SELECT * FROM tugas WHERE id = ? AND created_by = ?`,
//       [tugasId, guruId]
//     );
//     if (!cek) return res.status(403).json({ message: "Akses ditolak" });

//     let filePath = cek.file_path;
//     if (file) {
//       filePath = `https://lmssmkn4kotser-production.up.railway.app/uploadss/tugas/${file.filename}`;
//     }

//     await db.query(
//       `UPDATE tugas SET judul = ?, deskripsi = ?, deadline = ?, file_path = ? WHERE id = ?`,
//       [judul, deskripsi, deadline, filePath, tugasId]
//     );

//     await db.query(`DELETE FROM tugas_kelas WHERE tugas_id = ?`, [tugasId]);

//     for (const kelas of kelasArray) {
//       const [k] = await db.query("SELECT id FROM kelas WHERE nama_kelas = ?", [
//         kelas,
//       ]);
//       if (k.length > 0) {
//         await db.query(
//           "INSERT INTO tugas_kelas (tugas_id, kelas_id) VALUES (?, ?)",
//           [tugasId, k[0].id]
//         );
//       }
//     }

//     res.json({ message: "Tugas berhasil diperbarui." });
//   } catch (err) {
//     console.error("Gagal update tugas:", err);
//     res.status(500).json({ message: "Gagal memperbarui tugas." });
//   }
// };

exports.updateTugas = async (req, res) => {
  const guruId = req.user.id;
  const tugasId = req.params.id;
  const { judul, deskripsi, deadline } = req.body;
  const file = req.file;
  const kelasRaw = req.body.kelas || req.body["kelas[]"];
  const kelasArray = Array.isArray(kelasRaw) ? kelasRaw : [kelasRaw];

  try {
    const [[cek]] = await db.query(
      `SELECT * FROM tugas WHERE id = ? AND created_by = ?`,
      [tugasId, guruId]
    );
    if (!cek) return res.status(403).json({ message: "Akses ditolak" });

    let filePath = cek.file_path;

    if (file) {
      const ext = path.extname(file.originalname);
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: "auto",
            folder: "tugas",
            public_id: Date.now() + "-" + path.basename(file.originalname, ext),
          },
          (err, result) => {
            if (err) reject(err);
            else resolve(result);
          }
        );
        stream.end(file.buffer);
      });

      filePath = result.secure_url;
    }

    await db.query(
      `UPDATE tugas SET judul = ?, deskripsi = ?, deadline = ?, file_path = ? WHERE id = ?`,
      [judul, deskripsi, deadline, filePath, tugasId]
    );

    await db.query(`DELETE FROM tugas_kelas WHERE tugas_id = ?`, [tugasId]);

    for (const kelas of kelasArray) {
      const [k] = await db.query("SELECT id FROM kelas WHERE nama_kelas = ?", [
        kelas,
      ]);
      if (k.length > 0) {
        await db.query(
          "INSERT INTO tugas_kelas (tugas_id, kelas_id) VALUES (?, ?)",
          [tugasId, k[0].id]
        );
      }
    }

    res.json({ message: "Tugas berhasil diperbarui." });
  } catch (err) {
    console.error("Gagal update tugas:", err);
    res.status(500).json({ message: "Gagal memperbarui tugas." });
  }
};

exports.deleteTugas = async (req, res) => {
  const guruId = req.user.id;
  const tugasId = req.params.id;

  try {
    const [[cek]] = await db.query(
      `SELECT * FROM tugas WHERE id = ? AND created_by = ?`,
      [tugasId, guruId]
    );
    if (!cek) return res.status(403).json({ message: "Akses ditolak" });

    await db.query(`DELETE FROM tugas_kelas WHERE tugas_id = ?`, [tugasId]);
    await db.query(`DELETE FROM tugas WHERE id = ?`, [tugasId]);

    res.json({ message: "Tugas berhasil dihapus." });
  } catch (err) {
    console.error("Gagal hapus tugas:", err);
    res.status(500).json({ message: "Gagal menghapus tugas." });
  }
};

exports.getTugasDetail = async (req, res) => {
  const guruId = req.user.id;
  const tugasId = req.params.id;

  try {
    const [[tugas]] = await db.query(
      `SELECT * FROM tugas WHERE id = ? AND created_by = ?`,
      [tugasId, guruId]
    );

    if (!tugas)
      return res.status(404).json({ message: "Tugas tidak ditemukan." });

    // Siswa yang sudah mengumpulkan
    const [sudah] = await db.query(
      `
      SELECT u.id, u.name, k.nama_kelas AS kelas, pt.file_path, pt.nilai
      FROM pengumpulan_tugas pt
      JOIN users u ON u.id = pt.siswa_id
      JOIN siswa_details sd ON sd.user_id = u.id
      JOIN kelas k ON k.id = sd.kelas_id
      WHERE pt.tugas_id = ?
    `,
      [tugasId]
    );

    // Siswa yang belum mengumpulkan
    const [belum] = await db.query(
      `
      SELECT u.id, u.name, k.nama_kelas AS kelas
      FROM tugas_kelas tk
      JOIN kelas k ON k.id = tk.kelas_id
      JOIN siswa_details sd ON sd.kelas_id = k.id
      JOIN users u ON u.id = sd.user_id
      WHERE tk.tugas_id = ?
        AND u.id NOT IN (
          SELECT siswa_id FROM pengumpulan_tugas WHERE tugas_id = ?
        )
    `,
      [tugasId, tugasId]
    );

    res.json({
      sudah_kumpul: sudah,
      belum_kumpul: belum,
    });
  } catch (err) {
    console.error("❌ Gagal ambil detail tugas:", err);
    res.status(500).json({ message: "Gagal ambil detail tugas" });
  }
};

exports.berikanNilai = async (req, res) => {
  const { nilai } = req.body;
  const { tugasId, siswaId } = req.params;

  try {
    await db.query(
      `UPDATE pengumpulan_tugas SET nilai = ? WHERE tugas_id = ? AND siswa_id = ?`,
      [nilai, tugasId, siswaId]
    );

    res.json({ message: "Nilai berhasil diberikan." });
  } catch (err) {
    console.error("Gagal memberi nilai:", err);
    res.status(500).json({ message: "Gagal menyimpan nilai." });
  }
};

exports.createDiskusi = async (req, res) => {
  const guruId = req.user.id;
  const { judul, isi, kelas } = req.body;

  const kelasArray = Array.isArray(kelas) ? kelas : [kelas];
  if (!judul || !isi || kelasArray.length === 0) {
    return res.status(400).json({ message: "Semua field wajib diisi." });
  }

  try {
    const [diskusi] = await db.query(
      `INSERT INTO diskusi (judul, isi, created_by) VALUES (?, ?, ?)`,
      [judul, isi, guruId]
    );
    const diskusiId = diskusi.insertId;

    for (const kelasNama of kelasArray) {
      const [kelasRow] = await db.query(
        `SELECT id FROM kelas WHERE nama_kelas = ?`,
        [kelasNama]
      );
      if (kelasRow.length > 0) {
        await db.query(
          `INSERT INTO diskusi_kelas (diskusi_id, kelas_id) VALUES (?, ?)`,
          [diskusiId, kelasRow[0].id]
        );
      }
    }

    res.json({ message: "Diskusi berhasil dibuat." });
  } catch (err) {
    console.error("Gagal membuat diskusi:", err);
    res.status(500).json({ message: "Gagal membuat diskusi." });
  }
};

exports.getDiskusiGuru = async (req, res) => {
  const guruId = req.user.id;
  try {
    const [rows] = await db.query(
      `SELECT d.id, d.judul, d.isi, u.name AS guru,
        GROUP_CONCAT(k.nama_kelas SEPARATOR ', ') AS kelas
      FROM diskusi d
      JOIN users u ON u.id = d.created_by
      JOIN diskusi_kelas dk ON dk.diskusi_id = d.id
      JOIN kelas k ON k.id = dk.kelas_id
      WHERE d.created_by = ?
      GROUP BY d.id
      ORDER BY d.created_at DESC`,
      [guruId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Gagal ambil diskusi guru:", err);
    res.status(500).json({ message: "Gagal ambil diskusi." });
  }
};

exports.updateDiskusi = async (req, res) => {
  const { id } = req.params;
  const guruId = req.user.id;
  const { judul, isi, kelas } = req.body;
  const kelasArray = Array.isArray(kelas) ? kelas : [kelas];

  try {
    // Update diskusi
    await db.query(
      `UPDATE diskusi SET judul = ?, isi = ? WHERE id = ? AND created_by = ?`,
      [judul, isi, id, guruId]
    );

    // Update kelas
    await db.query(`DELETE FROM diskusi_kelas WHERE diskusi_id = ?`, [id]);

    for (const nama_kelas of kelasArray) {
      const [kelasRow] = await db.query(
        `SELECT id FROM kelas WHERE nama_kelas = ?`,
        [nama_kelas]
      );
      if (kelasRow.length > 0) {
        await db.query(
          `INSERT INTO diskusi_kelas (diskusi_id, kelas_id) VALUES (?, ?)`,
          [id, kelasRow[0].id]
        );
      }
    }

    res.json({ message: "Diskusi berhasil diperbarui." });
  } catch (err) {
    console.error("Gagal update diskusi:", err);
    res.status(500).json({ message: "Gagal update diskusi." });
  }
};

exports.deleteDiskusi = async (req, res) => {
  const { id } = req.params;
  const guruId = req.user.id;

  try {
    await db.query(`DELETE FROM diskusi WHERE id = ? AND created_by = ?`, [
      id,
      guruId,
    ]);
    res.json({ message: "Diskusi berhasil dihapus." });
  } catch (err) {
    console.error("Gagal hapus diskusi:", err);
    res.status(500).json({ message: "Gagal hapus diskusi." });
  }
};

exports.getDiskusiById = async (req, res) => {
  const { id } = req.params;
  const guruId = req.user.id;

  try {
    const [[diskusi]] = await db.query(
      `SELECT d.judul, d.isi, GROUP_CONCAT(k.nama_kelas SEPARATOR ',') AS kelas
       FROM diskusi d
       JOIN diskusi_kelas dk ON dk.diskusi_id = d.id
       JOIN kelas k ON k.id = dk.kelas_id
       WHERE d.id = ? AND d.created_by = ?
       GROUP BY d.id`,
      [id, guruId]
    );

    res.json(diskusi);
  } catch (err) {
    console.error("Gagal ambil detail diskusi:", err);
    res.status(500).json({ message: "Gagal ambil detail diskusi." });
  }
};

exports.getChatByDiskusi = async (req, res) => {
  const { id } = req.params;
  const [rows] = await db.query(
    `SELECT c.*, u.name, u.role FROM chat_diskusi c
     JOIN users u ON u.id = c.user_id
     WHERE c.diskusi_id = ?
     ORDER BY c.created_at ASC`,
    [id]
  );
  res.json(rows);
};

exports.addChatToDiskusi = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params; // diskusi_id
  const { isi } = req.body;

  if (!isi)
    return res.status(400).json({ message: "Pesan tidak boleh kosong" });

  await db.query(
    `INSERT INTO chat_diskusi (diskusi_id, user_id, isi) VALUES (?, ?, ?)`,
    [id, userId, isi]
  );

  res.json({ message: "Pesan berhasil dikirim" });
};
// end guru controllers

// controllers siswa
exports.getStudentsByKelas = async (req, res) => {
  const kelasNama = req.params.kelas;

  try {
    const [kelasRow] = await db.query(
      "SELECT id FROM kelas WHERE nama_kelas = ?",
      [kelasNama]
    );

    if (kelasRow.length === 0)
      return res.status(404).json({ message: "Kelas tidak ditemukan" });

    const kelasId = kelasRow[0].id;

    const [rows] = await db.query(
      `SELECT u.name, sd.nisn, sd.jurusan 
       FROM siswa_details sd
       JOIN users u ON sd.user_id = u.id
       WHERE sd.kelas_id = ?`,
      [kelasId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Gagal ambil siswa kelas:", err);
    res.status(500).json({ message: "Gagal mengambil siswa kelas" });
  }
};

// Ambil profil siswa
exports.getSiswaProfile = async (req, res) => {
  try {
    const siswaId = req.user.id;

    const [rows] = await db.query(
      `SELECT u.name, u.email, u.foto, sd.nisn, sd.jurusan, k.nama_kelas AS kelas
       FROM users u
       LEFT JOIN siswa_details sd ON sd.user_id = u.id
       LEFT JOIN kelas k ON k.id = sd.kelas_id
       WHERE u.id = ? AND u.role = 'siswa'`,
      [siswaId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Profil siswa tidak ditemukan." });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Gagal mengambil profil siswa:", error);
    res.status(500).json({ message: "Terjadi kesalahan server." });
  }
};

exports.updateSiswaProfile = async (req, res) => {
  const siswaId = req.user.id;
  const { name, email, nisn, jurusan, kelas } = req.body;

  try {
    // Update data users
    await db.query("UPDATE users SET name = ?, email = ? WHERE id = ?", [
      name,
      email,
      siswaId,
    ]);

    // Handle kelas
    let kelas_id = null;

    if (kelas && kelas.trim() !== "") {
      const [kelasRows] = await db.query(
        "SELECT id FROM kelas WHERE nama_kelas = ?",
        [kelas.trim()]
      );

      if (kelasRows.length > 0) {
        kelas_id = kelasRows[0].id;
      } else {
        const [inserted] = await db.query(
          "INSERT INTO kelas (nama_kelas) VALUES (?)",
          [kelas.trim()]
        );
        kelas_id = inserted.insertId;
      }
    }

    // Cek apakah data sudah ada
    const [exists] = await db.query(
      "SELECT * FROM siswa_details WHERE user_id = ?",
      [siswaId]
    );

    if (exists.length > 0) {
      await db.query(
        "UPDATE siswa_details SET nisn = ?, jurusan = ?, kelas_id = ? WHERE user_id = ?",
        [nisn, jurusan, kelas_id, siswaId]
      );
    } else {
      await db.query(
        "INSERT INTO siswa_details (user_id, nisn, jurusan, kelas_id) VALUES (?, ?, ?, ?)",
        [siswaId, nisn, jurusan, kelas_id]
      );
    }

    res.json({ message: "Profil siswa berhasil diperbarui" });
  } catch (error) {
    console.error("Gagal update profil siswa:", error);
    res.status(500).json({ message: "Gagal update profil siswa" });
  }
};

// GET Materi khusus untuk siswa berdasarkan kelas
exports.getMateriUntukSiswa = async (req, res) => {
  const siswaId = req.user.id;

  try {
    // Ambil kelas siswa
    const [[siswa]] = await db.query(
      `SELECT sd.kelas_id 
       FROM siswa_details sd
       WHERE sd.user_id = ?`,
      [siswaId]
    );

    if (!siswa || !siswa.kelas_id) {
      return res.status(404).json({ message: "Kelas siswa tidak ditemukan" });
    }

    // Ambil materi (courses) yang sesuai dengan kelas siswa
    const [materi] = await db.query(
      `SELECT c.id, c.name, c.description, c.file_path, c.created_at, u.name AS guru
       FROM courses c
       JOIN course_kelas ck ON ck.course_id = c.id
       JOIN users u ON u.id = c.created_by
       WHERE ck.kelas_id = ?`,
      [siswa.kelas_id]
    );

    res.json(materi);
  } catch (err) {
    console.error("Gagal ambil materi siswa:", err);
    res.status(500).json({ message: "Gagal mengambil materi" });
  }
};

exports.getTugasUntukSiswa = async (req, res) => {
  const siswaId = req.user.id;

  try {
    // Ambil kelas_id siswa
    const [[siswa]] = await db.query(
      `SELECT kelas_id FROM siswa_details WHERE user_id = ?`,
      [siswaId]
    );

    if (!siswa || !siswa.kelas_id) {
      return res.status(404).json({ message: "Kelas siswa tidak ditemukan" });
    }

    // Ambil semua tugas yang sesuai kelas
    const [tugas] = await db.query(
      `SELECT 
        t.id, t.judul, t.deskripsi, t.deadline, t.created_at, t.file_path,
        u.name AS guru,
        k.nama_kelas,
        pt.nilai,
        pt.file_path AS file_kumpul
      FROM tugas t
      JOIN tugas_kelas tk ON tk.tugas_id = t.id
      JOIN kelas k ON k.id = tk.kelas_id
      JOIN users u ON u.id = t.created_by
      LEFT JOIN pengumpulan_tugas pt ON pt.tugas_id = t.id AND pt.siswa_id = ?
      WHERE tk.kelas_id = ?
      ORDER BY t.deadline DESC`,
      [siswaId, siswa.kelas_id]
    );

    res.json(tugas);
  } catch (err) {
    console.error("Gagal mengambil tugas siswa:", err);
    res.status(500).json({ message: "Gagal mengambil tugas." });
  }
};

// exports.kumpulkanTugas = async (req, res) => {
//   const siswaId = req.user.id;
//   const tugasId = req.params.id;
//   const file = req.file;

//   if (!file) {
//     return res.status(400).json({ message: "File tugas wajib diunggah." });
//   }

//   const filePath = `https://lmssmkn4kotser-production.up.railway.app/uploadsss/KumpulanTugas/${file.filename}`;

//   try {
//     // Cek apakah siswa sudah pernah kumpul tugas
//     const [existing] = await db.query(
//       `SELECT * FROM pengumpulan_tugas WHERE tugas_id = ? AND siswa_id = ?`,
//       [tugasId, siswaId]
//     );

//     if (existing.length > 0) {
//       return res.status(400).json({ message: "Tugas sudah dikumpulkan." });
//     }

//     await db.query(
//       `INSERT INTO pengumpulan_tugas (tugas_id, siswa_id, file_path) VALUES (?, ?, ?)`,
//       [tugasId, siswaId, filePath]
//     );

//     res.json({ message: "Tugas berhasil dikumpulkan." });
//   } catch (err) {
//     console.error("Gagal kumpulkan tugas:", err);
//     res.status(500).json({ message: "Gagal kumpulkan tugas." });
//   }
// };

// exports.kumpulkanTugas = async (req, res) => {
//   const siswaId = req.user.id;
//   const tugasId = req.params.id;
//   const file = req.file;

//   if (!file) {
//     return res.status(400).json({ message: "File tugas wajib diunggah." });
//   }

//   try {
//     const result = await cloudinary.uploader.upload(file.path, {
//       resource_type: "raw",
//       folder: "pengumpulan_tugas",
//     });

//     const filePath = result.secure_url;

//     const [existing] = await db.query(
//       `SELECT * FROM pengumpulan_tugas WHERE tugas_id = ? AND siswa_id = ?`,
//       [tugasId, siswaId]
//     );

//     if (existing.length > 0) {
//       return res.status(400).json({ message: "Tugas sudah dikumpulkan." });
//     }

//     await db.query(
//       `INSERT INTO pengumpulan_tugas (tugas_id, siswa_id, file_path) VALUES (?, ?, ?)`,
//       [tugasId, siswaId, filePath]
//     );

//     res.json({ message: "Tugas berhasil dikumpulkan." });
//   } catch (err) {
//     console.error("Gagal kumpulkan tugas:", err);
//     res.status(500).json({ message: "Gagal kumpulkan tugas." });
//   }
// };

exports.kumpulkanTugas = async (req, res) => {
  const siswaId = req.user.id;
  const tugasId = req.params.id;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: "File tugas wajib diunggah." });
  }

  try {
    const ext = path.extname(file.originalname);
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "auto",
          folder: "pengumpulan_tugas",
          public_id: Date.now() + "-" + path.basename(file.originalname, ext),
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(file.buffer);
    });

    const filePath = result.secure_url;

    const [existing] = await db.query(
      `SELECT * FROM pengumpulan_tugas WHERE tugas_id = ? AND siswa_id = ?`,
      [tugasId, siswaId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "Tugas sudah dikumpulkan." });
    }

    await db.query(
      `INSERT INTO pengumpulan_tugas (tugas_id, siswa_id, file_path) VALUES (?, ?, ?)`,
      [tugasId, siswaId, filePath]
    );

    res.json({ message: "Tugas berhasil dikumpulkan." });
  } catch (err) {
    console.error("❌ Gagal upload tugas:", err.message);
    res
      .status(500)
      .json({ message: "Gagal upload tugas.", error: err.message });
  }
};

exports.getDiskusiUntukSiswa = async (req, res) => {
  const siswaId = req.user.id;
  try {
    const [[siswa]] = await db.query(
      `SELECT kelas_id FROM siswa_details WHERE user_id = ?`,
      [siswaId]
    );

    if (!siswa || !siswa.kelas_id) {
      return res.status(404).json({ message: "Kelas siswa tidak ditemukan" });
    }

    const [diskusi] = await db.query(
      `SELECT d.*, u.name AS guru, k.nama_kelas 
       FROM diskusi d
       JOIN users u ON u.id = d.created_by
       JOIN diskusi_kelas dk ON dk.diskusi_id = d.id
       JOIN kelas k ON k.id = dk.kelas_id
       WHERE dk.kelas_id = ?`,
      [siswa.kelas_id]
    );

    res.json(diskusi);
  } catch (err) {
    console.error("Gagal ambil diskusi siswa:", err);
    res.status(500).json({ message: "Gagal mengambil diskusi" });
  }
};

exports.getSiswaAssignmentStats = async (req, res) => {
  const siswaId = req.user.id;

  try {
    const [total] = await db.query(
      `SELECT COUNT(*) AS total FROM tugas t
       JOIN tugas_kelas tk ON tk.tugas_id = t.id
       JOIN siswa_details sd ON sd.kelas_id = tk.kelas_id
       WHERE sd.user_id = ?`,
      [siswaId]
    );

    const [submitted] = await db.query(
      `SELECT COUNT(*) AS total FROM pengumpulan_tugas 
       WHERE siswa_id = ?`,
      [siswaId]
    );

    const [graded] = await db.query(
      `SELECT COUNT(*) AS total FROM pengumpulan_tugas 
       WHERE siswa_id = ? AND nilai IS NOT NULL`,
      [siswaId]
    );

    res.json({
      total: total[0].total,
      completed: graded[0].total,
      pending: total[0].total - submitted[0].total,
    });
  } catch (err) {
    console.error("Gagal ambil statistik tugas siswa:", err);
    res.status(500).json({ message: "Gagal ambil data tugas siswa." });
  }
};
