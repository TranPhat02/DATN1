"""
Setup Google Drive OAuth2 - chạy 1 lần để lấy refresh token.

Bước chuẩn bị (làm 1 lần trên Google Cloud Console):
  1. Vào: https://console.cloud.google.com/apis/credentials?project=cntt-491408
  2. Click "+ Create Credentials" → "OAuth client ID"
  3. Chọn "Desktop app" → đặt tên "DATN1 Drive" → Create
  4. Download JSON → lưu thành: D:\DATN1\oauth_client.json

Sau đó chạy script này:
  python setup_drive_oauth.py

Trình duyệt sẽ mở → đăng nhập bằng peterphat02@gmail.com → cấp quyền
Token sẽ lưu vào: D:\DATN1\backend\tn\drive_token.json  (tự động dùng mãi)
"""
import os
import json
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

SCOPES = ["https://www.googleapis.com/auth/drive"]
CLIENT_SECRETS = r"D:\DATN1\oauth_client.json"
TOKEN_FILE = r"D:\DATN1\backend\tn\drive_token.json"


def main():
    if not os.path.exists(CLIENT_SECRETS):
        print("Khong tim thay file oauth_client.json!")
        print()
        print("Làm theo hướng dẫn sau:")
        print("  1. Vào https://console.cloud.google.com/apis/credentials?project=cntt-491408")
        print("  2. Click '+ Create Credentials' → 'OAuth client ID'")
        print("  3. Chọn 'Desktop app' → tên 'DATN1 Drive' → Create")
        print("  4. Download JSON → lưu thành: D:\\DATN1\\oauth_client.json")
        print("  5. Chạy lại script này")
        return

    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            print("Token da duoc lam moi tu dong.")
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRETS, SCOPES)
            creds = flow.run_local_server(port=8080)
            print("Dang nhap thanh cong!")

        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())
        print(f"Token da luu vao: {TOKEN_FILE}")

    # Xác nhận hoạt động
    from googleapiclient.discovery import build
    service = build("drive", "v3", credentials=creds)
    folder_id = "1WP4a0GCEMOWe3GKKiQi8BieGdJVI1YMu"
    res = service.files().list(
        q=f"'{folder_id}' in parents and trashed=false",
        fields="files(id, name)",
        supportsAllDrives=True, includeItemsFromAllDrives=True,
    ).execute()
    print(f"Ket noi Drive OK! Folder co {len(res.get('files', []))} file.")
    print()
    print("Setup hoan tat! He thong se tu upload file voi quyen cua ban.")


if __name__ == "__main__":
    main()
