---
description: One-time setup for Auto Deployment (Fresh Environment)
---

# 🛠 Setup Auto Deployment

Workflow này sẽ thiết lập môi trường để bạn có thể dùng `/push`.
Chỉ chạy workflow này **1 lần duy nhất** khi mới bắt đầu.

## 1. Install & Setup
1. Run `cmd /c npm install -g @google/clasp` in `.`
2. Run `mkdir deploy_gas` in `.` (Ignore error if exists)

## 2. Manual Login Step
**DỪNG LẠI VÀ THỰC HIỆN THỦ CÔNG:**
Để hoàn tất, bạn cần đăng nhập Google và lấy Script ID.

1. Chạy lệnh sau trong Terminal để đăng nhập:
   ```bash
   cd ./deploy_gas
   clasp login
   ```
2. Tạo file `.clasp.json` trong thư mục `deploy_gas` với nội dung:
   ```json
   {
     "scriptId": "YOUR_SCRIPT_ID_HERE",
     "rootDir": "./deploy_gas"
   }
   ```
   *(Thay YOUR_SCRIPT_ID_HERE bằng ID từ link Google Sheet của bạn)*

3. Sau khi làm xong 2 bước trên, bạn có thể bắt đầu dùng `/push` thoải mái!
