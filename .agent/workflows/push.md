---
description: Auto-deploy Frontend to GitHub and Backend to Google Apps Script
---

# 🚀 Auto Deployment Workflow
// turbo-all

Workflow này sẽ tự động:
1. Cập nhật code vào thư mục `LMS_template` (GitHub)
2. Cập nhật code vào thư mục `deploy_gas` (GAS)
3. Đẩy lên Google Apps Script (Backend)
4. Đẩy lên GitHub (Frontend + Backup)

## 1. Sync & Prepare
1. Copy `code.gs` to `deploy_gas\Code.js` (Backup for GAS)

## 2. Deploy to Google Apps Script (Backend)
// turbo
2. Run `cmd /c clasp push -f` in `./deploy_gas`
// turbo
3. Run `cmd /c clasp deploy --description "Auto deploy via /push"` in `./deploy_gas`

## 3. Deploy to GitHub (Frontend)
// turbo
4. Run `git add .` in `.`
// turbo
5. Run `git commit -m "Auto deploy via /push"` in `.`
// turbo
6. Run `git push` in `.`
