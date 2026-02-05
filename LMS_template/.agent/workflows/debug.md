---
description: Quy trình Debug và Xử lý Lỗi (BẮT BUỘC khi gặp bug)
---

# Quy trình Debug & Troubleshooting

Quy trình này áp dụng khi gặp bất kỳ lỗi nào (UI không hiện, Logic sai, Data thiếu...).

## 1. Phân loại & Tra cứu (Knowledge Check)
Trước khi nhảy vào code, hãy tự hỏi: **"Lỗi này có nằm trong Knowledge Base / Lịch sử không?"**

1.  **Check Console:** Có lỗi đỏ (Error) hay vàng (Warn) không?
2.  **Check Network:** API có trả về success: true không?
3.  **Check DOM:** Element có sinh ra không hay bị ẩn?
4.  **So sánh:**
    -   So sánh với Tab/Feature tương tự đang chạy đúng (Ví dụ: Lessons Tab chạy đúng vs Students Tab lỗi).
    -   So sánh code cũ vs code mới.

## 2. Phân tích Nguyên nhân (Deep Dive)
Nếu lỗi mới, hãy phân tích theo mô hình **"Yếu tố cấu thành"**:

### Yếu tố 1: Dữ liệu (Input)
-   Dữ liệu từ API có đúng format không? (Date string, Number, Null/Undefined?)
-   *Action:* Log ngay đầu hàm nhận dữ liệu.
    ```javascript
    console.log('🔍 [Feature] Input:', data);
    ```

### Yếu tố 2: Logic Xử lý (Process)
-   Hàm có tính toán sai không?
-   Biến có bị override không?
-   Có dùng `Math.random()` hay fake data không?
-   *Action:* Log các bước trung gian.

### Yếu tố 3: Hiển thị (Output/UI)
-   **DOM:** HTML có được inject vào trang không? (Inspect Element)
-   **CSS Priority:** Class nào đang active? Có bị `display: none` override không?
-   **Visibility:** Có phải chữ đen trên nền đen không? (Contrast issue)
-   **Timing:** CSS có load TRƯỚC khi HTML được render không?

## 3. Chiến lược Debug (Execution)

### Chiến thuật "Cô lập" (Isolate)
-   Tạm thời disable các CSS/JS phức tạp.
-   Hardcode dữ liệu để test UI.
-   Thêm background màu tương phản (đỏ/vàng) để check vùng hiển thị.
    ```html
    <!-- Ví dụ test hiển thị -->
    <div style="background: red; width: 100px; height: 100px;">TEST</div>
    ```

### Chiến thuật "So sánh" (Compare)
-   Copy cấu trúc từ phần đang chạy đúng -> Paste sang phần lỗi.
-   Nếu chạy được -> Lỗi do cấu trúc cũ.
-   Nếu vẫn lỗi -> Lỗi do môi trường/CSS chung.

## 4. Tổng hợp Lỗi đã gặp (Case Studies)

### 🔴 Lỗi 1: Chart không hiện dữ liệu / Dữ liệu sai
-   **Nguyên nhân:**
    1.  Parse ngày tháng sai (`new Date("dd/mm/yyyy")` không chạy trên Safari/Chrome engine cũ).
    2.  Dùng `Math.random()` để fake data lúc dev nhưng quên xóa.
-   **Giải pháp:**
    -   Dùng Timestamp cho mọi tính toán ngày tháng.
    -   Viết hàm `parseDateSafe` hoặc convert tại Backend/Sheet.
    -   Luôn kiểm tra data thật `report.lessonAnalytics` trước khi render.

### 🔴 Lỗi 2: Tab/Modal tối đen (Black Screen)
-   **Nguyên nhân:**
    1.  **Logic:** Biến `debugStyle` chứa `display:none` bị paste nhầm vào HTML.
    2.  **CSS:** Dùng Inline Style `style="display:none"` nhưng logic JS không clear style này đi mà chỉ toggle class.
-   **Giải pháp:**
    -   **Ưu tiên Class over Inline:** Dùng `.active` để control hiển thị.
    -   **Clean Inline:** Dùng `removeAttribute('style')` khi switch tab để xóa mọi style ẩn hiện cứng.
    -   **Backup:** Thêm `!important` trong CSS hoặc `style.display='block'` trong JS nếu cần thiết.

### 🔴 Lỗi 3: Có Content trong DOM nhưng không nhìn thấy
-   **Nguyên nhân:**
    1.  **Màu sắc:** Chữ màu mặc định (đen/xám tối) hiển thị trên nền Modal màu tối -> Tàng hình.
    2.  **CSS Inject Order:** CSS `.report-table` được define trong JS `innerHTML` CÙNG LÚC với content -> Đôi khi browser không apply kịp hoặc scope sai.
-   **Giải pháp:**
    -   Chuyển CSS tĩnh ra Global `<head>`.
    -   Luôn set `color: white` hoặc màu sáng rõ ràng cho text trên nền tối.

### 🔴 Lỗi 4: Code "Kỳ kỳ" / Khó debug
-   **Nguyên nhân:** Nhồi nhét logic complex (`map`, `if/else`, `calculation`) vào trong Template String `${...}`.
-   **Giải pháp:**
    -   Tách logic ra hàm riêng (Helper Function).
    -   Template String chỉ nên chứa biến đơn giản hoặc gọi hàm render.

### 🔴 Lỗi 5: Deploy xong không thấy thay đổi (Caching)
-   **Triệu chứng:** Đã push code lên GitHub/GAS nhưng reload trang vẫn thấy code cũ.
-   **Nguyên nhân:** Google Apps Script Web App có cơ chế cache mạnh. Nếu dùng `Test Deployment`, nó luôn mới. Nhưng với `Exec Deployment`, phải tạo version mới.
-   **Giải pháp:**
    -   Luôn chạy `clasp deploy` (tự động tạo version mới).
    -   Người dùng phải cập nhật **Deployment ID** mới vào biến môi trường nếu cần thiết (dù `clasp` thường handle việc này, nhưng đôi khi URL thay đổi).
    -   Clear cache trình duyệt hoặc dùng Incognito mode.

### 🔴 Lỗi 6: Permissions / Access Denied
-   **Triệu chứng:** User đăng nhập được nhưng không thấy khóa học, hoặc loading mãi mãi.
-   **Nguyên nhân:**
    1.  **Dữ liệu Sheet:** Email trong Sheet có khoảng trắng thừa hoặc khác hoa thường (`User@gmail.com` vs `user@gmail.com`).
    2.  **Logic:** Hàm `checkPermission` so sánh chuỗi không chuẩn hóa.
-   **Giải pháp:**
    -   Luôn `trim().toLowerCase()` cả email input và email database trước khi so sánh.
    -   Check cột "Active" t.rong Sheet (nếu có logic soft-delete).

### 🔴 Lỗi 7: Date Parsing (Invalid Date) trên Safari/Mobile
-   **Triệu chứng:** Chart hiện trên Chrome PC nhưng lỗi trên iPhone/Safari (`NaN` hoặc không hiện).
-   **Nguyên nhân:** Constructor `new Date("2023-10-25 14:00:00")` (format SQL) không được hỗ trợ chuẩn trên mọi browser.
-   **Giải pháp:**
    -   Tự viết hàm parse thủ công `parseDateSafe` tách chuỗi `YYYY`, `MM`, `DD`...
    -   Sử dụng Timestamp (số miliseconds) để truyền tải dữ liệu thay vì chuỗi.

### 🔴 Lỗi 8: Icons/Components biến mất sau khi cập nhật nội dung
-   **Triệu chứng:** Icons (Lucide) không hiện sau khi switch tab hoặc search, dù HTML có thẻ `<i>` hoặc `<i data-lucide="...">`.
-   **Nguyên nhân:** Các thư viện DOM-scanning (như Lucide) chỉ chạy 1 lần lúc load trang. Khi inject HTML mới bằng JS (`innerHTML`), các element mới chưa được xử lý.
-   **Giải pháp:**
    -   Gọi hàm re-init (ví dụ: `lucide.createIcons()`) ngay sau dòng `innerHTML = ...`.

## 5. Chiến thuật Logging chuẩn (Best Practices)
Để debug nhanh, không log bừa bãi. Sử dụng format:
```javascript
console.log('🔍 [FeatureName] Action Description:', data);
```
-   **Prefix:** `[StudentsTab]`, `[Chart]`, `[API]` -> Dễ filter trong Console.
-   **Data:** Log object nguyên vẹn (đừng log `Object object`).
-   **Timing:** Log `Start` và `End` để đo hiệu năng nếu cần.

## 6. Kỹ thuật DevTools "Thần thánh" (Advanced)
Những chiêu giúp bắt lỗi khó mà `console.log` bó tay:

### ⚡ Break on Attribute Modification (Bắt thủ phạm thay đổi UI)
-   **Tình huống:** Element tự nhiên bị ẩn (`display: none`) hoặc đổi class mà không biết code JS nào làm.
-   **Cách dùng:** Inspect Element -> Chuột phải vào thẻ HTML cha -> **Break on** -> **attribute modifications**.
-   **Kết quả:** Trình duyệt sẽ **dừng ngay lập tức** (pause) tại dòng JS đang thay đổi thuộc tính đó.

### ⚡ Local Overrides (Sửa nóng không cần Deploy)
-   **Tình huống:** Muốn sửa CSS/JS phức tạp để test nhanh mà không muốn sửa code nguồn → deploy → reload (mất thời gian).
-   **Cách dùng:** Tab **Sources** -> **Overrides** -> Select folder -> Enable.
-   **Kết quả:** Sửa trực tiếp trên DevTools, Ctrl+S là lưu. Reload trang vẫn giữ nguyên thay đổi đó để test tiếp.

### ⚡ Network Throttling (Giả lập mạng chậm)
-   **Tình huống:** Test xem Skeleton Loading / Loading Spinner có hiện đúng không.
-   **Cách dùng:** Tab **Network** -> Chuyển "No throttling" sang **"Slow 3G"**.

## 7. Tư duy "Refactor để Debug" (Rubber Ducking)
Khi code quá rối và không tìm ra lỗi (như vụ "code kỳ kỳ" ở Tab Lessons):
1.  **Đừng cố fix trên đống bùi nhùi.**
2.  **Tách hàm (Extract Function):** Chia nhỏ logic ra.
3.  **Viết lại (Rewrite):** Đôi khi viết lại sạch sẽ hơn sẽ tự động lòi ra lỗi (hoặc lỗi tự biến mất do logic rõ ràng hơn).
4.  **Đặt tên biến rõ nghĩa:** Thay vì `a, b, x`, hãy dùng `isStudentActive, hasCompletedLesson`. Code sẽ tự kể chuyện cho bạn nghe lỗi ở đâu.
