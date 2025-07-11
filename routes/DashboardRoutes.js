const express = require("express");
const {
  adminDashboard,
  guruDashboard,
  siswaDashboard,
  getAdminStats,
  getPendingVerifications,
  getRecentLogs,
  getMonthlyGrowth,
  getStudentPrograms,
  getUsageStats,
  updateVerificationStatus,
  getAllStudents,
  getStudentById,
  deleteStudent,
  updateStudent,
  createStudent,
  searchStudents,
  filterStudents,
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  searchTeachers,
  filterTeachers,
  getAllCourses,
  getCoursesStats,
  getCourseById,
  updateCourse,
  createCourse,
  deleteCourse,
  getStudentCountByCourse,
  getStudentsByCourse,
  getCoursesByGuru,
  getAllKelas,
  getGuruProfile,
  updateGuruProfile,
  getSiswaProfile,
  updateSiswaProfile,
  getGuruDashboardStats,
  getGuruCoursesWithClassAndCount,
  getStudentsByKelas,
  createTugas,
  getTugasGuru,
  filterTugasByType,
  getTugasById,
  updateTugas,
  deleteTugas,
  getTugasDetail,
  berikanNilai,
  getMateriUntukSiswa,
  getTugasUntukSiswa,
  kumpulkanTugas,
  createDiskusi,
  getDiskusiUntukSiswa,
  getDiskusiGuru,
  updateDiskusi,
  deleteDiskusi,
  getDiskusiById,
  getChatByDiskusi,
  addChatToDiskusi,
  getSiswaAssignmentStats,
} = require("../controllers/DashboardControllers");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/DashboardMiddleware");
const multer = require("multer");
const path = require("path");
const router = express.Router();

// Setup penyimpanan file

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Kondisi berdasarkan URL
    if (req.originalUrl.includes("/guru/courses")) {
      cb(null, "public/uploads/courses/");
    } else if (req.originalUrl.includes("/guru/tugas")) {
      cb(null, "public/uploadss/tugas/");
    } else if (req.originalUrl.includes("/siswa/tugas")) {
      cb(null, "public/uploadsss/kumpulanTugas/");
    } else {
      cb(null, "public/uploads/others/");
    }
  },
  filename: (req, file, cb) => {
    cb(
      null,
      Date.now() +
        "-" +
        Math.round(Math.random() * 1e9) +
        path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage });

router.get("/admin", authMiddleware, roleMiddleware(["admin"]), adminDashboard);
router.get("/guru", authMiddleware, roleMiddleware(["guru"]), guruDashboard);
router.get("/siswa", authMiddleware, roleMiddleware(["siswa"]), siswaDashboard);
router.get("/admin/stats", getAdminStats);
router.get("/admin/verifications", getPendingVerifications);
router.get("/admin/logs", getRecentLogs);
router.get("/admin/growth", getMonthlyGrowth);
router.get("/admin/programs", getStudentPrograms);
router.get("/admin/usage", getUsageStats);
router.put("/admin/verify/:id", updateVerificationStatus);
// admin-siswa
router.get("/admin/students", getAllStudents);
router.delete("/admin/students/:id", deleteStudent);
router.put("/admin/students/:id", updateStudent);
router.post("/admin/students", createStudent);
router.get("/admin/students/search", searchStudents);
router.get("/admin/students/filter", filterStudents);
router.get("/admin/students/:id", getStudentById);
// admin-guru
router.get("admin/kelas", getAllKelas);
router.get("/admin/teachers", getAllTeachers);
router.post("/admin/teachers", createTeacher);
router.put("/admin/teachers/:id", updateTeacher);
router.delete("/admin/teachers/:id", deleteTeacher);
router.get("/admin/teachers/search", searchTeachers);
router.get("/admin/teachers/filter", filterTeachers);
router.get("/admin/teachers/:id", getTeacherById);
// admin-coures
router.get("/admin/courses", getAllCourses); // <- ini penting
router.get("/admin/courses/stats", getCoursesStats);
router.post("/admin/courses", createCourse);
router.put("/admin/courses/:id", updateCourse);
router.delete("/admin/courses/:id", deleteCourse);
router.get("/admin/courses/:id", getCourseById);
// Dashboard Guru
router.get(
  "/guru/profile",
  authMiddleware,
  roleMiddleware(["guru"]),
  getGuruProfile
);
router.put(
  "/guru/profile",
  authMiddleware,
  roleMiddleware(["guru"]),
  updateGuruProfile
);
router.post(
  "/guru/courses",
  authMiddleware,
  roleMiddleware(["guru"]),
  upload.single("file"), // ⬅️ PENTING
  createCourse
);
router.get(
  "/guru/dashboard/stats",
  authMiddleware,
  roleMiddleware(["guru"]),
  getGuruDashboardStats
);
router.get(
  "/guru/dashboard/courses",
  authMiddleware,
  roleMiddleware(["guru"]),
  getGuruCoursesWithClassAndCount
);
router.get(
  "/guru/dashboard/kelas/:kelas/students",
  authMiddleware,
  roleMiddleware(["guru"]),
  getStudentsByKelas
);
// 📁 Upload tugas
router.post(
  "/guru/tugas",
  authMiddleware,
  roleMiddleware(["guru"]),
  upload.single("file"),
  createTugas
);

// 📥 Ambil semua tugas guru
router.get(
  "/guru/tugas",
  authMiddleware,
  roleMiddleware(["guru"]),
  getTugasGuru
);

// 📊 Filter: belum dinilai, deadline, selesai
router.get(
  "/guru/tugas/filter/:type",
  authMiddleware,
  roleMiddleware(["guru"]),
  filterTugasByType
);

router.get("/guru/courses/:courseId/students/count", getStudentCountByCourse);
router.get("/guru/courses/:courseId/students", getStudentsByCourse);
router.get("/guru/:guruId/courses", getCoursesByGuru);
router.get(
  "/guru/tugas/:id",
  authMiddleware,
  roleMiddleware(["guru"]),
  getTugasById
);
router.put(
  "/guru/tugas/:id",
  authMiddleware,
  roleMiddleware(["guru"]),
  upload.single("file"),
  updateTugas
);
router.delete(
  "/guru/tugas/:id",
  authMiddleware,
  roleMiddleware(["guru"]),
  deleteTugas
);

router.get(
  "/guru/tugas/:id/detail",
  authMiddleware,
  roleMiddleware(["guru"]),
  getTugasDetail
);

router.put(
  "/guru/tugas/:tugasId/nilai/:siswaId",
  authMiddleware,
  roleMiddleware(["guru"]),
  berikanNilai
);
router.post(
  "/guru/diskusi",
  authMiddleware,
  roleMiddleware(["guru"]),
  createDiskusi
);
router.get(
  "/guru/diskusi",
  authMiddleware,
  roleMiddleware(["guru"]),
  getDiskusiGuru
);
router.put(
  "/guru/diskusi/:id",
  authMiddleware,
  roleMiddleware(["guru"]),
  updateDiskusi
);
router.delete(
  "/guru/diskusi/:id",
  authMiddleware,
  roleMiddleware(["guru"]),
  deleteDiskusi
);
router.get(
  "/guru/diskusi/:id",
  authMiddleware,
  roleMiddleware(["guru"]),
  getDiskusiById
);
// Dashboard Siswa
router.get(
  "/siswa/profile",
  authMiddleware,
  roleMiddleware(["siswa"]),
  getSiswaProfile
);
router.put(
  "/siswa/profile",
  authMiddleware,
  roleMiddleware(["siswa"]),
  updateSiswaProfile
);

router.get(
  "/siswa/materi",
  authMiddleware,
  roleMiddleware(["siswa"]),
  getMateriUntukSiswa
);
router.get(
  "/siswa/tugas",
  authMiddleware,
  roleMiddleware(["siswa"]),
  getTugasUntukSiswa
);
router.post(
  "/siswa/tugas/:id/kumpulanTugas",
  authMiddleware,
  roleMiddleware(["siswa"]),
  upload.single("file"), // penting!
  kumpulkanTugas
);
router.get(
  "/siswa/tugas/statistik",
  authMiddleware,
  roleMiddleware(["siswa"]),
  getSiswaAssignmentStats
);

router.get(
  "/siswa/diskusi",
  authMiddleware,
  roleMiddleware(["siswa"]),
  getDiskusiUntukSiswa
);

// chat diskusi
router.get("/diskusi/:id/chat", authMiddleware, getChatByDiskusi);
router.post("/diskusi/:id/chat", authMiddleware, addChatToDiskusi);

module.exports = router;
