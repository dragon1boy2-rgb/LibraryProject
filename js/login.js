// js/login.js

// --- 1. XỬ LÝ HIỆU ỨNG TRƯỢT (ANIMATION) ---
const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const container = document.getElementById('container');

// Nút Đăng Ký trên Overlay (Màn hình lớn)
if (signUpButton) {
    signUpButton.addEventListener('click', () => {
        container.classList.add("right-panel-active");
    });
}

// Nút Đăng Nhập trên Overlay (Màn hình lớn)
if (signInButton) {
    signInButton.addEventListener('click', () => {
        container.classList.remove("right-panel-active");
    });
}

// Hàm chuyển đổi form (Dùng cho Mobile)
function toggleForm() {
    container.classList.toggle("right-panel-active");
}


// --- 2. LOGIC ĐỔI PLACEHOLDER (Mã SV / Mã GV) ---
// Hàm này được gọi khi thay đổi select box "Bạn là..."
function toggleIdInput() {
    const role = document.getElementById('reg-role').value;
    const input = document.getElementById('reg-code');
    
    if (role === 'student') {
        input.placeholder = "Nhập Mã Sinh Viên";
    } else {
        input.placeholder = "Nhập Mã Giảng Viên";
    }
}


// --- 3. XỬ LÝ ĐĂNG KÝ (REGISTER) ---
async function handleRegister(e) {
    e.preventDefault(); // Ngăn load lại trang

    // Lấy dữ liệu từ form
    const role = document.getElementById('reg-role').value;
    const userIn = document.getElementById('reg-user').value.trim();
    const passIn = document.getElementById('reg-pass').value.trim();
    const nameIn = document.getElementById('reg-name').value.trim();
    const emailIn = document.getElementById('reg-email').value.trim();
    const codeIn = document.getElementById('reg-code').value.trim(); // Mã SV hoặc GV

    // Kiểm tra dữ liệu
    if (!userIn || !passIn || !codeIn) {
        alert("Vui lòng điền đầy đủ thông tin bắt buộc!");
        return;
    }

    const btn = e.target.querySelector('button');
    const oldText = btn.innerText;
    btn.innerText = "Đang xử lý...";
    btn.disabled = true;

    try {
        // Gọi hàm register trong data.js (truyền đủ 6 tham số)
        const result = await DB.register(userIn, passIn, nameIn, emailIn, role, codeIn);

        if (result.success) {
            alert("✅ Đăng ký thành công! Vui lòng đăng nhập.");
            
            // Tự động chuyển về form đăng nhập
            container.classList.remove("right-panel-active");
            
            // Tự động điền username vừa tạo để tiện đăng nhập
            document.getElementById('login-user').value = userIn;
            document.getElementById('login-pass').focus();
        } else {
            alert("⚠️ Lỗi: " + result.message);
        }
    } catch (error) {
        console.error(error);
        alert("Lỗi hệ thống! Vui lòng thử lại sau.");
    } finally {
        btn.innerText = oldText;
        btn.disabled = false;
    }
}


// --- 4. XỬ LÝ ĐĂNG NHẬP (LOGIN) ---
async function handleLogin(e) {
    e.preventDefault();

    const userIn = document.getElementById('login-user').value.trim();
    const passIn = document.getElementById('login-pass').value.trim();
    const btn = e.target.querySelector('button');

    const oldText = btn.innerText;
    btn.innerText = "Đang kiểm tra...";
    btn.disabled = true;

    try {
        // Gọi hàm login từ data.js
        const user = await DB.login(userIn, passIn);

        if (user) {
            // Lưu thông tin người dùng vào Session
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            
            // Chuyển hướng dựa trên Role (Vai trò)
            if (user.role === 'admin') {
                window.location.href = 'admin_dashboard.html';
            } else {
                // Sinh viên hoặc Giảng viên đều vào trang Dashboard chung
                window.location.href = 'user_dashboard.html';
            }
        } else {
            alert("❌ Sai tên đăng nhập hoặc mật khẩu!");
        }
    } catch (error) {
        console.error(error);
        alert("Lỗi kết nối mạng hoặc Server!");
    } finally {
        btn.innerText = oldText;
        btn.disabled = false;
    }
}