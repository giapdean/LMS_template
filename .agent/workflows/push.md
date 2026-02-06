---
description: Auto-deploy Frontend (Only LMS_template/index.html) and Backend (GAS)
---

# 🚀 Auto Deployment Workflow
// turbo-all

Workflow này sẽ tự động:
1. Deploy Backend lên Google Apps Script.
2. Xử lý Frontend: Xóa file rác trong `LMS_template`, chỉ giữ `index.html`.
3. Deploy Frontend: Đẩy riêng folder `LMS_template` lên GitHub (nhánh `main`).

## 1. Sync & Prepare
// turbo
1. Run `cmd /c copy /Y "code.gs" "deploy_gas\Code.js"` in `.` (Sync Backend)
// turbo
2. Run `cmd /c copy /Y "LMS_template\index.html" "deploy_gas\index.html"` in `.` (Sync Frontend to GAS)

## 2. Deploy to Google Apps Script (Backend)
// turbo
3. Run `cmd /c "clasp push -f"` in `./deploy_gas` (Updates @HEAD automatically)
// turbo
3. Run `cmd /c "clasp deploy -i AKfycbypp1thCzYNOmdFQI7zBtGBb5NmYHpLTqZvlSu2hdst7Exb9e0TnXD6H3mm5gaduJ2XWQ"` in `./deploy_gas` (ALWAYS update existing deployment, NEVER create new ID)

## 3. Deploy to GitHub (Frontend - index.html ONLY)
// turbo
4. Run `cmd /c "if not exist .git (git init && git remote add origin https://github.com/giapdean/LMS_template.git)"` in `.`
// turbo
5. Run `cmd /c "git pull origin main"` in `.` (Sync remote info)

### 3.1. Cleanup LMS_template (Keep Only index.html)
// turbo
6. Run `cmd /c "del LMS_template\README.md 2>nul & del LMS_template\code.js 2>nul & del LMS_template\landing.html 2>nul & del LMS_template\.agent 2>nul"` in `.`

### 3.2. Commit & Push Subtree
// turbo
7. Run `cmd /c "git add LMS_template && git commit -m update"` in `.` (Avoid quotes to prevent cmd syntax errors)
// turbo
8. Run `cmd /c "git subtree split --prefix LMS_template -b temp_deploy_branch"` in `.`
// turbo
9. Run `cmd /c "git push origin temp_deploy_branch:main -f"` in `.`
// turbo
10. Run `cmd /c "git branch -D temp_deploy_branch"` in `.`

## 4. Troubleshooting (Xử lý lỗi)

### 🔴 Lỗi: "Everything up-to-date" nhưng code không lên?
- **Nguyên nhân:** Lệnh `git commit` bị lỗi (thường do dấu ngoặc kép `" "` trong tin nhắn commit gây xung đột với `cmd`).
- **Hệ quả:** Vì commit chưa được tạo, git sẽ đẩy code cũ lên -> Báo "up-to-date" (thành công ảo).
- **Giải pháp:**
  - **TUYỆT ĐỐI KHÔNG** dùng dấu ngoặc kép phức tạp trong lệnh commit.
  - Dùng lệnh đơn giản: `git commit -m update`.
  - **QUAN TRỌNG:** Nếu thấy dòng `On branch main... nothing to commit`, nghĩa là code chưa được commit -> **BÁO LỖI NGAY LẬP TỨC**.

### 🔴 Lỗi: "File ... clasp.ps1 cannot be loaded"
- **Nguyên nhân:** PowerShell chặn chạy script ngoại lai.
- **Giải pháp:** Thêm `cmd /c` trước mỗi lệnh. Ví dụ: `cmd /c "clasp push"`.

## 5. Report Status (BẮT BUỘC)
Sau khi deploy xong, Agent **PHẢI** báo cáo lại thông tin version cho User:
1. **Lấy Git SHA:** Chạy `cmd /c "git rev-parse HEAD"`
2. **Lấy GAS ID:** ID deployment cố định là `AKfycbypp1thCzYNOmdFQI7zBtGBb5NmYHpLTqZvlSu2hdst7Exb9e0TnXD6H3mm5gaduJ2XWQ`
3. **Mẫu báo cáo:**
   > ✅ Deploy Success!
   > - **Git SHA:** [Kết quả rev-parse]
   > - **GAS ID:** AKfuc... (Verified)

