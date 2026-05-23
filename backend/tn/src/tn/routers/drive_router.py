"""
Drive router — Google Drive file management endpoints.
"""
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from tn.config.database import get_db
from tn.handlers import drive_handler
from tn.utils.security import get_current_user

router = APIRouter(prefix="/api/v1/drive", tags=["GoogleDrive"])


@router.get("/files", response_model=List[dict])
def list_all_files(_=Depends(get_current_user)):
    """List all files in root Drive folder (admin use)."""
    return drive_handler.list_all_files()


@router.get("/files/{ma_lop_mon}", response_model=List[dict])
def list_files_by_class(ma_lop_mon: str, _=Depends(get_current_user)):
    """List files for a specific class."""
    return drive_handler.list_files_by_lop_mon(ma_lop_mon)


@router.post("/upload")
def upload_file(
    file: UploadFile = File(...),
    ma_lop_mon: str = Form(...),
    subfolder: str = Form("tai_lieu"),
    _=Depends(get_current_user),
):
    """Upload a file to a class folder."""
    return drive_handler.upload_file(file, ma_lop_mon, subfolder)


@router.delete("/files/{file_id}")
def delete_file(file_id: str, _=Depends(get_current_user)):
    """Delete a file from Drive."""
    return drive_handler.delete_file(file_id)


@router.get("/image/{file_id}")
def proxy_image(file_id: str):
    """Proxy image from Google Drive to avoid viewing restrictions."""
    content, mime_type = drive_handler.get_file_as_stream(file_id)
    import io
    return StreamingResponse(io.BytesIO(content), media_type=mime_type or "image/jpeg")


# ── Assignment folder management ──

@router.get("/folders/{ma_lop_mon}/bai_tap")
def list_bai_tap_folders(ma_lop_mon: str, _=Depends(get_current_user)):
    """List assignment subfolders for a class."""
    return drive_handler.list_subfolders(ma_lop_mon, "bai_tap")


class CreateFolderRequest(BaseModel):
    ma_lop_mon: str
    folder_name: str
    subfolder: str = "bai_tap"


@router.post("/folders")
def create_folder(req: CreateFolderRequest, _=Depends(get_current_user)):
    """Create a subfolder in the assignment area."""
    return drive_handler.create_subfolder_in(req.ma_lop_mon, req.folder_name, req.subfolder)


@router.get("/folder-files/{folder_id}")
def list_folder_files(folder_id: str, _=Depends(get_current_user)):
    """List files inside a specific folder."""
    return drive_handler.list_files_in_folder(folder_id)


@router.post("/upload-to-folder")
def upload_to_folder(
    file: UploadFile = File(...),
    folder_id: str = Form(...),
    _=Depends(get_current_user),
):
    """Upload a file to a specific folder."""
    return drive_handler.upload_to_folder(file, folder_id)


# ── Admin tree view ──

@router.get("/admin/explorer/{folder_id}")
def admin_explorer(folder_id: str, _=Depends(get_current_user)):
    """List contents of a specific folder for Admin Explorer view. 
    If folder_id is 'root', lists the app's root folder."""
    from tn.config.database import settings
    from fastapi import HTTPException
    
    target_id = folder_id
    if target_id == "root":
        target_id = settings.GOOGLE_DRIVE_FOLDER_ID
        if not target_id:
            raise HTTPException(status_code=503, detail="GOOGLE_DRIVE_FOLDER_ID chưa được cấu hình.")
            
    return drive_handler.list_files_in_folder(target_id)


# ── Assignment folder lock management (MongoDB metadata) ──

class BaiTapLockRequest(BaseModel):
    lockType: int = 0       # 0=open, 1=hard lock, 2=timed lock
    lockUntil: str = ""     # ISO datetime for timed lock


@router.put("/baitap/{folder_id}/lock")
async def update_baitap_lock(folder_id: str, req: BaiTapLockRequest, _=Depends(get_current_user)):
    """Update lock settings for a bai_tap folder."""
    from tn.config.database import get_mongo_db
    db = get_mongo_db()
    if db is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="MongoDB không khả dụng")
    await db.baitap_locks.update_one(
        {"folderId": folder_id},
        {"$set": {"folderId": folder_id, "lockType": req.lockType, "lockUntil": req.lockUntil}},
        upsert=True,
    )
    return {"message": "Cập nhật khoá thành công"}


@router.get("/baitap/{ma_lop_mon}/locks")
async def get_baitap_locks(ma_lop_mon: str, _=Depends(get_current_user)):
    """Get lock metadata for all bai_tap folders of a class."""
    from tn.config.database import get_mongo_db
    db = get_mongo_db()
    if db is None:
        return []
    # First get all folder IDs for this class
    folders = drive_handler.list_subfolders(ma_lop_mon, "bai_tap")
    folder_ids = [f["id"] for f in folders]
    if not folder_ids:
        return []
    cursor = db.baitap_locks.find({"folderId": {"$in": folder_ids}}, {"_id": 0})
    locks = await cursor.to_list(length=None)
    return locks


# ══ Document Memory ══

@router.get("/memory/{ma_lop_mon}")
def list_memory(ma_lop_mon: str, _=Depends(get_current_user)):
    """List all document folders that have memory cached for a class."""
    return drive_handler.list_memory_items(ma_lop_mon)


@router.get("/memory/{ma_lop_mon}/{file_name}/content")
def get_memory_content(ma_lop_mon: str, file_name: str, _=Depends(get_current_user)):
    """Get the cached content summary (content.md) for a specific document."""
    from fastapi import HTTPException
    content = drive_handler.read_memory_file(ma_lop_mon, file_name, "content")
    if content is None:
        raise HTTPException(status_code=404, detail="Chưa có memory cho tài liệu này")
    return {"file_name": file_name, "ma_lop_mon": ma_lop_mon, "summary": content}


@router.delete("/memory/{ma_lop_mon}/{file_name}")
def delete_memory(ma_lop_mon: str, file_name: str, _=Depends(get_current_user)):
    """Delete the memory for a document (forces full rebuild on next quiz generation)."""
    return drive_handler.delete_memory_folder(ma_lop_mon, file_name)
