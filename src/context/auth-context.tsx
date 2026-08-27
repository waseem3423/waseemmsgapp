
"use client";

import React, { createContext, useState, useEffect, ReactNode } from "react";
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { auth, db, messaging } from "@/lib/firebase";
import type { User } from '@/lib/types';
import { getToken, onMessage } from "firebase/messaging";
import { useToast } from "@/hooks/use-toast";
import SplashScreen from "@/components/splash-screen";


interface AuthContextType {
  user: User | null;
  login: (credentials: { email: string, password?: string }) => Promise<void>;
  signup: (credentials: { name:string, email: string, password?: string, avatar?: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string, avatar?: string }) => Promise<void>;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const updateUserStatus = async (userId: string, isOnline: boolean) => {
    const userRef = doc(db, "users", userId);
    try {
        await setDoc(userRef, {
            isOnline: isOnline,
            lastSeen: new Date().toISOString()
        }, { merge: true });
    } catch (error) {
        console.error("Error updating user status:", error);
    }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          await updateUserStatus(firebaseUser.uid, true);
          const userData = { ...userDoc.data(), id: firebaseUser.uid } as User;
          setUser(userData);

          // Listen for beforeunload to set user offline
          window.addEventListener('beforeunload', () => updateUserStatus(firebaseUser.uid, false));

        } else {
          // Handle case where user exists in Auth but not Firestore
          const newUser: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'New User',
            email: firebaseUser.email!,
            avatar: `https://picsum.photos/seed/${firebaseUser.uid}/100/100`,
            isOnline: true,
            lastSeen: new Date().toISOString()
          };
          await setDoc(userRef, newUser);
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;
    
    const isAuthPage = pathname === '/login' || pathname === '/signup';

    if (!user && !isAuthPage) {
      router.push('/login');
    } else if (user && isAuthPage) {
      router.push('/');
    }
  }, [user, loading, pathname, router]);


  useEffect(() => {
    const requestPermission = async () => {
      if (!user || !messaging) return;
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('Notification permission granted.');

          let swRegistration: ServiceWorkerRegistration | undefined;
          if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            const firebaseConfigParams = new URLSearchParams({
              apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
              authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
              projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
              storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
              messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
              appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
            }).toString();

            await navigator.serviceWorker.register(
              `/firebase-messaging-sw.js?${firebaseConfigParams}`
            );
            swRegistration = await navigator.serviceWorker.ready;
          }

          // Get token
          const currentToken = await getToken(messaging, { 
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!,
            serviceWorkerRegistration: swRegistration
          });
          if (currentToken) {
            console.log('FCM Token:', currentToken);
            // Save the token to the user's document in Firestore
            const userRef = doc(db, 'users', user.id);
            await setDoc(userRef, {
                fcmTokens: arrayUnion(currentToken)
            }, { merge: true });
          } else {
            console.log('No registration token available. Request permission to generate one.');
          }
        } else {
          console.log('Unable to get permission to notify.');
        }
      } catch (error) {
        console.error('An error occurred while retrieving token. ', error);
        toast({
            title: "Could not get notification token",
            description: "Please check your browser settings and try again.",
            variant: "destructive"
        })
      }
    };
    
    requestPermission();
  }, [user, toast]);

  useEffect(() => {
    if (!messaging) return;
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('[Foreground Notification Received]:', payload);
      const title = payload.notification?.title || payload.data?.senderName || 'New Message';
      const body = payload.notification?.body || payload.data?.messageContent || '';
      const icon = payload.notification?.icon || payload.data?.senderAvatar || '/logo.png';

      if (payload.notification || payload.data) {
        toast({
          title: title,
          description: body,
        });

        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(title, {
            body: body,
            icon: icon,
          });
        }
      }
    });

    return () => unsubscribe();
  }, [toast]);


  const login = async (credentials: {email: string, password?: string}) => {
    const { email, password = "password" } = credentials;
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await updateUserStatus(userCredential.user.uid, true);
  };
  
  const signup = async (credentials: { name: string, email: string, password?: string, avatar?: string }) => {
    const { name, email, password = "password", avatar } = credentials;
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    const newUser: User = {
      id: firebaseUser.uid,
      name,
      email: firebaseUser.email!,
      avatar: avatar || `https://picsum.photos/seed/${firebaseUser.uid}/100/100`,
      isOnline: true,
      lastSeen: new Date().toISOString()
    };
    await setDoc(doc(db, "users", firebaseUser.uid), newUser);
    setUser(newUser);
  };

  const logout = async () => {
    if (user) {
        await updateUserStatus(user.id, false);
    }
    await signOut(auth);
  };

  const updateProfile = async (data: { name?: string, avatar?: string }) => {
    if (!user) throw new Error("Not authenticated");

    const userRef = doc(db, "users", user.id);
    const updates: Partial<User> = {};
    if (data.name) updates.name = data.name;
    if (data.avatar) updates.avatar = data.avatar;

    await updateDoc(userRef, updates);
    setUser(prevUser => prevUser ? { ...prevUser, ...updates } : null);
  };


  const value = { user, login, signup, logout, updateProfile, loading };
  
  const isAuthPage = pathname === '/login' || pathname === '/signup';

  if (loading) {
    return <SplashScreen />; 
  }

  if (!user && !isAuthPage) {
    return <SplashScreen />; // Also show splash screen while redirecting
  }

  if (user && isAuthPage) {
    return <SplashScreen />; // Also show splash screen while redirecting
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
