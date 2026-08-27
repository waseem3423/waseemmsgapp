"use client";

import Image from 'next/image';

export default function SplashScreen() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="animate-pulse">
        <Image 
          src="/logo.png" 
          alt="ZapChat Logo" 
          width={450} 
          height={450} 
          priority
        />
      </div>
    </div>
  );
}
