// ===== टास्कFLOWS To-Do — Vanilla JS =====
const LS_USERS = 'टास्कFLOWS:users';
const LS_SESSION = 'टास्कFLOWS:session';
const LS_THEME = 'टास्कFLOWS:theme';
const tasksKey = (u) => `टास्कFLOWS:tasks:${u}`;

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ---------- helpers ----------
const getUsers = () => JSON.parse(localStorage.getItem(LS_USERS) || '{}');
const saveUsers = (u) => localStorage.setItem(LS_USERS, JSON.stringify(u));
const getSession = () => localStorage.getItem(LS_SESSION);
const setSession = (u) => localStorage.setItem(LS_SESSION, u);
const clearSession = () => localStorage.removeItem(LS_SESSION);
const getTasks = (u) => JSON.parse(localStorage.getItem(tasksKey(u)) || '[]');
const saveTasks = (u, t) => localStorage.setItem(tasksKey(u), JSON.stringify(t));

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add('hidden'), 2600);
}

// ---------- theme ----------
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const icon = $('.theme-icon');
  if (icon) icon.textContent = t === 'dark' ? '☀️' : '🌙';
}
applyTheme(localStorage.getItem(LS_THEME) || 'light');

// ---------- AUTH UI ----------
$$('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.tab').forEach(t => t.classList.toggle('active', t === tab));
    const target = tab.dataset.tab;
    $$('.auth-form').forEach(f => f.classList.remove('active'));
    $(`#${target}-form`).classList.add('active');
  });
});

$('#signup-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const u = $('#signup-username').value.trim();
  const p = $('#signup-password').value;
  const msg = $('#signup-msg');
  msg.className = 'form-msg';
  if (u.length < 2) return (msg.textContent = 'Username must be at least 2 characters.');
  const users = getUsers();
  if (users[u]) return (msg.textContent = 'That username is already taken.');
  users[u] = { password: p, createdAt: Date.now() };
  saveUsers(users);
  msg.textContent = 'Account created — signing you in…';
  msg.classList.add('success');
  setTimeout(() => loginUser(u), 600);
});

$('#login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const u = $('#login-username').value.trim();
  const p = $('#login-password').value;
  const msg = $('#login-msg');
  msg.className = 'form-msg';
  const users = getUsers();
  if (!users[u] || users[u].password !== p) return (msg.textContent = 'Wrong username or password.');
  loginUser(u);
});

function loginUser(username) {
  setSession(username);
  showApp(username);
}

$('#logout-btn').addEventListener('click', () => {
  clearSession();
  $('#app-screen').classList.add('hidden');
  $('#auth-screen').classList.remove('hidden');
  $('#login-form').reset();
  $('#signup-form').reset();
  toast('Signed out');
});

// ---------- APP ----------
let currentUser = null;
let currentFilter = 'all';

function showApp(username) {
  currentUser = username;
  $('#auth-screen').classList.add('hidden');
  $('#app-screen').classList.remove('hidden');
  $('#user-name').textContent = username;
  $('#today-date').textContent = new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric'
  });
  renderTasks();
  scheduleReminder();
}

$('#theme-toggle').addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  localStorage.setItem(LS_THEME, next);
  applyTheme(next);
});

$('#task-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('#task-input');
  const text = input.value.trim();
  if (!text) return;
  const tasks = getTasks(currentUser);
  tasks.unshift({ id: crypto.randomUUID(), text, done: false, createdAt: Date.now() });
  saveTasks(currentUser, tasks);
  input.value = '';
  renderTasks();
});

$$('.filter').forEach(f => {
  f.addEventListener('click', () => {
    $$('.filter').forEach(x => x.classList.toggle('active', x === f));
    currentFilter = f.dataset.filter;
    renderTasks();
  });
});

function toggleTask(id) {
  const tasks = getTasks(currentUser).map(t => t.id === id ? { ...t, done: !t.done } : t);
  saveTasks(currentUser, tasks);
  renderTasks();
}

function deleteTask(id, liEl) {
  liEl.classList.add('removing');
  setTimeout(() => {
    const tasks = getTasks(currentUser).filter(t => t.id !== id);
    saveTasks(currentUser, tasks);
    renderTasks();
  }, 280);
}

function formatTime(ts) {
  const d = new Date(ts);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return 'Today · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function renderTasks() {
  const tasks = getTasks(currentUser);
  const list = $('#task-list');
  list.innerHTML = '';

  let filtered = tasks;
  if (currentFilter === 'active') filtered = tasks.filter(t => !t.done);
  if (currentFilter === 'completed') filtered = tasks.filter(t => t.done);

  $('#stat-total').textContent = tasks.length;
  $('#stat-active').textContent = tasks.filter(t => !t.done).length;
  $('#stat-done').textContent = tasks.filter(t => t.done).length;

  if (filtered.length === 0) {
    $('#empty-state').classList.remove('hidden');
    const msgs = {
      all: 'Add your first task above and start your flow.',
      active: 'Nothing active — you\'re all caught up.',
      completed: 'No completed tasks yet. Get going!'
    };
    $('#empty-state').querySelector('p').textContent = msgs[currentFilter];
    return;
  }
  $('#empty-state').classList.add('hidden');

  filtered.forEach(t => {
    const li = document.createElement('li');
    li.className = 'task' + (t.done ? ' completed' : '');
    li.innerHTML = `
      <button class="check" aria-label="Toggle complete">✓</button>
      <div class="task-body">
        <div class="task-text"></div>
        <div class="task-time">${formatTime(t.createdAt)}</div>
      </div>
      <button class="del-btn" aria-label="Delete task">✕</button>
    `;
    li.querySelector('.task-text').textContent = t.text;
    li.querySelector('.check').addEventListener('click', () => toggleTask(t.id));
    li.querySelector('.del-btn').addEventListener('click', () => deleteTask(t.id, li));
    list.appendChild(li);
  });
}

// ---------- REMINDER ----------
let reminderTimer = null;
function scheduleReminder() {
  if (reminderTimer) clearInterval(reminderTimer);
  // Check once now, then every 15 min
  checkReminder();
  reminderTimer = setInterval(checkReminder, 15 * 60 * 1000);

  // Ask for notifications permission politely
  if ('Notification' in window && Notification.permission === 'default') {
    setTimeout(() => Notification.requestPermission().catch(() => {}), 4000);
  }
}

function checkReminder() {
  if (!currentUser) return;
  const hour = new Date().getHours();
  if (hour < 21 || hour >= 24) return; // only 9 PM – 12 AM

  const pending = getTasks(currentUser).filter(t => !t.done).length;
  if (pending === 0) return;

  const today = new Date().toDateString();
  const lastKey = `टास्कFLOWS:reminded:${currentUser}`;
  if (localStorage.getItem(lastKey) === today) return;
  localStorage.setItem(lastKey, today);

  const message = 'You still have pending tasks to complete before the day ends!';
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('टास्कFLOWS reminder', { body: message, icon: undefined });
  } else {
    toast('🔔 ' + message);
    setTimeout(() => alert(message), 400);
  }
}

// ---------- BOOT ----------
const existing = getSession();
if (existing && getUsers()[existing]) {
  showApp(existing);
}
