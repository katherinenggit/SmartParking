import { useEffect, useRef, useState } from 'react';

interface LiveCameraProps {
  onStreamReady?: (stream: MediaStream) => void;
}

export function LiveCamera({ onStreamReady }: LiveCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>('');
  
  useEffect(() => {
    let stream: MediaStream | null = null;
    
    const startCamera = async () => {
      try {
        // Xin quyền truy cập camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          },
          audio: false // Không cần audio
        });
        
        // Hiển thị video stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Notify parent component
          if (onStreamReady) {
            onStreamReady(stream);
          }
        }
      } catch (err) {
        console.error('Camera error:', err);
        setError('Không thể truy cập camera. Vui lòng cho phép quyền camera.');
      }
    };
    
    startCamera();
    
    // Cleanup: Tắt camera khi component unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onStreamReady]);
  
  return (
    <div className="w-full h-full flex flex-col">
      {error && (
        <div className="text-red-600 mb-4 p-4 bg-red-50 rounded-lg flex-shrink-0">
          ⚠️ {error}
        </div>
      )}
      
      <div className="w-full flex-1 flex items-start justify-center min-h-0 pt-2">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
        />
      </div>
    </div>
  );
}