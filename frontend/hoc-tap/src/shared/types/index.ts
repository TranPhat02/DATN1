/* ═══════════════════════════════════════════════
   TypeScript Interfaces — TN Education Platform
   Maps 1:1 with MySQL database schema
   ═══════════════════════════════════════════════ */

// ── TaiKhoan (Account) ──
export interface TaiKhoan {
  [key: string]: unknown;
  UserName: string;
  Password?: string;
  Role: 'admin' | 'teacher' | 'student';
}
export interface TaiKhoanCreate {
  UserName: string;
  Password: string;
  Role: string;
}
export interface TaiKhoanUpdate {
  Password?: string;
  Role?: string;
}

// ── Lop (Class) ──
export interface Lop {
  [key: string]: unknown;
  MaLop: string;
  TenLop: string;
}
export interface LopCreate {
  [key: string]: unknown;
  MaLop?: string;
  TenLop: string;
}
export interface LopUpdate {
  TenLop?: string;
}

// ── SinhVien (Student) ──
export interface SinhVien {
  [key: string]: unknown;
  MaSV: string;
  TenSV: string;
  GioiTinh?: string | null;
  NgaySinh?: string | null;
  DiaChi?: string | null;
  MaLop?: string | null;
  Gmail?: string | null;
}
export interface SinhVienCreate {
  [key: string]: unknown;
  MaSV?: string;
  TenSV: string;
  GioiTinh?: string;
  NgaySinh?: string;
  DiaChi?: string;
  MaLop?: string;
  Gmail?: string;
}
export interface SinhVienUpdate {
  TenSV?: string;
  GioiTinh?: string;
  NgaySinh?: string;
  DiaChi?: string;
  MaLop?: string;
  Gmail?: string;
}

// ── GiaoVien (Teacher) ──
export interface GiaoVien {
  [key: string]: unknown;
  MaGV: string;
  TenGV: string;
  GioiTinh?: string | null;
  NgaySinh?: string | null;
  DiaChi?: string | null;
  Gmail?: string | null;
}
export interface GiaoVienCreate {
  [key: string]: unknown;
  MaGV?: string;
  TenGV: string;
  GioiTinh?: string;
  NgaySinh?: string;
  DiaChi?: string;
  Gmail?: string;
}
export interface GiaoVienUpdate {
  TenGV?: string;
  GioiTinh?: string;
  NgaySinh?: string;
  DiaChi?: string;
  Gmail?: string;
}

// ── MonHoc (Subject) ──
export interface MonHoc {
  [key: string]: unknown;
  MaMH: string;
  TenMH: string;
  SoTinChi: number;
}
export interface MonHocCreate {
  [key: string]: unknown;
  MaMH?: string;
  TenMH: string;
  SoTinChi: number;
}
export interface MonHocUpdate {
  TenMH?: string;
  SoTinChi?: number;
}

// ── NamHoc (Academic Year) ──
export interface NamHoc {
  [key: string]: unknown;
  MaNamHoc: string;
  NamHoc: string;
}
export interface NamHocCreate {
  [key: string]: unknown;
  MaNamHoc?: string;
  NamHoc: string;
}
export interface NamHocUpdate {
  NamHoc?: string;
}

// ── HocKi (Semester) ──
export interface HocKi {
  [key: string]: unknown;
  MaHocKi: string;
  TenHocKi: string;
  MaNamHoc?: string | null;
}
export interface HocKiCreate {
  [key: string]: unknown;
  MaHocKi?: string;
  TenHocKi: string;
  MaNamHoc?: string;
}
export interface HocKiUpdate {
  TenHocKi?: string;
  MaNamHoc?: string;
}

// ── LopMonHoc (Class-Subject) ──
export interface LopMonHoc {
  [key: string]: unknown;
  MaLopMon: string;
  TenLopMon?: string | null;
  MaLop?: string | null;
  MaMH?: string | null;
  MaGV?: string | null;
  MaHocKi?: string | null;
  ChoPhepXemDiem: boolean;
  ChoPhepXemQuiz: boolean;
  // Joined fields (from API)
  TenMH?: string;
  TenGV?: string;
  TenLop?: string;
  TenHocKi?: string;
  MaNamHoc?: string;
}
export interface LopMonHocCreate {
  [key: string]: unknown;
  MaLopMon?: string;
  TenLopMon?: string;
  MaLop?: string;
  MaMH?: string;
  MaGV?: string;
  MaHocKi?: string;
  ChoPhepXemDiem?: boolean;
  ChoPhepXemQuiz?: boolean;
}
export interface LopMonHocUpdate {
  TenLopMon?: string;
  MaLop?: string;
  MaMH?: string;
  MaGV?: string;
  MaHocKi?: string;
  ChoPhepXemDiem?: boolean;
  ChoPhepXemQuiz?: boolean;
}

// ── DiemMonHoc (Subject Grade) ──
export interface DiemMonHoc {
  [key: string]: unknown;
  MaDiem: string;
  MaSV?: string | null;
  MaLopMon?: string | null;
  DiemGK?: number | null;
  DiemCK?: number | null;
  DiemTK?: number | null;
  DiemH4?: number | null;
  DiemChu?: string | null;
  GhiChu?: string | null;
  // Joined
  TenSV?: string;
  TenMH?: string;
  TenKhoa?: string;
  TenLop?: string;
  SoTinChi?: number;
}
export interface DiemMonHocCreate {
  MaDiem?: string; // auto-generated
  MaSV?: string;
  MaLopMon?: string;
  DiemGK?: number;
  DiemCK?: number;
  GhiChu?: string;
}
export interface DiemMonHocUpdate {
  MaSV?: string;
  MaLopMon?: string;
  DiemGK?: number;
  DiemCK?: number;
  GhiChu?: string;
}

// ── DiemTracNghiem (Quiz Grade) ──
export interface DiemTracNghiem {
  [key: string]: unknown;
  MaTN: string;
  MaSV?: string | null;
  MaLopMon?: string | null;
  SoCauDung?: number | null;
  TongSoCau?: number | null;
  FileID?: string | null;
  ThoiGianLam?: number | null;  // seconds
  ThoiGianNop?: string | null;  // ISO datetime
  SoLanViPham?: number | null;  // number of tab switches
  // Joined
  TenSV?: string;
  TenKhoa?: string;
  TenLop?: string;
  TenMH?: string;
}
export interface DiemTracNghiemCreate {
  MaTN?: string; // auto-generated
  MaSV?: string;
  MaLopMon?: string;
  SoCauDung?: number;
  TongSoCau?: number;
  FileID?: string;
}
export interface DiemTracNghiemUpdate {
  MaSV?: string;
  MaLopMon?: string;
  SoCauDung?: number;
  TongSoCau?: number;
  FileID?: string;
}

// ── SinhVienLopMonHoc (Student-ClassSubject junction) ──
export interface SinhVienLopMonHoc {
  [key: string]: unknown;
  MaSV: string;
  MaLopMon: string;
  TongKet?: string | null;
  HocGhep: boolean;
  // Joined
  TenSV?: string;
  TenMH?: string;
}
export interface SinhVienLopMonHocCreate {
  MaSV: string;
  MaLopMon: string;
  TongKet?: string;
  HocGhep?: boolean;
}
export interface SinhVienLopMonHocUpdate {
  TongKet?: string;
  HocGhep?: boolean;
}

// ── LichHoc (Schedule) ──
export interface LichHoc {
  [key: string]: unknown;
  MaLich: string;
  MaLopMon?: string | null;
  NgayBatDau?: string | null;
  NgayKetThuc?: string | null;
  Thu?: string | null;
  PhongHoc?: string | null;
  Ca?: string | null;
  // Joined
  TenMH?: string;
  TenGV?: string;
  MaLop?: string;
  MaMH?: string;
  TenLop?: string;
}
export interface LichHocCreate {
  MaLich?: string; // auto-generated
  MaLopMon?: string;
  NgayBatDau?: string;
  NgayKetThuc?: string;
  Thu?: string;
  PhongHoc?: string;
  Ca?: string;
}
export interface LichHocUpdate {
  MaLopMon?: string;
  NgayBatDau?: string;
  NgayKetThuc?: string;
  Thu?: string;
  PhongHoc?: string;
  Ca?: string;
}

// ── Auth ──
export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: string;
  username: string;
}

export interface AuthUser {
  username: string;
  role: 'admin' | 'teacher' | 'student';
  token: string;
}

// ── Generic ──
export interface ApiError {
  detail: string;
}

export interface Column<T = unknown> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  editable?: boolean;
  type?: 'text' | 'number' | 'date' | 'select' | 'boolean';
  options?: { value: string; label: string }[];
  render?: (value: unknown, row: T) => React.ReactNode;
  width?: string;
}
