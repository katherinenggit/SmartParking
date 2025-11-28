import {
  addDoc,
  collection,
  doc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export type StreamStatus = 'starting' | 'active' | 'ended' | 'error';

export interface StreamSession {
  id: string;
  ownerId: string;
  parkingId: string;
  cameraId: string;
  roomId: string;
  sourceType: 'camera' | 'video';
  videoFileName?: string | null;
  startedAt: Timestamp;
  endedAt?: Timestamp | null;
  status: StreamStatus;
}

const STREAM_COLLECTION = 'streamSessions';

export async function createStreamSession(options: {
  ownerId: string;
  parkingId: string;
  cameraId: string;
  roomId: string;
  sourceType: 'camera' | 'video';
  videoFileName?: string | null;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!db) {
      throw new Error('Firestore database is not initialized.');
    }

    const docRef = await addDoc(collection(db, STREAM_COLLECTION), {
      ownerId: options.ownerId,
      parkingId: options.parkingId,
      cameraId: options.cameraId,
      roomId: options.roomId,
      sourceType: options.sourceType,
      videoFileName: options.videoFileName ?? null,
      startedAt: Timestamp.now(),
      endedAt: null,
      status: 'starting' as StreamStatus,
    });

    console.log('✅ Stream session created:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to create stream session:', message);
    return { success: false, error: message };
  }
}

export async function updateStreamSessionStatus(
  id: string,
  status: StreamStatus,
): Promise<void> {
  try {
    if (!db) {
      throw new Error('Firestore database is not initialized.');
    }
    const ref = doc(db, STREAM_COLLECTION, id);
    await updateDoc(ref, {
      status,
      // chỉ set endedAt khi stream kết thúc hoặc lỗi
      ...(status === 'ended' || status === 'error'
        ? { endedAt: Timestamp.now() }
        : {}),
    });
    console.log(`✅ Stream session ${id} updated to ${status}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to update stream session status:', message);
  }
}


