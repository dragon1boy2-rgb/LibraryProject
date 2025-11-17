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
        
        // Ghi log truy cập
        try { await _supabase.from('access_logs').insert([{ user_id: user.id, role: user.role }]); } catch (e) {}
        return user;
    },

    register: async (u, p, n, e, role, idCode) => {
        const { data: ex } = await _supabase.from('users').select('id').eq('username', u).single();
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
        sessionStorage.removeItem('currentUser');
        window.location.href = 'login.html';
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
    
    // LẤY TOP SÁCH MƯỢN NHIỀU (Mới thêm)
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


    // ================= QUẢN LÝ SÁCH =================
    getBooks: async () => { const { data } = await _supabase.from('books').select('*').order('id', { ascending: false }); return data || []; },
    addBook: async (item) => { const { error } = await _supabase.from('books').insert([item]); if(error) alert(error.message); else alert("Thành công!"); },
    updateBook: async (id, item) => { const { error } = await _supabase.from('books').update(item).eq('id', id); return !error; },
    deleteBook: async (id) => { const { error } = await _supabase.from('books').delete().eq('id', id); if(error) alert(error.message); else alert("Đã xóa!"); },


    // ================= QUẢN LÝ TÀI NGUYÊN =================
    getResources: async () => { const { data } = await _supabase.from('resources').select('*').order('id', { ascending: false }); return data || []; },
    addResource: async (item) => { const { error } = await _supabase.from('resources').insert([item]); if(error) alert(error.message); else alert("Thành công!"); },
    deleteResource: async (id) => { const { error } = await _supabase.from('resources').delete().eq('id', id); if(error) alert(error.message); else alert("Đã xóa!"); },


    // ================= QUẢN LÝ USER =================
    getUsers: async () => { const { data } = await _supabase.from('users').select('*').order('id', { ascending: false }); return data || []; },
    addUser: async (item) => { 
        const { data: ex } = await _supabase.from('users').select('id').eq('username', item.username).single();
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

// Global UI function
function toggleSubmenu(event) {
    event.preventDefault(); 
    const parentLi = event.currentTarget.parentElement;
    parentLi.classList.toggle('open');
}