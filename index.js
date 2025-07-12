const express = require("express");
const path = require("path");
const cors = require("cors");
const fs = require("fs");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3000;

// Middleware global
app.use(cors());
app.use(express.json()); // tetap diperlukan untuk non-multipart
app.use(express.urlencoded({ extended: true }));

// Akses file statis dan file upload
const frontEndPath = path.join(__dirname, "/front_end/");
console.log("Serving static files from:", frontEndPath);
app.use(express.static(frontEndPath));
app.get("/", (req, res) => {
  res.sendFile(path.join(frontEndPath, "index.html"));
});
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));
app.use("/uploadss", express.static(path.join(__dirname, "public/uploadss"))); // untuk akses file upload
app.use("/uploadsss", express.static(path.join(__dirname, "public/uploadsss")));

const tugasDir = path.join(__dirname, "public/uploadss/tugas");
if (!fs.existsSync(tugasDir)) {
  fs.mkdirSync(tugasDir, { recursive: true });
}
const kumpulanTugasDir = path.join(__dirname, "public/uploadsss/KumpulanTugas");
if (!fs.existsSync(kumpulanTugasDir)) {
  fs.mkdirSync(kumpulanTugasDir, { recursive: true });
}
// Import routes
const usersRoutes = require("./routes/UsersRoutes");
const dashboardRoutes = require("./routes/DashboardRoutes");

// Routing
app.use("/api/users", usersRoutes);
app.use("/api/dashboard", dashboardRoutes); // ⬅️ tidak perlu multer di sini

// Jalankan server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
