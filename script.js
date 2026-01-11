// ==========================================
// 1. ตั้งค่าระบบ (Configuration)
// ==========================================

// ลิ้งค์ Web App URL ของคุณ (Backend)
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbye2tPNF1QVI7xsQ5QT_e_cTEFIckKszMnXWjmbGOb_Qoz6HrYE28gEAd8KmZ7sEyN7/exec"; 

// ค่า Config ของคุณ (ใส่ให้แล้ว)
const firebaseConfig = {
    apiKey: "AIzaSyADXEA4Hs_WJDXVxfsGHLyPytTVypZqd6U",
    authDomain: "asthmaalert-903b7.firebaseapp.com",
    projectId: "asthmaalert-903b7",
    storageBucket: "asthmaalert-903b7.firebasestorage.app", // แก้ไขเล็กน้อยจาก firebasestorage.app ให้ทำงานถูกต้อง
    messagingSenderId: "123117910600",
    appId: "1:123117910600:web:d90af1677fa7e04b50767d",
    measurementId: "G-YBLJPHJXK3"
};

// เริ่มต้น Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const messaging = firebase.messaging();

// รายการรูปยา
const MED_IMAGES = {
    "Ventolin": "https://img.freepik.com/free-vector/inhaler-asthma-blue-white-colors_1308-59363.jpg?w=200", 
    "Pulmicort": "https://via.placeholder.com/150/FF0000/FFFFFF?text=Pulmicort",
    "Seretide": "https://via.placeholder.com/150/800080/FFFFFF?text=Seretide"
};

// ==========================================
// 2. การทำงานหลัก (Main Logic)
// ==========================================

window.onload = function() {
    checkAuth();
    updateMedImage();
    setInterval(updateTime, 1000);
    
    // ขออนุญาตแจ้งเตือนทันทีที่เปิดเว็บ
    requestPermission();
};

function updateTime() {
    const now = new Date();
    if(document.getElementById('current-time')) {
        document.getElementById('current-time').innerText = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + " น.";
    }
}

function updateMedImage() {
    const med = document.getElementById('reg-med').value;
    const imgUrl = MED_IMAGES[med] || "https://via.placeholder.com/150?text=" + med; 
    document.getElementById('med-img-preview').src = imgUrl;
}

// --- Notification Logic ---
function requestPermission() {
    Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
            console.log('Notification permission granted.');
            // รับ Token (ใช้ vapidKey ว่างไว้ก่อนสำหรับ Legacy)
            messaging.getToken({ vapidKey: "" }).then((currentToken) => {
                if (currentToken) {
                    console.log("Token:", currentToken);
                    localStorage.setItem('fcm_token', currentToken);
                } else {
                    console.log('No registration token available.');
                }
            }).catch((err) => {
                console.log('An error occurred while retrieving token. ', err);
            });
        } else {
            console.log('Unable to get permission to notify.');
        }
    });
}

// เมื่อได้รับข้อความตอนเปิดหน้าจออยู่
messaging.onMessage((payload) => {
    console.log('Message received. ', payload);
    alert(payload.notification.title + "\n" + payload.notification.body);
});


// --- Navigation & Auth ---
function checkAuth() {
    const user = JSON.parse(localStorage.getItem('ashma_user'));
    if (user && user.hn) {
        showDashboard(user);
    } else {
        showRegister();
    }
}

function showRegister() {
    hideAll();
    document.getElementById('view-register').classList.remove('hidden');
}

function showLogin() {
    hideAll();
    document.getElementById('view-login').classList.remove('hidden');
}

function showDashboard(user) {
    hideAll();
    document.getElementById('view-dashboard').classList.remove('hidden');
    
    document.getElementById('display-name').innerText = user.patient_name;
    document.getElementById('display-hn').innerText = user.hn;
    document.getElementById('display-med-name').innerText = user.medication;
    
    const imgUrl = MED_IMAGES[user.medication] || "https://via.placeholder.com/150?text=" + user.medication;
    document.getElementById('display-med-img').src = imgUrl;

    loadHistory(user.hn);
}

function hideAll() {
    document.getElementById('view-register').classList.add('hidden');
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-dashboard').classList.add('hidden');
}

// --- API Functions ---

// 1. ลงทะเบียน
document.getElementById('form-register').addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = this.querySelector('button');
    btn.innerText = "กำลังบันทึก...";
    btn.disabled = true;

    // ดึง Token ที่เก็บไว้
    const fcmToken = localStorage.getItem('fcm_token') || "";

    const data = {
        action: 'register',
        hn: document.getElementById('reg-hn').value, 
        user_token: fcmToken, // ส่ง Token ไปให้ Backend
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
        alert("ลงทะเบียนสำเร็จ! และเปิดระบบแจ้งเตือนแล้ว");
        localStorage.setItem('ashma_user', JSON.stringify({
            hn: data.hn,
            patient_name: data.patient_name,
            medication: data.medication
        }));
        location.reload();
    }).catch(err => {
        alert("เกิดข้อผิดพลาด: " + err);
        btn.disabled = false;
        btn.innerText = "ลงทะเบียน";
    });
});

// 2. Login
function login() {
    const hn = document.getElementById('login-hn').value;
    if(!hn) return alert("กรุณากรอก HN");

    fetch(WEB_APP_URL + "?action=login&hn=" + hn)
    .then(res => res.json())
    .then(data => {
        if(data.status == "success") {
            localStorage.setItem('ashma_user', JSON.stringify(data.user));
            location.reload();
        } else {
            alert("ไม่พบข้อมูล HN นี้");
        }
    });
}

// 3. บันทึกการพ่นยา
function submitLog() {
    const user = JSON.parse(localStorage.getItem('ashma_user'));
    const symptom = document.getElementById('log-symptom').value;
    
    if(!confirm("ยืนยันการพ่นยา?")) return;

    const data = {
        action: 'addLog',
        hn: user.hn,
        symptoms: symptom
    };

    fetch(WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(data)
    }).then(() => {
        alert("บันทึกเรียบร้อย!");
        document.getElementById('log-symptom').value = "";
        loadHistory(user.hn); 
    });
}

// 4. โหลดประวัติ
function loadHistory(hn) {
    const list = document.getElementById('history-list');
    list.innerHTML = "<li>กำลังโหลด...</li>";

    fetch(WEB_APP_URL + "?action=getHistory&hn=" + hn)
    .then(res => res.json())
    .then(data => {
        list.innerHTML = "";
        if(!data.history || data.history.length == 0) {
            list.innerHTML = "<li>ยังไม่มีประวัติการพ่นยา</li>";
            return;
        }
        data.history.forEach(item => {
            let li = document.createElement('li');
            li.innerHTML = `
                <span>${item.date}</span>
                <span>
                    ${item.action}
                    ${item.symptoms ? '<br><small class="symptom-alert">อาการ: '+item.symptoms+'</small>' : ''}
                </span>
            `;
            list.appendChild(li);
        });
    });
}

function logout() {
    localStorage.removeItem('ashma_user');
    location.reload();
}
// ==========================================
// ส่วนเสริม: Theme Switcher (เปลี่ยนสี)
// ==========================================

// โหลดธีมที่เคยเลือกไว้ (ถ้ามี) ตอนเปิดเว็บ
const savedTheme = localStorage.getItem('app_theme');
if (savedTheme) {
    document.body.className = savedTheme;
}

// ฟังก์ชันเปลี่ยนธีม
function setTheme(themeName) {
    // ลบ Class ธีมเดิมออกให้หมดก่อน
    document.body.classList.remove('theme-ocean', 'theme-urban');

    if (themeName === 'theme-luxury') {
        // ถ้าเป็น Luxury ไม่ต้องเติม class อะไร (ใช้ค่า Default ใน :root)
        localStorage.setItem('app_theme', '');
    } else {
        // ถ้าเป็นธีมอื่น ให้เติม class นั้นเข้าไปที่ body
        document.body.classList.add(themeName);
        localStorage.setItem('app_theme', themeName);
    }
}
function hideAll() {
    document.getElementById('view-register').classList.add('hidden');
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-admin-login').classList.add('hidden'); // เพิ่ม
    document.getElementById('view-dashboard').classList.add('hidden');
    document.getElementById('view-admin-dashboard').classList.add('hidden'); // เพิ่ม
}
