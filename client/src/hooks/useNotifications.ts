import { useState, useEffect, useCallback } from 'react';
import { requestNotificationPermission, onMessageListener, sendTokenToServer } from '@/lib/firebase';
import { useAuth } from '@/lib/firebaseAuth';
import { toast } from 'sonner';

interface NotificationPayload {
  notification?: {
    title?: string;
    body?: string;
  };
  data?: {
    [key: string]: string;
  };
}

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // Initialize notification permission and token
  const initializeNotifications = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { token, error } = await requestNotificationPermission();
      
      if (token) {
        setFcmToken(token);
        await sendTokenToServer(token, user.uid);
        setPermission('granted');
        console.log('FCM token registered successfully');
      } else if (error) {
        console.error('Failed to get notification permission:', error);
        setPermission('denied');
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
      setPermission('denied');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Request permission manually
  const requestPermission = useCallback(async () => {
    if (!user) {
      toast.error('Please log in to enable notifications');
      return;
    }

    setIsLoading(true);
    try {
      const { token, error } = await requestNotificationPermission();
      
      if (token) {
        setFcmToken(token);
        await sendTokenToServer(token, user.uid);
        setPermission('granted');
        toast.success('Notifications enabled successfully!');
      } else {
        setPermission('denied');
        toast.error('Permission denied for notifications');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      setPermission('denied');
      toast.error('Failed to enable notifications');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Disable notifications
  const disableNotifications = useCallback(async () => {
    if (!user) return;

    try {
      await fetch('/api/users/fcm-token', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`,
        },
      });
      
      setFcmToken(null);
      setPermission('denied');
      toast.success('Notifications disabled');
    } catch (error) {
      console.error('Error disabling notifications:', error);
      toast.error('Failed to disable notifications');
    }
  }, [user]);

  // Handle foreground messages
  useEffect(() => {
    if (permission !== 'granted') return;

    const unsubscribe = onMessageListener()
      .then((payload: NotificationPayload) => {
        console.log('Foreground message received:', payload);
        
        // Show toast notification for foreground messages
        const title = payload.notification?.title || 'New Notification';
        const body = payload.notification?.body || '';
        
        toast(title, {
          description: body,
          action: payload.data?.requestId ? {
            label: 'View',
            onClick: () => {
              window.location.href = `/request/${payload.data?.requestId}`;
            }
          } : undefined,
          duration: 5000,
        });

        // Mark as read if notification ID is available
        if (payload.data?.notificationId) {
          fetch(`/api/notifications/${payload.data.notificationId}/mark-read`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include'
          }).catch(error => {
            console.error('Failed to mark notification as read:', error);
          });
        }
      })
      .catch((error) => {
        console.error('Error setting up foreground message listener:', error);
      });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [permission]);

  // Initialize on mount
  useEffect(() => {
    setPermission(Notification.permission);
    
    if (user && Notification.permission === 'granted') {
      initializeNotifications();
    }
  }, [user, initializeNotifications]);

  // Test notification function
  const sendTestNotification = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/test/push-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          title: 'Test Notification',
          message: 'This is a test push notification from Zariya FMC'
        })
      });

      if (response.ok) {
        toast.success('Test notification sent!');
      } else {
        toast.error('Failed to send test notification');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    }
  }, [user]);

  return {
    permission,
    fcmToken,
    isLoading,
    requestPermission,
    disableNotifications,
    sendTestNotification,
    isSupported: 'Notification' in window && 'serviceWorker' in navigator,
  };
};