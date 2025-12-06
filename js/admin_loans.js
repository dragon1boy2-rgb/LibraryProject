// js/admin_loans.js

const currentUser = DB.getCurrentUser();
if (!currentUser || currentUser.role !== 'admin') {
    window.location.href = 'user_dashboard.html';
}

// Biến toàn cục
let selectedBooks = []; // Lưu các sách đang chọn trong form mượn
let allBooksCache = []; // Cache danh sách sách để chọn

document.addEventListener('DOMContentLoaded', () => {
    initBorrowTab();
    initReturnTab();
    
    // Set ngày mặc định là hôm nay
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('b-date').value = today;
    document.getElementById('r-date').value = today;
    
    // Set hạn trả mặc định (14 ngày sau)
    const due = new Date(); due.setDate(due.getDate() + 14);
    document.getElementById('b-due').value = due.toISOString().split('T')[0];
});

// --- CHUYỂN TAB ---
function switchSection(type) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.form-section').forEach(sec => sec.classList.remove('active'));

    if (type === 'borrow') {
        document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
        document.getElementById('section-borrow').classList.add('active');
        initBorrowTab();
    } else {
        document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
        document.getElementById('section-return').classList.add('active');
        initReturnTab();
    }
}

// ============================================
// PHẦN 1: QUẢN LÝ PHIẾU MƯỢN
// ============================================

async function initBorrowTab() {
    // 1. Load danh sách User vào dropdown
    const users = await DB.getUsers();
    const userSelect = document.getElementById('b-user');
    userSelect.innerHTML = '<option value="">-- Chọn Độc Giả --</option>';
    users.forEach(u => {
        userSelect.innerHTML += `<option value="${u.id}">${u.fullname || u.username} (${u.role})</option>`;
    });

    // 2. Load danh sách phiếu mượn gần đây (Cards)
    renderLoanCards();
}

// --- MODAL CHỌN SÁCH ---
async function openBookSelector() {
    const modal = document.getElementById('bookSelectorModal');
    const list = document.getElementById('modal-book-list');
    
    // Load sách nếu chưa có
    if (allBooksCache.length === 0) allBooksCache = await DB.getBooks();
    
    // Render list checkbox
    list.innerHTML = '';
    const availableBooks = allBooksCache.filter(b => b.stock > 0); // Chỉ hiện sách còn hàng

    availableBooks.forEach(b => {
        const isChecked = selectedBooks.some(sb => sb.id === b.id) ? 'checked' : '';
        list.innerHTML += `
            <div style="padding: 5px; border-bottom: 1px solid #f0f0f0; display:flex; align-items:center;">
                <input type="checkbox" class="book-chk" value="${b.id}" data-name="${b.name}" ${isChecked} style="margin-right: 10px;">
                <span>${b.name} (Còn: ${b.stock})</span>
            </div>
        `;
    });
    
    modal.classList.add('active');
}

function closeBookSelector() {
    document.getElementById('bookSelectorModal').classList.remove('active');
}

function filterBooksInModal() {
    const k = document.getElementById('search-book-modal').value.toLowerCase();
    const items = document.querySelectorAll('#modal-book-list div');
    items.forEach(div => {
        const text = div.innerText.toLowerCase();
        div.style.display = text.includes(k) ? 'flex' : 'none';
    });
}

function confirmBookSelection() {
    const checkboxes = document.querySelectorAll('.book-chk:checked');
    selectedBooks = [];
    checkboxes.forEach(chk => {
        selectedBooks.push({
            id: parseInt(chk.value),
            name: chk.getAttribute('data-name')
        });
    });
    
    // Update UI Form
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

// --- TẠO PHIẾU MƯỢN ---
async function createLoanSlip() {
    const userId = document.getElementById('b-user').value;
    const borrowDate = document.getElementById('b-date').value;
    const dueDate = document.getElementById('b-due').value;

    if (!userId) { alert("Vui lòng chọn người mượn!"); return; }
    if (selectedBooks.length === 0) { alert("Vui lòng chọn ít nhất 1 cuốn sách!"); return; }

    // Giả lập tạo phiếu: Thực tế DB của bạn lưu từng dòng loan, nên ta sẽ loop insert
    // (Ở hệ thống thật có thể có bảng LoanSlip riêng, nhưng ở đây ta dùng cấu trúc hiện có)
    
    let successCount = 0;
    for (const book of selectedBooks) {
        // Gọi hàm borrowBook của DB (chế độ Mock hoặc Real đều OK)
        // Lưu ý: Ta cần custom lại hàm borrowBook hoặc gọi trực tiếp insert để set ngày custom
        
        // Vì DB.borrowBook mặc định lấy ngày hiện tại, ta sẽ gọi trực tiếp insert vào bảng loans (nếu dùng Supabase thật)
        // Hoặc dùng DB.borrowBook và chấp nhận ngày hiện tại. 
        // Để đúng yêu cầu "Ngày mượn" custom, ta giả lập insert object:
        
        const loanData = {
            user_id: userId,
            book_id: book.id,
            status: 'borrowing',
            borrow_date: new Date(borrowDate).toISOString(),
            due_date: new Date(dueDate).toISOString()
        };

        if (DB.supabase) {
             const { error } = await DB.supabase.from('loans').insert([loanData]);
             if (!error) {
                 // Trừ kho
                 const { data: b } = await DB.supabase.from('books').select('stock').eq('id', book.id).single();
                 await DB.supabase.from('books').update({ stock: b.stock - 1 }).eq('id', book.id);
                 successCount++;
             }
        } else {
            // Mock Data
            loanData.id = Date.now() + Math.random();
            // Hàm borrowBook Mock không hỗ trợ custom date, nên ta push thẳng vào mảng mock nếu cần
            // Nhưng để đơn giản, ta gọi DB.borrowBook
            await DB.borrowBook(userId, book.id, 'borrowing');
            successCount++;
        }
    }

    if (successCount > 0) {
        alert(`✅ Đã tạo phiếu mượn thành công cho ${successCount} sách!`);
        // Reset form
        selectedBooks = [];
        document.getElementById('b-selected-books').innerHTML = '...';
        document.getElementById('b-count').value = 0;
        renderLoanCards(); // Reload list
    }
}

async function renderLoanCards() {
    const container = document.getElementById('loan-card-list');
    const loans = await DB.getAllLoans();
    const activeLoans = loans.filter(l => l.status === 'borrowing' || l.status === 'overdue');
    
    container.innerHTML = '';
    // Group by User or Date để hiển thị đẹp hơn (tùy chọn), ở đây hiển thị list mới nhất
    activeLoans.slice(0, 6).forEach(l => {
        const uName = l.users ? (l.users.fullname || l.users.username) : 'N/A';
        const bName = l.books ? l.books.name : 'N/A';
        const date = new Date(l.borrow_date).toLocaleDateString();
        
        container.innerHTML += `
            <div class="loan-card">
                <div style="font-weight:bold; color:#1890ff; margin-bottom:5px;">Phiếu #${l.id}</div>
                <div><strong>${uName}</strong></div>
                <div style="color:#666; font-size:13px; margin: 5px 0;">Sách: ${bName}</div>
                <div style="font-size:12px; color:#888;">Ngày mượn: ${date}</div>
            </div>
        `;
    });
}


// ============================================
// PHẦN 2: QUẢN LÝ PHIẾU TRẢ
// ============================================

async function initReturnTab() {
    // Load danh sách sách ĐANG MƯỢN vào dropdown
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
    const returnDate = document.getElementById('r-date').value;

    if (!loanId) { alert("Vui lòng chọn phiếu mượn!"); return; }

    // Tìm thông tin để lấy bookId (cho việc cộng lại kho)
    const loans = await DB.getAllLoans();
    const loan = loans.find(l => l.id == loanId);

    if (loan) {
        // Thực hiện trả sách
        const success = await DB.returnBook(loanId, loan.book_id);
        if (success) {
            alert("✅ Đã tạo phiếu trả thành công!");
            initReturnTab(); // Reload dropdown & table
        } else {
            alert("Lỗi khi trả sách!");
        }
    }
}

async function renderReturnTable() {
    const tbody = document.getElementById('return-table-body');
    const loans = await DB.getAllLoans();
    // Lọc những phiếu đã trả (status = returned)
    const returnedLoans = loans.filter(l => l.status === 'returned');
    
    tbody.innerHTML = '';
    returnedLoans.slice(0, 10).forEach(l => {
        const bName = l.books ? l.books.name : 'N/A';
        const uName = l.users ? l.users.username : 'N/A';
        const rDate = l.return_date ? new Date(l.return_date).toLocaleDateString() : 'N/A';
        
        tbody.innerHTML += `
            <tr>
                <td>${l.id}</td>
                <td>
                    <strong>${bName}</strong><br>
                    <small>Người trả: ${uName}</small>
                </td>
                <td>${rDate}</td>
                <td>
                    <button class="action-btn btn-edit"><i class="fas fa-pen"></i> Sửa</button>
                    <button class="action-btn btn-delete"><i class="fas fa-trash"></i> Xóa</button>
                </td>
            </tr>
        `;
    });
}