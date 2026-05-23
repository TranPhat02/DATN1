"""
LichHoc handler — CRUD business logic with joined data (TenMH, TenGV, TenLop).
"""
from typing import List
from fastapi import HTTPException
from sqlalchemy.orm import Session

from tn.models.lich_hoc import LichHoc, LichHocCreate, LichHocUpdate
from tn.models.lop_mon_hoc import LopMonHoc
from tn.models.mon_hoc import MonHoc
from tn.models.giao_vien import GiaoVien
from tn.models.lop import Lop


def _enrich(db: Session, obj: LichHoc) -> dict:
    """Convert LichHoc ORM object to dict with joined names."""
    data = {
        "MaLich": obj.MaLich,
        "MaLopMon": obj.MaLopMon,
        "NgayBatDau": str(obj.NgayBatDau) if obj.NgayBatDau else None,
        "NgayKetThuc": str(obj.NgayKetThuc) if obj.NgayKetThuc else None,
        "Thu": obj.Thu,
        "PhongHoc": obj.PhongHoc,
        "Ca": obj.Ca,
        "TenMH": None,
        "TenGV": None,
        "MaGV": None,
        "MaLop": None,
        "TenLop": None,
        "MaMH": None,
    }
    if obj.MaLopMon:
        lmh = db.query(LopMonHoc).filter(LopMonHoc.MaLopMon == obj.MaLopMon).first()
        if lmh:
            data["MaGV"] = lmh.MaGV
            data["MaLop"] = lmh.MaLop
            data["MaMH"] = lmh.MaMH
            if lmh.MaMH:
                mh = db.query(MonHoc).filter(MonHoc.MaMH == lmh.MaMH).first()
                if mh:
                    data["TenMH"] = mh.TenMH
            if lmh.MaGV:
                gv = db.query(GiaoVien).filter(GiaoVien.MaGV == lmh.MaGV).first()
                if gv:
                    data["TenGV"] = gv.TenGV
            if lmh.MaLop:
                lop = db.query(Lop).filter(Lop.MaLop == lmh.MaLop).first()
                if lop:
                    data["TenLop"] = lop.TenLop
    return data


def get_all(db: Session) -> List[dict]:
    rows = db.query(LichHoc).all()
    return [_enrich(db, r) for r in rows]


def get_by_id(db: Session, ma_lich: str):
    obj = db.query(LichHoc).filter(LichHoc.MaLich == ma_lich).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"LichHoc '{ma_lich}' không tìm thấy")
    return _enrich(db, obj)


def check_lich_hoc_conflict(
    db: Session,
    ma_lop_mon: str,
    thu: str,
    ca: str,
    phong_hoc: str,
    ngay_bat_dau,
    ngay_ket_thuc,
    ma_lich: str = None
):
    if not ma_lop_mon or not thu or not ca or not phong_hoc or not ngay_bat_dau or not ngay_ket_thuc:
        return

    from datetime import date
    try:
        d_start = ngay_bat_dau if isinstance(ngay_bat_dau, date) else date.fromisoformat(str(ngay_bat_dau))
        d_end = ngay_ket_thuc if isinstance(ngay_ket_thuc, date) else date.fromisoformat(str(ngay_ket_thuc))
    except Exception:
        return

    # 1. Get current teacher
    lmh_current = db.query(LopMonHoc).filter(LopMonHoc.MaLopMon == ma_lop_mon).first()
    ma_gv_current = lmh_current.MaGV if lmh_current else None

    # 2. Query candidates with the same day and slot
    query = db.query(LichHoc).filter(
        LichHoc.Thu == thu,
        LichHoc.Ca == ca
    )
    if ma_lich:
        query = query.filter(LichHoc.MaLich != ma_lich)
    candidates = query.all()

    for cand in candidates:
        if not cand.NgayBatDau or not cand.NgayKetThuc:
            continue
        try:
            c_start = cand.NgayBatDau if isinstance(cand.NgayBatDau, date) else date.fromisoformat(str(cand.NgayBatDau))
            c_end = cand.NgayKetThuc if isinstance(cand.NgayKetThuc, date) else date.fromisoformat(str(cand.NgayKetThuc))
        except Exception:
            continue

        # Check overlapping date range
        if d_start <= c_end and c_start <= d_end:
            # Check room conflict
            if phong_hoc and cand.PhongHoc and phong_hoc.strip().lower() == cand.PhongHoc.strip().lower():
                raise HTTPException(
                    status_code=400,
                    detail=f"Trùng lịch: Phòng học '{phong_hoc}' đã được sử dụng bởi lớp khác vào thời gian này"
                )

            # Check teacher conflict
            if ma_gv_current and cand.MaLopMon:
                lmh_cand = db.query(LopMonHoc).filter(LopMonHoc.MaLopMon == cand.MaLopMon).first()
                if lmh_cand and lmh_cand.MaGV == ma_gv_current:
                    raise HTTPException(
                        status_code=400,
                        detail="Trùng lịch: Giáo viên đã có lịch dạy lớp khác vào thời gian này"
                    )


def add(db: Session, data: LichHocCreate) -> dict:
    check_lich_hoc_conflict(
        db,
        ma_lop_mon=data.MaLopMon,
        thu=data.Thu,
        ca=data.Ca,
        phong_hoc=data.PhongHoc,
        ngay_bat_dau=data.NgayBatDau,
        ngay_ket_thuc=data.NgayKetThuc
    )

    d = data.model_dump()
    if not d.get("MaLich"):
        import time
        d["MaLich"] = f"LH{int(time.time() * 1000) % 100000000}"
    obj = LichHoc(**d)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return _enrich(db, obj)


def edit(db: Session, ma_lich: str, data: LichHocUpdate) -> dict:
    obj = db.query(LichHoc).filter(LichHoc.MaLich == ma_lich).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"LichHoc '{ma_lich}' không tìm thấy")
    
    new_ma_lop_mon = data.MaLopMon if data.MaLopMon is not None else obj.MaLopMon
    new_thu = data.Thu if data.Thu is not None else obj.Thu
    new_ca = data.Ca if data.Ca is not None else obj.Ca
    new_phong_hoc = data.PhongHoc if data.PhongHoc is not None else obj.PhongHoc
    new_ngay_bat_dau = data.NgayBatDau if data.NgayBatDau is not None else obj.NgayBatDau
    new_ngay_ket_thuc = data.NgayKetThuc if data.NgayKetThuc is not None else obj.NgayKetThuc

    check_lich_hoc_conflict(
        db,
        ma_lop_mon=new_ma_lop_mon,
        thu=new_thu,
        ca=new_ca,
        phong_hoc=new_phong_hoc,
        ngay_bat_dau=new_ngay_bat_dau,
        ngay_ket_thuc=new_ngay_ket_thuc,
        ma_lich=ma_lich
    )

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return _enrich(db, obj)


def remove(db: Session, ma_lich: str) -> dict:
    obj = db.query(LichHoc).filter(LichHoc.MaLich == ma_lich).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"LichHoc '{ma_lich}' không tìm thấy")
    db.delete(obj)
    db.commit()
    return {"message": f"LichHoc '{ma_lich}' đã xóa thành công"}


def auto_generate(db: Session) -> dict:
    """Auto-generate LichHoc for every LopMonHoc that has no schedule yet.
    
    Assigns: random Thu (Mon-Sat), Ca 1 or 2, phong A101-A404,
    dates from HocKi's range or sensible defaults.
    """
    import uuid
    import random
    from tn.models.hoc_ki import HocKi

    thu_options = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"]
    ca_options = ["Ca 1", "Ca 2", "Ca 3", "Ca 4"]
    phong_options = [f"{chr(64 + b)}{r:03d}" for b in range(1, 5) for r in range(101, 106)]

    all_lmh = db.query(LopMonHoc).all()
    existing_lm = {r.MaLopMon for r in db.query(LichHoc).all()}

    created = 0
    for lmh in all_lmh:
        if lmh.MaLopMon in existing_lm:
            continue  # already has a schedule

        # Determine date range from HocKi if available
        ngay_bat_dau = "2025-09-01"
        ngay_ket_thuc = "2026-01-15"
        if lmh.MaHocKi:
            hk = db.query(HocKi).filter(HocKi.MaHocKi == lmh.MaHocKi).first()
            if hk:
                from tn.models.nam_hoc import NamHoc
                nh = db.query(NamHoc).filter(NamHoc.MaNamHoc == hk.MaNamHoc).first()
                if nh and hasattr(nh, 'NamHoc'):
                    # Infer semester dates from TenHocKi
                    ten_hk = hk.TenHocKi.lower() if hk.TenHocKi else ''
                    nam_str = str(nh.NamHoc) if nh.NamHoc else ''
                    year = int(nam_str[:4]) if nam_str and nam_str[:4].isdigit() else 2025
                    if 'học kỳ 1' in ten_hk or 'hk1' in ten_hk or '1' in ten_hk:
                        ngay_bat_dau = f"{year}-09-01"
                        ngay_ket_thuc = f"{year + 1}-01-15"
                    else:
                        ngay_bat_dau = f"{year + 1}-02-01"
                        ngay_ket_thuc = f"{year + 1}-06-30"

        ma_lich = f"LH{uuid.uuid4().hex[:10].upper()}"
        obj = LichHoc(
            MaLich=ma_lich,
            MaLopMon=lmh.MaLopMon,
            Thu=random.choice(thu_options),
            Ca=random.choice(ca_options),
            PhongHoc=random.choice(phong_options),
            NgayBatDau=ngay_bat_dau,
            NgayKetThuc=ngay_ket_thuc,
        )
        db.add(obj)
        created += 1

    if created > 0:
        db.commit()
    return {
        "created": created,
        "message": f"Đã tạo {created} lịch học mới (bỏ qua {len(existing_lm)} lớp đã có lịch)",
    }


def import_from_csv(db: Session, rows: list) -> dict:
    """Bulk-import LichHoc records from parsed CSV rows.
    
    Expected keys per row: MaLopMon, Thu, Ca, PhongHoc, NgayBatDau, NgayKetThuc.
    Existing records (same MaLopMon) are UPDATED, new ones are INSERTED.
    """
    import uuid

    created = updated = skipped = 0
    for row in rows:
        ma_lop_mon = (row.get("MaLopMon") or "").strip()
        if not ma_lop_mon:
            skipped += 1
            continue

        # Validate MaLopMon exists
        lmh = db.query(LopMonHoc).filter(LopMonHoc.MaLopMon == ma_lop_mon).first()
        if not lmh:
            skipped += 1
            continue

        def _parse_date(val: str):
            val = (val or "").strip()
            if not val:
                return None
            for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
                try:
                    from datetime import datetime
                    return datetime.strptime(val, fmt).date()
                except ValueError:
                    pass
            return None

        existing = db.query(LichHoc).filter(LichHoc.MaLopMon == ma_lop_mon).first()
        if existing:
            # Update
            if row.get("Thu"): existing.Thu = row["Thu"].strip()
            if row.get("Ca"): existing.Ca = row["Ca"].strip()
            if row.get("PhongHoc"): existing.PhongHoc = row["PhongHoc"].strip()
            if row.get("NgayBatDau"): existing.NgayBatDau = _parse_date(row["NgayBatDau"])
            if row.get("NgayKetThuc"): existing.NgayKetThuc = _parse_date(row["NgayKetThuc"])
            updated += 1
        else:
            ma_lich = (row.get("MaLich") or "").strip() or f"LH{uuid.uuid4().hex[:10].upper()}"
            obj = LichHoc(
                MaLich=ma_lich,
                MaLopMon=ma_lop_mon,
                Thu=(row.get("Thu") or "").strip() or None,
                Ca=(row.get("Ca") or "").strip() or None,
                PhongHoc=(row.get("PhongHoc") or "").strip() or None,
                NgayBatDau=_parse_date(row.get("NgayBatDau", "")),
                NgayKetThuc=_parse_date(row.get("NgayKetThuc", "")),
            )
            db.add(obj)
            created += 1

    db.commit()
    return {
        "created": created,
        "updated": updated,
        "skipped": skipped,
        "message": f"Import thành công: {created} mới, {updated} cập nhật, {skipped} bỏ qua",
    }

