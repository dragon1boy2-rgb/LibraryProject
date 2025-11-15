const SUPABASE_URL = 'https://onlyphcvixxmvnrzrkkl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ubHlwaGN2aXh4bXZucnpya2tsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMjIwNDcsImV4cCI6MjA3ODc5ODA0N30.IU2BYpZu-7Ya_daQtvLBiMvUp-A8VYR94lmnANBeSRg';
if (typeof supabase === 'undefined') console.error("Lỗi: Chưa load Supabase!");
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DB = {
    getUsers: async () => { const { data, error } = await _supabase.from('users').select('*').order('id', {ascending:false}); return error ? [] : data; },
    addUser: async (item) => { const { error } = await _supabase.from('users').insert([item]); if(error) alert(error.message); else alert("Thành công!"); },
    deleteUser: async (id) => { const { error } = await _supabase.from('users').delete().eq('id', id); if(error) alert(error.message); else alert("Đã xóa!"); },
    getBooks: async () => { const { data, error } = await _supabase.from('books').select('*').order('id', {ascending:false}); return error ? [] : data; },
    addBook: async (item) => { const { error } = await _supabase.from('books').insert([item]); if(error) alert(error.message); else alert("Thành công!"); },
    updateBook: async (id, item) => { const { error } = await _supabase.from('books').update(item).eq('id', id); return !error; },
    deleteBook: async (id) => { const { error } = await _supabase.from('books').delete().eq('id', id); if(error) alert(error.message); else alert("Đã xóa!"); },
    getResources: async () => { const { data, error } = await _supabase.from('resources').select('*').order('id', {ascending:false}); return error ? [] : data; },
    addResource: async (item) => { const { error } = await _supabase.from('resources').insert([item]); if(error) alert(error.message); else alert("Thành công!"); },
    deleteResource: async (id) => { const { error } = await _supabase.from('resources').delete().eq('id', id); if(error) alert(error.message); else alert("Đã xóa!"); },
    
    getMyLoans: async (userId) => { const { data } = await _supabase.from('loans').select('*, books(*)').eq('user_id', userId).order('borrow_date', {ascending:false}); return data || []; },
    borrowBook: async (userId, bookId, actionType) => {
        const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 14);
        const { error } = await _supabase.from('loans').insert([{ user_id: userId, book_id: bookId, status: actionType, due_date: dueDate.toISOString() }]);
        if (error) return { success: false, message: error.message };
        if (actionType === 'borrowing') { const { data: b } = await _supabase.from('books').select('stock').eq('id', bookId).single(); if(b) await _supabase.from('books').update({ stock: b.stock - 1 }).eq('id', bookId); }
        return { success: true };
    },
    returnBook: async (loanId, bookId) => {
        const { error } = await _supabase.from('loans').update({ status: 'returned', return_date: new Date().toISOString() }).eq('id', loanId);
        if (error) return false;
        const { data: b } = await _supabase.from('books').select('stock').eq('id', bookId).single(); if(b) await _supabase.from('books').update({ stock: b.stock + 1 }).eq('id', bookId);
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
    login: async (u, p) => { const { data, error } = await _supabase.from('users').select('*').eq('username', u).eq('password', p).single(); if(error || !data) return null; return data; },
    register: async (u, p, n, e) => {
        const { data: ex } = await _supabase.from('users').select('id').eq('username', u).single();
        if (ex) return { success: false, message: "Tên đăng nhập tồn tại!" };
        const { error } = await _supabase.from('users').insert([{ username: u, password: p, fullname: n, email: e, role: 'user' }]);
        return error ? { success: false, message: error.message } : { success: true };
    },
    getCurrentUser: () => { const u = sessionStorage.getItem('currentUser'); return u ? JSON.parse(u) : null; },
    logout: () => { sessionStorage.removeItem('currentUser'); window.location.href = 'login.html'; }
};
function toggleSubmenu(event) { event.preventDefault(); event.currentTarget.parentElement.classList.toggle('open'); }
// --- TỰ ĐỘNG ACTIVE MENU (Thêm vào cuối file js/data.js) ---
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    const links = document.querySelectorAll('.sidebar .menu a');
    
    links.forEach(link => {
        if (link.getAttribute('href') && path.includes(link.getAttribute('href'))) {
            // Active mục chính
            link.parentElement.classList.add('active');
            
            // Nếu là menu con thì mở luôn menu cha
            const parentDropdown = link.closest('.has-submenu');
            if (parentDropdown) {
                parentDropdown.classList.add('active', 'open');
            }
        }
    });
});