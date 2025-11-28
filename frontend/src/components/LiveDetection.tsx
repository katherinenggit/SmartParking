import { useState, useRef, useEffect } from 'react';
import { aiDetection } from '../services/ai/aiDetection';
import type { Detection } from '../services/ai/aiDetection';
import { LiveCamera } from './LiveCamera';
import { MediaUpload } from './MediaUpload';
import { ParkingMap2D } from './ParkingMap2D';
import {
  saveDetectionRecord,
  fetchDetections,
  deleteAllDetections,
  downloadDetectionsAsJSON,
  fetchDetectionByCamera,
  type SavedSpace,
} from '../services/detectionService';
import { useAuth } from '../context/AuthContext';

interface LiveDetectionProps {
  videoElement: HTMLVideoElement | HTMLImageElement | null;
  onStreamReady?: (stream: MediaStream) => void;
  sourceType: 'camera' | 'upload';
  onMediaReady?: (element: HTMLVideoElement | HTMLImageElement) => void;
}

type ParkingSpace = SavedSpace;

export function LiveDetection({ videoElement, onStreamReady, sourceType, onMediaReady }: LiveDetectionProps) {
  const { user, role } = useAuth();
  const ownerId = user?.uid ?? null;
  const isAdmin = role === 'admin';
  const PARKING_ID_REGEX = /^[A-Za-z0-9]+$/;
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [outputImage, setOutputImage] = useState<string>('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | undefined>(undefined);
  const [zoom, setZoom] = useState(1);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const [cameraId, setCameraId] = useState('');
  const [parkingLotId, setParkingLotId] = useState('');
  const [parkingIdError, setParkingIdError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(false);
  const activeCameraId = cameraId.trim();
  const canSaveResults =
    isAdmin &&
    !!ownerId &&
    spaces.length > 0 &&
    !parkingIdError &&
    parkingLotId.trim().length > 0;
  const restrictDataActions = !isAdmin || !ownerId;
  
  // Wrapper to handle media ready
  const handleMediaReadyWithSize = (element: HTMLVideoElement | HTMLImageElement) => {
    if (onMediaReady) {
      onMediaReady(element);
    }
  };
  
  // Undo/Redo history
  const [history, setHistory] = useState<ParkingSpace[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isHistoryUpdateRef = useRef(false);
  
  // Firebase data management states
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isDeletingData, setIsDeletingData] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const FIRESTORE_FIELD_LIMIT = 1_048_487;
  const DATA_URL_MARGIN = 25_000; // keep small buffer under Firestore limit

  const estimateDataUrlBytes = (dataUrl?: string | null) => {
    if (!dataUrl) return 0;
    const base64 = dataUrl.split(',')[1];
    if (!base64) return 0;
    return Math.ceil((base64.length * 3) / 4);
  };

  const generateSizedSnapshot = (
    element: HTMLVideoElement | HTMLImageElement,
    qualities = [0.82, 0.7, 0.6, 0.5]
  ) => {
    const isVideo = element instanceof HTMLVideoElement;
    const mediaWidth = isVideo ? element.videoWidth : element.naturalWidth;
    const mediaHeight = isVideo ? element.videoHeight : element.naturalHeight;
    if (!mediaWidth || !mediaHeight) {
      return null;
    }
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = mediaWidth;
    tempCanvas.height = mediaHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) {
      return null;
    }
    tempCtx.drawImage(element, 0, 0, mediaWidth, mediaHeight);

    let result = tempCanvas.toDataURL('image/jpeg', qualities[qualities.length - 1]);
    for (const quality of qualities) {
      const candidate = tempCanvas.toDataURL('image/jpeg', quality);
      if (estimateDataUrlBytes(candidate) <= FIRESTORE_FIELD_LIMIT - DATA_URL_MARGIN) {
        result = candidate;
        break;
      }
      result = candidate;
    }
    return result;
  };

  const ensureSnapshotWithinLimit = () => {
    if (!imageRef.current) {
      return sourceImageUrl;
    }
    if (estimateDataUrlBytes(sourceImageUrl) <= FIRESTORE_FIELD_LIMIT - DATA_URL_MARGIN) {
      return sourceImageUrl;
    }
    const resized = generateSizedSnapshot(imageRef.current, [0.7, 0.6, 0.5, 0.4]);
    if (resized) {
      setSourceImageUrl(resized);
      return resized;
    }
    return sourceImageUrl;
  };

  useEffect(() => {
    let isMounted = true;
    const loadSnapshot = async () => {
      if (!ownerId || !cameraId.trim()) {
        return;
      }
      try {
        setIsLoadingSnapshot(true);
        const record = await fetchDetectionByCamera(ownerId, cameraId.trim());
        if (!isMounted || !record) {
          return;
        }
        const loadedSpaces = record.spaces || [];
        setSpaces(loadedSpaces);
        setIsEditing(loadedSpaces.length > 0);
        setHistory([loadedSpaces]);
        setHistoryIndex(0);
        if (record.parkingId) {
          setParkingLotId(record.parkingId);
          setParkingIdError(null);
        }
        if (record.inputImageUrl) {
          setSourceImageUrl(record.inputImageUrl);
          const img = new Image();
          img.src = record.inputImageUrl;
          img.onload = () => {
            imageRef.current = img;
            drawCanvas();
          };
        }
      } catch (snapshotError) {
        console.error('Failed to load existing detection snapshot', snapshotError);
      } finally {
        if (isMounted) {
          setIsLoadingSnapshot(false);
        }
      }
    };
    loadSnapshot();
    return () => {
      isMounted = false;
    };
  }, [ownerId, cameraId]);

  const isDrawingRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  
  /**
   * Save current state to history
   */
  const saveToHistory = (newSpaces: ParkingSpace[]) => {
    if (isHistoryUpdateRef.current) {
      // Don't save if this is from undo/redo
      return;
    }
    
    setHistory(prev => {
      // Remove any history after current index (when user makes new change after undo)
      const newHistory = prev.slice(0, historyIndex + 1);
      // Add new state
      newHistory.push([...newSpaces]);
      // Limit history to 50 states
      if (newHistory.length > 50) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex(prev => {
      const newIndex = prev + 1;
      // Limit index
      return newIndex >= 50 ? 49 : newIndex;
    });
  };
  
  /**
   * Keyboard shortcuts (Ctrl+Z for undo, Ctrl+Y for redo)
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (historyIndex > 0) {
          isHistoryUpdateRef.current = true;
          const prevIndex = historyIndex - 1;
          setHistoryIndex(prevIndex);
          setSpaces([...history[prevIndex]]);
          setTimeout(() => {
            isHistoryUpdateRef.current = false;
          }, 0);
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (historyIndex < history.length - 1) {
          isHistoryUpdateRef.current = true;
          const nextIndex = historyIndex + 1;
          setHistoryIndex(nextIndex);
          setSpaces([...history[nextIndex]]);
          setTimeout(() => {
            isHistoryUpdateRef.current = false;
          }, 0);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);
  
  /**
   * Run detection ONCE when button is clicked
   */
  const handleDetect = async () => {
    if (!videoElement) {
      alert('Please select an image first!');
      return;
    }
    
    setIsDetecting(true);
      
      try {
      // 1. Detect parking spaces
      const detections = await aiDetection.detectVehicles(videoElement);
      
      // 2. Convert to ParkingSpace format (ignore class, only keep bbox and confidence)
      const detectedSpaces: ParkingSpace[] = detections.map((d, i) => ({
        id: `space-${Date.now()}-${i}`,
        bbox: d.bbox,
        confidence: d.score
      }));
      
      setSpaces(detectedSpaces);
      saveToHistory(detectedSpaces);
        
      // 3. Load original image
      const isVideo = videoElement instanceof HTMLVideoElement;
      const mediaWidth = isVideo ? videoElement.videoWidth : videoElement.naturalWidth;
      const mediaHeight = isVideo ? videoElement.videoHeight : videoElement.naturalHeight;
      
      // Create image snapshot from media (always via canvas) để lưu dạng data URL ổn định
      const img = new Image();
      const sizedSnapshot = generateSizedSnapshot(videoElement);
      if (!sizedSnapshot) {
        throw new Error('Không tạo được snapshot hình ảnh.');
      }
      img.src = sizedSnapshot;
      
      img.onload = () => {
        imageRef.current = img;
        setSourceImageUrl(img.src);
        drawCanvas();
      };
      
      console.log(`✅ Detection complete: ${detectedSpaces.length} spaces detected`);
      
    } catch (error) {
      console.error('❌ Detection failed:', error);
      alert('Detection failed! Check console for details.');
    } finally {
      setIsDetecting(false);
      setIsEditing(true); // Enable editing mode after detection
    }
  };
  
  /**
   * Draw canvas with original image + parking spaces
   */
  const drawCanvas = () => {
      const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;
      
      const ctx = canvas.getContext('2d')!;
    const img = imageRef.current;
    
    // Get displayed size (CSS)
    const container = canvas.parentElement;
    if (!container) return;
    
    const displayedWidth = container.clientWidth;
    const displayedHeight = (img.height / img.width) * displayedWidth;
    
    // Set canvas size to match displayed size
    canvas.width = displayedWidth;
    canvas.height = displayedHeight;
      
    // Calculate scale factor
    const scaleX = displayedWidth / img.width;
    const scaleY = displayedHeight / img.height;
    
    // Draw original image (scaled)
    ctx.drawImage(img, 0, 0, displayedWidth, displayedHeight);
    
    // Draw all parking spaces (scaled)
    spaces.forEach(space => {
      const [x, y, width, height] = space.bbox;
      const scaledX = x * scaleX;
      const scaledY = y * scaleY;
      const scaledWidth = width * scaleX;
      const scaledHeight = height * scaleY;
      const confidence = Math.round(space.confidence * 100);
      
      // Box color (same for all spaces)
      const boxColor = '#00ff00';
        
        // Bounding box
      ctx.strokeStyle = boxColor;
        ctx.lineWidth = 3;
      ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
        
      // Confidence text (centered in box)
      ctx.fillStyle = boxColor;
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
        ctx.fillText(
        `${confidence}%`,
        scaledX + scaledWidth / 2,
        scaledY + scaledHeight / 2
      );
      
      // Highlight selected space
      if (space.id === selectedSpaceId) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 4;
        ctx.strokeRect(scaledX - 2, scaledY - 2, scaledWidth + 4, scaledHeight + 4);
      }
    });
    
    // Update output image
    setOutputImage(canvas.toDataURL('image/png'));
  };
  
  // Redraw when spaces change or window resize
  useEffect(() => {
    if (imageRef.current) {
      drawCanvas();
    }
  }, [spaces, selectedSpaceId]);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (imageRef.current) {
        drawCanvas();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  /**
   * Get space at mouse position (in original image coordinates)
   */
  const getSpaceAt = (x: number, y: number): ParkingSpace | null => {
    if (!imageRef.current) return null;
    
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    // Convert displayed coordinates to original image coordinates
    const scaleX = imageRef.current.width / canvas.width;
    const scaleY = imageRef.current.height / canvas.height;
    const origX = x * scaleX;
    const origY = y * scaleY;
    
    for (const space of spaces) {
      const [sx, sy, sw, sh] = space.bbox;
      if (origX >= sx && origX <= sx + sw && origY >= sy && origY <= sy + sh) {
        return space;
      }
    }
    return null;
  };
  
  /**
   * Handle canvas click - delete space
   */
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditing || isDrawingRef.current) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    
    const clickedSpace = getSpaceAt(x, y);
    
    if (clickedSpace) {
      // Delete space
      setSpaces(spaces.filter(s => s.id !== clickedSpace.id));
      setSelectedSpaceId(null);
    }
  };
  
  /**
   * Handle mouse down - start drawing new box
   */
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    
    // Check if clicking on existing space (don't draw if clicking on space)
    const clickedSpace = getSpaceAt(x, y);
    if (clickedSpace) return;
    
    isDrawingRef.current = true;
    startPosRef.current = { x, y };
  };
  
  /**
   * Handle mouse move - draw preview box
   */
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditing || !isDrawingRef.current || !startPosRef.current) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const currentX = (e.clientX - rect.left);
    const currentY = (e.clientY - rect.top);
    
    // Redraw with preview box
    drawCanvas();
    
    const ctx = canvas.getContext('2d')!;
    const { x: startX, y: startY } = startPosRef.current;
    
    const width = currentX - startX;
    const height = currentY - startY;
    
    // Draw preview box
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(startX, startY, width, height);
    ctx.setLineDash([]);
    };
    
  /**
   * Handle mouse up - finish drawing new box
   */
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditing || !isDrawingRef.current || !startPosRef.current || !imageRef.current) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const endX = (e.clientX - rect.left);
    const endY = (e.clientY - rect.top);
    
    const { x: startX, y: startY } = startPosRef.current;
    
    // Convert displayed coordinates to original image coordinates
    const scaleX = imageRef.current.width / canvas.width;
    const scaleY = imageRef.current.height / canvas.height;
    
    const origStartX = startX * scaleX;
    const origStartY = startY * scaleY;
    const origEndX = endX * scaleX;
    const origEndY = endY * scaleY;
    
    const width = Math.abs(origEndX - origStartX);
    const height = Math.abs(origEndY - origStartY);
    const x = Math.min(origStartX, origEndX);
    const y = Math.min(origStartY, origEndY);
    
    // Only add if box is large enough
    if (width > 20 && height > 20) {
      const newSpace: ParkingSpace = {
        id: `space-manual-${Date.now()}`,
        bbox: [x, y, width, height],
        confidence: 1.0 // Manual detection = 100% confidence
      };
      
      const newSpaces = [...spaces, newSpace];
      setSpaces(newSpaces);
      saveToHistory(newSpaces);
    }
    
    isDrawingRef.current = false;
    startPosRef.current = null;
  };
  
  /**
   * Save final result
   */
  const handleSave = async () => {
    if (!isAdmin || !ownerId) {
      alert('Chỉ tài khoản Admin mới có quyền lưu dữ liệu.');
      return;
    }
    if (spaces.length === 0) {
      alert('No spaces to save!');
      return;
    }
    if (!parkingLotId.trim()) {
      alert('Parking Lot ID is required.');
      return;
    }
    if (!PARKING_ID_REGEX.test(parkingLotId.trim())) {
      alert('Parking Lot ID chỉ cho phép ký tự chữ và số (không khoảng trắng/ký tự đặc biệt).');
      return;
    }
    if (!activeCameraId) {
      alert('Camera ID is required.');
      return;
    }
    
    const detections: Detection[] = spaces.map(space => ({
      class: 'parking_space',
      score: space.confidence,
      bbox: space.bbox
    }));
    
    const safeInputImageUrl = ensureSnapshotWithinLimit();

    const result = await saveDetectionRecord(
      detections,
      activeCameraId,
      safeInputImageUrl,
      spaces,
      {
        ownerId,
        parkingId: parkingLotId.trim(),
      }
    );
    
    if (result.success) {
      const alertInfo = result.alertsCreated && result.alertsCreated > 0
        ? ` | 🚨 ${result.alertsCreated} alert(s)`
        : '';
      const message = `✅ Saved ${spaces.length} spaces for ${activeCameraId}/${parkingLotId.trim()}${alertInfo}`;
      setSaveMessage(message);
      alert(message);
    } else {
      alert(`❌ Failed to save: ${result.error || 'Unknown error'}\n\nCheck console for details.`);
    }
  };
  
  /**
   * Download all detection data from Firestore
   */
  const handleDownloadData = async () => {
    if (!isAdmin || !ownerId) {
      alert('Chỉ tài khoản Admin mới có thể tải dữ liệu.');
      return;
    }
    setIsLoadingData(true);
    try {
      const result = await fetchDetections({ limitCount: 1000, ownerId });
      if (result.success && result.data) {
        downloadDetectionsAsJSON(result.data);
        alert(`✅ Downloaded ${result.data.length} detection records!`);
      } else {
        alert(`❌ Failed to download data: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('❌ Failed to download data. Check console for details.');
    } finally {
      setIsLoadingData(false);
    }
  };
  
  /**
   * Delete all detection data from Firestore
   */
  const handleDeleteAllData = async () => {
    const confirmed = window.confirm(
      '⚠️ WARNING: This will delete ALL detection records from Firestore!\n\n' +
      'This action cannot be undone. Are you sure?'
    );
    
    if (!confirmed) {
      console.log('ℹ️ Delete operation cancelled by user');
      return;
    }
    
    if (!isAdmin || !ownerId) {
      alert('Chỉ Admin mới có quyền xoá dữ liệu.');
      return;
    }
    console.log('🗑️ User confirmed deletion. Starting...');
    setIsDeletingData(true);
    
    try {
      console.log('📞 Calling deleteAllDetections()...');
      const result = await deleteAllDetections(ownerId);
      
      console.log('📥 Delete result:', result);
      
      if (result.success) {
        const message = result.deletedCount === 0 
          ? 'No documents found to delete.' 
          : `✅ Deleted ${result.deletedCount} detection records from Firestore!`;
        alert(message);
        console.log('✅ Delete operation completed successfully');
      } else {
        const errorMsg = result.error || 'Unknown error';
        alert(`❌ Failed to delete data:\n\n${errorMsg}\n\nCheck console (F12) for more details.`);
        console.error('❌ Delete operation failed:', errorMsg);
      }
    } catch (error) {
      const errorDetails = error instanceof Error ? error.message : String(error);
      console.error('❌ Unexpected error during delete:', error);
      console.error('❌ Error details:', errorDetails);
      alert(`❌ Unexpected error occurred:\n\n${errorDetails}\n\nCheck console (F12) for more details.`);
    } finally {
      setIsDeletingData(false);
      console.log('🏁 Delete operation finished');
    }
  };
  
  return (
    <div className="space-y-4 p-4">
      {/* Camera selector */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Parking Lot ID
            </label>
            <input
              type="text"
              value={parkingLotId}
              onChange={(e) => {
                const sanitized = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                setParkingLotId(sanitized);
                setParkingIdError(sanitized.length === 0 ? 'Parking Lot ID bắt buộc' : null);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-wide uppercase"
              maxLength={24}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Camera ID
            </label>
            <input
              type="text"
              value={cameraId}
              onChange={(e) => setCameraId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              maxLength={24}
            />
          </div>
        </div>
        <p className="text-xs text-gray-500">
          ID chỉ gồm chữ cái tiếng Anh và số, không dấu và không khoảng trắng.
        </p>
        {parkingIdError && <p className="text-xs text-red-600">{parkingIdError}</p>}
        <div className="text-sm text-gray-600">
          Mỗi camera lưu một bản ghi duy nhất trong Firestore theo Parking Lot ID + Camera ID. Khi
          nhấn <span className="font-semibold">Save Results</span>, hệ thống cập nhật dữ liệu và tự động
          tạo alert nếu phát hiện xe đỗ sai quy định.
        </div>
        {isLoadingSnapshot && (
          <div className="text-xs text-blue-600">
            Đang tải dữ liệu đã lưu cho camera này...
          </div>
        )}
      </div>
      {/* Instructions */}
      <div className="text-center text-gray-700">
        <p className="text-base mb-2">
          Upload image to detect spaces in a parking lot
        </p>
        <p className="text-base">
          <button
            onClick={handleDetect}
            disabled={!videoElement || isDetecting}
            className={`inline-flex items-center gap-1 px-4 py-2 rounded-lg font-medium shadow transition ${
              !videoElement || isDetecting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🔍 Detect Spaces
          </button>
          {' '}to see output
        </p>
      </div>
      
      {/* Save Result Button - Visible when editing */}
      {isEditing && (
        <div className="text-center text-gray-700">
          <p className="text-base">
            <button
              onClick={handleSave}
              disabled={!canSaveResults}
              className={`inline-flex items-center gap-1 px-4 py-2 rounded-lg font-medium shadow transition ${
                !canSaveResults
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title={isAdmin ? undefined : 'Chỉ Admin mới có thể lưu dữ liệu'}
            >
              💾 Save Results
            </button>
            {' '}to save results
          </p>
          {saveMessage && (
            <p className="text-sm text-green-600 mt-2">{saveMessage}</p>
          )}
          {!isAdmin && (
            <p className="text-xs text-gray-500 mt-1">
              Đăng nhập bằng tài khoản Admin để lưu kết quả, tải hoặc xoá dữ liệu.
            </p>
          )}
        </div>
      )}
      
      {/* Side-by-Side Frames - Aligned at top, centered with max width */}
      <div className="flex justify-center">
        <div className="grid grid-cols-2 gap-4" style={{ maxWidth: '1400px', width: '100%' }}>
          {/* LEFT: Input (Original) */}
          <div className="flex flex-col space-y-2">
            <div className="bg-white p-2 shadow-sm border border-gray-200 text-center" style={{ borderRadius: '30px' }}>
              <div className="text-xs text-gray-600">Input</div>
            </div>
            <div 
              ref={inputContainerRef}
              className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white flex flex-col items-center justify-start" 
              style={{ 
                minHeight: '450px'
              }}
            >
              {sourceType === 'camera' ? (
                <LiveCamera onStreamReady={onStreamReady} />
              ) : (
                <MediaUpload onMediaReady={handleMediaReadyWithSize} />
              )}
            </div>
          </div>
          
          {/* RIGHT: Output (2D Map) */}
          <div className="flex flex-col space-y-2">
            <div className="bg-white p-2 shadow-sm border border-gray-200 text-center" style={{ borderRadius: '30px' }}>
              <div className="text-xs text-gray-600">Output</div>
            </div>
            <div 
              className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white relative flex flex-col items-center justify-center" 
              style={{ 
                minHeight: '450px'
              }}
            >
            {spaces.length > 0 ? (
              <div className="flex-1 flex flex-col min-h-0 w-full">
                <ParkingMap2D
                  spaces={spaces}
                  selectedSpaceId={selectedSpaceId}
                  onSpaceSelect={setSelectedSpaceId}
                  onSpaceDelete={(spaceId) => {
                    const newSpaces = spaces.filter(s => s.id !== spaceId);
                    setSpaces(newSpaces);
                    setSelectedSpaceId(null);
                    saveToHistory(newSpaces);
                  }}
                  onSpaceAdd={(bbox) => {
                    const newSpace: ParkingSpace = {
                      id: `space-manual-${Date.now()}`,
                      bbox: bbox,
                      confidence: 1.0 // Manual detection = 100% confidence
                    };
                    const newSpaces = [...spaces, newSpace];
                    setSpaces(newSpaces);
                    saveToHistory(newSpaces);
                  }}
                  imageWidth={imageRef.current ? imageRef.current.width : undefined}
                  imageHeight={imageRef.current ? imageRef.current.height : undefined}
                  sourceImageUrl={sourceImageUrl}
                  zoom={zoom}
                  onZoomChange={setZoom}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center flex-1 text-gray-500">
                <div className="text-center">
                  <div className="text-5xl mb-2">🤖</div>
                  <p>No spaces detected yet</p>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
      
      {/* Stats Row Below - Label on top, Value below, centered with max width */}
      <div className="flex justify-center">
        <div className="grid grid-cols-4 gap-3" style={{ maxWidth: '1400px', width: '100%' }}>
          {/* Spaces Count */}
          <div className="bg-white p-3 shadow-sm border border-gray-200 text-center flex flex-col" style={{ borderRadius: '30px' }}>
            <div className="text-xs text-gray-600 mb-1">Total Parking Spaces</div>
            <div className="text-xl font-bold text-gray-800">{spaces.length}</div>
          </div>
          
          {/* Source Type */}
          <div className="bg-white p-3 shadow-sm border border-gray-200 text-center flex flex-col" style={{ borderRadius: '30px' }}>
            <div className="text-xs text-gray-600 mb-1">Input Source</div>
            <div className="text-gray-800 font-bold capitalize text-sm">{sourceType === 'camera' ? '📹 Camera' : '📁 Upload'}</div>
          </div>
          
          {/* Status */}
          <div className="bg-white p-3 shadow-sm border border-gray-200 text-center flex flex-col" style={{ borderRadius: '30px' }}>
            <div className="text-xs text-gray-600 mb-1">Status</div>
            <div className={`font-bold text-sm flex items-center justify-center gap-2 ${
              isDetecting ? 'text-yellow-600' : isEditing ? 'text-blue-600' : 'text-green-600'
            }`}>
              {isDetecting ? (
                <>
                  <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                  Detecting
                </>
              ) : isEditing ? (
                <>
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Editing
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Ready
                </>
              )}
            </div>
          </div>
          
          {/* AI Model */}
          <div className="bg-white p-3 shadow-sm border border-gray-200 text-center flex flex-col" style={{ borderRadius: '30px' }}>
            <div className="text-xs text-gray-600 mb-1" style={{ fontFamily: 'serif' }}>AI Model</div>
            <div className="text-gray-800 font-bold text-sm">
              <a 
                href="https://universe.roboflow.com/skripsijeremy/deteksiparkirkosong/model/6" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-purple-600 hover:underline"
                style={{ fontFamily: 'serif' }}
              >
                Link to model!
              </a>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer - Manage my Data - Centered */}
      <div className="pt-4 mt-4">
        <div className="flex flex-col items-center">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Manage my Data</h3>
          <div className="flex gap-3">
            <button
              onClick={handleDownloadData}
              disabled={isLoadingData || restrictDataActions}
              className={`px-4 py-2 rounded-lg font-medium shadow transition ${
                isLoadingData || restrictDataActions
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title={restrictDataActions ? 'Chỉ Admin mới có thể tải dữ liệu' : 'Download all detection data from Firestore as JSON'}
            >
              {isLoadingData ? '⏳ Loading...' : '📥 Download Data'}
            </button>
            <button
              onClick={handleDeleteAllData}
              disabled={isDeletingData || restrictDataActions}
              className={`px-4 py-2 rounded-lg font-medium shadow transition ${
                isDeletingData || restrictDataActions
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title={restrictDataActions ? 'Chỉ Admin mới có thể xoá dữ liệu' : 'Delete all detection data from Firestore (WARNING: Cannot undo!)'}
            >
              {isDeletingData ? '⏳ Deleting...' : '🗑️ Delete All Data'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Detection Image View (Hidden - not in design) */}
      {false && outputImage && spaces.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-gray-800">🖼️ Detection Image (Editable)</h3>
          <div className="border-2 border-blue-500 rounded-lg overflow-hidden bg-gray-100 relative">
            <div className="relative w-full">
              <canvas
                ref={canvasRef}
                className="w-full cursor-crosshair"
                style={{ maxHeight: '70vh' }}
                onClick={handleCanvasClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => {
                  isDrawingRef.current = false;
                  startPosRef.current = null;
                  if (imageRef.current) drawCanvas();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
