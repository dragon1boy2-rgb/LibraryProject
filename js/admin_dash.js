// js/admin_dash.js

// BẢO VỆ TRANG
const currentUser = DB.getCurrentUser();
if (!currentUser || currentUser.role !== 'admin') {
    window.location.href = 'user_dashboard.html';
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Khởi tạo ngày tháng mặc định ngay khi vào trang
    updateDateRange();

    // 2. Lấy thống kê tổng (Dữ liệu thật)
    const stats = await DB.getStats();
    
    document.getElementById('total-users').innerText = stats.users;
    document.getElementById('total-resources').innerText = stats.books + stats.resources;

    // 3. Hiển thị Sách Mới
    const books = await DB.getBooks();
    const newBooksList = document.getElementById('new-books-list');
    if(newBooksList) {
        newBooksList.innerHTML = '';
        books.slice(0, 3).forEach(b => {
            const img = b.image_url || `https://via.placeholder.com/40x50?text=${b.name.charAt(0)}`;
            newBooksList.innerHTML += `
                <li>
                    <img src="${img}" class="thumb">
                    <div class="info"><h4>${b.name}</h4><small style="color:#888">${b.author}</small></div>
                    <span class="badge bg-purple">Sách giấy</span>
                </li>`;
        });
    }

    // 4. Hiển thị Tài nguyên mới
    const resources = await DB.getResources();
    const newResList = document.getElementById('new-resources-list');
    if(newResList) {
        newResList.innerHTML = '';
        resources.slice(0, 3).forEach(r => {
            let badgeClass = r.type === 'PDF' ? 'bg-green' : 'bg-blue';
            newResList.innerHTML += `
                <li>
                    <div class="thumb" style="display:flex;align-items:center;justify-content:center;background:#f0f2f5;color:#888"><i class="fas fa-file-alt"></i></div>
                    <div class="info"><h4>${r.name}</h4><span class="badge ${badgeClass}">${r.type}</span></div>
                </li>`;
        });
    }
    
    // 5. Top Tài Nguyên (Giả lập)
    const topList = document.getElementById('top-resources-list');
    if(topList) {
        topList.innerHTML = `
            <li><img src="https://via.placeholder.com/40" class="thumb"><div class="info"><h4>Những tấm lòng cao cả</h4><span class="badge bg-purple">Sách giấy</span></div><span class="count">6</span></li>
            <li><img src="https://via.placeholder.com/40" class="thumb"><div class="info"><h4>Ôn Hè Toán 1</h4><span class="badge bg-green">Tài liệu</span></div><span class="count">5</span></li>
            <li><img src="https://via.placeholder.com/40" class="thumb"><div class="info"><h4>1001 Bài tập Tư Duy</h4><span class="badge bg-blue">Ebook</span></div><span class="count">4</span></li>
        `;
    }
});

// --- HÀM XỬ LÝ THỜI GIAN (MỚI THÊM) ---
function updateDateRange() {
    const filterType = document.getElementById('time-filter').value;
    const displayEl = document.getElementById('date-display');
    
    const today = new Date();
    let startDate = new Date();
    let endDate = new Date();

    // Hàm định dạng ngày DD/MM/YYYY
    const formatDate = (date) => {
        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const y = date.getFullYear();
        return `${d}/${m}/${y}`;
    };

    if (filterType === 'this_week') {
        // Tuần này (Bắt đầu từ Thứ 2)
        const day = today.getDay(); // 0 (CN) - 6 (T7)
        const diff = today.getDate() - day + (day === 0 ? -6 : 1); 
        startDate.setDate(diff);
        endDate.setDate(startDate.getDate() + 6);
    } 
    else if (filterType === 'last_week') {
        // Tuần trước
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1) - 7;
        startDate.setDate(diff);
        endDate.setDate(startDate.getDate() + 6);
    }
    else if (filterType === 'this_month') {
        // Tháng này
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }
    else if (filterType === 'last_month') {
        // Tháng trước
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
    }
    else if (filterType === 'this_year') {
        // Năm nay
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
    }

    // Hiển thị kết quả
    displayEl.innerText = `${formatDate(startDate)} - ${formatDate(endDate)}`;
}