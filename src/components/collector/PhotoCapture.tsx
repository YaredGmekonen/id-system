import { useState, useRef, useCallback, useEffect } from 'react';

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
  const [cameraError, setCameraError] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 400, height: 400 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      setStream(mediaStream);
      setIsCameraActive(true);
      setCameraError(false);
    } catch {
      setCameraError(true);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d')!;

    const size = Math.min(video.videoWidth, video.videoHeight);
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 400, 400);

    const dataUrl = canvas.toDataURL('image/png');
    setPhoto(dataUrl);
    stopCamera();
  }, [setPhoto, stopCamera]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhoto(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }, [setPhoto]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [stream]);

  return (
    <div
      className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-xl border shadow-2xs font-sans text-xs"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        borderColor: 'var(--border-primary)',
        color: 'var(--text-primary)',
      }}
    >
      <canvas ref={canvasRef} className="hidden" />

      {/* Portrait frame */}
      <div
        className="relative w-24 h-28 rounded-xl overflow-hidden border-2 flex items-center justify-center flex-shrink-0 shadow-inner"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-primary)',
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
            <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <span className="text-[9px] font-mono mt-0.5 font-bold">NO PHOTO</span>
          </div>
        )}

        {isCameraActive && (
          <div className="absolute inset-0 rounded-xl border-2 border-[#84a92c] animate-pulse pointer-events-none" />
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2 flex-1 w-full sm:w-auto">
        <div className="flex flex-wrap gap-2">
          {isCameraActive ? (
            <>
              <button
                type="button"
                onClick={capturePhoto}
                className="btn-primary py-1.5 px-3 flex items-center gap-1.5 font-bold cursor-pointer"
              >
                <span>📸</span>
                <span>Snap Photo</span>
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="btn-secondary py-1.5 px-3 cursor-pointer"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={startCamera}
                className="btn-secondary py-1.5 px-3 flex items-center gap-1.5 cursor-pointer font-bold"
                disabled={cameraError}
              >
                <svg className="w-3.5 h-3.5 text-[#84a92c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <span>{cameraError ? 'Camera Disabled' : 'Take Webcam Photo'}</span>
              </button>

              <label className="btn-secondary py-1.5 px-3 flex items-center gap-1.5 cursor-pointer font-bold">
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span>Upload Portrait</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {currentPhoto && (
                <button
                  type="button"
                  onClick={() => setPhoto('')}
                  className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors"
                  title="Clear photo"
                >
                  ✕
                </button>
              )}
            </>
          )}
        </div>

        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          Passport aspect ratio recommended. Image automatically embedded into print-ready 300 DPI layout.
        </p>
      </div>
    </div>
  );
}
