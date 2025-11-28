import { useRef, useState } from 'react';

interface MediaUploadProps {
  onMediaReady: (element: HTMLVideoElement | HTMLImageElement) => void;
}

export function MediaUpload({ onMediaReady }: MediaUploadProps) {
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      alert('Please select an image or video file!');
      return;
    }

    // Create URL for the file
    const url = URL.createObjectURL(file);
    setMediaUrl(url);
    setMediaType(isImage ? 'image' : 'video');

    // Wait for media to load, then notify parent
    setTimeout(() => {
      if (isVideo && videoRef.current) {
        videoRef.current.play();
        onMediaReady(videoRef.current);
      } else if (isImage && imageRef.current) {
        onMediaReady(imageRef.current);
      }
    }, 100);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {!mediaUrl ? (
        /* Upload button */
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition cursor-pointer flex-1"
          onClick={handleUploadClick}
        >
          <div className="text-5xl mb-3">📁</div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Upload Image</h3>
          <p className="text-sm text-gray-600 mb-3">Click to select a file</p>
          <button className="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg font-medium hover:bg-gray-300 transition">
            Choose File
          </button>
          <p className="text-xs text-gray-500 mt-2">Supported: JPG, PNG</p>
        </div>
      ) : (
        /* Display uploaded media */
        <div className="flex flex-col h-full">
          {/* Change file button - Centered at top */}
          <div className="mb-3 flex-shrink-0 flex justify-center">
            <button
              onClick={handleUploadClick}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition"
            >
              📁 Change Image
            </button>
          </div>
          
          <div className="flex-1 flex items-start justify-center min-h-0 w-full pt-2">
            {mediaType === 'video' ? (
              <video
                ref={videoRef}
                src={mediaUrl}
                loop
                muted
                playsInline
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              />
            ) : (
              <img
                ref={imageRef}
                src={mediaUrl}
                alt="Uploaded"
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

