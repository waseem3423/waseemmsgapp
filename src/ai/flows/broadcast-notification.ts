'use server';

/**
 * @fileOverview Broadcasts a push notification to all users.
 *
 * - broadcastNotification - Sends a push notification to all users.
 * - BroadcastNotificationInput - The input type for the broadcastNotification function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type {User} from '@/lib/types';
import { adminDb, adminMessaging } from '@/lib/firebase-admin';

const BroadcastNotificationInputSchema = z.object({
  title: z.string().describe('The title of the notification.'),
  message: z.string().describe('The content of the message.'),
});
export type BroadcastNotificationInput = z.infer<typeof BroadcastNotificationInputSchema>;

export async function broadcastNotification(input: BroadcastNotificationInput): Promise<void> {
  return broadcastNotificationFlow(input);
}

const broadcastNotificationFlow = ai.defineFlow(
  {
    name: 'broadcastNotificationFlow',
    inputSchema: BroadcastNotificationInputSchema,
    outputSchema: z.void(),
  },
  async input => {
    if (!adminDb || !adminMessaging) {
      console.error("Firebase Admin DB or Messaging not initialized. Missing FIREBASE_SERVICE_ACCOUNT_BASE64 in env.");
      return;
    }
    const { title, message } = input;

    try {
      const usersSnapshot = await adminDb.collection('users').get();
      if (usersSnapshot.empty) {
        console.log("No users found to send notifications to.");
        return;
      }

      const allTokens: string[] = [];
      usersSnapshot.forEach(doc => {
          const userData = doc.data() as User;
          if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
              allTokens.push(...userData.fcmTokens);
          }
      });
      
      const uniqueTokens = [...new Set(allTokens)];

      if (uniqueTokens.length === 0) {
        console.log(`No active FCM tokens found across all users.`);
        return;
      }

      const response = await adminMessaging.sendEachForMulticast({
        tokens: uniqueTokens,
        notification: {
          title: title,
          body: message,
        },
        webpush: {
          notification: {
            title: title,
            body: message,
            icon: '/logo.png',
          },
          fcmOptions: {
            link: '/',
          },
        },
      });

      console.log(`Successfully sent broadcast notifications: ${response.successCount} succeeded, ${response.failureCount} failed.`);
    } catch (error) {
      console.error('Error sending broadcast notification:', error);
    }
  }
);
