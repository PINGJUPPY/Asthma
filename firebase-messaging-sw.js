importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging-compat.js');

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

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
