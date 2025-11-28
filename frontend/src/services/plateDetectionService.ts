import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit as fbLimit,
  getDocs,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION = 'plateDetections';

export interface PlateDetectionRecord {
  id: string;
  ownerId: string;
  parkingId: string;
  cameraId: string;
  plateText: string;
  confidence: number;
  inputImageUrl: string;
  annotatedImageUrl?: string;
  rawResponse?: unknown;
  createdAt: Date;
}

export interface SavePlateDetectionPayload {
  ownerId: string;
  parkingId: string;
  cameraId: string;
  plateText: string;
  confidence: number;
  inputImageUrl: string;
  annotatedImageUrl?: string;
  rawResponse?: unknown;
}

export async function savePlateDetection(payload: SavePlateDetectionPayload) {
  try {
    // Filter out undefined values - Firebase doesn't accept undefined
    const firestoreData: Record<string, unknown> = {
      ownerId: payload.ownerId,
      parkingId: payload.parkingId,
      cameraId: payload.cameraId,
      plateText: payload.plateText,
      confidence: payload.confidence,
      inputImageUrl: payload.inputImageUrl,
      createdAt: serverTimestamp(),
    };
    
    // Only add optional fields if they are defined
    if (payload.annotatedImageUrl !== undefined) {
      firestoreData.annotatedImageUrl = payload.annotatedImageUrl;
    }
    if (payload.rawResponse !== undefined) {
      firestoreData.rawResponse = payload.rawResponse;
    }
    
    const docRef = await addDoc(collection(db, COLLECTION), firestoreData);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Failed to save plate detection', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

interface FetchOptions {
  ownerId: string;
  limit?: number;
  cameraId?: string;
  parkingId?: string;
}

export async function fetchPlateDetections(options: FetchOptions) {
  try {
    const constraints = [
      where('ownerId', '==', options.ownerId),
      orderBy('createdAt', 'desc'),
    ];
    if (options.cameraId) {
      constraints.push(where('cameraId', '==', options.cameraId));
    }
    if (options.parkingId) {
      constraints.push(where('parkingId', '==', options.parkingId));
    }
    if (options.limit) {
      constraints.push(fbLimit(options.limit));
    }

    const snapshot = await getDocs(query(collection(db, COLLECTION), ...constraints));
    const data: PlateDetectionRecord[] = [];
    snapshot.forEach((docSnap) => {
      const raw = docSnap.data();
      data.push({
        id: docSnap.id,
        ownerId: raw.ownerId,
        parkingId: raw.parkingId,
        cameraId: raw.cameraId,
        plateText: raw.plateText,
        confidence: raw.confidence,
        inputImageUrl: raw.inputImageUrl,
        annotatedImageUrl: raw.annotatedImageUrl,
        rawResponse: raw.rawResponse,
        createdAt: raw.createdAt?.toDate?.() ?? new Date(),
      });
    });
    return { success: true, data };
  } catch (error) {
    console.error('Failed to fetch plate detections', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function deletePlateDetection(id: string) {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    return { success: true };
  } catch (error) {
    console.error('Failed to delete plate detection', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

