'use server';

/**
 * @fileOverview Sends a push notification to a user.
 *
 * - sendPushNotification - Sends a push notification for a new message.
 * - SendPushNotificationInput - The input type for the sendPushnotification function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type {User} from '@/lib/types';
import { adminDb, adminMessaging } from '@/lib/firebase-admin';

const SendPushNotificationInputSchema = z.object({
  recipientId: z.string().describe('The ID of the user to send the notification to.'),
  senderName: z.string().describe('The name of the user sending the message.'),
  senderAvatar: z.string().optional().describe('The profile avatar URL of the user sending the message.'),
  messageContent: z.string().describe('The content of the message.'),
});
export type SendPushNotificationInput = z.infer<typeof SendPushNotificationInputSchema>;

export async function sendPushNotification(input: SendPushNotificationInput): Promise<void> {
  return sendPushNotificationFlow(input);
}

const sendPushNotificationFlow = ai.defineFlow(
  {
    name: 'sendPushNotificationFlow',
    inputSchema: SendPushNotificationInputSchema,
    outputSchema: z.void(),
  },
  async input => {
    if (!adminDb || !adminMessaging) {
      console.error("Firebase Admin DB or Messaging not initialized. Missing FIREBASE_SERVICE_ACCOUNT_BASE64 in env.");
      return;
    }
    const {recipientId, senderName, senderAvatar, messageContent} = input;

    try {
      const userRef = adminDb.collection('users').doc(recipientId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        console.log(`User ${recipientId} not found, cannot send notification.`);
        return;
      }

      const userData = userDoc.data() as User;
      const tokens = userData.fcmTokens;

      if (!tokens || tokens.length === 0) {
        console.log(`User ${recipientId} has no FCM tokens.`);
        return;
      }

      const avatarUrl = senderAvatar || '/logo.png';

      const response = await adminMessaging.sendEachForMulticast({
        tokens: tokens,
        notification: {
          title: senderName,
          body: messageContent,
        },
        data: {
          senderName: senderName,
          senderAvatar: avatarUrl,
          messageContent: messageContent,
        },
        webpush: {
          notification: {
            title: senderName,
            body: messageContent,
            icon: avatarUrl,
            badge: '/logo.png',
          },
          fcmOptions: {
            link: '/',
          },
        },
      });

      console.log(`Successfully sent push notifications: ${response.successCount} succeeded, ${response.failureCount} failed.`);
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }
);
