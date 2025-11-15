const currentUser = DB.getCurrentUser();
if (!currentUser) window.location.href = 'login.html';
document.getElementById('welcome-user').innerText = currentUser.fullname || currentUser.username;
let allBooks = [];
function switchTab(tabName, element) {
    document.querySelectorAll('.tab-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sidebar .menu li').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tabName).classList.add('active');
    element.classList.add('active');
    document.getElementById('page-title').innerText = element.innerText;
    if(tabName === 'library') renderLibrary();
    if(tabName === 'loans') renderLoans();
    if(tabName === 'home') loadStats();
}
async function loadStats() {
    const stats = await DB.getUserStats(currentUser.id);
    document.getElementById('stat-borrowing').innerText = stats.borrowing;
    document.getElementById('stat-reserved').innerText = stats.reserved;
    document.getElementById('stat-fine').innerText = stats.fine.toLocaleString() + ' đ';
}
async function renderLibrary() {
    const grid = document.getElementById('library-grid');
    const keyword = document.getElementById('search-book').value.toLowerCase();
    if (allBooks.length === 0) allBooks = await DB.getBooks();
    const filtered = allBooks.filter(b => b.name.toLowerCase().includes(keyword) || b.author.toLowerCase().includes(keyword));
    grid.innerHTML = '';
    if(filtered.length === 0) { grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #888;">Không tìm thấy sách nào.</p>'; return; }
    filtered.forEach(b => {
        const imgUrl = b.image_url || `https://via.placeholder.com/200x300?text=${encodeURIComponent(b.name)}`;
        let badge = b.stock > 0 ? '<span class="tag tag-blue">Sẵn sàng</span>' : '<span class="tag tag-red">Hết hàng</span>';
        grid.innerHTML += `<div class="book-item" onclick="openDetail(${b.id})"><img src="${imgUrl}" class="book-img"><div class="book-info"><h4>${b.name}</h4><p>${b.author}</p>${badge}</div></div>`;
    });
}
const modal = document.getElementById('detailModal');
let currentBookId = null;
function openDetail(id) {
    const book = allBooks.find(b => b.id === id); if(!book) return;
    currentBookId = book.id;
    document.getElementById('d-img').src = book.image_url || `https://via.placeholder.com/200x300?text=${encodeURIComponent(book.name)}`;
    document.getElementById('d-name').innerText = book.name;
    document.getElementById('d-author').innerText = book.author;
    document.getElementById('d-pub').innerText = book.publisher || 'Đang cập nhật';
    document.getElementById('d-desc').innerText = book.description || 'Chưa có mô tả.';
    const btn = document.getElementById('btn-action');
    const stockEl = document.getElementById('d-stock');
    if (book.stock > 0) { stockEl.innerText = `Còn ${book.stock} cuốn`; stockEl.style.color = 'green'; btn.innerText = "Mượn Sách Ngay"; btn.style.background = '#1890ff'; btn.onclick = () => handleAction('borrowing'); } 
    else { stockEl.innerText = "Hết hàng"; stockEl.style.color = 'red'; btn.innerText = "Đặt Trước"; btn.style.background = '#faad14'; btn.onclick = () => handleAction('reserved'); }
    modal.classList.add('active');
}
function closeModal() { modal.classList.remove('active'); }
async function handleAction(type) {
    if(!confirm(type === 'borrowing' ? "Xác nhận mượn?" : "Đặt trước?")) return;
    const result = await DB.borrowBook(currentUser.id, currentBookId, type);
    if(result.success) { alert("Thành công!"); closeModal(); allBooks = []; renderLibrary(); } else { alert("Lỗi: " + result.message); }
}
async function renderLoans() {
    const tbody = document.getElementById('loan-list'); tbody.innerHTML = '<tr><td colspan="5">Đang tải...</td></tr>';
    const loans = await DB.getMyLoans(currentUser.id); tbody.innerHTML = '';
    if(loans.length === 0) { tbody.innerHTML = '<tr><td colspan="5">Chưa mượn sách nào.</td></tr>'; return; }
    loans.forEach(l => {
        let badge = l.status==='borrowing'?'<span class="tag tag-blue">Đang mượn</span>':(l.status==='returned'?'<span class="tag" style="background:#ccc">Đã trả</span>':'<span class="tag tag-purple">Đặt trước</span>');
        let action = l.status==='borrowing' ? `<button class="btn-del" style="color:#1890ff; border:1px solid #1890ff" onclick="handleReturn(${l.id}, ${l.book_id})">Trả</button>` : '-';
        tbody.innerHTML += `<tr><td><strong>${l.books?.name}</strong></td><td>${new Date(l.borrow_date).toLocaleDateString()}</td><td>${l.due_date?new Date(l.due_date).toLocaleDateString():'-'}</td><td>${badge}</td><td>${action}</td></tr>`;
    });
}
async function handleReturn(loanId, bookId) { if(confirm("Trả sách?")) { if(await DB.returnBook(loanId, bookId)) { alert("Đã trả!"); renderLoans(); } else alert("Lỗi!"); } }
document.addEventListener('DOMContentLoaded', () => { loadStats(); });