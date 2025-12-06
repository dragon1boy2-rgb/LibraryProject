// js/user_main.js

const currentUser = DB.getCurrentUser();
if (!currentUser) window.location.href = 'login.html';

document.getElementById('welcome-user').innerText = currentUser.fullname || currentUser.username;
if(currentUser.avatar_url) { const hAvatar = document.getElementById('header-avatar'); if(hAvatar) hAvatar.src = currentUser.avatar_url; }

let avatarCropper = null;
const BOOK_PRICE = 50000; 
const CARD_PRICES = { '1m': 50000, '6m': 250000, '1y': 450000 };
let cart = JSON.parse(localStorage.getItem('dlib_cart_' + currentUser.id)) || [];
let favorites = JSON.parse(localStorage.getItem('dlib_favorites_' + currentUser.id)) || [];
const ITEMS_PER_PAGE = 21;
let allBooks = [], currentLibPage = 1, currentLibFiltered = [], currentLibCategory = 'all';
let allResources = [], currentResPage = 1, currentResFiltered = [];

// --- HÀM HELPER: Dùng showToast thay vì alert để hiện đẹp như Admin ---
function notify(msg, type = 'info') {
    // type: 'success', 'error', 'info'
    if (window.showToast) {
        window.showToast(msg, type);
    } else {
        alert(msg); // Fallback nếu chưa load xong data.js
    }
}

function switchTab(tabName, element) {
    document.querySelectorAll('.tab-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.top-nav li').forEach(el => el.classList.remove('active'));
    const targetTab = document.getElementById('tab-' + tabName);
    if (targetTab) targetTab.classList.add('active');
    if (element) element.classList.add('active');
    const heroSection = document.getElementById('hero-section');
    if (heroSection) heroSection.style.display = (tabName === 'home') ? 'flex' : 'none';
    if(tabName === 'library') renderLibrary();
    if(tabName === 'favorites') renderFavorites();
    if(tabName === 'resources') renderResources();
    if(tabName === 'loans') renderLoans();
    if(tabName === 'home') loadStats();
    if(tabName === 'cart') renderCart();
    if(tabName === 'profile') renderProfile();
    if(tabName === 'card-register') renderCardRegister(); 
}

async function loadStats() {
    const stats = await DB.getUserStats(currentUser.id);
    document.getElementById('stat-borrowing').innerText = stats.borrowing;
    document.getElementById('stat-reserved').innerText = stats.reserved;
    document.getElementById('stat-fine').innerText = (stats.fine || 0).toLocaleString() + ' đ';
}

function filterLib(category, element) {
    document.querySelectorAll('#lib-filters .tag').forEach(t => t.classList.remove('active'));
    element.classList.add('active');
    currentLibCategory = category;
    currentLibPage = 1; 
    renderLibrary();
}

async function renderLibrary() {
    const grid = document.getElementById('library-grid');
    const searchInput = document.getElementById('search-book').value.toLowerCase().trim();
    if (allBooks.length === 0) allBooks = await DB.getBooks();
    let localResults = allBooks.filter(b => {
        const matchSearch = b.name.toLowerCase().includes(searchInput) || b.author.toLowerCase().includes(searchInput);
        let matchCategory = true;
        if (currentLibCategory !== 'all' && currentLibCategory !== 'Sách mới' && currentLibCategory !== 'Xem nhiều') {
            const textCheck = (b.name + (b.description || '') + (b.category || '')).toLowerCase();
            matchCategory = textCheck.includes(currentLibCategory.toLowerCase());
        }
        return matchSearch && matchCategory;
    });
    let googleResults = [];
    if (searchInput.length > 2 && currentLibCategory === 'all') { googleResults = await DB.searchGoogleBooks(searchInput); } 
    else if (currentLibCategory !== 'all' && localResults.length < 5) { googleResults = await DB.searchGoogleBooks(currentLibCategory); }
    currentLibFiltered = [...localResults, ...googleResults];
    const totalPages = Math.ceil(currentLibFiltered.length / ITEMS_PER_PAGE);
    if (currentLibPage < 1) currentLibPage = 1;
    if (currentLibPage > totalPages && totalPages > 0) currentLibPage = totalPages;
    const start = (currentLibPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const booksToShow = currentLibFiltered.slice(start, end);
    grid.innerHTML = '';
    if(booksToShow.length === 0) { grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #888; margin-top: 30px;">Không tìm thấy sách nào.</p>`; document.getElementById('lib-pagination').style.display = 'none'; return; }
    booksToShow.forEach(b => {
        const imgUrl = b.image_url || `https://via.placeholder.com/200x300?text=${encodeURIComponent(b.name.charAt(0))}`;
        let badge = b.is_google ? '<span class="tag tag-purple">Gợi ý Online</span>' : (b.stock > 0 ? '<span class="tag tag-blue">Sẵn sàng</span>' : '<span class="tag tag-red">Hết hàng</span>');
        const isFav = favorites.some(f => f.id === b.id);
        const heartClass = isFav ? 'fas fa-heart active' : 'far fa-heart';
        grid.innerHTML += `<div class="book-item" onclick="openDetail('${b.id}')" style="display:flex; flex-direction:column; height: 100%;"><div class="heart-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite(event, '${b.id}')"><i class="${heartClass}"></i></div><img src="${imgUrl}" class="book-img" style="width: 100%; height: 240px; object-fit: cover;"><div class="book-info" style="flex:1; display:flex; flex-direction:column;"><h4 style="font-size:15px; margin-bottom:5px; color:#333; font-weight:700; line-height:1.4; max-height:42px; overflow:hidden;">${b.name}</h4><p style="font-size:13px; color:#888; margin-bottom:8px;">${b.author}</p><div style="margin-top:auto;">${badge}</div></div></div>`;
    });
    updatePaginationUI('lib', totalPages, currentLibPage);
}

function handleLibSearch() { currentLibPage = 1; renderLibrary(); }
function changeLibPage(dir) { currentLibPage += dir; renderLibrary(); }

async function renderResources() {
    const grid = document.getElementById('resource-grid');
    let keyword = document.getElementById('search-resource').value.toLowerCase().trim();
    const searchKeyForOnline = keyword || "Sách kỹ năng"; 
    if (allResources.length === 0) { allResources = await DB.getResources(); }
    const activeFilter = document.querySelector('#res-filters .tag.active').innerText;
    let localFiltered = allResources.filter(r => {
        const matchKey = r.name.toLowerCase().includes(keyword);
        const matchType = activeFilter === 'Tất cả' || r.type === activeFilter;
        return matchKey && matchType;
    });
    let onlineResources = [];
    if (activeFilter === 'Tất cả' || activeFilter === 'Ebook') { const ebooks = await DB.searchOnlineEbooks(searchKeyForOnline); onlineResources = [...onlineResources, ...ebooks]; }
    if (activeFilter === 'PDF') { const pdfs = await DB.searchOnlinePDFs(searchKeyForOnline); onlineResources = [...onlineResources, ...pdfs]; }
    if (activeFilter === 'Video') { const videos = await DB.getSuggestedVideos(); onlineResources = [...onlineResources, ...videos]; }
    currentResFiltered = [...localFiltered, ...onlineResources];
    const totalPages = Math.ceil(currentResFiltered.length / ITEMS_PER_PAGE);
    if (currentResPage < 1) currentResPage = 1;
    if (currentResPage > totalPages && totalPages > 0) currentResPage = totalPages;
    const start = (currentResPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const itemsToShow = currentResFiltered.slice(start, end);
    grid.innerHTML = '';
    if(itemsToShow.length === 0) { grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #888; padding: 30px;">Không tìm thấy tài liệu nào.</p>'; document.getElementById('res-pagination').style.display = 'none'; return; }
    itemsToShow.forEach(r => {
        let iconClass = 'fa-file-alt', iconColor = '#777', badgeClass = 'tag'; 
        if (r.is_online) { 
            if (r.type.includes('Video')) { iconClass = 'fa-play-circle'; iconColor = '#1890ff'; badgeClass = 'tag tag-blue'; } 
            else if (r.type.includes('PDF')) { iconClass = 'fa-file-pdf'; iconColor = '#ff4d4f'; badgeClass = 'tag tag-red'; } 
            else { iconClass = 'fa-book-open'; iconColor = '#52c41a'; badgeClass = 'tag tag-purple'; }
        } else {
            if(r.type === 'PDF') { iconClass = 'fa-file-pdf'; iconColor = '#ff4d4f'; badgeClass = 'tag tag-red'; }
            else if(r.type === 'Video') { iconClass = 'fa-play-circle'; iconColor = '#1890ff'; badgeClass = 'tag tag-blue'; }
            else if(r.type === 'Ebook') { iconClass = 'fa-book-open'; iconColor = '#52c41a'; badgeClass = 'tag tag-purple'; }
        }
        let downloadBtnHtml = r.download_url ? `<button style="width:48%; background:#fff; color:#333; border:1px solid #ddd; padding:6px; border-radius:4px; cursor:pointer; font-size:12px;" onclick="window.open('${r.download_url}', '_blank')" title="Tải về máy"><i class="fas fa-download"></i> Tải</button>` : '';
        const viewBtnWidth = r.download_url ? '48%' : '100%';
        const viewUrl = r.resource_url || r.preview_link || '';
        let displayImage = r.image_url ? `<img src="${r.image_url}" style="height:100%; width:auto; max-width:100%; object-fit:contain;">` : `<i class="fas ${iconClass}" style="font-size: 50px; color: ${iconColor};"></i>`;
        grid.innerHTML += `<div class="book-item" style="display:flex; flex-direction:column; height: 100%;"><div style="height: 140px; background: #f9f9f9; display:flex; align-items:center; justify-content:center; border-bottom:1px solid #eee;">${displayImage}</div><div class="book-info" style="flex:1; display:flex; flex-direction:column;"><h4 title="${r.name}" style="font-size:14px; margin-bottom:5px; line-height: 1.4; max-height: 40px; overflow: hidden;">${r.name}</h4><div style="margin-top:auto; display:flex; flex-wrap:wrap; gap:5px; align-items:center; margin-bottom:10px;"><span class="${badgeClass}" style="font-size:10px;">${r.type}</span>${r.is_online ? '<span class="tag" style="font-size:10px; background:#fff7e6; color:#faad14; border:1px solid #ffe58f">Online</span>' : ''}<span style="font-size:11px; color:#888; margin-left:auto;">${r.size || 'N/A'}</span></div><div style="display:flex; justify-content: space-between;"><button style="width:${viewBtnWidth}; background:${iconColor}; color:white; border:none; padding:6px; border-radius:4px; cursor:pointer; font-size:12px;" data-link="${viewUrl}" onclick="openResource(this.getAttribute('data-link'))"><i class="fas fa-eye"></i> Xem</button>${downloadBtnHtml}</div></div></div>`;
    });
    updatePaginationUI('res', totalPages, currentResPage);
}

function handleResSearch() { currentResPage = 1; renderResources(); }
function filterRes(type, el) { document.querySelectorAll('#res-filters .tag').forEach(t => t.classList.remove('active')); el.classList.add('active'); currentResPage = 1; renderResources(); }
function changeResPage(dir) { currentResPage += dir; renderResources(); }
// [CẬP NHẬT] Sử dụng notify thay alert cho thông báo lỗi
function openResource(url) { 
    if (url && url !== 'undefined' && url !== 'null' && url.trim() !== '' && url !== '#') { 
        window.open(url, '_blank'); 
    } else { 
        notify("❌ Tài liệu này chưa được cập nhật đường dẫn xem online!\nVui lòng liên hệ Admin để bổ sung.", "error"); 
    } 
}
function updatePaginationUI(prefix, totalPages, curPage) {
    const pagContainer = document.getElementById(`${prefix}-pagination`);
    const numContainer = document.getElementById(`${prefix}-page-numbers`);
    const btnPrev = document.getElementById(`btn-${prefix}-prev`);
    const btnNext = document.getElementById(`btn-${prefix}-next`);
    if (totalPages <= 1) { pagContainer.style.display = 'none'; return; }
    pagContainer.style.display = 'flex'; numContainer.innerHTML = '';
    btnPrev.disabled = (curPage === 1); btnNext.disabled = (curPage === totalPages);
    let start = Math.max(1, curPage - 1), end = Math.min(totalPages, curPage + 1);
    if (start > 1) { numContainer.innerHTML += `<button class="btn-page" onclick="goToPage('${prefix}', 1)">1</button>`; if(start > 2) numContainer.innerHTML += `<span style="align-self:end; padding-bottom:5px;">...</span>`; }
    for (let i = start; i <= end; i++) { numContainer.innerHTML += `<button class="btn-page ${i === curPage ? 'active' : ''}" onclick="goToPage('${prefix}', ${i})">${i}</button>`; }
    if (end < totalPages) { if(end < totalPages - 1) numContainer.innerHTML += `<span style="align-self:end; padding-bottom:5px;">...</span>`; numContainer.innerHTML += `<button class="btn-page" onclick="goToPage('${prefix}', ${totalPages})">${totalPages}</button>`; }
}
function goToPage(prefix, page) { if(prefix === 'lib') { currentLibPage = page; renderLibrary(); } else { currentResPage = page; renderResources(); } }

const modal = document.getElementById('detailModal');
let currentBookId = null;
function openDetail(id) {
    const book = currentLibFiltered.find(b => b.id == id); if(!book) return;
    currentBookId = book.id;
    document.getElementById('d-img').src = book.image_url || '';
    document.getElementById('d-name').innerText = book.name;
    document.getElementById('d-author').innerText = book.author;
    document.getElementById('d-pub').innerText = book.publisher || 'Đang cập nhật';
    document.getElementById('d-desc').innerText = book.description || 'Chưa có mô tả.';
    const btnBorrow = document.getElementById('btn-borrow');
    const btnBuy = document.getElementById('btn-buy');
    const btnRead = document.getElementById('btn-read-trial');
    const stockEl = document.getElementById('d-stock');
    const linkDoc = book.preview_link || (book.is_google ? book.preview_link : null);
    if (linkDoc && linkDoc.trim() !== "") { btnRead.style.display = 'inline-block'; btnRead.onclick = () => window.open(linkDoc, '_blank'); } else { btnRead.style.display = 'none'; }
    if (book.is_google) { stockEl.innerText = "Sách Online"; stockEl.style.color = '#722ed1'; btnBorrow.style.display = 'none'; btnBuy.style.display = 'none'; } 
    else {
        if (book.stock > 0) { 
            stockEl.innerText = `Còn ${book.stock} cuốn`; stockEl.style.color = 'green'; 
            btnBorrow.style.display = 'inline-block'; btnBuy.style.display = 'inline-block';
            btnBorrow.innerText = "Mượn (0đ)"; btnBorrow.className = "btn-primary-lg"; btnBorrow.style.background = "#1890ff"; btnBorrow.disabled = false; btnBorrow.onclick = () => addBookToCart(book, 'borrow');
            btnBuy.innerText = "Mua (50k)"; btnBuy.className = "btn-buy-lg"; btnBuy.disabled = false; btnBuy.onclick = () => addBookToCart(book, 'buy');
        } else { 
            stockEl.innerText = "Hết hàng"; stockEl.style.color = 'red'; 
            btnBorrow.style.display = 'inline-block'; btnBorrow.innerText = "Đặt Trước"; btnBorrow.style.background = '#faad14'; btnBorrow.disabled = false; btnBorrow.onclick = () => handleAction('reserved');
            btnBuy.style.display = 'none'; 
        }
    }
    modal.classList.add('active');
}
function closeModal() { modal.classList.remove('active'); }
async function handleAction(type) {
    if(type === 'reserved') {
        if(!confirm("Bạn muốn đặt trước cuốn sách này?")) return;
        const result = await DB.borrowBook(currentUser.id, currentBookId, 'reserved');
        // [CẬP NHẬT] Notify
        if(result.success) { notify("✅ Đã đặt trước thành công!", "success"); closeModal(); loadStats(); } else notify("⚠️ Lỗi: " + result.message, "error"); 
    }
}

function renderCardRegister() {
    const myCard = JSON.parse(localStorage.getItem('dlib_card_' + currentUser.id));
    const formContainer = document.getElementById('register-form-container');
    const cardDisplay = document.getElementById('my-card-display');
    if (myCard) {
        formContainer.style.display = 'none'; cardDisplay.style.display = 'flex'; cardDisplay.innerHTML = generateCardHTML(myCard);
    } else {
        formContainer.style.display = 'flex'; cardDisplay.style.display = 'none';
        document.getElementById('reg-fullname').value = currentUser.fullname || '';
        const roleSelect = document.getElementById('reg-role');
        if(currentUser.role === 'student') roleSelect.value = 'student';
        else if(currentUser.role === 'lecturer') roleSelect.value = 'lecturer';
        else roleSelect.value = 'reader';
        toggleRegIdInput();
        if(currentUser.role === 'student' && currentUser.student_id) document.getElementById('reg-code').value = currentUser.student_id;
        else if(currentUser.role === 'lecturer' && currentUser.lecturer_id) document.getElementById('reg-code').value = currentUser.lecturer_id;
    }
}
function generateCardHTML(cardData) {
    const expiryDate = new Date(cardData.expiry); const issueDate = new Date(cardData.created_at);
    const formatDate = (d) => `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
    const avatarSrc = currentUser.avatar_url || "https://via.placeholder.com/150";
    let roleVN = "Độc Giả"; if(cardData.role === 'student') roleVN = "Sinh Viên"; else if(cardData.role === 'lecturer') roleVN = "Giảng Viên";
    const shortCode = cardData.id.replace(/\s/g, '').slice(-6);
    return `<div class="library-card"><div class="lc-header"><h2>LM Library</h2><p>National Library of Knowledge</p></div><div class="lc-body"><img src="${avatarSrc}" class="lc-photo"><div class="lc-info"><div class="lc-title">THẺ SINH VIÊN</div><div class="lc-row"><div class="lc-label">Họ tên:<span>Full name</span></div><div class="lc-value">${cardData.fullname}</div></div><div class="lc-row"><div class="lc-label">Đơn vị:<span>Institution</span></div><div class="lc-value">${roleVN}</div></div><div class="lc-row"><div class="lc-label">Ngày cấp:<span>Date of issue</span></div><div class="lc-value">${formatDate(issueDate)}</div></div><div class="lc-row"><div class="lc-label">Hết hạn:<span>Date of expiry</span></div><div class="lc-value">${formatDate(expiryDate)}</div></div><div class="lc-barcode-box"><div class="lc-barcode"></div><div class="lc-code-num">${shortCode}</div></div></div></div></div>`;
}
function toggleRegIdInput() {
    const role = document.getElementById('reg-role').value; const group = document.getElementById('reg-id-group');
    if(role === 'student') { group.style.display = 'block'; document.getElementById('reg-id-label').innerText = 'Mã Sinh Viên'; }
    else if(role === 'lecturer') { group.style.display = 'block'; document.getElementById('reg-id-label').innerText = 'Mã GV'; }
    else group.style.display = 'none';
}
function handleAddCardToCart() {
    // [CẬP NHẬT] Notify lỗi/thành công
    if(localStorage.getItem('dlib_card_' + currentUser.id)) { notify("Bạn đã sở hữu thẻ thư viện rồi!", "error"); return; }
    if(cart.some(i => i.type === 'card')) { notify("Bạn đã thêm gói đăng ký thẻ vào giỏ rồi!", "error"); return; }
    
    const role = document.getElementById('reg-role').value; const code = document.getElementById('reg-code').value.trim();
    if((role === 'student' || role === 'lecturer') && !code) { notify("Vui lòng nhập mã số!", "error"); return; }
    
    const plan = document.querySelector('input[name="card-plan"]:checked').value; const price = CARD_PRICES[plan];
    const planName = plan === '6m' ? "6 Tháng" : (plan === '1y' ? "1 Năm" : "1 Tháng");
    const randomNum = Math.floor(100000000000 + Math.random() * 900000000000);
    const cardId = `${randomNum}`.match(/.{1,4}/g).join(' '); 
    const cardItem = { type: 'card', price: price, data: { id: cardId, fullname: currentUser.fullname || currentUser.username, role: role, code: code, plan: plan, planName: planName, created_at: new Date().toISOString() } };
    
    cart.push(cardItem); saveCart(); updateCartBadge(); 
    notify(`✅ Đã thêm gói đăng ký thẻ ${planName} vào giỏ hàng!`, "success");
    const cartTabBtn = document.querySelector('.top-nav li:last-child'); if(cartTabBtn) switchTab('cart', cartTabBtn);
}
function addBookToCart(book, actionType) {
    let finalPrice = 0, label = '';
    if (actionType === 'borrow') { finalPrice = 0; label = 'Mượn sách'; } else { finalPrice = BOOK_PRICE; label = 'Mua sách'; }
    const exists = cart.some(item => item.type === 'book' && item.data.id === book.id && item.action === actionType);
    
    // [CẬP NHẬT] Notify
    if(exists) { notify(`Sách này đã có trong giỏ (${label})!`, "error"); return; }
    
    const item = { type: 'book', action: actionType, data: book, price: finalPrice };
    cart.push(item); saveCart(); updateCartBadge(); 
    notify(`✅ Đã thêm "${book.name}" vào giỏ hàng (${label})!`, "success"); 
    closeModal();
}
function removeFromCart(index) { if(confirm("Xóa mục này khỏi giỏ?")) { cart.splice(index, 1); saveCart(); renderCart(); updateCartBadge(); } }
function saveCart() { localStorage.setItem('dlib_cart_' + currentUser.id, JSON.stringify(cart)); }
function updateCartBadge() { const el = document.getElementById('cart-badge'); if(el) el.innerText = cart.length; }
function renderCart() {
    const tbody = document.getElementById('cart-list-body'); const subTotalEl = document.getElementById('sub-total'); const finalTotalEl = document.getElementById('final-total');
    if(!tbody) return; tbody.innerHTML = ''; let total = 0;
    if (cart.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px; color: #999;">Giỏ hàng trống</td></tr>'; subTotalEl.innerText = '0 đ'; finalTotalEl.innerText = '0 đ'; return; }
    cart.forEach((item, index) => {
        total += item.price; let displayHTML = '', typeLabel = '';
        if(item.type === 'book') { 
            const b = item.data; const img = b.image_url || 'https://via.placeholder.com/40'; 
            displayHTML = `<div style="display:flex; align-items:center; gap:15px;"><img src="${img}" style="width:40px; height:60px; object-fit:cover; border-radius:4px;"><div><div style="font-weight:bold; color:#333;">${b.name}</div><small style="color:#666;">${b.author}</small></div></div>`; 
            if (item.action === 'borrow') typeLabel = '<span class="tag tag-blue">Mượn đọc</span>'; else typeLabel = '<span class="tag" style="background:#f6ffed; color:#52c41a; border:1px solid #b7eb8f">Mua sở hữu</span>';
        } else if (item.type === 'card') { 
            displayHTML = `<div style="display:flex; align-items:center; gap:15px;"><div style="width:40px; height:40px; background:#e6f7ff; border-radius:4px; display:flex; align-items:center; justify-content:center; color:#1890ff;"><i class="fas fa-id-card fa-lg"></i></div><div><div style="font-weight:bold; color:#333;">Đăng ký thẻ thư viện (${item.data.planName})</div><small style="color:#666;">${item.data.fullname} - ${item.data.role}</small></div></div>`; 
            typeLabel = '<span class="tag tag-purple">Dịch vụ</span>';
        }
        tbody.innerHTML += `<tr><td>${displayHTML}</td><td>${typeLabel}</td><td style="font-weight: 500; color: #333;">${item.price.toLocaleString()} đ</td><td><button class="btn-del" style="color:#ff4d4f; border-color:#ff4d4f;" onclick="removeFromCart(${index})"><i class="fas fa-trash"></i> Xóa</button></td></tr>`;
    });
    subTotalEl.innerText = total.toLocaleString() + ' đ'; finalTotalEl.innerText = total.toLocaleString() + ' đ';
}
async function processCheckout() {
    // [CẬP NHẬT] Notify
    if (cart.length === 0) { notify("Giỏ hàng trống!", "error"); return; }
    if (!confirm(`Xác nhận thanh toán tổng cộng ${document.getElementById('final-total').innerText}?`)) return;
    
    const btn = document.querySelector('.btn-checkout'); const oldText = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...'; btn.disabled = true;
    try {
        let borrowCount = 0, buyCount = 0, cardCreated = false; const invoiceLog = [];
        for (const item of cart) {
            if (item.type === 'book') {
                if (item.action === 'borrow') {
                    const res = await DB.borrowBook(currentUser.id, item.data.id, 'borrowing');
                    if (res.success) { borrowCount++; invoiceLog.push({ id: `LOAN-${Date.now()}-${Math.floor(Math.random()*1000)}`, content: `Mượn sách: ${item.data.name}`, amount: 0, date: new Date().toISOString() }); }
                } else {
                    const res = await DB.borrowBook(currentUser.id, item.data.id, 'sold'); 
                    buyCount++; invoiceLog.push({ id: `BUY-${Date.now()}-${Math.floor(Math.random()*1000)}`, content: `Mua sách: ${item.data.name}`, amount: item.price, date: new Date().toISOString() });
                }
            } else if (item.type === 'card') {
                const cData = item.data; const today = new Date(); if(cData.plan === '1m') today.setMonth(today.getMonth() + 1); else if(cData.plan === '6m') today.setMonth(today.getMonth() + 6); else today.setFullYear(today.getFullYear() + 1);
                cData.expiry = today.toISOString(); localStorage.setItem('dlib_card_' + currentUser.id, JSON.stringify(cData)); cardCreated = true;
                invoiceLog.push({ id: `INV-CARD-${Date.now()}`, content: `Đăng ký thẻ thư viện (${cData.planName})`, amount: item.price, date: new Date().toISOString() });
            }
        }
        let oldInvoices = JSON.parse(localStorage.getItem('dlib_invoices_' + currentUser.id)) || []; let newInvoices = [...invoiceLog, ...oldInvoices]; localStorage.setItem('dlib_invoices_' + currentUser.id, JSON.stringify(newInvoices));
        let msg = "✅ Giao dịch hoàn tất!"; if(borrowCount > 0) msg += `<br>- Đã mượn ${borrowCount} sách.`; if(buyCount > 0) msg += `<br>- Đã mua ${buyCount} sách.`; if(cardCreated) msg += `<br>- Kích hoạt thẻ thành công!`;
        
        notify(msg, "success"); // Notify thành công
        cart = []; saveCart(); updateCartBadge(); renderCart();
        if(cardCreated) { const cardTabBtn = document.querySelector('li[onclick*="card-register"]'); if(cardTabBtn) switchTab('card-register', cardTabBtn); } else { const historyTabBtn = document.querySelector('li[onclick*="loans"]'); if(historyTabBtn) switchTab('loans', historyTabBtn); }
    } catch (e) { console.error(e); notify("⚠️ Lỗi hệ thống: " + e.message, "error"); } finally { btn.innerHTML = oldText; btn.disabled = false; }
}
async function renderLoans() {
    const tbody = document.getElementById('loan-list'); tbody.innerHTML = '<tr><td colspan="5">Đang tải dữ liệu...</td></tr>';
    if (!currentUser || !currentUser.id) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Vui lòng đăng nhập lại.</td></tr>'; return; }
    const loans = await DB.getMyLoans(currentUser.id); tbody.innerHTML = '';
    if(loans.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Bạn chưa mượn cuốn sách nào.</td></tr>'; return; }
    loans.forEach(l => {
        let badge = ''; if(l.status === 'borrowing') badge = '<span class="tag tag-blue">Đang mượn</span>'; else if(l.status === 'returned') badge = '<span class="tag" style="background:#ccc; color:#555">Đã trả</span>'; else badge = '<span class="tag tag-purple">Đặt trước</span>';
        let action = l.status === 'borrowing' ? `<button class="btn-del" style="color:#1890ff; border:1px solid #1890ff" onclick="handleReturn(${l.id}, ${l.book_id})">Trả sách</button>` : '-';
        let bookName = l.books ? l.books.name : "Sách đã xóa"; let dueDate = l.due_date ? new Date(l.due_date).toLocaleDateString() : '-';
        tbody.innerHTML += `<tr><td><strong>${bookName}</strong></td><td>${new Date(l.borrow_date).toLocaleDateString()}</td><td>${dueDate}</td><td>${badge}</td><td>${action}</td></tr>`;
    });
}
async function handleReturn(loanId, bookId) { 
    if(confirm("Xác nhận trả sách này?")) { 
        if(await DB.returnBook(loanId, bookId)) { 
            notify("✅ Đã trả sách thành công!", "success"); 
            renderLoans(); loadStats(); 
        } else notify("Lỗi khi trả sách!", "error"); 
    } 
}
async function renderProfile() {
    document.getElementById('p-fullname').innerText = currentUser.fullname || "Chưa cập nhật"; document.getElementById('p-username').innerText = currentUser.username; document.getElementById('p-email').innerText = currentUser.email || "Chưa có email";
    let roleText = currentUser.role === 'lecturer' ? "Giảng Viên" : (currentUser.role === 'admin' ? "Quản Trị Viên" : "Sinh Viên"); document.getElementById('p-role-display').innerHTML = `<i class="fas fa-id-card"></i> ${roleText}`;
    if(currentUser.avatar_url) { document.getElementById('p-avatar').src = currentUser.avatar_url; const hAvatar = document.getElementById('header-avatar'); if(hAvatar) hAvatar.src = currentUser.avatar_url; }
    const allInvoices = JSON.parse(localStorage.getItem('dlib_invoices_' + currentUser.id)) || []; const totalSpent = allInvoices.reduce((sum, inv) => sum + inv.amount, 0); const loans = await DB.getMyLoans(currentUser.id);
    document.getElementById('p-total-books').innerText = loans.length; document.getElementById('p-total-spent').innerText = totalSpent.toLocaleString() + ' đ';
    const borrowList = document.getElementById('p-borrow-list'); borrowList.innerHTML = '';
    if(loans.length === 0) borrowList.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#888; padding:15px;">Chưa mượn sách nào.</td></tr>'; else loans.slice(0, 5).forEach(l => { let statusText = l.status === 'borrowing' ? '<span style="color:#1890ff">Đang mượn</span>' : (l.status === 'returned' ? '<span style="color:#52c41a">Đã trả</span>' : 'Đặt trước'); let bookName = l.books ? l.books.name : "Sách đã xóa"; borrowList.innerHTML += `<tr><td style="font-weight:500">${bookName}</td><td style="color:#666; font-size:13px;">${new Date(l.borrow_date).toLocaleDateString()}</td><td style="font-size:13px;">${statusText}</td></tr>`; });
    const invoiceList = document.getElementById('p-invoice-list'); invoiceList.innerHTML = '';
    if(allInvoices.length === 0) invoiceList.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#888; padding:15px;">Chưa có giao dịch.</td></tr>'; else { allInvoices.slice(0, 5).forEach(inv => { let idShow = inv.id.includes('CARD') ? 'REG-CARD' : inv.id.split('-')[1]; invoiceList.innerHTML += `<tr><td style="font-family:monospace; color:#0969da;">${idShow}...</td><td>${inv.content}</td><td style="color:#d32f2f; font-weight:500;">-${inv.amount.toLocaleString()} đ</td><td style="color:#666; font-size:13px;">${new Date(inv.date).toLocaleDateString()}</td></tr>`; }); }
}
function handleAvatarUpload(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0]; 
        // [CẬP NHẬT] Notify lỗi
        if(file.size > 5 * 1024 * 1024) { notify("Ảnh quá lớn! Vui lòng chọn ảnh dưới 5MB.", "error"); input.value = ''; return; }
        const reader = new FileReader();
        reader.onload = function(e) { const modal = document.getElementById('avatarCropModal'); modal.style.display = 'flex'; const imageEl = document.getElementById('avatar-cropper-img'); imageEl.src = e.target.result; if (avatarCropper) { avatarCropper.destroy(); } avatarCropper = new Cropper(imageEl, { aspectRatio: 1, viewMode: 1, autoCropArea: 0.8 }); }
        reader.readAsDataURL(file);
    }
}
function performAvatarCrop() {
    if (!avatarCropper) return;
    const canvas = avatarCropper.getCroppedCanvas({ width: 300, height: 300 });
    if (canvas) {
        const base64Img = canvas.toDataURL('image/jpeg', 0.8); document.getElementById('p-avatar').src = base64Img; const hAvatar = document.getElementById('header-avatar'); if(hAvatar) hAvatar.src = base64Img;
        DB.updateUser(currentUser.id, { avatar_url: base64Img }).then(success => { 
            // [CẬP NHẬT] Notify
            if (success) { 
                currentUser.avatar_url = base64Img; sessionStorage.setItem('currentUser', JSON.stringify(currentUser)); 
                notify("✅ Đã cập nhật ảnh đại diện thành công!", "success"); 
            } else notify("Lỗi khi lưu ảnh lên hệ thống.", "error"); 
        });
        closeAvatarModal();
    }
}
function closeAvatarModal() { document.getElementById('avatarCropModal').style.display = 'none'; if (avatarCropper) { avatarCropper.destroy(); avatarCropper = null; } document.getElementById('avatar-upload').value = ''; }
function toggleUserMenu() { document.getElementById('userDropdown').classList.toggle('active'); }
document.addEventListener('click', function(event) { const userAction = document.querySelector('.user-action'); if (userAction && !userAction.contains(event.target)) document.getElementById('userDropdown').classList.remove('active'); });
document.addEventListener('DOMContentLoaded', () => { loadStats(); updateCartBadge(); if(currentUser.avatar_url) { const hAvatar = document.getElementById('header-avatar'); if(hAvatar) hAvatar.src = currentUser.avatar_url; } });
function toggleFavorite(event, bookId) {
    event.stopPropagation();
    let book = currentLibFiltered.find(b => b.id == bookId) || favorites.find(f => f.id == bookId);
    if (!book) book = allBooks.find(b => b.id == bookId); if (!book) return; 
    const index = favorites.findIndex(f => f.id == bookId); const btnIcon = event.currentTarget.querySelector('i'); const btnDiv = event.currentTarget;
    if (index === -1) { 
        favorites.push(book); btnDiv.classList.add('active'); btnIcon.className = 'fas fa-heart active'; 
        notify(`✅ Đã thêm "${book.name}" vào Yêu thích!`, "success"); // Notify
    } 
    else { 
        favorites.splice(index, 1); btnDiv.classList.remove('active'); btnIcon.className = 'far fa-heart'; 
        const favTab = document.getElementById('tab-favorites'); if (favTab && favTab.classList.contains('active')) { renderFavorites(); } 
    }
    localStorage.setItem('dlib_favorites_' + currentUser.id, JSON.stringify(favorites));
}
function renderFavorites() {
    const grid = document.getElementById('favorites-grid'); grid.innerHTML = '';
    if (favorites.length === 0) { grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #888; margin-top: 30px;">Bạn chưa yêu thích cuốn sách nào.</p>'; return; }
    favorites.forEach(b => {
        const imgUrl = b.image_url || `https://via.placeholder.com/200x300?text=${encodeURIComponent(b.name.charAt(0))}`;
        let badge = b.is_google ? '<span class="tag tag-purple">Online</span>' : (b.stock > 0 ? '<span class="tag tag-blue">Sẵn sàng</span>' : '<span class="tag tag-red">Hết hàng</span>');
        grid.innerHTML += `<div class="book-item" onclick="openDetail('${b.id}')" style="display:flex; flex-direction:column; height: 100%;"><div class="heart-btn active" onclick="toggleFavorite(event, '${b.id}')"><i class="fas fa-heart active"></i></div><img src="${imgUrl}" class="book-img" style="width: 100%; height: 240px; object-fit: cover;"><div class="book-info" style="flex:1; display:flex; flex-direction:column;"><h4 style="font-size:15px; margin-bottom:5px; color:#333; font-weight:700; line-height:1.4; max-height:42px; overflow:hidden;">${b.name}</h4><p style="font-size:13px; color:#888; margin-bottom:8px;">${b.author}</p><div style="margin-top:auto;">${badge}</div></div></div>`;
    });
}