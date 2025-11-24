// js/admin_loans.js

const currentUser = DB.getCurrentUser();
if (!currentUser || currentUser.role !== 'admin') {
    alert("Không có quyền truy cập!");
    window.location.href = 'user_dashboard.html';
}

let allLoans = [];
let currentFilteredLoans = []; 
let currentPage = 1;
const rowsPerPage = 20; 
const FINE_PER_DAY = 2000;

// --- HÀM HỖ TRỢ: ĐỊNH DẠNG NGÀY VIỆT NAM (dd/mm/yyyy) ---
function formatDateVN(dateString) {
    if (!dateString) return 'N/A';
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return 'Lỗi ngày';
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (e) { return 'Lỗi'; }
}

// 1. RENDER & PHÂN TRANG
async function render(data = null) {
    const tbody = document.getElementById('loan-list');
    if (!tbody) return;

    try {
        if (!data && allLoans.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px">⏳ Đang tải dữ liệu...</td></tr>';
            allLoans = await DB.getAllLoans();
            currentFilteredLoans = allLoans; 
        } else if (data) {
            currentFilteredLoans = data; 
        }

        const totalPages = Math.ceil(currentFilteredLoans.length / rowsPerPage);
        if (currentPage < 1) currentPage = 1;
        if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;

        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const loansToShow = currentFilteredLoans.slice(startIndex, endIndex);

        tbody.innerHTML = '';
        if (loansToShow.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px">Không tìm thấy dữ liệu phù hợp.</td></tr>';
            updatePaginationUI(0);
            return;
        }

        loansToShow.forEach(l => {
            const today = new Date();
            const dueDate = l.due_date ? new Date(l.due_date) : null;
            let isOverdue = false;
            let fineAmount = 0;

            if (l.status === 'borrowing' && dueDate && today > dueDate) {
                isOverdue = true;
                const diffTime = Math.abs(today - dueDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                fineAmount = diffDays * FINE_PER_DAY;
            }

            let statusHtml = '';
            let actionHtml = '';
            let rowStyle = '';

            if (l.status === 'returned') {
                statusHtml = `<span class="status-badge status-ok"><i class="fas fa-check-circle"></i> Đã trả</span>`;
                actionHtml = `<small style="color:#888">Hoàn tất</small>`;
            } else if (l.status === 'reserved') {
                statusHtml = `<span class="status-badge" style="background:#fff7e6; color:#faad14; border:1px solid #ffe58f"><i class="fas fa-clock"></i> Đặt trước</span>`;
                actionHtml = `
                    <button class="action-btn" style="background:#e6f7ff; color:#1890ff; width:auto; padding:5px 10px; font-size:12px;" 
                            onclick="approveSmartLoan(${l.id}, ${l.book_id})" title="Duyệt & Trừ kho">
                        <i class="fas fa-check"></i> Duyệt
                    </button>
                    <button class="action-btn btn-delete" onclick="cancelLoan(${l.id})"><i class="fas fa-times"></i></button>
                `;
            } else { 
                if (isOverdue) {
                    statusHtml = `<span class="status-badge" style="background:#fff1f0; color:red; border:1px solid red"><i class="fas fa-exclamation-triangle"></i> Quá hạn</span>`;
                    rowStyle = 'background-color: #fff1f0;';
                } else {
                    statusHtml = `<span class="status-badge" style="background:#e6f7ff; color:#1890ff; border:1px solid #91d5ff">Đang mượn</span>`;
                }
                actionHtml = `
                    <button class="action-btn" style="background:#f6ffed; color:#52c41a; width:auto; padding:5px 10px;" 
                            onclick="confirmReturn(${l.id}, ${l.book_id}, ${fineAmount})">
                        <i class="fas fa-undo"></i> Trả
                    </button>
                    ${isOverdue ? `<button class="action-btn" style="background:#fffbe6; color:#faad14;" onclick="remindUser('${l.users?.email}')"><i class="fas fa-bell"></i></button>` : ''}
                `;
            }

            const userName = l.users ? (l.users.fullname || l.users.username) : 'User ẩn';
            const bookName = l.books ? l.books.name : 'Sách ẩn';
            
            // Dùng hàm formatDateVN để hiển thị đúng ngày/tháng/năm
            const borrowDateStr = formatDateVN(l.borrow_date);
            const dueDateStr = formatDateVN(l.due_date);
            
            const fineDisplay = fineAmount > 0 ? `<strong style="color:red">${fineAmount.toLocaleString()}đ</strong>` : '-';

            tbody.innerHTML += `
                <tr style="${rowStyle}">
                    <td>#${l.id}</td>
                    <td><strong>${userName}</strong><br><small style="color:#888">${l.users?.student_id || l.users?.lecturer_id || ''}</small></td>
                    <td title="${bookName}">${bookName}</td>
                    <td>
                        <div style="font-size:12px; color:#555;">Mượn: ${borrowDateStr}</div>
                        <div style="font-size:12px; font-weight:bold; color:${isOverdue ? 'red' : '#333'}">Hạn: ${dueDateStr}</div>
                    </td>
                    <td>${statusHtml}</td>
                    <td>${fineDisplay}</td>
                    <td><div style="display:flex; gap:5px;">${actionHtml}</div></td>
                </tr>
            `;
        });
        updatePaginationUI(totalPages);
    } catch (err) {
        console.error("Lỗi Render:", err);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Đã xảy ra lỗi hiển thị: ${err.message}</td></tr>`;
    }
}

function updatePaginationUI(totalPages) {
    const numContainer = document.getElementById('pagination-numbers');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const pagContainer = document.querySelector('.pagination-container');
    
    if (numContainer) numContainer.innerHTML = '';
    
    if (totalPages <= 1) {
        if(pagContainer) pagContainer.style.display = 'none';
        return;
    } else {
        if(pagContainer) pagContainer.style.display = 'flex';
    }

    if(btnPrev) btnPrev.disabled = (currentPage === 1);
    if(btnNext) btnNext.disabled = (currentPage === totalPages);

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.className = `page-number ${i === currentPage ? 'active' : ''}`;
        btn.innerText = i;
        btn.onclick = () => { currentPage = i; render(currentFilteredLoans); };
        numContainer.appendChild(btn);
    }
}

function changePage(direction) {
    currentPage += direction;
    render(currentFilteredLoans);
}

function handleSearch() {
    // [SAFE MODE] Kiểm tra xem element có tồn tại không trước khi lấy value
    const searchEl = document.getElementById('search-input');
    const statusEl = document.getElementById('filter-status');
    const startEl = document.getElementById('start-date');
    const endEl = document.getElementById('end-date');

    const keyword = searchEl ? searchEl.value.toLowerCase() : '';
    const statusFilter = statusEl ? statusEl.value : 'all';
    const startDateVal = startEl ? startEl.value : null;
    const endDateVal = endEl ? endEl.value : null;

    const today = new Date();
    const start = startDateVal ? new Date(startDateVal) : null;
    if(start) start.setHours(0,0,0,0);
    const end = endDateVal ? new Date(endDateVal) : null;
    if(end) end.setHours(23,59,59,999);

    const filtered = allLoans.filter(l => {
        const uName = l.users ? (l.users.fullname || l.users.username).toLowerCase() : '';
        const bName = l.books ? l.books.name.toLowerCase() : '';
        const matchKeyword = uName.includes(keyword) || bName.includes(keyword);

        let matchStatus = true;
        if (statusFilter === 'all') matchStatus = true;
        else if (statusFilter === 'overdue') {
            const dueDate = l.due_date ? new Date(l.due_date) : null;
            matchStatus = l.status === 'borrowing' && dueDate && today > dueDate;
        } else {
            matchStatus = l.status === statusFilter;
        }

        let matchDate = true;
        if (start || end) {
            const borrowDate = new Date(l.borrow_date);
            if (start && borrowDate < start) matchDate = false;
            if (end && borrowDate > end) matchDate = false;
        }

        return matchKeyword && matchStatus && matchDate;
    });

    currentPage = 1;
    render(filtered);
}

async function approveSmartLoan(loanId, bookId) {
    if(!confirm("Hệ thống sẽ kiểm tra kho và duyệt yêu cầu này?")) return;
    const { data: book, error } = await DB.supabase.from('books').select('stock, name').eq('id', bookId).single();
    if (error || !book) { alert("Lỗi: Không tìm thấy sách!"); return; }
    if (book.stock <= 0) { alert(`❌ Sách "${book.name}" hết hàng!`); return; }

    const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 14);
    await DB.supabase.from('loans').update({ status: 'borrowing', borrow_date: new Date().toISOString(), due_date: dueDate.toISOString() }).eq('id', loanId);
    await DB.supabase.from('books').update({ stock: book.stock - 1 }).eq('id', bookId);
    
    alert(`✅ Đã duyệt mượn sách: ${book.name}`);
    allLoans = await DB.getAllLoans(); 
    handleSearch();
}

async function confirmReturn(loanId, bookId, fine) {
    let msg = "Xác nhận nhận lại sách này?";
    if (fine > 0) msg += `\n⚠️ Khách bị phạt: ${fine.toLocaleString()}đ. Thu tiền trước khi xác nhận.`;
    if(confirm(msg)) {
        const success = await DB.returnBook(loanId, bookId);
        if(success) {
            alert("Đã trả sách thành công!");
            allLoans = await DB.getAllLoans(); 
            handleSearch();
        } else {
            alert("Lỗi hệ thống!");
        }
    }
}

async function cancelLoan(loanId) {
    if(confirm("Hủy yêu cầu đặt trước này?")) {
        await DB.supabase.from('loans').delete().eq('id', loanId);
        allLoans = await DB.getAllLoans(); 
        handleSearch();
    }
}

function remindUser(email) {
    if(!email) alert("Tài khoản này không có email!");
    else alert(`📧 Đã gửi email nhắc nhở tới: ${email}`);
}

function exportToExcel() {
    alert("Đang xuất file Excel danh sách hiện tại...");
}

document.addEventListener('DOMContentLoaded', () => render());