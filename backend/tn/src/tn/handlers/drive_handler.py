"""
Google Drive handler — file operations.
Supports OAuth2 user credentials (drive_token.json) with
fallback to Service Account. OAuth2 avoids the 403 storage quota error.
Folder structure: root / MonHoc (TenMH) / GiaoVien (MaGV) / tai_lieu / files
                  root / MonHoc (TenMH) / GiaoVien (MaGV) / quiz / quiz_files
                  root / MonHoc (TenMH) / GiaoVien (MaGV) / ket_qua / {quiz_id} / {sv_id}.json
"""
import json
import os
import io
import traceback
from pathlib import Path
from typing import List

from fastapi import HTTPException, UploadFile
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload, MediaIoBaseDownload

from tn.config.database import settings
from tn.utils.virustotal_service import scan_file as vt_scan_file, ScanResult

SCOPES = ["https://www.googleapis.com/auth/drive"]

# Token file path — generated once via setup_drive_oauth.py
_TOKEN_FILE = str(Path(__file__).resolve().parents[3] / "drive_token.json")


def _get_drive_service():
    """Build and return Google Drive API service client.
    Prefers OAuth2 user credentials (drive_token.json) to avoid
    Service Account storage quota errors. Falls back to service account.
    """
    # ── Option 1: OAuth2 user credentials (preferred) ──
    if os.path.exists(_TOKEN_FILE):
        try:
            from google.oauth2.credentials import Credentials
            from google.auth.transport.requests import Request

            print(f"[Drive] Loading OAuth2 token from: {_TOKEN_FILE}")
            creds = Credentials.from_authorized_user_file(_TOKEN_FILE, SCOPES)
            print(f"[Drive] Token loaded. Expired={creds.expired}, Valid={creds.valid}")
            if creds.expired and creds.refresh_token:
                print("[Drive] Token expired, refreshing...")
                creds.refresh(Request())
                print("[Drive] Token refreshed successfully!")
                # Save refreshed token
                with open(_TOKEN_FILE, "w", encoding="utf-8") as f:
                    f.write(creds.to_json())
            if creds.valid:
                print("[Drive] Using OAuth2 credentials (valid)")
                return build("drive", "v3", credentials=creds)
            else:
                print("[Drive] OAuth2 credentials NOT valid after refresh attempt")
        except Exception as e:
            print(f"[Drive] OAuth2 token load failed, falling back to SA:")
            traceback.print_exc()

    # ── Option 2: Service Account (fallback) ──
    creds_file = settings.GOOGLE_DRIVE_CREDENTIALS_FILE
    print(f"[Drive] Trying Service Account: {creds_file}")
    if not creds_file or not os.path.exists(creds_file):
        raise HTTPException(
            status_code=503,
            detail=f"Google Drive chua duoc cau hinh. File '{creds_file}' khong ton tai.",
        )
    try:
        from google.oauth2 import service_account
        creds = service_account.Credentials.from_service_account_file(creds_file, scopes=SCOPES)
        return build("drive", "v3", credentials=creds)
    except Exception as e:
        print(f"[Drive] Service Account also failed:")
        traceback.print_exc()
        raise HTTPException(status_code=503, detail=f"Loi ket noi Google Drive: {str(e)}")


def _scan_file_with_virustotal(file_content: bytes, filename: str) -> ScanResult:
    """Quét file bằng VirusTotal trước khi upload.
    Raise HTTPException nếu quét thất bại (từ chối upload).
    """
    api_key = settings.VIRUSTOTAL_API_KEY
    if not api_key:
        print("[VirusTotal] ⚠️  VIRUSTOTAL_API_KEY chưa cấu hình — bỏ qua quét virus.")
        return ScanResult(is_safe=True, message="Bỏ qua quét virus (API key chưa cấu hình)")

    try:
        return vt_scan_file(file_content, filename)
    except RuntimeError as e:
        print(f"[VirusTotal] ❌ Quét thất bại: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Không thể quét virus cho file '{filename}': {str(e)}"
        )


def _detect_drive_id(service, folder_id: str) -> str | None:
    """Detect if folder belongs to a Shared Drive and return its driveId."""
    try:
        f = service.files().get(
            fileId=folder_id, fields="driveId",
            supportsAllDrives=True,
        ).execute()
        return f.get("driveId")
    except Exception:
        return None


def _get_or_create_subfolder(service, parent_id: str, folder_name: str) -> str:
    """Get or create a subfolder inside a parent folder (supports Shared Drives)."""
    try:
        query = (
            f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' "
            f"and '{parent_id}' in parents and trashed=false"
        )
        results = service.files().list(
            q=query, fields="files(id, name)", spaces="drive",
            supportsAllDrives=True, includeItemsFromAllDrives=True,
        ).execute()
        files = results.get("files", [])
        if files:
            return files[0]["id"]
        # Create folder — detect shared drive
        drive_id = _detect_drive_id(service, parent_id)
        folder_meta = {
            "name": folder_name,
            "mimeType": "application/vnd.google-apps.folder",
            "parents": [parent_id],
        }
        create_kwargs = {"body": folder_meta, "fields": "id", "supportsAllDrives": True}
        folder = service.files().create(**create_kwargs).execute()
        return folder["id"]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tạo thư mục '{folder_name}': {str(e)}")


def _get_or_create_subject_folder(service, ten_mh: str) -> str:
    """Get or create a subject folder: root / TenMH"""
    root_id = settings.GOOGLE_DRIVE_FOLDER_ID
    if not root_id:
        raise HTTPException(status_code=503, detail="GOOGLE_DRIVE_FOLDER_ID chưa cấu hình.")
    return _get_or_create_subfolder(service, root_id, ten_mh)


def _get_teacher_root_folder(service, ma_lop_mon: str, db=None) -> str:
    """Get the teacher's root folder: root / MonHoc / MaGV.
    Falls back to root / ma_lop_mon if can't resolve names."""
    root_id = settings.GOOGLE_DRIVE_FOLDER_ID
    if not root_id:
        raise HTTPException(status_code=503, detail="GOOGLE_DRIVE_FOLDER_ID chưa cấu hình.")

    try:
        if db is None:
            from tn.config.database import SessionLocal
            db = SessionLocal()
            should_close = True
        else:
            should_close = False

        try:
            from tn.models.lop_mon_hoc import LopMonHoc
            from tn.models.mon_hoc import MonHoc
            from tn.models.giao_vien import GiaoVien

            lmh = db.query(LopMonHoc).filter(LopMonHoc.MaLopMon == ma_lop_mon).first()
            if lmh and lmh.MaMH and lmh.MaHocKi and lmh.MaGV:
                mh = db.query(MonHoc).filter(MonHoc.MaMH == lmh.MaMH).first()
                gv = db.query(GiaoVien).filter(GiaoVien.MaGV == lmh.MaGV).first()
                if mh and gv:
                    subject_id = _get_or_create_subfolder(service, root_id, mh.TenMH)
                    term_id = _get_or_create_subfolder(service, subject_id, lmh.MaHocKi)
                    teacher_id = _get_or_create_subfolder(service, term_id, gv.TenGV)
                    return teacher_id
        finally:
            if should_close:
                db.close()
    except Exception as e:
        print(f"[Drive] Cannot resolve folder path: {e}")

    # Fallback
    try:
        return _get_or_create_subfolder(service, root_id, ma_lop_mon)
    except Exception:
        print(f"[Drive] Fallback — uploading directly to root folder")
        return root_id


def _get_upload_folder(service, ma_lop_mon: str, subfolder: str = "tai_lieu", db=None) -> str:
    """Get the upload folder: root / MonHoc / MaHK / subfolder.
    Falls back to root / ma_lop_mon if can't resolve names."""
    if ma_lop_mon == "global" and subfolder == "thong_bao":
        root_id = settings.GOOGLE_DRIVE_FOLDER_ID
        return _get_or_create_subfolder(service, root_id, "Thông báo")

    teacher_root = _get_teacher_root_folder(service, ma_lop_mon, db)
    return _get_or_create_subfolder(service, teacher_root, subfolder)


def list_all_files() -> List[dict]:
    """List all files in the root Drive folder recursively (for admin)."""
    service = _get_drive_service()
    root_id = settings.GOOGLE_DRIVE_FOLDER_ID
    if not root_id:
        return []
    try:
        all_files = []

        def _list_recursive(folder_id: str, depth: int = 0):
            if depth > 3:
                return
            query = f"'{folder_id}' in parents and trashed=false"
            res = service.files().list(
                q=query, pageSize=200,
                fields="files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, parents)",
                supportsAllDrives=True, includeItemsFromAllDrives=True,
            ).execute()
            for f in res.get("files", []):
                if f.get("mimeType") == "application/vnd.google-apps.folder":
                    _list_recursive(f["id"], depth + 1)
                else:
                    all_files.append(f)

        _list_recursive(root_id)
        return all_files
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy danh sách file: {str(e)}")


def list_files_by_lop_mon(ma_lop_mon: str) -> List[dict]:
    """List files for a specific class folder (MonHoc/GiaoVien)."""
    service = _get_drive_service()
    try:
        folder_id = _get_upload_folder(service, ma_lop_mon)
        query = f"'{folder_id}' in parents and trashed=false"
        res = service.files().list(
            q=query, pageSize=200,
            fields="files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink)",
            supportsAllDrives=True, includeItemsFromAllDrives=True,
        ).execute()
        return res.get("files", [])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy file lớp: {str(e)}")


def upload_file(file: UploadFile, ma_lop_mon: str, subfolder: str = "tai_lieu") -> dict:
    """Upload a file to the class folder: root / MonHoc / GiaoVien / subfolder.
    File sẽ được quét virus bằng VirusTotal trước khi upload."""
    service = _get_drive_service()
    try:
        folder_id = _get_upload_folder(service, ma_lop_mon, subfolder)
        file_content = file.file.read()

        # ── Quét virus bằng VirusTotal ──
        scan_result = _scan_file_with_virustotal(file_content, file.filename)
        if not scan_result.is_safe:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"File '{file.filename}' bị phát hiện chứa virus/malware! "
                    f"({scan_result.malicious} malicious, {scan_result.suspicious} suspicious). "
                    f"Từ chối upload."
                ),
            )

        file_metadata = {"name": file.filename, "parents": [folder_id]}
        media = MediaIoBaseUpload(
            io.BytesIO(file_content),
            mimetype=file.content_type or "application/octet-stream",
            resumable=True,
        )
        result = service.files().create(
            body=file_metadata, media_body=media,
            fields="id, name, mimeType, size, createdTime, webViewLink, webContentLink",
            supportsAllDrives=True,
        ).execute()
        
        # Grant public read access, especially needed for images
        try:
            service.permissions().create(
                fileId=result.get("id"),
                body={"type": "anyone", "role": "reader"},
                supportsAllDrives=True,
            ).execute()
        except Exception as perm_err:
            print(f"Lỗi cấp quyền public cho file {result.get('id')}: {perm_err}")

        # Gắn kết quả quét virus vào response
        result["virus_scan"] = {
            "is_safe": scan_result.is_safe,
            "malicious": scan_result.malicious,
            "suspicious": scan_result.suspicious,
            "message": scan_result.message,
        }

        # Invalidate document search cache khi upload tài liệu mới
        if subfolder == "tai_lieu":
            try:
                from tn.utils.document_search_service import invalidate_document_index_sync
                invalidate_document_index_sync(ma_lop_mon)
            except Exception as e:
                print(f"[Drive] Document cache invalidation failed (non-blocking): {e}")

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi upload file: {str(e)}")


def delete_file(file_id: str) -> dict:
    """Delete a file from Google Drive."""
    service = _get_drive_service()
    try:
        service.files().delete(fileId=file_id, supportsAllDrives=True).execute()
        return {"message": f"File '{file_id}' đã xóa thành công"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xóa file: {str(e)}")


def get_file_content(file_id: str) -> bytes:
    """Download file content (for RAG processing)."""
    service = _get_drive_service()
    try:
        request = service.files().get_media(fileId=file_id, supportsAllDrives=True)
        content = io.BytesIO()
        downloader = MediaIoBaseDownload(content, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()
        return content.getvalue()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tải file: {str(e)}")


def get_file_as_stream(file_id: str):
    """Download file content and mimeType (for proxying media)."""
    service = _get_drive_service()
    try:
        meta = service.files().get(
            fileId=file_id, fields="mimeType", supportsAllDrives=True
        ).execute()
        mime_type = meta.get("mimeType", "application/octet-stream")
        
        request = service.files().get_media(fileId=file_id, supportsAllDrives=True)
        content = io.BytesIO()
        downloader = MediaIoBaseDownload(content, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()
        return content.getvalue(), mime_type
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tải image stream: {str(e)}")


def get_content_for_quiz_ai(file_id: str) -> list[dict]:
    """Download file(s) content WITH metadata. If file_id is a folder, downloads all files inside it."""
    service = _get_drive_service()
    try:
        # Get file metadata first
        meta = service.files().get(
            fileId=file_id, fields="name, mimeType",
            supportsAllDrives=True,
        ).execute()

        if meta.get("mimeType") == "application/vnd.google-apps.folder":
            query = f"'{file_id}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false"
            res = service.files().list(
                q=query, fields="files(id, name, mimeType)",
                supportsAllDrives=True, includeItemsFromAllDrives=True,
            ).execute()
            files = res.get("files", [])
            downloaded = []
            for f in files:
                try:
                    request = service.files().get_media(fileId=f["id"], supportsAllDrives=True)
                    content = io.BytesIO()
                    downloader = MediaIoBaseDownload(content, request)
                    done = False
                    while not done:
                        _, done = downloader.next_chunk()
                    downloaded.append({
                        "bytes": content.getvalue(),
                        "name": f.get("name", ""),
                        "mimeType": f.get("mimeType", "")
                    })
                except Exception as e:
                    print(f"Skipped file {f['name']} in folder: {e}")
            return downloaded
        else:
            # Download single file
            request = service.files().get_media(fileId=file_id, supportsAllDrives=True)
            content = io.BytesIO()
            downloader = MediaIoBaseDownload(content, request)
            done = False
            while not done:
                _, done = downloader.next_chunk()

            return [{
                "bytes": content.getvalue(),
                "name": meta.get("name", ""),
                "mimeType": meta.get("mimeType", ""),
            }]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tải dữ liệu nguồn: {str(e)}")


def save_json_to_drive(ma_lop_mon: str, subfolder_path: list[str], filename: str, data: dict) -> dict:
    """Save a JSON dict as a file in Google Drive.
    subfolder_path: list of subfolder names under the teacher root folder.
    Example: ['quiz'] -> root/MonHoc/MaGV/quiz/filename.json
    Example: ['ket_qua', quiz_id, sv_id] -> root/MonHoc/MaGV/ket_qua/quiz_id/sv_id.json
    """
    service = _get_drive_service()
    try:
        parent_id = _get_teacher_root_folder(service, ma_lop_mon)
        # Navigate/create subfolder path
        for folder_name in subfolder_path:
            parent_id = _get_or_create_subfolder(service, parent_id, folder_name)

        # Upload JSON file
        json_bytes = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
        file_metadata = {"name": filename, "parents": [parent_id]}
        media = MediaIoBaseUpload(
            io.BytesIO(json_bytes),
            mimetype="application/json",
            resumable=True,
        )
        result = service.files().create(
            body=file_metadata, media_body=media,
            fields="id, name, mimeType, size, createdTime, webViewLink",
            supportsAllDrives=True,
        ).execute()
        print(f"[Drive] Saved JSON: {filename} -> {result.get('id')}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Drive] Error saving JSON to Drive: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi lưu file JSON lên Drive: {str(e)}")


def delete_file(file_id: str):
    """Delete a file or folder from Google Drive."""
    service = _get_drive_service()
    try:
        service.files().delete(fileId=file_id).execute()
        return {"message": "Xóa file thành công"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Xóa file thất bại: {e}")


def list_subfolders(ma_lop_mon: str, subfolder: str = "bai_tap"):
    """List subfolders (assignment folders) within a class subfolder."""
    service = _get_drive_service()
    parent_id = _get_upload_folder(service, ma_lop_mon, subfolder)
    results = service.files().list(
        q=f"'{parent_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields="files(id, name, createdTime, modifiedTime)",
        orderBy="createdTime desc",
        supportsAllDrives=True, includeItemsFromAllDrives=True,
    ).execute()
    
    folders = results.get("files", [])
    if not folders:
        return []
        
    try:
        folder_ids = [f"'{f['id']}' in parents" for f in folders]
        query = " or ".join(folder_ids)
        query = f"({query}) and trashed=false and mimeType!='application/vnd.google-apps.folder'"
        
        res = service.files().list(
            q=query, fields="files(parents)",
            supportsAllDrives=True, includeItemsFromAllDrives=True,
        ).execute()
        
        file_counts = {}
        for item in res.get("files", []):
            for p in item.get("parents", []):
                file_counts[p] = file_counts.get(p, 0) + 1
                
        for f in folders:
            f["fileCount"] = file_counts.get(f["id"], 0)
    except Exception as e:
        print(f"Error fetching file counts: {e}")
        
    return folders


def create_subfolder_in(ma_lop_mon: str, folder_name: str, subfolder: str = "bai_tap"):
    """Create a subfolder inside the bai_tap folder for a class."""
    service = _get_drive_service()
    parent_id = _get_upload_folder(service, ma_lop_mon, subfolder)
    meta = {
        "name": folder_name,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [parent_id],
    }
    folder = service.files().create(body=meta, fields="id, name, createdTime", supportsAllDrives=True).execute()
    return folder


def list_files_in_folder(folder_id: str):
    """List files inside a specific folder."""
    service = _get_drive_service()
    results = service.files().list(
        q=f"'{folder_id}' in parents and trashed=false",
        fields="files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, owners)",
        orderBy="createdTime desc",
        supportsAllDrives=True, includeItemsFromAllDrives=True,
    ).execute()
    return results.get("files", [])


def upload_to_folder(file, folder_id: str):
    """Upload a file to a specific folder.
    File sẽ được quét virus bằng VirusTotal trước khi upload."""
    import io as io_module
    from googleapiclient.http import MediaIoBaseUpload
    service = _get_drive_service()
    content = file.file.read()

    # ── Quét virus bằng VirusTotal ──
    scan_result = _scan_file_with_virustotal(content, file.filename)
    if not scan_result.is_safe:
        raise HTTPException(
            status_code=400,
            detail=(
                f"File '{file.filename}' bị phát hiện chứa virus/malware! "
                f"({scan_result.malicious} malicious, {scan_result.suspicious} suspicious). "
                f"Từ chối upload."
            ),
        )

    media = MediaIoBaseUpload(io_module.BytesIO(content), mimetype=file.content_type or 'application/octet-stream')
    meta = {"name": file.filename, "parents": [folder_id]}
    created = service.files().create(
        body=meta, media_body=media,
        fields="id,name,mimeType,size,createdTime,webViewLink,webContentLink"
    ).execute()

    # Gắn kết quả quét virus vào response
    created["virus_scan"] = {
        "is_safe": scan_result.is_safe,
        "malicious": scan_result.malicious,
        "suspicious": scan_result.suspicious,
        "message": scan_result.message,
    }

    return created


def list_all_files_tree():
    """List all files and folders as a tree structure for admin view."""
    service = _get_drive_service()
    root_id = settings.GOOGLE_DRIVE_FOLDER_ID
    if not root_id:
        return []
    # Get ALL files and folders under root recursively
    all_items = []

    def _collect(folder_id: str, depth: int = 0):
        if depth > 4:
            return
        query = f"'{folder_id}' in parents and trashed=false"
        res = service.files().list(
            q=query, pageSize=500,
            fields="files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, parents)",
            supportsAllDrives=True, includeItemsFromAllDrives=True,
        ).execute()
        for f in res.get("files", []):
            all_items.append(f)
            if f.get("mimeType") == "application/vnd.google-apps.folder":
                _collect(f["id"], depth + 1)

    _collect(root_id)
    return all_items


# ═══════════════════════════════════════════════════════════════
# DOCUMENT MEMORY — lưu tóm tắt và câu hỏi đã sinh theo file
# Path: root / memory / {ma_lop_mon} / {file_name} / content.md
#                                                   / quiz.md
# ═══════════════════════════════════════════════════════════════

def _get_memory_root(service) -> str:
    """Get (or create) the global 'memory' folder under Drive root."""
    root_id = settings.GOOGLE_DRIVE_FOLDER_ID
    if not root_id:
        raise HTTPException(status_code=503, detail="GOOGLE_DRIVE_FOLDER_ID chưa cấu hình.")
    return _get_or_create_subfolder(service, root_id, "memory")


def get_memory_folder_id(ma_lop_mon: str, file_name: str) -> tuple[str, object]:
    """Return (folder_id, service) for memory/{ma_lop_mon}/{file_name}/.
    Creates folders along the path if they don't exist.
    """
    service = _get_drive_service()
    memory_root = _get_memory_root(service)
    lop_folder = _get_or_create_subfolder(service, memory_root, ma_lop_mon)
    file_folder = _get_or_create_subfolder(service, lop_folder, file_name)
    return file_folder, service


def read_memory_file(ma_lop_mon: str, file_name: str, memory_type: str) -> str | None:
    """Read content.md or quiz.md from memory/{ma_lop_mon}/{file_name}/.
    Returns file content as string, or None if not found.
    memory_type: 'content' | 'quiz'
    """
    try:
        service = _get_drive_service()
        memory_root = _get_memory_root(service)

        # Walk down folder tree — stop early if any level missing
        def _find_child(parent_id: str, name: str) -> str | None:
            query = (
                f"name='{name}' and '{parent_id}' in parents and trashed=false"
            )
            res = service.files().list(
                q=query, fields="files(id, name)",
                supportsAllDrives=True, includeItemsFromAllDrives=True,
            ).execute()
            files = res.get("files", [])
            return files[0]["id"] if files else None

        lop_id = _find_child(memory_root, ma_lop_mon)
        if not lop_id:
            return None
        doc_id = _find_child(lop_id, file_name)
        if not doc_id:
            return None
        md_filename = f"{memory_type}.md"
        file_id = _find_child(doc_id, md_filename)
        if not file_id:
            return None

        # Download content
        request = service.files().get_media(fileId=file_id, supportsAllDrives=True)
        buf = io.BytesIO()
        downloader = MediaIoBaseDownload(buf, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()
        return buf.getvalue().decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"[Memory] read_memory_file failed ({memory_type}): {e}")
        return None


def write_memory_file(ma_lop_mon: str, file_name: str, memory_type: str, content_str: str) -> dict:
    """Write (create or overwrite) content.md / quiz.md in memory/{ma_lop_mon}/{file_name}/.
    memory_type: 'content' | 'quiz'
    """
    try:
        folder_id, service = get_memory_folder_id(ma_lop_mon, file_name)
        md_filename = f"{memory_type}.md"

        # Check if file already exists (to update in-place)
        query = f"name='{md_filename}' and '{folder_id}' in parents and trashed=false"
        res = service.files().list(
            q=query, fields="files(id)",
            supportsAllDrives=True, includeItemsFromAllDrives=True,
        ).execute()
        existing_files = res.get("files", [])

        content_bytes = content_str.encode("utf-8")
        media = MediaIoBaseUpload(
            io.BytesIO(content_bytes),
            mimetype="text/markdown",
            resumable=True,
        )

        if existing_files:
            # Update existing file
            file_id = existing_files[0]["id"]
            result = service.files().update(
                fileId=file_id,
                media_body=media,
                fields="id, name, modifiedTime",
                supportsAllDrives=True,
            ).execute()
            print(f"[Memory] Updated {md_filename} for '{file_name}' in lop '{ma_lop_mon}'")
        else:
            # Create new file
            file_metadata = {"name": md_filename, "parents": [folder_id]}
            result = service.files().create(
                body=file_metadata,
                media_body=media,
                fields="id, name, createdTime",
                supportsAllDrives=True,
            ).execute()
            print(f"[Memory] Created {md_filename} for '{file_name}' in lop '{ma_lop_mon}'")

        return result
    except Exception as e:
        print(f"[Memory] write_memory_file failed ({memory_type}): {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi ghi memory file: {str(e)}")


def delete_memory_folder(ma_lop_mon: str, file_name: str) -> dict:
    """Delete the entire memory/{ma_lop_mon}/{file_name}/ folder (force rebuild on next generate)."""
    try:
        service = _get_drive_service()
        memory_root = _get_memory_root(service)

        def _find_child(parent_id: str, name: str) -> str | None:
            query = f"name='{name}' and '{parent_id}' in parents and trashed=false"
            res = service.files().list(
                q=query, fields="files(id)",
                supportsAllDrives=True, includeItemsFromAllDrives=True,
            ).execute()
            files = res.get("files", [])
            return files[0]["id"] if files else None

        lop_id = _find_child(memory_root, ma_lop_mon)
        if not lop_id:
            return {"message": "Không tìm thấy memory folder cho lớp này"}
        doc_id = _find_child(lop_id, file_name)
        if not doc_id:
            return {"message": "Không tìm thấy memory folder cho tài liệu này"}

        service.files().delete(fileId=doc_id, supportsAllDrives=True).execute()
        print(f"[Memory] Deleted memory folder for '{file_name}' in lop '{ma_lop_mon}'")
        return {"message": f"Đã xóa memory cho tài liệu '{file_name}'"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Memory] delete_memory_folder failed: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi xóa memory: {str(e)}")


def list_memory_items(ma_lop_mon: str) -> list[dict]:
    """List all document folders inside memory/{ma_lop_mon}/."""
    try:
        service = _get_drive_service()
        memory_root = _get_memory_root(service)

        # Find lop subfolder  
        query = f"name='{ma_lop_mon}' and '{memory_root}' in parents and trashed=false"
        res = service.files().list(
            q=query, fields="files(id)",
            supportsAllDrives=True, includeItemsFromAllDrives=True,
        ).execute()
        lop_files = res.get("files", [])
        if not lop_files:
            return []
        lop_id = lop_files[0]["id"]

        # List all doc folders inside lop folder
        query2 = f"'{lop_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"
        res2 = service.files().list(
            q=query2, fields="files(id, name, modifiedTime)",
            supportsAllDrives=True, includeItemsFromAllDrives=True,
        ).execute()
        return res2.get("files", [])
    except Exception as e:
        print(f"[Memory] list_memory_items failed: {e}")
        return []
