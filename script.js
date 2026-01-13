// ==========================================
// 1. Config & Setup
// ==========================================

// URL ของ Apps Script (เช็คว่าเป็นอันล่าสุดที่คุณ Deploy)
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbye2tPNF1QVI7xsQ5QT_e_cTEFIckKszMnXWjmbGOb_Qoz6HrYE28gEAd8KmZ7sEyN7/exec"; 

// VAPID Key ของคุณ
const VAPID_KEY = "BEFQSgs9biYE5kcWoJNJmxfA90OBaQjFdTwyoijfA-TcmEzCmwXaYBl3g6XdiQ7zL4wC9IPs9_cLqH_gi43KNmQ";

const firebaseConfig = {
    apiKey: "AIzaSyADXEA4Hs_WJDXVxfsGHLyPytTVypZqd6U",
    authDomain: "asthmaalert-903b7.firebaseapp.com",
    projectId: "asthmaalert-903b7",
    storageBucket: "asthmaalert-903b7.firebasestorage.app",
    messagingSenderId: "123117910600",
    appId: "1:123117910600:web:d90af1677fa7e04b50767d",
    measurementId: "G-YBLJPHJXK3"
};

// Initialize Firebase
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

const MED_IMAGES = {
    "Ventolin": "https://img.freepik.com/free-vector/inhaler-asthma-blue-white-colors_1308-59363.jpg?w=200", 
    "Pulmicort": "https://via.placeholder.com/150/FF0000/FFFFFF?text=Pulmicort",
    "Seretide": "https://via.placeholder.com/150/800080/FFFFFF?text=Seretide"
};

// ==========================================
// 2. Initialization
// ==========================================

window.onload = function() {
    // Load Theme
    const savedTheme = localStorage.getItem('app_theme');
    if (savedTheme) document.body.className = savedTheme;
    
    // Check Browser
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    if ((ua.indexOf("FBAN") > -1) || (ua.indexOf("FBAV") > -1) || (ua.indexOf("Line") > -1)) {
        document.getElementById('line-warning').classList.remove('hidden');
    }

    // Check Install
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
        document.getElementById('android-install-area').classList.add('hidden');
        document.getElementById('ios-install-area').classList.add('hidden');
        document.getElementById('installed-msg').classList.remove('hidden');
    } else {
        if(/iphone|ipad|ipod/.test(ua.toLowerCase())) {
             document.getElementById('ios-install-area').classList.remove('hidden');
        } else {
             document.getElementById('android-install-area').classList.remove('hidden');
        }
    }
    
    // Check Notification Permission
    if (Notification.permission === 'granted') {
        document.getElementById('btn-allow-notify').classList.add('hidden');
        document.getElementById('notify-msg').classList.remove('hidden');
        
        // เช็คว่ามี Token ในเครื่องหรือยัง ถ้ายังให้ลองขอใหม่
        if(!localStorage.getItem('fcm_token')) {
            console.log("Permission granted but no token, retrying...");
            requestPermission();
        }
    }

    updateTime();
    setInterval(updateTime, 1000);
};

// ==========================================
// 3. Notification Logic (จุดที่แก้ไขสำคัญ!)
// ==========================================

function requestPermission() {
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            document.getElementById('btn-allow-notify').classList.add('hidden');
            document.getElementById('notify-msg').classList.remove('hidden');
            
            // 🛠️ บังคับลงทะเบียน Service Worker ก่อนขอ Token
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('./firebase-messaging-sw.js')
                .then(function(registration) {
                    console.log('Service Worker Registered:', registration);
                    
                    // ขอ Token โดยอ้างอิง Service Worker ตัวนี้
                    return messaging.getToken({ 
                        vapidKey: VAPID_KEY,
                        serviceWorkerRegistration: registration 
                    });
                })
                .then((currentToken) => {
                    if (currentToken) {
                        console.log("Token received:", currentToken);
                        localStorage.setItem('fcm_token', currentToken);
                        // Alert เพื่อให้คุณรู้ว่าสำเร็จแล้ว (เอาออกได้ภายหลัง)
                        alert("✅ เชื่อมต่อระบบแจ้งเตือนสำเร็จ!");
                    } else {
                        console.log('No registration token available.');
                    }
                })
                .catch((err) => {
                    console.log('An error occurred while retrieving token. ', err);
                    alert("❌ สร้าง Token ไม่สำเร็จ: " + err);
                });
            } else {
                alert("Browser นี้ไม่รองรับ Service Worker");
            }
        } else {
            alert("กรุณากดอนุญาต (Allow) เพื่อให้ระบบแจ้งเตือนทำงานได้");
        }
    });
}

// ==========================================
// 4. App Logic (Navigation, Auth, Logs)
// ==========================================

function closeLineWarning() { document.getElementById('line-warning').classList.add('hidden'); }

function switchTab(pageId, navElement) {
    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    navElement.classList.add('active');
    if(pageId === 'page-record') checkAuth();
}

function goToRecord() { switchTab('page-record', document.querySelectorAll('.nav-item')[1]); }

function updateTime() {
    const now = new Date();
    if(document.getElementById('current-time')) document.getElementById('current-time').innerText = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + " น.";
}
function updateMedImage() {
    document.getElementById('med-img-preview').src = MED_IMAGES[document.getElementById('reg-med').value] || "";
}
function setTheme(themeName) {
    document.body.className = themeName === 'theme-luxury' ? '' : themeName;
    localStorage.setItem('app_theme', document.body.className);
}

// Auth
function checkAuth() {
    const user = JSON.parse(localStorage.getItem('ashma_user'));
    if (user && user.hn) showDashboard(user); else showRegister();
}
function showRegister() { hideAll(); document.getElementById('view-register').classList.remove('hidden'); }
function showLogin() { hideAll(); document.getElementById('view-login').classList.remove('hidden'); }
function hideAll() {
    document.getElementById('view-register').classList.add('hidden');
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-dashboard').classList.add('hidden');
}
function showDashboard(user) {
    hideAll();
    document.getElementById('view-dashboard').classList.remove('hidden');
    document.getElementById('display-name').innerText = user.patient_name;
    document.getElementById('display-hn').innerText = user.hn;
    document.getElementById('display-med-name').innerText = user.medication;
    document.getElementById('display-med-img').src = MED_IMAGES[user.medication];
    loadHistory(user.hn);
}

// Register
document.getElementById('form-register').addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = this.querySelector('button');
    
    // ตรวจสอบ Token ก่อนส่ง
    const token = localStorage.getItem('fcm_token');
    if (!token) {
        alert("⚠️ ระบบยังไม่ได้รับรหัสแจ้งเตือน\nกรุณารอสักครู่ หรือกดรีเฟรชแล้วลองกดอนุญาตแจ้งเตือนใหม่");
        requestPermission(); // ลองขอใหม่
        return;
    }

    btn.innerText = "กำลังบันทึก..."; btn.disabled = true;
    
    const noteElem = document.getElementById('reg-note');
    const noteVal = noteElem ? noteElem.value : "";

    const data = {
        action: 'register',
        hn: document.getElementById('reg-hn').value,
        user_token: token, // ส่ง Token
        parent_name: document.getElementById('reg-parent').value,
        phone: document.getElementById('reg-phone').value,
        patient_name: document.getElementById('reg-patient').value,
        medication: document.getElementById('reg-med').value,
        med_image: MED_IMAGES[document.getElementById('reg-med').value] || "",
        note: noteVal
    };

    fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams(data)})
    .then(() => {
        alert("ลงทะเบียนสำเร็จ! ✅");
        localStorage.setItem('ashma_user', JSON.stringify({ hn: data.hn, patient_name: data.patient_name, medication: data.medication }));
        location.reload();
    }).catch(e => { alert("Error: " + e); btn.disabled = false; });
});

function login() {
    const hn = document.getElementById('login-hn').value;
    fetch(WEB_APP_URL + "?action=login&hn=" + hn).then(r=>r.json()).then(d => {
        if(d.status=="success") { localStorage.setItem('ashma_user', JSON.stringify(d.user)); location.reload(); }
        else alert("ไม่พบข้อมูล");
    });
}
function logout() { localStorage.removeItem('ashma_user'); location.reload(); }

function submitLog() {
    const user = JSON.parse(localStorage.getItem('ashma_user'));
    const sym = document.getElementById('log-symptom').value;
    if(!confirm("ยืนยัน?")) return;
    
    fetch(WEB_APP_URL, { method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams({action:'addLog', hn:user.hn, symptoms:sym})})
    .then(r=>r.json()).then(d => {
        if(d.status=="success") {
            document.getElementById('log-symptom').value = "";
            loadHistory(user.hn);
            checkReward(d.total_count);
        }
    }).catch(() => { alert("บันทึกสำเร็จ"); loadHistory(user.hn); });
}

function loadHistory(hn) {
    const list = document.getElementById('history-list'); list.innerHTML = "<li>Loading...</li>";
    fetch(WEB_APP_URL + "?action=getHistory&hn=" + hn).then(r=>r.json()).then(d => {
        list.innerHTML = "";
        if(!d.history || d.history.length==0) list.innerHTML = "<li>ไม่มีข้อมูล</li>";
        else d.history.forEach(i => list.innerHTML += `<li><span>${i.date}</span><span>${i.action} ${i.symptoms?'<br><small style="color:red">'+i.symptoms+'</small>':''}</span></li>`);
    });
}

function checkReward(count) {
    const popup = document.getElementById('reward-popup');
    const t = document.getElementById('reward-title');
    const m = document.getElementById('reward-msg');
    if(count % 10 === 0) { t.innerText="🏆 สุดยอด!"; m.innerText=`ครบ ${count} ครั้งแล้ว เยี่ยมมาก`; }
    else if(count % 5 === 0) { t.innerText="⭐ เก่งมาก!"; m.innerText=`ครบ ${count} ครั้งแล้ว`; }
    else { t.innerText="❤️ ขอบคุณ"; m.innerText="บันทึกเรียบร้อย"; setTimeout(closeReward, 1500); }
    popup.classList.remove('hidden');
}
function closeReward() { document.getElementById('reward-popup').classList.add('hidden'); }

// Admin
function checkAdmin() {
    if(document.getElementById('admin-pass').value === '1234') {
        document.getElementById('view-admin-login').classList.add('hidden');
        document.getElementById('view-admin-dashboard').classList.remove('hidden');
        loadAdminData();
    } else alert("รหัสผิด");
}
function adminLogout() { location.reload(); }
function loadAdminData() {
    const list = document.getElementById('admin-list'); list.innerHTML = "Loading...";
    fetch(WEB_APP_URL + "?action=getAllAdmin").then(r=>r.json()).then(d => {
        list.innerHTML = "";
        Object.keys(d.data).forEach(hn => {
            const p = d.data[hn];
            const lastLog = p.logs.length > 0 ? p.logs[p.logs.length-1] : null;
            let status = "status-missed", statusTxt = "🔴 ขาดส่ง", isMissed = true;
            if(lastLog) {
                if((new Date().getTime() - lastLog.timestamp)/(1000*3600) < 24) { status="status-good"; statusTxt="🟢 ปกติ"; isMissed=false; }
                if(lastLog.symptoms) { status="status-warning"; statusTxt="🟡 มีอาการ"; }
            }
            const div = document.createElement('div');
            div.className = `admin-card-row ${status}`;
            div.onclick = () => showModal(p, hn);
            div.innerHTML = `<div style="display:flex;justify-content:space-between;"><b>${p.name}</b><small>${hn}</small></div><div style="font-size:12px;color:#666;">${statusTxt} <br> ล่าสุด: ${lastLog?lastLog.time:'-'}</div>`;
            list.appendChild(div);
        });
    });
}
function showModal(p, hn) {
    document.getElementById('modal-title').innerText = p.name;
    let h = `<p>ผู้ปกครอง: ${p.parent} <a href="tel:${p.phone}">📞</a></p><hr><ul>`;
    [...p.logs].reverse().forEach(l => h += `<li>${l.time} ${l.symptoms?'<span style="color:red">('+l.symptoms+')</span>':''}</li>`);
    document.getElementById('modal-body').innerHTML = h + "</ul>";
    document.getElementById('admin-modal').classList.remove('hidden');
}
function closeModal() { document.getElementById('admin-modal').classList.add('hidden'); }

// Install
let deferredPrompt;
window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); deferredPrompt = e;
    document.getElementById('android-install-area').classList.remove('hidden');
});
function installPWA() { if(deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; } }
