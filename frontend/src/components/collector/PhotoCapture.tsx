import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, X, RefreshCw, AlertCircle, Check, Sparkles } from 'lucide-react';
import { enhancePhotoImage } from '../../engine/photoEnhancer';

interface PhotoCaptureProps {
  value?: string;
  onChange?: (dataUrl: string) => void;
  photoDataUrl?: string;
  onCapture?: (dataUrl: string) => void;
  personName?: string;
}

export default function PhotoCapture({
  value,
  onChange,
  photoDataUrl,
  onCapture,
  personName,
}: PhotoCaptureProps) {
  const currentPhoto = value || photoDataUrl || '';
  const setPhoto = onChange || onCapture || (() => {});

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Non-destructive photo enhancement state (default OFF)
  const [rawPhoto, setRawPhoto] = useState<string>('');
  const [isEnhanced, setIsEnhanced] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);

  useEffect(() => {
    if (currentPhoto && !rawPhoto) {
      setRawPhoto(currentPhoto);
    }
  }, [currentPhoto, rawPhoto]);

  const handleToggleEnhance = async () => {
    if (!currentPhoto) return;

    if (isEnhanced) {
      // Revert to raw photo non-destructively
      if (rawPhoto) {
        setPhoto(rawPhoto);
      }
      setIsEnhanced(false);
    } else {
      // Enhance photo
      setIsEnhancing(true);
      const original = rawPhoto || currentPhoto;
      setRawPhoto(original);
      const enhanced = await enhancePhotoImage(original);
      setPhoto(enhanced);
      setIsEnhanced(true);
      setIsEnhancing(false);
    }
  };

  const startCamera = useCallback(async (mode: 'user' | 'environment' = facingMode) => {
    setCameraError(null);
    try {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }

      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: mode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      setStream(mediaStream);
      setIsCameraActive(true);
      setFacingMode(mode);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(err => {
          console.warn('Auto-play was prevented:', err);
        });
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(err.message || 'Camera permission denied or device unavailable.');
      setIsCameraActive(false);
    }
  }, [facingMode, stream]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  }, [stream]);

  const switchCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    startCamera(nextMode);
  };

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;

    const vWidth = video.videoWidth || 640;
    const vHeight = video.videoHeight || 480;

    const targetW = 360;
    const targetH = 480;
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const cropH = vHeight;
    const cropW = Math.round(vHeight * (3 / 4));
    const sx = Math.max(0, Math.round((vWidth - cropW) / 2));
    const sy = 0;

    ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, targetW, targetH);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setRawPhoto(dataUrl);
    setIsEnhanced(false);
    setPhoto(dataUrl);
    stopCamera();
  }, [setPhoto, stopCamera]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setRawPhoto(reader.result);
        setIsEnhanced(false);
        setPhoto(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }, [setPhoto]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [stream]);

  return (
    <div
      className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-xl border font-sans text-xs"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        borderColor: 'var(--border-primary)',
        color: 'var(--text-primary)',
      }}
    >
      <canvas ref={canvasRef} className="hidden" />

      {/* Portrait frame */}
      <div
        className="relative w-24 h-30 rounded-xl overflow-hidden border-2 flex items-center justify-center flex-shrink-0 shadow-inner bg-slate-900 border-slate-700"
      >
        {isCameraActive ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : currentPhoto ? (
          <img src={currentPhoto} alt={personName || 'Portrait'} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center p-2 text-center text-slate-500">
            <Camera className="w-6 h-6 opacity-40 mb-1" />
            <span className="text-[9px] font-mono font-bold uppercase">No Photo</span>
          </div>
        )}

        {isCameraActive && (
          <div className="absolute inset-0 rounded-xl border-2 border-[#84a92c] animate-pulse pointer-events-none" />
        )}

        {isEnhanced && (
          <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded bg-[#84a92c] text-slate-950 font-mono font-black text-[7px] shadow-xs">
            ENHANCED
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2 flex-1 w-full sm:w-auto">
        <div className="flex flex-wrap items-center gap-2">
          {isCameraActive ? (
            <>
              <button
                type="button"
                onClick={capturePhoto}
                className="btn-primary py-1.5 px-3 flex items-center gap-1.5 font-bold cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Snap Photo</span>
              </button>

              <button
                type="button"
                onClick={switchCamera}
                className="p-1.5 rounded-lg border hover:border-[#84a92c] cursor-pointer"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                title="Switch Camera (Front/Back)"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#84a92c]" />
              </button>

              <button
                type="button"
                onClick={stopCamera}
                className="py-1.5 px-3 rounded-lg border text-xs font-semibold hover:opacity-80 cursor-pointer"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => startCamera('user')}
                className="py-2 px-3.5 rounded-xl border flex items-center gap-2 cursor-pointer font-bold text-xs transition-all hover:border-[#84a92c] shadow-xs"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
              >
                <Camera className="w-4 h-4 text-[#84a92c]" />
                <span>Open Live Camera</span>
              </button>

              <label
                className="py-2 px-3.5 rounded-xl border flex items-center gap-2 cursor-pointer font-bold text-xs transition-all hover:border-[#84a92c] shadow-xs"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
              >
                <Upload className="w-4 h-4 text-slate-400" />
                <span>Upload File</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Non-Destructive Per-Photo Enhance Toggle */}
              {currentPhoto && (
                <button
                  type="button"
                  onClick={handleToggleEnhance}
                  disabled={isEnhancing}
                  className={`py-2 px-3 rounded-xl border flex items-center gap-1.5 font-bold text-xs transition-all cursor-pointer shadow-xs ${
                    isEnhanced
                      ? 'bg-[#84a92c]/20 border-[#84a92c] text-[#84a92c]'
                      : 'hover:border-[#84a92c] text-slate-300 hover:text-white'
                  }`}
                  style={{
                    backgroundColor: isEnhanced ? undefined : 'var(--bg-elevated)',
                    borderColor: isEnhanced ? undefined : 'var(--border-primary)',
                  }}
                  title="Toggle contrast & sharpness"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#84a92c]" />
                  <span>{isEnhancing ? 'Enhancing…' : isEnhanced ? 'Enhanced' : 'Auto Enhance'}</span>
                </button>
              )}

              {currentPhoto && (
                <button
                  type="button"
                  onClick={() => {
                    setPhoto('');
                    setRawPhoto('');
                    setIsEnhanced(false);
                  }}
                  className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-red-500/30"
                  title="Clear photo"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>

        {cameraError && (
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{cameraError}</span>
          </div>
        )}
      </div>
    </div>
  );
}
