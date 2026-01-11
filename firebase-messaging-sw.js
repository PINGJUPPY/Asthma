importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// Config เดียวกันกับ script.js
firebase.initializeApp({
    apiKey: "AIzaSyADXEA4Hs_WJDXVxfsGHLyPytTVypZqd6U",
    authDomain: "asthmaalert-903b7.firebaseapp.com",
    projectId: "asthmaalert-903b7",
    storageBucket: "asthmaalert-903b7.firebasestorage.app",
    messagingSenderId: "123117910600",
    appId: "1:123117910600:web:d90af1677fa7e04b50767d",
    measurementId: "G-YBLJPHJXK3"
});

const messaging = firebase.messaging();

// ทำงานเมื่อได้รับแจ้งเตือนตอนปิดหน้าจอ หรืออยู่ Background
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
    data: {
        url: 'https://github.com' // ลิ้งค์ที่จะเปิดเมื่อกด (เดี๋ยวค่อยแก้เป็นลิ้งค์เว็บจริงทีหลังได้)
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
