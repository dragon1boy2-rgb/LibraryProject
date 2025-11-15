// js/admin_resources.js

async function render() {
    const tbody = document.querySelector('.data-table tbody');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5">Đang tải...</td></tr>';
    
    const list = await DB.getResources();
    tbody.innerHTML = '';

    list.forEach(r => {
        tbody.innerHTML += `
            <tr>
                <td>${r.id}</td>
                <td>${r.name}</td>
                <td><span class="tag tag-blue">${r.type}</span></td>
                <td>${r.size}</td>
                <td><button class="btn-del" onclick="handleDel(${r.id})">Xóa</button></td>
            </tr>
        `;
    });
}

async function handleAddResource() { // Gắn hàm này vào nút thêm trong HTML
    const name = prompt("Tên tài liệu:");
    const type = prompt("Loại (PDF/Video/Ebook):");
    const size = prompt("Dung lượng (ví dụ 5MB):");
    
    if (name) {
        await DB.addResource({ name, type, size });
        render();
    }
}

async function handleDel(id) {
    if(confirm("Xóa tài liệu này?")) {
        await DB.deleteResource(id);
        render();
    }
}

document.addEventListener('DOMContentLoaded', render);