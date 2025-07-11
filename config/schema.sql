-- TABEL
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'guru', 'siswa') NOT NULL,
    reset_token VARCHAR(255) NULL,
    foto VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    kelas_id INT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (kelas_id) REFERENCES kelas(id) ON DELETE SET NULL
);
ALTER TABLE courses DROP FOREIGN KEY courses_ibfk_2; -- ini nama default FK, sesuaikan kalau beda
ALTER TABLE courses DROP COLUMN kelas_id;


CREATE TABLE verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE siswa_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  jurusan VARCHAR(100),
  nisn VARCHAR(20) UNIQUE,
  kelas_id INT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (kelas_id) REFERENCES kelas(id) ON DELETE SET NULL
);

CREATE TABLE guru_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  mapel VARCHAR(100),
  nip VARCHAR(50) UNIQUE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE guru_kelas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guru_id INT,
    kelas_id INT,
    FOREIGN KEY (guru_id) REFERENCES guru_details(id) ON DELETE CASCADE,
    FOREIGN KEY (kelas_id) REFERENCES kelas(id) ON DELETE CASCADE
);

CREATE TABLE kelas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama_kelas VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE course_kelas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT,
  kelas_id INT,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (kelas_id) REFERENCES kelas(id) ON DELETE CASCADE
);

CREATE TABLE tugas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  judul VARCHAR(255),
  deskripsi TEXT,
  deadline DATE,
  file_path VARCHAR(255),
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE tugas_kelas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tugas_id INT,
  kelas_id INT,
  FOREIGN KEY (tugas_id) REFERENCES tugas(id) ON DELETE CASCADE,
  FOREIGN KEY (kelas_id) REFERENCES kelas(id) ON DELETE CASCADE
);

CREATE TABLE pengumpulan_tugas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tugas_id INT,
  siswa_id INT,
  file_path VARCHAR(255),
  nilai INT DEFAULT NULL,
  dikumpulkan_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tugas_id) REFERENCES tugas(id) ON DELETE CASCADE,
  FOREIGN KEY (siswa_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE diskusi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  judul VARCHAR(255),
  isi TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE diskusi_kelas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  diskusi_id INT,
  kelas_id INT,
  FOREIGN KEY (diskusi_id) REFERENCES diskusi(id) ON DELETE CASCADE,
  FOREIGN KEY (kelas_id) REFERENCES kelas(id) ON DELETE CASCADE
);

CREATE TABLE chat_diskusi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  diskusi_id INT,
  user_id INT,
  isi TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (diskusi_id) REFERENCES diskusi(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- END TABEL


-- regis admin
INSERT INTO users (name, email, password, role)
VALUES (
  'Admin Utama',
  'admin@lms.com',
  '$2a$10$8YjPL/CzpC4/sBPdZvfVj.llV6tuvrCTdH1Dx8HTWL31wn9FiXemO',
  'admin'
);
-- end regis admin


-- UNTUK COBA SINTAX sql

-- hapus tablle
DROP TABLE kelas;


SELECT * FROM kelas WHERE nama_kelas = 'XII TL 1';
