// js/login.js

// --- 1. XỬ LÝ HIỆU ỨNG TRƯỢT (SLIDER ANIMATION) ---
const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const container = document.getElementById('container');

// Khi bấm nút Đăng Ký trên Overlay
if (signUpButton) {
    signUpButton.addEventListener('click', () => {
        container.classList.add("right-panel-active");
    });
}

// Khi bấm nút Đăng Nhập trên Overlay
if (signInButton) {
    signInButton.addEventListener('click', () => {
        container.classList.remove("right-panel-active");
    });
}

// Hàm dùng cho giao diện Mobile (bấm link text)
function toggleForm() {
    container.classList.toggle("right-panel-active");
}


// --- 2. XỬ LÝ ĐĂNG NHẬP (LOGIN) ---
async function handleLogin(e) {
    e.preventDefault(); // Ngăn không cho trang web tải lại

    const userIn = document.getElementById('login-user').value;
    const passIn = document.getElementById('login-pass').value;
    const btn = e.target.querySelector('button');

    // Hiệu ứng nút bấm đang tải
    const oldText = btn.innerText;
    btn.innerText = "Đang kiểm tra...";
    btn.disabled = true;

    try {
        // Gọi hàm login từ file data.js (kết nối Supabase)
        const user = await DB.login(userIn, passIn);

        if (user) {
            // 1. Lưu thông tin người dùng vào bộ nhớ trình duyệt
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            
            // 2. Thông báo chào mừng
            // alert(`Đăng nhập thành công! Xin chào ${user.fullname || user.username}`);

            // 3. KIỂM TRA QUYỀN ĐỂ CHUYỂN TRANG (Quan trọng)
            if (user.role === 'admin') {
                // Nếu là Admin -> Vào trang quản trị
                window.location.href = 'admin_dashboard.html';
            } else {
                // Nếu là User thường -> Vào trang chủ dành cho người đọc
                window.location.href = 'user_dashboard.html';
            }

        } else {
            alert("❌ Sai tên đăng nhập hoặc mật khẩu!");
        }
    } catch (error) {
        console.error(error);
        alert("Lỗi kết nối hệ thống!");
    } finally {
        // Trả lại trạng thái nút bấm
        btn.innerText = oldText;
        btn.disabled = false;
    }
}


// --- 3. XỬ LÝ ĐĂNG KÝ (REGISTER) ---
async function handleRegister(e) {
    e.preventDefault();

    const userIn = document.getElementById('reg-user').value;
    const nameIn = document.getElementById('reg-name').value;
    const emailIn = document.getElementById('reg-email').value;
    const passIn = document.getElementById('reg-pass').value;
    const btn = e.target.querySelector('button');

    btn.innerText = "Đang tạo...";
    btn.disabled = true;

    try {
        // Gọi hàm register từ file data.js
        // Hàm này mặc định sẽ tạo user có role là 'user'
        const result = await DB.register(userIn, passIn, nameIn, emailIn);

        if (result.success) {
            alert("✅ Đăng ký thành công! Vui lòng đăng nhập.");
            
            // Tự động trượt về form đăng nhập
            container.classList.remove("right-panel-active");
            
            // Tự động điền tên đăng nhập cho tiện
            document.getElementById('login-user').value = userIn;
            document.getElementById('login-pass').focus();
        } else {
            alert("⚠️ Lỗi: " + result.message);
        }
    } catch (error) {
        console.error(error);
        alert("Lỗi hệ thống!");
    } finally {
        btn.innerText = "Đăng Ký";
        btn.disabled = false;
    }
}