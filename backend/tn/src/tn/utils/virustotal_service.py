"""
VirusTotal service — quét virus/malware cho file upload.
Sử dụng VirusTotal API v3.
"""
import time
import httpx
from dataclasses import dataclass

from tn.config.database import settings

VT_API_URL = "https://www.virustotal.com/api/v3"
MAX_FILE_SIZE = 32 * 1024 * 1024  # 32 MB — giới hạn free tier
SCAN_TIMEOUT = 120  # Tổng thời gian chờ quét tối đa (giây)
POLL_INTERVAL = 5  # Thời gian chờ giữa các lần poll (giây)


@dataclass
class ScanResult:
    """Kết quả quét virus từ VirusTotal."""
    is_safe: bool
    malicious: int = 0
    suspicious: int = 0
    undetected: int = 0
    harmless: int = 0
    message: str = ""
    scan_id: str = ""


def _get_headers() -> dict:
    """Trả về headers với API key cho VirusTotal."""
    api_key = settings.VIRUSTOTAL_API_KEY
    if not api_key:
        raise RuntimeError("VIRUSTOTAL_API_KEY chưa được cấu hình trong .env")
    return {"x-apikey": api_key}


def scan_file(file_content: bytes, filename: str) -> ScanResult:
    """
    Quét file bằng VirusTotal API.

    Quy trình:
    1. Kiểm tra kích thước file (từ chối > 32MB)
    2. Gửi file lên VirusTotal để quét
    3. Polling kết quả cho đến khi quét xong hoặc timeout
    4. Trả về kết quả quét

    Raises:
        RuntimeError: Khi VT chưa cấu hình, file quá lớn, hoặc quét thất bại.
    """
    # ── Kiểm tra kích thước ──
    file_size = len(file_content)
    if file_size > MAX_FILE_SIZE:
        raise RuntimeError(
            f"File '{filename}' có kích thước {file_size / (1024*1024):.1f}MB, "
            f"vượt quá giới hạn {MAX_FILE_SIZE / (1024*1024):.0f}MB. Từ chối upload."
        )

    if file_size == 0:
        raise RuntimeError(f"File '{filename}' rỗng (0 bytes). Từ chối upload.")

    headers = _get_headers()

    # ── Bước 1: Gửi file lên VirusTotal ──
    print(f"[VirusTotal] Đang gửi file '{filename}' ({file_size / 1024:.1f}KB) để quét...")

    try:
        with httpx.Client(timeout=60) as client:
            response = client.post(
                f"{VT_API_URL}/files",
                headers=headers,
                files={"file": (filename, file_content)},
            )
    except httpx.TimeoutException:
        raise RuntimeError(
            f"Timeout khi gửi file '{filename}' lên VirusTotal. Từ chối upload."
        )
    except httpx.HTTPError as e:
        raise RuntimeError(
            f"Lỗi kết nối VirusTotal khi gửi file '{filename}': {str(e)}. Từ chối upload."
        )

    if response.status_code != 200:
        raise RuntimeError(
            f"VirusTotal từ chối file '{filename}' (HTTP {response.status_code}): "
            f"{response.text[:200]}. Từ chối upload."
        )

    data = response.json()
    analysis_id = data.get("data", {}).get("id", "")
    if not analysis_id:
        raise RuntimeError(
            f"VirusTotal không trả về analysis ID cho file '{filename}'. Từ chối upload."
        )

    print(f"[VirusTotal] File đã gửi thành công. Analysis ID: {analysis_id}")

    # ── Bước 2: Polling kết quả ──
    return _poll_analysis(analysis_id, filename)


def _poll_analysis(analysis_id: str, filename: str) -> ScanResult:
    """Polling kết quả phân tích từ VirusTotal cho đến khi hoàn tất hoặc timeout."""
    headers = _get_headers()
    start_time = time.time()

    print(f"[VirusTotal] Đang chờ kết quả quét cho '{filename}'...")

    while True:
        elapsed = time.time() - start_time
        if elapsed > SCAN_TIMEOUT:
            raise RuntimeError(
                f"Quét file '{filename}' bị timeout sau {SCAN_TIMEOUT}s. Từ chối upload."
            )

        try:
            with httpx.Client(timeout=30) as client:
                response = client.get(
                    f"{VT_API_URL}/analyses/{analysis_id}",
                    headers=headers,
                )
        except (httpx.TimeoutException, httpx.HTTPError) as e:
            raise RuntimeError(
                f"Lỗi khi lấy kết quả quét file '{filename}': {str(e)}. Từ chối upload."
            )

        if response.status_code != 200:
            raise RuntimeError(
                f"VirusTotal lỗi khi lấy kết quả (HTTP {response.status_code}). Từ chối upload."
            )

        result = response.json()
        attributes = result.get("data", {}).get("attributes", {})
        status = attributes.get("status", "")

        if status == "completed":
            stats = attributes.get("stats", {})
            malicious = stats.get("malicious", 0)
            suspicious = stats.get("suspicious", 0)
            undetected = stats.get("undetected", 0)
            harmless = stats.get("harmless", 0)

            is_safe = malicious == 0 and suspicious == 0

            if is_safe:
                msg = (
                    f"File '{filename}' an toàn. "
                    f"({harmless} harmless, {undetected} undetected)"
                )
                print(f"[VirusTotal] ✅ {msg}")
            else:
                msg = (
                    f"File '{filename}' phát hiện nguy hiểm! "
                    f"({malicious} malicious, {suspicious} suspicious)"
                )
                print(f"[VirusTotal] ❌ {msg}")

            return ScanResult(
                is_safe=is_safe,
                malicious=malicious,
                suspicious=suspicious,
                undetected=undetected,
                harmless=harmless,
                message=msg,
                scan_id=analysis_id,
            )

        elif status == "queued" or status == "in-progress":
            print(
                f"[VirusTotal] Đang quét... ({elapsed:.0f}s / {SCAN_TIMEOUT}s)"
            )
            time.sleep(POLL_INTERVAL)

        else:
            raise RuntimeError(
                f"VirusTotal trả về trạng thái không xác định: '{status}'. Từ chối upload."
            )
