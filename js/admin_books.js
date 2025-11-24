// js/admin_books.js

// 1. BẢO VỆ TRANG
const currentUser = DB.getCurrentUser();
if (!currentUser || currentUser.role !== 'admin') { 
    alert("Không có quyền!"); window.location.href = 'user_dashboard.html'; 
}

let allBooks = [], currentData = [], currentPage = 1; const rowsPerPage = 50; let cropper = null;

const modal = document.getElementById('bookModal');
// Mapping các ID
const [titleEl, idEl, nameEl, authEl, pubEl, stockEl, previewEl, imgInputEl, imgBase64El, imgPreviewEl, finalPreviewContainer, cropperContainer, cropperImageEl, cropperActionsEl, uploadInstructionEl, btnReselectEl, uploadZoneEl] = 
    ['modal-title','book-id','book-name','book-author','book-publisher','book-stock', 
     'book-preview', 
     'book-image-file', 'book-image-base64', 'image-preview', 
     'final-preview-container', 'cropper-container', 'cropper-image', 'cropper-actions',
     'upload-instruction', 'btn-reselect', 'upload-zone']
    .map(id => document.getElementById(id));

// --- RENDER & PHÂN TRANG ---
async function render(data = null) {
    const tbody = document.getElementById('book-list'); if (!tbody) return;
    if (!data) { 
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">⏳ Đang tải...</td></tr>'; 
        allBooks = await DB.getBooks(); 
        currentData = allBooks; 
    } else { 
        currentData = data; 
    }

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

// --- XỬ LÝ ẢNH ---
if(uploadZoneEl) {
    uploadZoneEl.addEventListener('click', function() {
        if (!cropper && !imgBase64El.value) imgInputEl.click();
    });
}
function resetImageUI() {
    imgInputEl.value = ''; imgBase64El.value = '';
    uploadInstructionEl.style.display = 'block'; cropperContainer.style.display = 'none';
    cropperActionsEl.style.display = 'none'; finalPreviewContainer.style.display = 'none'; btnReselectEl.style.display = 'none';
    if (cropper) { cropper.destroy(); cropper = null; }
}
function showFinalImage(src) {
    uploadInstructionEl.style.display = 'none'; cropperContainer.style.display = 'none'; cropperActionsEl.style.display = 'none';
    imgPreviewEl.src = src; finalPreviewContainer.style.display = 'block'; btnReselectEl.style.display = 'block';
    if (cropper) { cropper.destroy(); cropper = null; }
}
imgInputEl.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) { alert("Ảnh quá lớn!"); this.value = ""; return; }
        const reader = new FileReader();
        reader.onload = function(event) {
            uploadInstructionEl.style.display = 'none'; finalPreviewContainer.style.display = 'none'; btnReselectEl.style.display = 'none';
            cropperImageEl.src = event.target.result; cropperContainer.style.display = 'block'; cropperActionsEl.style.display = 'flex';
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
        imgBase64El.value = base64; showFinalImage(base64);
    }
}
function cancelCrop() {
    if (imgBase64El.value && !cropper) showFinalImage(imgBase64El.value); else resetImageUI();
}

// --- MODAL ---
function openModal() { 
    idEl.value=''; nameEl.value=''; authEl.value=''; pubEl.value=''; stockEl.value=''; previewEl.value = ''; 
    resetImageUI(); titleEl.innerText="Thêm Sách"; modal.classList.add('active'); 
}
function openModalEdit(id) {
    const b = allBooks.find(x => x.id === id); if(!b) return;
    idEl.value=b.id; nameEl.value=b.name; authEl.value=b.author; pubEl.value=b.publisher||''; stockEl.value=b.stock; previewEl.value = b.preview_link || ''; 
    resetImageUI(); if(b.image_url) { imgBase64El.value = b.image_url; showFinalImage(b.image_url); }
    titleEl.innerText="Sửa Sách"; modal.classList.add('active');
}
function closeModal() { modal.classList.remove('active'); }
function handleSearch() { const k = document.getElementById('search-input').value.toLowerCase(); render(allBooks.filter(b => b.name.toLowerCase().includes(k) || b.author.toLowerCase().includes(k))); }

// --- [CẬP NHẬT] AUTO IMPORT: CHỌN THEO DANH MỤC USER ---
async function bulkImportBooks() { 
    // 1. Danh sách chủ đề khớp với User Dashboard
    const categories = [
        { id: 1, name: "Công nghệ", query: "Công nghệ thông tin lập trình" },
        { id: 2, name: "Kinh tế", query: "Sách Kinh tế Quản trị kinh doanh" },
        { id: 3, name: "Văn học", query: "Tiểu thuyết Văn học Việt Nam" },
        { id: 4, name: "Ngoại ngữ", query: "Sách học Tiếng Anh IELTS" },
        { id: 5, name: "Kỹ năng sống", query: "Sách Kỹ năng sống self help" },
        { id: 6, name: "Truyện tranh", query: "Truyện tranh thiếu nhi manga" }
    ];

    // 2. Tạo menu chọn
    let msg = "Chọn chủ đề nhập sách (Nhập số):\n";
    msg += "0. TẤT CẢ (Mỗi loại 5 cuốn)\n";
    categories.forEach(c => msg += `${c.id}. ${c.name}\n`);
    msg += "7. Nhập chủ đề khác...";

    const choice = prompt(msg, "0");
    if (choice === null) return; // Hủy

    let searchQueries = [];
    let limitPerQuery = 10;

    if (choice === "0") {
        // Chọn tất cả
        searchQueries = categories.map(c => c.query);
        limitPerQuery = 5; // Lấy ít thôi để không quá nặng
    } else if (choice === "7") {
        // Nhập tay
        const custom = prompt("Nhập từ khóa tìm kiếm:", "Lịch sử Việt Nam");
        if(custom) searchQueries = [custom];
        else return;
    } else {
        // Chọn 1 chủ đề cụ thể
        const selected = categories.find(c => c.id == choice);
        if (selected) {
            searchQueries = [selected.query];
            limitPerQuery = 20; // Lấy nhiều hơn nếu chỉ chọn 1 loại
        } else {
            alert("Lựa chọn không hợp lệ!");
            return;
        }
    }

    // 3. Chọn ngôn ngữ
    const lang = prompt("Nhập mã NGÔN NGỮ (vi = Tiếng Việt, en = Tiếng Anh):", "vi");
    if (!lang) return;

    const btn = document.getElementById('btn-bulk-import'); 
    if(btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tìm...';
        btn.disabled = true;
    }
    
    try { 
        // 4. Lấy danh sách hiện tại để check trùng
        const existingBooks = await DB.getBooks();
        const existingSignatures = new Set(existingBooks.map(b => (b.name.trim() + "_" + b.author.trim()).toLowerCase()));

        let totalAdded = 0;
        let totalSkipped = 0;

        // 5. Duyệt qua danh sách query cần tìm
        for (const query of searchQueries) {
            // Random trang để kết quả phong phú hơn
            const randomStartIndex = Math.floor(Math.random() * 20);

            const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${limitPerQuery}&startIndex=${randomStartIndex}&langRestrict=${lang}&filter=partial`;
            
            const res = await fetch(url); 
            const d = await res.json(); 
            
            if(d.items){ 
                const booksToAdd = [];

                d.items.forEach(i => {
                    const name = i.volumeInfo.title || '';
                    const author = i.volumeInfo.authors?.join(', ') || 'Unknown';
                    const signature = (name.trim() + "_" + author.trim()).toLowerCase();

                    if (!existingSignatures.has(signature)) {
                        booksToAdd.push({
                            name: name, 
                            author: author, 
                            publisher: i.volumeInfo.publisher || '',
                            stock: 10, 
                            image_url: i.volumeInfo.imageLinks?.thumbnail || '',
                            preview_link: i.accessInfo?.webReaderLink || i.volumeInfo.previewLink || '' 
                        });
                        existingSignatures.add(signature); 
                    } else {
                        totalSkipped++;
                    }
                });
                
                if (booksToAdd.length > 0) {
                    await DB.supabase.from('books').insert(booksToAdd); 
                    totalAdded += booksToAdd.length;
                }
            }
        }

        alert(`✅ Đã hoàn tất!\n- Thêm mới: ${totalAdded} sách.\n- Bỏ qua (trùng): ${totalSkipped} sách.`); 
        render(); 

    } catch(e) {
        console.error(e);
        alert("Lỗi kết nối: " + e.message);
    } finally {
        if(btn) {
            btn.innerHTML = '<i class="fas fa-bolt"></i> Auto Import';
            btn.disabled = false;
        }
    } 
}

// --- SAVE BOOK ---
async function saveBook() {
    const obj = { 
        name: nameEl.value, author: authEl.value, publisher: pubEl.value, 
        stock: parseInt(stockEl.value), image_url: imgBase64El.value, preview_link: previewEl.value.trim() 
    };
    if(!obj.name || !obj.author) return alert("Thiếu thông tin!");
    const btn = document.querySelector('.btn-save'); btn.innerText="Lưu..."; btn.disabled=true;
    try {
        if(idEl.value) { await DB.updateBook(idEl.value, obj); } else { await DB.addBook(obj); }
        closeModal(); render(); 
    } finally { btn.innerText="Lưu Sách"; btn.disabled=false; }
}
async function handleDelete(id) { if(confirm("Xóa?")) { await DB.deleteBook(id); render(); } }

// --- AUTO UPDATE LINK ---
async function autoUpdateMissingLinks() {
    const books = await DB.getBooks();
    const targetBooks = books.filter(b => !b.preview_link || b.preview_link.trim() === "" || b.preview_link.length < 15);

    if (targetBooks.length === 0) { alert("✅ Tất cả sách đều đã có link chuẩn."); return; }
    if (!confirm(`Tìm thấy ${targetBooks.length} quyển cần cập nhật link.\nHệ thống sẽ quét và lấy link ĐỌC THỬ CHUẨN.`)) return;

    const btn = document.getElementById('btn-auto-link');
    const oldText = btn ? btn.innerHTML : '';
    if(btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...'; btn.disabled = true; }

    let updatedCount = 0; let failCount = 0;
    try {
        for (const book of targetBooks) {
            try {
                const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(book.name)}&maxResults=1&langRestrict=vi&filter=partial`);
                const data = await res.json();
                if (data.items && data.items.length > 0) {
                    const item = data.items[0];
                    const link = item.accessInfo?.webReaderLink || item.volumeInfo.previewLink;
                    if (link) { await DB.updateBook(book.id, { preview_link: link }); updatedCount++; } else { failCount++; }
                } else { failCount++; }
            } catch (err) { failCount++; }
            if(btn) btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Xong ${updatedCount}/${targetBooks.length}...`;
        }
        alert(`🏁 Hoàn tất!\n- Cập nhật thành công: ${updatedCount} quyển.\n- Không tìm thấy link: ${failCount} quyển.`);
        render();
    } catch (e) { alert("Lỗi: " + e.message); } finally { if(btn) { btn.innerHTML = oldText; btn.disabled = false; } }
}

document.addEventListener('DOMContentLoaded', () => render());