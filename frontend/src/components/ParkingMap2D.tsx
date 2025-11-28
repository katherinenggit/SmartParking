import { useEffect, useRef, useState } from 'react';

interface ParkingSpace {
  id: string;
  bbox: [number, number, number, number]; // [x, y, width, height]
  confidence: number;
  normalized?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface ParkingMap2DProps {
  spaces: ParkingSpace[];
  selectedSpaceId: string | null;
  onSpaceSelect?: (spaceId: string | null) => void;
  onSpaceDelete?: (spaceId: string) => void;
  onSpaceAdd?: (bbox: [number, number, number, number]) => void;
  imageWidth?: number;
  imageHeight?: number;
  sourceImageUrl?: string; // URL of the original input image
  zoom?: number; // Zoom level from parent
  onZoomChange?: (zoom: number) => void; // Callback to update zoom in parent
  previewMode?: boolean; // If true, disable interactions and hide instructions
}

export function ParkingMap2D({ spaces, selectedSpaceId, onSpaceSelect, onSpaceDelete, onSpaceAdd, imageWidth, imageHeight, sourceImageUrl, zoom: parentZoom, onZoomChange, previewMode = false }: ParkingMap2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(parentZoom || 1);
  
  // Sync with parent zoom
  useEffect(() => {
    if (parentZoom !== undefined && parentZoom !== zoom) {
      // When zoom changes, adjust panOffset to maintain visual position
      const zoomRatio = parentZoom / zoom;
      setPanOffset(prev => ({
        x: prev.x * zoomRatio,
        y: prev.y * zoomRatio
      }));
      setZoom(parentZoom);
    }
  }, [parentZoom, zoom]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [pendingSpace, setPendingSpace] = useState<{ 
    bbox: [number, number, number, number]; 
    buttonPosition: { x: number; y: number };
  } | null>(null);
  const [showOriginalImage, setShowOriginalImage] = useState(previewMode); // Show image by default in preview mode
  const sourceImageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Pan state for dragging
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);

  /**
   * Get canvas size based on image dimensions
   */
  const getCanvasSize = () => {
    // If we have source image, use its natural dimensions
    if (sourceImageRef.current) {
      return { 
        width: sourceImageRef.current.naturalWidth || imageWidth || 800, 
        height: sourceImageRef.current.naturalHeight || imageHeight || 600 
      };
    }
    
    if (!imageWidth || !imageHeight) {
      // Fallback to default size
      return { width: 800, height: 600 };
    }
    
    // Use provided image dimensions
    return { width: imageWidth, height: imageHeight };
  };

  /**
   * Load source image when URL changes
   */
  useEffect(() => {
    if (sourceImageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        sourceImageRef.current = img;
        // Update image dimensions if not provided
        if (!imageWidth || !imageHeight) {
          // This will trigger a re-render with correct dimensions
          // But we can't update props, so we'll use the image's natural dimensions in drawMap
        }
        drawMap();
      };
      img.onerror = () => {
        console.error('Failed to load source image:', sourceImageUrl);
        sourceImageRef.current = null;
      };
      img.src = sourceImageUrl;
    } else {
      sourceImageRef.current = null;
    }
  }, [sourceImageUrl, imageWidth, imageHeight]);

  /**
   * Draw 2D map
   */
  const drawMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const hasDimensions = Boolean(imageWidth && imageHeight);
    const hasSourceImage = Boolean(sourceImageRef.current);
    if (!hasDimensions && !hasSourceImage) {
      return;
    }

    const ctx = canvas.getContext('2d')!;
    
    // Set canvas size to match image
    const canvasSize = getCanvasSize();
    if (canvas.width !== canvasSize.width || canvas.height !== canvasSize.height) {
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
    }

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Apply pan and zoom FIRST - so everything including image gets transformed
    // Simpler approach: zoom from center, then pan
    ctx.save();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Step 1: Move to center, scale, move back (zoom from center)
    ctx.translate(centerX, centerY);
    ctx.scale(zoom, zoom);
    ctx.translate(-centerX, -centerY);
    
    // Step 2: Apply pan (after zoom, so pan is in zoomed space)
    ctx.translate(panOffset.x, panOffset.y);

    // Draw background: original image or grid (AFTER zoom is applied)
    if (showOriginalImage && sourceImageRef.current) {
      // Draw original image as background (will be zoomed)
      ctx.drawImage(sourceImageRef.current, 0, 0, width, height);
    } else {
      // Draw grid background
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, width, height);

      // Draw grid
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      const gridSize = 20;
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    if (spaces.length === 0) {
      ctx.restore();
      return;
    }

    // Draw parking spaces using original coordinates (no normalization)
    spaces.forEach(space => {
      const [x, y, w, h] = space.bbox;

      // Box color with transparency when showing original image
      const isSelected = space.id === selectedSpaceId;
      const opacity = showOriginalImage ? 0.3 : 1.0; // Lower opacity when showing image
      const strokeOpacity = showOriginalImage ? Math.min(opacity + 0.3, 1.0) : 1.0; // Stroke more visible
      
      if (isSelected) {
        ctx.fillStyle = `rgba(59, 130, 246, ${opacity})`; // Blue with opacity
        ctx.strokeStyle = `rgba(15, 50, 150, ${strokeOpacity})`; // Darker, bolder blue for stroke
      } else {
        ctx.fillStyle = `rgba(16, 185, 129, ${opacity})`; // Green with opacity
        ctx.strokeStyle = `rgba(2, 100, 80, ${strokeOpacity})`; // Darker, bolder green for stroke
      }
      ctx.lineWidth = isSelected ? 5 : 4; // Thicker stroke for better visibility

      // Draw box (using original coordinates)
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);

      // Draw space number (with higher opacity for visibility)
      if (w > 30 && h > 20) {
        ctx.fillStyle = showOriginalImage ? 'rgba(255, 255, 255, 0.9)' : '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const spaceIndex = spaces.findIndex(s => s.id === space.id) + 1;
        ctx.fillText(
          `${spaceIndex}`,
          x + w / 2,
          y + h / 2
        );
      }

      // Draw confidence if space is large enough (with higher opacity for visibility)
      if (w > 50 && h > 30) {
        ctx.fillStyle = showOriginalImage ? 'rgba(255, 255, 255, 0.9)' : '#ffffff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${Math.round(space.confidence * 100)}%`,
          x + w / 2,
          y + h / 2 + 12
        );
      }
    });

    // Draw preview box when drawing new space or pending
    // Keep the same transform context as the main boxes
    if ((isDrawing && drawStart && drawCurrent) || pendingSpace) {
      // Don't restore yet - we're still in the transform context
      // The transform is already applied from above (pan + zoom)
      
      let x: number, y: number, width: number, height: number;
      
      if (pendingSpace) {
        // Draw pending space using original coordinates
        [x, y, width, height] = pendingSpace.bbox;
      } else if (drawStart && drawCurrent) {
        // drawStart and drawCurrent are already in original coordinates
        x = Math.min(drawStart.x, drawCurrent.x);
        y = Math.min(drawStart.y, drawCurrent.y);
        width = Math.abs(drawCurrent.x - drawStart.x);
        height = Math.abs(drawCurrent.y - drawStart.y);
      } else {
        ctx.restore();
        return;
      }
      
      // Preview box opacity - lower when showing original image
      const previewOpacity = showOriginalImage ? 0.8 : 1.0;
      const previewFillOpacity = showOriginalImage ? 0.2 : (pendingSpace ? 0.2 : 0.15);
      
      if (pendingSpace) {
        ctx.strokeStyle = `rgba(59, 130, 246, ${previewOpacity})`;
        ctx.fillStyle = `rgba(59, 130, 246, ${previewFillOpacity})`;
      } else {
        // Use bright cyan color for better visibility when dragging
        ctx.strokeStyle = `rgba(0, 200, 255, ${previewOpacity})`;
        ctx.fillStyle = `rgba(0, 200, 255, ${previewFillOpacity})`;
      }
      ctx.lineWidth = pendingSpace ? 3 : 3; // Thicker line for better visibility
      ctx.setLineDash(pendingSpace ? [] : [5, 5]);
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);
      ctx.setLineDash([]);
    }
    
    // Restore transform context after drawing everything
    ctx.restore();

  };

  // Redraw when spaces or selection changes
  useEffect(() => {
    drawMap();
  }, [spaces, selectedSpaceId, zoom, isDrawing, drawStart, drawCurrent, pendingSpace, imageWidth, imageHeight, showOriginalImage, panOffset]);

  // Handle wheel event with passive: false to prevent default scroll
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || previewMode) return;

    const handleWheel = (e: WheelEvent) => {
      // Only prevent default if mouse is over canvas
      if (canvas.contains(e.target as Node)) {
        e.preventDefault();
        e.stopPropagation();
        
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.5, Math.min(3, zoom * delta));
        setZoom(newZoom);
        if (onZoomChange) {
          onZoomChange(newZoom);
        }
      }
    };

    // Add event listener with passive: false to allow preventDefault
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [zoom, onZoomChange, previewMode]);


  // Handle canvas click - delete space
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Don't handle click if we just finished drawing
    if (isDrawing) return;
    
    // Don't cancel pending space on canvas click (user must use button)
    if (pendingSpace) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const { x: clickX, y: clickY } = mouseToImageCoords(e.clientX, e.clientY);

    // Check which space was clicked (using original coordinates)
    for (const space of spaces) {
      const [sx, sy, sw, sh] = space.bbox;

      if (clickX >= sx && clickX <= sx + sw && clickY >= sy && clickY <= sy + sh) {
        // Delete space on click
        if (onSpaceDelete) {
          onSpaceDelete(space.id);
        }
        if (onSpaceSelect) {
          onSpaceSelect(null);
        }
        return;
      }
    }

    // Click outside - deselect
    if (onSpaceSelect) {
      onSpaceSelect(null);
    }
  };

  // Handle confirm button click
  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('Confirm clicked!', pendingSpace);
    if (pendingSpace && onSpaceAdd) {
      console.log('Adding space:', pendingSpace.bbox);
      onSpaceAdd(pendingSpace.bbox);
      setPendingSpace(null);
    }
  };

  // Handle cancel button click
  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('Cancel clicked!');
    setPendingSpace(null);
  };

  // Helper function to convert mouse coordinates to image coordinates
  const mouseToImageCoords = (clientX: number, clientY: number): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Convert screen coordinates to canvas internal coordinates
    // Account for canvas display size vs internal size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Get mouse position relative to canvas element (in pixels)
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    
    // Convert to canvas internal coordinates
    const canvasX = mouseX * scaleX;
    const canvasY = mouseY * scaleY;
    
    // Reverse the transform applied in drawMap():
    // Transform order: translate(center), scale(zoom), translate(-center), translate(pan)
    // 
    // For a point P in image space, the canvas point is:
    // P_canvas = (P_image - center) * zoom + center + pan
    //
    // Reverse:
    // P_canvas - center - pan = (P_image - center) * zoom
    // (P_canvas - center - pan) / zoom = P_image - center
    // P_image = (P_canvas - center - pan) / zoom + center
    
    // First, subtract pan offset (applied last in transform)
    const afterPanX = canvasX - panOffset.x;
    const afterPanY = canvasY - panOffset.y;
    
    // Then reverse zoom and center translation
    const x = (afterPanX - centerX) / zoom + centerX;
    const y = (afterPanY - centerY) / zoom + centerY;
    
    return { x, y };
  };

  // Handle mouse down - start drawing or panning
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // Only left click
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { x, y } = mouseToImageCoords(e.clientX, e.clientY);

    // Check if clicking on existing space (using original coordinates)
    let clickedOnSpace = false;
    for (const space of spaces) {
      const [sx, sy, sw, sh] = space.bbox;

      if (x >= sx && x <= sx + sw && y >= sy && y <= sy + sh) {
        clickedOnSpace = true;
        break;
      }
    }

    if (clickedOnSpace) {
      // Don't start drawing/panning if clicking on space
      return;
    }

    // Start drawing new space (when Shift/Ctrl is held)
    if (e.shiftKey || e.ctrlKey) {
      setIsDrawing(true);
      setDrawStart({ x, y });
      setDrawCurrent({ x, y });
    } else {
      // Start panning (drag without modifier keys)
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  // Handle mouse move - update drawing or panning
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDrawing && drawStart) {
      // Update drawing preview
      const { x, y } = mouseToImageCoords(e.clientX, e.clientY);
      setDrawCurrent({ x, y });
      drawMap();
    } else if (isPanning && panStart) {
      // Update pan offset - convert screen delta to canvas coordinates
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const deltaX = (e.clientX - panStart.x) * scaleX;
      const deltaY = (e.clientY - panStart.y) * scaleY;
      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  // Handle mouse up - finish drawing or panning
  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
    }
    
    if (isDrawing && drawStart && drawCurrent) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Calculate box coordinates (already in original image coordinates)
      const x = Math.min(drawStart.x, drawCurrent.x);
      const y = Math.min(drawStart.y, drawCurrent.y);
      const width = Math.abs(drawCurrent.x - drawStart.x);
      const height = Math.abs(drawCurrent.y - drawStart.y);

      // Only show confirm if box is large enough
      if (width > 10 && height > 10) {
        // Calculate button position (center below the box)
        const containerRect = containerRef.current?.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        if (containerRect && canvasRect) {
          // Position button at center bottom of the drawn box in image coordinates
          const boxCenterX = x + width / 2;
          const boxBottomY = y + height + 20; // 20px below box
          
          // Convert image coordinates to screen coordinates
          // Apply the same transform as in drawMap: translate(center), scale(zoom), translate(-center), translate(pan)
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          
          // Transform: (boxCenterX - centerX) * zoom + centerX + panOffset
          const transformedX = (boxCenterX - centerX) * zoom + centerX + panOffset.x;
          const transformedY = (boxBottomY - centerY) * zoom + centerY + panOffset.y;
          
          // Convert canvas coordinates to screen coordinates (account for display scaling)
          const scaleX = canvasRect.width / canvas.width;
          const scaleY = canvasRect.height / canvas.height;
          const screenX = transformedX * scaleX;
          const screenY = transformedY * scaleY;
          
          // Convert to container-relative coordinates
          const buttonX = screenX + (canvasRect.left - containerRect.left);
          const buttonY = screenY + (canvasRect.top - containerRect.top);
          
          // Ensure buttons are visible within viewport
          const buttonWidth = 180; // Approximate width of both buttons
          const buttonHeight = 40; // Approximate height
          const padding = 10;
          
          // Clamp to viewport bounds
          const clampedX = Math.max(
            padding,
            Math.min(buttonX - buttonWidth / 2, containerRect.width - buttonWidth - padding)
          );
          const clampedY = Math.max(
            padding,
            Math.min(buttonY, containerRect.height - buttonHeight - padding)
          );

          console.log('Setting pending space:', { bbox: [x, y, width, height] });
          setPendingSpace({
            bbox: [x, y, width, height],
            buttonPosition: { x: clampedX, y: clampedY }
          });
        }
      }
    }

    setIsDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);
  };

  // Reset zoom to 1.0
  const handleResetZoom = () => {
    const newZoom = 1;
    setZoom(newZoom);
    if (onZoomChange) {
      onZoomChange(newZoom);
    }
  };

  // Calculate button position for pending space
  const getButtonPosition = () => {
    if (!pendingSpace) return null;
    
    const containerRect = containerRef.current?.getBoundingClientRect();
    const canvas = canvasRef.current;
    const canvasRect = canvas?.getBoundingClientRect();
    
    if (!containerRect || !canvasRect || !canvas) {
      return null;
    }
    
    const [x, y, width, height] = pendingSpace.bbox;
    const boxCenterX = x + width / 2;
    const boxBottomY = y + height + 20;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    const transformedX = (boxCenterX - centerX) * zoom + centerX + panOffset.x;
    const transformedY = (boxBottomY - centerY) * zoom + centerY + panOffset.y;
    
    const scaleX = canvasRect.width / canvas.width;
    const scaleY = canvasRect.height / canvas.height;
    const screenX = transformedX * scaleX;
    const screenY = transformedY * scaleY;
    
    const buttonX = screenX + (canvasRect.left - containerRect.left);
    const buttonY = screenY + (canvasRect.top - containerRect.top);
    
    const buttonWidth = 180;
    const buttonHeight = 40;
    const padding = 10;
    
    const clampedX = Math.max(
      padding,
      Math.min(buttonX - buttonWidth / 2, containerRect.width - buttonWidth - padding)
    );
    const clampedY = Math.max(
      padding,
      Math.min(buttonY, containerRect.height - buttonHeight - padding)
    );
    
    return { x: clampedX, y: clampedY };
  };

  return (
    <div className="w-full h-full" ref={containerRef}>
      {/* Instructions at top - Centered (only show if not in preview mode) */}
      {!previewMode && (
        <div className="mb-2 px-2 text-xs text-gray-600 flex justify-center gap-4">
          <span>🖱️ Click space to delete</span>
          <span>🖱️ Shift+Drag to add space</span>
          <span>🔍 Scroll to zoom</span>
        </div>
      )}
      
      {/* Buttons row - aligned with Change Image (only show if not in preview mode) */}
      {!previewMode && (
        <div className="mb-1 px-2 flex justify-center gap-2">
          {sourceImageUrl && (
            <button
              onClick={() => setShowOriginalImage(!showOriginalImage)}
              className={`px-3 py-1 text-xs rounded transition ${
                showOriginalImage
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title={showOriginalImage ? "Hide original image" : "Show original image with boxes overlay"}
            >
              {showOriginalImage ? '🖼️ Hide Image' : '🖼️ Show Image'}
            </button>
          )}
          <button
            onClick={handleResetZoom}
            disabled={zoom === 1}
            className={`px-3 py-1 text-xs rounded transition ${
              zoom === 1
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title="Reset zoom to 100%"
          >
            🔍 Reset View
          </button>
        </div>
      )}
      <div className="overflow-visible bg-white relative w-full flex-1 flex items-start justify-center min-h-0">
        <canvas
          ref={canvasRef}
          className={`w-full h-full ${previewMode ? 'cursor-default' : 'cursor-pointer'}`}
          style={{ 
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            pointerEvents: previewMode ? 'none' : 'auto'
          }}
          onClick={previewMode ? undefined : handleClick}
          onMouseDown={previewMode ? undefined : handleMouseDown}
          onMouseMove={previewMode ? undefined : handleMouseMove}
          onMouseUp={previewMode ? undefined : handleMouseUp}
          onMouseLeave={previewMode ? undefined : () => {
            setIsDrawing(false);
            setDrawStart(null);
            setDrawCurrent(null);
            setIsPanning(false);
            setPanStart(null);
          }}
        />
        {spaces.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-2">🗺️</div>
              <p>No spaces detected yet</p>
            </div>
          </div>
        )}
        
        {/* Confirm Button - Positioned below the drawn box */}
        {pendingSpace && (() => {
          const buttonPos = getButtonPosition();
          if (!buttonPos) return null;
          
          return (
            <div
              key={`button-${zoom}-${panOffset.x}-${panOffset.y}`}
              className="absolute z-50 bg-white border-2 border-green-500 rounded-lg shadow-xl p-2 flex items-center gap-2"
              style={{
                left: `${buttonPos.x}px`,
                top: `${buttonPos.y}px`,
                transform: 'translateX(-50%)', // Center horizontally
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={handleConfirm}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                className="px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition text-sm font-bold cursor-pointer flex items-center gap-1"
                title="Confirm"
              >
                <span>✓</span>
                <span>Confirm</span>
              </button>
              <button
                type="button"
                onClick={handleCancel}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                className="px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm font-bold cursor-pointer flex items-center gap-1"
                title="Cancel"
              >
                <span>✕</span>
                <span>Cancel</span>
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

