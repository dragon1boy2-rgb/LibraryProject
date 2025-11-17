// js/admin_resources.js

// 1. BẢO VỆ TRANG
const currentUser = DB.getCurrentUser();
if (!currentUser || currentUser.role !== 'admin') {
    alert("Bạn không có quyền truy cập trang này!");
    window.location.href = 'user_dashboard.html';
}

let allResources = [];

// DOM Elements
const modal = document.getElementById('resModal');
const titleEl = document.getElementById('modal-title');
const idEl = document.getElementById('r-id');
const nameEl = document.getElementById('r-name');
const typeEl = document.getElementById('r-type');
const sizeEl = document.getElementById('r-size');

// 2. RENDER BẢNG
async function render(data = null) {
    const tbody = document.getElementById('resource-list');
    if (!tbody) return;

    if (!data) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px">⏳ Đang tải dữ liệu...</td></tr>';
        allResources = await DB.getResources();
        data = allResources;
    }

    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px">Chưa có tài liệu nào.</td></tr>';
        return;
    }

    data.forEach(r => {
        // Badge màu sắc theo loại file
        let typeBadge = '';
        if(r.type === 'PDF') typeBadge = '<span class="status-badge" style="background:#fff1f0; color:#f5222d; border:1px solid #ffa39e">PDF</span>';
        else if(r.type === 'Video') typeBadge = '<span class="status-badge" style="background:#e6f7ff; color:#1890ff; border:1px solid #91d5ff">Video</span>';
        else if(r.type === 'Ebook') typeBadge = '<span class="status-badge" style="background:#f6ffed; color:#52c41a; border:1px solid #b7eb8f">Ebook</span>';
        else typeBadge = `<span class="status-badge" style="background:#fff7e6; color:#faad14; border:1px solid #ffe58f">${r.type}</span>`;

        tbody.innerHTML += `
            <tr>
                <td>#${r.id}</td>
                <td><strong>${r.name}</strong></td>
                <td>${typeBadge}</td>
                <td>${r.size || '-'}</td>
                <td>${new Date(r.created_at).toLocaleDateString() || '-'}</td>
                <td>
                    <button class="action-btn btn-edit" onclick="openModalEdit(${r.id})">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="action-btn btn-delete" onclick="handleDelete(${r.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

// 3. MODAL FUNCTIONS
function openModal() {
    idEl.value = '';
    nameEl.value = '';
    typeEl.value = 'PDF';
    sizeEl.value = '';
    
    titleEl.innerText = "Thêm Tài Liệu Mới";
    modal.classList.add('active');
}

function openModalEdit(id) {
    const res = allResources.find(r => r.id === id);
    if (!res) return;

    idEl.value = res.id;
    nameEl.value = res.name;
    typeEl.value = res.type;
    sizeEl.value = res.size;

    titleEl.innerText = "Cập Nhật Tài Liệu";
    modal.classList.add('active');
}

function closeModal() {
    modal.classList.remove('active');
}

// 4. LƯU DỮ LIỆU
async function saveResource() {
    const id = idEl.value;
    const name = nameEl.value;
    const type = typeEl.value;
    const size = sizeEl.value;

    if (!name) { alert("Vui lòng nhập tên tài liệu!"); return; }

    const item = { name, type, size };

    // Ở đây tôi dùng tạm logic cũ: Nếu có ID thì xóa đi thêm mới (vì chưa viết hàm updateResource)
    // Hoặc tốt nhất bạn nên thêm hàm updateResource vào data.js
    // Hiện tại data.js chưa có updateResource, nên ta sẽ dùng mẹo: 
    // Nếu sửa -> Alert thông báo (hoặc bạn tự thêm hàm updateResource vào data.js tương tự updateBook)
    
    if (id) {
        // Nếu bạn đã thêm hàm updateResource vào data.js thì dùng dòng này:
        // await DB.updateResource(id, item);
        
        // Còn nếu chưa, ta tạm thời xóa cũ thêm mới (cách chữa cháy):
        await DB.deleteResource(id);
        await DB.addResource(item);
    } else {
        await DB.addResource(item);
    }
    
    closeModal();
    render();
}

// 5. XÓA
async function handleDelete(id) {
    if (confirm("Bạn chắc chắn muốn xóa tài liệu này?")) {
        await DB.deleteResource(id);
        render();
    }
}

// 6. TÌM KIẾM
function handleSearch() {
    const k = document.getElementById('search-input').value.toLowerCase();
    const filtered = allResources.filter(r => r.name.toLowerCase().includes(k));
    render(filtered);
}

// Chạy lần đầu
document.addEventListener('DOMContentLoaded', () => render());