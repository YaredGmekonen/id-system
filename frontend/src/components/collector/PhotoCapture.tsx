import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, X, RefreshCw, AlertCircle, Check, Sparkles, User, RefreshCcw } from 'lucide-react';
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

  // Non-destructive photo enhancement state
  const [rawPhoto, setRawPhoto] = useState<string>('');
  const [isEnhanced, setIsEnhanced] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);

  useEffect(() => {
    if (currentPhoto && !rawPhoto) {
      setRawPhoto(currentPhoto);
    }
  }, [currentPhoto, rawPhoto]);

  // CRITICAL FIX: Attach mediaStream to videoRef as soon as video mounts in DOM
  useEffect(() => {
    if (isCameraActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => {
        console.warn('Camera video auto-play warning:', err);
      });
    }
  }, [isCameraActive, stream]);

  const handleToggleEnhance = async () => {
    if (!currentPhoto) return;

    if (isEnhanced) {
      if (rawPhoto) setPhoto(rawPhoto);
      setIsEnhanced(false);
    } else {
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

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported on this browser or requires HTTPS.');
      }

      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
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
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(err.message || 'Camera permission denied or camera device in use.');
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

  // Fallback Sample Portrait Generator for simulation/testing
  const handleSimulateSamplePortrait = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 480;
    const ctx = canvas.getContext('2d')!;
    
    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 480);
    grad.addColorStop(0, '#e2e8f0');
    grad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 360, 480);

    // Head circle
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(180, 180, 90, 0, Math.PI * 2);
    ctx.fill();

    // Body curve
    ctx.beginPath();
    ctx.arc(180, 480, 190, Math.PI, Math.PI * 2);
    ctx.fillStyle = '#475569';
    ctx.fill();

    // Initials text
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 36px serif';
    ctx.textAlign = 'center';
    ctx.fillText(personName || 'ID PHOTO', 180, 195);

    const simulatedUrl = canvas.toDataURL('image/jpeg', 0.95);
    setRawPhoto(simulatedUrl);
    setIsEnhanced(false);
    setPhoto(simulatedUrl);
  };

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
      className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl border font-sans text-xs transition-colors"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-primary)',
        color: 'var(--text-primary)',
      }}
    >
      <canvas ref={canvasRef} className="hidden" />

      {/* Portrait frame */}
      <div
        className="relative w-28 h-36 rounded-2xl overflow-hidden border-2 flex items-center justify-center flex-shrink-0 shadow-sm transition-all"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: isCameraActive ? '#10b981' : 'var(--border-primary)',
        }}
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
          <div className="flex flex-col items-center justify-center p-2 text-center" style={{ color: 'var(--text-muted)' }}>
            <Camera className="w-7 h-7 opacity-40 mb-1.5" />
            <span className="text-[10px] font-bold uppercase">No Photo</span>
          </div>
        )}

        {isCameraActive && (
          <div className="absolute inset-0 rounded-2xl border-2 border-[#10b981] animate-pulse pointer-events-none" />
        )}

        {isEnhanced && (
          <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md bg-[#10b981] text-slate-950 font-black text-[8px] shadow-xs">
            ENHANCED
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2.5 flex-1 w-full sm:w-auto">
        <div className="flex flex-wrap items-center gap-2">
          {isCameraActive ? (
            <>
              <button
                type="button"
                onClick={capturePhoto}
                className="py-2.5 px-4 rounded-xl bg-[#10b981] hover:bg-[#9fe870] text-slate-950 font-extrabold flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Snap Photo</span>
              </button>

              <button
                type="button"
                onClick={switchCamera}
                className="p-2.5 rounded-xl border hover:opacity-80 cursor-pointer transition-all"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                title="Switch Front/Back Camera"
              >
                <RefreshCw className="w-4 h-4 text-[#10b981]" />
              </button>

              <button
                type="button"
                onClick={stopCamera}
                className="py-2.5 px-3.5 rounded-xl border font-bold hover:opacity-80 cursor-pointer transition-all"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => startCamera('user')}
                className="py-2.5 px-4 rounded-xl border flex items-center gap-2 cursor-pointer font-bold transition-all shadow-xs hover:border-[#10b981]"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
              >
                <Camera className="w-4 h-4 text-[#10b981]" />
                <span>Open Live Camera</span>
              </button>

              <label
                className="py-2.5 px-4 rounded-xl border flex items-center gap-2 cursor-pointer font-bold transition-all shadow-xs hover:border-[#10b981]"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
              >
                <Upload className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
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
                  className={`py-2 px-3 rounded-xl border flex items-center gap-1.5 font-bold transition-all cursor-pointer shadow-xs ${
                    isEnhanced
                      ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]'
                      : 'hover:border-[#10b981]'
                  }`}
                  style={{
                    backgroundColor: isEnhanced ? undefined : 'var(--bg-elevated)',
                    borderColor: isEnhanced ? undefined : 'var(--border-primary)',
                    color: isEnhanced ? undefined : 'var(--text-primary)',
                  }}
                  title="Toggle contrast & sharpness"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#10b981]" />
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
                  className="p-2.5 text-red-500 hover:bg-red-500/10 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-red-500/30"
                  title="Clear photo"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>

        {cameraError && (
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{cameraError}</span>
            </div>
            <button
              type="button"
              onClick={handleSimulateSamplePortrait}
              className="text-[10px] font-bold px-2 py-1 rounded bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer flex-shrink-0"
            >
              Use Sample Photo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
