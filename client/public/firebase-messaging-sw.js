// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase in service worker
firebase.initializeApp({
  apiKey: "your-api-key", // Will be replaced by build process
  authDomain: "your-auth-domain",
  projectId: "your-project-id", 
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message ', payload);

  const notificationTitle = payload.notification?.title || 'Zariya FMC';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: payload.data?.type || 'general',
    data: {
      url: payload.data?.requestId 
        ? `/request/${payload.data.requestId}` 
        : '/dashboard',
      ...payload.data
    },
    actions: [
      {
        action: 'open',
        title: 'Open',
        icon: '/icons/open.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss.png'
      }
    ],
    requireInteraction: payload.data?.type === 'urgent',
    vibrate: payload.data?.type === 'urgent' ? [200, 100, 200] : [100, 50, 100]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/dashboard';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url.includes(urlToOpen.split('?')[0]) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If not, open a new window/tab
      if (clients.openWindow) {
        const baseUrl = self.location.origin;
        return clients.openWindow(baseUrl + urlToOpen);
      }
    })
  );

  // Mark notification as read if we have the notification ID
  if (event.notification.data?.notificationId) {
    fetch(`/api/notifications/${event.notification.data.notificationId}/mark-read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    }).catch(error => {
      console.error('Failed to mark notification as read:', error);
    });
  }
});

// Handle push events (fallback)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    console.log('Push event data:', data);

    const title = data.notification?.title || 'Zariya FMC';
    const options = {
      body: data.notification?.body || 'You have a new notification',
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: data.data || {}
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});