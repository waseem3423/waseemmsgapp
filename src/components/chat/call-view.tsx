
"use client";

import { useEffect, useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Call } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';

interface CallViewProps {
    call: Call;
    onHangup: () => void;
    onAnswer: () => void;
    onReject: () => void;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
}

const CallTimer = ({ startTime }: { startTime: number }) => {
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setDuration(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, [startTime]);

    const formatTime = (totalSeconds: number) => {
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    };

    return <p className="text-lg text-white/80">{formatTime(duration)}</p>;
};

export default function CallView({ call, onHangup, onAnswer, onReject, localStream, remoteStream }: CallViewProps) {
    const { user } = useAuth();
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [callStartTime, setCallStartTime] = useState<number | null>(null);
    
    const remoteAudioRef = useRef<HTMLAudioElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);

    const isVideoCall = call.callType === 'video';
    const isCaller = user?.id === call.callerId;
    const remoteUser = {
        name: isCaller ? call.receiverName : call.callerName,
        avatar: isCaller ? call.receiverAvatar : call.callerAvatar,
    };
    
    useEffect(() => {
        if(call.status === 'active' && !callStartTime) {
            setCallStartTime(Date.now());
        }
        if (call.status === 'ended' || call.status === 'declined' || call.status === 'missed') {
            const timer = setTimeout(() => {
                onHangup();
            }, 1200);
            return () => clearTimeout(timer);
        }
    }, [call.status, callStartTime, onHangup]);

    useEffect(() => {
        const updateRemoteStream = () => {
            if (remoteStream) {
                if (!isVideoCall && remoteAudioRef.current && remoteAudioRef.current.srcObject !== remoteStream) {
                    remoteAudioRef.current.srcObject = remoteStream;
                    remoteAudioRef.current.play().catch(err => console.log("Audio autoplay error:", err));
                }
                if (isVideoCall && remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStream) {
                    remoteVideoRef.current.srcObject = remoteStream;
                    remoteVideoRef.current.play().catch(err => console.log("Video autoplay error:", err));
                }
            }
        };

        updateRemoteStream();

        if (remoteStream) {
            remoteStream.onaddtrack = updateRemoteStream;
            remoteStream.onremovetrack = updateRemoteStream;
        }
    }, [remoteStream, call.status, isVideoCall]);

    useEffect(() => {
        if (localStream && localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
            localVideoRef.current.play().catch(err => console.log("Local video error:", err));
        }
    }, [localStream, call.status, isVideoOff]);

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsVideoOff(!isVideoOff);
        }
    };

    const getStatusText = () => {
        switch (call.status) {
            case 'ringing':
                return isCaller ? 'Ringing...' : `Incoming ${isVideoCall ? 'Video' : 'Voice'} Call...`;
            case 'active':
                return callStartTime ? <CallTimer startTime={callStartTime} /> : 'Connecting...';
            case 'ended':
                return 'Call Ended';
            case 'declined':
                return 'Call Declined';
             case 'missed':
                return 'Missed Call';
            default:
                return 'Connecting...';
        }
    };

    return (
        <div className="fixed inset-0 bg-[#0b141a]/95 backdrop-blur-md z-50 flex flex-col items-center justify-between py-10 px-6 text-white select-none animate-in fade-in duration-200">
            {/* Audio Stream Player */}
            <audio ref={remoteAudioRef} autoPlay playsInline />

            {/* Header Badge */}
            <div className="flex items-center gap-2 bg-[#202c33] px-4 py-1.5 rounded-full border border-border/40 shadow-md z-20">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-semibold tracking-wide text-zinc-200 uppercase">
                    WhatsApp {isVideoCall ? 'Video' : 'Voice'} Call
                </span>
            </div>

            {/* Main Content Area */}
            {isVideoCall && call.status === 'active' ? (
                <div className="relative w-full max-w-4xl h-[70vh] my-auto rounded-3xl overflow-hidden shadow-2xl border border-border/40 bg-card">
                    {/* Remote Video Stream */}
                    <video 
                        ref={remoteVideoRef} 
                        autoPlay 
                        playsInline 
                        className="w-full h-full object-cover" 
                    />
                    
                    {/* Local Self Video Stream (Picture in Picture) */}
                    {localStream && !isVideoOff && (
                        <div className="absolute bottom-4 right-4 w-36 h-48 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-2xl bg-black">
                            <video 
                                ref={localVideoRef} 
                                autoPlay 
                                muted 
                                playsInline 
                                className="w-full h-full object-cover" 
                            />
                        </div>
                    )}

                    {/* Remote User Name Overlay */}
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold">
                        {remoteUser.name}
                    </div>
                </div>
            ) : (
                /* Audio Call Avatar Screen */
                <div className="flex flex-col items-center justify-center my-auto">
                    <div className="relative mb-6">
                        <Avatar className={cn(
                            "h-36 w-36 border-4 border-[#202c33] shadow-2xl transition-all duration-300",
                            call.status === 'active' && "ring-4 ring-emerald-500/50 scale-105"
                        )}>
                            <AvatarImage src={remoteUser.avatar} alt={remoteUser.name} />
                            <AvatarFallback className="text-5xl bg-[#202c33] text-emerald-400 font-bold">{remoteUser.name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        {call.status === 'active' && (
                            <div className="absolute -bottom-2 right-1/2 translate-x-1/2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                                ENCRYPTED
                            </div>
                        )}
                    </div>

                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">{remoteUser.name}</h1>
                    <div className="text-sm font-medium text-emerald-400/90 h-6 flex items-center justify-center">
                        {getStatusText()}
                    </div>
                </div>
            )}

            {/* Bottom Controls Bar */}
            <div className="flex items-center justify-center gap-6 bg-[#202c33]/90 px-8 py-4 rounded-full border border-border/40 shadow-2xl z-20">
                {/* Mute Microphone Button */}
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                        "rounded-full h-14 w-14 transition-transform hover:scale-110",
                        isMuted ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30" : "bg-white/10 text-white hover:bg-white/20"
                    )}
                    onClick={toggleMute}
                    title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                >
                    {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </Button>

                {/* Video Camera Toggle Button */}
                {isVideoCall && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn(
                            "rounded-full h-14 w-14 transition-transform hover:scale-110",
                            isVideoOff ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30" : "bg-white/10 text-white hover:bg-white/20"
                        )}
                        onClick={toggleVideo}
                        title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
                    >
                        {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                    </Button>
                )}

                {/* Incoming Call Answer Button */}
                {call.status === 'ringing' && !isCaller && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-full h-16 w-16 bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg hover:scale-110 transition-transform" 
                        onClick={onAnswer}
                        title="Answer Call"
                    >
                        <Phone className="h-7 w-7" />
                    </Button>
                )}

                {/* Hangup / Reject Button */}
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full h-16 w-16 bg-rose-600 text-white hover:bg-rose-700 shadow-lg hover:scale-110 transition-transform" 
                    onClick={call.status === 'ringing' && !isCaller ? onReject : onHangup}
                    title="End Call"
                >
                    <PhoneOff className="h-7 w-7" />
                </Button>
            </div>
        </div>
    );
}
