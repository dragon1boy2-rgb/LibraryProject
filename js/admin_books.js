// js/admin_books.js

// 1. BẢO VỆ TRANG
const currentUser = DB.getCurrentUser();
if (!currentUser || currentUser.role !== 'admin') { 
    alert("Không có quyền!"); 
    window.location.href = 'user_dashboard.html'; 
}

let allBooks = [];
const modal = document.getElementById('bookModal');
// Lấy các element Modal
const [titleEl, idEl, nameEl, authEl, pubEl, stockEl] = 
    ['modal-title','book-id','book-name','book-author','book-publisher','book-stock']
    .map(id => document.getElementById(id));

// --- RENDER ---
async function render(data = null) {
    const tbody = document.getElementById('book-list'); 
    if (!tbody) return;
    
    if (!data) { 
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">⏳ Đang tải...</td></tr>'; 
        allBooks = await DB.getBooks(); 
        data = allBooks; 
    }
    
    tbody.innerHTML = '';
    if(data.length === 0) { 
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Kho sách trống. Hãy dùng nút Auto Import.</td></tr>'; 
        return; 
    }
    
    data.forEach(b => {
        tbody.innerHTML += `
            <tr>
                <td>#${b.id}</td>
                <td><strong>${b.name}</strong></td>
                <td>${b.author}</td>
                <td>${b.publisher||'-'}</td>
                <td style="color:${b.stock > 0 ? 'green' : 'red'}">${b.stock}</td>
                <td>${b.stock > 0 ? '<span class="status-badge status-ok">Còn hàng</span>' : '<span class="status-badge status-low">Hết</span>'}</td>
                <td>
                    <button class="action-btn btn-edit" onclick="openModalEdit(${b.id})"><i class="fas fa-pen"></i></button>
                    <button class="action-btn btn-delete" onclick="handleDelete(${b.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
    });
}

// --- CHỨC NĂNG: AUTO IMPORT (ĐÃ KHÔI PHỤC & SỬA LỖI) ---
async function bulkImportBooks() {
    const topics = [
        "Tiểu thuyết văn học Việt Nam", "Sách kinh tế kinh doanh", "Tâm lý học tội phạm",
        "Lịch sử thế giới", "Công nghệ thông tin", "Truyện tranh Manga",
        "Kỹ năng sống", "Khoa học vũ trụ", "Tiểu thuyết trinh thám", "Sách học ngoại ngữ"
    ];

    if (!confirm(`Hệ thống sẽ tự động quét và nhập sách từ ${topics.length} chủ đề. Tiếp tục?`)) return;

    const btn = document.getElementById('btn-bulk-import');
    const oldText = btn ? btn.innerHTML : '';
    if(btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang chạy...'; btn.disabled = true; }

    let totalImported = 0;

    try {
        for (const topic of topics) {
            const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(topic)}&maxResults=40&langRestrict=vi`);
            const data = await res.json();

            if (data.items && data.items.length > 0) {
                const booksToInsert = data.items.map(item => {
                    const info = item.volumeInfo;
                    // CHỈ LẤY CÁC TRƯỜNG CƠ BẢN ĐỂ KHÔNG BỊ LỖI DB
                    return {
                        name: info.title,
                        author: info.authors ? info.authors.join(', ') : 'Nhiều tác giả',
                        publisher: info.publisher || 'NXB Tổng Hợp',
                        stock: Math.floor(Math.random() * 15) + 5
                    };
                });

                const { error } = await _supabase.from('books').insert(booksToInsert);
                if (!error) totalImported += booksToInsert.length;
                else console.warn(`Lỗi nhập chủ đề ${topic}:`, error.message);
            }
        }
        alert(`✅ Xong! Đã nhập tổng cộng ${totalImported} cuốn sách.`);
        render();
    } catch (e) {
        console.error(e);
        alert("Lỗi hệ thống.");
    } finally {
        if(btn) { btn.innerHTML = oldText || '<i class="fas fa-bolt"></i> Auto Import'; btn.disabled = false; }
    }
}

// --- MODAL & CRUD ---
function openModal() { 
    idEl.value=''; nameEl.value=''; authEl.value=''; pubEl.value=''; stockEl.value=''; 
    titleEl.innerText="Thêm Sách"; 
    modal.classList.add('active'); 
}

function openModalEdit(id) {
    const b = allBooks.find(x => x.id === id); 
    if(!b) return;
    idEl.value=b.id; nameEl.value=b.name; authEl.value=b.author; pubEl.value=b.publisher||''; stockEl.value=b.stock; 
    titleEl.innerText="Sửa Sách"; 
    modal.classList.add('active');
}

function closeModal() { 
    modal.classList.remove('active'); 
}

async function saveBook() {
    const obj = { 
        name: nameEl.value, 
        author: authEl.value, 
        publisher: pubEl.value, 
        stock: parseInt(stockEl.value)
    };
    
    if(!obj.name || !obj.author) return alert("Thiếu thông tin!");
    
    if(idEl.value) { 
        if(await DB.updateBook(idEl.value, obj)) { closeModal(); render(); } 
    } else { 
        await DB.addBook(obj); closeModal(); render(); 
    }
}

async function handleDelete(id) { 
    if(confirm("Xóa sách này?")) { 
        await DB.deleteBook(id); 
        render(); 
    } 
}

function handleSearch() { 
    const k = document.getElementById('search-input').value.toLowerCase(); 
    render(allBooks.filter(b => b.name.toLowerCase().includes(k) || b.author.toLowerCase().includes(k))); 
}

document.addEventListener('DOMContentLoaded', () => render());