import axios from 'axios';

/**
 * Detection Result từ Roboflow AI
 */
export interface Detection {
  class: string;      // 'available', 'occupied', etc.
  score: number;      // Confidence 0-1
  bbox: [number, number, number, number]; // [x, y, width, height]
}

/**
 * Roboflow API Response
 */
interface RoboflowPrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
}

/**
 * AI Detection Service using Roboflow
 */
class AIDetectionService {
  private apiKey: string;
  private modelId: string;
  private modelVersion: string;
  private apiUrl: string;
  private modelLoaded: boolean = false;
  
  constructor() {
    this.apiKey = import.meta.env.VITE_ROBOFLOW_API_KEY || '';
    this.modelId = import.meta.env.VITE_ROBOFLOW_MODEL_ID || 'deteksiparkirkosong';
    this.modelVersion = import.meta.env.VITE_ROBOFLOW_MODEL_VERSION || '6';
    this.apiUrl = `https://detect.roboflow.com/${this.modelId}/${this.modelVersion}`;
  }
  
  /**
   * Load AI model (check credentials)
   */
  async loadModel(): Promise<void> {
    if (this.modelLoaded) return;
    
    if (!this.apiKey || this.apiKey === 'YOUR_ROBOFLOW_API_KEY_HERE') {
      throw new Error('❌ Roboflow API Key not configured! Please add VITE_ROBOFLOW_API_KEY to env.local');
    }
    
    console.log('🤖 Roboflow Model Ready!');
    console.log(`📦 Model: ${this.modelId} v${this.modelVersion}`);
    this.modelLoaded = true;
  }
  
  /**
   * Convert video/image to base64
   */
  private toBase64(source: HTMLVideoElement | HTMLImageElement): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // Get dimensions
    const width = source instanceof HTMLVideoElement 
      ? source.videoWidth 
      : source.naturalWidth;
    const height = source instanceof HTMLVideoElement 
      ? source.videoHeight 
      : source.naturalHeight;
    
    canvas.width = width;
    canvas.height = height;
    
    // Draw image
    ctx.drawImage(source, 0, 0, width, height);
    
    // Convert to base64 (remove data:image/jpeg;base64, prefix)
    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
  }
  
  /**
   * Detect parking spaces trong image/video frame
   */
  async detectVehicles(
    source: HTMLVideoElement | HTMLImageElement
  ): Promise<Detection[]> {
    if (!this.modelLoaded) {
      throw new Error('Model not loaded! Call loadModel() first.');
    }
    
    try {
      // Convert to base64
      const base64Image = this.toBase64(source);
      
      // Call Roboflow API
      const response = await axios.post(
        this.apiUrl,
        base64Image,
        {
          params: {
            api_key: this.apiKey,
            confidence: 40, // Min confidence threshold (%)
            overlap: 30     // Non-max suppression threshold (%)
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 5000 // 5 second timeout
        }
      );
      
      const predictions: RoboflowPrediction[] = response.data.predictions || [];
      
      // Convert Roboflow format to our format
      return predictions.map(p => ({
        class: p.class,
        score: p.confidence,
        bbox: [
          p.x - p.width / 2,  // Convert center x to top-left x
          p.y - p.height / 2, // Convert center y to top-left y
          p.width,
          p.height
        ] as [number, number, number, number]
      }));
      
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          console.warn('⚠️ Detection timeout (slow network)');
        } else if (error.response?.status === 401) {
          console.error('❌ Invalid Roboflow API Key!');
        } else {
          console.error('❌ Roboflow API Error:', error.message);
        }
      }
      
      // Return empty array on error (don't crash)
      return [];
    }
  }
}

// Export singleton instance
export const aiDetection = new AIDetectionService();
