---
description: Quy trình Fix Bug và Xử lý Lỗi (Thay thế debug.md)
---

# Quy trình Fix Bug Hiệu Quả

## 1. QUY TRÌNH TIẾP NHẬN & XỬ LÝ (The Golden Flow)
**Nguyên tắc:** Không đoán mò. Mọi việc sửa code đều phải dựa trên bằng chứng (Log).

### Bước 1: Rà soát & Bổ sung Debug Log (Review & Log)
*Mục tiêu: Có bằng chứng cụ thể log chi tiết từng bước.*
1.  **Review Code:** Kiểm tra tính năng bị lỗi đã có log chưa?
2.  **Thêm Log Chi Tiết:** Nếu chưa, chèn log vào các điểm quan trọng:
    *   `console.log('🔍 [Step 1] Input:', ...)`
    *   `console.log('🔍 [Step 2] Process:', ...)`
    *   `console.log('🔍 [Step 3] Output:', ...)`
3.  **Yêu cầu User:** Chụp màn hình log/popup để xác định vị trí lỗi.

### Bước 2: Phân tích & Tra cứu (Analyze & Lookup)
*Mục tiêu: Tận dụng kinh nghiệm cũ.*
1.  **Review Lỗi:** Từ ảnh chụp log, xác định nguyên nhân (Input rỗng? Logic sai? API lỗi?).
2.  **Tra cứu Case Studies:** Kiểm tra **Mục 2** bên dưới xem lỗi này đã gặp chưa.
    *   **NẾU CÓ:** Làm theo "Giải pháp" đã ghi.
    *   **NẾU KHÔNG:** Tiến hành fix mới (Bước 3).

### Bước 3: Fix Bug & Cập nhật Tài liệu (Fix & Document)
1.  Thực hiện sửa code.
2.  Verify lại log (đảm bảo hết lỗi).
3.  **BẮT BUỘC:** Nếu đây là lỗi mới, hãy thêm ngay vào **Mục 2 (Tổng hợp Lỗi đã gặp)** bên dưới.
    *   Ghi rõ: Triệu chứng -> Nguyên nhân -> Giải pháp.

---

## 2. TỔNG HỢP LỖI ĐÃ GẶP (Case Studies)

### 🔴 Lỗi 1: Chart không hiện dữ liệu / Dữ liệu sai
-   **Nguyên nhân:** Parse ngày tháng sai (`new Date`) trên Safari/Chrome cũ hoặc còn code `Math.random()` fake data.
-   **Giải pháp:**
    -   Dùng Timestamp cho tính toán.
    -   Viết hàm `parseDateSafe`.
    -   Luôn kiểm tra data thật `report.lessonAnalytics`.

### 🔴 Lỗi 2: Tab/Modal tối đen (Black Screen)
-   **Nguyên nhân:** Paste nhầm `display:none` vào HTML hoặc JS toggle class nhưng không clear inline text.
-   **Giải pháp:**
    -   Ưu tiên dùng Class (`.active`) thay vì Inline Style.
    -   Dùng `removeAttribute('style')` khi switch tab.

### 🔴 Lỗi 3: Có Content trong DOM nhưng không nhìn thấy
-   **Nguyên nhân:** Chữ đen trên nền đen (Màu sắc) hoặc CSS Inject Order bị chậm.
-   **Giải pháp:**
    -   Chuyển CSS ra Global `<head>`.
    -   Set `color: white` rõ ràng.

### 🔴 Lỗi 4: Code "Kỳ kỳ" / Khó debug
-   **Nguyên nhân:** Nhồi nhét logic phức tạp vào Template String `${...}`.
-   **Giải pháp:**
    -   Tách logic ra Helper Function.
    -   Template String chỉ chứa biến đơn giản.

### 🔴 Lỗi 5: Deploy xong không thấy thay đổi (Caching)
-   **Triệu chứng:** Code đã push nhưng web vẫn cũ.
-   **Nguyên nhân:** Google Apps Script cache mạnh.
-   **Giải pháp:**
    -   Luôn chạy `clasp deploy`.
    -   Update Deployment ID nếu cần.
    -   Clear cache / Incognito.

### 🔴 Lỗi 6: Permissions / Access Denied
-   **Triệu chứng:** Loading mãi mãi, không thấy data.
-   **Nguyên nhân:** Email trong Sheet khác format (hoa/thường/space) so với Google User.
-   **Giải pháp:**
    -   Luôn `trim().toLowerCase()` mọi email trước khi so sánh.

### 🔴 Lỗi 7: Date Parsing (Invalid Date) trên Safari/Mobile
-   **Triệu chứng:** Chart PC chạy, Mobile lỗi `NaN`.
-   **Nguyên nhân:** `new Date("YYYY-MM-DD HH:mm:ss")` không chuẩn.
-   **Giải pháp:**
    -   Dùng Timestamp hoặc tự parse thủ công.

### 🔴 Lỗi 8: Icons/Components biến mất sau khi cập nhật nội dung
-   **Triệu chứng:** Mất icon sau khi `innerHTML`.
-   **Nguyên nhân:** Thư viện DOM-scanning (Lucide) chỉ chạy 1 lần đầu.
-   **Giải pháp:**
    -   Gọi `lucide.createIcons()` ngay sau khi inject HTML.

### 🔴 Lỗi 9: FormData biến Object thành Chuỗi "[object Object]" hoặc JSON String
-   **Triệu chứng:** Frontend gửi `{id: 1}` nhưng Backend nhận `"{id: 1}"` (string) hoặc empty.
-   **Nguyên nhân:** `FormData` stringify mọi thứ. Backend không tự parse.
-   **Giải pháp:**
    -   Frontend: `formData.append('key', JSON.stringify(data))`.
    -   Backend: `if (typeof data === 'string') data = JSON.parse(data)`.

### 🔴 Lỗi 10: Input Rỗng do Trùng ID (Duplicate ID)
-   **Triệu chứng:** `getElementById` trả về rỗng dù user đã điền.
-   **Nguyên nhân:** Copy paste làm trùng ID. JS lấy nhầm element đầu tiên (thường là rỗng/ẩn).
-   **Giải pháp:**
    -   Đổi tên ID mới hoàn toàn (`settingDriveFolder_v3`).
    -   Dùng tool check duplicate.

### 🔴 Lỗi 11: "Everything up-to-date" vờ (Git Reporting Fail)
-   **Triệu chứng:** Báo thành công, SHA mới, nhưng code trên Git vẫn cũ.
-   **Nguyên nhân:** Agent lấy SHA local để báo cáo TRƯỚC khi `git push` hoàn tất (hoặc push lỗi).
-   **Giải pháp:**
    -   Chờ `git push` xong hẳn.
    -   Verify không có lỗi `error` trong output.

### 🔴 Lỗi 12: Không biết code mới đã chạy chưa?
-   **Giải pháp:**
    -   Thêm Alert Popup xác nhận phiên bản Javascript.

### 🔴 Lỗi 13: Drive/Mail Permission (Deployment Owner)
-   **Triệu chứng:** Lỗi `Exception: ... không đủ quyền DriveApp hoặc MailApp` dù `appsscript.json` đã có scope.
-   **Nguyên nhân:** Script chạy dưới quyền người deploy (`executeAs: USER_DEPLOYING`) nhưng người deploy chưa cấp quyền Write cho scope mới.
-   **Giải pháp:**
    -   Vào Script Editor (`code.gs`).
    -   Tạo/Chạy hàm `forceAuth` (hàm này KHÔNG được có `try-catch` để ép GAS hiện lỗi cấp quyền).
    -   Bấm Run -> "Review Permissions" -> "Allow" khi hiện popup.
