import { doc, getDoc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import emailjs from '@emailjs/browser';
import { db } from '../config/firebase';

const OTP_COLLECTION = 'adminOtps';
const OTP_TTL_MINUTES = 10;

const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

const encoder = new TextEncoder();

async function hashOtp(code: string): Promise<string> {
  if (!crypto || !crypto.subtle) {
    throw new Error('Web Crypto API is not available in this environment');
  }
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(code));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function requestAdminOtp(email: string): Promise<{ success: boolean; error?: string }> {
  if (!db) {
    return { success: false, error: 'Firestore is not initialized' };
  }
  if (!serviceId || !templateId || !publicKey) {
    return { success: false, error: 'Missing EmailJS configuration. Please set VITE_EMAILJS_* env variables.' };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const expiresAt = Timestamp.fromMillis(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await setDoc(doc(db, OTP_COLLECTION, normalizedEmail), {
    otpHash,
    expiresAt,
    createdAt: Timestamp.now(),
    attempts: 0,
  });

  await emailjs.send(
    serviceId,
    templateId,
    {
      to_email: normalizedEmail,
      otp_code: otp,
      otp_ttl: OTP_TTL_MINUTES,
    },
    {
      publicKey,
    },
  );

  return { success: true };
}

export async function verifyAdminOtp(email: string, code: string): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const docRef = doc(db, OTP_COLLECTION, normalizedEmail);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    return { success: false, error: 'OTP not found or already verified.' };
  }

  const data = snapshot.data();
  const expiresAt: Timestamp = data.expiresAt;
  if (expiresAt.toMillis() < Date.now()) {
    await deleteDoc(docRef);
    return { success: false, error: 'OTP expired. Please request a new code.' };
  }

  const providedHash = await hashOtp(code);
  if (providedHash !== data.otpHash) {
    return { success: false, error: 'Invalid OTP code.' };
  }

  await deleteDoc(docRef);
  return { success: true };
}


