// ==========================================
// CONSTANTS
// ==========================================
const SHEET_NAME = 'Courses';
const SHEET_USERS = 'Users';
const SHEET_PROGRESS = 'Progress';

// ==========================================
// 1. MAIN API HANDLER (ĐIỂM TIẾP NHẬN YÊU CẦU)
// ==========================================
// Hàm này là cổng vào duy nhất cho mọi request từ Frontend (LMS.html)
// Nó nhận request (POST), phân tích 'action' và gọi hàm xử lý tương ứng
function doPost(e) {
  let action = '';
  let data = {};
  
  try {
    // ✅ HỖ TRỢ CẢ FormData VÀ JSON
    if (e.postData && e.postData.type === 'application/json') {
      // Nếu gửi JSON
      const params = JSON.parse(e.postData.contents);
      action = params.action;
      data = params.data;
    } else {
      // Nếu gửi FormData
      action = e.parameter.action || '';
      data = e.parameter || {};
    }
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        message: "Invalid data" 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  let result;
  
  try {
    switch (action) {
      case 'loginUser': 
        result = loginUser(data.credential, data.password); 
        break;
      case 'registerUser': 
        result = registerUser(data); 
        break;
      case 'sendOTP':
        result = sendOTP(data.email);
        break;
      case 'verifyOTPAndReset':
        result = verifyOTPAndReset(data.email, data.otp, data.newPassword);
        break;
      case 'checkIsTeacher': 
        result = checkIsTeacher(data.email); 
        break;
      case 'getHomeData': 
        result = getHomeData(); 
        break;
      case 'getCourseData': 
        result = getCourseData(data.courseName); 
        break;
      case 'addCourse': 
        result = addCourse(data); 
        break;
      case 'updateCourse': 
        result = updateCourse(data.oldCourseName, data.courseData); 
        break;
      case 'deleteCourse': 
        result = deleteCourse(data.courseName); 
        break;
      case 'getCourseForEdit': 
        result = getCourseForEdit(data.courseName); 
        break;
      case 'quickAddCourseFromFolder': 
        result = quickAddCourseFromFolder(data.folderUrl, data.courseDesc); 
        break;
      case 'logSecurityWarning': 
        result = logSecurityWarning(data.email, data.type, data.details); 
        break;
      case 'refreshCourse':
        result = refreshCourse(data);
        break;
      case 'addStudentsToCourse':
        result = addStudentsToCourse(data.courseCode, data.emails);
        break;
      case 'getUserProfile':
        result = getUserProfile(data.email);
        break;
      case 'getHomeDataWithProfile':
        // API combo: Lấy cả profile + courses trong 1 request để tăng tốc
        result = getHomeDataWithProfile(data.email);
        break;
      // Progress Tracking APIs
      case 'saveProgress':
        result = saveProgress(data.email, data.courseCode, data.lessonIndex, data.videoTime, data.completed);
        break;
      case 'getProgress':
        result = getProgress(data.email, data.courseCode);
        break;
      case 'getUserProgressOverview':
        result = getUserProgressOverview(data.email);
        break;
      case 'search':
        result = searchContent(data.keyword);
        break;
      // --- ADMIN APIs ---
      case 'getAdminStats':
        result = getAdminStats(data.forceRefresh);
        break;
      case 'getAdminChartData':
        result = getAdminChartData();
        break;
      case 'getAllStudents':
        result = getAllStudents();
        break;
      case 'getStudentDetails':
        result = getStudentDetails(data.email);
        break;
      case 'updateStudentStatus':
        result = updateStudentStatus(data.email, data.status);
        break;
      case 'adminResetStudentPass':
        result = adminResetStudentPass(data.email);
        break;
      case 'updateUserProfile':
        result = updateUserProfile(data.email, data.name, data.phone, data.newPass, data.oldPass);
        break;
      case 'markCourseCompleted':
        result = markCourseCompleted(data.email, data.courseCode, data.courseName);
        break;
      case 'getCourseReport':
        result = getCourseReport(data.courseCode);
        break;
      default: 
        result = { success: false, message: "Unknown action: " + action };
    }
  } catch (error) {
    console.error('Action error:', error);
    result = { success: false, message: error.toString() };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// Hàm test để kích hoạt popup cấp quyền Email (Chạy hàm này trong Editor 1 lần)
function testEmail() {
  console.log('📧 Testing email permission...');
  MailApp.getRemainingDailyQuota(); // Chỉ để trigger quyền
  console.log('✅ Email permission OK!');
}

function doGet(e) {
  return ContentService
    .createTextOutput("✅ LMS API đang hoạt động!")
    .setMimeType(ContentService.MimeType.TEXT);
}

// ==========================================
// 2. CONFIG & CACHE (CẤU HÌNH VÀ BỘ NHỚ ĐỆM)
// ==========================================

const USERS_SHEET = 'Users';
const TEACHERS_SHEET = 'Teachers';
const PROGRESS_SHEET = 'Progress'; // Sheet mới để lưu tiến độ học tập
const CACHE_DURATION = 300; // Cache mặc định 5 phút

// ==========================================
// 2.1 PASSWORD HASHING (BẢO MẬT MẬT KHẨU)
// ==========================================

// Hash mật khẩu bằng SHA-256
function hashPassword(password) {
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  let hashStr = '';
  for (let i = 0; i < rawHash.length; i++) {
    let byte = rawHash[i];
    if (byte < 0) byte += 256;
    let hex = byte.toString(16);
    if (hex.length === 1) hex = '0' + hex;
    hashStr += hex;
  }
  return hashStr;
}

// Kiểm tra mật khẩu (so sánh hash)
function verifyPassword(inputPassword, storedHash) {
  // Nếu storedHash không phải là hash (64 ký tự hex), đây là password cũ chưa hash
  if (storedHash.length !== 64 || !/^[a-f0-9]+$/i.test(storedHash)) {
    // So sánh trực tiếp cho user cũ (plain text)
    return inputPassword === storedHash;
  }
  // So sánh hash cho user mới
  return hashPassword(inputPassword) === storedHash;
}


// Lấy dữ liệu từ cache (để giảm số lần đọc Sheet, tăng tốc độ)
function getCache(key) {
  try {
    const cache = CacheService.getScriptCache();
    const cached = cache.get(key);
    if (cached) {
      console.log('✅ Cache hit:', key);
      return JSON.parse(cached);
    }
  } catch (e) {
    console.error('Cache get error:', e);
  }
  return null;
}

// Lưu dữ liệu vào cache
function setCache(key, data, duration) {
  try {
    const cache = CacheService.getScriptCache();
    cache.put(key, JSON.stringify(data), duration || CACHE_DURATION);
    console.log('💾 Cache set:', key);
  } catch (e) {
    console.error('Cache set error:', e);
  }
}

// Xóa cache liên quan đến khóa học (dùng khi thêm/sửa/xóa khóa học)
function clearCourseCache() {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove('homeData'); // Xóa cache màn hình chính
    cache.remove('sheet_' + SHEET_NAME); // Xóa cache sheet Courses
    console.log('🗑️ Course cache cleared');
  } catch (e) {
    console.error('Cache clear error:', e);
  }
}

// Hàm lấy dữ liệu Sheet thông minh (có Cache)
// bypassCache = true: Bắt buộc đọc từ Sheet (dùng cho các thao tác thời gian thực)
function getSheetData(sheetName, bypassCache) {
  const cacheKey = 'sheet_' + sheetName;
  
  // Nếu không yêu cầu bypass, thử lấy từ cache trước
  if (!bypassCache) {
    const cached = getCache(cacheKey);
    if (cached) return cached;
  }
  
  const sh = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sh) {
    console.error('Sheet not found:', sheetName);
    return [];
  }
  
  const data = sh.getDataRange().getValues();
  
  // Lưu vào cache để dùng cho lần sau (trừ Sheet Courses thì mình quản lý riêng)
  if (sheetName !== SHEET_NAME) {
    setCache(cacheKey, data, 60);
  }
  
  return data;
}

// ==========================================
// 3. AUTHENTICATION (ĐĂNG KÝ & ĐĂNG NHẬP)
// ==========================================

// Hàm đăng ký user mới
function registerUser(userData) {
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName(USERS_SHEET);
    if (!sh) {
      return { success: false, message: 'Sheet Users không tồn tại!' };
    }
    
    const values = sh.getDataRange().getValues();
    
    const emailLower = userData.email.toLowerCase().trim();
    const phoneTrim = userData.phone.trim();
    
    // Kiểm tra xem email hoặc SĐT đã tồn tại chưa
    for (let i = 1; i < values.length; i++) {
      const email = String(values[i][0]).toLowerCase().trim();
      const phone = String(values[i][2]).trim();
      
      if (email === emailLower) {
        return { success: false, message: 'Email đã được sử dụng!' };
      }
      if (phone === phoneTrim) {
        return { success: false, message: 'Số điện thoại đã được sử dụng!' };
      }
    }
    
    const timestamp = new Date().toLocaleString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'});
    const lastRow = sh.getLastRow() + 1;
    
    // 🔒 Hash mật khẩu trước khi lưu (bảo mật)
    const hashedPassword = hashPassword(userData.password);
    
    // Ghi user mới vào dòng cuối với trạng thái mặc định Progress = 'No' (chưa duyệt)
    sh.getRange(lastRow, 1, 1, 6).setValues([[
      userData.email,
      userData.name,
      userData.phone,
      hashedPassword, // Lưu hash thay vì plain text
      'No',
      timestamp
    ]]);
    
    // Thêm dropdown 'Approve/No' ở cột Progress để admin dễ thao tác
    const progressCell = sh.getRange(lastRow, 5);
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Approve', 'No'], true)
      .setAllowInvalid(false)
      .build();
    progressCell.setDataValidation(rule);
    
    // Xóa cache để hệ thống nhận diện user mới ngay nếu cần
    CacheService.getScriptCache().remove('sheet_' + USERS_SHEET);
    
    return { 
      success: true, 
      message: 'Đăng ký thành công! Vui lòng đợi admin phê duyệt.' 
    };
    
  } catch (error) {
    console.error('Register error:', error);
    return { 
      success: false, 
      message: 'Lỗi hệ thống: ' + error.toString() 
    };
  }
}

// ==========================================
// 3.1 PASSWORD RESET WITH OTP (QUÊN MẬT KHẨU AN TOÀN)
// ==========================================

// Gửi OTP về email
function sendOTP(email) {
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName(USERS_SHEET);
    const values = sh.getDataRange().getValues();
    const emailLower = String(email).toLowerCase().trim();
    
    let userFound = false;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]).toLowerCase().trim() === emailLower) {
        userFound = true;
        break;
      }
    }
    
    if (!userFound) {
      return { success: false, message: 'Email không tồn tại trong hệ thống!' };
    }
    
    // Tạo OTP 6 số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Lưu OTP vào Cache (5 phút)
    const cache = CacheService.getScriptCache();
    cache.put('OTP_' + emailLower, otp, 300);
    
    // Gửi email
    MailApp.sendEmail({
      to: email,
      subject: '[LMS] Mã xác thực đổi mật khẩu',
      htmlBody: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #d93025;">Mã OTP Xác Thực</h2>
          <p>Bạn đang thực hiện đổi mật khẩu trên hệ thống LMS.</p>
          <p>Mã OTP của bạn là:</p>
          <div style="background: #e8f0fe; color: #1967d2; padding: 15px; font-size: 32px; font-weight: bold; letter-spacing: 5px; text-align: center; margin: 20px 0; border-radius: 8px;">
            ${otp}
          </div>
          <p>Mã này có hiệu lực trong 5 phút. Vui lòng không chia sẻ cho bất kỳ ai.</p>
        </div>
      `
    });
    
    return { success: true, message: 'Mã OTP đã được gửi về email!' };
    
  } catch (error) {
    console.error('Send OTP error:', error);
    return { success: false, message: 'Lỗi gửi mail: ' + error.toString() };
  }
}

// Xác thực OTP và đổi mật khẩu
function verifyOTPAndReset(email, otp, newPassword) {
  try {
    const emailLower = String(email).toLowerCase().trim();
    const otpInput = String(otp).trim();
    
    // Lấy OTP từ cache
    const cache = CacheService.getScriptCache();
    const cachedOTP = cache.get('OTP_' + emailLower);
    
    if (!cachedOTP) {
      return { success: false, message: 'Mã OTP đã hết hạn hoặc không tồn tại!' };
    }
    
    if (cachedOTP !== otpInput) {
      return { success: false, message: 'Mã OTP không chính xác!' };
    }
    
    // OTP đúng -> Tiến hành đổi pass
    const sh = SpreadsheetApp.getActive().getSheetByName(USERS_SHEET);
    const values = sh.getDataRange().getValues();
    
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]).toLowerCase().trim() === emailLower) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, message: 'Không tìm thấy user!' };
    }
    
    // Hash mật khẩu mới và lưu
    const hashedPassword = hashPassword(newPassword);
    sh.getRange(rowIndex, 4).setValue(hashedPassword);
    
    // Xóa OTP sau khi dùng xong
    cache.remove('OTP_' + emailLower);
    // Xóa cache sheet Users
    cache.remove('sheet_' + USERS_SHEET);
    
    return { success: true, message: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.' };
    
  } catch (error) {
    console.error('Verify OTP error:', error);
    return { success: false, message: 'Lỗi: ' + error.toString() };
  }
}

// Hàm đăng nhập
function loginUser(credential, password) {
  try {
    // Luôn lấy dữ liệu mới nhất (bypassCache=true) để đảm bảo không bị lỗi login cũ
    const values = getSheetData(USERS_SHEET, true); 
    
    if (values.length < 2) {
      return { 
        success: false, 
        message: 'Không có dữ liệu user! Vui lòng liên hệ admin.' 
      };
    }
    
    const credLower = String(credential).toLowerCase().trim();
    
    // Duyệt qua danh sách user để tìm credential (email hoặc phone)
    for (let i = 1; i < values.length; i++) {
      const email = String(values[i][0]).toLowerCase().trim();
      const phone = String(values[i][2]).trim();
      const pwd = String(values[i][3]);
      const progress = String(values[i][4]).trim();
      const allowedCourses = values[i][6] ? String(values[i][6]) : ''; // Cột G: Danh sách mã khóa học (K1, K2...)
      
      // Kiểm tra khớp email hoặc phone
      if (email === credLower || phone === credLower) {
        // 🔒 Kiểm tra mật khẩu (hỗ trợ cả hash mới và plain text cũ)
        if (!verifyPassword(password, pwd)) {
          return { 
            success: false, 
            message: 'Mật khẩu không đúng!' 
          };
        }
        
        // Kiểm tra xem admin đã duyệt chưa
        if (progress !== 'Approve') {
          return { 
            success: false, 
            message: 'Tài khoản chưa được kích hoạt. Vui lòng liên hệ admin!' 
          };
        }
        
        // Đăng nhập thành công -> Trả về thông tin user
        return { 
          success: true, 
          message: 'Đăng nhập thành công!',
          user: {
            email: values[i][0],
            name: values[i][1],
            phone: values[i][2],
            allowedCourses: allowedCourses
          }
        };
      }
    }
    
    return { 
      success: false, 
      message: 'Email/SĐT không tồn tại!' 
    };
    
  } catch (error) {
    console.error('Login error:', error);
    return { 
      success: false, 
      message: 'Lỗi hệ thống: ' + error.toString() 
    };
  }
}

// Thêm học viên vào khóa học bằng mã khóa học (K1, K2...)
function addStudentsToCourse(courseCode, emails) {
  try {
    console.log('🔍 addStudentsToCourse START');
    console.log('  - courseCode:', courseCode);
    console.log('  - emails:', emails);
    
    const sh = SpreadsheetApp.getActive().getSheetByName(USERS_SHEET);
    if (!sh) return { success: false, message: 'Sheet Users không tìm thấy!' };
    
    const values = sh.getDataRange().getValues();
    const targetEmails = emails.split(/[\n,;]+/).map(e => e.trim().toLowerCase()).filter(e => e);
    
    console.log('🔍 Target emails:', targetEmails);
    
    if (targetEmails.length === 0) {
      return { success: false, message: 'Danh sách email trống!' };
    }

    // Chuẩn hóa courseCode (uppercase)
    const codeToAdd = String(courseCode).trim().toUpperCase();
    console.log('🔍 Code to add (normalized):', codeToAdd);

    let count = 0;
    
    // Duyệt qua danh sách users để tìm email khớp
    for (let i = 1; i < values.length; i++) {
      const userEmail = String(values[i][0]).toLowerCase().trim();
      
      if (targetEmails.includes(userEmail)) {
        console.log('🔍 Found user:', userEmail, 'at row', i + 1);
        
        // Lấy danh sách mã hiện tại từ cột G (index 6)
        let currentCodesStr = values[i][6] ? String(values[i][6]) : '';
        let currentCodes = currentCodesStr ? currentCodesStr.split(',').map(c => c.trim().toUpperCase()) : [];
        
        console.log('🔍 Current codes:', currentCodes);
        
        // Chỉ thêm nếu chưa có mã này
        if (!currentCodes.includes(codeToAdd)) {
          currentCodes.push(codeToAdd);
          const newValue = currentCodes.join(', ');
          
          // Ghi vào cột G (cột thứ 7)
          sh.getRange(i + 1, 7).setValue(newValue);
          console.log('✅ Updated row', i + 1, 'with:', newValue);
          count++;
        } else {
          console.log('⏭️ User already has this code');
        }
      }
    }
    
    // Xóa cache để login mới nhận được quyền
    CacheService.getScriptCache().remove('sheet_' + USERS_SHEET);

    if (count === 0) {
        return { success: false, message: 'Không tìm thấy user nào trùng khớp hoặc tất cả đã có quyền!' };
    }

    console.log('✅ addStudentsToCourse END - Added', count, 'users');

    return {
      success: true,
      message: 'Đã thêm ' + count + ' học viên vào khóa học (Mã: ' + codeToAdd + ')!'
    };
    
  } catch (error) {
    console.error('❌ Add students error:', error);
    return { success: false, message: 'Lỗi: ' + error.toString() };
  }
}

// Kiểm tra user có phải Teacher/Admin không
function checkIsTeacher(email, bypassCache) {
  try {
    console.log('🔍 checkIsTeacher START - email:', email, 'bypassCache:', bypassCache);
    
    // Luôn bypass cache để đảm bảo dữ liệu mới nhất
    const values = getSheetData(TEACHERS_SHEET, true); // ALWAYS FORCE REFRESH
    
    console.log('🔍 Teachers sheet rows:', values.length);
    
    if (values.length < 2) {
      console.log('⚠️ Sheet Teachers trống hoặc chỉ có header');
      return false;
    }
    
    const emailLower = String(email).toLowerCase().trim();
    console.log('🔍 Checking email:', emailLower);
    
    // Log toàn bộ danh sách teacher
    console.log('🔍 All teachers in sheet:');
    for (let i = 1; i < values.length; i++) {
      const teacherEmail = String(values[i][0]).toLowerCase().trim();
      console.log('  - Row', i, ':', teacherEmail);
      
      if (teacherEmail === emailLower) {
        console.log('✅ MATCH FOUND! User IS a teacher');
        return true;
      }
    }
    
    console.log('❌ No match found. User is NOT a teacher');
    return false;
    
  } catch (error) {
    console.error('❌ checkIsTeacher ERROR:', error);
    return false;
  }
}

// Lấy danh sách tất cả khóa học cho Trang Chủ
function getHomeData() {
  try {
    console.log('🔴 getHomeData START - Fetching courses...');
    
    // Luôn bypass cache để lấy dữ liệu mới nhất
    const values = getSheetData(SHEET_NAME, true); 
    
    console.log('🔍 Courses sheet total rows:', values.length);
    
    if (values.length < 2) {
      console.log('⚠️ Sheet Courses trống hoặc chỉ có header');
      return []; // Trả về mảng rỗng
    }

    const courseMap = new Map();

    for (let i = 1; i < values.length; i++) {
      const courseName = values[i][0];
      const courseCode = values[i][7] || ''; // Cột H - Mã Khóa Học
      
      if (!courseName || String(courseName).trim() === '') {
        console.log('🔍 Row', i, '- Bỏ qua (tên trống)');
        continue;
      }
      
      const courseKey = String(courseName).trim();
      
      if (!courseMap.has(courseKey)) {
        console.log('🔍 Row', i, '- Course:', courseKey, 'Code:', courseCode);
        courseMap.set(courseKey, {
          courseName: courseKey,
          courseCode: String(courseCode).trim().toUpperCase(),
          thumbnailUrl: values[i][1] || '',
          courseDesc: values[i][3] || ''
        });
      }
    }
    
    const result = Array.from(courseMap.values());
    console.log('✅ getHomeData END - Total unique courses:', result.length);
    
    return result;
    
  } catch (error) {
    console.error('❌ getHomeData ERROR:', error);
    return [];
  }
}

// Lấy chi tiết bài học của 1 khóa học cụ thể
function getCourseData(courseName) {
  try {
    const values = getSheetData(SHEET_NAME, false); // Dùng cache ở đây đc vì sheet Courses ít thay đổi
    
    const lessons = [];
    let courseDesc = '';
    let courseCode = ''; // Thêm biến lưu CourseCode
    
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      // Tìm các dòng thuộc về courseName này
      if (String(row[0]).trim() !== courseName) continue;
      
      if (!courseDesc && row[3]) {
        courseDesc = String(row[3]);
      }
      
      // Lấy CourseCode từ cột H (index 7)
      if (!courseCode && row[7]) {
        courseCode = String(row[7]).toUpperCase().trim();
      }
      
      lessons.push({
        lessonName: row[2] || 'Bài ' + (lessons.length + 1),
        videoUrl: row[4] || '',
        materialUrl: row[5] || ''
      });
    }

    // Sort lại để đảm bảo thứ tự
    // (Lưu ý: Nếu tên bài học có số như "Bài 1", "Bài 2", "Bài 10" thì sort string thuần sẽ sai (1 -> 10 -> 2).
    // Nên tốt nhất là tin tưởng thứ tự trong Sheet nếu user đã sắp xếp đúng)
    
    // Format dữ liệu trả về cho Frontend, bao gồm link preview Drive
    const result = {
      courseName: courseName,
      courseCode: courseCode, // Trả về frontend
      courseDesc: courseDesc,
      lessons: lessons.map((r, idx) => ({
        index: idx + 1,
        lessonName: r.lessonName,
        videoEmbedUrl: toDrivePreviewUrl(r.videoUrl), // Convert link Drive sang link Embed
        materialUrl: r.materialUrl
      }))
    };
    
    return result;
    
  } catch (error) {
    console.error('getCourseData error:', error);
    return {
      courseName: courseName,
      courseDesc: '',
      lessons: []
    };
  }
}

// ========== ADD COURSE ==========

// ==========================================
// 5. COURSE MANAGEMENT (QUẢN LÝ KHÓA HỌC: THÊM/SỬA/XÓA)
// ==========================================

// Thêm khóa học mới thủ công (nhập tay các bài học)
function addCourse(courseData) {
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
    if (!sh) {
      return { success: false, message: 'Sheet Courses không tồn tại!' };
    }
    
    const courseName = courseData.courseName;
    const courseDesc = courseData.courseDesc;
    const thumbnail = courseData.thumbnail;
    const lessons = courseData.lessons || [];
    
    if (!courseName || lessons.length === 0) {
      return { 
        success: false, 
        message: 'Vui lòng điền đầy đủ tên khóa học và ít nhất 1 bài học!' 
      };
    }
    
    // Tự động sinh mã khóa học (K1, K2...) dựa vào số lớn nhất hiện có
    const courseCode = generateNextCourseCode(sh);
    
    // Tạo mảng dữ liệu để ghi vào Sheet
    const rows = lessons.map(lesson => [
      courseName,
      thumbnail,
      lesson.name,
      courseDesc,
      lesson.video,
      lesson.material,
      '', // Cột G - Folder Url (để trống vì thêm thủ công)
      courseCode // ✅ Cột H - Mã Khóa Học
    ]);
    
    const lastRow = sh.getLastRow() + 1;
    // Ghi dữ liệu vào sheet (8 cột)
    sh.getRange(lastRow, 1, rows.length, 8).setValues(rows); 
    
    // Xóa cache để user khác thấy khóa học mới ngay lập tức
    clearCourseCache();
    
    console.log('✅ Course added, cache cleared');
    
    return { 
      success: true, 
      message: 'Đã thêm khóa học "' + courseName + '" (Mã: ' + courseCode + ') với ' + lessons.length + ' bài học!',
      courseCode: courseCode
    };
    
  } catch (error) {
    console.error('Add course error:', error);
    return { 
      success: false, 
      message: 'Lỗi: ' + error.toString() 
    };
  }
}

// ========== EDIT & DELETE ==========

function deleteCourse(courseName) {
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
    if (!sh) {
      return { success: false, message: 'Sheet Courses không tồn tại!' };
    }
    
    const values = sh.getDataRange().getValues();
    
    let deletedCount = 0;
    
    // Xóa từ dưới lên để không bị lệch index
    for (let i = values.length - 1; i >= 1; i--) {
      if (values[i][0] === courseName) {
        sh.deleteRow(i + 1);
        deletedCount++;
      }
    }
    
    clearCourseCache();
    
    if (deletedCount > 0) {
      return { 
        success: true, 
        message: 'Đã xóa khóa học "' + courseName + '" (' + deletedCount + ' bài học)'
      };
    } else {
      return { 
        success: false, 
        message: 'Không tìm thấy khóa học để xóa' 
      };
    }
    
  } catch (error) {
    console.error('Delete course error:', error);
    return { 
      success: false, 
      message: 'Lỗi: ' + error.toString() 
    };
  }
}

function getCourseForEdit(courseName) {
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
    if (!sh) {
      return { success: false, message: 'Sheet Courses không tồn tại!' };
    }
    
    const values = sh.getDataRange().getValues();
    
    const lessons = [];
    let courseDesc = '';
    let thumbnail = '';
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === courseName) {
        thumbnail = values[i][1] || '';
        courseDesc = values[i][3] || '';
        
        lessons.push({
          name: values[i][2] || '',
          videoUrl: values[i][4] || '',
          materialUrl: values[i][5] || ''
        });
      }
    }
    
    if (lessons.length === 0) {
      return { 
        success: false, 
        message: 'Không tìm thấy khóa học' 
      };
    }
    
    return {
      success: true,
      data: {
        courseName: courseName,
        courseDesc: courseDesc,
        thumbnail: thumbnail,
        lessons: lessons
      }
    };
    
  } catch (error) {
    console.error('Get course for edit error:', error);
    return { 
      success: false, 
      message: 'Lỗi: ' + error.toString() 
    };
  }
}

function updateCourse(oldCourseName, courseData) {
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
    if (!sh) {
      return { success: false, message: 'Sheet Courses không tồn tại!' };
    }
    
    const values = sh.getDataRange().getValues();
    
    // Xóa các row cũ
    let existingFolderUrl = ''; // ✅ Giữ lại Folder Link cũ
    for (let i = values.length - 1; i >= 1; i--) {
      if (values[i][0] === oldCourseName) {
        if (!existingFolderUrl && values[i][6]) {
          existingFolderUrl = values[i][6];
        }
        sh.deleteRow(i + 1);
      }
    }
    
    const newCourseName = courseData.courseName;
    const courseDesc = courseData.courseDesc || '';
    const thumbnail = courseData.thumbnail || '';
    const lessons = courseData.lessons || [];
    
    const rows = lessons.map(lesson => [
      newCourseName,
      thumbnail,
      lesson.name,
      courseDesc,
      lesson.video,
      lesson.material,
      existingFolderUrl // ✅ Ghi lại Folder Link
    ]);
    
    const lastRow = sh.getLastRow() + 1;
    sh.getRange(lastRow, 1, rows.length, 7).setValues(rows);
    
    clearCourseCache();
    
    return { 
      success: true, 
      message: 'Đã cập nhật khóa học "' + newCourseName + '" thành công!' 
    };
    
  } catch (error) {
    console.error('Update course error:', error);
    return { 
      success: false, 
      message: 'Lỗi: ' + error.toString() 
    };
  }
}

// ========== QUICK ADD FROM FOLDER ==========

// ==========================================
// 6. QUICK ADD & AUTOMATION (TỰ ĐỘNG THÊM TỪ DRIVE)
// ==========================================

// Thêm khóa học nhanh từ một đường link Google Drive Folder
function quickAddCourseFromFolder(folderUrl, courseDesc) {
  try {
    const folderId = extractDriveFolderId(folderUrl);
    if (!folderId) {
      return { 
        success: false, 
        message: 'Link folder không hợp lệ!' 
      };
    }
    
    const folder = DriveApp.getFolderById(folderId);
    const courseName = folder.getName();
    
    // Scan toàn bộ folder để lấy video, thumbnail, tài liệu
    const courseData = scanCourseFolder(folder);
    
    if (courseData.lessons.length === 0) {
      return { 
        success: false, 
        message: 'Không tìm thấy bài học nào trong folder!' 
      };
    }
    
    const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
    if (!sh) {
      return { success: false, message: 'Sheet Courses không tồn tại!' };
    }
    
    // Tự động sinh mã khóa học
    const courseCode = generateNextCourseCode(sh);

    const rows = courseData.lessons.map(lesson => [
      courseName,
      courseData.thumbnail,
      lesson.name,
      courseDesc || '',
      lesson.video,
      lesson.material,
      folderUrl, // Cột G - Folder URL (lưu lại để tính năng Refresh hoạt động)
      courseCode // ✅ Cột H - Mã Khóa Học
    ]);
    
    const lastRow = sh.getLastRow() + 1;
    sh.getRange(lastRow, 1, rows.length, 8).setValues(rows);
    
    clearCourseCache();
    
    return { 
      success: true, 
      message: 'Đã thêm khóa học "' + courseName + '" (Mã: ' + courseCode + ') với ' + courseData.lessons.length + ' bài học!',
      courseCode: courseCode,
      details: {
        courseName: courseName,
        thumbnail: courseData.thumbnail ? 'Có' : 'Không',
        lessonsCount: courseData.lessons.length
      }
    };
    
  } catch (error) {
    console.error('Quick add error:', error);
    
    if (error.message.includes('not found')) {
      return { 
        success: false, 
        message: 'Không tìm thấy folder hoặc bạn chưa có quyền truy cập!' 
      };
    }
    
    return { 
      success: false, 
      message: 'Lỗi: ' + error.toString() 
    };
  }
}

function refreshCourse(data) {
  try {
    const courseName = data.courseName;
    if (!courseName) {
      return { success: false, message: 'Thiếu tên khóa học!' };
    }
    
    // 1. Tìm thông tin khóa học trong Sheet
    const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
    const values = sh.getDataRange().getValues();
    
    let folderUrl = '';
    let courseDesc = '';
    let thumbnail = '';
    
    let found = false;
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === courseName) {
        thumbnail = values[i][1] || '';
        courseDesc = values[i][3] || '';
        folderUrl = values[i][6] || ''; // ✅ Lấy Folder URL từ cột G
        found = true;
        break;
      }
    }
    
    if (!found) {
      return { success: false, message: 'Không tìm thấy khóa học trong hệ thống!' };
    }

    let folder;
    
    // Case 1: Có URL trong Sheet (Ưu tiên)
    if (folderUrl) {
      const folderId = extractDriveFolderId(folderUrl);
      if (folderId) {
        try {
          folder = DriveApp.getFolderById(folderId);
        } catch (e) {
          return { success: false, message: 'Link folder trong Sheet không hợp lệ hoặc bạn không có quyền truy cập!' };
        }
      }
    }
    
    // Case 2: Nếu chưa có URL, thử tìm theo tên (Fallback logic cũ)
    if (!folder) {
      const folders = DriveApp.getFoldersByName(courseName);
      if (folders.hasNext()) {
        folder = folders.next();
        folderUrl = folder.getUrl(); // Lấy URL để lưu lại sau này
      } else {
         return { 
          success: false, 
          message: 'Không tìm thấy Link Folder trong Sheet (cột G) và cũng không tìm thấy Folder Drive trùng tên khóa học!' 
        };
      }
    }
    
    // Quét lại dữ liệu mới
    const newData = scanCourseFolder(folder);
    
    if (newData.lessons.length === 0) {
      return { success: false, message: 'Folder Drive rỗng hoặc không đúng cấu trúc!' };
    }
    
    // Xóa dữ liệu cũ
    let deletedCount = 0;
    const currentValues = sh.getDataRange().getValues();
    for (let i = currentValues.length - 1; i >= 1; i--) {
      if (currentValues[i][0] === courseName) {
        sh.deleteRow(i + 1);
        deletedCount++;
      }
    }
    
    // Thêm dữ liệu mới
    const rows = newData.lessons.map(lesson => [
      courseName,
      newData.thumbnail || thumbnail,
      lesson.name,
      courseDesc,
      lesson.video,
      lesson.material,
      folderUrl // ✅ Ghi lại Folder URL vào cột G để lần sau Refresh tiếp
    ]);
    
    const lastRow = sh.getLastRow() + 1;
    sh.getRange(lastRow, 1, rows.length, 7).setValues(rows);
    
    clearCourseCache();
    
    return {
      success: true,
      message: 'Đã cập nhật dữ liệu từ Drive thành công!',
      details: {
        courseName: courseName,
        lessonsCount: newData.lessons.length
      }
    };
    
  } catch (error) {
    console.error('Refresh error:', error);
    return { success: false, message: 'Lỗi: ' + error.toString() };
  }
}

// ==========================================
// 7. DRIVE SCANNER (QUÉT FILE TỪ DRIVE)
// ==========================================

// Logic quét folder từ ngoài vào trong:
// 1. Tìm file hình ảnh có tên chứa 'thumbnail' để làm ảnh bìa
// 2. Quét các subfolder, mỗi subfolder coi là 1 bài học
function scanCourseFolder(folder) {
  const result = {
    thumbnail: '',
    lessons: []
  };
  
  // Tìm thumbnail trong folder chính
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    const fileName = file.getName().toLowerCase();
    
    if (fileName.includes('thumbnail') || fileName.includes('thumb')) {
      result.thumbnail = file.getUrl();
      break;
    }
  }
  
  // Quét các subfolder (mỗi subfolder là 1 bài học)
  const subfolders = folder.getFolders();
  const lessonsList = [];
  
  while (subfolders.hasNext()) {
    const subfolder = subfolders.next();
    const lessonData = scanLessonFolder(subfolder);
    lessonsList.push(lessonData);
  }
  
  // Sắp xếp bài học theo tên (A-Z) để đúng thứ tự hiển thị
  lessonsList.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  
  result.lessons = lessonsList;
  return result;
}

// Logic quét 1 bài học (subfolder):
// - Tìm video (ưu tiên file .mp4, video...)
// - Các file còn lại (PDF, Doc, Zip...) coi là tài liệu đính kèm
function scanLessonFolder(folder) {
  const lessonData = {
    name: folder.getName(),
    video: '',
    materials: []
  };
  
  const files = folder.getFiles();
  
  while (files.hasNext()) {
    const file = files.next();
    const fileName = file.getName();
    const fileNameLower = fileName.toLowerCase();
    const fileUrl = file.getUrl();
    const mimeType = file.getMimeType();
    
    // Nếu là video
    if (isVideoFile(fileNameLower, mimeType)) {
      if (!lessonData.video) {
        lessonData.video = fileUrl;
      }
    }
    // Nếu không phải video và không phải thumbnail -> Là tài liệu hết
    else if (!fileNameLower.includes('thumbnail') && !fileNameLower.startsWith('thumb')) {
       // Lưu format: Tên File|URL (để tách ra khi hiển thị)
       lessonData.materials.push(fileName + '|' + fileUrl);
    }
  }
  
  return {
    name: lessonData.name,
    video: lessonData.video,
    material: lessonData.materials.join('\n') // Gom nhiều link lại bằng xuống dòng
  };
}

// Helper: Kiểm tra xém file có phải video không
function isVideoFile(fileName, mimeType) {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.flv', '.wmv', '.webm'];
  const videoMimes = ['video/', 'application/vnd.google-apps.video'];
  
  for (let ext of videoExtensions) {
    if (fileName.endsWith(ext)) return true;
  }
  
  for (let mime of videoMimes) {
    if (mimeType.includes(mime)) return true;
  }
  
  if (fileName.includes('video') || fileName.includes('lesson') || fileName.includes('bai hoc')) {
    return true;
  }
  
  return false;
}

// Hàm isDocumentFile đã bị xóa vì logic mới lấy tất cả file còn lại làm tài liệu

// ==========================================
// 8. HELPERS (CÁC HÀM TIỆN ÍCH)
// ==========================================

// Tách ID file/folder từ link Drive
function extractDriveFolderId(url) {
  if (!url) return '';
  
  let match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  
  // Nếu user paste trực tiếp folder ID
  if (url.length > 20 && !url.includes('/')) {
    return url;
  }
  
  return '';
}

function toDrivePreviewUrl(url) {
  const id = extractDriveFileId(url);
  return id ? 'https://drive.google.com/file/d/' + id + '/preview' : '';
}

function extractDriveFileId(url) {
  if (!url) return '';
  const m = String(url).match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : '';
}

// Tạo mã khóa học mới (K1, K2, K3...)
// Tự động tìm số lớn nhất trong cột H và cộng thêm 1
// Giúp admin không phải nhớ mã khóa học tiếp theo là gì
function generateNextCourseCode(sheet) {
  try {
    const values = sheet.getDataRange().getValues();
    let maxNum = 0;
    
    // Duyệt qua cột H (index 7) để tìm số lớn nhất
    for (let i = 1; i < values.length; i++) {
      const code = String(values[i][7] || '').trim(); // ✅ Index 7
      if (code.match(/^K(\d+)$/)) {
        const num = parseInt(code.substring(1));
        if (num > maxNum) maxNum = num;
      }
    }
    
    return 'K' + (maxNum + 1);
  } catch (error) {
    console.error('Generate code error:', error);
    return 'K1'; // Fallback
  }
}

function clearAllCache() {
  try {
    CacheService.getScriptCache().removeAll([
      'homeData', 
      'sheet_' + SHEET_NAME, 
      'sheet_' + USERS_SHEET
    ]);
    return { success: true, message: 'Cache cleared!' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// ========== SECURITY LOGGING ==========

function logSecurityWarning(userEmail, warningType, details) {
  try {
    const ss = SpreadsheetApp.getActive();
    let warningSh = ss.getSheetByName('Warning');
    
    // Tạo sheet Warning nếu chưa có
    if (!warningSh) {
      warningSh = ss.insertSheet('Warning');
      warningSh.appendRow([
        'Timestamp',
        'Email',
        'Warning Type',
        'Details',
        'Course',
        'Lesson',
        'Browser',
        'Action Taken'
      ]);
      
      const headerRange = warningSh.getRange('A1:H1');
      headerRange.setBackground('#ff0055');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
    }
    
    const timestamp = new Date().toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    warningSh.appendRow([
      timestamp,
      userEmail,
      warningType,
      details.description || '',
      details.course || '',
      details.lesson || '',
      details.browser || 'Unknown',
      'LOGGED'
    ]);
    
    warningSh.autoResizeColumns(1, 8);
    
    return { 
      success: true, 
      message: 'Warning logged successfully' 
    };
    
  } catch (error) {
    console.error('Log warning error:', error);
    return { 
      success: false, 
      message: error.toString() 
    };
  }
}

// ========== TEST FUNCTIONS (Optional) ==========

function testAPI() {
  Logger.log('Testing login...');
  const loginResult = loginUser('test@example.com', 'password');
  Logger.log(JSON.stringify(loginResult));
  
  Logger.log('Testing getHomeData...');
  const homeResult = getHomeData();
  Logger.log(JSON.stringify(homeResult));
}

// ==========================================
// 9. USER PROFILE & UTILS (LẤY THÔNG TIN USER)
// ==========================================
function getUserProfile(email) {
  try {
    const userResult = getUserByEmail(email);
    if (!userResult.success) return { success: false, message: 'User not found' };
    
    // Force update teacher status
    const isTeacher = checkIsTeacher(email, true);
    
    return {
      success: true,
      user: userResult.user,
      isTeacher: isTeacher
    };
  } catch (error) {
    console.error('Get profile error:', error);
    return { success: false, message: error.toString() };
  }
}

function getUserByEmail(email) {
   const values = getSheetData(USERS_SHEET, true); // Force refresh
   const emailLower = String(email).toLowerCase().trim();
   
   console.log('🔍 getUserByEmail - Total rows:', values.length);
   
   for (let i = 1; i < values.length; i++) {
     const rowEmail = String(values[i][0]).toLowerCase().trim();
     if (rowEmail === emailLower) {
        console.log('🔍 Found user row:', values[i]);
        console.log('🔍 Column G (index 6) value:', values[i][6]);
        
        return {
          success: true,
          user: {
            email: values[i][0],
            name: values[i][1],
            phone: values[i][2],
            allowedCourses: values[i][6] ? String(values[i][6]) : ''
          }
        };
     }
   }
   return { success: false };
}

// ==========================================
// 10. OPTIMIZED API - GỘP NHIỀU REQUEST
// ==========================================

// API combo: Lấy cả profile + courses trong 1 request để tăng tốc
function getHomeDataWithProfile(email) {
  try {
    console.log('🚀 getHomeDataWithProfile START - email:', email);
    
    // 1. Lấy thông tin user
    const userResult = getUserByEmail(email);
    const isTeacher = checkIsTeacher(email, false); // Dùng cache cho teacher check
    
    // 2. Lấy danh sách khóa học (với tổng số bài học mỗi khóa)
    const coursesData = getCoursesWithLessonCount();
    
    // 3. Lấy tiến độ của user từ Progress sheet
    const progressSh = SpreadsheetApp.getActive().getSheetByName(PROGRESS_SHEET);
    const userProgress = {}; // { courseCode: completedCount }
    
    if (progressSh) {
      const progressValues = progressSh.getDataRange().getValues();
      const emailLower = String(email).toLowerCase().trim();
      
      for (let i = 1; i < progressValues.length; i++) {
        const rowEmail = String(progressValues[i][0]).toLowerCase().trim();
        if (rowEmail !== emailLower) continue;
        
        const courseCode = String(progressValues[i][1]).toUpperCase().trim();
        const completedAt = progressValues[i][4];
        
        // Check if lesson is completed
        const isCompleted = completedAt && 
                           String(completedAt).trim() !== '' && 
                           String(completedAt).trim() !== '0';
        
        if (isCompleted) {
          if (!userProgress[courseCode]) userProgress[courseCode] = 0;
          userProgress[courseCode]++;
        }
      }
    }
    
    // 4. Tính progress % cho mỗi khóa học
    const coursesWithProgress = coursesData.map(course => {
      const code = course.courseCode;
      const totalLessons = course.totalLessons || 1;
      const completed = userProgress[code] || 0;
      const progress = Math.round((completed / totalLessons) * 100);
      
      return {
        ...course,
        progress: Math.min(progress, 100) // Cap at 100%
      };
    });
    
    console.log('✅ getHomeDataWithProfile END');
    
    return {
      success: true,
      profile: {
        user: userResult.success ? userResult.user : null,
        isTeacher: isTeacher
      },
      courses: coursesWithProgress
    };
    
  } catch (error) {
    console.error('❌ getHomeDataWithProfile ERROR:', error);
    return {
      success: false,
      message: error.toString()
    };
  }
}

// Helper: Get courses with lesson count
function getCoursesWithLessonCount() {
  const coursesValues = getSheetData(SHEET_NAME, true);
  
  if (coursesValues.length < 2) return [];
  
  const courseMap = new Map();
  
  for (let i = 1; i < coursesValues.length; i++) {
    const courseName = String(coursesValues[i][0]).trim();
    if (!courseName) continue;
    
    const courseCode = String(coursesValues[i][7] || '').trim().toUpperCase();
    
    if (!courseMap.has(courseName)) {
      courseMap.set(courseName, {
        courseName: courseName,
        courseCode: courseCode,
        thumbnailUrl: coursesValues[i][1] || '',
        courseDesc: coursesValues[i][3] || '',
        totalLessons: 1
      });
    } else {
      // Increment lesson count
      courseMap.get(courseName).totalLessons++;
    }
  }
  
  return Array.from(courseMap.values());
}

// ==========================================
// 11. PROGRESS TRACKING (TIẾN ĐỘ HỌC TẬP)
// ==========================================

// Lưu tiến độ học tập của user
function saveProgress(email, courseCode, lessonIndex, videoTime, completed) {
  try {
    console.log('📊 saveProgress:', email, courseCode, lessonIndex, videoTime, completed);
    
    let sh = SpreadsheetApp.getActive().getSheetByName(PROGRESS_SHEET);
    
    // Tự động tạo Sheet Progress nếu chưa có
    if (!sh) {
      console.log('📊 Creating Progress sheet...');
      sh = SpreadsheetApp.getActive().insertSheet(PROGRESS_SHEET);
      sh.appendRow(['Email', 'CourseCode', 'LessonIndex', 'VideoTime', 'CompletedAt', 'Score', 'LastUpdate']);
      sh.getRange(1, 1, 1, 7).setFontWeight('bold');
    }
    
    const emailLower = String(email).toLowerCase().trim();
    const codeUpper = String(courseCode).toUpperCase().trim();
    const lessonNum = parseInt(lessonIndex) || 0;
    const videoSec = parseInt(videoTime) || 0;
    
    // Ép kiểu completed chặt chẽ: Chỉ đúng khi là true (boolean) hoặc "true" (string)
    const isCompleted = (completed === true || String(completed).toLowerCase() === 'true');

    const values = sh.getDataRange().getValues();
    
    const currentTime = new Date().toLocaleString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'});

    // Tìm xem đã có record chưa
    for (let i = 1; i < values.length; i++) {
      const rowEmail = String(values[i][0]).toLowerCase().trim();
      const rowCode = String(values[i][1]).toUpperCase().trim();
      const rowLesson = parseInt(values[i][2]) || 0;
      
      if (rowEmail === emailLower && rowCode === codeUpper && rowLesson === lessonNum) {
        // Update existing record
        sh.getRange(i + 1, 4).setValue(videoSec); // VideoTime
        sh.getRange(i + 1, 7).setValue(currentTime); // LastUpdate (Cột G)
        
        if (isCompleted) {
          sh.getRange(i + 1, 5).setValue(currentTime); // CompletedAt (Cột E)
        }
        console.log('📊 Updated existing progress (LastUpdate)');
        return { success: true, message: 'Tiến độ đã cập nhật!' };
      }
    }
    
    // Thêm mới
    // Nếu chưa hoàn thành -> completedAt để trống
    const completedAtStr = isCompleted ? currentTime : '';
    
    // Append row: Email, Code, Lesson, VideoTime, CompletedAt, Score, LastUpdate
    sh.appendRow([emailLower, codeUpper, lessonNum, videoSec, completedAtStr, '', currentTime]);
    console.log('📊 Created new progress record. Completed:', isCompleted);
    
    return { success: true, message: 'Đã lưu tiến độ!' };
    
  } catch (error) {
    console.error('❌ saveProgress error:', error);
    return { success: false, message: error.toString() };
  }
}

// Lấy tiến độ của user cho 1 khóa học
function getProgress(email, courseCode) {
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName(PROGRESS_SHEET);
    if (!sh) return { success: true, progress: [] };
    
    const emailLower = String(email).toLowerCase().trim();
    const codeUpper = String(courseCode).toUpperCase().trim();
    
    const values = sh.getDataRange().getValues();
    const progress = [];
    
    for (let i = 1; i < values.length; i++) {
      const rowEmail = String(values[i][0]).toLowerCase().trim();
      const rowCode = String(values[i][1]).toUpperCase().trim();
      
      if (rowEmail === emailLower && rowCode === codeUpper) {
        progress.push({
          lessonIndex: parseInt(values[i][2]) || 0,
          videoTime: parseInt(values[i][3]) || 0,
          completedAt: values[i][4] || '',
          score: values[i][5] || ''
        });
      }
    }
    
    return { success: true, progress: progress };
    
  } catch (error) {
    console.error('❌ getProgress error:', error);
    return { success: false, message: error.toString() };
  }
}

// Lấy tổng quan tiến độ của user (tất cả khóa học)
function getUserProgressOverview(email) {
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName(PROGRESS_SHEET);
    if (!sh) return { success: true, overview: {} };
    
    const emailLower = String(email).toLowerCase().trim();
    const values = sh.getDataRange().getValues();
    
    // Đếm số bài đã học cho mỗi khóa
    const overview = {};
    
    for (let i = 1; i < values.length; i++) {
      const rowEmail = String(values[i][0]).toLowerCase().trim();
      if (rowEmail !== emailLower) continue;
      
      const code = String(values[i][1]).toUpperCase().trim();
      const completed = values[i][4] ? 1 : 0;
      
      if (!overview[code]) {
        overview[code] = { total: 0, completed: 0 };
      }
      overview[code].total++;
      overview[code].completed += completed;
    }
    
    return { success: true, overview: overview };
    
  } catch (error) {
    console.error('❌ getUserProgressOverview error:', error);
    return { success: false, message: error.toString() };
  }
}
// ==========================================
// 8. SEARCH FUNCTION
// ==========================================
function searchContent(keyword) {
  try {
    if (!keyword || keyword.trim().length < 2) {
      return { success: true, results: [] };
    }
    
    keyword = keyword.toString().toLowerCase().trim();
    const values = getSheetData(SHEET_NAME, false); 
    // SHEET_NAME = 'Courses', format: [CourseName, Date, LessonName, CourseDesc, VideoUrl, Material, Thumbnail, CourseCode]
    // Index: 0=Name, 1=Date, 2=Lesson, 3=Desc, 4=Video, 5=Mat, 6=Thumb, 7=Code
    
    let results = [];
    const coursesMap = {}; // Để tránh duplicate course result
    
    for (let i = 1; i < values.length; i++) {
       const row = values[i];
       if (!row[0]) continue; // Skip empty rows
       
       const courseName = String(row[0]);
       const lessonName = String(row[2] || '');
       const courseDesc = String(row[3] || '');
       const courseCode = String(row[7] || ''); // Cột H
       
       // 1. Check Course logic (Search by Name, Code, Desc)
       const cNameLower = courseName.toLowerCase();
       const cDescLower = courseDesc.toLowerCase();
       const cCodeLower = courseCode.toLowerCase();
       
       if ((cNameLower.includes(keyword) || cDescLower.includes(keyword) || cCodeLower.includes(keyword)) && !coursesMap[courseName]) {
          results.push({
            type: 'course',
            title: courseName,
            subtitle: courseCode ? `Mã: ${courseCode}` : (courseDesc.substring(0, 50) + '...'),
            thumbnail: row[6] || '',
            courseName: courseName
          });
          coursesMap[courseName] = true; // Mark as added
       }
       
       // 2. Check Lesson logic
       if (lessonName && lessonName.toLowerCase().includes(keyword)) {
          results.push({
             type: 'lesson',
             title: lessonName,
             subtitle: `Trong: ${courseName}`,
             courseName: courseName,
             lessonIndex: getLessonIndex(values, courseName, lessonName) // Helper func needed or calculate manually
          });
       }
       
       if (results.length >= 20) break; // Limit results
    }
    
    return { success: true, results: results };
    
  } catch(e) {
    console.error('Available search error:', e);
    return { success: false, message: e.toString() };
  }
}

// Helper: Tìm index bài học thủ công
function getLessonIndex(allRows, courseName, lessonName) {
   let idx = 0;
   for(let i=1; i<allRows.length; i++) {
     if(String(allRows[i][0]) === courseName) {
        idx++;
        if(String(allRows[i][2]) === lessonName) return idx;
     }
   }
   return 0; // Not found
}

// ==========================================
// 9. ADMIN DASHBOARD FUNCTIONS
// ==========================================

function getAdminStats(forceRefresh) {
  try {
    const CACHE_KEY = 'admin_stats_cache';
    const CACHE_DURATION = 300; // 5 minutes
    
    // Check cache first (unless forceRefresh)
    if (!forceRefresh) {
      const cached = getCache(CACHE_KEY);
      if (cached) {
        console.log('✅ Admin Stats from CACHE');
        return { ...cached, fromCache: true };
      }
    }
    
    console.log('📊 Admin Stats - Loading from Sheet...');
    
    const userRows = getSheetData(USERS_SHEET, false);
    const courseRows = getSheetData(SHEET_NAME, false);
    const progressRows = getSheetData(PROGRESS_SHEET, false);
    
    // Count specific entities (excluding headers)
    const totalUsers = Math.max(0, userRows.length - 1);
    
    // Count approved vs pending users
    let approvedUsers = 0;
    let pendingUsers = 0;
    
    for(let i=1; i<userRows.length; i++) {
      const status = String(userRows[i][4] || '').toLowerCase();
      if(status === 'approve') approvedUsers++;
      else pendingUsers++;
    }
    
    // Count unique courses
    const uniqueCourses = new Set();
    let totalLessons = 0;
    for(let i=1; i<courseRows.length; i++) {
      if(courseRows[i][0]) {
        uniqueCourses.add(courseRows[i][0]);
        totalLessons++;
      }
    }
    const totalCourses = uniqueCourses.size;
    
    // Count completed lessons and unique active learners
    let completedLessons = 0;
    const activeLearners = new Set();
    for(let i=1; i<progressRows.length; i++) {
      if(progressRows[i][0]) activeLearners.add(progressRows[i][0]);
      
      // Check if CompletedAt has a value (timestamp or true)
      const completedValue = String(progressRows[i][4] || '').trim();
      if(completedValue && completedValue !== '0' && completedValue.toLowerCase() !== 'false') {
        completedLessons++;
      }
    }
    
    // Get recent users (last 5)
    const recentUsers = [];
    const maxRecent = 5;
    for (let i = userRows.length - 1; i >= 1 && recentUsers.length < maxRecent; i--) {
      const u = userRows[i];
      if (u[0]) {
         recentUsers.push({
           email: String(u[0] || ''),
           name: String(u[1] || 'No Name'),
           phone: String(u[2] || ''),
           role: 'student',
           status: String(u[4] || 'No'),
           joinedDate: String(u[5] || 'N/A')
         });
      }
    }
    
    const result = {
      success: true,
      stats: {
        totalUsers: totalUsers,
        approvedUsers: approvedUsers,
        pendingUsers: pendingUsers,
        totalCourses: totalCourses,
        totalLessons: totalLessons,
        completedLessons: completedLessons,
        activeLearners: activeLearners.size
      },
      recentUsers: recentUsers,
      fromCache: false
    };
    
    // Save to cache
    setCache(CACHE_KEY, result, CACHE_DURATION);
    
    return result;
    
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// Separate API for chart data (lazy loaded)
function getAdminChartData() {
  try {
    const CACHE_KEY = 'admin_chart_cache';
    const CACHE_DURATION = 300;
    
    const cached = getCache(CACHE_KEY);
    if (cached) {
      console.log('✅ Chart Data from CACHE');
      return cached;
    }
    
    console.log('📈 Chart Data - Loading from Sheet...');
    
    const userRows = getSheetData(USERS_SHEET, false);
    const userGrowthMap = {};
    
    for(let i=1; i<userRows.length; i++) {
      const createdAt = String(userRows[i][5] || '');
      if(createdAt) {
        const datePart = createdAt.split(' ')[1] || createdAt;
        const parts = datePart.split('/');
        if(parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          const dateKey = `${year}-${month}-${day}`;
          userGrowthMap[dateKey] = (userGrowthMap[dateKey] || 0) + 1;
        }
      }
    }
    
    const userGrowth = Object.keys(userGrowthMap)
      .sort()
      .map(date => ({ date: date, count: userGrowthMap[date] }));
    
    const result = { success: true, userGrowth: userGrowth };
    setCache(CACHE_KEY, result, CACHE_DURATION);
    
    return result;
    
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function getAllStudents() {
  try {
    const rows = getSheetData(USERS_SHEET, false);
    const students = [];
    // Correct Users Sheet: [Email, Name, Phone, Password, Progress, Timestamp]
    // Index:                  0,     1,    2,      3,        4,        5
    
    for (let i = 1; i < rows.length; i++) {
       const u = rows[i];
       if (!u[0]) continue;
       students.push({
         email: String(u[0] || ''),
         name: String(u[1] || ''),
         phone: String(u[2] || ''),
         role: 'student',
         status: String(u[4] || 'No') === 'Approve' ? 'Active' : 'Pending'
       });
    }
    
    return { success: true, students: students };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function getStudentDetails(email) {
   try {
     // Find user directly
     // Sheet: [Email, Name, Phone, Password, Progress, Timestamp, AllowedCourses]
     // Index:   0,     1,    2,      3,        4,         5,          6
     const rows = getSheetData(USERS_SHEET, false);
     let user = null;
     for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]).toLowerCase() === String(email).toLowerCase()) {
           const allowedCourses = String(rows[i][6] || '').trim();
           // Count enrolled courses (comma separated, e.g. "K1,K2,K3")
           const coursesCount = allowedCourses ? allowedCourses.split(',').filter(c => c.trim()).length : 0;
           
           user = {
             email: String(rows[i][0] || ''),
             name: String(rows[i][1] || ''),
             phone: String(rows[i][2] || ''),
             role: 'student',
             status: String(rows[i][4] || 'No'),
             allowedCourses: allowedCourses,
             coursesCount: coursesCount
           };
           break;
        }
     }
     
     if (!user) return { success: false, message: 'User not found' };
     
     // Get Completed Lessons count from Progress Sheet
     const pRows = getSheetData(PROGRESS_SHEET, false);
     let completedCount = 0;
     
     for(let i=1; i<pRows.length; i++) {
        if(String(pRows[i][0]).toLowerCase() === String(email).toLowerCase()) {
           if(pRows[i][4] === true || String(pRows[i][4]) === 'true') {
             completedCount++;
           }
        }
     }
     
     return {
       success: true,
       user: {
         email: user.email,
         name: user.name,
         phone: user.phone,
         role: user.role,
         coursesCount: user.coursesCount,
         completedLessons: completedCount
       }
     };
     
   } catch(e) {
     return { success: false, message: e.toString() };
   }
}

function updateStudentStatus(email, status) {
  try {
     const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
     const data = sheet.getDataRange().getValues();
     
     for (let i = 1; i < data.length; i++) {
       if (data[i][0] === email) {
         // Assuming Status is Col G (index 6 + 1 = 7)
         // If sheet doesn't have enough cols, we might need to handle that?
         // For now, let's assume we write to col 7 (G)
         sheet.getRange(i + 1, 7).setValue(status);
         return { success: true, message: 'Updated status to ' + status };
       }
     }
     return { success: false, message: 'User not found' };
  } catch (e) {
     return { success: false, message: e.toString() };
  }
}

function adminResetStudentPass(email) {
   try {
     const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
     const data = sheet.getDataRange().getValues();
     const newPass = '123456';
     
     for (let i = 1; i < data.length; i++) {
       if (data[i][0] === email) {
         sheet.getRange(i + 1, 2).setValue(newPass); // Password is Col B (2)
         return { success: true, message: 'Password reset to 123456' };
       }
     }
     return { success: false, message: 'User not found' };
   } catch(e) {
     return { success: false, message: e.toString() };
   }
}

function updateUserProfile(email, name, phone, newPass, oldPass) {
  try {
     const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
     const data = sheet.getDataRange().getValues();
     
     for (let i = 1; i < data.length; i++) {
       if (data[i][0] === email) {
         const currentPass = String(data[i][1]);
         
         // Verify old password if changing password
         if (newPass && newPass.trim() !== '') {
            if (currentPass !== oldPass) {
              return { success: false, message: 'Mật khẩu cũ không đúng!' };
            }
            if (newPass.length < 6) {
              return { success: false, message: 'Mật khẩu mới phải từ 6 ký tự!' };
            }
            sheet.getRange(i + 1, 2).setValue(newPass);
         }
         
         // Update info
         sheet.getRange(i + 1, 3).setValue(name); // Name Col C (3)
         sheet.getRange(i + 1, 4).setValue(phone); // Phone Col D (4)
         
         return { success: true, message: 'Cập nhật thành công!' };
       }
     }
     return { success: false, message: 'User not found' };
  } catch(e) {
     return { success: false, message: e.toString() };
  }
}

// ============ COURSE COMPLETION TRACKING ============

function markCourseCompleted(email, courseCode, courseName) {
  try {
    const lock = LockService.getScriptLock();
    // Đợi tối đa 10 giây để tránh xung đột ghi
    lock.tryLock(10000);

    console.log(`📌 CHECK COMPLETION: ${email} - Course: ${courseCode}`);
    
    // 1. Chuẩn hóa dữ liệu đầu vào
    const emailCheck = String(email).toLowerCase().trim();
    const codeCheck = String(courseCode).toUpperCase().trim();
    
    // 2. ĐẾM TỔNG BÀI HỌC (Từ Sheet Courses)
    const ss = SpreadsheetApp.getActive();
    const courseSheet = ss.getSheetByName(SHEET_NAME); // Sheet 'Courses'
    if (!courseSheet) return { success: false, message: 'Sheet Courses not found' };
    
    const courseData = courseSheet.getDataRange().getValues();
    let totalLessons = 0;
    
    // Cột H là cột chứa Mã Khóa Học (index 7)
    for (let i = 1; i < courseData.length; i++) {
      const rowCode = String(courseData[i][7] || '').toUpperCase().trim();
      if (rowCode === codeCheck) {
        totalLessons++;
      }
    }
    console.log(`👉 Total Lessons for ${codeCheck}: ${totalLessons}`);

    if (totalLessons === 0) {
      console.error(`❌ Không tìm thấy bài học nào cho mã khóa: ${codeCheck}`);
      lock.releaseLock();
      return { success: false, message: 'Lỗi: Không tìm thấy dữ liệu khóa học.' };
    }

    // 3. ĐẾM BÀI ĐÃ HOÀN THÀNH (Từ Sheet Progress)
    const progressSheet = ss.getSheetByName(PROGRESS_SHEET);
    if (!progressSheet) {
       lock.releaseLock();
       return { success: false, message: 'Sheet Progress not found' };
    }

    const progressData = progressSheet.getDataRange().getValues();
    let completedCount = 0;
    
    for (let i = 1; i < progressData.length; i++) {
      const pEmail = String(progressData[i][0]).toLowerCase().trim();
      const pCode = String(progressData[i][1]).toUpperCase().trim();
      // Cột E là CompletedAt (index 4)
      const pCompleted = progressData[i][4]; 
      
      if (pEmail === emailCheck && pCode === codeCheck) {
        // Kiểm tra xem đã hoàn thành chưa (có ngày tháng hoặc true)
        if (pCompleted && String(pCompleted).toString().trim() !== '' && String(pCompleted).toString().trim() !== '0') {
           completedCount++;
        }
      }
    }
    console.log(`👉 User Completed: ${completedCount}/${totalLessons}`);

    // 4. SO SÁNH & UPDATE CỘT H
    if (completedCount >= totalLessons) {
       console.log('✅ ĐỦ ĐIỀU KIỆN! Đang update cột H...');
       
       const usersSheet = ss.getSheetByName(USERS_SHEET);
       const usersData = usersSheet.getDataRange().getValues();
       let userFound = false;

       for (let i = 1; i < usersData.length; i++) {
         const uEmail = String(usersData[i][0]).toLowerCase().trim();
         
         if (uEmail === emailCheck) {
           userFound = true;
           // Cột H là index 7 (Khóa học đã hoàn thành)
           let currentVal = String(usersData[i][7] || '');
           let completedCourses = currentVal ? currentVal.split(',') : [];
           
           // Trim khoảng trắng thừa
           completedCourses = completedCourses.map(c => c.trim().toUpperCase());
           
           // Nếu chưa có thì thêm vào
           if (!completedCourses.includes(codeCheck)) {
             completedCourses.push(codeCheck);
             const newVal = completedCourses.join(', ');
             
             usersSheet.getRange(i + 1, 8).setValue(newVal); // Cột H là cột thứ 8
             console.log(`🎉 Updated Column H for user ${email}: ${newVal}`);
             SpreadsheetApp.flush(); // Bắt buộc ghi ngay lập tức
           } else {
             console.log('ℹ️ User đã có mã khóa học này trong cột H rồi.');
           }
           break;
         }
       }
       
       if (!userFound) console.error('❌ Không tìm thấy User trong sheet Users để update.');

       lock.releaseLock();
       return { 
         success: true, 
         message: `Chúc mừng! Bạn đã hoàn thành khóa học "${courseName}"!`
       };

    } else {
       console.log('⚠️ Chưa đủ điều kiện hoàn thành.');
       lock.releaseLock();
       return { 
         success: false, 
         message: `Chưa hoàn thành đủ số bài (${completedCount}/${totalLessons})` 
       };
    }

  } catch (e) {
    console.error('SERVER ERROR in markCourseCompleted:', e);
    try { LockService.getScriptLock().releaseLock(); } catch (err) {}
    return { success: false, message: e.toString() };
  }
}

/**
 * Get detailed course report for teachers/admin (Phase 2 - Enhanced)
 * @param {string} courseCode - The course code (e.g., "K1")
 * @returns {Object} Report data with student progress, lesson analytics, timeline
 */
function getCourseReport(courseCode) {
  try {
    console.log('📊 getCourseReport called for:', courseCode);
    const ss = SpreadsheetApp.getActive();
    const codeCheck = String(courseCode).toUpperCase().trim();
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // 1. Get lessons from Courses sheet + build lesson list
    const courseSheet = ss.getSheetByName(SHEET_NAME);
    if (!courseSheet) return { success: false, message: 'Sheet Courses not found' };
    
    const courseData = courseSheet.getDataRange().getValues();
    let courseName = '';
    const lessons = []; // Array of lesson info
    
    for (let i = 1; i < courseData.length; i++) {
      const rowCode = String(courseData[i][7] || '').toUpperCase().trim();
      if (rowCode === codeCheck) {
        if (!courseName) courseName = String(courseData[i][0] || '');
        lessons.push({
          index: lessons.length,
          name: String(courseData[i][2] || 'Bài ' + (lessons.length + 1)), // Column C = Lesson name
          views: 0,
          completions: 0,
          dropOffRate: 0,
          details: [] // Array to store student details
        });
      }
    }
    
    const totalLessons = lessons.length;
    if (totalLessons === 0) {
      return { success: false, message: 'Không tìm thấy khóa học với mã: ' + courseCode };
    }
    
    // 2. Get students who have access to this course (from Users sheet, Column G)
    const usersSheet = ss.getSheetByName(USERS_SHEET);
    if (!usersSheet) return { success: false, message: 'Sheet Users not found' };
    
    const usersData = usersSheet.getDataRange().getValues();
    const studentsWithAccess = [];
    
    for (let i = 1; i < usersData.length; i++) {
      const email = String(usersData[i][0] || '').toLowerCase().trim();
      const name = String(usersData[i][1] || '');
      // Column G (index 6) = Allowed courses (comma-separated)
      const allowedCourses = String(usersData[i][6] || '').toUpperCase();
      
      // Check if user has access to this course (or is admin/teacher with all access)
      if (allowedCourses.includes(codeCheck) || allowedCourses.includes('ALL')) {
        studentsWithAccess.push({
          email: email,
          name: name,
          completedLessons: 0,
          progress: 0,
          lastActivityDate: null,
          daysSinceLastActivity: 999,
          lessonsViewed: new Set(),
          lessonsCompleted: new Set()
        });
      }
    }
    
    // 3. Get progress data + lesson analytics
    const progressSheet = ss.getSheetByName(PROGRESS_SHEET);
    let completionsThisWeek = 0;
    
    if (progressSheet) {
      const progressData = progressSheet.getDataRange().getValues();
      
      for (let i = 1; i < progressData.length; i++) {
        const pEmail = String(progressData[i][0]).toLowerCase().trim();
        const pCode = String(progressData[i][1]).toUpperCase().trim();
        const pLessonIndex = (parseInt(progressData[i][2]) || 0) - 1; // Column C = Lesson Index (1-based -> 0-based)

        
        if (pCode !== codeCheck) continue;
        
        // Find or add student
        let targetStudent = studentsWithAccess.find(s => s.email === pEmail);
        if (!targetStudent) {
          targetStudent = {
            email: pEmail,
            name: '',
            completedLessons: 0,
            progress: 0,
            lastActivityDate: null,
            daysSinceLastActivity: 999,
            lessonsViewed: new Set(),
            lessonsCompleted: new Set()
          };
          studentsWithAccess.push(targetStudent);
        }
        
        // Helper to safely parse dates (assuming dd/MM/yyyy for strings in VN context)
        function parseDateSafe(v) {
           if (!v) return null;
           if (Object.prototype.toString.call(v) === '[object Date]') return v;
           if (typeof v === 'string') {
             // Basic check for d/m/y format: "5/2/2026" or "05/02/2026"
             // Basic check for d/m/y format: "5/2/2026" or "05/02/2026" (ignoring surrounding time)
             const parts = v.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
             if (parts) {
               return new Date(parts[3], parts[2]-1, parts[1]);
             }
           }
           return new Date(v);
        }

        const pLastUpdateRaw = progressData[i][6];
        const pCompletedAtRaw = progressData[i][4];
        
        // Define shared variables
        const pCompleted = pCompletedAtRaw;
        const dtLast = parseDateSafe(pLastUpdateRaw);
        const dtComp = parseDateSafe(pCompletedAtRaw);
        
        // Track last activity (Prioritize LastUpdate, fallback to CompletedAt)
        const activityDate = (dtLast && !isNaN(dtLast.getTime())) ? dtLast : ((dtComp && !isNaN(dtComp.getTime())) ? dtComp : null);

        // Track lesson views (any progress entry counts as a view)
        if (pLessonIndex >= 0 && pLessonIndex < lessons.length) {
          targetStudent.lessonsViewed.add(pLessonIndex);
          lessons[pLessonIndex].views++;

          // Add detailed stat for this student on this lesson
          lessons[pLessonIndex].details.push({
            email: pEmail,
            name: targetStudent.name || pEmail.split('@')[0],
            videoTime: pVideoTime,
            score: pScore,
            completedAt: (pCompleted && dtComp && !isNaN(dtComp.getTime())) ? Utilities.formatDate(dtComp, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm') : null,
            lastUpdate: (dtLast && !isNaN(dtLast.getTime())) ? Utilities.formatDate(dtLast, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm') : null,
            lastUpdateTs: (dtLast && !isNaN(dtLast.getTime())) ? dtLast.getTime() : null,
            isCompleted: !!(pCompleted && String(pCompleted).trim() !== '' && String(pCompleted).trim() !== '0')
          });
        }
        
        if (activityDate && !isNaN(activityDate.getTime())) {
          if (!targetStudent.lastActivityDate || activityDate > targetStudent.lastActivityDate) {
            targetStudent.lastActivityDate = activityDate;
          }
        }
        
        // Track completions
        if (pCompleted && String(pCompleted).trim() !== '' && String(pCompleted).trim() !== '0') {
          targetStudent.completedLessons++;
          if (pLessonIndex >= 0 && pLessonIndex < lessons.length) {
            targetStudent.lessonsCompleted.add(pLessonIndex);
            lessons[pLessonIndex].completions++;
          }
          
          // Count completions this week
          const completedDate = new Date(pCompleted);
          if (!isNaN(completedDate.getTime()) && completedDate >= oneWeekAgo) {
            completionsThisWeek++;
          }
        }
      }
    }
    
    // 4. Calculate lesson drop-off rates
    const lessonAnalytics = lessons.map((lesson, idx) => {
      // Drop-off = viewed but not completed
      const dropOffs = lesson.views - lesson.completions;
      const dropOffRate = lesson.views > 0 ? Math.round((dropOffs / lesson.views) * 100) : 0;
      return {
        index: idx + 1,
        name: lesson.name,
        views: lesson.views,
        completions: lesson.completions,
        dropOffRate: dropOffRate,
        details: lesson.details // Pass details to frontend
      };
    });
    
    // 5. Calculate student statistics
    let totalStudents = studentsWithAccess.length;
    let completedStudents = 0;
    let activeStudents = 0;
    let notStartedStudents = 0;
    let dormantStudents = 0;
    let totalProgress = 0;
    
    const studentsReport = studentsWithAccess.map(s => {
      s.progress = totalLessons > 0 ? Math.round((s.completedLessons / totalLessons) * 100) : 0;
      s.progress = Math.min(s.progress, 100);
      
      // Calculate days since last activity
      if (s.lastActivityDate) {
        s.daysSinceLastActivity = Math.floor((now - s.lastActivityDate) / (1000 * 60 * 60 * 24));
      } else {
        s.daysSinceLastActivity = 999;
      }
      
      // Categorize (Revised Logic V2)
      // 1. Completed: Progress >= 100
      if (s.progress >= 100) {
        completedStudents++;
      }
      // 2. Active: Progress < 100 AND Activity within 7 days
      else if (s.daysSinceLastActivity <= 7) {
        activeStudents++;
      }
      // 3. Dormant: Progress < 100 AND Activity > 7 days (but has started)
      else if (s.lastActivityDate) {
        dormantStudents++;
      }
      // 4. Not Started: No activity record
      else {
        notStartedStudents++;
      }
      
      totalProgress += s.progress;
      
      return {
        email: s.email,
        name: s.name || '-',
        progress: s.progress,
        completedLessons: s.completedLessons,
        daysSinceLastActivity: s.daysSinceLastActivity,
        lastActivity: s.lastActivityDate ? Utilities.formatDate(s.lastActivityDate, Session.getScriptTimeZone(), 'dd/MM/yyyy') : null
      };
    });
    
    // Sort: completed first, then by progress desc
    studentsReport.sort((a, b) => {
      if (b.progress !== a.progress) return b.progress - a.progress;
      return a.email.localeCompare(b.email);
    });
    
    const averageProgress = totalStudents > 0 ? Math.round(totalProgress / totalStudents) : 0;
    
    console.log(`📊 Report: ${totalStudents} students, ${completedStudents} completed, avg ${averageProgress}%`);
    
    return {
      success: true,
      report: {
        courseName: courseName,
        courseCode: codeCheck,
        totalLessons: totalLessons,
        totalStudents: totalStudents,
        activeStudents: activeStudents,
        completedStudents: completedStudents,
        notStartedStudents: notStartedStudents,
        dormantStudents: dormantStudents,
        averageProgress: averageProgress,
        completionsThisWeek: completionsThisWeek,
        lessonAnalytics: lessonAnalytics,
        students: studentsReport
      }
    };
    
  } catch (e) {
    console.error('Error in getCourseReport:', e);
    return { success: false, message: e.toString() };
  }
}
