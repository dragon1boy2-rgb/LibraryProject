// js/data.js

// 1. CẤU HÌNH KẾT NỐI (Giữ nguyên API Key của bạn)
const SUPABASE_URL = 'https://onlyphcvixxmvnrzrkkl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ubHlwaGN2aXh4bXZucnpya2tsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMjIwNDcsImV4cCI6MjA3ODc5ODA0N30.IU2BYpZu-7Ya_daQtvLBiMvUp-A8VYR94lmnANBeSRg';

if (typeof supabase === 'undefined') console.error("Lỗi: Chưa load Supabase!");
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DB = {
    // --- USER ---
    getUsers: async () => {
        const { data } = await _supabase.from('users').select('*').order('id', { ascending: false });
        return data || [];
    },

    // Cập nhật hàm thêm user của Admin
    addUser: async (item) => {
        // item = { username, password, fullname, email, role, student_id, lecturer_id }
        const { data: ex } = await _supabase.from('users').select('id').eq('username', item.username).single();
        if (ex) { alert("Tên đăng nhập đã tồn tại!"); return false; }
        
        const { error } = await _supabase.from('users').insert([item]);
        if (error) { alert(error.message); return false; }
        alert("Thành công!"); return true;
    },

    updateUser: async (id, updates) => {
        const { error } = await _supabase.from('users').update(updates).eq('id', id);
        return !error;
    },

    deleteUser: async (id) => {
        const { error } = await _supabase.from('users').delete().eq('id', id);
        if (error) alert(error.message); else alert("Đã xóa!");
    },

    // --- AUTH (Đăng ký / Đăng nhập) ---
    login: async (u, p) => {
        const { data, error } = await _supabase.from('users').select('*').eq('username', u).eq('password', p).single();
        if (error || !data) return null;
        return data;
    },

    // Cập nhật hàm Đăng ký cho Sinh viên/Giảng viên
    register: async (u, p, n, e, role, idCode) => {
        // idCode sẽ là student_id hoặc lecturer_id tùy role
        const { data: ex } = await _supabase.from('users').select('id').eq('username', u).single();
        if (ex) return { success: false, message: "Tên đăng nhập đã tồn tại!" };

        const newUser = {
            username: u,
            password: p,
            fullname: n,
            email: e,
            role: role // 'student' hoặc 'lecturer'
        };

        if (role === 'student') newUser.student_id = idCode;
        if (role === 'lecturer') newUser.lecturer_id = idCode;

        const { error } = await _supabase.from('users').insert([newUser]);
        return error ? { success: false, message: error.message } : { success: true };
    },

    // --- CÁC HÀM KHÁC (Giữ nguyên không đổi) ---
    getBooks: async () => { const { data } = await _supabase.from('books').select('*').order('id', {ascending:false}); return data || []; },
    addBook: async (item) => { const { error } = await _supabase.from('books').insert([item]); if(error) { alert(error.message); return false; } alert("Thêm thành công!"); return true; },
    updateBook: async (id, item) => { const { error } = await _supabase.from('books').update(item).eq('id', id); return !error; },
    deleteBook: async (id) => { const { error } = await _supabase.from('books').delete().eq('id', id); if(error) alert(error.message); else alert("Đã xóa!"); },
    
    getResources: async () => { const { data } = await _supabase.from('resources').select('*').order('id', {ascending:false}); return data || []; },
    addResource: async (item) => { const { error } = await _supabase.from('resources').insert([item]); if(error) alert(error.message); else alert("Thành công!"); },
    deleteResource: async (id) => { const { error } = await _supabase.from('resources').delete().eq('id', id); if(error) alert(error.message); else alert("Đã xóa!"); },

    getMyLoans: async (userId) => { const { data } = await _supabase.from('loans').select('*, books(*)').eq('user_id', userId).order('borrow_date', {ascending:false}); return data || []; },
    getAllLoans: async () => { const { data } = await _supabase.from('loans').select('*, books(name), users(username, fullname, student_id, lecturer_id)').order('borrow_date', {ascending:false}); return data || []; },
    
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
    },

    getStats: async () => {
        const b = await _supabase.from('books').select('*', { count: 'exact', head: true });
        const r = await _supabase.from('resources').select('*', { count: 'exact', head: true });
        const u = await _supabase.from('users').select('*', { count: 'exact', head: true });
        return { books: b.count || 0, resources: r.count || 0, users: u.count || 0 };
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
    getCurrentUser: () => { const u = sessionStorage.getItem('currentUser'); return u ? JSON.parse(u) : null; },
    logout: () => { sessionStorage.removeItem('currentUser'); window.location.href = 'login.html'; }
};

function toggleSubmenu(event) { event.preventDefault(); event.currentTarget.parentElement.classList.toggle('open'); }