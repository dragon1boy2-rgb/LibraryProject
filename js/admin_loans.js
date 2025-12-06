// js/admin_loans.js

const currentUser = DB.getCurrentUser();
if (!currentUser || currentUser.role !== 'admin') {
    window.location.href = 'user_dashboard.html';
}

// Biến toàn cục
let selectedBooks = []; 
let allBooksCache = [];

document.addEventListener('DOMContentLoaded', () => {
    initBorrowTab();
    initReturnTab();
    
    // Set ngày mặc định
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('b-date').value = today;
    document.getElementById('r-date').value = today;
    
    // Set hạn trả mặc định (14 ngày sau)
    const due = new Date(); due.setDate(due.getDate() + 14);
    document.getElementById('b-due').value = due.toISOString().split('T')[0];
});

// --- CHUYỂN TAB (Đã thêm phần Fine) ---
function switchSection(type) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.form-section').forEach(sec => sec.classList.remove('active'));

    if (type === 'borrow') {
        document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
        document.getElementById('section-borrow').classList.add('active');
        initBorrowTab();
    } else if (type === 'return') {
        document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
        document.getElementById('section-return').classList.add('active');
        initReturnTab();
    } else {
        // TAB PHẠT
        document.querySelector('.tab-btn:nth-child(3)').classList.add('active');
        document.getElementById('section-fine').classList.add('active');
        initFineTab();
    }
}

// ============================================
// PHẦN 1: QUẢN LÝ PHIẾU MƯỢN
// ============================================

async function initBorrowTab() {
    const users = await DB.getUsers();
    const userSelect = document.getElementById('b-user');
    userSelect.innerHTML = '<option value="">-- Chọn Độc Giả --</option>';
    users.forEach(u => {
        userSelect.innerHTML += `<option value="${u.id}">${u.fullname || u.username} (${u.role})</option>`;
    });
    renderLoanCards();
}

async function openBookSelector() {
    const modal = document.getElementById('bookSelectorModal');
    const list = document.getElementById('modal-book-list');
    if (allBooksCache.length === 0) allBooksCache = await DB.getBooks();
    
    list.innerHTML = '';
    const availableBooks = allBooksCache.filter(b => b.stock > 0); 
    availableBooks.forEach(b => {
        const isChecked = selectedBooks.some(sb => sb.id === b.id) ? 'checked' : '';
        list.innerHTML += `<div style="padding: 5px; border-bottom: 1px solid #f0f0f0; display:flex; align-items:center;"><input type="checkbox" class="book-chk" value="${b.id}" data-name="${b.name}" ${isChecked} style="margin-right: 10px;"><span>${b.name} (Còn: ${b.stock})</span></div>`;
    });
    modal.classList.add('active');
}

function closeBookSelector() { document.getElementById('bookSelectorModal').classList.remove('active'); }

function filterBooksInModal() {
    const k = document.getElementById('search-book-modal').value.toLowerCase();
    document.querySelectorAll('#modal-book-list div').forEach(div => {
        div.style.display = div.innerText.toLowerCase().includes(k) ? 'flex' : 'none';
    });
}

function confirmBookSelection() {
    selectedBooks = [];
    document.querySelectorAll('.book-chk:checked').forEach(chk => {
        selectedBooks.push({ id: parseInt(chk.value), name: chk.getAttribute('data-name') });
    });
    
    const preview = document.getElementById('b-selected-books');
    const countInput = document.getElementById('b-count');
    
    if (selectedBooks.length === 0) {
        preview.innerHTML = '<span style="color:#999; font-style:italic;">Chưa chọn sách nào...</span>';
        countInput.value = 0;
    } else {
        preview.innerHTML = selectedBooks.map(b => `<span class="selected-tag">${b.name}</span>`).join('');
        countInput.value = selectedBooks.length;
    }
    closeBookSelector();
}

async function createLoanSlip() {
    const userId = document.getElementById('b-user').value;
    const borrowDate = document.getElementById('b-date').value;
    const dueDate = document.getElementById('b-due').value;

    if (!userId) { alert("Vui lòng chọn người mượn!"); return; }
    if (selectedBooks.length === 0) { alert("Vui lòng chọn ít nhất 1 cuốn sách!"); return; }

    let successCount = 0;
    for (const book of selectedBooks) {
        const loanData = {
            user_id: userId,
            book_id: book.id,
            status: 'borrowing',
            borrow_date: new Date(borrowDate).toISOString(),
            due_date: new Date(dueDate).toISOString()
        };

        const { error } = await DB.supabase.from('loans').insert([loanData]);
        if (!error) {
             const { data: b } = await DB.supabase.from('books').select('stock').eq('id', book.id).single();
             await DB.supabase.from('books').update({ stock: b.stock - 1 }).eq('id', book.id);
             successCount++;
        }
    }

    if (successCount > 0) {
        alert(`✅ Đã tạo phiếu mượn thành công cho ${successCount} sách!`);
        selectedBooks = [];
        document.getElementById('b-selected-books').innerHTML = '...';
        document.getElementById('b-count').value = 0;
        renderLoanCards(); 
    }
}

async function renderLoanCards() {
    const container = document.getElementById('loan-card-list');
    const loans = await DB.getAllLoans();
    const activeLoans = loans.filter(l => l.status === 'borrowing' || l.status === 'overdue');
    
    container.innerHTML = '';
    activeLoans.slice(0, 6).forEach(l => {
        const uName = l.users ? (l.users.fullname || l.users.username) : 'N/A';
        const bName = l.books ? l.books.name : 'N/A';
        const date = new Date(l.borrow_date).toLocaleDateString();
        
        container.innerHTML += `<div class="loan-card"><div style="font-weight:bold; color:#1890ff; margin-bottom:5px;">Phiếu #${l.id}</div><div><strong>${uName}</strong></div><div style="color:#666; font-size:13px; margin: 5px 0;">Sách: ${bName}</div><div style="font-size:12px; color:#888;">Ngày mượn: ${date}</div></div>`;
    });
}

// ============================================
// PHẦN 2: QUẢN LÝ PHIẾU TRẢ
// ============================================

async function initReturnTab() {
    const loans = await DB.getAllLoans();
    const borrowingLoans = loans.filter(l => l.status === 'borrowing' || l.status === 'overdue');
    
    const select = document.getElementById('r-loan-id');
    select.innerHTML = '<option value="">-- Chọn phiếu mượn --</option>';
    borrowingLoans.forEach(l => {
        const uName = l.users ? (l.users.fullname || l.users.username) : 'User';
        const bName = l.books ? l.books.name : 'Book';
        select.innerHTML += `<option value="${l.id}">#${l.id} - ${bName} (${uName})</option>`;
    });
    renderReturnTable();
}

async function createReturnSlip() {
    const loanId = document.getElementById('r-loan-id').value;
    if (!loanId) { alert("Vui lòng chọn phiếu mượn!"); return; }
    const loans = await DB.getAllLoans();
    const loan = loans.find(l => l.id == loanId);

    if (loan) {
        if (await DB.returnBook(loanId, loan.book_id)) {
            alert("✅ Đã tạo phiếu trả thành công!");
            initReturnTab();
        } else alert("Lỗi khi trả sách!");
    }
}

async function renderReturnTable() {
    const tbody = document.getElementById('return-table-body');
    const loans = await DB.getAllLoans();
    const returnedLoans = loans.filter(l => l.status === 'returned');
    
    tbody.innerHTML = '';
    returnedLoans.slice(0, 10).forEach(l => {
        const bName = l.books ? l.books.name : 'N/A';
        const uName = l.users ? l.users.username : 'N/A';
        const rDate = l.return_date ? new Date(l.return_date).toLocaleDateString() : 'N/A';
        tbody.innerHTML += `<tr><td>${l.id}</td><td><strong>${bName}</strong><br><small>Người trả: ${uName}</small></td><td>${rDate}</td><td><button class="action-btn btn-edit">Sửa</button></td></tr>`;
    });
}

// ============================================
// PHẦN 3: QUẢN LÝ PHIẾU PHẠT (MỚI)
// ============================================

async function initFineTab() {
    const tbody = document.getElementById('fine-list');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">⏳ Đang tính toán dữ liệu phạt...</td></tr>';

    const overdueLoans = await DB.getOverdueLoans();
    
    tbody.innerHTML = '';
    if (overdueLoans.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: green;"><i class="fas fa-check-circle"></i> Không có phiếu phạt nào chưa thanh toán.</td></tr>';
        return;
    }

    const today = new Date();
    const FINE_PER_DAY = 5000;

    overdueLoans.forEach(l => {
        const dueDate = new Date(l.due_date);
        const diffTime = Math.abs(today - dueDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        const fineAmount = diffDays * FINE_PER_DAY;
        const uName = l.users ? (l.users.fullname || l.users.username) : 'N/A';
        const bName = l.books ? l.books.name : 'N/A';

        tbody.innerHTML += `
            <tr>
                <td>#${l.id}</td>
                <td>${uName}<br><small style="color:#888">ID: ${l.user_id}</small></td>
                <td>${bName}</td>
                <td style="color:red; font-weight:bold;">${diffDays} ngày</td>
                <td style="color:#d32f2f; font-weight:bold;">${fineAmount.toLocaleString()} đ</td>
                <td><span class="status-badge" style="background:#fff1f0; color:#f5222d; border:1px solid #ffa39e">Chưa nộp</span></td>
            </tr>
        `;
    });
}