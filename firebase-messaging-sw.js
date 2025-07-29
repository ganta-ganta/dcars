importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAJKgz1fONteZPPD5T9bcIVjw3-iBUZyro",
  authDomain: "gopandacars-7085f.firebaseapp.com",
  projectId: "gopandacars-7085f",
  storageBucket: "gopandacars-7085f.appspot.com",
  messagingSenderId: "486383420605",
  appId: "1:486383420605:web:your-app-id-here"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/images/icon-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
