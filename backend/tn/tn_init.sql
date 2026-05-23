-- ============================================================
--  Database: tn
--  Auto-generated from ERD.drawio
--  Run: mysql -u root < tn_init.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS `tn` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `tn`;

-- ── 1. TaiKhoan (Account) ──
CREATE TABLE IF NOT EXISTS `TaiKhoan` (
    `UserName`  VARCHAR(100) NOT NULL,
    `Password`  VARCHAR(255) NOT NULL,
    `Role`      VARCHAR(50)  NOT NULL DEFAULT 'student',
    PRIMARY KEY (`UserName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 2. Lop (Class) ──
CREATE TABLE IF NOT EXISTS `Lop` (
    `MaLop`  VARCHAR(20)  NOT NULL,
    `TenLop` VARCHAR(100) NOT NULL,
    PRIMARY KEY (`MaLop`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 3. SinhVien (Student) ──
CREATE TABLE IF NOT EXISTS `SinhVien` (
    `MaSV`     VARCHAR(20)  NOT NULL,
    `TenSV`    VARCHAR(100) NOT NULL,
    `GioiTinh` VARCHAR(10)  DEFAULT NULL,
    `NgaySinh` DATE         DEFAULT NULL,
    `DiaChi`   VARCHAR(255) DEFAULT NULL,
    `MaLop`    VARCHAR(20)  DEFAULT NULL,
    `Gmail`    VARCHAR(100) DEFAULT NULL,
    PRIMARY KEY (`MaSV`),
    FOREIGN KEY (`MaLop`) REFERENCES `Lop`(`MaLop`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 4. GiaoVien (Teacher) ──
CREATE TABLE IF NOT EXISTS `GiaoVien` (
    `MaGV`     VARCHAR(20)  NOT NULL,
    `TenGV`    VARCHAR(100) NOT NULL,
    `GioiTinh` VARCHAR(10)  DEFAULT NULL,
    `NgaySinh` DATE         DEFAULT NULL,
    `DiaChi`   VARCHAR(255) DEFAULT NULL,
    `Gmail`    VARCHAR(100) DEFAULT NULL,
    PRIMARY KEY (`MaGV`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 5. MonHoc (Subject) ──
CREATE TABLE IF NOT EXISTS `MonHoc` (
    `MaMH`     VARCHAR(20)  NOT NULL,
    `TenMH`    VARCHAR(100) NOT NULL,
    `SoTinChi` INT          NOT NULL DEFAULT 0,
    PRIMARY KEY (`MaMH`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 6. NamHoc (Academic Year) ──
CREATE TABLE IF NOT EXISTS `NamHoc` (
    `MaNamHoc` VARCHAR(20) NOT NULL,
    `NamHoc`   VARCHAR(50) NOT NULL,
    PRIMARY KEY (`MaNamHoc`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 7. HocKi (Semester) ──
CREATE TABLE IF NOT EXISTS `HocKi` (
    `MaHocKi`  VARCHAR(20) NOT NULL,
    `TenHocKi` VARCHAR(50) NOT NULL,
    `MaNamHoc` VARCHAR(20) DEFAULT NULL,
    PRIMARY KEY (`MaHocKi`),
    FOREIGN KEY (`MaNamHoc`) REFERENCES `NamHoc`(`MaNamHoc`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 8. LopMonHoc (Class-Subject) ──
CREATE TABLE IF NOT EXISTS `LopMonHoc` (
    `MaLopMon`       VARCHAR(20) NOT NULL,
    `MaLop`          VARCHAR(20) DEFAULT NULL,
    `MaMH`           VARCHAR(20) DEFAULT NULL,
    `MaGV`           VARCHAR(20) DEFAULT NULL,
    `MaHocKi`        VARCHAR(20) DEFAULT NULL,
    `ChoPhepXemDiem` TINYINT(1)  NOT NULL DEFAULT 0,
    `ChoPhepXemQuiz` TINYINT(1)  NOT NULL DEFAULT 0,
    PRIMARY KEY (`MaLopMon`),
    FOREIGN KEY (`MaLop`)   REFERENCES `Lop`(`MaLop`)       ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (`MaMH`)    REFERENCES `MonHoc`(`MaMH`)     ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (`MaGV`)    REFERENCES `GiaoVien`(`MaGV`)   ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (`MaHocKi`) REFERENCES `HocKi`(`MaHocKi`)   ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 9. DiemMonHoc (Subject Grade) ──
CREATE TABLE IF NOT EXISTS `DiemMonHoc` (
    `MaDiem`   VARCHAR(20) NOT NULL,
    `MaSV`     VARCHAR(20) DEFAULT NULL,
    `MaLopMon` VARCHAR(20) DEFAULT NULL,
    `DiemGK`   FLOAT       DEFAULT NULL,
    `DiemCK`   FLOAT       DEFAULT NULL,
    `DiemTK`   FLOAT       DEFAULT NULL,
    `DiemH4`   FLOAT       DEFAULT NULL,
    `DiemChu`  VARCHAR(5)  DEFAULT NULL,
    PRIMARY KEY (`MaDiem`),
    FOREIGN KEY (`MaSV`)     REFERENCES `SinhVien`(`MaSV`)       ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (`MaLopMon`) REFERENCES `LopMonHoc`(`MaLopMon`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 10. DiemTracNghiem (Quiz Grade) ──
CREATE TABLE IF NOT EXISTS `DiemTracNghiem` (
    `MaTN`      VARCHAR(20)  NOT NULL,
    `MaSV`      VARCHAR(20)  DEFAULT NULL,
    `MaLopMon`  VARCHAR(20)  DEFAULT NULL,
    `SoCauDung` INT          DEFAULT NULL,
    `TongSoCau` INT          DEFAULT NULL,
    `FileID`    VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (`MaTN`),
    FOREIGN KEY (`MaSV`)     REFERENCES `SinhVien`(`MaSV`)       ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (`MaLopMon`) REFERENCES `LopMonHoc`(`MaLopMon`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 11. SinhVien_LopMonHoc (Student ↔ Class-Subject junction) ──
CREATE TABLE IF NOT EXISTS `SinhVien_LopMonHoc` (
    `MaSV`     VARCHAR(20) NOT NULL,
    `MaLopMon` VARCHAR(20) NOT NULL,
    `TongKet`  VARCHAR(20) DEFAULT NULL,
    `HocGhep`  TINYINT(1)  NOT NULL DEFAULT 0,
    PRIMARY KEY (`MaSV`, `MaLopMon`),
    FOREIGN KEY (`MaSV`)     REFERENCES `SinhVien`(`MaSV`)       ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`MaLopMon`) REFERENCES `LopMonHoc`(`MaLopMon`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 12. LichHoc (Schedule) ──
CREATE TABLE IF NOT EXISTS `LichHoc` (
    `MaLich`      VARCHAR(20) NOT NULL,
    `MaLopMon`    VARCHAR(20) DEFAULT NULL,
    `NgayBatDau`  DATE        DEFAULT NULL,
    `NgayKetThuc` DATE        DEFAULT NULL,
    `Thu`         VARCHAR(20) DEFAULT NULL,
    `PhongHoc`    VARCHAR(50) DEFAULT NULL,
    `Ca`          VARCHAR(20) DEFAULT NULL,
    PRIMARY KEY (`MaLich`),
    FOREIGN KEY (`MaLopMon`) REFERENCES `LopMonHoc`(`MaLopMon`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Default admin account (password: admin123) ──
-- Password is bcrypt hash of 'admin123'
INSERT IGNORE INTO `TaiKhoan` (`UserName`, `Password`, `Role`)
VALUES ('admin', '$2b$12$6cVRfprUqLW/nghyoXuceOytySzJ1qtMkfP5IPnRUnH3RLX7oXgg.', 'admin');
