// js/admin_users.js
// --- BẢO VỆ TRANG ADMIN (Dán vào đầu các file js admin) ---
const currentUser = DB.getCurrentUser();
if (!currentUser || currentUser.role !== 'admin') {
    alert("Bạn không có quyền truy cập trang này!");
    window.location.href = 'user_dashboard.html'; // Đá về trang user
}
async function render() {
    const tbody = document.querySelector('.data-table tbody');
    if(!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px">⏳ Đang tải dữ liệu...</td></tr>';
    const list = await DB.getUsers();
    tbody.innerHTML = '';

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Chưa có tài khoản nào.</td></tr>';
        return;
    }

    list.forEach(u => {
        tbody.innerHTML += `
            <tr>
                <td>${u.id}</td>
                <td><strong>${u.username}</strong></td>
                <td>${u.fullname || ''}</td>
                <td>${u.email || ''}</td>
                <td><span class="tag ${u.role === 'admin' ? 'tag-purple' : 'tag-blue'}">${u.role}</span></td>
                <td>
                    <button onclick="handleDel(${u.id})" class="btn-del"><i class="fas fa-trash"></i> Xóa</button>
                </td>
            </tr>
        `;
    });
}

async function handleAdd() {
    const username = prompt("Nhập Tên đăng nhập:");
    if (!username) return;
    const password = prompt("Nhập Mật khẩu:");
    const fullname = prompt("Nhập Họ tên:");
    const email = prompt("Nhập Email:");
    
    if (username && password) {
        await DB.addUser({ username, password, fullname, email, role: 'user' });
        render();
    }
}

async function handleDel(id) {
    if(confirm("Xóa tài khoản này?")) {
        await DB.deleteUser(id);
        render();
    }
}

document.addEventListener('DOMContentLoaded', render);