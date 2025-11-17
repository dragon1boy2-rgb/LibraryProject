// js/admin_users.js

const currentUser = DB.getCurrentUser();
if (!currentUser || currentUser.role !== 'admin') {
    alert("Bạn không có quyền truy cập trang này!");
    window.location.href = 'user_dashboard.html';
}

let allUsers = [];

// DOM Elements
const modal = document.getElementById('userModal');
const titleEl = document.getElementById('modal-title');
const idEl = document.getElementById('u-id');
const userEl = document.getElementById('u-username');
const passEl = document.getElementById('u-password');
const nameEl = document.getElementById('u-fullname');
const mailEl = document.getElementById('u-email');
const roleEl = document.getElementById('u-role');
const codeEl = document.getElementById('u-code'); // Ô nhập mã số mới
const passHint = document.getElementById('pass-hint');

// 1. RENDER
async function render(data = null) {
    const tbody = document.getElementById('user-list');
    if (!tbody) return;

    if (!data) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px">⏳ Đang tải...</td></tr>';
        allUsers = await DB.getUsers();
        data = allUsers;
    }

    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px">Chưa có tài khoản nào.</td></tr>';
        return;
    }

    data.forEach(u => {
        let roleBadge = '';
        let infoHtml = `<strong>${u.username}</strong>`; // Mặc định hiện username

        // Logic hiển thị theo Role
        if (u.role === 'admin') {
            roleBadge = `<span class="status-badge" style="background:#e6f7ff; color:#1890ff; border:1px solid #91d5ff">Admin</span>`;
            infoHtml += `<br>${u.fullname || ''}`;
        } 
        else if (u.role === 'lecturer') {
            roleBadge = `<span class="status-badge" style="background:#fff7e6; color:#faad14; border:1px solid #ffe58f">Giảng Viên</span>`;
            // Hiện tên + Mã GV
            infoHtml += `<br>${u.fullname || ''} <span style="color:#666; font-size:12px">(${u.lecturer_id || 'Chưa có MGV'})</span>`;
        } 
        else {
            roleBadge = `<span class="status-badge" style="background:#f6ffed; color:#52c41a; border:1px solid #b7eb8f">Sinh Viên</span>`;
            // Hiện tên + Mã SV
            infoHtml += `<br>${u.fullname || ''} <span style="color:#666; font-size:12px">(${u.student_id || 'Chưa có MSV'})</span>`;
        }

        tbody.innerHTML += `
            <tr>
                <td>#${u.id}</td>
                <td>${infoHtml}</td>
                <td>${u.email || '-'}</td>
                <td>${roleBadge}</td>
                <td>
                    <button class="action-btn btn-edit" onclick="openModalEdit(${u.id})"><i class="fas fa-pen"></i></button>
                    <button class="action-btn btn-delete" onclick="handleDelete(${u.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

// 2. MODAL FUNCTIONS
function openModal() {
    idEl.value = '';
    userEl.value = ''; userEl.disabled = false; userEl.style.backgroundColor = "white";
    passEl.value = ''; passEl.placeholder = "Nhập mật khẩu...";
    nameEl.value = '';
    mailEl.value = '';
    roleEl.value = 'student';
    codeEl.value = ''; // Reset mã số
    
    passHint.style.display = 'none';
    titleEl.innerText = "Thêm Tài Khoản Mới";
    modal.classList.add('active');
}

function openModalEdit(id) {
    const user = allUsers.find(u => u.id === id);
    if (!user) return;

    idEl.value = user.id;
    userEl.value = user.username; userEl.disabled = true; userEl.style.backgroundColor = "#f5f5f5";
    passEl.value = ''; passEl.placeholder = "Nhập pass mới nếu muốn đổi";
    nameEl.value = user.fullname || '';
    mailEl.value = user.email || '';
    roleEl.value = user.role || 'student';
    
    // Điền mã số tùy theo role
    if(user.role === 'student') codeEl.value = user.student_id || '';
    else if(user.role === 'lecturer') codeEl.value = user.lecturer_id || '';
    else codeEl.value = '';

    passHint.style.display = 'block';
    titleEl.innerText = "Cập Nhật Tài Khoản";
    modal.classList.add('active');
}

function closeModal() { modal.classList.remove('active'); }

// 3. SAVE
async function saveUser() {
    const id = idEl.value;
    const username = userEl.value.trim();
    const password = passEl.value.trim();
    const fullname = nameEl.value.trim();
    const email = mailEl.value.trim();
    const role = roleEl.value;
    const code = codeEl.value.trim(); // Lấy mã số

    if (!username) { alert("Vui lòng nhập tên đăng nhập!"); return; }

    // Tạo object dữ liệu cơ bản
    let userData = { fullname, email, role };
    
    // Xử lý mã số theo role
    if (role === 'student') {
        userData.student_id = code;
        userData.lecturer_id = null; // Xóa mã GV nếu chuyển sang SV
    } else if (role === 'lecturer') {
        userData.lecturer_id = code;
        userData.student_id = null; // Xóa mã SV nếu chuyển sang GV
    } else {
        userData.student_id = null;
        userData.lecturer_id = null;
    }

    if (id) {
        // SỬA
        if (password !== "") userData.password = password;
        const success = await DB.updateUser(id, userData);
        if (success) { closeModal(); render(); }
    } else {
        // THÊM
        if (!password) { alert("Vui lòng nhập mật khẩu!"); return; }
        userData.username = username;
        userData.password = password;
        
        const success = await DB.addUser(userData);
        if (success) { closeModal(); render(); }
    }
}

async function handleDelete(id) {
    if (confirm("Xóa tài khoản này?")) {
        await DB.deleteUser(id);
        render();
    }
}

function handleSearch() {
    const k = document.getElementById('search-input').value.toLowerCase();
    render(allUsers.filter(u => 
        u.username.toLowerCase().includes(k) || 
        (u.fullname && u.fullname.toLowerCase().includes(k)) ||
        (u.student_id && u.student_id.toLowerCase().includes(k)) ||
        (u.lecturer_id && u.lecturer_id.toLowerCase().includes(k))
    ));
}

document.addEventListener('DOMContentLoaded', () => render());