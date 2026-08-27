// This file is kept for reference or testing purposes.

import type { User, Chat } from './types';

const avatars: Record<string, string> = {
  'avatar-1': "https://picsum.photos/seed/1/100/100",
  'avatar-2': "https://picsum.photos/seed/2/100/100",
  'avatar-3': "https://picsum.photos/seed/3/100/100",
  'avatar-4': "https://picsum.photos/seed/4/100/100",
  'avatar-5': "https://picsum.photos/seed/5/100/100",
};

export const mockUsers: User[] = [
  { id: 'user-1', name: 'You', email: 'you@mailchat.com', avatar: avatars['avatar-1'], isOnline: true },
  { id: 'user-2', name: 'Alice', email: 'alice@mailchat.com', avatar: avatars['avatar-2'], isOnline: true },
  { id: 'user-3', name: 'Bob', email: 'bob@mailchat.com', avatar: avatars['avatar-3'], isOnline: false },
  { id: 'user-4', name: 'Charlie', email: 'charlie@mailchat.com', avatar: avatars['avatar-4'], isOnline: true },
  { id: 'user-5', name: 'Diana', email: 'diana@mailchat.com', avatar: avatars['avatar-5'], isOnline: false },
];

export const mockChats: Chat[] = [
  {
    id: 'chat-1',
    contact: mockUsers[1],
    userIds: ['user-1', 'user-2'],
    participants: { 'user-1': { clearedTimestamp: null }, 'user-2': { clearedTimestamp: null } },
    unreadCount: 2,
    messages: [
      { id: 'msg-1-1', type: 'text', content: 'Hey, how is it going?', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), senderId: 'user-2', status: 'sent' },
      { id: 'msg-1-2', type: 'text', content: 'Pretty good! Just working on the new project. You?', timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(), senderId: 'user-1', status: 'read' },
      { id: 'msg-1-3', type: 'text', content: 'Same here. It is quite challenging.', timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(), senderId: 'user-2', status: 'sent' },
      { id: 'msg-1-4', type: 'text', content: 'Did you see the latest designs?', timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(), senderId: 'user-2', status: 'sent' },
    ],
  },
  {
    id: 'chat-2',
    contact: mockUsers[2],
    userIds: ['user-1', 'user-3'],
    participants: { 'user-1': { clearedTimestamp: null }, 'user-3': { clearedTimestamp: null } },
    unreadCount: 0,
    messages: [
      { id: 'msg-2-1', type: 'text', content: 'Lunch tomorrow?', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), senderId: 'user-1', status: 'read' },
      { id: 'msg-2-2', type: 'text', content: 'Sounds good, where to?', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 23).toISOString(), senderId: 'user-2', status: 'sent' },
    ],
  },
  {
    id: 'chat-3',
    contact: mockUsers[3],
    userIds: ['user-1', 'user-4'],
    participants: { 'user-1': { clearedTimestamp: null }, 'user-4': { clearedTimestamp: null } },
    unreadCount: 0,
    messages: [
       { id: 'msg-3-1', type: 'text', content: 'See you at the meeting.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), senderId: 'user-3', status: 'sent' },
    ],
  },
   {
    id: 'chat-4',
    contact: mockUsers[4],
    userIds: ['user-1', 'user-5'],
    participants: { 'user-1': { clearedTimestamp: null }, 'user-5': { clearedTimestamp: null } },
    unreadCount: 1,
    messages: [
       { id: 'msg-4-1', type: 'text', content: 'Can you send me that file?', timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), senderId: 'user-5', status: 'sent' },
    ],
  },
];
