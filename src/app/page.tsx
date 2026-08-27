"use client";

import { useState, useEffect, useRef } from "react";
import { collection, query, where, getDocs, onSnapshot, doc, addDoc, serverTimestamp, orderBy, getDoc, updateDoc, writeBatch, arrayUnion, arrayRemove, deleteField, setDoc, FieldValue, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ContactList from "@/components/sidebar/contact-list";
import ChatWindow from "@/components/chat/chat-window";
import Welcome from "@/components/chat/welcome";
import { useAuth } from "@/hooks/use-auth";
import type { Chat, User, Message, GroupPermissions, Call, MessageType } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { sendPushNotification } from "@/ai/flows/send-push-notification";
import CallView from "@/components/chat/call-view";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import announcementConfig from "@/lib/config.json";
import { Tv, X, MessageSquare, CircleDot, Users, Settings, LogOut, PhoneCall } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Public STUN servers provided by Google.
const configuration = {
  iceServers: [
    {
      urls: [
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ],
    },
  ],
  iceCandidatePoolSize: 10,
};

const AnnouncementBanner = () => {
    const [visible, setVisible] = useState(announcementConfig.announcement.active);

    if (!visible || !announcementConfig.announcement.text) {
        return null;
    }

    return (
        <div className="bg-primary text-primary-foreground p-2 text-center text-sm flex items-center justify-center relative">
            <Tv className="h-4 w-4 mr-2" />
            <span>{announcementConfig.announcement.text}</span>
            <button onClick={() => setVisible(false)} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4" />
            </button>
        </div>
    )
}

export default function Home() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const chatsRef = useRef(chats);
  const notificationSoundRef = useRef<HTMLAudioElement>(null);
  const [selectedSound, setSelectedSound] = useState<string>('');
  const isInitialLoadRef = useRef(true);
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);


  // --- Call State ---
  const [callState, setCallState] = useState<Call | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const [remoteMediaStream, setRemoteMediaStream] = useState<MediaStream | null>(null);

  const selectedChatIdRef = useRef(selectedChatId);
  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  const playNotificationSound = () => {
    try {
      if (notificationSoundRef.current) {
        notificationSoundRef.current.currentTime = 0;
        notificationSoundRef.current.play().catch(err => console.log("Sound play error:", err));
      } else {
        const audio = new Audio(selectedSound || "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
        audio.play().catch(err => console.log("Audio play error:", err));
      }
    } catch (e) {
      console.log("Play notification sound error:", e);
    }
  };

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);
  
  useEffect(() => {
    const savedSound = localStorage.getItem('notificationSound');
    if (savedSound) {
      setSelectedSound(savedSound);
    }
    const handleStorageChange = () => {
      const updatedSound = localStorage.getItem('notificationSound');
      if (updatedSound) {
        setSelectedSound(updatedSound);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    // Listen for incoming calls
    const callQuery = query(collection(db, 'calls'), where('receiverId', '==', user.id), where('status', '==', 'ringing'));
    const unsubscribeCalls = onSnapshot(callQuery, (snapshot) => {
      if (!snapshot.empty) {
          const callDoc = snapshot.docs[0];
          const callData = callDoc.data() as Omit<Call, 'id'>;
          // Avoid joining a call that is already being handled or is old
          if (!callState && !pc.current) {
              setCallState({ id: callDoc.id, ...callData });
          }
      }
    });

    return () => unsubscribeCalls();

  }, [user, callState]);

  // Main call state machine
  useEffect(() => {
      if (!callState || !user) return;

      const callDocRef = doc(db, 'calls', callState.id);
      const unsubscribe = onSnapshot(callDocRef, (docSnapshot) => {
          const data = docSnapshot.data() as Call;
          if (!data) { // Call document deleted, so end the call
              endCall();
              return;
          }
          
          setCallState(prev => ({...prev, ...data})); // Update local call state

          // Caller logic: when receiver answers
          if (data.answer && pc.current?.signalingState !== 'stable') {
              pc.current?.setRemoteDescription(new RTCSessionDescription(data.answer));
          }

          // Shared logic: when call is ended by other party
          if (data.status === 'ended' && callState.status !== 'ended') {
              endCall(false); // don't update firestore again
          }
      });
      
      // Listen for remote ICE candidates (for both caller and receiver)
      const candidatesCollection = collection(db, 'calls', callState.id, callState.callerId === user.id ? 'receiverCandidates' : 'callerCandidates');
      const unsubCandidates = onSnapshot(candidatesCollection, snapshot => {
        snapshot.docChanges().forEach(async change => {
          if (change.type === 'added') {
            const data = change.doc.data();
            await pc.current?.addIceCandidate(new RTCIceCandidate(data));
          }
        });
      });

      return () => {
        unsubscribe();
        unsubCandidates();
      }

  }, [callState?.id, user]);

  const initiateCall = async (chatId: string, type: 'audio' | 'video' = 'audio') => {
    const chat = chats.find(c => c.id === chatId);
    if (!chat || !user || chat.isGroup || !chat.contact) return;

    const isVideo = type === 'video';
    try {
        localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
    } catch (error) {
        if (isVideo) {
          try {
            localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch (err) {
            console.error("Error accessing media devices:", err);
            toast({
                title: "Media Error",
                description: "Microphone/Camera not found or access denied.",
                variant: "destructive",
            });
            return;
          }
        } else {
          console.error("Error accessing microphone:", error);
          toast({
              title: "Microphone Error",
              description: "Microphone not found or access denied.",
              variant: "destructive",
          });
          return;
        }
    }

    pc.current = new RTCPeerConnection(configuration);
    registerPeerConnectionListeners();
    
    remoteStream.current = new MediaStream();
    
    localStream.current.getTracks().forEach(track => {
        pc.current!.addTrack(track, localStream.current!);
    });

    pc.current.ontrack = event => {
      console.log("WebRTC received remote track:", event.track.kind);
      if (event.streams && event.streams[0]) {
        remoteStream.current = event.streams[0];
        setRemoteMediaStream(event.streams[0]);
      } else {
        if (!remoteStream.current) {
          remoteStream.current = new MediaStream();
        }
        remoteStream.current.addTrack(event.track);
        setRemoteMediaStream(new MediaStream(remoteStream.current.getTracks()));
      }
    };

    const callDocRef = doc(collection(db, 'calls'));
    const offer = await pc.current.createOffer();
    await pc.current.setLocalDescription(offer);

    const callData: Omit<Call, 'id'> = {
        callType: type,
        callerId: user.id,
        callerName: user.name,
        callerAvatar: user.avatar,
        receiverId: chat.contact.id,
        receiverName: chat.contact.name,
        receiverAvatar: chat.contact.avatar,
        status: 'ringing',
        offer: {
            sdp: offer.sdp,
            type: offer.type,
        }
    };
    await setDoc(callDocRef, callData);
    setCallState({ id: callDocRef.id, ...callData });

    // Listen for local ICE candidates
    const candidatesCollection = collection(db, 'calls', callDocRef.id, 'callerCandidates');
    pc.current.onicecandidate = event => {
        event.candidate && addDoc(candidatesCollection, event.candidate.toJSON());
    };
  };

  const answerCall = async () => {
    if (!callState || !user || !callState.offer) return;
    
    pc.current = new RTCPeerConnection(configuration);
    registerPeerConnectionListeners();
    
    const isVideo = callState.callType === 'video';
    try {
        try {
          localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
        } catch (err) {
          if (isVideo) {
            localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
          } else {
            throw err;
          }
        }
        
        remoteStream.current = new MediaStream();

        if (localStream.current) {
          localStream.current.getTracks().forEach(track => {
            pc.current!.addTrack(track, localStream.current!);
          });
        }

        pc.current.ontrack = event => {
          console.log("WebRTC received remote track:", event.track.kind);
          if (event.streams && event.streams[0]) {
            remoteStream.current = event.streams[0];
            setRemoteMediaStream(event.streams[0]);
          } else {
            if (!remoteStream.current) {
              remoteStream.current = new MediaStream();
            }
            remoteStream.current.addTrack(event.track);
            setRemoteMediaStream(new MediaStream(remoteStream.current.getTracks()));
          }
        };
        
        // Listen for local ICE candidates
        const candidatesCollection = collection(db, 'calls', callState.id, 'receiverCandidates');
        pc.current.onicecandidate = event => {
            event.candidate && addDoc(candidatesCollection, event.candidate.toJSON());
        };

        const callDocRef = doc(db, 'calls', callState.id);
        await pc.current.setRemoteDescription(new RTCSessionDescription(callState.offer));
        const answer = await pc.current.createAnswer();
        await pc.current.setLocalDescription(answer);

        await updateDoc(callDocRef, {
            status: 'active',
            answer: {
                sdp: answer.sdp,
                type: answer.type
            }
        });

    } catch (error) {
        console.error("Error answering call:", error);
        toast({
            title: "Call Error",
            description: "Could not connect call. Check microphone/camera permissions.",
            variant: "destructive",
        });
        endCall();
    }
  };

  const rejectCall = async () => {
      if (!callState) return;
      const callDocRef = doc(db, 'calls', callState.id);
      try {
        // Try to update status, but clean up locally regardless
        await updateDoc(callDocRef, { status: 'declined' });
      } finally {
        endCall(false); 
      }
  }

  const endCall = async (updateFirestore = true) => {
    if (pc.current) {
        pc.current.getSenders().forEach(sender => sender.track?.stop());
        pc.current.close();
        pc.current = null;
    }
    localStream.current?.getTracks().forEach(track => track.stop());
    remoteStream.current?.getTracks().forEach(track => track.stop());
    localStream.current = null;
    remoteStream.current = null;
    setRemoteMediaStream(null);
    
    const currentCallId = callState?.id;
    setCallState(null);
    
    if (currentCallId && updateFirestore) {
      const callDocRef = doc(db, 'calls', currentCallId);
      const callDoc = await getDoc(callDocRef);
      // Only update if it's not already 'ended' to avoid race conditions
      if (callDoc.exists() && callDoc.data().status !== 'ended') {
          await updateDoc(callDocRef, { status: 'ended' });
      }
    }
  };
  
  function registerPeerConnectionListeners() {
    if (!pc.current) return;
    pc.current.oniceconnectionstatechange = () => {
      console.log(`ICE Connection State: ${pc.current?.iceConnectionState}`);
      if (pc.current?.iceConnectionState === 'failed' || pc.current?.iceConnectionState === 'disconnected' || pc.current?.iceConnectionState === 'closed') {
          endCall();
      }
    };
    pc.current.onsignalingstatechange = () => {
       console.log(`Signaling State: ${pc.current?.signalingState}`);
    };
  }


  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const q = query(collection(db, "chats"), where("userIds", "array-contains", user.id));
    
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const userChats: Chat[] = [];
      const contactPromises: Promise<void>[] = [];

      for (const chatDoc of querySnapshot.docs) {
          const chatData = chatDoc.data();

          const chatWithDefaults: Partial<Chat> = {
            isFavorite: false,
            participants: {},
            isMuted: false,
            isArchived: false,
            unreadCount: 0,
            ...chatData,
          };
          
          if (!chatWithDefaults.participants || Object.keys(chatWithDefaults.participants).length === 0) {
              const participants: { [key: string]: { clearedTimestamp: null } } = {};
              (chatData.userIds || []).forEach((id: string) => {
                  participants[id] = { clearedTimestamp: null };
              });
              chatWithDefaults.participants = participants;
          }

          if (chatWithDefaults.isGroup) {
              const chatPromise = (async () => {
                  userChats.push({
                      id: chatDoc.id,
                      messages: [],
                      ...chatWithDefaults
                  } as Chat);
              })();
              contactPromises.push(chatPromise);
          } else {
              const contactId = (chatWithDefaults.userIds || []).find((id: string) => id !== user.id);
              if (contactId) {
                  const contactPromise = (async () => {
                      const contactDocRef = doc(db, "users", contactId);
                      const contactDoc = await getDoc(contactDocRef);
                      if (!contactDoc.exists()) return;
                      const contact = contactDoc.data() as User;
                      
                      userChats.push({
                          id: chatDoc.id,
                          contact: { ...contact, id: contactId },
                          messages: [],
                          ...chatWithDefaults
                      } as Chat);
                  })();
                  contactPromises.push(contactPromise);
              }
          }
      }

      await Promise.all(contactPromises);

      // Fetch last messages for sorting
      const lastMessagePromises = userChats.map(chat => {
        const currentUserParticipant = chat.participants?.[user.id];
        let messageQuery = query(collection(db, "chats", chat.id, "messages"), orderBy("timestamp", "desc"));
        
        if (currentUserParticipant?.clearedTimestamp) {
            messageQuery = query(messageQuery, where("timestamp", ">", currentUserParticipant.clearedTimestamp));
        }

        return getDocs(messageQuery);
      });

      const lastMessageSnapshots = await Promise.all(lastMessagePromises);
      
      const chatsWithLastMessage = userChats.map((chat, index) => {
        const lastMessageDoc = lastMessageSnapshots[index].docs[0];
        if (lastMessageDoc) {
          return { ...chat, lastMessage: { text: lastMessageDoc.data().content, timestamp: lastMessageDoc.data().timestamp }, lastMessageTimestamp: lastMessageDoc.data().timestamp.toDate() };
        }
        // If no message is found (e.g., after clearing), remove the lastMessage preview
        const { lastMessage, ...chatWithoutLastMessage } = chat;
        return { ...chatWithoutLastMessage, lastMessage: null, lastMessageTimestamp: chat.timestamp?.toDate() || new Date(0) };
      });
      
      chatsWithLastMessage.sort((a, b) => (b.lastMessageTimestamp?.getTime() || 0) - (a.lastMessageTimestamp?.getTime() || 0));


      // --- New Message Notification Logic ---
      const oldChats = chatsRef.current;
      if (!isInitialLoadRef.current && oldChats.length > 0 && document.hasFocus()) {
          const hasNewMessages = chatsWithLastMessage.some(newChat => {
              const oldChat = oldChats.find(c => c.id === newChat.id);
              if (!oldChat) return true; // A new chat was added
      
              const oldTimestamp = oldChat.lastMessage?.timestamp?.toMillis() ?? 0;
              const newTimestamp = newChat.lastMessage?.timestamp?.toMillis() ?? 0;

              // Check if there's a new message and it's not from the current user
              if (newTimestamp > oldTimestamp) {
                  // To be more robust, we should check the sender of the last message
                  // This requires fetching the last message itself, not just from the chat doc
                  return true; // Simplified for now
              }
              return false;
          });

          if (hasNewMessages) {
              notificationSoundRef.current?.play().catch(e => console.error("Error playing sound", e));
          }
      }


      setChats(chatsWithLastMessage);
      setLoading(false);
      isInitialLoadRef.current = false;
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!chats.length || !user) return;
  
    const unsubscribers = chats.map(chat => {
        const chatDocRef = doc(db, "chats", chat.id);
        const chatUnsub = onSnapshot(chatDocRef, (chatDoc) => {
          if (chatDoc.exists()) {
            const chatData = chatDoc.data();
            setChats(prevChats =>
              prevChats.map(prevChat =>
                prevChat.id === chat.id ? { ...prevChat, ...chatData } : prevChat
              )
            );
          }
        });
        
        let contactUnsub = () => {};
        if (!chat.isGroup && chat.contact) {
            const contactDocRef = doc(db, "users", chat.contact.id);
            contactUnsub = onSnapshot(contactDocRef, (contactDoc) => {
              if (contactDoc.exists()) {
                const contactData = contactDoc.data() as User;
                setChats(prevChats =>
                  prevChats.map(prevChat =>
                    prevChat.contact?.id === chat.contact?.id
                      ? { ...prevChat, contact: { ...prevChat.contact!, isOnline: contactData.isOnline, lastSeen: contactData.lastSeen } }
                      : prevChat
                  )
                );
              }
            });
        }
      return () => {
        chatUnsub();
        contactUnsub();
      };
    });
  
    return () => unsubscribers.forEach(unsub => unsub());
  
  }, [chats.map(c => c.id).join(','), user]);

  // Realtime listener for incoming messages across all user chats
  useEffect(() => {
    if (!user || !chats.length) return;

    const chatIds = chats.map(c => c.id);
    const unsubscribers = chatIds.map(chatId => {
      const messagesCol = collection(db, "chats", chatId, "messages");
      const q = query(messagesCol, orderBy("timestamp", "desc"));

      let isFirstSnapshot = true;
      return onSnapshot(q, (snapshot) => {
        if (isFirstSnapshot) {
          isFirstSnapshot = false;
          return;
        }

        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const msgData = change.doc.data();
            if (msgData.senderId && msgData.senderId !== user.id) {
              playNotificationSound();
              const targetChat = chatsRef.current.find(c => c.id === chatId);
              if (chatId !== selectedChatIdRef.current) {
                const senderName = targetChat?.isGroup ? targetChat.groupName : (targetChat?.contact?.name || 'Contact');
                toast({
                  title: `Message from ${senderName}`,
                  description: msgData.content || (msgData.type === 'image' ? '📷 Photo' : '🎵 Media'),
                });
              }
            }
          }
        });
      });
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [chats.map(c => c.id).sort().join(','), user?.id]);

  const handleSendMessage = async (chatId: string, content: string, replyTo?: Message['replyTo']) => {
    if (!user) return;
    const messagesCol = collection(db, "chats", chatId, "messages");
    const newMessage: Record<string, any> = {
      type: 'text',
      content,
      senderId: user.id,
      timestamp: serverTimestamp(),
      status: 'sent',
    };
    if (replyTo) {
      newMessage.replyTo = replyTo;
    }
    await addDoc(messagesCol, newMessage);

    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, {
      lastMessage: { text: content, timestamp: serverTimestamp() },
      unreadCount: increment(1),
      [`typingUsers.${user.id}`]: false,
    });

    const currentChat = chats.find(c => c.id === chatId);
    if (currentChat) {
      const recipientIds = currentChat.userIds.filter(id => id !== user.id);
      if (recipientIds.length > 0) {
        recipientIds.forEach(recipientId => {
          sendPushNotification({
            recipientId: recipientId,
            senderName: user.name,
            senderAvatar: user.avatar,
            messageContent: content,
          }).catch(error => console.error("Failed to send notification:", error));
        });
      }
    }
  };

  const handleSendGif = async (chatId: string, gifUrl: string) => {
    if (!user) return;
    const messagesCol = collection(db, "chats", chatId, "messages");
    const newMessage = {
      type: 'gif',
      content: gifUrl,
      senderId: user.id,
      timestamp: serverTimestamp(),
      status: 'sent',
    };
    await addDoc(messagesCol, newMessage);

    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, {
      lastMessage: { text: '📷 GIF', timestamp: serverTimestamp() },
      unreadCount: increment(1)
    });
  };

  const handleSendFileMessage = async (chatId: string, file: File, type: MessageType, caption?: string) => {
    if (!user) return;

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      console.error("Cloudinary environment variables are not set.");
      toast({
        title: "Configuration Error",
        description: "File upload is not configured. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Cloudinary upload failed');
      }

      const data = await response.json();
      const downloadURL = data.secure_url;
      
      const messageData: any = {
        type,
        content: downloadURL,
        senderId: user.id,
        timestamp: serverTimestamp(),
        status: 'sent',
      };
      
      if (caption) {
        messageData.caption = caption;
      }
      
      let messageContent = '';
      if (type === 'audio') {
        messageContent = '🎤 Voice message';
      } else if (type === 'image') {
        messageContent = caption || '🖼️ Image';
      } else if (type === 'document') {
        messageContent = `📄 ${file.name}`;
        messageData.fileName = file.name;
        messageData.fileSize = file.size;
      }
      
      const messagesCol = collection(db, "chats", chatId, "messages");
      await addDoc(messagesCol, messageData);

      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: { text: messageContent, timestamp: serverTimestamp() },
        unreadCount: increment(1)
      });


      const currentChat = chats.find(c => c.id === chatId);
      if (currentChat) {
          const recipientIds = currentChat.userIds.filter(id => id !== user.id);
          if (recipientIds.length > 0) {
              recipientIds.forEach(recipientId => {
                sendPushNotification({
                    recipientId: recipientId,
                    senderName: user.name,
                    senderAvatar: user.avatar,
                    messageContent: messageContent,
                }).catch(error => console.error("Failed to send reaction notification:", error));
            });
          }
      }
    } catch (error) {
      console.error("Error uploading file to Cloudinary:", error);
      toast({
        title: "Upload Failed",
        description: `Could not send your ${type}. Please try again.`,
        variant: "destructive",
      });
    }
  };
  
  const handleAddContact = async (contact: { name: string; email: string }) => {
    if (!user) return;
    
    if (contact.email === user.email) {
      toast({
        title: "🤔 Cannot Add Yourself",
        description: "You can't start a chat with yourself.",
        variant: "destructive",
      });
      return;
    }

    const usersQuery = query(collection(db, "users"), where("email", "==", contact.email));
    const querySnapshot = await getDocs(usersQuery);

    let contactUser: User;
    if (querySnapshot.empty) {
      toast({
        title: "🤷‍♀️ User Not Found",
        description: "No user with this email exists. Please check the email and try again.",
        variant: "destructive",
      });
      return;
    } else {
      contactUser = querySnapshot.docs[0].data() as User;
      contactUser.id = querySnapshot.docs[0].id;
    }

    const chatExistsQuery = query(
      collection(db, "chats"),
      where("userIds", "array-contains", user.id),
      where("isGroup", "==", false)
    );
    const chatExistsSnapshot = await getDocs(chatExistsQuery);
    
    const existingChat = chatExistsSnapshot.docs.find(doc => doc.data().userIds.includes(contactUser.id));

    if (existingChat) {
      setSelectedChatId(existingChat.id);
      return;
    }
    
    const userIds = [user.id, contactUser.id];
    const participants: { [key: string]: { clearedTimestamp: null } } = {};
    userIds.forEach(id => {
        participants[id] = { clearedTimestamp: null };
    });

    const newChatRef = await addDoc(collection(db, "chats"), {
      userIds: userIds.sort(),
      participants: participants,
      isGroup: false,
      isFavorite: false,
      lastMessage: null,
      unreadCount: 0,
      timestamp: serverTimestamp(),
    });

    setSelectedChatId(newChatRef.id);
  };
  
  const handleCreateGroup = async (group: { name: string; description: string; members: string[]; permissions: GroupPermissions }) => {
      if (!user) return;

      try {
          const allMemberIds = [...new Set([user.id, ...group.members])];
          const participants: { [key: string]: { clearedTimestamp: null } } = {};
          allMemberIds.forEach(id => {
              participants[id] = { clearedTimestamp: null };
          });

          const newChatRef = await addDoc(collection(db, "chats"), {
              isGroup: true,
              groupName: group.name,
              groupDescription: group.description,
              groupAvatar: `https://picsum.photos/seed/${group.name || Date.now()}/100/100`,
              userIds: allMemberIds,
              participants: participants,
              groupAdmins: [user.id],
              groupEditors: [],
              lastMessage: null,
              isFavorite: false,
              isMuted: false,
              isArchived: false,
              permissions: group.permissions,
              unreadCount: 0,
              timestamp: serverTimestamp(),
          });
          
          toast({
              title: "Group Created!",
              description: `The group "${group.name}" has been successfully created.`,
          });
          setSelectedChatId(newChatRef.id);

      } catch (error) {
          console.error("Error creating group:", error);
          toast({
              title: "Group Creation Failed",
              description: "Could not create the group. Please try again.",
              variant: "destructive",
          });
      }
  };

  const handleToggleFavorite = async (chatId: string, currentState: boolean) => {
    const chatRef = doc(db, "chats", chatId);
    try {
      await updateDoc(chatRef, { isFavorite: !currentState });
      toast({
        title: !currentState ? "Chat Pinned" : "Chat Unpinned",
      });
    } catch (error) {
      console.error("Error updating favorite status:", error);
      toast({
        title: "Update Failed",
        description: "Could not update pin status. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleToggleMute = async (chatId: string, currentState: boolean) => {
    const chatRef = doc(db, "chats", chatId);
    try {
      await updateDoc(chatRef, { isMuted: !currentState });
      toast({
        title: !currentState ? "Chat Muted" : "Chat Unmuted",
      });
    } catch (error) {
      console.error("Error updating mute status:", error);
      toast({
        title: "Update Failed",
        description: "Could not update mute status.",
        variant: "destructive",
      });
    }
  };

  const handleToggleArchive = async (chatId: string, currentState: boolean) => {
    const chatRef = doc(db, "chats", chatId);
    try {
      await updateDoc(chatRef, { isArchived: !currentState });
      toast({
        title: !currentState ? "Chat Archived" : "Chat Unarchived",
      });
       if (!currentState) {
        setSelectedChatId(null);
      }
    } catch (error) {
      console.error("Error updating archive status:", error);
      toast({
        title: "Update Failed",
        description: "Could not update archive status.",
        variant: "destructive",
      });
    }
  };

  const handleMarkAsUnread = async (chatId: string) => {
    const chatRef = doc(db, "chats", chatId);
    try {
      await updateDoc(chatRef, { unreadCount: 1 });
      toast({ title: "Marked as Unread" });
    } catch (error) {
      console.error("Error marking as unread:", error);
      toast({ title: "Update Failed", variant: "destructive" });
    }
  };

  const handleUpdateGroupRoles = async (chatId: string, memberId: string, newRole: 'admin' | 'editor' | 'member') => {
      const chatRef = doc(db, "chats", chatId);
      try {
          if (newRole === 'admin') {
              await updateDoc(chatRef, { groupAdmins: arrayUnion(memberId), groupEditors: arrayRemove(memberId) });
              toast({ title: "Role Updated", description: "Member is now an admin." });
          } else if (newRole === 'editor') {
              await updateDoc(chatRef, { groupAdmins: arrayRemove(memberId), groupEditors: arrayUnion(memberId) });
              toast({ title: "Role Updated", description: "Member is now an editor." });
          } else { // member
              await updateDoc(chatRef, { groupAdmins: arrayRemove(memberId), groupEditors: arrayRemove(memberId) });
              toast({ title: "Role Updated", description: "Member is now a standard member." });
          }
      } catch (error) {
          console.error("Error updating group roles:", error);
          toast({ title: "Update Failed", description: "Could not update member role.", variant: "destructive" });
      }
  };

  const handleRemoveMember = async (chatId: string, memberId: string) => {
      const chatRef = doc(db, "chats", chatId);
      try {
          await updateDoc(chatRef, { 
              userIds: arrayRemove(memberId),
              groupAdmins: arrayRemove(memberId),
              groupEditors: arrayRemove(memberId),
              [`participants.${memberId}`]: deleteField(),
          });
          toast({ title: "Member Removed", description: "The member has been removed from the group." });
      } catch (error) {
          console.error("Error removing member:", error);
          toast({ title: "Removal Failed", description: "Could not remove the member.", variant: "destructive" });
      }
  };

  const handleClearChat = async (chatId: string) => {
    if (!user) return;
    const chatRef = doc(db, "chats", chatId);
    try {
        await updateDoc(chatRef, {
            [`participants.${user.id}.clearedTimestamp`]: serverTimestamp(),
            lastMessage: null,
            unreadCount: 0,
        });
        toast({ title: "Chat Cleared", description: "Your message history for this chat has been cleared." });
    } catch (error) {
        console.error("Error clearing chat:", error);
        toast({ title: "Error", description: "Could not clear chat.", variant: "destructive" });
    }
  };

  const handleExitGroup = async (chatId: string) => {
    if (!user) return;
    const chatRef = doc(db, "chats", chatId);
    try {
      await updateDoc(chatRef, {
        userIds: arrayRemove(user.id),
        groupAdmins: arrayRemove(user.id),
        groupEditors: arrayRemove(user.id),
        [`participants.${user.id}`]: deleteField(),
      });
      toast({ title: "Left Group", description: "You have successfully left the group." });
      setSelectedChatId(null);
    } catch (error) {
      console.error("Error leaving group:", error);
      toast({ title: "Error", description: "Could not leave the group.", variant: "destructive" });
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    // This is a more complex operation. It should only remove the chat for the current user,
    // not for the other participant. For now, we will just clear it.
    // A proper implementation might involve a 'deletedFor' array field on the chat doc.
    await handleClearChat(chatId);
    setSelectedChatId(null);
    toast({ title: "Chat Deleted", description: "The chat has been removed from your list." });
  };

  const handleToggleStarMessages = async (chatId: string, messageIds: string[], star: boolean) => {
    const batch = writeBatch(db);
    messageIds.forEach(messageId => {
      const messageRef = doc(db, "chats", chatId, "messages", messageId);
      batch.update(messageRef, { isStarred: star });
    });
    try {
      await batch.commit();
      toast({ title: star ? "Messages Starred" : "Messages Unstarred" });
    } catch (error) {
      console.error("Error starring messages:", error);
      toast({ title: "Error", description: "Could not update messages.", variant: "destructive" });
    }
  };
  
  const handleDeleteMessages = async (chatId: string, messageIds: string[]) => {
    const batch = writeBatch(db);
    messageIds.forEach(messageId => {
      const messageRef = doc(db, "chats", chatId, "messages", messageId);
      batch.delete(messageRef);
    });
    try {
      await batch.commit();
      toast({ title: "Messages Deleted" });
    } catch (error) {
      console.error("Error deleting messages:", error);
      toast({ title: "Error", description: "Could not delete messages.", variant: "destructive" });
    }
  };
  
  const handleForwardMessages = async (targetChatIds: string[], messages: Message[]) => {
      if (!user) return;
      
      const forwardPromises = targetChatIds.flatMap(chatId =>
          messages.map(message => {
              const messagesCol = collection(db, "chats", chatId, "messages");
              
              let newContentText = '';
              if (message.type === 'text') {
                newContentText = message.content;
              } else if (message.type === 'audio') {
                newContentText = '🎤 Voice message';
              } else if (message.type === 'image' || message.type === 'gif') {
                newContentText = message.caption || '🖼️ Media';
              } else if (message.type === 'document') {
                newContentText = `📄 ${message.fileName || 'Document'}`;
              }

              // Create a new object for the new message, excluding the original ID
              const { id, ...messageData } = message;

              return addDoc(messagesCol, {
                  ...messageData,
                  senderId: user.id,
                  timestamp: serverTimestamp(),
                  status: 'sent',
                  isForwarded: true,
              }).then(() => {
                  const chatRef = doc(db, "chats", chatId);
                  return updateDoc(chatRef, {
                      lastMessage: { text: newContentText, timestamp: serverTimestamp() },
                      unreadCount: increment(1)
                  });
              });
          })
      );

      try {
          await Promise.all(forwardPromises);
          toast({ title: `Messages forwarded to ${targetChatIds.length} chat(s).` });
      } catch (error) {
          console.error("Error forwarding messages:", error);
          toast({ title: "Forwarding Failed", description: "Could not forward messages.", variant: "destructive" });
      }
  };

  const handleMessageReaction = async (chatId: string, messageId: string, emoji: string) => {
    if (!user) return;

    const messageRef = doc(db, 'chats', chatId, 'messages', messageId);

    try {
        const messageDoc = await getDoc(messageRef);
        if (!messageDoc.exists()) return;

        const messageData = messageDoc.data() as Message;
        const reactions = messageData.reactions || {};
        const newReactions = { ...reactions };
        
        let isAddingReaction = false;
        
        // Find if user has reacted with any emoji
        let userPreviousReactionEmoji: string | undefined;
        Object.keys(newReactions).forEach(existingEmoji => {
            const userList = newReactions[existingEmoji] || [];
            if (userList.includes(user.id)) {
                userPreviousReactionEmoji = existingEmoji;
            }
        });

        // Case 1: User is clicking the same emoji to un-react
        if (userPreviousReactionEmoji === emoji) {
             newReactions[emoji] = newReactions[emoji].filter(id => id !== user.id);
             if (newReactions[emoji].length === 0) {
                delete newReactions[emoji];
            }
        } 
        // Case 2: User is changing reaction or adding a new one
        else {
            // First, remove user from any other reaction they might have made.
            if (userPreviousReactionEmoji) {
                newReactions[userPreviousReactionEmoji] = newReactions[userPreviousReactionEmoji].filter(id => id !== user.id);
                 if (newReactions[userPreviousReactionEmoji].length === 0) {
                    delete newReactions[userPreviousReactionEmoji];
                }
            }

            // Now, add the new reaction.
            newReactions[emoji] = [...(newReactions[emoji] || []), user.id];
            isAddingReaction = true;
        }


        await updateDoc(messageRef, {
            reactions: newReactions,
        });

        // Send notification only when adding a new reaction to someone else's message
        if (isAddingReaction && messageData.senderId !== user.id) {
            const settings = localStorage.getItem('setting_showReactionNotifications');
            if (settings === 'true') {
                sendPushNotification({
                    recipientId: messageData.senderId,
                    senderName: user.name,
                    senderAvatar: user.avatar,
                    messageContent: `${user.name} reacted with ${emoji} to your message`,
                }).catch(error => console.error('Failed to send reaction notification:', error));
            }
        }
    } catch (error) {
        console.error('Error updating reaction:', error);
        toast({ title: 'Error', description: 'Could not update reaction.', variant: 'destructive' });
    }
  };

  const handleMarkAsRead = async (chatId: string) => {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      unreadCount: 0
    });
  };

  const handleTypingStatusChange = async (chatId: string, isTyping: boolean) => {
    if (!user) return;
    const chatRef = doc(db, "chats", chatId);
    try {
      await updateDoc(chatRef, {
        [`typingUsers.${user.id}`]: isTyping
      });
    } catch (e) {
      console.log("Error updating typing status:", e);
    }
  };

  const selectedChat = chats.find((chat) => chat.id === selectedChatId);

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    handleMarkAsRead(chatId);
  };

  if (callState) {
    return <CallView 
        call={callState}
        onAnswer={answerCall}
        onHangup={endCall}
        onReject={rejectCall}
        localStream={localStream.current}
        remoteStream={remoteMediaStream || remoteStream.current}
    />
  }

  const { logout } = useAuth();
  const totalUnread = chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <div className="h-screen w-full flex flex-col text-foreground overflow-hidden select-none bg-background">
        <AnnouncementBanner />
        <div className="flex flex-1 overflow-hidden">
            {/* WhatsApp Left Navigation Rail */}
            <div className="hidden md:flex flex-col items-center justify-between w-16 bg-card border-r border-border/80 py-3 shrink-0 z-20 shadow-sm">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative group cursor-pointer" onClick={() => router.push('/profile')}>
                        <Avatar className="h-9 w-9 border border-primary/30 ring-2 ring-primary/10">
                            <AvatarImage src={user?.avatar} alt={user?.name} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                {user?.name?.charAt(0) || 'U'}
                            </AvatarFallback>
                        </Avatar>
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-card" />
                    </div>

                    <div className="w-8 h-[1px] bg-border/60 my-1" />

                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-xl h-10 w-10 text-primary bg-primary/15 hover:bg-primary/20 relative"
                        title="Chats"
                    >
                        <MessageSquare className="h-5 w-5 fill-primary/20 text-primary" />
                        {totalUnread > 0 && (
                            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-500" />
                        )}
                    </Button>

                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-xl h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-secondary"
                        title="Status Updates"
                    >
                        <CircleDot className="h-5 w-5" />
                    </Button>

                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-xl h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-secondary"
                        title="Communities"
                    >
                        <Users className="h-5 w-5" />
                    </Button>
                </div>

                <div className="flex flex-col items-center gap-3">
                    <Link href="/settings">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-xl h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-secondary"
                            title="Settings"
                        >
                            <Settings className="h-5 w-5" />
                        </Button>
                    </Link>

                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={logout}
                        className="rounded-xl h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Log out"
                    >
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Contacts Sidebar List */}
            <div className={cn(
                "w-full md:w-[380px] border-r border-border/80 flex-col bg-card flex shrink-0 transition-all",
                selectedChatId ? "hidden md:flex" : "flex"
            )}>
                <ContactList
                  chats={chats}
                  selectedChatId={selectedChatId}
                  onSelectChat={handleSelectChat}
                  onAddContact={handleAddContact}
                  onCreateGroup={handleCreateGroup}
                  onToggleArchive={handleToggleArchive}
                  onToggleMute={handleToggleMute}
                  onToggleFavorite={handleToggleFavorite}
                  onMarkAsUnread={handleMarkAsUnread}
                  onDeleteChat={handleDeleteChat}
                  onExitGroup={handleExitGroup}
                  loading={loading}
                  searchInputRef={searchInputRef}
                />
            </div>

            {/* Active Chat Window or Welcome Screen */}
            <div className={cn(
                "flex-1 flex flex-col bg-background min-w-0 transition-all",
                !selectedChatId ? "hidden md:flex" : "flex"
            )}>
                {selectedChat ? (
                <ChatWindow 
                    key={selectedChat.id} 
                    chat={selectedChat} 
                    allChats={chats}
                    onSendMessage={handleSendMessage} 
                    onSendFile={handleSendFileMessage}
                    onSendGif={handleSendGif}
                    onToggleFavorite={handleToggleFavorite}
                    onUpdateGroupRoles={handleUpdateGroupRoles}
                    onRemoveMember={handleRemoveMember}
                    onClearChat={handleClearChat}
                    onExitGroup={handleExitGroup}
                    onDeleteChat={handleDeleteChat}
                    onToggleStarMessages={handleToggleStarMessages}
                    onDeleteMessages={handleDeleteMessages}
                    onForwardMessages={handleForwardMessages}
                    onInitiateCall={initiateCall}
                    onMessageReaction={handleMessageReaction}
                    onMarkAsRead={handleMarkAsRead}
                    onTypingStatusChange={(isTyping) => handleTypingStatusChange(selectedChat.id, isTyping)}
                    onBack={() => setSelectedChatId(null)}
                />
                ) : (
                <Welcome />
                )}
            </div>
        </div>
        <audio 
          ref={notificationSoundRef} 
          src={selectedSound || "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"} 
          preload="auto" 
        />
    </div>
  );
}
