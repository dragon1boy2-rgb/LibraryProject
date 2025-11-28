// js/login.js

// --- 1. XỬ LÝ HIỆU ỨNG TRƯỢT (ANIMATION) ---
const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const container = document.getElementById('container');

if (signUpButton) {
    signUpButton.addEventListener('click', () => {
        container.classList.add("right-panel-active");
    });
}
if (signInButton) {
    signInButton.addEventListener('click', () => {
        container.classList.remove("right-panel-active");
    });
}
function toggleForm() {
    container.classList.toggle("right-panel-active");
}

// --- 2. LOGIC ĐỔI PLACEHOLDER (Mã SV / Mã GV) ---
function toggleIdInput() {
    const role = document.getElementById('reg-role').value;
    const input = document.getElementById('reg-code');
    if (role === 'student') input.placeholder = "Nhập Mã Sinh Viên";
    else input.placeholder = "Nhập Mã Giảng Viên";
}

// --- 3. XỬ LÝ ĐĂNG KÝ (REGISTER) ---
async function handleRegister(e) {
    e.preventDefault();
    const role = document.getElementById('reg-role').value;
    const userIn = document.getElementById('reg-user').value.trim();
    const passIn = document.getElementById('reg-pass').value.trim();
    const nameIn = document.getElementById('reg-name').value.trim();
    const emailIn = document.getElementById('reg-email').value.trim();
    const codeIn = document.getElementById('reg-code').value.trim();

    if (!userIn || !passIn || !codeIn) {
        alert("Vui lòng điền đầy đủ thông tin bắt buộc!");
        return;
    }

    const btn = e.target.querySelector('button');
    const oldText = btn.innerText;
    btn.innerText = "Đang xử lý...";
    btn.disabled = true;

    try {
        const result = await DB.register(userIn, passIn, nameIn, emailIn, role, codeIn);
        if (result.success) {
            alert("✅ Đăng ký thành công! Vui lòng đăng nhập.");
            container.classList.remove("right-panel-active");
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

// --- 4. XỬ LÝ ĐĂNG NHẬP (LOGIN THƯỜNG) ---
async function handleLogin(e) {
    e.preventDefault();
    const userIn = document.getElementById('login-user').value.trim();
    const passIn = document.getElementById('login-pass').value.trim();
    const btn = e.target.querySelector('button');

    const oldText = btn.innerText;
    btn.innerText = "Đang kiểm tra...";
    btn.disabled = true;

    try {
        const user = await DB.login(userIn, passIn);
        if (user) {
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            if (user.role === 'admin') window.location.href = 'admin_dashboard.html';
            else window.location.href = 'user_dashboard.html';
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

// --- 5. XỬ LÝ LOGIN GOOGLE ---
function handleGoogleBtnClick(e) {
    e.preventDefault();
    const btn = e.currentTarget;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; 
    DB.loginWithGoogle();
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.hash.includes('access_token') || window.location.search.includes('code=')) {
        const container = document.getElementById('container');
        if(container) {
            container.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; text-align:center;">
                    <h2 style="color:#1890ff; margin-bottom:15px;"><i class="fas fa-spinner fa-spin"></i> Đang xác thực Google...</h2>
                    <p>Vui lòng chờ trong giây lát, hệ thống đang đồng bộ dữ liệu.</p>
                </div>`;
        }
        DB.handleOAuthLogin();
    }
});

// --- 6. XỬ LÝ QUÊN MẬT KHẨU (FORGOT PASSWORD) ---

const forgotModal = document.getElementById('forgotModal');

function openForgotModal(e) {
    if(e) e.preventDefault();
    forgotModal.classList.add('active');
}

function closeForgotModal() {
    forgotModal.classList.remove('active');
    document.getElementById('reset-user').value = '';
    document.getElementById('reset-email').value = '';
}

async function handleResetPassword(e) {
    e.preventDefault();

    // === CẤU HÌNH CỦA BẠN ===
    const SERVICE_ID = "service_a0gmd65";
    const TEMPLATE_ID = "template_d54alt5";
    // =========================

    const user = document.getElementById('reset-user').value.trim();
    const email = document.getElementById('reset-email').value.trim();

    if (!user || !email) {
        alert("Vui lòng điền đầy đủ thông tin!");
        return;
    }

    const btn = e.target.querySelector('button');
    const oldText = btn.innerText;
    btn.innerText = "Đang xử lý...";
    btn.disabled = true;

    try {
        // 1. Gọi Database để tạo mật khẩu mới
        const result = await DB.resetPasswordAuto(user, email);

        if (result.success) {
            console.log("DB Update OK. Đang gửi mail...");
            // 2. Gửi mật khẩu mới qua EmailJS
            const templateParams = {
                to_email: email,
                to_name: result.fullname,
                new_password: result.newPass
            };
            await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams);
            alert("✅ Thành công! Mật khẩu mới đã được gửi vào email của bạn.");
            closeForgotModal();
        } else {
            alert("❌ " + result.message);
        }
    } catch (err) {
        console.error("Lỗi:", err);
        alert("Lỗi khi gửi email. Vui lòng kiểm tra kết nối mạng.");
    } finally {
        btn.innerText = oldText;
        btn.disabled = false;
    }
}