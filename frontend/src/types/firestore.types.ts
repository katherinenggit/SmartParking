import { Timestamp } from 'firebase/firestore';

/**
 * Detection Result trong Firestore
 */
export interface DetectionRecord {
  id: string;
  timestamp: Timestamp;
  vehicleCount: number;
  vehicles: {
    type: string;    // 'car', 'truck', etc
    confidence: number;
    bbox: [number, number, number, number];
  }[];
  cameraId: string;
}