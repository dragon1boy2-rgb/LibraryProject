// js/admin_dash.js

// 1. BẢO VỆ TRANG
const currentUser = DB.getCurrentUser();
if (!currentUser || currentUser.role !== 'admin') {
    window.location.href = 'user_dashboard.html';
}

document.addEventListener('DOMContentLoaded', async () => {
    // 2. Load thống kê tổng
    const stats = await DB.getStats();
    document.getElementById('total-users').innerText = stats.users;
    document.getElementById('total-resources').innerText = stats.books + stats.resources;

    // 3. Kích hoạt bộ lọc thời gian -> Sẽ gọi updateChartData và updateTopList
    updateDateRange(); 

    // 4. Vẽ biểu đồ tài liệu (4 cột)
    updateResourceChart();

    // 5. Load Sách Mới
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

    // 6. Load Tài nguyên mới
    const resources = await DB.getResources();
    const newResList = document.getElementById('new-resources-list');
    if(newResList) {
        newResList.innerHTML = '';
        resources.slice(0, 3).forEach(r => {
            let badge = r.type === 'PDF' ? 'bg-green' : 'bg-blue';
            newResList.innerHTML += `
                <li>
                    <div class="thumb" style="display:flex;align-items:center;justify-content:center;background:#f0f2f5;color:#888"><i class="fas fa-file-alt"></i></div>
                    <div class="info"><h4>${r.name}</h4><span class="badge ${badge}">${r.type}</span></div>
                </li>`;
        });
    }
});

// --- XỬ LÝ THỜI GIAN & CẬP NHẬT DỮ LIỆU ---
function updateDateRange() {
    const filterType = document.getElementById('time-filter').value;
    const displayEl = document.getElementById('date-display');
    
    const today = new Date();
    let startDate = new Date();
    let endDate = new Date();

    const formatDate = (d) => `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;

    if (filterType === 'this_week') {
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1); 
        startDate.setDate(diff); endDate.setDate(startDate.getDate() + 6);
    } else if (filterType === 'last_week') {
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1) - 7;
        startDate.setDate(diff); endDate.setDate(startDate.getDate() + 6);
    } else if (filterType === 'this_month') {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (filterType === 'last_month') {
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (filterType === 'this_year') {
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
    }
    
    startDate.setHours(0,0,0,0); endDate.setHours(23,59,59,999);
    displayEl.innerText = `${formatDate(startDate)} - ${formatDate(endDate)}`;

    // Gọi cập nhật biểu đồ truy cập
    updateChartData(startDate, endDate);
    
    // Gọi cập nhật danh sách Top sách (Data thật)
    updateTopList(startDate, endDate);
}

// --- BIỂU ĐỒ 1: TRUY CẬP (SV vs GV) ---
async function updateChartData(start, end) {
    const data = await DB.getAccessStats(start, end);
    const sv = data.student;
    const gv = data.lecturer;
    const maxVal = Math.max(sv, gv, 10); 

    const barSv = document.getElementById('bar-sv');
    const valSv = document.getElementById('val-sv');
    const barGv = document.getElementById('bar-gv');
    const valGv = document.getElementById('val-gv');

    if (barSv && valSv) {
        valSv.innerText = sv; 
        barSv.style.height = `${(sv === 0 ? 2 : (sv / maxVal) * 100)}%`;
    }

    if (barGv && valGv) {
        valGv.innerText = gv; 
        barGv.style.height = `${(gv === 0 ? 2 : (gv / maxVal) * 100)}%`;
    }
}

// --- BIỂU ĐỒ 2: TÀI LIỆU (4 CỘT) ---
async function updateResourceChart() {
    const books = await DB.getBooks();
    const resources = await DB.getResources();

    const countSach = books.length;
    const countEbook = resources.filter(r => r.type === 'Ebook').length;
    const countPDF = resources.filter(r => r.type === 'PDF').length;
    const countVideo = resources.filter(r => r.type === 'Video').length;

    const maxVal = Math.max(countSach, countEbook, countPDF, countVideo, 5);

    setBar('sach', countSach, maxVal);
    setBar('ebook', countEbook, maxVal);
    setBar('pdf', countPDF, maxVal);
    setBar('video', countVideo, maxVal);
}

function setBar(name, val, max) {
    const bar = document.getElementById('b-' + name);
    const text = document.getElementById('v-' + name);
    if(bar && text) {
        text.innerText = val;
        const percent = (val / max) * 100;
        bar.style.height = (percent < 2 ? 2 : percent) + '%'; 
    }
}

// --- LIST: TOP TÀI NGUYÊN (DATA THẬT) ---
async function updateTopList(start, end) {
    const listEl = document.getElementById('top-resources-list');
    if (!listEl) return;

    listEl.innerHTML = '<li style="justify-content:center; color:#888; border:none;">Đang tính toán...</li>';

    // Gọi hàm lấy Top sách từ DB
    const topBooks = await DB.getTopBooks(start, end);

    listEl.innerHTML = '';
    if (topBooks.length === 0) {
        listEl.innerHTML = '<li style="justify-content:center; color:#888; border:none;">Chưa có lượt mượn trong thời gian này.</li>';
        return;
    }

    topBooks.forEach(book => {
        const img = book.image_url || `https://via.placeholder.com/40x50?text=${book.name.charAt(0)}`;
        
        listEl.innerHTML += `
            <li>
                <img src="${img}" class="thumb">
                <div class="info">
                    <h4 title="${book.name}">${book.name}</h4>
                    <span class="badge bg-purple">Sách giấy</span>
                </div>
                <span class="count">${book.borrow_count} lượt</span>
            </li>
        `;
    });
}