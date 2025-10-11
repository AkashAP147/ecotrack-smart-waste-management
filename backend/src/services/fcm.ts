import admin from 'firebase-admin';
import fs from 'fs';
import config from '../config';

// Initialize Firebase Admin SDK
let isInitialized = false;

const initializeFirebase = () => {
  if (isInitialized) return;

  try {
    if (config.firebase.serviceAccountKey && fs.existsSync(config.firebase.serviceAccountKey)) {
      const serviceAccount = JSON.parse(fs.readFileSync(config.firebase.serviceAccountKey, 'utf8'));
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      
      isInitialized = true;
      console.log('Firebase Admin SDK initialized successfully');
    } else {
      console.warn('Firebase service account key not found. FCM notifications will not work.');
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
  }
};

// Initialize on module load
initializeFirebase();

export interface NotificationPayload {
  title: string;
  body: string;
  data?: { [key: string]: string };
  imageUrl?: string;
}

export interface SendNotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send notification to a single device
 */
export const sendNotificationToDevice = async (
  fcmToken: string,
  payload: NotificationPayload
): Promise<SendNotificationResult> => {
  try {
    if (!isInitialized) {
      return {
        success: false,
        error: 'Firebase not initialized',
      };
    }

    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
      data: payload.data || {},
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#10B981', // Green color for EcoTrack
          sound: 'default',
          priority: 'high' as const,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    
    return {
      success: true,
      messageId: response,
    };
  } catch (error) {
    console.error('FCM send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

/**
 * Send notification to multiple devices
 */
export const sendNotificationToDevices = async (
  fcmTokens: string[],
  payload: NotificationPayload
): Promise<SendNotificationResult[]> => {
  try {
    if (!isInitialized) {
      return fcmTokens.map(() => ({
        success: false,
        error: 'Firebase not initialized',
      }));
    }

    const message: admin.messaging.MulticastMessage = {
      tokens: fcmTokens,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
      data: payload.data || {},
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#10B981',
          sound: 'default',
          priority: 'high' as const,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().sendMulticast(message);
    
    return response.responses.map((resp, index) => ({
      success: resp.success,
      messageId: resp.messageId,
      error: resp.error?.message,
    }));
  } catch (error) {
    console.error('FCM multicast send error:', error);
    return fcmTokens.map(() => ({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }));
  }
};

/**
 * Send notification to topic
 */
export const sendNotificationToTopic = async (
  topic: string,
  payload: NotificationPayload
): Promise<SendNotificationResult> => {
  try {
    if (!isInitialized) {
      return {
        success: false,
        error: 'Firebase not initialized',
      };
    }

    const message: admin.messaging.Message = {
      topic,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
      data: payload.data || {},
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#10B981',
          sound: 'default',
          priority: 'high' as const,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    
    return {
      success: true,
      messageId: response,
    };
  } catch (error) {
    console.error('FCM topic send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

/**
 * Subscribe user to topic
 */
export const subscribeToTopic = async (
  fcmTokens: string | string[],
  topic: string
): Promise<boolean> => {
  try {
    if (!isInitialized) {
      console.warn('Firebase not initialized');
      return false;
    }

    const tokens = Array.isArray(fcmTokens) ? fcmTokens : [fcmTokens];
    await admin.messaging().subscribeToTopic(tokens, topic);
    return true;
  } catch (error) {
    console.error('FCM subscribe error:', error);
    return false;
  }
};

/**
 * Unsubscribe user from topic
 */
export const unsubscribeFromTopic = async (
  fcmTokens: string | string[],
  topic: string
): Promise<boolean> => {
  try {
    if (!isInitialized) {
      console.warn('Firebase not initialized');
      return false;
    }

    const tokens = Array.isArray(fcmTokens) ? fcmTokens : [fcmTokens];
    await admin.messaging().unsubscribeFromTopic(tokens, topic);
    return true;
  } catch (error) {
    console.error('FCM unsubscribe error:', error);
    return false;
  }
};

/**
 * Predefined notification templates
 */
export const NotificationTemplates = {
  reportCreated: (reportId: string): NotificationPayload => ({
    title: 'New Waste Report',
    body: 'A new waste report has been submitted and needs attention.',
    data: {
      type: 'report_created',
      reportId,
    },
  }),

  reportAssigned: (collectorName: string): NotificationPayload => ({
    title: 'Report Assigned',
    body: `Your waste report has been assigned to ${collectorName} for collection.`,
    data: {
      type: 'report_assigned',
    },
  }),

  reportCollected: (): NotificationPayload => ({
    title: 'Waste Collected',
    body: 'Your reported waste has been successfully collected. Thank you!',
    data: {
      type: 'report_collected',
    },
  }),

  newAssignment: (reportCount: number): NotificationPayload => ({
    title: 'New Collection Assignment',
    body: `You have ${reportCount} new waste collection${reportCount > 1 ? 's' : ''} assigned to you.`,
    data: {
      type: 'new_assignment',
    },
  }),

  urgentReport: (location: string): NotificationPayload => ({
    title: 'Urgent Waste Report',
    body: `Critical waste situation reported at ${location}. Immediate attention required.`,
    data: {
      type: 'urgent_report',
    },
  }),
};

/**
 * Check if Firebase is properly initialized
 */
export const isFirebaseInitialized = (): boolean => {
  return isInitialized;
};

export default {
  sendNotificationToDevice,
  sendNotificationToDevices,
  sendNotificationToTopic,
  subscribeToTopic,
  unsubscribeFromTopic,
  NotificationTemplates,
  isFirebaseInitialized,
};
