// js/admin_users.js

// 1. BẢO VỆ TRANG ADMIN (Chỉ Admin mới được vào)
const currentUser = DB.getCurrentUser();
if (!currentUser || currentUser.role !== 'admin') {
    alert("Bạn không có quyền truy cập trang này!");
    window.location.href = 'user_dashboard.html';
}

let allUsers = [];

// Các phần tử trong Modal
const modal = document.getElementById('userModal');
const titleEl = document.getElementById('modal-title');
const idEl = document.getElementById('u-id');
const userEl = document.getElementById('u-username');
const passEl = document.getElementById('u-password');
const nameEl = document.getElementById('u-fullname');
const mailEl = document.getElementById('u-email');
const roleEl = document.getElementById('u-role');
const passHint = document.getElementById('pass-hint');

// 2. HÀM HIỂN THỊ DANH SÁCH (RENDER)
async function render(data = null) {
    const tbody = document.getElementById('user-list');
    if (!tbody) return;

    // Nếu chưa có dữ liệu thì tải từ Server
    if (!data) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px">⏳ Đang tải dữ liệu...</td></tr>';
        allUsers = await DB.getUsers();
        data = allUsers;
    }

    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px">Chưa có tài khoản nào.</td></tr>';
        return;
    }

    data.forEach(u => {
        // Tạo badge màu sắc cho Role
        let roleBadge = u.role === 'admin' 
            ? `<span class="status-badge" style="background:#e6f7ff; color:#1890ff; border:1px solid #91d5ff">Admin</span>` 
            : `<span class="status-badge" style="background:#f6ffed; color:#52c41a; border:1px solid #b7eb8f">User</span>`;

        tbody.innerHTML += `
            <tr>
                <td>#${u.id}</td>
                <td><strong>${u.username}</strong></td>
                <td>${u.fullname || '-'}</td>
                <td>${u.email || '-'}</td>
                <td>${roleBadge}</td>
                <td>
                    <button class="action-btn btn-edit" onclick="openModalEdit(${u.id})" title="Sửa">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="action-btn btn-delete" onclick="handleDelete(${u.id})" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

// 3. MỞ MODAL ĐỂ THÊM MỚI
function openModal() {
    idEl.value = '';
    
    // Reset form
    userEl.value = ''; 
    userEl.disabled = false; // Cho phép nhập tên đăng nhập
    userEl.style.backgroundColor = "white";
    
    passEl.value = ''; 
    passEl.placeholder = "Nhập mật khẩu...";
    
    nameEl.value = '';
    mailEl.value = '';
    roleEl.value = 'user';
    
    passHint.style.display = 'none'; // Ẩn gợi ý đổi mật khẩu
    titleEl.innerText = "Thêm Tài Khoản Mới";
    modal.classList.add('active');
}

// 4. MỞ MODAL ĐỂ SỬA (EDIT)
function openModalEdit(id) {
    const user = allUsers.find(u => u.id === id);
    if (!user) return;

    // Điền thông tin cũ vào form
    idEl.value = user.id;
    
    userEl.value = user.username; 
    userEl.disabled = true; // Không cho sửa tên đăng nhập (tránh lỗi hệ thống)
    userEl.style.backgroundColor = "#f5f5f5";

    passEl.value = ''; // Để trống mật khẩu
    passEl.placeholder = "Nhập mật khẩu mới (nếu muốn đổi)";
    
    nameEl.value = user.fullname || '';
    mailEl.value = user.email || '';
    roleEl.value = user.role;

    passHint.style.display = 'block'; // Hiện gợi ý
    titleEl.innerText = "Cập Nhật Tài Khoản";
    modal.classList.add('active');
}

function closeModal() {
    modal.classList.remove('active');
}

// 5. LƯU DỮ LIỆU (Xử lý Thêm hoặc Sửa)
async function saveUser() {
    const id = idEl.value;
    const username = userEl.value.trim();
    const password = passEl.value.trim();
    const fullname = nameEl.value.trim();
    const email = mailEl.value.trim();
    const role = roleEl.value;

    if (!username) { alert("Vui lòng nhập tên đăng nhập!"); return; }

    // --- TRƯỜNG HỢP SỬA ---
    if (id) {
        const updates = { fullname, email, role };
        
        // Chỉ cập nhật mật khẩu nếu người dùng có nhập gì đó vào ô password
        if (password !== "") {
            updates.password = password; 
        }

        const success = await DB.updateUser(id, updates);
        if (success) { 
            closeModal(); 
            render(); // Tải lại bảng
        }
    } 
    // --- TRƯỜNG HỢP THÊM MỚI ---
    else {
        if (!password) { alert("Vui lòng nhập mật khẩu cho tài khoản mới!"); return; }
        
        const success = await DB.addUser({ username, password, fullname, email, role });
        if (success) { 
            closeModal(); 
            render(); // Tải lại bảng
        }
    }
}

// 6. XÓA TÀI KHOẢN
async function handleDelete(id) {
    if (confirm("Bạn có chắc chắn muốn xóa tài khoản này?")) {
        await DB.deleteUser(id);
        render();
    }
}

// 7. TÌM KIẾM
function handleSearch() {
    const k = document.getElementById('search-input').value.toLowerCase();
    const filtered = allUsers.filter(u => 
        u.username.toLowerCase().includes(k) || 
        (u.fullname && u.fullname.toLowerCase().includes(k)) ||
        (u.email && u.email.toLowerCase().includes(k))
    );
    render(filtered);
}

// Chạy lần đầu khi trang tải xong
document.addEventListener('DOMContentLoaded', () => {
    render();
});