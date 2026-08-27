
import { Timestamp } from "firebase/firestore";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  isOnline: boolean;
  lastSeen?: string; // ISO string
  fcmTokens?: string[];
}

export type MessageStatus = 'sent' | 'delivered' | 'read';
export type MessageType = 'text' | 'audio' | 'image' | 'document' | 'gif';

export interface Message {
  id: string;
  type: MessageType;
  content: string; // URL for files, text for text messages
  caption?: string; // For image/video messages
  fileName?: string; // For document messages
  fileSize?: number; // For document messages
  timestamp: string; // Stored as ISO string on client
  senderId: string;
  status: MessageStatus;
  readTimestamp?: string; // ISO string
  isStarred?: boolean;
  isForwarded?: boolean;
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
    type: MessageType;
  };
  reactions?: { [emoji: string]: string[] }; // e.g. { '👍': ['user1', 'user2'] }
}

export interface GroupPermissions {
    membersCanEditSettings: boolean;
    membersCanSendMessages: boolean;
    membersCanAddOthers: boolean;
    adminsCanApproveNewMembers: boolean;
}

export interface Participant {
    clearedTimestamp: Timestamp | null;
}

export interface Chat {
  id: string;
  // For 1-on-1 chats
  contact?: User; 
  // For group chats
  isGroup?: boolean;
  groupName?: string;
  groupDescription?: string;
  groupAvatar?: string;
  groupAdmins?: string[];
  groupEditors?: string[];
  permissions?: GroupPermissions;
  // Common fields
  messages: Message[];
  unreadCount: number;
  userIds: string[]; // Keep for querying chats
  participants: { [userId: string]: Participant };
  typingUsers?: { [userId: string]: boolean };
  lastMessage?: {
    text: string;
    timestamp: Timestamp;
  } | null;
  timestamp?: Timestamp;
  isFavorite?: boolean; // Used for Pinning
  isMuted?: boolean;
  isArchived?: boolean;
}

export type CallStatus = 'ringing' | 'active' | 'declined' | 'ended' | 'missed';
export type CallType = 'audio' | 'video';

export interface Call {
    id: string;
    callType?: CallType;
    callerId: string;
    callerName: string;
    callerAvatar: string;
    receiverId: string;
    receiverName: string;
    receiverAvatar: string;
    status: CallStatus;
    offer?: RTCSessionDescriptionInit;
    answer?: RTCSessionDescriptionInit;
}
