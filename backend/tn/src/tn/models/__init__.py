from tn.models.tai_khoan import TaiKhoan
from tn.models.lop import Lop
from tn.models.sinh_vien import SinhVien
from tn.models.giao_vien import GiaoVien
from tn.models.mon_hoc import MonHoc
from tn.models.nam_hoc import NamHoc
from tn.models.hoc_ki import HocKi
from tn.models.lop_mon_hoc import LopMonHoc
from tn.models.diem_mon_hoc import DiemMonHoc
from tn.models.diem_trac_nghiem import DiemTracNghiem
from tn.models.sinh_vien_lop_mon_hoc import SinhVienLopMonHoc
from tn.models.lich_hoc import LichHoc
from tn.models.khoa_hoc import KhoaHoc
from tn.config.database import Base

__all__ = [
    "TaiKhoan", "Lop", "SinhVien", "GiaoVien", "MonHoc",
    "NamHoc", "HocKi", "LopMonHoc", "DiemMonHoc",
    "DiemTracNghiem", "SinhVienLopMonHoc", "LichHoc", "KhoaHoc", "Base",
]
