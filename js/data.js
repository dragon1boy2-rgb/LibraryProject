// js/data.js

// --- 1. CẤU HÌNH KẾT NỐI SUPABASE ---
const SUPABASE_URL = 'https://onlyphcvixxmvnrzrkkl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ubHlwaGN2aXh4bXZucnpya2tsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMjIwNDcsImV4cCI6MjA3ODc5ODA0N30.IU2BYpZu-7Ya_daQtvLBiMvUp-A8VYR94lmnANBeSRg';

if (typeof supabase === 'undefined') console.error("Lỗi: Chưa load thư viện Supabase!");
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DB = {
    
    // ================= XÁC THỰC & LOG =================
    login: async (u, p) => {
        const { data: user, error } = await _supabase.from('users').select('*').eq('username', u).eq('password', p).single();
        if (error || !user) return null;
        try { await _supabase.from('access_logs').insert([{ user_id: user.id, role: user.role }]); } catch (e) {}
        return user;
    },

    register: async (u, p, n, e, role, idCode) => {
        // Kiểm tra username trùng
        const { data: ex } = await _supabase.from('users').select('id').eq('username', u).maybeSingle();
        if (ex) return { success: false, message: "Tên đăng nhập đã tồn tại!" };

        const newUser = { username: u, password: p, fullname: n, email: e, role: role };
        if (role === 'student') newUser.student_id = idCode;
        if (role === 'lecturer') newUser.lecturer_id = idCode;

        const { error } = await _supabase.from('users').insert([newUser]);
        return error ? { success: false, message: error.message } : { success: true };
    },

    getCurrentUser: () => {
        const u = sessionStorage.getItem('currentUser');
        return u ? JSON.parse(u) : null;
    },

    logout: () => {
        // Đăng xuất khỏi cả Supabase Auth (Google) và session thường
        _supabase.auth.signOut();
        sessionStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    },

    // --- TÍNH NĂNG MỚI: ĐĂNG NHẬP GOOGLE (Đã sửa lỗi trùng lặp) ---
    
    // 1. Gọi cửa sổ đăng nhập Google
    loginWithGoogle: async () => {
        const { data, error } = await _supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.href, // Quay lại trang hiện tại sau khi login
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            }
        });
        if (error) alert("Lỗi Google Login: " + error.message);
    },

    // 2. Xử lý sau khi Google redirect về (Bản vá lỗi trùng lặp & treo)
    handleOAuthLogin: async () => {
        console.log("🚀 Bắt đầu xử lý OAuth...");

        // A. Đặt Timeout an toàn
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
        }, 10000); // 10 giây

        // B. Lắng nghe sự kiện Auth
        const { data: { subscription } } = _supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("🔹 Auth Event:", event);

            if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
                console.log("✅ Tìm thấy session:", session.user.email);
                clearTimeout(safetyTimeout); 
                
                try {
                    // --- LOGIC ĐỒNG BỘ DATABASE ---
                    const email = session.user.email;
                    const meta = session.user.user_metadata || {};
                    const fullName = meta.full_name || meta.name || email.split('@')[0];
                    const avatar = meta.avatar_url;

                    // === [FIX QUAN TRỌNG] === 
                    // Thay .single() bằng .select() và lấy phần tử đầu tiên
                    // Điều này giúp code không bị lỗi (crash) nếu lỡ DB có 2 dòng trùng email
                    const { data: existingUsers } = await _supabase.from('users').select('*').eq('email', email);
                    
                    let currentUser = null;
                    if (existingUsers && existingUsers.length > 0) {
                        currentUser = existingUsers[0]; // Lấy người đầu tiên tìm thấy
                    }

                    // 2. Nếu chưa có -> Tạo mới
                    if (!currentUser) {
                        console.log("ℹ️ Đang tạo user mới...");
                        const randomId = Math.floor(1000 + Math.random() * 9000);
                        
                        // Kiểm tra username trùng trước khi tạo (đề phòng)
                        let newUsername = email.split('@')[0];
                        const { data: checkUser } = await _supabase.from('users').select('id').eq('username', newUsername).maybeSingle();
                        if (checkUser) {
                             newUsername = newUsername + '_' + randomId; // Đổi tên nếu trùng
                        }

                        const newUser = {
                            username: newUsername,
                            password: 'google_auth_user_' + randomId,
                            fullname: fullName,
                            email: email,
                            role: 'student', 
                            student_id: 'G-' + randomId 
                        };
                        const { data: created, error: insertError } = await _supabase.from('users').insert([newUser]).select().single();
                        
                        if (insertError) throw new Error("Lỗi Insert DB: " + insertError.message);
                        currentUser = created;
                    }

                    // 3. Hoàn tất & Chuyển trang
                    if (currentUser) {
                        if(avatar) localStorage.setItem('user_avatar_' + currentUser.id, avatar);
                        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                        
                        _supabase.from('access_logs').insert([{ user_id: currentUser.id, role: currentUser.role }]).then();

                        // Xóa các tham số hash trên URL cho sạch đẹp
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

        // C. Kiểm tra session có sẵn
        const { data: { session } } = await _supabase.auth.getSession();
        if (session) {
            console.log("⚡ Session đã có sẵn, xử lý ngay...");
        }
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
        return { 
            borrowing: data.filter(x => x.status === 'borrowing' || x.status === 'overdue').length, 
            reserved: data.filter(x => x.status === 'reserved').length, 
            fine: data.reduce((sum, item) => sum + (item.fine_amount || 0), 0) 
        };
    },

    // ================= QUẢN LÝ SÁCH (CÓ TÍCH HỢP GOOGLE API) =================
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
    deleteBook: async (id) => { const { error } = await _supabase.from('books').delete().eq('id', id); if(error) alert(error.message); else alert("Đã xóa!"); },

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
    deleteUser: async (id) => { const { error } = await _supabase.from('users').delete().eq('id', id); if(error) alert(error.message); else alert("Đã xóa!"); },

    // ================= MƯỢN TRẢ =================
    getAllLoans: async () => { const { data } = await _supabase.from('loans').select('*, books(name), users(username, fullname)').order('borrow_date', { ascending: false }); return data || []; },
    getMyLoans: async (userId) => { const { data } = await _supabase.from('loans').select('*, books(*)').eq('user_id', userId).order('borrow_date', { ascending: false }); return data || []; },
    
    borrowBook: async (userId, bookId, actionType) => {
        const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 14);
        const { error } = await _supabase.from('loans').insert([{ user_id: userId, book_id: bookId, status: actionType, due_date: dueDate.toISOString() }]);
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
    }
};

function toggleSubmenu(event) {
    event.preventDefault(); 
    const parentLi = event.currentTarget.parentElement;
    parentLi.classList.toggle('open');
}