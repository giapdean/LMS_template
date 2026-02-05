# HƯỚNG DẪN THÊM CHỨC NĂNG REFRESH KHÓA HỌC

## ✅ Đã hoàn thành:
- ✅ Thêm nút "🔄 Refresh" vào mỗi card khóa học (chỉ hiện với Teacher)
- ✅ Thêm CSS styling cho nút refresh (màu xanh lá)
- ✅ Thêm hàm `refreshCourseConfirm()` trong LMS.html

## 📝 CẦN LÀM TIẾP:

### Bước 1: Mở Google Apps Script
1. Mở Google Sheets chứa dữ liệu LMS
2. Chọn **Extensions → Apps Script**

### Bước 2: Thêm Action "refreshCourse" vào hàm doPost()

Tìm hàm `doPost(e)` trong Apps Script và thêm case mới:

```javascript
function doPost(e) {
  const action = e.parameter.action;
  
  // ... các case khác ...
  
  if (action === 'refreshCourse') {
    return refreshCourse(e);
  }
  
  // ... các case khác ...
}
```

### Bước 3: Thêm hàm refreshCourse()

Thêm hàm này vào Apps Script (đặt ở cuối file hoặc gần các hàm khóa học khác):

```javascript
/**
 * Refresh khóa học từ folder Drive
 * Quét lại toàn bộ folder và cập nhật bài học mới
 */
function refreshCourse(e) {
  try {
    const courseName = e.parameter.courseName;
    
    if (!courseName) {
      return jsonResponse({ success: false, message: 'Thiếu tên khóa học!' });
    }
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Courses');
    const data = sheet.getDataRange().getValues();
    
    // Tìm khóa học
    let courseRow = -1;
    let folderUrl = '';
    let courseDesc = '';
    let thumbnail = '';
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === courseName) {
        courseRow = i;
        courseDesc = data[i][1] || '';
        thumbnail = data[i][2] || '';
        folderUrl = data[i][3] || '';
        break;
      }
    }
    
    if (courseRow === -1) {
      return jsonResponse({ success: false, message: 'Không tìm thấy khóa học!' });
    }
    
    if (!folderUrl) {
      return jsonResponse({ 
        success: false, 
        message: 'Khóa học này không có folder Drive liên kết!\n\nChỉ có thể refresh khóa học được tạo bằng "Thêm Nhanh".' 
      });
    }
    
    // Quét lại folder Drive
    const folderId = extractFolderId(folderUrl);
    if (!folderId) {
      return jsonResponse({ success: false, message: 'Link folder Drive không hợp lệ!' });
    }
    
    let folder;
    try {
      folder = DriveApp.getFolderById(folderId);
    } catch (err) {
      return jsonResponse({ 
        success: false, 
        message: 'Không thể truy cập folder Drive! Kiểm tra quyền Share.' 
      });
    }
    
    const folderName = folder.getName();
    const lessons = [];
    
    // Quét các subfolder (mỗi subfolder = 1 bài học)
    const subFolders = folder.getFolders();
    let lessonIndex = 0;
    
    while (subFolders.hasNext()) {
      const subFolder = subFolders.next();
      const lessonName = subFolder.getName();
      lessonIndex++;
      
      let videoUrl = '';
      let materialUrl = '';
      
      // Tìm video trong subfolder
      const files = subFolder.getFiles();
      while (files.hasNext()) {
        const file = files.next();
        const fileName = file.getName().toLowerCase();
        const mimeType = file.getMimeType();
        
        // Tìm file video
        if (!videoUrl && (mimeType.indexOf('video') > -1 || 
            fileName.endsWith('.mp4') || fileName.endsWith('.avi') || 
            fileName.endsWith('.mkv') || fileName.endsWith('.mov'))) {
          videoUrl = 'https://drive.google.com/file/d/' + file.getId() + '/preview';
        }
        
        // Tìm file tài liệu (PDF, DOC, etc)
        if (!materialUrl && (mimeType.indexOf('pdf') > -1 || 
            mimeType.indexOf('document') > -1 || 
            mimeType.indexOf('presentation') > -1 ||
            fileName.endsWith('.pdf') || fileName.endsWith('.doc') || 
            fileName.endsWith('.docx') || fileName.endsWith('.ppt') || 
            fileName.endsWith('.pptx'))) {
          materialUrl = 'https://drive.google.com/file/d/' + file.getId() + '/view';
        }
      }
      
      lessons.push({
        name: lessonName,
        video: videoUrl,
        material: materialUrl
      });
    }
    
    if (lessons.length === 0) {
      return jsonResponse({ 
        success: false, 
        message: 'Không tìm thấy bài học nào trong folder Drive!' 
      });
    }
    
    // Cập nhật lại khóa học với dữ liệu mới từ Drive
    const lessonSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Lessons');
    const lessonData = lessonSheet.getDataRange().getValues();
    
    // Xóa tất cả bài học cũ của khóa học này
    for (let i = lessonData.length - 1; i >= 1; i--) {
      if (lessonData[i][0] === courseName) {
        lessonSheet.deleteRow(i + 1);
      }
    }
    
    // Thêm các bài học mới
    lessons.forEach((lesson, index) => {
      lessonSheet.appendRow([
        courseName,
        index + 1,
        lesson.name,
        lesson.video,
        lesson.material
      ]);
    });
    
    return jsonResponse({
      success: true,
      message: 'Đã refresh khóa học thành công!',
      details: {
        courseName: courseName,
        lessonsCount: lessons.length
      }
    });
    
  } catch (error) {
    Logger.log('Refresh error: ' + error);
    return jsonResponse({ success: false, message: error.toString() });
  }
}

/**
 * Hàm hỗ trợ: Trích xuất folder ID từ URL
 */
function extractFolderId(url) {
  const match = url.match(/[-\w]{25,}/);
  return match ? match[0] : null;
}

/**
 * Hàm hỗ trợ: Trả về JSON response
 */
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### Bước 4: Save & Deploy
1. **Save** (Ctrl+S hoặc Click nút Save)
2. **Deploy** lại Apps Script (nếu cần):
   - Click **Deploy → Manage deployments**
   - Click icon ⚙️ bên cạnh deployment hiện tại
   - Chọn **New version**
   - Click **Deploy**

## 🎯 Cách sử dụng:

### Đối với Teacher:
1. Mở trang LMS
2. Hover vào card khóa học
3. Sẽ thấy 3 nút:
   - **🔄** = Refresh (quét lại Drive)
   - **✏️** = Edit (chỉnh sửa)
   - **🗑️** = Delete (xóa)
4. Click nút **🔄** để refresh khóa học
5. Xác nhận trong popup
6. Hệ thống sẽ:
   - Quét lại folder Drive
   - Tìm các subfolder mới (= bài học mới)
   - Tìm video và tài liệu trong mỗi subfolder
   - Cập nhật vào Sheet
   - Reload trang chủ

### ⚠️ Lưu ý quan trọng:

1. **Chỉ refresh được khóa học được tạo bằng "Thêm Nhanh"**
   - Khóa học thêm thủ công không có folder Drive liên kết
   
2. **Cấu trúc folder phải đúng:**
   ```
   Khóa Học A/
   ├── Bài 1: Giới thiệu/
   │   ├── video.mp4
   │   └── slide.pdf
   ├── Bài 2: Nội dung/
   │   ├── lesson.mp4
   │   └── material.pdf
   ```

3. **Quyền truy cập:**
   - Folder Drive phải được share "Anyone with the link can view"
   - Apps Script phải có quyền truy cập Drive

4. **Dữ liệu cũ:**
   - Các bài học cũ sẽ bị XÓA
   - Thay thế bằng dữ liệu mới từ Drive
   - Tên khóa học, mô tả, thumbnail vẫn giữ nguyên

## 🐛 Xử lý lỗi:

### Nếu gặp lỗi "Không thể truy cập folder":
- Kiểm tra folder Drive đã được share chưa
- Kiểm tra link folder Drive có đúng không

### Nếu không tìm thấy bài học:
- Kiểm tra cấu trúc folder (phải có subfolder)
- Mỗi subfolder phải chứa ít nhất 1 file video hoặc tài liệu

### Nếu nút Refresh không hiện:
- Chỉ Teacher mới thấy nút này
- Phải hover vào card khóa học
- Kiểm tra quyền Teacher trong Sheet "Teachers"

## 📊 Cấu trúc Sheet cần có:

### Sheet "Courses":
| CourseName | CourseDesc | Thumbnail | FolderUrl |
|------------|------------|-----------|-----------|
| Khóa A     | Mô tả      | thumb.jpg | https://... |

### Sheet "Lessons":
| CourseName | LessonIndex | LessonName | VideoUrl | MaterialUrl |
|------------|-------------|------------|----------|-------------|
| Khóa A     | 1           | Bài 1      | video... | material... |

---

**🎉 Hoàn thành!** Giờ bạn có thể thêm video/bài học vào Drive và chỉ cần nhấn nút Refresh để cập nhật!
