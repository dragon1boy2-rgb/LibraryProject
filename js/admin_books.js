// js/admin_books.js

const currentUser = DB.getCurrentUser();
if (!currentUser || currentUser.role !== 'admin') { alert("Không có quyền!"); window.location.href = 'user_dashboard.html'; }

let allBooks = [];
const modal = document.getElementById('bookModal');
const [titleEl, idEl, nameEl, authEl, pubEl, stockEl, descEl, imgEl] = ['modal-title','book-id','book-name','book-author','book-publisher','book-stock','book-desc','book-img'].map(id => document.getElementById(id));

async function render(data = null) {
    const tbody = document.getElementById('book-list'); if (!tbody) return;
    if (!data) { tbody.innerHTML = '<tr><td colspan="7">Đang tải...</td></tr>'; allBooks = await DB.getBooks(); data = allBooks; }
    tbody.innerHTML = '';
    if(data.length === 0) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Kho sách trống. Hãy bấm "Nhập từ Google" để thêm nhanh.</td></tr>'; return; }
    
    data.forEach(b => {
        tbody.innerHTML += `<tr><td>#${b.id}</td><td><strong>${b.name}</strong></td><td>${b.author}</td><td>${b.publisher||'-'}</td><td style="color:${b.stock>0?'green':'red'}">${b.stock}</td><td>${b.stock>0?'<span class="status-badge status-ok">Còn hàng</span>':'<span class="status-badge status-low">Hết</span>'}</td><td><button class="action-btn btn-edit" onclick="openModalEdit(${b.id})"><i class="fas fa-pen"></i></button><button class="action-btn btn-delete" onclick="handleDelete(${b.id})"><i class="fas fa-trash"></i></button></td></tr>`;
    });
}

// --- HÀM NHẬP SÁCH TỰ ĐỘNG (Gắn vào nút bấm mới) ---
async function importBooksFromGoogle() {
    const keyword = prompt("Nhập chủ đề sách bạn muốn nhập về kho (Ví dụ: Truyện Nguyễn Nhật Ánh, Sách Kinh Tế, Harry Potter...):", "Sách hay nên đọc");
    if(!keyword) return;

    const btn = document.querySelector('button[onclick="importBooksFromGoogle()"]');
    const oldText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang nhập...';
    btn.disabled = true;

    try {
        // 1. Tìm sách từ Google
        const results = await DB.searchGoogleBooks(keyword);
        if(results.length === 0) { alert("Không tìm thấy sách nào trên Google với từ khóa này!"); return; }

        // 2. Hỏi xác nhận
        if(confirm(`Tìm thấy ${results.length} cuốn sách về "${keyword}". Bạn có muốn nhập tất cả vào kho không?`)) {
            let count = 0;
            for(let book of results) {
                const newBook = {
                    name: book.name,
                    author: book.author,
                    publisher: book.publisher,
                    stock: Math.floor(Math.random() * 10) + 3, // Random số lượng 3-12 cuốn
                    description: book.description,
                    image_url: book.image_url
                };
                // Thêm vào DB (Bỏ qua alert trong hàm addBook bằng cách gọi trực tiếp nếu cần, nhưng ở đây gọi hàm có sẵn cho tiện)
                // Để tránh hiện quá nhiều alert, ta sẽ gọi im lặng
                await _supabase.from('books').insert([newBook]);
                count++;
            }
            alert(`✅ Đã nhập thành công ${count} cuốn sách vào kho!`);
            render(); // Load lại bảng ngay
        }
    } catch (e) {
        console.error(e);
        alert("Có lỗi xảy ra khi nhập sách.");
    } finally {
        btn.innerHTML = oldText;
        btn.disabled = false;
    }
}

// --- CÁC HÀM CŨ ---
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

function handleSearch() { 
    const k = document.getElementById('search-input').value.toLowerCase(); 
    render(allBooks.filter(b => b.name.toLowerCase().includes(k) || b.author.toLowerCase().includes(k))); 
}

document.addEventListener('DOMContentLoaded', () => render());