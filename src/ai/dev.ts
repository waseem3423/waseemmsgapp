import { config } from 'dotenv';
config();

// Client-safe flows
import '@/ai/flows/smart-reply-suggestions.ts';

// Server-only flows - require 'firebase-admin' which is not client-safe
// We wrap it in a condition to ensure it's only loaded on the server.
if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    require('@/ai/flows/send-push-notification.ts');
    require('@/ai/flows/broadcast-notification.ts');
    require('@/ai/flows/set-announcement-config.ts');
}
