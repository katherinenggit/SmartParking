import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  doc,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Detection } from './ai/aiDetection';
import { detectParkingViolations } from '../config/parkingRules';

export interface ParkingAlert {
  id: string;
  ownerId: string;
  cameraId: string;
  parkingId?: string | null;
  parkingName?: string | null;
  timestamp: Timestamp;
  violationType: 'OUT_OF_ZONE' | 'RESTRICTED_ZONE';
  vehicleBox: [number, number, number, number];
  message: string;
  resolved: boolean;
}

interface CreateAlertOptions {
  ownerId: string;
  cameraId: string;
  parkingId?: string;
  vehicles: Detection[];
}

export async function createAlertsForDetections({
  ownerId,
  cameraId,
  parkingId,
  vehicles,
}: CreateAlertOptions): Promise<{ success: boolean; created: number }> {
  if (!db) {
    return { success: false, created: 0 };
  }

  const violations = detectParkingViolations(cameraId, vehicles);
  if (violations.length === 0) {
    return { success: true, created: 0 };
  }

  const alertsCollection = collection(db, 'parkingAlerts');
  const operations = violations.map((violation) =>
    addDoc(alertsCollection, {
      ownerId,
      cameraId,
      parkingId: parkingId || null,
      timestamp: Timestamp.now(),
      violationType: violation.violationType,
      vehicleBox: violation.vehicleBox,
      message: violation.message,
      resolved: false,
    }),
  );

  await Promise.all(operations);
  console.warn(`🚨 ${violations.length} parking alerts created for ${cameraId}`);
  return { success: true, created: violations.length };
}

export async function fetchParkingAlerts(
  options: { includeResolved?: boolean; limitCount?: number; ownerId?: string } = {},
): Promise<ParkingAlert[]> {
  const includeResolved = options.includeResolved ?? false;
  const ownerId = options.ownerId;
  const limitCount = options.limitCount ?? 50;

  const filters = [];
  if (!includeResolved) {
    filters.push(where('resolved', '==', false));
  }
  if (ownerId) {
    filters.push(where('ownerId', '==', ownerId));
  }

  const alertsQuery = query(collection(db, 'parkingAlerts'), ...filters);
  const snapshot = await getDocs(alertsQuery);
  const alerts = snapshot.docs
    .map(
      (docSnap) =>
        ({
          id: docSnap.id,
          ...docSnap.data(),
        }) as ParkingAlert,
    )
    .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())
    .slice(0, limitCount);

  return alerts;
}

export async function resolveParkingAlert(alertId: string): Promise<void> {
  const ref = doc(db, 'parkingAlerts', alertId);
  await updateDoc(ref, {
    resolved: true,
    resolvedAt: Timestamp.now(),
  });
}

