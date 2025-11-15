const currentUser = DB.getCurrentUser();
if (!currentUser || currentUser.role !== 'admin') { alert("Không có quyền!"); window.location.href = 'user_dashboard.html'; }
let allBooks = [];
const modal = document.getElementById('bookModal');
const [titleEl, idEl, nameEl, authEl, pubEl, stockEl, descEl, imgEl] = ['modal-title','book-id','book-name','book-author','book-publisher','book-stock','book-desc','book-img'].map(id => document.getElementById(id));
async function render(data = null) {
    const tbody = document.getElementById('book-list'); if (!tbody) return;
    if (!data) { tbody.innerHTML = '<tr><td colspan="7">Đang tải...</td></tr>'; allBooks = await DB.getBooks(); data = allBooks; }
    tbody.innerHTML = '';
    data.forEach(b => {
        tbody.innerHTML += `<tr><td>#${b.id}</td><td><strong>${b.name}</strong></td><td>${b.author}</td><td>${b.publisher||'-'}</td><td style="color:${b.stock>0?'green':'red'}">${b.stock}</td><td>${b.stock>0?'<span class="status-badge status-ok">Còn hàng</span>':'<span class="status-badge status-low">Hết</span>'}</td><td><button class="action-btn btn-edit" onclick="openModalEdit(${b.id})"><i class="fas fa-pen"></i></button><button class="action-btn btn-delete" onclick="handleDelete(${b.id})"><i class="fas fa-trash"></i></button></td></tr>`;
    });
}
function openModal() { idEl.value=''; nameEl.value=''; authEl.value=''; pubEl.value=''; stockEl.value=''; descEl.value=''; imgEl.value=''; titleEl.innerText="Thêm Sách"; modal.classList.add('active'); }
function openModalEdit(id) {
    const b = allBooks.find(x => x.id === id); if(!b) return;
    idEl.value=b.id; nameEl.value=b.name; authEl.value=b.author; pubEl.value=b.publisher||''; stockEl.value=b.stock; descEl.value=b.description||''; imgEl.value=b.image_url||''; titleEl.innerText="Sửa Sách"; modal.classList.add('active');
}
function closeModal() { modal.classList.remove('active'); }
async function saveBook() {
    const obj = { name: nameEl.value, author: authEl.value, publisher: pubEl.value, stock: parseInt(stockEl.value), description: descEl.value, image_url: imgEl.value };
    if(!obj.name || !obj.author) return alert("Thiếu thông tin!");
    if(idEl.value) { if(await DB.updateBook(idEl.value, obj)) { closeModal(); render(); } } else { await DB.addBook(obj); closeModal(); render(); }
}
async function handleDelete(id) { if(confirm("Xóa?")) { await DB.deleteBook(id); render(); } }
function handleSearch() { const k = document.getElementById('search-input').value.toLowerCase(); render(allBooks.filter(b => b.name.toLowerCase().includes(k) || b.author.toLowerCase().includes(k))); }
document.addEventListener('DOMContentLoaded', () => render());