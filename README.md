# TN Education Platform (DATN)

Hệ thống quản lý học tập tích hợp Trợ lý học tập AI (Gemini), tự động hóa tạo đề trắc nghiệm, đồng bộ tài liệu Google Drive, và quản lý đào tạo (Sinh viên, Giảng viên, Lớp học, Điểm số, Lịch học).

---

## 📌 Công Nghệ Sử Dụng

### Backend
* **Core:** Python 3.12 + FastAPI
* **ORM:** SQLAlchemy (MySQL) & Motor (MongoDB)
* **AI Integration:** Google Gemini AI API
* **Security:** JWT Authentication, Bcrypt Password Hashing
* **Storage Sync:** Google Drive API v3

### Frontend
* **Core:** React (TypeScript) + Vite
* **Routing:** React Router v6
* **UI/Styles:** Vanilla CSS (hỗ trợ Dark/Light mode)

### Database & Services
* **Relational DB:** MySQL (Hỗ trợ chạy local hoặc Cloud như Aiven Cloud)
* **NoSQL DB:** MongoDB (Quản lý log thông báo, tài liệu học tập, nội dung chatbot)
* **External APIs:** Gemini AI API, Google Drive API, Gmail SMTP, VirusTotal API (Quét tài liệu tải lên)

---

## 🛠️ Yêu Cầu Hệ Thống

Trước khi bắt đầu, máy tính của bạn cần được cài đặt sẵn:
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Khuyên dùng để triển khai nhanh)
* [Node.js](https://nodejs.org/) (Phiên bản v18 trở lên - nếu chạy local)
* [Python 3.12](https://www.python.org/) (nếu chạy local)

---

## ⚡ Cách Chạy Bằng Docker (Khuyên Dùng)

Đây là cách đơn giản nhất để chạy toàn bộ dự án mà không cần cài đặt môi trường lập trình phức tạp.

### Bước 1: Chuẩn bị file cấu hình môi trường
1. Sao chép file cấu hình mẫu ở thư mục gốc:
   ```bash
   cp .env.docker .env
   ```
2. Mở file `.env` vừa tạo ở thư mục gốc và điền các thông tin quan trọng:
   * `GEMINI_API_KEY`: Mã khóa API Gemini của bạn để Chatbot và Tạo trắc nghiệm hoạt động.
   * `SMTP_EMAIL` và `SMTP_APP_PASSWORD`: Gmail và mật khẩu ứng dụng để hệ thống gửi thông báo email.
   * `MYSQL_URL` và `MONGO_URL`: Cấu hình kết nối MySQL và MongoDB (mặc định đã cấu hình sẵn kết nối đám mây Aiven/Atlas).

### Bước 2: Thiết lập Google Drive API (Nếu sử dụng tính năng đồng bộ tài liệu)
1. Đặt file `credentials.json` (tải từ Google Cloud Console) vào thư mục gốc.
2. Thiết lập thư mục lưu trữ: Điền `GOOGLE_DRIVE_FOLDER_ID` vào file `.env`.
3. Chứng chỉ SSL của MySQL trên Aiven (nếu có): Đặt file `ca.pem` vào thư mục `backend/tn/certs/ca.pem`.

### Bước 3: Khởi chạy dự án bằng Docker Compose
Mở Terminal tại thư mục gốc của dự án và chạy:
```bash
docker compose up --build -d
```

Hệ thống sẽ tải các Image, build mã nguồn và khởi động các Container:
* **Frontend (React Client):** Hoạt động tại [http://localhost](http://localhost) (Cổng 80)
* **Backend (FastAPI):** Hoạt động tại [http://localhost:8000](http://localhost:8000)

Để kiểm tra trạng thái các Container:
```bash
docker ps
```
Để xem log hệ thống:
```bash
docker compose logs -f
```

---

## 💻 Cách Chạy Thủ Công (Để Phát Triển - Development)

Nếu bạn muốn chỉnh sửa mã nguồn và debug trực tiếp trên máy local:

### 1. Chạy Backend (FastAPI)

1. Di chuyển vào thư mục backend:
   ```bash
   cd backend/tn
   ```
2. Tạo môi trường ảo Python:
   ```bash
   python -m venv venv
   ```
3. Kích hoạt môi trường ảo:
   * **Windows (Command Prompt):** `venv\Scripts\activate`
   * **Windows (PowerShell):** `.\venv\Scripts\Activate.ps1`
   * **Linux/macOS:** `source venv/bin/activate`
4. Cài đặt các thư viện phụ thuộc:
   ```bash
   pip install -r requirements.txt
   ```
5. Sao chép và cấu hình file `.env`:
   ```bash
   cp .env.example .env
   ```
   *Điền đầy đủ thông số kết nối Database, Gemini Key, SMTP tương tự như phần Docker.*
6. Chạy backend với Uvicorn Live-Reload:
   ```bash
   uvicorn tn.main:app --reload --host 0.0.0.0 --port 8000
   ```

### 2. Chạy Frontend (React + Vite)

1. Di chuyển vào thư mục frontend:
   ```bash
   cd frontend/hoc-tap
   ```
2. Cài đặt các gói npm:
   ```bash
   npm install
   ```
3. Chạy Server phát triển:
   ```bash
   npm run dev
   ```
4. Truy cập giao diện tại: [http://localhost:5173](http://localhost:5173)

---

## 🔑 Tài Khoản Đăng Nhập Mặc Định

Sau khi khởi chạy dự án, bạn có thể đăng nhập bằng các tài khoản mẫu sau để trải nghiệm hệ thống:

| Vai Trò | Tên Đăng Nhập | Mật Khẩu | Quyền Hạn |
|---|---|---|---|
| **Quản Trị Viên** | `admin` | `admin123` | Quản lý toàn bộ hệ thống, Import CSV, Phân lịch, Tạo tài khoản |
| **Giảng Viên** | `GV001` | `000000` | Xem lịch dạy, Quản lý lớp môn học, Chấm điểm, Upload tài liệu |
| **Sinh Viên** | `SV26041416422949` | `123456` | Chat với AI, Làm bài trắc nghiệm, Xem điểm, Tải tài liệu học tập |

---

## 📁 Cấu Trúc Thư Mục Dự Án

```text
DATN1/
├── backend/
│   └── tn/
│       ├── certs/            # Chứa chứng chỉ SSL kết nối MySQL
│       ├── src/
│       │   └── tn/
│       │       ├── config/   # Cấu hình database, cài đặt hệ thống
│       │       ├── handlers/ # Xử lý logic nghiệp vụ chính (Business Logic)
│       │       ├── models/   # Định nghĩa thực thể MySQL & Pydantic
│       │       ├── routers/  # Định nghĩa các endpoint REST API
│       │       └── main.py   # Entrypoint khởi chạy ứng dụng FastAPI
│       ├── requirements.txt  # Khai báo thư viện Python
│       └── Dockerfile
├── frontend/
│   └── hoc-tap/
│       ├── src/
│       │   ├── api/          # Gọi API kết nối backend
│       │   ├── features/     # Các module chức năng (admin, teacher, student)
│       │   ├── shared/       # Component, layout và helper dùng chung
│       │   └── App.tsx       # Cấu hình định tuyến (React Router)
│       ├── package.json      # Khai báo thư viện Node.js
│       └── Dockerfile
├── docker-compose.yml        # Điều phối các container Docker
└── README.md                 # Tài liệu hướng dẫn này
```

---

## 🛑 Khắc Phục Một Số Lỗi Thường Gặp

#### 1. Lỗi 502 Bad Gateway khi chạy Docker
* **Nguyên nhân:** Container backend khởi động chậm hơn MySQL Cloud hoặc Docker không phân giải được tên miền bên ngoài.
* **Cách sửa:** Đảm bảo cấu hình DNS trong `docker-compose.yml` có dòng `dns: - 8.8.8.8` và `1.1.1.1` để container phân giải được địa chỉ internet.

#### 2. Chatbot AI hoặc chức năng tạo trắc nghiệm báo lỗi
* **Nguyên nhân:** Chưa cấu hình `GEMINI_API_KEY` hoặc API Key bị hết hạn/sai.
* **Cách sửa:** Cập nhật lại khoá API hợp lệ trong file cấu hình `.env` hoặc cập nhật trong biến môi trường của container.

#### 3. Đồng bộ tài liệu Google Drive không hoạt động
* **Nguyên nhân:** Thiếu file chứng chỉ OAuth Client (`credentials.json`) ở thư mục gốc hoặc token ủy quyền đã hết hạn.
* **Cách sửa:** Đảm bảo file `credentials.json` đã đặt đúng vị trí trước khi build container. Chạy script hỗ trợ để cấp quyền lấy token mới nếu cần: `python setup_drive_oauth.py`.
