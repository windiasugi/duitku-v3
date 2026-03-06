// Konfigurasi Supabase
const SUPABASE_URL = 'https://uweluscdyymkveqxthni.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3ZWx1c2NkeXlta3ZlcXh0aG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NzEzNjcsImV4cCI6MjA4ODI0NzM2N30.jh6KkOFFI2lyNYRjYjUWhwFvP0RGrhRutp-Ed0iy1Xc';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM Elements - Auth
const authView = document.getElementById('auth-view');
const appView = document.getElementById('app-view');
const logoutBtn = document.getElementById('logout-btn');
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authTitle = document.getElementById('auth-title');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const switchAuthModeBtn = document.getElementById('switch-auth-mode');
const authSwitchText = document.getElementById('auth-switch-text');
const authError = document.getElementById('auth-error');
const authSuccess = document.getElementById('auth-success');

// DOM Elements - App
const balance = document.getElementById('balance');
const money_plus = document.getElementById('total-income');
const money_minus = document.getElementById('total-expense');
const list = document.getElementById('list');
const form = document.getElementById('transaction-form');
const text = document.getElementById('text');
const amount = document.getElementById('amount');
const category = document.getElementById('category');
const subcategory = document.getElementById('subcategory');
const dateInput = document.getElementById('date');

// Filter elements
const searchTextInput = document.getElementById('search-text');
const filterCategoryInput = document.getElementById('filter-category');
const filterStartDateInput = document.getElementById('filter-start-date');
const filterEndDateInput = document.getElementById('filter-end-date');

const subcategoriesData = {
    income: ['Gaji', 'Penjualan', 'Investasi', 'Lainnya'],
    expense: ['Makanan', 'Rumah Tangga', 'Transportasi', 'Hewan Peliharaan', 'Hiburan', 'Lainnya']
};

// Set default date to today
const today = new Date().toISOString().split('T')[0];
dateInput.value = today;

// State management
let transactions = [];
let currentUser = null;
let isLoginMode = true;

// Populate subcategories
function updateSubcategories() {
    subcategory.innerHTML = '';
    const selectedCategory = category.value;
    const options = subcategoriesData[selectedCategory];

    options.forEach(opt => {
        const optionEl = document.createElement('option');
        optionEl.value = opt;
        optionEl.innerText = opt;
        subcategory.appendChild(optionEl);
    });
}
category.addEventListener('change', updateSubcategories);
updateSubcategories();

const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(number);
};

/* --- AUTHENTICATION LOGIC --- */

function toggleAuthMode(e) {
    if (e) e.preventDefault();
    isLoginMode = !isLoginMode;
    authError.style.display = 'none';
    authSuccess.style.display = 'none';

    if (isLoginMode) {
        authTitle.innerHTML = '<i class="fa-solid fa-lock"></i> Masuk ke Akun';
        authSubmitBtn.innerText = 'Masuk';
        authSwitchText.innerText = 'Belum punya akun? ';
        switchAuthModeBtn.innerText = 'Daftar di sini';
    } else {
        authTitle.innerHTML = '<i class="fa-solid fa-user-plus"></i> Daftar Akun Baru';
        authSubmitBtn.innerText = 'Daftar';
        authSwitchText.innerText = 'Sudah punya akun? ';
        switchAuthModeBtn.innerText = 'Masuk di sini';
    }
}
switchAuthModeBtn.addEventListener('click', toggleAuthMode);

async function handleAuth(e) {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;

    authError.style.display = 'none';
    authSuccess.style.display = 'none';
    authSubmitBtn.disabled = true;
    authSubmitBtn.innerText = isLoginMode ? 'Memproses...' : 'Mendaftar...';

    if (isLoginMode) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
            if (error.message.includes('Email not confirmed')) {
                authError.innerText = 'Email Anda belum dikonfirmasi. Silakan cek kotak masuk (inbox/spam) email Anda dan klik tautan konfirmasi.';
            } else {
                authError.innerText = error.message;
            }
            authError.style.display = 'block';
        }
    } else {
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) {
            authError.innerText = error.message;
            authError.style.display = 'block';
        } else {
            authSuccess.innerHTML = '<i class="fa-solid fa-envelope-circle-check"></i> <strong>Daftar Berhasil!</strong><br>Silakan <strong>cek email Anda</strong> untuk mengonfirmasi akun sebelum mencoba masuk.';
            authSuccess.style.display = 'block';
            toggleAuthMode();
        }
    }

    authSubmitBtn.disabled = false;
    authSubmitBtn.innerText = isLoginMode ? 'Masuk' : 'Daftar';
}
authForm.addEventListener('submit', handleAuth);

async function handleLogout() {
    await supabaseClient.auth.signOut();
}
logoutBtn.addEventListener('click', handleLogout);

supabaseClient.auth.onAuthStateChange((event, session) => {
    if (session) {
        currentUser = session.user;
        showAppView();
    } else {
        currentUser = null;
        showAuthView();
    }
});

function showAppView() {
    authView.style.display = 'none';
    appView.style.display = 'block';
    logoutBtn.style.display = 'block';
    fetchTransactions();
}

function showAuthView() {
    authView.style.display = 'block';
    appView.style.display = 'none';
    logoutBtn.style.display = 'none';
    emailInput.value = '';
    passwordInput.value = '';
}

/* --- CLOUD CRUD LOGIC --- */

async function fetchTransactions() {
    if (!currentUser) return;

    list.innerHTML = '<li>Memuat data...</li>';

    const { data, error } = await supabaseClient
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching data:', error);
        list.innerHTML = `<li class="empty-state" style="color:var(--danger);">Gagal memuat data: ${error.message}</li>`;
        return;
    }

    transactions = data || [];
    renderApp();
}

async function addTransaction(e) {
    e.preventDefault();

    if (amount.value.trim() === '' || dateInput.value.trim() === '') {
        alert('Mohon lengkapi data nominal dan tanggal');
        return;
    }

    const isExpense = category.value === 'expense';
    const amountValue = Math.abs(parseInt(amount.value));
    const finalAmount = isExpense ? -amountValue : amountValue;

    const newTransaction = {
        // ID & created_at will be generated by Supabase
        name: text.value.trim() || subcategory.value,
        amount: finalAmount,
        type: category.value,
        subcategory: subcategory.value,
        date: dateInput.value,
        user_id: currentUser.id
    };

    const originalBtnText = form.querySelector('.btn').innerText;
    form.querySelector('.btn').innerText = 'Menyimpan...';
    form.querySelector('.btn').disabled = true;

    const { data, error } = await supabaseClient
        .from('transactions')
        .insert([newTransaction])
        .select();

    form.querySelector('.btn').innerText = originalBtnText;
    form.querySelector('.btn').disabled = false;

    if (error) {
        alert('Gagal menyimpan: ' + error.message);
        return;
    }

    if (data && data.length > 0) {
        transactions.unshift(data[0]);
        renderApp();
    }

    text.value = '';
    amount.value = '';
    dateInput.value = new Date().toISOString().split('T')[0];
    text.focus();
}

async function removeTransaction(id) {
    if (!confirm('Yakin ingin menghapus transaksi ini?')) return;

    console.log('Menghapus transaksi dengan ID:', id);
    const previousTransactions = [...transactions];

    // Gunakan != agar tipe data string/number tetap cocok
    transactions = transactions.filter(transaction => transaction.id != id);
    renderApp();

    const { error } = await supabaseClient
        .from('transactions')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error saat menghapus:', error);
        alert('Gagal menghapus: ' + error.message);
        transactions = previousTransactions;
        renderApp();
    } else {
        console.log('Transaksi berhasil dihapus dari cloud');
    }
}

/* --- RENDER LOGIC --- */

function renderApp() {
    list.innerHTML = '';

    const searchText = searchTextInput.value.toLowerCase().trim();
    const filterType = filterCategoryInput.value;
    const startDate = filterStartDateInput.value;
    const endDate = filterEndDateInput.value;

    const filteredTransactions = transactions.filter(t => {
        // Use 'name' based on your Supabase schema
        const tName = t.name || t.text || '';
        const tSubcat = t.subcategory || t.sub_category || '';
        const tType = t.type || '';

        const textMatch = tName.toLowerCase().includes(searchText) ||
            tSubcat.toLowerCase().includes(searchText);

        const typeMatch = filterType === 'all' || tType === filterType;

        let dateMatch = true;
        if (startDate && endDate) {
            dateMatch = t.date >= startDate && t.date <= endDate;
        } else if (startDate) {
            dateMatch = t.date >= startDate;
        } else if (endDate) {
            dateMatch = t.date <= endDate;
        }

        return textMatch && typeMatch && dateMatch;
    });

    if (filteredTransactions.length === 0) {
        list.innerHTML = '<li class="empty-state">Tidak ada transaksi ditemukan</li>';
    } else {
        filteredTransactions.forEach(t => {
            const liClass = t.amount < 0 ? 'expense' : 'income';
            const item = document.createElement('li');
            item.classList.add(liClass);

            const displayName = t.name || t.text || 'Tanpa Keterangan';
            const displaySubcat = t.subcategory || t.sub_category || 'Lainnya';

            // Konstruksi DOM yang aman dari XSS
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                    <div class="meta" style="margin-bottom:0;">
                        <span><i class="fa-regular fa-calendar"></i> ${t.date}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="amount ${liClass}">${formatRupiah(Math.abs(t.amount))}</span>
                        <button class="delete-btn" title="Hapus Transaksi" style="padding: 4px 8px;">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
                <div class="details" style="margin-top: 4px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="badge"></span>
                        <span class="desc"></span>
                    </div>
                </div>
            `;

            // Set teks menggunakan textContent agar aman dari XSS
            item.querySelector('.desc').textContent = displayName;
            item.querySelector('.badge').textContent = displaySubcat;

            // Gunakan addEventListener alih-alih onclick inline
            item.querySelector('.delete-btn').addEventListener('click', () => removeTransaction(t.id));

            list.appendChild(item);
        });
    }

    updateValues(filteredTransactions);
}

function updateValues(items) {
    const amounts = items.map(transaction => transaction.amount);
    const total = amounts.reduce((acc, item) => (acc += item), 0);
    const income = amounts.filter(item => item > 0).reduce((acc, item) => (acc += item), 0);
    const expense = amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0) * -1;

    balance.innerText = formatRupiah(total);
    money_plus.innerText = `+ ${formatRupiah(income)}`;
    money_minus.innerText = `- ${formatRupiah(expense)}`;
}

// Event Listeners for filters
searchTextInput.addEventListener('input', renderApp);
filterCategoryInput.addEventListener('change', renderApp);
filterStartDateInput.addEventListener('change', renderApp);
filterEndDateInput.addEventListener('change', renderApp);

form.addEventListener('submit', addTransaction);

// Transaction removal is now handled via addEventListener in renderApp
