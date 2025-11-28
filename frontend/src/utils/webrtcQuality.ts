/**
 * WebRTC Quality Optimization Utilities
 * Hàm helper để tối ưu chất lượng video trong WebRTC streaming
 */

/**
 * Cấu hình video sender với chất lượng cao
 * @param pc RTCPeerConnection instance
 */
export async function optimizeVideoQuality(pc: RTCPeerConnection): Promise<void> {
  try {
    const senders = pc.getSenders();
    
    for (const sender of senders) {
      if (sender.track?.kind === 'video') {
        let params = sender.getParameters();
        
        // Đảm bảo có encodings
        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}];
        }
        
        // Cấu hình bitrate cao để đảm bảo chất lượng
        // Max bitrate: 8 Mbps (đủ cho 1080p@30fps)
        // Min bitrate: 2 Mbps (đảm bảo chất lượng tối thiểu)
        params.encodings[0].maxBitrate = 8_000_000; // 8 Mbps
        params.encodings[0].minBitrate = 2_000_000; // 2 Mbps
        params.encodings[0].maxFramerate = 60; // Hỗ trợ tối đa 60fps
        
        // Ưu tiên giữ resolution thay vì giảm bitrate
        // @ts-ignore - degradationPreference không có trong type definition nhưng được hỗ trợ
        params.degradationPreference = 'maintain-resolution';
        
        // Nếu có nhiều encoding layers (Simulcast/SVC), cấu hình cho cả layers
        if (params.encodings.length > 1) {
          for (let i = 1; i < params.encodings.length; i++) {
            params.encodings[i].maxBitrate = params.encodings[0].maxBitrate / (i + 1);
            params.encodings[i].minBitrate = params.encodings[0].minBitrate / (i + 1);
          }
        }
        
        await sender.setParameters(params);
        console.log('✅ Video quality optimized:', {
          maxBitrate: params.encodings[0].maxBitrate,
          minBitrate: params.encodings[0].minBitrate,
          maxFramerate: params.encodings[0].maxFramerate,
        });
      }
    }
  } catch (error) {
    console.warn('⚠️ Failed to optimize video quality (non-critical):', error);
  }
}

/**
 * Cấu hình video track với content hint để tối ưu encoding
 * @param track MediaStreamTrack
 */
export function optimizeVideoTrack(track: MediaStreamTrack): void {
  if (track.kind === 'video' && 'contentHint' in track) {
    try {
      // @ts-ignore - contentHint không có trong type definition nhưng được hỗ trợ
      track.contentHint = 'motion'; // Ưu tiên chất lượng cho video chuyển động
    } catch (error) {
      // Browser không hỗ trợ contentHint, bỏ qua
    }
  }
}

/**
 * Tạo RTCPeerConnection với codec preferences cho chất lượng cao
 * @param iceServers ICE servers configuration
 * @returns Configured RTCPeerConnection
 */
export function createHighQualityPeerConnection(iceServers: RTCIceServer[]): RTCPeerConnection {
  const pc = new RTCPeerConnection({
    iceServers,
    // Cấu hình bổ sung có thể thêm ở đây nếu cần
  });
  
  return pc;
}

/**
 * Thêm codec preferences vào offer/answer để ưu tiên codec chất lượng cao
 * @param sdp SDP string
 * @returns Modified SDP string với codec preferences
 */
export function prioritizeHighQualityCodecs(sdp: string): string {
  let modifiedSdp = sdp;
  
  // Ưu tiên codec theo thứ tự:
  // 1. VP9 (tốt nhất về nén và chất lượng)
  // 2. H.264 High Profile (tương thích tốt, chất lượng cao)
  // 3. VP8 (fallback)
  
  // Tìm và sắp xếp lại video codec trong SDP
  const codecPreferences = [
    'VP9',    // Ưu tiên VP9 (chất lượng cao nhất)
    'H264',   // H.264 High Profile
    'VP8',    // VP8 fallback
  ];
  
  // Phân tích SDP để log codec được sử dụng
  const lines = modifiedSdp.split('\r\n');
  let inVideoSection = false;
  const codecs: string[] = [];
  
  for (const line of lines) {
    if (line.startsWith('m=video')) {
      inVideoSection = true;
      continue;
    }
    
    if (line.startsWith('m=')) {
      inVideoSection = false;
      continue;
    }
    
    if (inVideoSection && line.startsWith('a=rtpmap:')) {
      const payloadMatch = line.match(/^a=rtpmap:\d+\s+(.+?)\//);
      if (payloadMatch) {
        const codecName = payloadMatch[1].toUpperCase();
        if (!codecs.includes(codecName)) {
          codecs.push(codecName);
        }
      }
    }
  }
  
  // Log codec được phát hiện (browser sẽ tự chọn codec tốt nhất)
  if (codecs.length > 0) {
    console.log('📹 Video codecs available:', codecs.join(', '));
  }
  
  return modifiedSdp;
}

function getCodecPriority(codecName: string): number {
  const upper = codecName.toUpperCase();
  if (upper.includes('VP9')) return 0;
  if (upper.includes('H264')) return 1;
  if (upper.includes('VP8')) return 2;
  return 99;
}

/**
 * Tạo offer với codec preferences
 * @param pc RTCPeerConnection
 * @returns RTCSessionDescriptionInit với codec ưu tiên
 */
export async function createHighQualityOffer(pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
  // Tạo offer với codec preferences
  const offer = await pc.createOffer({
    offerToReceiveAudio: false,
    offerToReceiveVideo: false,
  });
  
  // Ưu tiên codec chất lượng cao trong SDP
  if (offer.sdp) {
    offer.sdp = prioritizeHighQualityCodecs(offer.sdp);
  }
  
  return offer;
}

/**
 * Cấu hình video constraints cho camera với chất lượng cao
 */
export const HIGH_QUALITY_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1920, max: 1920 },
  height: { ideal: 1080, max: 1080 },
  frameRate: { ideal: 30, max: 60 },
  facingMode: 'environment', // Ưu tiên camera sau (thường chất lượng cao hơn)
};

/**
 * Cấu hình video constraints cho camera với chất lượng trung bình (fallback)
 */
export const MEDIUM_QUALITY_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280, max: 1920 },
  height: { ideal: 720, max: 1080 },
  frameRate: { ideal: 30, max: 60 },
};

/**
 * Tối ưu video element để hiển thị với chất lượng tốt nhất
 * @param videoElement HTMLVideoElement
 */
export function optimizeVideoElement(videoElement: HTMLVideoElement): void {
  // Đảm bảo video không bị blur do scaling
  videoElement.style.imageRendering = 'high-quality';
  
  // Tắt các tối ưu có thể làm giảm chất lượng
  // @ts-ignore - một số thuộc tính có thể không có trong type definition
  if ('disablePictureInPicture' in videoElement) {
    // @ts-ignore
    videoElement.disablePictureInPicture = true;
  }
  
  // Đảm bảo video được render với chất lượng cao
  videoElement.playsInline = true;
  videoElement.muted = false; // Cho phép audio nếu có
  
  console.log('✅ Video element optimized for high quality playback');
}

/**
 * Tạo answer với codec preferences (viewer side)
 * @param pc RTCPeerConnection
 * @param offer RTCSessionDescriptionInit từ host
 * @returns RTCSessionDescriptionInit answer
 */
export async function createHighQualityAnswer(
  pc: RTCPeerConnection,
  offer: RTCSessionDescriptionInit
): Promise<RTCSessionDescriptionInit> {
  // Set remote description trước
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  
  // Tạo answer
  const answer = await pc.createAnswer({
    offerToReceiveAudio: false,
    offerToReceiveVideo: true,
  });
  
  // Log codec được sử dụng (browser tự chọn từ offer của host)
  if (answer.sdp) {
    prioritizeHighQualityCodecs(answer.sdp);
  }
  
  return answer;
}
