// js/data.js

// --- 1. CẤU HÌNH KẾT NỐI SUPABASE ---
const SUPABASE_URL = 'https://onlyphcvixxmvnrzrkkl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ubHlwaGN2aXh4bXZucnpya2tsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMjIwNDcsImV4cCI6MjA3ODc5ODA0N30.IU2BYpZu-7Ya_daQtvLBiMvUp-A8VYR94lmnANBeSRg';

if (typeof supabase === 'undefined') console.error("Lỗi: Chưa load thư viện Supabase!");
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DB = {
    // Expose biến _supabase để dùng ở các file khác nếu cần
    supabase: _supabase,

    // ================= XÁC THỰC & LOG =================
    login: async (u, p) => {
        const { data: user, error } = await _supabase.from('users').select('*').eq('username', u).eq('password', p).single();
        if (error || !user) return null;
        try { await _supabase.from('access_logs').insert([{ user_id: user.id, role: user.role }]); } catch (e) {}
        return user;
    },

    register: async (u, p, n, e, role, idCode) => {
        const { data: ex } = await _supabase.from('users').select('id').eq('username', u).maybeSingle();
        if (ex) return { success: false, message: "Tên đăng nhập đã tồn tại!" };

        const newUser = { username: u, password: p, fullname: n, email: e, role: role };
        if (role === 'student') newUser.student_id = idCode;
        if (role === 'lecturer') newUser.lecturer_id = idCode;

        const { error } = await _supabase.from('users').insert([newUser]);
        return error ? { success: false, message: error.message } : { success: true };
    },

    // --- TỰ ĐỘNG RESET MẬT KHẨU ---
    resetPasswordAuto: async (username, email) => {
        const { data: user, error } = await _supabase
            .from('users')
            .select('id, fullname')
            .eq('username', username)
            .eq('email', email)
            .maybeSingle();

        if (error || !user) {
            return { success: false, message: "Tên đăng nhập hoặc Email không chính xác!" };
        }

        const newPass = Math.random().toString(36).slice(-6).toUpperCase();

        const { error: updateError } = await _supabase
            .from('users')
            .update({ password: newPass })
            .eq('id', user.id);

        if (updateError) {
            return { success: false, message: "Lỗi hệ thống: " + updateError.message };
        }

        return { success: true, newPass: newPass, fullname: user.fullname || username };
    },

    getCurrentUser: () => {
        const u = sessionStorage.getItem('currentUser');
        return u ? JSON.parse(u) : null;
    },

    logout: () => {
        _supabase.auth.signOut();
        sessionStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    },

    // --- GOOGLE LOGIN ---
    loginWithGoogle: async () => {
        const { data, error } = await _supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.href,
                queryParams: { access_type: 'offline', prompt: 'consent' },
            }
        });
        if (error) alert("Lỗi Google Login: " + error.message);
    },

    handleOAuthLogin: async () => {
        console.log("🚀 Bắt đầu xử lý OAuth...");
        const safetyTimeout = setTimeout(() => {
            const container = document.getElementById('container');
            if(container) {
                container.innerHTML = `
                    <div style="text-align:center; padding:20px;">
                        <h3 style="color:red;">⚠️ Quá thời gian xác thực!</h3>
                        <p>Hệ thống không nhận được phản hồi từ Google hoặc Supabase.</p>
                        <button onclick="window.location.href='login.html'" style="padding:10px 20px; cursor:pointer; margin-top:10px;">Thử lại</button>
                    </div>`;
            }
        }, 10000); 

        const { data: { subscription } } = _supabase.auth.onAuthStateChange(async (event, session) => {
            if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
                console.log("✅ Tìm thấy session:", session.user.email);
                clearTimeout(safetyTimeout); 
                
                try {
                    const email = session.user.email;
                    const meta = session.user.user_metadata || {};
                    const fullName = meta.full_name || meta.name || email.split('@')[0];
                    const avatar = meta.avatar_url;

                    const { data: existingUsers } = await _supabase.from('users').select('*').eq('email', email);
                    let currentUser = null;
                    if (existingUsers && existingUsers.length > 0) {
                        currentUser = existingUsers[0];
                    }

                    if (!currentUser) {
                        const randomId = Math.floor(1000 + Math.random() * 9000);
                        let newUsername = email.split('@')[0];
                        const { data: checkUser } = await _supabase.from('users').select('id').eq('username', newUsername).maybeSingle();
                        if (checkUser) newUsername = newUsername + '_' + randomId;

                        const newUser = {
                            username: newUsername,
                            password: 'google_auth_user_' + randomId,
                            fullname: fullName,
                            email: email,
                            avatar_url: avatar,
                            role: 'student', 
                            student_id: 'G-' + randomId 
                        };
                        const { data: created, error: insertError } = await _supabase.from('users').insert([newUser]).select().single();
                        if (insertError) throw new Error("Lỗi Insert DB: " + insertError.message);
                        currentUser = created;
                    }

                    if (currentUser) {
                        if (!currentUser.avatar_url && avatar) {
                            currentUser.avatar_url = avatar;
                            _supabase.from('users').update({ avatar_url: avatar }).eq('id', currentUser.id).then();
                        }
                        if(avatar) localStorage.setItem('user_avatar_' + currentUser.id, avatar);
                        
                        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                        _supabase.from('access_logs').insert([{ user_id: currentUser.id, role: currentUser.role }]).then();
                        window.history.replaceState({}, document.title, window.location.pathname);

                        if (currentUser.role === 'admin') window.location.href = 'admin_dashboard.html';
                        else window.location.href = 'user_dashboard.html';
                    }
                } catch (err) {
                    clearTimeout(safetyTimeout);
                    console.error(err);
                    alert("Lỗi xử lý dữ liệu: " + err.message);
                    window.location.href = 'login.html';
                }
            }
        });
        const { data: { session } } = await _supabase.auth.getSession();
    },

    // ================= THỐNG KÊ DASHBOARD =================
    getStats: async () => {
        const books = await _supabase.from('books').select('*', { count: 'exact', head: true });
        const resources = await _supabase.from('resources').select('*', { count: 'exact', head: true });
        const users = await _supabase.from('users').select('*', { count: 'exact', head: true });
        return { books: books.count || 0, resources: resources.count || 0, users: users.count || 0 };
    },

    getAccessStats: async (startDate, endDate) => {
        const { data, error } = await _supabase
            .from('access_logs')
            .select('role')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

        if (error) return { student: 0, lecturer: 0 };
        return { 
            student: data.filter(x => x.role === 'student').length, 
            lecturer: data.filter(x => x.role === 'lecturer').length 
        };
    },

    getTopBooks: async (startDate, endDate) => {
        const { data, error } = await _supabase
            .from('loans')
            .select('book_id, books(*)')
            .gte('borrow_date', startDate.toISOString())
            .lte('borrow_date', endDate.toISOString());
        
        if (error || !data) return [];
        const counts = {};
        data.forEach(item => {
            if(item.books) {
                const id = item.book_id;
                if (!counts[id]) counts[id] = { ...item.books, borrow_count: 0 };
                counts[id].borrow_count++;
            }
        });
        return Object.values(counts).sort((a, b) => b.borrow_count - a.borrow_count).slice(0, 5);
    },

    getUserStats: async (userId) => {
        const { data } = await _supabase.from('loans').select('*').eq('user_id', userId);
        if(!data) return { borrowing: 0, reserved: 0, fine: 0 };

        const today = new Date();
        const FINE_PER_DAY = 5000;
        let totalFine = 0;

        data.forEach(l => {
            if ((l.status === 'borrowing' || l.status === 'overdue') && !l.fine_paid) {
                 const dueDate = new Date(l.due_date);
                 if (today > dueDate) {
                     const diffTime = Math.abs(today - dueDate);
                     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                     totalFine += diffDays * FINE_PER_DAY;
                 }
            }
        });

        return { 
            borrowing: data.filter(x => x.status === 'borrowing' || x.status === 'overdue').length, 
            reserved: data.filter(x => x.status === 'reserved').length, 
            fine: totalFine 
        };
    },

    // ================= QUẢN LÝ SÁCH =================
    getBooks: async () => { 
        const { data } = await _supabase.from('books').select('*').order('id', { ascending: false }); 
        return data || []; 
    },

    searchGoogleBooks: async (keyword) => {
        if (!keyword) return [];
        try {
            const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(keyword)}&maxResults=15&langRestrict=vi`);
            const data = await res.json();
            if (!data.items) return [];
            return data.items.map(item => {
                const info = item.volumeInfo;
                return {
                    id: item.id,
                    name: info.title,
                    author: info.authors ? info.authors.join(', ') : 'Nhiều tác giả',
                    publisher: info.publisher || 'NXB Quốc Tế',
                    image_url: info.imageLinks ? info.imageLinks.thumbnail : 'https://via.placeholder.com/150',
                    description: info.description ? info.description.substring(0, 300) + '...' : 'Không có mô tả.',
                    stock: 0,
                    is_google: true,
                    preview_link: info.previewLink
                };
            });
        } catch (e) {
            console.error(e); return [];
        }
    },

    addBook: async (item) => { const { error } = await _supabase.from('books').insert([item]); if(error) alert(error.message); else alert("Đã thêm sách vào kho!"); },
    updateBook: async (id, item) => { const { error } = await _supabase.from('books').update(item).eq('id', id); return !error; },
    
    // [UPDATED] Xóa Sách với kiểm tra ràng buộc
    deleteBook: async (id) => { 
        // 1. Kiểm tra xem sách có đang được mượn không
        const { data: activeLoans, error: checkError } = await _supabase
            .from('loans')
            .select('id')
            .eq('book_id', id)
            .in('status', ['borrowing', 'overdue', 'reserved']);

        if (checkError) {
            alert("Lỗi kiểm tra dữ liệu: " + checkError.message);
            return;
        }

        if (activeLoans && activeLoans.length > 0) {
            alert(`⚠️ KHÔNG THỂ XÓA!\nSách này đang được mượn hoặc đặt trước (${activeLoans.length} lượt).\nVui lòng thu hồi sách trước khi xóa.`);
            return;
        }

        // 2. Nếu không ai mượn -> Xóa lịch sử cũ và xóa sách
        if (confirm("Sách này hiện không có ai mượn.\nBạn có chắc muốn xóa vĩnh viễn (bao gồm cả lịch sử cũ)?")) {
            await _supabase.from('loans').delete().eq('book_id', id); // Xóa history đã trả
            const { error } = await _supabase.from('books').delete().eq('id', id); // Xóa sách
            
            if(error) alert(error.message); 
            else alert("✅ Đã xóa sách thành công!"); 
        }
    },

    // ================= QUẢN LÝ TÀI NGUYÊN =================
    getResources: async () => { const { data } = await _supabase.from('resources').select('*').order('id', { ascending: false }); return data || []; },
    addResource: async (item) => { const { error } = await _supabase.from('resources').insert([item]); if(error) alert(error.message); else alert("Thành công!"); },
    deleteResource: async (id) => { const { error } = await _supabase.from('resources').delete().eq('id', id); if(error) alert(error.message); else alert("Đã xóa!"); },

    // ================= QUẢN LÝ USER =================
    getUsers: async () => { const { data } = await _supabase.from('users').select('*').order('id', { ascending: false }); return data || []; },
    addUser: async (item) => { 
        const { data: ex } = await _supabase.from('users').select('id').eq('username', item.username).maybeSingle();
        if (ex) { alert("Trùng tên đăng nhập!"); return false; }
        const { error } = await _supabase.from('users').insert([item]); 
        if(error) { alert(error.message); return false; }
        alert("Thành công!"); return true;
    },
    updateUser: async (id, updates) => { const { error } = await _supabase.from('users').update(updates).eq('id', id); return !error; },
    
    // [UPDATED] Xóa User với kiểm tra ràng buộc
    deleteUser: async (id) => { 
        // 1. Kiểm tra User có đang mượn sách không
        const { data: activeLoans, error: checkError } = await _supabase
            .from('loans')
            .select('id')
            .eq('user_id', id)
            .in('status', ['borrowing', 'overdue', 'reserved']);

        if (checkError) {
            alert("Lỗi kiểm tra dữ liệu: " + checkError.message);
            return;
        }

        if (activeLoans && activeLoans.length > 0) {
            alert(`⚠️ KHÔNG THỂ XÓA!\nTài khoản này đang mượn hoặc đặt trước ${activeLoans.length} cuốn sách.\nVui lòng yêu cầu trả sách trước khi xóa.`);
            return;
        }

        // 2. Nếu không nợ sách -> Xóa sạch
        if (confirm("Tài khoản này không đang nợ sách.\nBạn có chắc muốn xóa vĩnh viễn (gồm cả lịch sử)?")) {
            await _supabase.from('loans').delete().eq('user_id', id); // Xóa history
            await _supabase.from('access_logs').delete().eq('user_id', id); // Xóa log đăng nhập
            const { error } = await _supabase.from('users').delete().eq('id', id); // Xóa User
            
            if(error) alert("Lỗi: " + error.message); 
            else alert("✅ Đã xóa tài khoản thành công!"); 
        }
    },

    // ================= MƯỢN TRẢ =================
    getAllLoans: async () => { 
        const { data } = await _supabase
            .from('loans')
            .select('*, books(name), users(username, fullname)')
            .order('borrow_date', { ascending: false }); 
        return data || []; 
    },

    getMyLoans: async (userId) => { 
        if (!userId) return [];
        const { data } = await _supabase
            .from('loans')
            .select('*, books(*)')
            .eq('user_id', userId)
            .order('borrow_date', { ascending: false }); 
        return data || []; 
    },
    
    borrowBook: async (userId, bookId, actionType, customDueDate = null) => {
        const borrowDate = new Date(); 
        let dueDate = new Date();

        if (customDueDate) {
            dueDate = new Date(customDueDate); 
        } else {
            dueDate.setDate(dueDate.getDate() + 14); 
        }

        const { error } = await _supabase.from('loans').insert([{ 
            user_id: userId, 
            book_id: bookId, 
            status: actionType, 
            borrow_date: borrowDate.toISOString(), 
            due_date: dueDate.toISOString() 
        }]);
        
        if (error) return { success: false, message: error.message };
        
        if (actionType === 'borrowing') {
            const { data: b } = await _supabase.from('books').select('stock').eq('id', bookId).single();
            if(b) await _supabase.from('books').update({ stock: b.stock - 1 }).eq('id', bookId);
        }
        return { success: true };
    },
    
    returnBook: async (loanId, bookId) => {
        const { error } = await _supabase.from('loans').update({ status: 'returned', return_date: new Date().toISOString() }).eq('id', loanId);
        if (error) return false;
        const { data: b } = await _supabase.from('books').select('stock').eq('id', bookId).single();
        if(b) await _supabase.from('books').update({ stock: b.stock + 1 }).eq('id', bookId);
        return true;
    },

    payFine: async (loanId) => {
        const { error } = await _supabase.from('loans').update({ fine_paid: true }).eq('id', loanId);
        return !error;
    },

    getOverdueLoans: async () => {
        const { data } = await _supabase
            .from('loans')
            .select('*, books(name), users(username, fullname)')
            .eq('status', 'borrowing')
            .lt('due_date', new Date().toISOString());

        if (!data) return [];
        return data.filter(l => !l.fine_paid);
    },

    // ================= GỢI Ý ONLINE =================
    searchOnlineEbooks: async (keyword = 'Sách Tiếng Việt') => {
        try {
            const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(keyword)}&filter=free-ebooks&printType=books&maxResults=21&langRestrict=vi`;
            const res = await fetch(url);
            const data = await res.json();
            
            if (!data.items) return [];

            return data.items.map(item => {
                const info = item.volumeInfo;
                const access = item.accessInfo;
                let downloadLink = null;
                if (access.pdf && access.pdf.downloadLink) downloadLink = access.pdf.downloadLink;
                else if (access.epub && access.epub.downloadLink) downloadLink = access.epub.downloadLink;
                else if (info.infoLink) downloadLink = info.infoLink;

                return {
                    id: 'online_ebook_' + item.id,
                    name: info.title,
                    author: info.authors ? info.authors.join(', ') : 'N/A',
                    type: 'Ebook Online',
                    size: info.pageCount ? `${info.pageCount} trang` : 'Online',
                    resource_url: info.previewLink,
                    download_url: downloadLink,
                    image_url: info.imageLinks ? info.imageLinks.thumbnail : null,
                    is_online: true
                };
            });
        } catch (e) { console.error("Lỗi tìm Ebook:", e); return []; }
    },

    searchOnlinePDFs: async (keyword = 'Giáo trình') => {
        try {
            const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(keyword)}&filter=free-ebooks&maxResults=40&langRestrict=vi`;
            const res = await fetch(url);
            const data = await res.json();
            if (!data.items) return [];
            const pdfItems = data.items.filter(item => item.accessInfo.pdf && item.accessInfo.pdf.isAvailable).slice(0, 21);
            return pdfItems.map(item => {
                const info = item.volumeInfo;
                const access = item.accessInfo;
                return {
                    id: 'online_pdf_' + item.id,
                    name: info.title,
                    author: info.authors ? info.authors.join(', ') : 'N/A',
                    type: 'PDF Online',
                    size: 'PDF',
                    resource_url: access.pdf.downloadLink || info.previewLink,
                    download_url: access.pdf.downloadLink,
                    image_url: info.imageLinks ? info.imageLinks.thumbnail : null,
                    is_online: true
                };
            });
        } catch (e) { console.error("Lỗi tìm PDF:", e); return []; }
    },

    getSuggestedVideos: async () => {
        const videos = [
            { id: 'v1', name: 'Lịch sử Việt Nam: Nguồn cội', url: 'https://www.youtube.com/results?search_query=lich+su+viet+nam+nguon+coi', author: 'VTV7' },
            { id: 'v2', name: 'Kỹ năng tự học hiệu quả', url: 'https://www.youtube.com/results?search_query=ky+nang+tu+hoc+hieu+qua', author: 'Web5Ngay' },
        ];
        return videos.map(v => ({
            id: v.id, name: v.name, author: v.author, type: 'Video Online', size: 'YouTube',
            resource_url: v.url, download_url: null,
            image_url: `https://img.youtube.com/vi/placehold/mqdefault.jpg`, is_online: true
        }));
    }
};

function toggleSubmenu(event) {
    event.preventDefault(); 
    const parentLi = event.currentTarget.parentElement;
    parentLi.classList.toggle('open');
}

// ================= NOTIFICATION (TOAST) =================
const toastStyle = document.createElement('style');
toastStyle.innerHTML = `
    #toast-container {
        position: fixed; top: 20px; right: 20px; z-index: 999999;
        display: flex; flex-direction: column; gap: 10px;
    }
    .toast-msg {
        background: white; color: #333; min-width: 300px; padding: 15px 20px;
        border-radius: 8px; box-shadow: 0 5px 20px rgba(0,0,0,0.15);
        display: flex; align-items: center; gap: 15px;
        border-left: 5px solid #333;
        animation: toastSlideIn 0.4s ease, toastFadeOut 0.4s 3.6s forwards;
        font-family: 'Segoe UI', Roboto, sans-serif; font-size: 14px;
    }
    .toast-msg.success { border-color: #52c41a; }
    .toast-msg.success i { color: #52c41a; font-size: 20px; }
    .toast-msg.error { border-color: #ff4d4f; }
    .toast-msg.error i { color: #ff4d4f; font-size: 20px; }
    .toast-msg.info { border-color: #1890ff; }
    .toast-msg.info i { color: #1890ff; font-size: 20px; }
    @keyframes toastSlideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes toastFadeOut { to { opacity: 0; visibility: hidden; } }
`;
document.head.appendChild(toastStyle);

const toastContainer = document.createElement('div');
toastContainer.id = 'toast-container';
document.body.appendChild(toastContainer);

window.showToast = function(message, type = 'info') {
    const toast = document.createElement('div');
    let icon = 'fa-info-circle';
    if(type === 'success') icon = 'fa-check-circle';
    if(type === 'error') icon = 'fa-exclamation-circle';
    toast.className = `toast-msg ${type}`;
    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
    const container = document.getElementById('toast-container') || document.body;
    if(container.id === 'toast-container') container.appendChild(toast);
    else document.body.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 4500);
};

window.alert = function(message) {
    if (!message) return;
    const msgLower = message.toString().toLowerCase();
    let type = 'info';
    if (msgLower.includes('lỗi') || msgLower.includes('thất bại') || msgLower.includes('sai') || msgLower.includes('trùng')) {
        type = 'error';
    } else if (msgLower.includes('thành công') || msgLower.includes('đã thêm') || msgLower.includes('ok') || msgLower.includes('hoàn tất')) {
        type = 'success';
    }
    window.showToast(message, type);
};