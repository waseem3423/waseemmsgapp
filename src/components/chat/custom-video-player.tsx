"use client";

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomVideoPlayerProps {
  src: string;
  className?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
}

export default function CustomVideoPlayer({ src, className, autoPlay = false, onEnded }: CustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTimeStr, setCurrentTimeStr] = useState('0:00');
  const [durationStr, setDurationStr] = useState('0:00');
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(e => console.error("Video play error:", e));
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !videoRef.current || isNaN(videoRef.current.duration)) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newTime = (clickX / width) * videoRef.current.duration;
    videoRef.current.currentTime = newTime;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current);
    if (isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoadedMetadata = () => {
      setDurationStr(formatTime(video.duration));
    };

    const onTimeUpdate = () => {
      if (!isNaN(video.duration) && video.duration > 0) {
        setCurrentTimeStr(formatTime(video.currentTime));
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    const onVideoEnded = () => {
      setIsPlaying(false);
      setShowControls(true);
      if (onEnded) onEnded();
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('ended', onVideoEnded);

    if (video.readyState >= 1) {
      onLoadedMetadata();
    }

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('ended', onVideoEnded);
      if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current);
    };
  }, [src]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className={cn(
        "relative group/player overflow-hidden rounded-xl bg-black select-none flex items-center justify-center border border-border/40",
        className
      )}
    >
      <video
        ref={videoRef}
        src={src}
        autoPlay={autoPlay}
        muted={isMuted}
        playsInline
        onClick={togglePlayPause}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Large Center Play Overlay Icon when paused */}
      {!isPlaying && (
        <button
          onClick={togglePlayPause}
          className="absolute inset-0 m-auto h-16 w-16 rounded-full bg-emerald-500/90 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform z-20 backdrop-blur-sm"
        >
          <Play className="h-8 w-8 fill-current ml-1" />
        </button>
      )}

      {/* Glassmorphic Custom Control Bar */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-2 transition-opacity duration-300 z-30",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Seekable Progress Bar */}
        <div
          ref={progressBarRef}
          onClick={handleSeek}
          className="w-full h-2 bg-white/20 hover:h-2.5 rounded-full cursor-pointer relative overflow-hidden transition-all group/seek"
        >
          <div
            className="h-full bg-emerald-400 rounded-full transition-all relative"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between text-white text-xs px-1">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlayPause}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="h-4.5 w-4.5 fill-current" /> : <Play className="h-4.5 w-4.5 fill-current" />}
            </button>

            <button
              onClick={toggleMute}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
            </button>

            <span className="font-mono text-[11px] text-white/80">
              {currentTimeStr} / {durationStr}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize className="h-4.5 w-4.5" /> : <Maximize className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
