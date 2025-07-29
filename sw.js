// Service Worker for Chrome Notifications
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: 'https://via.placeholder.com/192.png?text=GoPandaCars',
    badge: 'https://via.placeholder.com/64.png?text=GP',
    vibrate: [200, 100, 200],
    data: {
      url: '/admin.html',
      bookingId: data.bookingId
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      if (clientList.length > 0) {
        const client = clientList[0];
        client.focus();
        if (event.notification.data.bookingId) {
          client.postMessage({
            action: 'viewBooking',
            bookingId: event.notification.data.bookingId
          });
        }
        return;
      }
      return clients.openWindow(event.notification.data.url);
    })
  );
});
