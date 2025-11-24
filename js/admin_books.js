// js/admin_books.js [CẬP NHẬT]

// 1. BẢO VỆ TRANG
const currentUser = DB.getCurrentUser();
if (!currentUser || currentUser.role !== 'admin') { 
    alert("Không có quyền!"); window.location.href = 'user_dashboard.html'; 
}

let allBooks = [], currentData = [], currentPage = 1; const rowsPerPage = 50; let cropper = null;

const modal = document.getElementById('bookModal');
// Mapping các ID (Đã thêm book-preview)
const [titleEl, idEl, nameEl, authEl, pubEl, stockEl, previewEl, imgInputEl, imgBase64El, imgPreviewEl, finalPreviewContainer, cropperContainer, cropperImageEl, cropperActionsEl, uploadInstructionEl, btnReselectEl, uploadZoneEl] = 
    ['modal-title','book-id','book-name','book-author','book-publisher','book-stock', 
     'book-preview', // <-- ID MỚI
     'book-image-file', 'book-image-base64', 'image-preview', 
     'final-preview-container', 'cropper-container', 'cropper-image', 'cropper-actions',
     'upload-instruction', 'btn-reselect', 'upload-zone']
    .map(id => document.getElementById(id));

// --- RENDER & PHÂN TRANG ---
async function render(data = null) {
    const tbody = document.getElementById('book-list'); if (!tbody) return;
    if (!data) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">⏳ Đang tải...</td></tr>'; allBooks = await DB.getBooks(); currentData = allBooks; } else { currentData = data; }
    tbody.innerHTML = '';
    if(currentData.length === 0) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Không tìm thấy dữ liệu.</td></tr>'; updatePaginationUI(0); return; }
    
    const totalPages = Math.ceil(currentData.length / rowsPerPage);
    if (currentPage < 1) currentPage = 1; if (currentPage > totalPages) currentPage = totalPages;
    const startIndex = (currentPage - 1) * rowsPerPage; const endIndex = startIndex + rowsPerPage;
    const booksToShow = currentData.slice(startIndex, endIndex); 
    
    booksToShow.forEach(b => {
        const thumb = b.image_url ? `<img src="${b.image_url}" style="width:30px; height:40px; object-fit:cover; border-radius:3px; margin-right:5px; vertical-align:middle;">` : '';
        tbody.innerHTML += `<tr><td>#${b.id}</td><td><div style="display:flex; align-items:center;">${thumb} <strong>${b.name}</strong></div></td><td>${b.author}</td><td>${b.publisher||'-'}</td><td style="color:${b.stock > 0 ? 'green' : 'red'}">${b.stock}</td><td>${b.stock > 0 ? '<span class="status-badge status-ok">Còn hàng</span>' : '<span class="status-badge status-low">Hết</span>'}</td><td><button class="action-btn btn-edit" onclick="openModalEdit(${b.id})"><i class="fas fa-pen"></i></button><button class="action-btn btn-delete" onclick="handleDelete(${b.id})"><i class="fas fa-trash"></i></button></td></tr>`;
    });
    updatePaginationUI(totalPages);
}
function updatePaginationUI(totalPages) { 
    const numContainer = document.getElementById('pagination-numbers'); const btnPrev = document.getElementById('btn-prev'); const btnNext = document.getElementById('btn-next');
    if (numContainer) numContainer.innerHTML = '';
    if (totalPages === 0) { if(btnPrev) btnPrev.disabled = true; if(btnNext) btnNext.disabled = true; return; }
    if(btnPrev) btnPrev.disabled = (currentPage === 1); if(btnNext) btnNext.disabled = (currentPage === totalPages);
    let startPage = Math.max(1, currentPage - 2); let endPage = Math.min(totalPages, currentPage + 2);
    if (endPage - startPage < 4) { if (startPage === 1) endPage = Math.min(totalPages, startPage + 4); else if (endPage === totalPages) startPage = Math.max(1, endPage - 4); }
    for (let i = startPage; i <= endPage; i++) { const btn = document.createElement('button'); btn.className = `page-number ${i === currentPage ? 'active' : ''}`; btn.innerText = i; btn.onclick = () => goToPage(i); numContainer.appendChild(btn); }
}
function goToPage(page) { currentPage = page; render(currentData); }
function changePage(direction) { currentPage += direction; render(currentData); }

// --- XỬ LÝ LOGIC ẢNH ---
if(uploadZoneEl) {
    uploadZoneEl.addEventListener('click', function() {
        if (!cropper && !imgBase64El.value) {
            imgInputEl.click();
        }
    });
}

function resetImageUI() {
    imgInputEl.value = '';
    imgBase64El.value = '';
    
    uploadInstructionEl.style.display = 'block'; 
    cropperContainer.style.display = 'none';
    cropperActionsEl.style.display = 'none';
    finalPreviewContainer.style.display = 'none';
    btnReselectEl.style.display = 'none';

    if (cropper) { cropper.destroy(); cropper = null; }
}

function showFinalImage(src) {
    uploadInstructionEl.style.display = 'none'; 
    cropperContainer.style.display = 'none';
    cropperActionsEl.style.display = 'none';
    
    imgPreviewEl.src = src;
    finalPreviewContainer.style.display = 'block'; 
    btnReselectEl.style.display = 'block'; 
    
    if (cropper) { cropper.destroy(); cropper = null; }
}

imgInputEl.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) { alert("Ảnh quá lớn!"); this.value = ""; return; }
        const reader = new FileReader();
        reader.onload = function(event) {
            uploadInstructionEl.style.display = 'none'; 
            finalPreviewContainer.style.display = 'none'; 
            btnReselectEl.style.display = 'none';

            cropperImageEl.src = event.target.result;
            cropperContainer.style.display = 'block'; 
            cropperActionsEl.style.display = 'flex'; 

            if (cropper) cropper.destroy();
            cropper = new Cropper(cropperImageEl, { aspectRatio: 2/3, viewMode: 1, autoCropArea: 0.9 });
        }
        reader.readAsDataURL(file);
    }
});

function performCrop() {
    if (!cropper) return;
    const canvas = cropper.getCroppedCanvas({ width: 300, height: 450 });
    if (canvas) {
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        imgBase64El.value = base64;
        showFinalImage(base64);
    }
}

function cancelCrop() {
    if (imgBase64El.value && !cropper) {
        showFinalImage(imgBase64El.value);
    } else {
        resetImageUI();
    }
}

// --- MODAL ---
function openModal() { 
    idEl.value=''; nameEl.value=''; authEl.value=''; pubEl.value=''; stockEl.value=''; 
    previewEl.value = ''; // [MỚI] Reset ô link đọc thử
    resetImageUI();
    titleEl.innerText="Thêm Sách"; modal.classList.add('active'); 
}

function openModalEdit(id) {
    const b = allBooks.find(x => x.id === id); 
    if(!b) return;
    idEl.value=b.id; nameEl.value=b.name; authEl.value=b.author; pubEl.value=b.publisher||''; stockEl.value=b.stock; 
    
    previewEl.value = b.preview_link || ''; // [MỚI] Load link cũ lên nếu có

    resetImageUI();
    if(b.image_url) {
        imgBase64El.value = b.image_url;
        showFinalImage(b.image_url);
    }

    titleEl.innerText="Sửa Sách"; modal.classList.add('active');
}

function closeModal() { modal.classList.remove('active'); }
function handleSearch() { const k = document.getElementById('search-input').value.toLowerCase(); render(allBooks.filter(b => b.name.toLowerCase().includes(k) || b.author.toLowerCase().includes(k))); }
async function bulkImportBooks() { const topics = ["Tiểu thuyết", "Kinh tế", "Công nghệ"]; if (!confirm(`Auto import demo?`)) return; const btn = document.getElementById('btn-bulk-import'); if(btn) btn.disabled=true; try { let total=0; for (const t of topics) { const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${t}&maxResults=5`); const d = await res.json(); if(d.items){ const b = d.items.map(i=>({name:i.volumeInfo.title, author:i.volumeInfo.authors?.join(',')||'Unknown', stock:10, image_url:i.volumeInfo.imageLinks?.thumbnail||''})); await DB.supabase.from('books').insert(b); total+=b.length; } } alert(`Đã thêm ${total} sách`); allBooks = await DB.getBooks(); render(); } catch(e){console.error(e);} finally{if(btn) btn.disabled=false;} }

async function saveBook() {
    // [MỚI] Thêm preview_link vào object
    const obj = { 
        name: nameEl.value, 
        author: authEl.value, 
        publisher: pubEl.value, 
        stock: parseInt(stockEl.value), 
        image_url: imgBase64El.value,
        preview_link: previewEl.value.trim() 
    };

    if(!obj.name || !obj.author) return alert("Thiếu thông tin!");
    const btn = document.querySelector('.btn-save'); btn.innerText="Lưu..."; btn.disabled=true;
    try {
        if(idEl.value) { await DB.updateBook(idEl.value, obj); } else { await DB.addBook(obj); }
        closeModal(); allBooks = await DB.getBooks(); render();
    } finally { btn.innerText="Lưu Sách"; btn.disabled=false; }
}

async function handleDelete(id) { if(confirm("Xóa?")) { await DB.deleteBook(id); allBooks = await DB.getBooks(); render(); } }
document.addEventListener('DOMContentLoaded', () => render());