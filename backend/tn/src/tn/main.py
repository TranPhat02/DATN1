"""
FastAPI application entrypoint.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from tn.config.database import init_db, connect_mongo, close_mongo

# ── Router imports ──
from tn.routers.auth_router import router as auth_router
from tn.routers.tai_khoan_router import router as tai_khoan_router
from tn.routers.sinh_vien_router import router as sinh_vien_router
from tn.routers.giao_vien_router import router as giao_vien_router
from tn.routers.lop_router import router as lop_router
from tn.routers.mon_hoc_router import router as mon_hoc_router
from tn.routers.lop_mon_hoc_router import router as lop_mon_hoc_router
from tn.routers.nam_hoc_router import router as nam_hoc_router
from tn.routers.hoc_ki_router import router as hoc_ki_router
from tn.routers.diem_mon_hoc_router import router as diem_mon_hoc_router
from tn.routers.diem_trac_nghiem_router import router as diem_trac_nghiem_router
from tn.routers.sinh_vien_lop_mon_hoc_router import router as sv_lmh_router
from tn.routers.lich_hoc_router import router as lich_hoc_router
from tn.routers.drive_router import router as drive_router
from tn.routers.quiz_router import router as quiz_router
from tn.routers.chat_router import router as chat_router
from tn.routers.announcement_router import router as announcement_router
from tn.routers.khoa_hoc_router import router as khoa_hoc_router
from tn.routers.thong_ke_router import router as thong_ke_router
from tn.routers.notification_router import router as notification_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / Shutdown events."""
    # ── Startup ──
    init_db()        # Create MySQL tables
    connect_mongo()  # Open MongoDB connection
    yield
    # ── Shutdown ──
    close_mongo()    # Close MongoDB connection


from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import IntegrityError

app = FastAPI(
    title="TN API",
    description="Backend API with MySQL & MongoDB — Quản lý sinh viên, điểm, lịch học",
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS Middleware — MUST be added BEFORE exception handlers ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*",
    "Access-Control-Allow-Headers": "*",
}

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=CORS_HEADERS,
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
        headers=CORS_HEADERS,
    )

@app.exception_handler(IntegrityError)
async def integrity_error_handler(request, exc: IntegrityError):
    import logging
    logging.error(f"IntegrityError: {exc}")
    return JSONResponse(
        status_code=400,
        content={"detail": f"Lỗi dữ liệu: {str(exc.orig) if hasattr(exc, 'orig') else str(exc)}"},
        headers=CORS_HEADERS,
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Lỗi máy chủ: {str(exc)}"},
        headers=CORS_HEADERS,
    )

# ── Routers ──
app.include_router(auth_router)
app.include_router(tai_khoan_router)
app.include_router(sinh_vien_router)
app.include_router(giao_vien_router)
app.include_router(lop_router)
app.include_router(mon_hoc_router)
app.include_router(lop_mon_hoc_router)
app.include_router(nam_hoc_router)
app.include_router(hoc_ki_router)
app.include_router(diem_mon_hoc_router)
app.include_router(diem_trac_nghiem_router)
app.include_router(sv_lmh_router)
app.include_router(lich_hoc_router)
app.include_router(drive_router)
app.include_router(quiz_router)
app.include_router(chat_router)
app.include_router(announcement_router)
app.include_router(khoa_hoc_router)
app.include_router(thong_ke_router)
app.include_router(notification_router)


@app.get("/")
def root():
    return {"message": "TN API is running 🚀"}