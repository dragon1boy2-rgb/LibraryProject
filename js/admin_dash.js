// js/admin_dash.js
// --- BẢO VỆ TRANG ADMIN (Dán vào đầu các file js admin) ---
const currentUser = DB.getCurrentUser();
if (!currentUser || currentUser.role !== 'admin') {
    alert("Bạn không có quyền truy cập trang này!");
    window.location.href = 'user_home.html'; // Đá về trang user
}
document.addEventListener('DOMContentLoaded', async () => {
    // Lấy số liệu thống kê từ Database
    const stats = await DB.getStats();
    
    // Gán vào giao diện
    const elUsers = document.getElementById('total-users');
    const elRes = document.getElementById('total-resources');
    
    if(elUsers) elUsers.innerText = stats.users;
    if(elRes) elRes.innerText = stats.resources + stats.books;
});