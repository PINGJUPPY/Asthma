// ==========================================
// 1. Config & Setup
// ==========================================

// ** ใส่ URL ที่ได้จาก Apps Script ของคุณตรงนี้ **
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbye2tPNF1QVI7xsQ5QT_e_cTEFIckKszMnXWjmbGOb_Qoz6HrYE28gEAd8KmZ7sEyN7/exec"; 

// Firebase Config ของคุณ
const firebaseConfig = {
    apiKey: "AIzaSyADXEA4Hs_WJDXVxfsGHLyPytTVypZqd6U",
    authDomain: "asthmaalert-903b7.firebaseapp.com",
    projectId: "asthmaalert-903b7",
    storageBucket: "asthmaalert-903b7.firebasestorage.app",
    messagingSenderId: "123117910600",
    appId: "1:123117910600:web:d90af1677fa7e04b50767d",
    measurementId: "G-YBLJPHJXK3"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

const MED_IMAGES = {
    "Ventolin": "https://img.freepik.com/free-vector/inhaler-asthma-blue-white-colors_1308-59363.jpg?w=200", 
    "Pulmicort": "https://via.placeholder.com/150/FF0000/FFFFFF?text=Pulmicort",
    "Seretide": "https://via.placeholder.com/150/800080/FFFFFF?text=Seretide"
};

// ==========================================
// 2. Navigation & UI Logic
// ==========================================

window.onload = function() {
    // โหลด Theme
    const savedTheme = localStorage.getItem('app_theme');
    if (savedTheme) document.body.className = savedTheme;
    
    // Check Auth for Record Page
    if(localStorage.getItem('ashma_user')) {
        showDashboard(JSON.parse(localStorage.getItem('ashma_user')));
    }

    updateTime();
    setInterval(updateTime, 1000);
    requestPermission();
    
    // Check iOS for Guide
    if(/iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())) {
        document.getElementById('ios-guide').classList.remove('hidden');
    }
};

function switchTab(pageId, navElement) {
    // Hide all pages
    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    // Show selected
    document.getElementById(pageId).classList.add('active');
    navElement.classList.add('active');

    if(pageId === 'page-record') checkAuth();
}

function updateTime() {
    const now = new Date();
    if(document.getElementById('current-time')) {
        document.getElementById('current-time').innerText = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + " น.";
    }
}

function updateMedImage() {
    const med = document.getElementById('reg-med').value;
    document.getElementById('med-img-preview').src = MED_IMAGES[med] || "";
}

function setTheme(themeName) {
    document.body.className = themeName === 'theme-luxury' ? '' : themeName;
    localStorage.setItem('app_theme', document.body.className);
}

// ==========================================
// 3. User Functions (Register/Login/Log)
// ==========================================

function checkAuth() {
    const user = JSON.parse(localStorage.getItem('ashma_user'));
    if (user && user.hn) {
        showDashboard(user);
    } else {
        showRegister();
    }
}

function showRegister() {
    hideUserViews();
    document.getElementById('view-register').classList.remove('hidden');
}
function showLogin() {
    hideUserViews();
    document.getElementById('view-login').classList.remove('hidden');
}
function hideUserViews() {
    document.getElementById('view-register').classList.add('hidden');
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-dashboard').classList.add('hidden');
}

function showDashboard(user) {
    hideUserViews();
    document.getElementById('view-dashboard').classList.remove('hidden');
    document.getElementById('display-name').innerText = user.patient_name;
    document.getElementById('display-hn').innerText = user.hn;
    document.getElementById('display-med-name').innerText = user.medication;
    document.getElementById('display-med-img').src = MED_IMAGES[user.medication] || "";
    loadHistory(user.hn);
}

// Register
document.getElementById('form-register').addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = this.querySelector('button');
    btn.innerText = "กำลังบันทึก..."; btn.disabled = true;

    const data = {
        action: 'register',
        hn: document.getElementById('reg-hn').value, 
        user_token: localStorage.getItem('fcm_token') || "",
        parent_name: document.getElementById('reg-parent').value,
        phone: document.getElementById('reg-phone').value,
        patient_name: document.getElementById('reg-patient').value,
        medication: document.getElementById('reg-med').value,
        med_image: MED_IMAGES[document.getElementById('reg-med').value] || "",
        note: document.getElementById('reg-note').value
    };

    fetch(WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(data)
    }).then(() => {
        alert("ลงทะเบียนสำเร็จ!");
        localStorage.setItem('ashma_user', JSON.stringify({
            hn: data.hn, patient_name: data.patient_name, medication: data.medication
        }));
        location.reload();
    }).catch(err => { alert("Error"); btn.disabled = false; });
});

// Login
function login() {
    const hn = document.getElementById('login-hn').value;
    fetch(WEB_APP_URL + "?action=login&hn=" + hn)
    .then(res => res.json())
    .then(data => {
        if(data.status == "success") {
            localStorage.setItem('ashma_user', JSON.stringify(data.user));
            location.reload();
        } else alert("ไม่พบข้อมูล HN");
    });
}

function logout() { localStorage.removeItem('ashma_user'); location.reload(); }

// Submit Log & Reward Logic
function submitLog() {
    const user = JSON.parse(localStorage.getItem('ashma_user'));
    const symptom = document.getElementById('log-symptom').value;
    if(!confirm("ยืนยันการพ่นยา?")) return;

    fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ action: 'addLog', hn: user.hn, symptoms: symptom })
    })
    .then(res => res.json())
    .then(data => {
        if(data.status === 'success') {
            document.getElementById('log-symptom').value = "";
            loadHistory(user.hn);
            checkReward(data.total_count); // เช็ครางวัลจากจำนวนครั้งที่ Server ส่งมา
        }
    })
    .catch(err => {
        // Fallback กรณี Apps Script ไม่ return JSON (เช่นใช้ mode: no-cors)
        alert("บันทึกเรียบร้อย");
        loadHistory(user.hn);
    });
}

function loadHistory(hn) {
    const list = document.getElementById('history-list');
    list.innerHTML = "<li>Loading...</li>";
    fetch(WEB_APP_URL + "?action=getHistory&hn=" + hn)
    .then(res => res.json())
    .then(data => {
        list.innerHTML = "";
        if(!data.history || data.history.length==0) list.innerHTML = "<li>ยังไม่มีประวัติ</li>";
        else data.history.forEach(i => {
            list.innerHTML += `<li><span>${i.date}</span><span>${i.action} ${i.symptoms?'<br><small style="color:red">'+i.symptoms+'</small>':''}</span></li>`;
        });
    });
}

// Gamification
function checkReward(count) {
    const popup = document.getElementById('reward-popup');
    const title = document.getElementById('reward-title');
    const msg = document.getElementById('reward-msg');
    
    if (count % 10 === 0) {
        title.innerText = "🏆 สุดยอดคุณแม่!";
        msg.innerText = `ดูแลน้องครบ ${count} ครั้งแล้ว ยอดเยี่ยมมากๆครับ`;
    } else if (count % 5 === 0) {
        title.innerText = "⭐ เก่งมากครับ!";
        msg.innerText = `พ่นยาครบ ${count} ครั้งแล้ว ทำต่อไปนะครับ`;
    } else {
        title.innerText = "❤️ ขอบคุณครับ";
        msg.innerText = "บันทึกข้อมูลเรียบร้อยแล้ว";
        setTimeout(closeReward, 1500); // ปิดเร็วหน่อยถ้าไม่ใช่รางวัลใหญ่
    }
    popup.classList.remove('hidden');
}
function closeReward() { document.getElementById('reward-popup').classList.add('hidden'); }


// ==========================================
// 4. Admin Functions
// ==========================================

function checkAdmin() {
    if(document.getElementById('admin-pass').value === '1234') {
        document.getElementById('view-admin-login').classList.add('hidden');
        document.getElementById('view-admin-dashboard').classList.remove('hidden');
        loadAdminData();
    } else alert("รหัสผ่านไม่ถูกต้อง");
}
function adminLogout() { location.reload(); }

function loadAdminData() {
    const list = document.getElementById('admin-list');
    list.innerHTML = "<p class='text-center'>กำลังดึงข้อมูล...</p>";
    
    fetch(WEB_APP_URL + "?action=getAllAdmin")
    .then(res => res.json())
    .then(res => {
        list.innerHTML = "";
        Object.keys(res.data).forEach(hn => {
            const p = res.data[hn];
            const lastLog = p.logs.length > 0 ? p.logs[p.logs.length-1] : null;
            
            // เช็คว่าขาดส่งเกิน 24 ชม หรือไม่
            let statusClass = "status-missed"; // แดง
            let statusText = "🔴 ยังไม่เคยรายงาน";
            let isMissed = true;

            if (lastLog) {
                const now = new Date().getTime();
                const diffHours = (now - lastLog.timestamp) / (1000 * 60 * 60);
                
                if (diffHours < 24) {
                    statusClass = "status-good"; // เขียว
                    statusText = "🟢 ปกติ";
                    isMissed = false;
                } else {
                    statusText = "🔴 ขาดส่ง > 24ชม.";
                }
                
                if (lastLog.symptoms) {
                    statusClass = "status-warning"; // เหลือง
                    statusText = "🟡 มีอาการ: " + lastLog.symptoms;
                }
            }

            const card = document.createElement('div');
            card.className = `admin-card-row ${statusClass}`;
            card.onclick = () => showModal(p, hn);
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between;">
                    <b>${p.name}</b> <small>HN: ${hn}</small>
                </div>
                <div style="font-size:12px; margin-top:5px; color:#555;">
                    ${statusText}<br>
                    ล่าสุด: ${lastLog ? lastLog.time : '-'}
                </div>
            `;
            list.appendChild(card);
        });
    });
}

function showModal(p, hn) {
    document.getElementById('modal-title').innerText = p.name;
    let html = `<p>ผู้ปกครอง: ${p.parent} <br> โทร: <a href="tel:${p.phone}">${p.phone}</a></p><hr>`;
    html += `<h4>ประวัติ (${p.logs.length} ครั้ง)</h4><ul style="padding-left:20px; text-align:left;">`;
    // โชว์ย้อนหลัง (Reverse)
    [...p.logs].reverse().forEach(l => {
        html += `<li>${l.time} ${l.symptoms?'<span style="color:red">('+l.symptoms+')</span>':''}</li>`;
    });
    html += `</ul>`;
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('admin-modal').classList.remove('hidden');
}
function closeModal() { document.getElementById('admin-modal').classList.add('hidden'); }

// --- Notification Permission ---
function requestPermission() {
    Notification.requestPermission().then(p => {
        if(p==='granted') messaging.getToken({vapidKey:""}).then(t => {
            if(t) localStorage.setItem('fcm_token', t);
        });
    });
}
messaging.onMessage(p => alert(p.notification.title + "\n" + p.notification.body));

// --- PWA Install ---
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferredPrompt = e;
    document.getElementById('btn-install').style.display = 'block';
});
function installPWA() {
    if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; }
}
