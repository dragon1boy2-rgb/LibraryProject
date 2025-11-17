// js/admin_loans.js

// 1. Bảo vệ trang Admin
const currentUser = DB.getCurrentUser();
if (!currentUser || currentUser.role !== 'admin') {
    alert("Không có quyền truy cập!");
    window.location.href = 'user_dashboard.html';
}

let allLoans = [];

// 2. Render bảng
async function render(data = null) {
    const tbody = document.getElementById('loan-list');
    if (!tbody) return;

    if (!data) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px">⏳ Đang tải dữ liệu...</td></tr>';
        allLoans = await DB.getAllLoans();
        data = allLoans;
    }

    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px">Chưa có dữ liệu mượn trả.</td></tr>';
        return;
    }

    data.forEach(l => {
        // Xử lý badge trạng thái
        let statusHtml = '';
        let actionHtml = '-';

        // Tính toán ngày quá hạn (nếu cần)
        const today = new Date();
        const dueDate = l.due_date ? new Date(l.due_date) : null;
        const isOverdue = dueDate && today > dueDate && l.status === 'borrowing';

        if (l.status === 'borrowing') {
            if (isOverdue) {
                statusHtml = `<span class="status-badge" style="background:#fff1f0; color:red; border:1px solid red">Quá hạn</span>`;
            } else {
                statusHtml = `<span class="status-badge" style="background:#e6f7ff; color:#1890ff; border:1px solid #91d5ff">Đang mượn</span>`;
            }
            // Nút xác nhận trả sách
            actionHtml = `
                <button class="action-btn" style="background:#f6ffed; color:#52c41a; width:auto; padding:0 10px;" 
                        onclick="confirmReturn(${l.id}, ${l.book_id})" title="Xác nhận đã trả sách">
                    <i class="fas fa-check"></i> Đã trả
                </button>`;
        } else if (l.status === 'returned') {
            statusHtml = `<span class="status-badge" style="background:#f6ffed; color:#52c41a; border:1px solid #b7eb8f">Đã trả</span>`;
            // Có thể hiện ngày trả thực tế
            const returnDate = new Date(l.return_date).toLocaleDateString();
            actionHtml = `<small style="color:#888">Trả ngày: ${returnDate}</small>`;
        } else if (l.status === 'reserved') {
            statusHtml = `<span class="status-badge" style="background:#fff7e6; color:#faad14; border:1px solid #ffe58f">Đặt trước</span>`;
            actionHtml = `
                <button class="action-btn" style="background:#e6f7ff; color:#1890ff; width:auto; padding:0 10px;" 
                        onclick="approveLoan(${l.id}, ${l.book_id})">
                    <i class="fas fa-hand-holding-book"></i> Cho mượn
                </button>`;
        }

        // Xử lý tên người và sách (đề phòng bị xóa)
        const userName = l.users ? (l.users.fullname || l.users.username) : 'User đã xóa';
        const bookName = l.books ? l.books.name : 'Sách đã xóa';

        tbody.innerHTML += `
            <tr>
                <td>#${l.id}</td>
                <td><strong>${userName}</strong></td>
                <td>${bookName}</td>
                <td>${new Date(l.borrow_date).toLocaleDateString()}</td>
                <td>${l.due_date ? new Date(l.due_date).toLocaleDateString() : '-'}</td>
                <td>${statusHtml}</td>
                <td>${actionHtml}</td>
            </tr>
        `;
    });
}

// 3. Xử lý Trả sách
async function confirmReturn(loanId, bookId) {
    if(confirm("Xác nhận độc giả đã trả cuốn sách này? Kho sách sẽ được cộng thêm 1.")) {
        const success = await DB.returnBook(loanId, bookId);
        if(success) {
            alert("Cập nhật thành công!");
            render(); // Tải lại bảng
        } else {
            alert("Lỗi hệ thống!");
        }
    }
}

// 4. (Nâng cao) Xử lý Duyệt đặt trước thành Đang mượn
async function approveLoan(loanId, bookId) {
    // Logic này có thể tái sử dụng hàm borrowBook hoặc update status thủ công
    // Ở đây ta update status thành 'borrowing'
    if(confirm("Xác nhận cho độc giả mượn cuốn sách đã đặt này?")) {
        // Gọi API update status (Bạn có thể thêm hàm này vào data.js nếu muốn clean code)
        // Hoặc gọi trực tiếp _supabase ở đây (nhưng tốt nhất nên dùng data.js)
        // Tạm thời ta sẽ alert hướng dẫn
        alert("Chức năng duyệt đặt trước đang phát triển. Bạn có thể yêu cầu User hủy đặt và mượn lại.");
    }
}

// 5. Tìm kiếm & Lọc
function handleSearch() {
    const keyword = document.getElementById('search-input').value.toLowerCase();
    const statusFilter = document.getElementById('filter-status').value;

    const filtered = allLoans.filter(l => {
        const uName = l.users ? (l.users.fullname || l.users.username).toLowerCase() : '';
        const bName = l.books ? l.books.name.toLowerCase() : '';
        
        const matchKeyword = uName.includes(keyword) || bName.includes(keyword);
        const matchStatus = statusFilter === 'all' || l.status === statusFilter;

        return matchKeyword && matchStatus;
    });

    render(filtered);
}

document.addEventListener('DOMContentLoaded', () => render());