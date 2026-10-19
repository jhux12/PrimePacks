import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { CardItem } from '../types';

const app = initializeApp(firebaseConfig);
// CRITICAL: The app will break without specifying the firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'pack_customizations', '_connection_check'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

const PACK_CUSTOMIZATIONS_COLLECTION = 'pack_customizations';

/**
 * Subscribe to real-time pack image updates across all devices.
 */
export function subscribeToPackCustomizations(
  onUpdate: (urls: Record<string, string>) => void
): () => void {
  try {
    const unsub = onSnapshot(
      collection(db, PACK_CUSTOMIZATIONS_COLLECTION),
      (snapshot) => {
        const customUrls: Record<string, string> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && data.packId && data.imageUrl) {
            customUrls[data.packId] = data.imageUrl;
          }
        });
        onUpdate(customUrls);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, PACK_CUSTOMIZATIONS_COLLECTION);
      }
    );
    return unsub;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, PACK_CUSTOMIZATIONS_COLLECTION);
  }
}

/**
 * Save custom pack URLs to Firestore and synchronize all devices.
 */
export async function savePackCustomizationsToFirestore(
  updatedUrls: Record<string, string>
): Promise<void> {
  const path = PACK_CUSTOMIZATIONS_COLLECTION;
  try {
    // 1. Fetch current docs to identify which ones need deletion or update
    const snapshot = await getDocs(collection(db, path)).catch((err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    });

    const existingIds = new Set<string>();
    snapshot.forEach((d) => existingIds.add(d.id));

    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();

    // 2. Set/update all active custom pack URLs
    for (const [packId, imageUrl] of Object.entries(updatedUrls)) {
      if (!imageUrl || imageUrl.trim() === '') continue;
      const docRef = doc(db, path, packId);
      batch.set(docRef, {
        packId,
        imageUrl: imageUrl.trim(),
        updatedAt: nowIso,
      });
      existingIds.delete(packId);
    }

    // 3. Remove any packs that were reset/cleared
    for (const removedId of existingIds) {
      if (removedId === '_connection_check') continue;
      const docRef = doc(db, path, removedId);
      batch.delete(docRef);
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

const PACK_ITEMS_COLLECTION = 'pack_items';

/**
 * Subscribe to real-time custom pack items updates across all devices.
 */
export function subscribeToPackItems(
  onUpdate: (itemsByPack: Record<string, CardItem[]>) => void
): () => void {
  try {
    const unsub = onSnapshot(
      collection(db, PACK_ITEMS_COLLECTION),
      (snapshot) => {
        const customItems: Record<string, CardItem[]> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && data.packId && Array.isArray(data.items)) {
            customItems[data.packId] = data.items;
          }
        });
        onUpdate(customItems);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, PACK_ITEMS_COLLECTION);
      }
    );
    return unsub;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, PACK_ITEMS_COLLECTION);
    return () => {};
  }
}

/**
 * Save custom pack items for a specific pack to Firestore and synchronize all devices.
 */
export async function savePackItemsToFirestore(
  packId: string,
  items: CardItem[]
): Promise<void> {
  const path = PACK_ITEMS_COLLECTION;
  try {
    const docRef = doc(db, path, packId);
    const nowIso = new Date().toISOString();
    await setDoc(docRef, {
      packId,
      items,
      updatedAt: nowIso
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Revert pack items to default by removing the custom document in Firestore.
 */
export async function deletePackItemsFromFirestore(packId: string): Promise<void> {
  const path = PACK_ITEMS_COLLECTION;
  try {
    const docRef = doc(db, path, packId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ========================================================
// FIREBASE AUTHENTICATION & USER PROFILE FLOWS
// ========================================================

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  createdAt: string;
  lastLoginAt: string;
  isAnonymous: boolean;
}

const USERS_COLLECTION = 'users';

/**
 * Subscribe to Firebase auth state changes.
 */
export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * Sign up a new user with email and password.
 */
export async function signUpWithEmail(email: string, pass: string, username?: string): Promise<User> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (username && username.trim()) {
      await updateProfile(cred.user, { displayName: username.trim() });
    }
    await syncUserRecordToFirestore(cred.user, username);
    return cred.user;
  } catch (error) {
    const message = formatAuthErrorMessage(error);
    throw new Error(message);
  }
}

/**
 * Sign in an existing user with email and password.
 */
export async function signInWithEmail(email: string, pass: string): Promise<User> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    await syncUserRecordToFirestore(cred.user);
    return cred.user;
  } catch (error) {
    const message = formatAuthErrorMessage(error);
    throw new Error(message);
  }
}

/**
 * Sign in as a Guest (Anonymous).
 */
export async function signInAsGuest(): Promise<User> {
  try {
    const cred = await signInAnonymously(auth);
    await syncUserRecordToFirestore(cred.user, 'PrimeGuest_' + cred.user.uid.slice(-4));
    return cred.user;
  } catch (error) {
    const message = formatAuthErrorMessage(error);
    throw new Error(message);
  }
}

/**
 * Sign out current user.
 */
export async function logOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
  }
}

/**
 * Synchronize user profile into Firestore collection.
 */
export async function syncUserRecordToFirestore(user: User, customDisplayName?: string): Promise<void> {
  try {
    const path = USERS_COLLECTION;
    const docRef = doc(db, path, user.uid);
    const nowIso = new Date().toISOString();
    await setDoc(
      docRef,
      {
        uid: user.uid,
        email: user.email || null,
        displayName: customDisplayName || user.displayName || (user.isAnonymous ? 'Guest Collector' : 'Prime Collector'),
        photoURL: user.photoURL || null,
        isAnonymous: user.isAnonymous,
        lastLoginAt: nowIso,
        updatedAt: nowIso
      },
      { merge: true }
    );
  } catch (err) {
    // Non-fatal profile cache error
    console.warn('Could not sync user profile to Firestore:', err);
  }
}

/**
 * Load user profile from Firestore.
 */
export async function getUserProfileFromFirestore(uid: string): Promise<UserProfile | null> {
  try {
    const path = USERS_COLLECTION;
    const docSnap = await getDoc(doc(db, path, uid));
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    console.warn('Error reading user profile:', err);
    return null;
  }
}

/**
 * Map Firebase error codes to friendly strings.
 */
function formatAuthErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code: string }).code);
    switch (code) {
      case 'auth/email-already-in-use':
        return 'An account already exists with this email address. Please sign in instead.';
      case 'auth/invalid-email':
        return 'The email address format is invalid.';
      case 'auth/operation-not-allowed':
        return 'Email/password sign in is not enabled in Firebase project settings.';
      case 'auth/weak-password':
        return 'Password is too weak. Please use at least 6 characters.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please verify your credentials and try again.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Access is temporarily disabled. Please try again later.';
      default:
        break;
    }
  }
  return error instanceof Error ? error.message : 'Authentication failed. Please try again.';
}
