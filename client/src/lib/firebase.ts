import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const messaging = getMessaging(app);
const googleProvider = new GoogleAuthProvider();

// Request permission and get token
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      });
      return { token, error: null };
    } else {
      return { token: null, error: 'Permission denied' };
    }
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return { token: null, error };
  }
};

// Handle foreground messages
export const onMessageListener = () => {
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
};

// Send token to server
export const sendTokenToServer = async (token: string, userId: string) => {
  try {
    const response = await fetch('/api/users/fcm-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`, // You'll need to implement this
      },
      body: JSON.stringify({ fcmToken: token }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to register FCM token');
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error sending FCM token to server:', error);
    return { success: false, error };
  }
};

// Get auth token helper
const getAuthToken = async () => {
  // This should return the current user's auth token
  // Implementation depends on your auth system
  const user = auth.currentUser;
  if (user) {
    return await user.getIdToken();
  }
  return null;
};

export { auth, googleProvider };
export default app;
