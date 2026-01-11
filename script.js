// ** แก้ไข URL นี้ให้เป็นของคุณ **
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbye2tPNF1QVI7xsQ5QT_e_cTEFIckKszMnXWjmbGOb_Qoz6HrYE28gEAd8KmZ7sEyN7/exec"; 

// รายการรูปยา (สามารถเปลี่ยน URL เป็นรูปจริงได้)
const MED_IMAGES = {
    "Ventolin": "https://drug-img-url.com/ventolin.png", // ใส่ URL รูปจริง
    "Pulmicort": "https://drug-img-url.com/pulmicort.png",
    "Seretide": "https://drug-img-url.com/seretide.png"
};

// เริ่มต้นทำงาน
window.onload = function() {
    checkAuth();
    updateMedImage();
    setInterval(updateTime, 1000);
};

function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    if(document.getElementById('current-time')) document.getElementById('current-time').innerText = timeString + " น.";
}

function updateMedImage() {
    const med = document.getElementById('reg-med').value;
    // ใช้ Placeholder ถ้าไม่มีรูปจริง
    const imgUrl = MED_IMAGES[med] || "https://via.placeholder.com/150?text=" + med; 
    document.getElementById('med-img-preview').src = imgUrl;
}

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
    
    // Render ข้อมูลคนไข้
    document.getElementById('display-name').innerText = user.patient_name;
    document.getElementById('display-hn').innerText = user.hn;
    document.getElementById('display-med-name').innerText = user.medication;
    
    // Show Med Image
    const imgUrl = MED_IMAGES[user.medication] || "https://via.placeholder.com/150?text=" + user.medication;
    document.getElementById('display-med-img').src = imgUrl;

    loadHistory(user.hn);
}

function hideAll() {
    document.getElementById('view-register').classList.add('hidden');
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-dashboard').classList.add('hidden');
    document.getElementById('view-admin').classList.add('hidden');
}

// --- API Functions ---

// 1. ลงทะเบียน
document.getElementById('form-register').addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = this.querySelector('button');
    btn.innerText = "กำลังบันทึก...";
    btn.disabled = true;

    const data = {
        action: 'register',
        parent_name: document.getElementById('reg-parent').value,
        phone: document.getElementById('reg-phone').value,
        patient_name: document.getElementById('reg-patient').value,
        hn: document.getElementById('reg-hn').value,
        medication: document.getElementById('reg-med').value,
        med_image: MED_IMAGES[document.getElementById('reg-med').value] || "",
        note: document.getElementById('reg-note').value
    };

    fetch(WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors', // Google Script POST ต้องใช้ no-cors แต่จะไม่ได้ Response กลับมา
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(data)
    }).then(() => {
        // เนื่องจาก no-cors เราจะสมมติว่าสำเร็จถ้าไม่ Error
        alert("ลงทะเบียนสำเร็จ!");
        // Save LocalStorage
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
        loadHistory(user.hn); // โหลดประวัติใหม่
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
        if(data.history.length == 0) {
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

// 5. Admin
function checkAdmin() {
    const pass = prompt("รหัส Admin:");
    if(pass == "1234") { // รหัสง่ายๆ เปลี่ยนได้
        hideAll();
        document.getElementById('view-admin').classList.remove('hidden');
        loadAdminData();
    }
}

function loadAdminData() {
    const list = document.getElementById('admin-list');
    list.innerHTML = "กำลังโหลดข้อมูล...";
    
    fetch(WEB_APP_URL + "?action=getAllAdmin")
    .then(res => res.json())
    .then(res => {
        list.innerHTML = "";
        const patients = res.data;
        Object.keys(patients).forEach(hn => {
            const p = patients[hn];
            const lastLog = p.logs.length > 0 ? p.logs[p.logs.length-1] : null;
            
            let card = document.createElement('div');
            card.className = "patient-card";
            card.innerHTML = `
                <strong>${p.name} (HN: ${hn})</strong>
                <p>ผู้ปกครอง: ${p.parent} (${p.phone})</p>
                <hr>
                <p>ล่าสุด: ${lastLog ? lastLog.time : 'ยังไม่เคยพ่น'}</p>
                ${lastLog && lastLog.symptoms ? '<p style="color:red">อาการ: '+lastLog.symptoms+'</p>' : ''}
            `;
            list.appendChild(card);
        });
    });
}

function logout() {
    localStorage.removeItem('ashma_user');
    location.reload();
}
