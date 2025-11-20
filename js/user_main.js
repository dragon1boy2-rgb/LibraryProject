// js/user_main.js

const currentUser = DB.getCurrentUser();
if (!currentUser) window.location.href = 'login.html';

// Set tên trên header
document.getElementById('welcome-user').innerText = currentUser.fullname || currentUser.username;

// --- CẤU HÌNH GIỎ HÀNG & THẺ ---
const BOOK_PRICE = 50000; 
const CARD_PRICES = { '1m': 50000, '6m': 250000, '1y': 450000 };

let cart = JSON.parse(localStorage.getItem('dlib_cart_' + currentUser.id)) || [];
let allBooks = []; 
let displayBooks = [];

// --- 1. ĐIỀU HƯỚNG TAB ---
function switchTab(tabName, element) {
    document.querySelectorAll('.tab-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.top-nav li').forEach(el => el.classList.remove('active'));
    
    const targetTab = document.getElementById('tab-' + tabName);
    if (targetTab) targetTab.classList.add('active');
    
    if (element) element.classList.add('active');
    
    const heroSection = document.getElementById('hero-section');
    if (heroSection) heroSection.style.display = (tabName === 'home') ? 'flex' : 'none';

    if(tabName === 'library') renderLibrary();
    if(tabName === 'loans') renderLoans();
    if(tabName === 'home') loadStats();
    if(tabName === 'cart') renderCart();
    if(tabName === 'profile') renderProfile();
    if(tabName === 'card-register') renderCardRegister(); 
}

// --- 2. THỐNG KÊ ---
async function loadStats() {
    const stats = await DB.getUserStats(currentUser.id);
    document.getElementById('stat-borrowing').innerText = stats.borrowing;
    document.getElementById('stat-reserved').innerText = stats.reserved;
    document.getElementById('stat-fine').innerText = (stats.fine || 0).toLocaleString() + ' đ';
}

// --- 3. KHO SÁCH ---
async function renderLibrary() {
    const grid = document.getElementById('library-grid');
    const keyword = document.getElementById('search-book').value.toLowerCase().trim();

    if (allBooks.length === 0) allBooks = await DB.getBooks();
    let localResults = allBooks.filter(b => b.name.toLowerCase().includes(keyword) || b.author.toLowerCase().includes(keyword));

    let googleResults = [];
    if (keyword.length > 2) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">⏳ Đang tìm với Google Books...</p>';
        googleResults = await DB.searchGoogleBooks(keyword);
    } else if (keyword.length === 0 && localResults.length < 5) {
        if (!window.suggestedBooks) { 
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">⏳ Đang tải sách gợi ý...</p>';
            window.suggestedBooks = await DB.searchGoogleBooks('sách best seller việt nam');
        }
        googleResults = window.suggestedBooks || [];
    }

    displayBooks = [...localResults, ...googleResults];
    grid.innerHTML = '';
    if(displayBooks.length === 0) { grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #888;">Chưa có sách nào trong thư viện.</p>'; return; }

    displayBooks.forEach(b => {
        const imgUrl = b.image_url || `https://via.placeholder.com/200x300?text=${encodeURIComponent(b.name.charAt(0))}`;
        let badge = b.is_google ? '<span class="tag tag-purple">Gợi ý Online</span>' : (b.stock > 0 ? '<span class="tag tag-blue">Sẵn sàng</span>' : '<span class="tag tag-red">Hết hàng</span>');

        grid.innerHTML += `
            <div class="book-item" onclick="openDetail('${b.id}')">
                <img src="${imgUrl}" class="book-img">
                <div class="book-info"><h4>${b.name}</h4><p>${b.author}</p>${badge}</div>
            </div>`;
    });
}

// --- 4. MODAL CHI TIẾT ---
const modal = document.getElementById('detailModal');
let currentBookId = null;

function openDetail(id) {
    const book = displayBooks.find(b => b.id == id); 
    if(!book) return;
    
    currentBookId = book.id;
    document.getElementById('d-img').src = book.image_url || '';
    document.getElementById('d-name').innerText = book.name;
    document.getElementById('d-author').innerText = book.author;
    document.getElementById('d-pub').innerText = book.publisher || 'Đang cập nhật';
    document.getElementById('d-desc').innerText = book.description || 'Chưa có mô tả.';
    
    const btn = document.getElementById('btn-action');
    const stockEl = document.getElementById('d-stock');

    if (book.is_google) {
        stockEl.innerText = "Sách Online"; stockEl.style.color = '#722ed1';
        btn.innerText = "📖 Đọc thử"; btn.style.background = '#722ed1'; btn.disabled = false;
        btn.onclick = () => { window.open(book.preview_link, '_blank'); };
    } else {
        if (book.stock > 0) { 
            stockEl.innerText = `Còn ${book.stock} cuốn`; stockEl.style.color = 'green'; 
            // Check giỏ hàng (Sách)
            const isInCart = cart.some(item => item.type === 'book' && item.data.id === book.id);
            if(isInCart) {
                btn.innerText = "Đã có trong giỏ"; btn.style.background = '#ccc'; btn.disabled = true;
            } else {
                btn.innerText = "Thêm vào giỏ hàng"; btn.style.background = '#1890ff'; btn.disabled = false;
                btn.onclick = () => addBookToCart(book); 
            }
        } else { 
            stockEl.innerText = "Hết hàng"; stockEl.style.color = 'red'; 
            btn.innerText = "Đặt Trước"; btn.style.background = '#faad14'; btn.disabled = false;
            btn.onclick = () => handleAction('reserved'); 
        }
    }
    modal.classList.add('active');
}
function closeModal() { modal.classList.remove('active'); }

async function handleAction(type) {
    if(type === 'reserved') {
        if(!confirm("Bạn muốn đặt trước cuốn sách này?")) return;
        const result = await DB.borrowBook(currentUser.id, currentBookId, 'reserved');
        if(result.success) { alert("Đã đặt trước thành công!"); closeModal(); loadStats(); }
        else alert("Lỗi: " + result.message); 
    }
}

// --- 5. XỬ LÝ ĐĂNG KÝ THẺ & RENDER THẺ ID ---
function renderCardRegister() {
    const myCard = JSON.parse(localStorage.getItem('dlib_card_' + currentUser.id));
    const formContainer = document.getElementById('register-form-container');
    const cardDisplay = document.getElementById('my-card-display');

    if (myCard) {
        formContainer.style.display = 'none';
        cardDisplay.style.display = 'flex';
        cardDisplay.innerHTML = generateCardHTML(myCard);
    } else {
        formContainer.style.display = 'flex';
        cardDisplay.style.display = 'none';
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
    const expiryDate = new Date(cardData.expiry);
    const issueDate = new Date(cardData.created_at);
    const formatDate = (d) => `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
    
    const avatarSrc = localStorage.getItem('user_avatar_' + currentUser.id) || "https://via.placeholder.com/150";
    let roleVN = "Độc Giả";
    if(cardData.role === 'student') roleVN = "Sinh Viên";
    else if(cardData.role === 'lecturer') roleVN = "Giảng Viên";

    const shortCode = cardData.id.replace(/\s/g, '').slice(-6);

    return `
        <div class="library-card">
            <div class="lc-header">
                <h2>DLib K12 Library</h2>
                <p>National Library of Knowledge</p>
            </div>
            <div class="lc-body">
                <img src="${avatarSrc}" class="lc-photo" alt="Photo">
                <div class="lc-info">
                    <div class="lc-title">THẺ SINH VIÊN</div>
                    <div class="lc-row">
                        <div class="lc-label">Họ tên:<span>Full name</span></div>
                        <div class="lc-value">${cardData.fullname}</div>
                    </div>
                    <div class="lc-row">
                        <div class="lc-label">Đơn vị:<span>Institution</span></div>
                        <div class="lc-value">${roleVN}</div>
                    </div>
                    <div class="lc-row">
                        <div class="lc-label">Ngày cấp:<span>Date of issue</span></div>
                        <div class="lc-value">${formatDate(issueDate)}</div>
                    </div>
                    <div class="lc-row">
                        <div class="lc-label">Hết hạn:<span>Date of expiry</span></div>
                        <div class="lc-value">${formatDate(expiryDate)}</div>
                    </div>
                    <div class="lc-barcode-box">
                        <div class="lc-barcode"></div>
                        <div class="lc-code-num">${shortCode}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function toggleRegIdInput() {
    const role = document.getElementById('reg-role').value;
    const group = document.getElementById('reg-id-group');
    if(role === 'student') { group.style.display = 'block'; document.getElementById('reg-id-label').innerText = 'Mã Sinh Viên'; }
    else if(role === 'lecturer') { group.style.display = 'block'; document.getElementById('reg-id-label').innerText = 'Mã GV'; }
    else group.style.display = 'none';
}

function handleAddCardToCart() {
    if(localStorage.getItem('dlib_card_' + currentUser.id)) { alert("Bạn đã sở hữu thẻ thư viện rồi!"); return; }
    if(cart.some(i => i.type === 'card')) { alert("Bạn đã thêm gói đăng ký thẻ vào giỏ rồi!"); return; }

    const role = document.getElementById('reg-role').value;
    const code = document.getElementById('reg-code').value.trim();
    if((role === 'student' || role === 'lecturer') && !code) { alert("Vui lòng nhập mã số!"); return; }

    const plan = document.querySelector('input[name="card-plan"]:checked').value;
    const price = CARD_PRICES[plan];
    const planName = plan === '6m' ? "6 Tháng" : (plan === '1y' ? "1 Năm" : "1 Tháng");
    
    const randomNum = Math.floor(100000000000 + Math.random() * 900000000000);
    const cardId = `${randomNum}`.match(/.{1,4}/g).join(' '); 

    const cardItem = {
        type: 'card',
        price: price,
        data: {
            id: cardId,
            fullname: currentUser.fullname || currentUser.username,
            role: role,
            code: code,
            plan: plan,
            planName: planName,
            created_at: new Date().toISOString()
        }
    };

    cart.push(cardItem);
    saveCart(); updateCartBadge();
    alert(`Đã thêm gói đăng ký thẻ ${planName} vào giỏ hàng!`);
    const cartTabBtn = document.querySelector('.top-nav li:last-child');
    if(cartTabBtn) switchTab('cart', cartTabBtn);
}

// --- 6. GIỎ HÀNG & THANH TOÁN ---
function addBookToCart(book) {
    const item = { type: 'book', data: book, price: BOOK_PRICE };
    cart.push(item); saveCart(); updateCartBadge();
    alert(`Đã thêm "${book.name}" vào giỏ hàng!`); closeModal();
}

function removeFromCart(index) {
    if(confirm("Xóa mục này khỏi giỏ?")) {
        cart.splice(index, 1); saveCart(); renderCart(); updateCartBadge();
    }
}

function saveCart() { localStorage.setItem('dlib_cart_' + currentUser.id, JSON.stringify(cart)); }
function updateCartBadge() {
    const el = document.getElementById('cart-badge');
    if(el) el.innerText = cart.length;
}

function renderCart() {
    const tbody = document.getElementById('cart-list-body');
    const subTotalEl = document.getElementById('sub-total');
    const finalTotalEl = document.getElementById('final-total');
    if(!tbody) return;
    tbody.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px; color: #999;">Giỏ hàng trống</td></tr>';
        subTotalEl.innerText = '0 đ'; finalTotalEl.innerText = '0 đ'; return;
    }

    cart.forEach((item, index) => {
        total += item.price;
        let displayHTML = '';
        
        if(item.type === 'book') {
            const b = item.data;
            const img = b.image_url || 'https://via.placeholder.com/40';
            displayHTML = `
                <div style="display:flex; align-items:center; gap:15px;">
                    <img src="${img}" style="width:40px; height:60px; object-fit:cover; border-radius:4px;">
                    <div><div style="font-weight:bold; color:#333;">${b.name}</div><small style="color:#666;">Sách giấy - Phí cọc</small></div>
                </div>`;
        } else if (item.type === 'card') {
            displayHTML = `
                <div style="display:flex; align-items:center; gap:15px;">
                    <div style="width:40px; height:40px; background:#e6f7ff; border-radius:4px; display:flex; align-items:center; justify-content:center; color:#1890ff;">
                        <i class="fas fa-id-card fa-lg"></i>
                    </div>
                    <div>
                        <div style="font-weight:bold; color:#333;">Đăng ký thẻ thư viện (${item.data.planName})</div>
                        <small style="color:#666;">${item.data.fullname} - ${item.data.role}</small>
                    </div>
                </div>`;
        }

        tbody.innerHTML += `
            <tr>
                <td>${displayHTML}</td>
                <td style="font-weight: 500; color: #333;">${item.price.toLocaleString()} đ</td>
                <td><button class="btn-del" style="color:#ff4d4f; border-color:#ff4d4f;" onclick="removeFromCart(${index})"><i class="fas fa-trash"></i> Xóa</button></td>
            </tr>`;
    });
    subTotalEl.innerText = total.toLocaleString() + ' đ';
    finalTotalEl.innerText = total.toLocaleString() + ' đ';
}

async function processCheckout() {
    if (cart.length === 0) { alert("Giỏ hàng trống!"); return; }
    if (!confirm(`Xác nhận thanh toán tổng cộng ${document.getElementById('final-total').innerText}?`)) return;
    
    const btn = document.querySelector('.btn-checkout');
    const oldText = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...'; btn.disabled = true;
    
    try {
        let bookCount = 0;
        let cardCreated = false;
        const invoiceLog = [];

        for (const item of cart) {
            // 1. Xử lý Sách
            if (item.type === 'book') {
                const res = await DB.borrowBook(currentUser.id, item.data.id, 'borrowing');
                if (res.success) {
                    bookCount++;
                    invoiceLog.push({
                        id: `INV-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                        content: `Phí cọc: ${item.data.name}`,
                        amount: item.price,
                        date: new Date().toISOString()
                    });
                }
            } 
            // 2. Xử lý Thẻ
            else if (item.type === 'card') {
                const cData = item.data;
                const today = new Date();
                if(cData.plan === '1m') today.setMonth(today.getMonth() + 1);
                else if(cData.plan === '6m') today.setMonth(today.getMonth() + 6);
                else today.setFullYear(today.getFullYear() + 1);
                
                cData.expiry = today.toISOString();
                localStorage.setItem('dlib_card_' + currentUser.id, JSON.stringify(cData));
                cardCreated = true;

                invoiceLog.push({
                    id: `INV-CARD-${Date.now()}`,
                    content: `Đăng ký thẻ thư viện (${cData.planName})`,
                    amount: item.price,
                    date: new Date().toISOString()
                });
            }
        }

        // Lưu lịch sử hóa đơn
        let oldInvoices = JSON.parse(localStorage.getItem('dlib_invoices_' + currentUser.id)) || [];
        let newInvoices = [...invoiceLog, ...oldInvoices];
        localStorage.setItem('dlib_invoices_' + currentUser.id, JSON.stringify(newInvoices));

        let msg = "✅ Thanh toán thành công!";
        if(bookCount > 0) msg += `\n- Đã mượn ${bookCount} cuốn sách.`;
        if(cardCreated) msg += `\n- Đã kích hoạt thẻ thư viện thành công!`;
        
        alert(msg);
        cart = []; saveCart(); updateCartBadge(); renderCart();
        
        if(cardCreated) {
            const cardTabBtn = document.querySelectorAll('.top-nav li')[2]; 
            if(cardTabBtn) switchTab('card-register', cardTabBtn);
        } else {
            const historyTabBtn = document.querySelectorAll('.top-nav li')[3];
            if(historyTabBtn) switchTab('loans', historyTabBtn);
        }

    } catch (e) { console.error(e); alert("Lỗi hệ thống!"); } finally { btn.innerHTML = oldText; btn.disabled = false; }
}

// --- 7. MƯỢN TRẢ ---
async function renderLoans() {
    const tbody = document.getElementById('loan-list'); 
    tbody.innerHTML = '<tr><td colspan="5">Đang tải dữ liệu...</td></tr>';
    const loans = await DB.getMyLoans(currentUser.id); 
    tbody.innerHTML = '';
    if(loans.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Bạn chưa mượn cuốn sách nào.</td></tr>'; return; }
    
    loans.forEach(l => {
        let badge = '';
        if(l.status === 'borrowing') badge = '<span class="tag tag-blue">Đang mượn</span>';
        else if(l.status === 'returned') badge = '<span class="tag" style="background:#ccc; color:#555">Đã trả</span>';
        else badge = '<span class="tag tag-purple">Đặt trước</span>';
        
        let action = l.status === 'borrowing' ? `<button class="btn-del" style="color:#1890ff; border:1px solid #1890ff" onclick="handleReturn(${l.id}, ${l.book_id})">Trả sách</button>` : '-';
        let bookName = l.books ? l.books.name : "Sách đã xóa";
        let dueDate = l.due_date ? new Date(l.due_date).toLocaleDateString() : '-';
        
        tbody.innerHTML += `<tr><td><strong>${bookName}</strong></td><td>${new Date(l.borrow_date).toLocaleDateString()}</td><td>${dueDate}</td><td>${badge}</td><td>${action}</td></tr>`;
    });
}

async function handleReturn(loanId, bookId) { 
    if(confirm("Xác nhận trả sách này?")) { 
        if(await DB.returnBook(loanId, bookId)) { alert("Đã trả sách thành công!"); renderLoans(); loadStats(); } 
        else alert("Lỗi khi trả sách!"); 
    } 
}

// --- 8. RENDER PROFILE (REMOVED MINI CARD) ---
async function renderProfile() {
    document.getElementById('p-fullname').innerText = currentUser.fullname || "Chưa cập nhật";
    document.getElementById('p-username').innerText = currentUser.username;
    document.getElementById('p-email').innerText = currentUser.email || "Chưa có email";
    let roleText = currentUser.role === 'lecturer' ? "Giảng Viên" : (currentUser.role === 'admin' ? "Quản Trị Viên" : "Sinh Viên");
    document.getElementById('p-role-display').innerHTML = `<i class="fas fa-id-card"></i> ${roleText}`;

    const savedAvatar = localStorage.getItem('user_avatar_' + currentUser.id);
    if(savedAvatar) {
        document.getElementById('p-avatar').src = savedAvatar;
        const hAvatar = document.getElementById('header-avatar'); if(hAvatar) hAvatar.src = savedAvatar;
    }
    
    // REMOVED MINI CARD RENDER LOGIC HERE

    const allInvoices = JSON.parse(localStorage.getItem('dlib_invoices_' + currentUser.id)) || [];
    const totalSpent = allInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    
    const loans = await DB.getMyLoans(currentUser.id);
    document.getElementById('p-total-books').innerText = loans.length;
    document.getElementById('p-total-spent').innerText = totalSpent.toLocaleString() + ' đ';

    const borrowList = document.getElementById('p-borrow-list');
    borrowList.innerHTML = '';
    if(loans.length === 0) borrowList.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#888; padding:15px;">Chưa mượn sách nào.</td></tr>';
    else loans.slice(0, 5).forEach(l => {
        let statusText = l.status === 'borrowing' ? '<span style="color:#1890ff">Đang mượn</span>' : (l.status === 'returned' ? '<span style="color:#52c41a">Đã trả</span>' : 'Đặt trước');
        let bookName = l.books ? l.books.name : "Sách đã xóa";
        borrowList.innerHTML += `<tr><td style="font-weight:500">${bookName}</td><td style="color:#666; font-size:13px;">${new Date(l.borrow_date).toLocaleDateString()}</td><td style="font-size:13px;">${statusText}</td></tr>`;
    });
    
    const invoiceList = document.getElementById('p-invoice-list');
    invoiceList.innerHTML = '';
    if(allInvoices.length === 0) {
        invoiceList.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#888; padding:15px;">Chưa có giao dịch.</td></tr>';
    } else {
        allInvoices.slice(0, 5).forEach(inv => {
            let idShow = inv.id.includes('CARD') ? 'REG-CARD' : inv.id.split('-')[1];
            invoiceList.innerHTML += `<tr><td style="font-family:monospace; color:#0969da;">${idShow}...</td><td>${inv.content}</td><td style="color:#d32f2f; font-weight:500;">-${inv.amount.toLocaleString()} đ</td><td style="color:#666; font-size:13px;">${new Date(inv.date).toLocaleDateString()}</td></tr>`;
        });
    }
}

// --- 9. UPLOAD AVATAR ---
function handleAvatarUpload(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        if(file.size > 2 * 1024 * 1024) { alert("Ảnh quá lớn! Vui lòng chọn ảnh dưới 2MB."); return; }
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64Img = e.target.result;
            document.getElementById('p-avatar').src = base64Img;
            const hAvatar = document.getElementById('header-avatar'); if(hAvatar) hAvatar.src = base64Img;
            localStorage.setItem('user_avatar_' + currentUser.id, base64Img);
            alert("✅ Đã cập nhật ảnh đại diện thành công!");
        }
        reader.readAsDataURL(file);
    }
}

// --- 10. INIT ---
function toggleUserMenu() { document.getElementById('userDropdown').classList.toggle('active'); }
document.addEventListener('click', function(event) {
    const userAction = document.querySelector('.user-action');
    if (userAction && !userAction.contains(event.target)) document.getElementById('userDropdown').classList.remove('active');
});

document.addEventListener('DOMContentLoaded', () => {
    loadStats(); updateCartBadge(); 
    const savedAvatar = localStorage.getItem('user_avatar_' + currentUser.id);
    if(savedAvatar) { const hAvatar = document.getElementById('header-avatar'); if(hAvatar) hAvatar.src = savedAvatar; }
});