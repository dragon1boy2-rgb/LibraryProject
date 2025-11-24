// js/admin_users.js

const currentUser = DB.getCurrentUser();
if (!currentUser || currentUser.role !== 'admin') {
    alert("Bạn không có quyền truy cập trang này!");
    window.location.href = 'user_dashboard.html';
}

let allUsers = [];

// DOM Elements cho Modal Thêm/Sửa
const modal = document.getElementById('userModal');
const titleEl = document.getElementById('modal-title');
const idEl = document.getElementById('u-id');
const userEl = document.getElementById('u-username');
const passEl = document.getElementById('u-password');
const nameEl = document.getElementById('u-fullname');
const mailEl = document.getElementById('u-email');
const roleEl = document.getElementById('u-role');
const codeEl = document.getElementById('u-code');
const passHint = document.getElementById('pass-hint');

// DOM Elements cho Modal Chi Tiết
const detailModal = document.getElementById('detailModal');

// Link ảnh mặc định (Avatar nam/nữ hoặc chung)
const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

// 1. RENDER BẢNG NGƯỜI DÙNG
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
        let infoHtml = `<strong>${u.username}</strong>`;

        if (u.role === 'admin') {
            roleBadge = `<span class="status-badge" style="background:#e6f7ff; color:#1890ff; border:1px solid #91d5ff">Admin</span>`;
            infoHtml += `<br>${u.fullname || ''}`;
        } else if (u.role === 'lecturer') {
            roleBadge = `<span class="status-badge" style="background:#fff7e6; color:#faad14; border:1px solid #ffe58f">Giảng Viên</span>`;
            infoHtml += `<br>${u.fullname || ''} <span style="color:#666; font-size:12px">(${u.lecturer_id || 'Chưa có MGV'})</span>`;
        } else {
            roleBadge = `<span class="status-badge" style="background:#f6ffed; color:#52c41a; border:1px solid #b7eb8f">Sinh Viên</span>`;
            infoHtml += `<br>${u.fullname || ''} <span style="color:#666; font-size:12px">(${u.student_id || 'Chưa có MSV'})</span>`;
        }

        tbody.innerHTML += `
            <tr>
                <td>#${u.id}</td>
                <td>${infoHtml}</td>
                <td>${u.email || '-'}</td>
                <td>${roleBadge}</td>
                <td>
                    <button class="action-btn" style="background:#e6f7ff; color:#1890ff;" onclick="openDetail(${u.id})" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
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

// 2. XỬ LÝ MODAL CHI TIẾT (XEM INFO + LỊCH SỬ)
async function openDetail(id) {
    const user = allUsers.find(u => u.id === id);
    if(!user) return;

    // A. Điền thông tin cá nhân và XỬ LÝ ẢNH
    const avatarImg = document.getElementById('d-avatar');
    
    // Nếu có avatar_url thì dùng, không thì dùng mặc định
    if (user.avatar_url && user.avatar_url.trim() !== "") {
        avatarImg.src = user.avatar_url;
    } else {
        avatarImg.src = DEFAULT_AVATAR;
    }
    
    // [QUAN TRỌNG] Nếu link ảnh bị lỗi (404) thì tự động chuyển về ảnh mặc định
    avatarImg.onerror = function() {
        this.src = DEFAULT_AVATAR;
    };

    document.getElementById('d-fullname').innerText = user.fullname || user.username;
    document.getElementById('d-username').innerText = user.username;
    document.getElementById('d-email').innerText = user.email || 'Chưa cập nhật';
    document.getElementById('d-joined').innerText = new Date(user.created_at).toLocaleDateString();

    let roleText = "Độc Giả";
    let codeText = "Không có";
    if(user.role === 'student') { roleText = "Sinh Viên"; codeText = user.student_id || 'Chưa có MSV'; }
    else if(user.role === 'lecturer') { roleText = "Giảng Viên"; codeText = user.lecturer_id || 'Chưa có MGV'; }
    else if(user.role === 'admin') { roleText = "Quản Trị Viên"; codeText = "Admin ID"; }
    
    document.getElementById('d-role').innerText = roleText;
    document.getElementById('d-code').innerText = codeText;

    // B. Lấy và hiển thị lịch sử mượn trả
    const historyList = document.getElementById('d-history-list');
    historyList.innerHTML = '<tr><td colspan="4" style="text-align:center;">Đang tải lịch sử...</td></tr>';
    
    detailModal.classList.add('active'); 

    try {
        const loans = await DB.getMyLoans(user.id); 
        historyList.innerHTML = '';
        
        if (loans.length === 0) {
            historyList.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#888;">Chưa có lịch sử mượn sách.</td></tr>';
        } else {
            loans.forEach(l => {
                let statusBadge = '';
                if(l.status === 'borrowing') statusBadge = '<span class="status-badge" style="background:#e6f7ff; color:#1890ff;">Đang mượn</span>';
                else if(l.status === 'returned') statusBadge = '<span class="status-badge" style="background:#f6ffed; color:#52c41a;">Đã trả</span>';
                else statusBadge = '<span class="status-badge" style="background:#fff7e6; color:#faad14;">Đặt trước</span>';

                const bookName = l.books ? l.books.name : "Sách đã xóa";
                
                historyList.innerHTML += `
                    <tr>
                        <td><strong>${bookName}</strong></td>
                        <td>${new Date(l.borrow_date).toLocaleDateString()}</td>
                        <td>${l.due_date ? new Date(l.due_date).toLocaleDateString() : '-'}</td>
                        <td>${statusBadge}</td>
                    </tr>
                `;
            });
        }
    } catch (e) {
        console.error(e);
        historyList.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Lỗi tải dữ liệu.</td></tr>';
    }
}

function closeDetailModal() {
    detailModal.classList.remove('active');
}

// 3. CÁC HÀM CŨ (THÊM / SỬA / XÓA) - GIỮ NGUYÊN
function openModal() {
    idEl.value = ''; userEl.value = ''; userEl.disabled = false; userEl.style.backgroundColor = "white";
    passEl.value = ''; passEl.placeholder = "Nhập mật khẩu...";
    nameEl.value = ''; mailEl.value = ''; roleEl.value = 'student'; codeEl.value = '';
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
    nameEl.value = user.fullname || ''; mailEl.value = user.email || '';
    roleEl.value = user.role || 'student';
    if(user.role === 'student') codeEl.value = user.student_id || '';
    else if(user.role === 'lecturer') codeEl.value = user.lecturer_id || '';
    else codeEl.value = '';
    passHint.style.display = 'block';
    titleEl.innerText = "Cập Nhật Tài Khoản";
    modal.classList.add('active');
}

function closeModal() { modal.classList.remove('active'); }

async function saveUser() {
    const id = idEl.value;
    const username = userEl.value.trim();
    const password = passEl.value.trim();
    const fullname = nameEl.value.trim();
    const email = mailEl.value.trim();
    const role = roleEl.value;
    const code = codeEl.value.trim();

    if (!username) { alert("Vui lòng nhập tên đăng nhập!"); return; }
    let userData = { fullname, email, role };
    
    if (role === 'student') { userData.student_id = code; userData.lecturer_id = null; } 
    else if (role === 'lecturer') { userData.lecturer_id = code; userData.student_id = null; } 
    else { userData.student_id = null; userData.lecturer_id = null; }

    if (id) {
        if (password !== "") userData.password = password;
        const success = await DB.updateUser(id, userData);
        if (success) { closeModal(); render(); }
    } else {
        if (!password) { alert("Vui lòng nhập mật khẩu!"); return; }
        userData.username = username; userData.password = password;
        const success = await DB.addUser(userData);
        if (success) { closeModal(); render(); }
    }
}

async function handleDelete(id) {
    if (confirm("Xóa tài khoản này?")) { await DB.deleteUser(id); render(); }
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