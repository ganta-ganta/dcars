// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAJKgz1fONteZPPD5T9bcIVjw3-iBUZyro",
  authDomain: "gopandacars-7085f.firebaseapp.com",
  projectId: "gopandacars-7085f",
  storageBucket: "gopandacars-7085f.appspot.com",
  messagingSenderId: "486383420605",
  appId: "1:486383420605:web:your-app-id-here"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();
const messaging = firebase.messaging();

// DOM elements
const logoutBtn = document.getElementById('logoutBtn');
const dashboardSection = document.getElementById('dashboardSection');
const bookingsSection = document.getElementById('bookingsSection');
const usersSection = document.getElementById('usersSection');
const offersSection = document.getElementById('offersSection');
const carsSection = document.getElementById('carsSection');
const bookingModal = new bootstrap.Modal(document.getElementById('bookingModal'));
const userModal = new bootstrap.Modal(document.getElementById('userModal'));
const addOfferModal = new bootstrap.Modal(document.getElementById('addOfferModal'));
const addCarModal = new bootstrap.Modal(document.getElementById('addCarModal'));
const verifyPaymentModal = new bootstrap.Modal(document.getElementById('verifyPaymentModal'));
const notificationSound = document.getElementById('notificationSound');
const notificationBadge = document.getElementById('notificationBadge');
const notificationsList = document.getElementById('notificationsList');
const notificationsDropdown = document.getElementById('notificationsDropdown');
const notificationsBtn = document.getElementById('notificationsBtn');
const clearNotificationsBtn = document.getElementById('clearNotificationsBtn');
const viewAllBookings = document.getElementById('viewAllBookings');
const currentDateElement = document.getElementById('currentDate');

// Global variables
let currentBookingId = null;
let currentUserId = null;
let lastBookingTimestamp = null;
let unreadNotifications = 0;
let bookingsChart = null;
let revenueChart = null;
let currentBookingsPage = 1;
const bookingsPerPage = 10;
let currentBookingsFilter = 'all';
let currentBookingsSearch = '';
let currentUsersPage = 1;
const usersPerPage = 10;
let currentUsersFilter = 'all';
let currentUsersSearch = '';

// Current date display
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
currentDateElement.textContent = new Date().toLocaleDateString('en-US', options);

// Request notification permission when the page loads
document.addEventListener('DOMContentLoaded', () => {
  if ('Notification' in window) {
    if (Notification.permission === 'default') {
      // Show a button to enable notifications
      const enableNotificationsBtn = document.createElement('button');
      enableNotificationsBtn.id = 'enableNotificationsBtn';
      enableNotificationsBtn.className = 'btn btn-sm btn-outline-primary ms-2';
      enableNotificationsBtn.innerHTML = '<i class="fas fa-bell me-1"></i> Enable Notifications';
      document.querySelector('.d-flex.align-items-center').appendChild(enableNotificationsBtn);
      
      enableNotificationsBtn.addEventListener('click', () => {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            enableNotificationsBtn.remove();
            console.log('Notification permission granted');
            // Request push notification permission
            requestPushPermission();
          } else {
            alert('Notifications blocked. You can enable them later in Chrome settings.');
          }
        });
      });
    } else if (Notification.permission === 'granted') {
      // Already granted, request push permission
      requestPushPermission();
    }
  }

  // Register Service Worker for push notifications
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('ServiceWorker registration successful');
      })
      .catch(err => {
        console.log('ServiceWorker registration failed: ', err);
      });
  }
});

// Request permission for push notifications
function requestPushPermission() {
  messaging.requestPermission()
    .then(() => {
      console.log('Notification permission granted.');
      return messaging.getToken();
    })
    .then((token) => {
      console.log('FCM token:', token);
      // Send this token to your server to target this device
      // You would typically save this token to your database
    })
    .catch((err) => {
      console.log('Unable to get permission to notify.', err);
    });
}

// Handle incoming messages
messaging.onMessage((payload) => {
  console.log('Message received:', payload);
  showChromeNotification(payload.data);
});

// Chrome-specific notification function
function showChromeNotification(booking) {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return;
  }

  if (Notification.permission === 'granted') {
    const options = {
      body: `${booking.carName || 'A car'} booked by ${booking.userEmail || 'a customer'}`,
      icon: 'https://via.placeholder.com/192.png?text=GoPandaCars',
      badge: 'https://via.placeholder.com/64.png?text=GP',
      vibrate: [200, 100, 200],
      data: {
        bookingId: booking.id,
        timestamp: Date.now()
      },
      actions: [
        { action: 'view', title: 'View Booking' },
        { action: 'close', title: 'Close' }
      ]
    };

    const notification = new Notification('New Booking Received', options);

    // Handle notification click
    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      viewBookingDetails(booking.id);
      notification.close();
    };

    // Handle action buttons
    notification.addEventListener('actionclick', (event) => {
      if (event.action === 'view') {
        window.focus();
        viewBookingDetails(booking.id);
      }
      notification.close();
    });
  }
}

// Check auth state
auth.onAuthStateChanged(user => {
  if (user) {
    // Check if user is admin
    if (user.email === 'admin@gopandacars.in') {
      // Admin user
      loadDashboard();
      setupEventListeners();
      setupNotifications();
    } else {
      // Not admin
      window.location.href = 'profile.html';
    }
  } else {
    // No user signed in
    window.location.href = 'login.html';
  }
});

// Setup notifications system
function setupNotifications() {
  // Load last booking timestamp from localStorage
  const lastTimestamp = localStorage.getItem('lastBookingTimestamp');
  if (lastTimestamp) {
    lastBookingTimestamp = new Date(parseInt(lastTimestamp));
  }
  
  // Set up real-time listener for new bookings
  db.collection('bookings').orderBy('createdAt', 'desc').limit(1)
    .onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const booking = change.doc.data();
          const bookingTime = booking.createdAt.toDate();
          
          // Check if this is a new booking since last check
          if (!lastBookingTimestamp || bookingTime > lastBookingTimestamp) {
            lastBookingTimestamp = bookingTime;
            localStorage.setItem('lastBookingTimestamp', bookingTime.getTime().toString());
            
            // Only show notification if not initial load
            if (lastBookingTimestamp) {
              addNewBookingNotification(change.doc.id, booking);
              playNotificationSound();
            }
          }
        }
      });
    });
    
  // Load existing notifications
  loadNotifications();
  
  // Notification button click handler
  notificationsBtn.addEventListener('click', () => {
    notificationsDropdown.style.display = notificationsDropdown.style.display === 'block' ? 'none' : 'block';
    markNotificationsAsRead();
    
    // If notifications are blocked, show a message to enable them
    if (Notification.permission === 'denied') {
      alert('Notifications are blocked. Please enable them in your browser settings to receive alerts for new bookings.');
    }
  });
  
  // Clear notifications button
  clearNotificationsBtn.addEventListener('click', clearNotifications);
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!notificationsBtn.contains(e.target) && !notificationsDropdown.contains(e.target)) {
      notificationsDropdown.style.display = 'none';
    }
  });
}

function playNotificationSound() {
  notificationSound.currentTime = 0; // Rewind to start
  notificationSound.play().catch(e => console.log("Audio play failed:", e));
}

function addNewBookingNotification(bookingId, booking) {
  unreadNotifications++;
  updateNotificationBadge();
  
  const notificationItem = document.createElement('div');
  notificationItem.className = 'notification-item unread';
  notificationItem.innerHTML = `
    <div class="d-flex justify-content-between align-items-start">
      <div>
        <strong>New Booking</strong>
        <p class="mb-1">${booking.carName || 'Unknown car'} booked by ${booking.userEmail || 'unknown user'}</p>
        <p class="mb-0 notification-time">${new Date().toLocaleTimeString()}</p>
      </div>
      <a href="#" class="btn btn-sm btn-outline-primary view-notification" data-booking-id="${bookingId}">View</a>
    </div>
  `;
  
  // Add to top of list
  if (notificationsList.firstChild) {
    notificationsList.insertBefore(notificationItem, notificationsList.firstChild);
  } else {
    notificationsList.appendChild(notificationItem);
  }
  
  // Add click handler for view button
  notificationItem.querySelector('.view-notification').addEventListener('click', (e) => {
    e.preventDefault();
    viewBookingDetails(bookingId);
    notificationsDropdown.style.display = 'none';
  });

  // Show Chrome notification
  if (Notification.permission === 'granted') {
    showChromeNotification({ ...booking, id: bookingId });
  }
}

function updateNotificationBadge() {
  if (unreadNotifications > 0) {
    notificationBadge.style.display = 'block';
    notificationBadge.textContent = unreadNotifications;
  } else {
    notificationBadge.style.display = 'none';
  }
}

function markNotificationsAsRead() {
  unreadNotifications = 0;
  updateNotificationBadge();
  
  // Remove unread styling
  document.querySelectorAll('.notification-item.unread').forEach(item => {
    item.classList.remove('unread');
  });
}

function clearNotifications() {
  notificationsList.innerHTML = '<div class="p-3 text-center text-muted">No notifications</div>';
  markNotificationsAsRead();
}

function loadNotifications() {
  // In a real app, you might load persisted notifications from a database
  notificationsList.innerHTML = '<div class="p-3 text-center text-muted">No notifications</div>';
}

// [Rest of your existing functions remain the same...]
// (loadDashboard, initCharts, loadAllBookings, renderBookingsTable, etc.)
// Make sure to keep all your existing functions but add the Chrome notification code above

// Setup event listeners
function setupEventListeners() {
  // [Your existing event listener code...]
  // Make sure to keep all your existing event listeners
  
  // Add notification settings button if it doesn't exist
  if (!document.getElementById('notificationSettingsBtn')) {
    const notificationSettingsBtn = document.createElement('button');
    notificationSettingsBtn.id = 'notificationSettingsBtn';
    notificationSettingsBtn.className = 'btn btn-outline-secondary ms-2';
    notificationSettingsBtn.title = 'Notification Settings';
    notificationSettingsBtn.innerHTML = '<i class="fas fa-cog"></i>';
    document.querySelector('.d-flex.align-items-center').appendChild(notificationSettingsBtn);
    
    notificationSettingsBtn.addEventListener('click', () => {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          alert('Notifications are currently enabled. To disable them, you need to change your browser settings.');
        } else if (Notification.permission === 'denied') {
          alert('Notifications are currently blocked. Please enable them in your browser settings to receive alerts.');
        } else {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              alert('Notifications enabled! You will now receive alerts for new bookings.');
              requestPushPermission();
            } else {
              alert('Notifications not enabled. You can enable them later in your browser settings.');
            }
          });
        }
      } else {
        alert('This browser doesn\'t support desktop notifications');
      }
    });
  }
}

// [All other existing functions...]
