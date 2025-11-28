import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  Timestamp,
  setDoc,
  getDoc,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Detection } from './ai/aiDetection';
import { createAlertsForDetections } from './alertService';

export interface SavedSpace {
  id: string;
  bbox: [number, number, number, number];
  confidence: number;
}

export interface DetectionRecord {
  id: string;
  timestamp: Timestamp;
  ownerId: string;
  vehicleCount: number;
  vehicles: {
    type: string;
    confidence: number;
    bbox: [number, number, number, number];
  }[];
  cameraId: string;
  parkingId: string;
  parkingName?: string | null;
  inputImageUrl?: string | null;
  spaces?: SavedSpace[];
  updateCount?: number;
}

interface SaveDetectionOptions {
  ownerId: string;
  parkingId: string;
}

const DETECTION_COLLECTION = 'detections';

const buildDocId = (ownerId: string, cameraId: string) => `${ownerId}__${cameraId}`;

/**
 * Save or update detection results to Firestore (only latest per camera per owner)
 */
export async function saveDetectionRecord(
  vehicles: Detection[],
  cameraId: string,
  inputImageUrl: string | undefined,
  spaces: SavedSpace[] | undefined,
  options: SaveDetectionOptions,
): Promise<{ success: boolean; error?: string; docId?: string; alertsCreated?: number }> {
  try {
    if (!db) {
      throw new Error('Firestore database is not initialized. Check Firebase config.');
    }
    if (!options?.ownerId) {
      throw new Error('Owner ID is required to save detections.');
    }
    if (!vehicles || vehicles.length === 0) {
      return { success: false, error: 'No vehicles to save' };
    }

    const docId = buildDocId(options.ownerId, cameraId);
    const docRef = doc(db, DETECTION_COLLECTION, docId);
    const existingDoc = await getDoc(docRef);
    const currentUpdateCount = existingDoc.exists() ? existingDoc.data().updateCount || 0 : 0;

    await setDoc(
      docRef,
      {
        timestamp: Timestamp.now(),
        ownerId: options.ownerId,
        vehicleCount: vehicles.length,
        vehicles: vehicles.map((v) => ({
          type: v.class || 'parking_space',
          confidence: v.score || 0,
          bbox: v.bbox || [0, 0, 0, 0],
        })),
        cameraId,
        parkingId: options.parkingId,
        parking: options.parkingId, // backward compatibility
        inputImageUrl: inputImageUrl || null,
        spaces:
          spaces ||
          vehicles.map((v, i) => ({
            id: `space-${Date.now()}-${i}`,
            bbox: v.bbox || [0, 0, 0, 0],
            confidence: v.score || 0,
          })),
        updateCount: currentUpdateCount + 1,
      },
      { merge: false },
    );

    let alertsCreated = 0;
    try {
      const alertResult = await createAlertsForDetections({
        ownerId: options.ownerId,
        cameraId,
        parkingId: options.parkingId,
        vehicles,
      });
      alertsCreated = alertResult.created;
    } catch (alertError) {
      console.error('⚠️ Failed to create parking alerts:', alertError);
    }

    return { success: true, docId, alertsCreated };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to save detection:', errorMessage, error);
    if (errorMessage.includes('permission') || errorMessage.includes('PERMISSION_DENIED')) {
      return { success: false, error: 'Permission denied. Check Firestore security rules.' };
    }
    if (errorMessage.includes('network') || errorMessage.includes('NETWORK')) {
      return { success: false, error: 'Network error. Check your internet connection.' };
    }
    if (errorMessage.includes('quota') || errorMessage.includes('QUOTA')) {
      return { success: false, error: 'Firestore quota exceeded. Check Firebase billing.' };
    }
    return { success: false, error: errorMessage };
  }
}

export async function fetchDetections(options: {
  limitCount?: number;
  ownerId?: string;
} = {}): Promise<{ success: boolean; data?: DetectionRecord[]; error?: string }> {
  try {
    if (!db) {
      throw new Error('Firestore database is not initialized.');
    }

    const constraints = [];
    const applyClientSortAndLimit = !!options.ownerId;

    if (options.ownerId) {
      constraints.push(where('ownerId', '==', options.ownerId));
    } else {
      constraints.push(orderBy('timestamp', 'desc'));
      if (options.limitCount && options.limitCount > 0) {
        constraints.push(limit(options.limitCount));
      }
    }

    const q = query(collection(db, DETECTION_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);
    let records: DetectionRecord[] = querySnapshot.docs.map(
      (docSnap) =>
        ({
          id: docSnap.id,
          ...docSnap.data(),
        }) as DetectionRecord,
    );

    if (applyClientSortAndLimit) {
      records = records
        .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())
        .slice(0, options.limitCount && options.limitCount > 0 ? options.limitCount : records.length);
    }

    return { success: true, data: records };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to fetch detections:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

export async function fetchLatestDetections(options: {
  ownerId?: string;
} = {}): Promise<{ success: boolean; data?: DetectionRecord[]; error?: string }> {
  try {
    if (!db) {
      throw new Error('Firestore database is not initialized.');
    }

    const constraints = [];
    const applyClientSort = !!options.ownerId;

    if (options.ownerId) {
      constraints.push(where('ownerId', '==', options.ownerId));
    } else {
      constraints.push(orderBy('timestamp', 'desc'));
    }

    const q = query(collection(db, DETECTION_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);
    let records: DetectionRecord[] = querySnapshot.docs.map(
      (docSnap) =>
        ({
          id: docSnap.id,
          ...docSnap.data(),
        }) as DetectionRecord,
    );

    if (applyClientSort) {
      records = records.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
    }

    return { success: true, data: records };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to fetch detections:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
/**
 * Update detection record for a specific camera
 */
export async function fetchDetectionByCamera(ownerId: string, cameraId: string): Promise<DetectionRecord | null> {
  if (!ownerId) return null;
  const docId = buildDocId(ownerId, cameraId);
  const docRef = doc(db, DETECTION_COLLECTION, docId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) {
    return null;
  }
  return { id: docId, ...snapshot.data() } as DetectionRecord;
}

export async function updateDetectionRecord(
  docId: string,
  spaces: SavedSpace[],
  inputImageUrl?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!db) {
      throw new Error('Firestore database is not initialized.');
    }

    const docRef = doc(db, DETECTION_COLLECTION, docId);
    const existingDoc = await getDoc(docRef);
    
    if (!existingDoc.exists()) {
      return { success: false, error: 'Camera record not found' };
    }

    const currentData = existingDoc.data();
    
    await setDoc(docRef, {
      ...currentData,
      timestamp: Timestamp.now(),
      vehicleCount: spaces.length,
      vehicles: spaces.map(s => ({
        type: 'parking_space',
        confidence: s.confidence,
        bbox: s.bbox
      })),
      spaces,
      inputImageUrl: inputImageUrl !== undefined ? inputImageUrl : currentData.inputImageUrl,
      updateCount: (currentData.updateCount || 0) + 1
    }, { merge: false });
    
    console.log(`✅ Updated detection: ${docId}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to update detection:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Delete a single detection record by ID
 */
export async function deleteDetection(
  docId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!db) {
      throw new Error('Firestore database is not initialized.');
    }

    await deleteDoc(doc(db, DETECTION_COLLECTION, docId));
    console.log(`✅ Deleted detection: ${docId}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to delete detection:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Delete all detection records
 */
export async function deleteAllDetections(ownerId: string): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
  try {
    console.log('🗑️ Starting delete operation...');
    
    if (!db) {
      const error = 'Firestore database is not initialized. Check Firebase config.';
      console.error('❌', error);
      return { success: false, error };
    }

    if (!ownerId) {
      return { success: false, error: 'Owner ID is required' };
    }

    console.log('📋 Fetching documents from Firestore...');
    const q = query(collection(db, DETECTION_COLLECTION), where('ownerId', '==', ownerId));
    const querySnapshot = await getDocs(q);
    const totalDocs = querySnapshot.docs.length;
    
    console.log(`📊 Found ${totalDocs} documents to delete`);
    
    if (totalDocs === 0) {
      console.log('ℹ️ No documents to delete');
      return { success: true, deletedCount: 0 };
    }
    
    console.log('🗑️ Deleting documents...');
    const deletePromises = querySnapshot.docs.map((docSnap, index) => {
      console.log(`  - Deleting document ${index + 1}/${totalDocs}: ${docSnap.id}`);
      return deleteDoc(doc(db, DETECTION_COLLECTION, docSnap.id));
    });
    
    console.log('⏳ Waiting for all deletions to complete...');
    await Promise.all(deletePromises);
    
    console.log(`✅ Successfully deleted ${totalDocs} detection records`);
    return { success: true, deletedCount: totalDocs };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    
    console.error('❌ Failed to delete all detections:', errorMessage);
    console.error('❌ Error details:', errorDetails);
    
    // Check for specific error types
    if (errorMessage.includes('permission') || errorMessage.includes('PERMISSION_DENIED')) {
      return { 
        success: false, 
        error: 'Permission denied. Check Firestore security rules. You need write permission to delete documents.' 
      };
    }
    if (errorMessage.includes('network') || errorMessage.includes('NETWORK')) {
      return { 
        success: false, 
        error: 'Network error. Check your internet connection.' 
      };
    }
    if (errorMessage.includes('quota') || errorMessage.includes('QUOTA')) {
      return { 
        success: false, 
        error: 'Firestore quota exceeded. Check Firebase billing.' 
      };
    }
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Download detections as JSON file
 */
export function downloadDetectionsAsJSON(records: DetectionRecord[]): void {
  try {
    // Convert Timestamp to ISO string for JSON
    const jsonData = records.map(record => ({
      ...record,
      timestamp: record.timestamp.toDate().toISOString()
    }));
    
    const jsonString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `detections_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log(`✅ Downloaded ${records.length} records as JSON`);
  } catch (error) {
    console.error('❌ Failed to download JSON:', error);
    alert('Failed to download data. Check console for details.');
  }
}