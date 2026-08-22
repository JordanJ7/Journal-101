import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  getDocFromServer,
} from 'firebase/firestore';
import { AppState } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// 1. Initialize Firebase App, Auth and Firestore with exact database ID
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// 2. Types & Data Structures
export type UserRole = 'owner' | 'editor' | 'commenter' | 'viewer' | 'unauthorized';

export interface UserPermission {
  email: string;
  role: UserRole;
  grantedAt: string;
  note?: string;
}

export interface PermissionsDoc {
  globalShareEnabled: boolean;
  ownerEmail: string;
  users: Record<string, UserPermission>;
}

export interface CurrentUserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  isLoggedIn: boolean;
  role: UserRole;
  isSimulated?: boolean;
}

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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
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

const DEFAULT_OWNER_EMAIL = 'saojmj123456@gmail.com';
const PERMISSIONS_STORAGE_KEY = 'therapy_journal_permissions_v1';
const CLOUD_SYNC_STORAGE_KEY = 'therapy_journal_cloud_sync_v1';
const AUTH_SESSION_STORAGE_KEY = 'therapy_journal_auth_session_v1';

export const DEFAULT_PERMISSIONS: PermissionsDoc = {
  globalShareEnabled: true,
  ownerEmail: DEFAULT_OWNER_EMAIL,
  users: {},
};

// Test initial connection to Firestore
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Please check your Firebase configuration or network status.');
    }
  }
}
testConnection();

// Safe permissions loader
export function loadStoredPermissions(): PermissionsDoc {
  try {
    const raw = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        globalShareEnabled: parsed.globalShareEnabled ?? true,
        ownerEmail: parsed.ownerEmail || DEFAULT_OWNER_EMAIL,
        users: parsed.users || DEFAULT_PERMISSIONS.users,
      };
    }
  } catch (err) {
    console.warn('Failed to parse stored permissions:', err);
  }
  return DEFAULT_PERMISSIONS;
}

// Global listeners registry for real-time reactivity
const permissionsListeners = new Set<(perms: PermissionsDoc) => void>();
const journalDataListeners = new Set<(data: Partial<AppState> & { clientSessionId?: string; updatedAt?: string }) => void>();
const authStateListeners = new Set<(user: CurrentUserProfile | null) => void>();

function getInitialStoredUser(): CurrentUserProfile | null {
  try {
    const stored = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.warn('Failed to parse auth session:', err);
  }
  return null;
}

let currentActiveUser: CurrentUserProfile | null = getInitialStoredUser();

/**
 * Real-time permissions subscription (Firestore /permissions/global + fallback)
 */
export function subscribePermissions(onUpdate: (perms: PermissionsDoc) => void) {
  const current = loadStoredPermissions();
  onUpdate(current);
  permissionsListeners.add(onUpdate);

  const permissionsDocRef = doc(db, 'permissions', 'global');
  const unsubscribeFirestore = onSnapshot(
    permissionsDocRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as PermissionsDoc;
        localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(data));
        permissionsListeners.forEach((listener) => listener(data));
      }
    },
    (err) => {
      console.warn('Firestore permissions subscription fallback to local cache:', err.message);
    }
  );

  return () => {
    permissionsListeners.delete(onUpdate);
    unsubscribeFirestore();
  };
}

/**
 * Update permissions document in Firestore & Local storage
 */
export async function savePermissionsDoc(perms: PermissionsDoc): Promise<void> {
  try {
    localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(perms));
    permissionsListeners.forEach((listener) => listener(perms));

    const permissionsDocRef = doc(db, 'permissions', 'global');
    await setDoc(permissionsDocRef, perms, { merge: true });
  } catch (err) {
    console.warn('Saved permissions to local state, Firestore sync note:', err);
  }
}

/**
 * Resolve role for a given email address
 * Strictly enforces case-insensitive and trimmed email comparisons
 */
export function resolveUserRole(email: string, permissions: PermissionsDoc): UserRole | null {
  if (!email) return null;
  const emailClean = email.trim().toLowerCase();
  const ownerClean = (permissions.ownerEmail || DEFAULT_OWNER_EMAIL).trim().toLowerCase();

  if (emailClean && emailClean === ownerClean) {
    return 'owner';
  }

  // Check explicit invited user list (case-insensitive on both key and value)
  if (permissions.users) {
    const matchedUser = Object.entries(permissions.users).find(
      ([key, u]) =>
        key.trim().toLowerCase() === emailClean ||
        (u?.email && u.email.trim().toLowerCase() === emailClean)
    );
    if (matchedUser && matchedUser[1]) {
      return matchedUser[1].role;
    }
  }

  // If global share is enabled, guest emails can view
  if (permissions.globalShareEnabled) {
    return 'viewer';
  }

  // Unauthorized
  return null;
}

/**
 * Force a lightweight state re-sync on tab focus / visibilitychange
 * Specifically addresses Safari background tab throttling/suspension of WebSockets/onSnapshot
 */
export async function refreshFirestoreSync(): Promise<void> {
  try {
    const appStateDocRef = doc(db, 'app_state', 'journal');
    const snap = await getDoc(appStateDocRef);
    if (snap.exists()) {
      const rawData = snap.data();
      if (rawData) {
        const data = rawData as Partial<AppState> & { clientSessionId?: string; updatedAt?: string };
        if (data.clientSessionId !== CLIENT_SESSION_ID) {
          if (data.weeks || data.coreItems || data.coreCategories) {
            try {
              localStorage.setItem(CLOUD_SYNC_STORAGE_KEY, JSON.stringify(data));
            } catch (err) {
              console.warn('Local cache error during focus refresh:', err);
            }

            journalDataListeners.forEach((listener) => {
              listener({
                weeks: data.weeks,
                coreItems: data.coreItems,
                coreCategories: data.coreCategories,
                comments: data.comments,
                updatedAt: data.updatedAt,
                clientSessionId: data.clientSessionId,
              });
            });
          }
        }
      }
    }

    const permsDocRef = doc(db, 'permissions', 'global');
    const permsSnap = await getDoc(permsDocRef);
    if (permsSnap.exists()) {
      const permsData = permsSnap.data() as PermissionsDoc;
      localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(permsData));
      permissionsListeners.forEach((listener) => listener(permsData));
    }
  } catch (err) {
    console.warn('[Sync] Focus refresh fallback note:', err);
  }
}

/**
 * Client Session Identifier to distinguish own writes from remote writes
 */
export const CLIENT_SESSION_ID = 'session-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);

/**
 * Deep sanitization for Firestore:
 * - Recursively removes/converts undefined values (which trigger Firestore write exceptions)
 * - Retains null, boolean, string (even empty strings), number, array, and nested objects cleanly
 * - Converts Dates to ISO strings
 * - Strips non-serializable prototype properties while preserving nested data structures
 */
export const sanitizePayload = (obj: any): any => {
  if (obj === undefined) return null;
  return JSON.parse(
    JSON.stringify(obj, (k, v) => {
      if (v === undefined) return null;
      if (v instanceof Date) return v.toISOString();
      return v;
    })
  );
};

export function sanitizeForFirestore<T>(val: T): T {
  return sanitizePayload(val);
}

export interface JournalCloudPayload {
  weeks: any[];
  coreItems: any[];
  coreCategories: any[];
  comments?: any[];
  updatedAt: string;
  clientSessionId: string;
  version: number;
}

let lastWrittenCloudPayloadHash = '';
const BACKUP_PAYLOAD_STORAGE_KEY = 'journal_cloud_local_backup';

/**
 * Real-time journal data subscription (Firestore /app_state/journal + cross-tab sync)
 * Decoupled from the main thread using non-blocking microtasks / requestIdleCallback.
 */
export function subscribeJournalData(
  onUpdate: (data: Partial<AppState> & { clientSessionId?: string; updatedAt?: string }) => void,
  onHydrated?: () => void
) {
  let isInitialHydratedFired = false;

  const markHydrated = () => {
    if (!isInitialHydratedFired) {
      isInitialHydratedFired = true;
      if (onHydrated) {
        onHydrated();
      }
    }
  };

  // 1. Cross-tab storage listener
  const handleStorage = (e: StorageEvent) => {
    if (e.key === CLOUD_SYNC_STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed && (parsed.weeks || parsed.coreItems || parsed.coreCategories)) {
          // Schedule update in next idle period to keep UI responsive
          if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            (window as any).requestIdleCallback(() => {
              onUpdate({
                weeks: parsed.weeks,
                coreItems: parsed.coreItems,
                coreCategories: parsed.coreCategories,
                comments: parsed.comments,
                updatedAt: parsed.updatedAt,
                clientSessionId: parsed.clientSessionId,
              });
              markHydrated();
            }, { timeout: 500 });
          } else {
            setTimeout(() => {
              onUpdate({
                weeks: parsed.weeks,
                coreItems: parsed.coreItems,
                coreCategories: parsed.coreCategories,
                comments: parsed.comments,
                updatedAt: parsed.updatedAt,
                clientSessionId: parsed.clientSessionId,
              });
              markHydrated();
            }, 16);
          }
        }
      } catch (err) {
        console.warn('Failed to parse cross-tab sync:', err);
      }
    }
  };

  window.addEventListener('storage', handleStorage);
  journalDataListeners.add(onUpdate);

  // 2. Real-Time Firestore onSnapshot listener with non-blocking hydration
  const appStateDocRef = doc(db, 'app_state', 'journal');
  const unsubscribeFirestore = onSnapshot(
    appStateDocRef,
    { includeMetadataChanges: false },
    (snap) => {
      markHydrated();
      if (snap.exists()) {
        const rawData = snap.data();
        if (!rawData) return;

        const data = rawData as Partial<AppState> & { clientSessionId?: string; updatedAt?: string };
        
        // Skip processing if this payload came from our own local session and was already written
        if (data.clientSessionId === CLIENT_SESSION_ID) {
          return;
        }

        console.log('[Sync IN] <= Payload received from Firestore:', {
          updatedAt: data.updatedAt,
          weeksCount: data.weeks?.length,
          coreItemsCount: data.coreItems?.length,
          remoteSessionId: data.clientSessionId,
        });

        if (data.weeks || data.coreItems || data.coreCategories) {
          // Cache remotely received state
          try {
            localStorage.setItem(CLOUD_SYNC_STORAGE_KEY, JSON.stringify(data));
            localStorage.setItem('journal_backup', JSON.stringify(data));
          } catch (err) {
            console.warn('Local cache error:', err);
          }

          // Hydrate state directly
          onUpdate({
            weeks: data.weeks,
            coreItems: data.coreItems,
            coreCategories: data.coreCategories,
            comments: data.comments,
            updatedAt: data.updatedAt,
            clientSessionId: data.clientSessionId,
          });
        }
      }
    },
    (err) => {
      console.warn('Firestore state subscription fallback to local cache:', err.message);
      // Even on network error, allow local hydration so offline work continues safely
      markHydrated();
    }
  );

  return () => {
    window.removeEventListener('storage', handleStorage);
    journalDataListeners.delete(onUpdate);
    unsubscribeFirestore();
  };
}

/**
 * Save live journal data to Firestore & shared local sync
 * - Performs deep sanitization
 * - Non-destructive payload merge
 * - Immediate local backup caching before network dispatch
 */
export async function saveJournalDataToCloud(state: AppState, entryId?: string): Promise<void> {
  const payload: JournalCloudPayload = {
    weeks: state.weeks || [],
    coreItems: state.coreItems || [],
    coreCategories: state.coreCategories || [],
    comments: state.comments || [],
    updatedAt: new Date().toISOString(),
    clientSessionId: CLIENT_SESSION_ID,
    version: 1,
  };

  const sanitized = sanitizeForFirestore(payload);
  const payloadJson = JSON.stringify(sanitized);

  // Pre-dispatch local backup guarantee
  try {
    localStorage.setItem(BACKUP_PAYLOAD_STORAGE_KEY, payloadJson);
    localStorage.setItem('journal_backup', payloadJson);
    localStorage.setItem('journal_failsafe_backup', payloadJson);
    localStorage.setItem(CLOUD_SYNC_STORAGE_KEY, payloadJson);
  } catch (err) {
    console.warn('Failed to sync journal state locally:', err);
  }

  // Skip redundant network writes if exact same state was already dispatched
  if (payloadJson === lastWrittenCloudPayloadHash) {
    return;
  }

  console.log('[Sync OUT] Dispatching journal update to Firestore:', {
    targetEntryId: entryId || 'global',
    weeksCount: sanitized.weeks?.length,
    coreItemsCount: sanitized.coreItems?.length,
    updatedAt: sanitized.updatedAt,
    sessionId: CLIENT_SESSION_ID,
  });

  try {
    const appStateDocRef = doc(db, 'app_state', 'journal');
    await setDoc(appStateDocRef, sanitized, { merge: true });
    lastWrittenCloudPayloadHash = payloadJson;
    console.log('[Auto-Save] Entry saved to Firestore:', entryId || 'all');
  } catch (err) {
    console.warn('[Sync OUT] Firestore write failed:', err);
    // Store failed payload marker for offline recovery
    try {
      localStorage.setItem('journal_failed_sync_payload', payloadJson);
    } catch {
      // ignore
    }
    throw err;
  }
}

/**
 * Real-time Auth State subscription with Firebase Auth integration
 */
export function onAuthStateChangedWrapper(callback: (user: CurrentUserProfile | null) => void) {
  authStateListeners.add(callback);
  callback(currentActiveUser);

  const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser && firebaseUser.email) {
      const perms = loadStoredPermissions();
      const emailClean = firebaseUser.email.toLowerCase();
      const resolved = resolveUserRole(emailClean, perms);
      const role: UserRole = resolved || 'unauthorized';

      const profile: CurrentUserProfile = {
        uid: firebaseUser.uid,
        email: emailClean,
        displayName:
          firebaseUser.displayName ||
          (emailClean === perms.ownerEmail.toLowerCase()
            ? 'Journal Owner'
            : emailClean.split('@')[0]),
        photoURL: firebaseUser.photoURL || undefined,
        isLoggedIn: true,
        role,
        isSimulated: false,
      };

      currentActiveUser = profile;
      localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(profile));
      authStateListeners.forEach((cb) => cb(profile));
    }
  });

  return () => {
    authStateListeners.delete(callback);
    unsubscribeAuth();
  };
}

/**
 * Sign In with Email (Direct / Simulated / Verified)
 */
export async function loginWithEmail(
  email: string,
  displayName?: string,
  rejectIfUnauthorized = false
): Promise<CurrentUserProfile> {
  const perms = loadStoredPermissions();
  const emailClean = email.trim().toLowerCase();
  const resolved = resolveUserRole(emailClean, perms);
  const role: UserRole = resolved || 'unauthorized';

  if (!resolved && rejectIfUnauthorized) {
    throw new Error(
      `Access Denied: The account "${email}" has not been authorized to view this private journal.`
    );
  }

  const profile: CurrentUserProfile = {
    uid: 'user-' + Date.now(),
    email: emailClean,
    displayName:
      displayName ||
      (emailClean === perms.ownerEmail.toLowerCase()
        ? 'Journal Owner'
        : emailClean.split('@')[0]),
    isLoggedIn: true,
    role,
    isSimulated: false,
  };

  currentActiveUser = profile;
  localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(profile));
  authStateListeners.forEach((cb) => cb(profile));
  return profile;
}

/**
 * Google Sign-In wrapper using Firebase Auth signInWithPopup with graceful fallback
 */
export async function signInWithGoogle(customEmail?: string): Promise<CurrentUserProfile> {
  const perms = loadStoredPermissions();

  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    const fbUser = result.user;

    if (fbUser.email) {
      const emailClean = fbUser.email.toLowerCase();
      const resolved = resolveUserRole(emailClean, perms);
      const role: UserRole = resolved || 'unauthorized';

      const profile: CurrentUserProfile = {
        uid: fbUser.uid,
        email: emailClean,
        displayName:
          fbUser.displayName ||
          (emailClean === perms.ownerEmail.toLowerCase()
            ? 'Journal Owner'
            : emailClean.split('@')[0]),
        photoURL: fbUser.photoURL || undefined,
        isLoggedIn: true,
        role,
        isSimulated: false,
      };

      currentActiveUser = profile;
      localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(profile));
      authStateListeners.forEach((cb) => cb(profile));
      return profile;
    }
  } catch (err: any) {
    console.warn('Firebase popup sign-in fallback (e.g. iframe restrictions):', err?.message);
  }

  // Fallback direct sign in
  const email = customEmail || perms.ownerEmail;
  return loginWithEmail(email, email === perms.ownerEmail ? 'Journal Owner' : undefined, false);
}

/**
 * Sign Out wrapper
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Firebase signOut note:', err);
  }
  currentActiveUser = null;
  localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  authStateListeners.forEach((cb) => cb(null));
}
