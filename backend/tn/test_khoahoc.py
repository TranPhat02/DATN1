import sys
sys.path.append("src")
from tn.models.khoa_hoc import KhoaHocCreate

try:
    req = KhoaHocCreate(MaKhoa="", TenKhoa="test")
    print(req.model_dump())
except Exception as e:
    print(e)
