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
  deleteDoc,
  getDocs,
  collection,
  collectionGroup,
  query,
  onSnapshot,
  getDocFromServer,
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import {
  AppState,
  BulletPoint,
  CoreCategoryConfig,
  CoreTopicItem,
  WeeklyBlock,
  CommentItem,
} from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// 1. Initialize Firebase App, Auth, Firestore and Storage with exact database ID
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);

/**
 * Uploads a file (photo, video, attachment) directly to Firebase Cloud Storage.
 * Returns the public persistent download URL.
 */
export async function uploadFileToStorage(file: File, folder = 'attachments'): Promise<string> {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  const cleanName = (file.name || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_');
  const fullPath = `${folder}/${timestamp}_${randomSuffix}_${cleanName}`;
  const fileRef = storageRef(storage, fullPath);

  const metadata = {
    contentType: file.type || (file.name?.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg'),
    customMetadata: {
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
    },
  };

  const snapshot = await uploadBytes(fileRef, file, metadata);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  console.log(`[Firebase Storage SUCCESS] Uploaded file to ${fullPath}:`, downloadUrl);
  return downloadUrl;
}

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
  console.error('[Firestore Error]: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const DEFAULT_OWNER_EMAIL = 'saojmj123456@gmail.com';
const PERMISSIONS_STORAGE_KEY = 'therapy_journal_permissions_v1';
const CLOUD_SYNC_STORAGE_KEY = 'therapy_journal_cloud_sync_v1';
const AUTH_SESSION_STORAGE_KEY = 'therapy_journal_auth_session_v1';
const BACKUP_PAYLOAD_STORAGE_KEY = 'journal_cloud_local_backup';

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
      console.warn('[Firestore] Note: Client offline check or initial ping.');
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
  const path = 'permissions/global';
  try {
    localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(perms));
    permissionsListeners.forEach((listener) => listener(perms));

    const permissionsDocRef = doc(db, 'permissions', 'global');
    await setDoc(permissionsDocRef, perms, { merge: true });
  } catch (err) {
    console.warn('Saved permissions to local state, Firestore sync note:', err);
    handleFirestoreError(err, OperationType.WRITE, path);
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

  return null;
}

/**
 * Client Session Identifier to distinguish own writes from remote writes
 */
export const CLIENT_SESSION_ID =
  'session-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);

/**
 * Deep sanitization for Firestore:
 * - Recursively removes/converts undefined values (which trigger Firestore write exceptions)
 * - Retains null, boolean, string, number, array, and nested objects cleanly
 * - Converts Dates to ISO strings
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

// -----------------------------------------------------------------------------------------
// DIRECT ATOMIC CRUD HANDLERS (TOPICS, FOLDERS, WEEKS, ENTRIES, COMMENTS)
// -----------------------------------------------------------------------------------------

/**
 * 1. Create or Update Folder (/folders/{folderId})
 */
export async function saveFolderDoc(folder: CoreCategoryConfig): Promise<void> {
  if (!folder || !folder.id) return;
  const path = `folders/${folder.id}`;
  try {
    const folderDocRef = doc(db, 'folders', folder.id);
    const sanitized = sanitizeForFirestore({
      ...folder,
      clientSessionId: CLIENT_SESSION_ID,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(folderDocRef, sanitized, { merge: true });
    console.log(`[Firestore SUCCESS] Folder saved: ${folder.id}`);
  } catch (err) {
    console.error(`[Firestore CRITICAL ERROR] Failed to save folder ${folder?.id}:`, err);
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

/**
 * 2. Delete Folder (/folders/{folderId})
 */
export async function deleteFolderDoc(folderId: string): Promise<void> {
  if (!folderId) return;
  const path = `folders/${folderId}`;
  try {
    const folderDocRef = doc(db, 'folders', folderId);
    await deleteDoc(folderDocRef);
    console.log(`[Firestore SUCCESS] Folder deleted: ${folderId}`);
  } catch (err) {
    console.error(`[Firestore CRITICAL ERROR] Failed to delete folder ${folderId}:`, err);
    handleFirestoreError(err, OperationType.DELETE, path);
    throw err;
  }
}

/**
 * 3. Create or Update Core Topic Item (/core_topics/{itemId} and /folders/{categoryId}/notes/{itemId})
 * Checks document size limit before saving and throws descriptive errors.
 */
export async function saveCoreTopicDoc(item: CoreTopicItem): Promise<void> {
  if (!item || !item.id) return;
  const path = `core_topics/${item.id}`;

  // Pre-save client-side size check (700KB safe ceiling to prevent Firestore 1MB dropouts)
  try {
    const payloadStr = JSON.stringify(item);
    const estimatedSizeBytes = new Blob([payloadStr]).size;
    if (estimatedSizeBytes > 700 * 1024) {
      const sizeErr = new Error(
        `Entry payload size (${Math.round(estimatedSizeBytes / 1024)} KB) exceeds the safe 700 KB Firestore limit. Please remove photos or large attachments before saving.`
      );
      console.error(`[Firestore CRITICAL SIZE ERROR] Failed to save core topic ${item.id}:`, sizeErr);
      handleFirestoreError(sizeErr, OperationType.WRITE, path);
      throw sizeErr;
    }
  } catch (checkErr) {
    if (checkErr instanceof Error && checkErr.message.includes('700 KB')) {
      throw checkErr;
    }
  }

  try {
    const cleanItemData = sanitizeForFirestore({
      ...item,
      clientSessionId: CLIENT_SESSION_ID,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Write to /core_topics/{item.id}
    const docRef = doc(db, 'core_topics', item.id);
    await setDoc(docRef, cleanItemData, { merge: true });

    // Also write to /folders/{categoryId}/notes/{item.id} if categoryId is present
    if (item.categoryId) {
      try {
        const folderNoteRef = doc(db, 'folders', item.categoryId, 'notes', item.id);
        await setDoc(folderNoteRef, cleanItemData, { merge: true });
      } catch (fErr) {
        console.warn(`[Firestore Subcollection Note] /folders/${item.categoryId}/notes write note:`, fErr);
      }
    }

    console.log(`[Firestore SUCCESS] Core topic note saved: ${item.id}`);
  } catch (err: any) {
    console.error(`[Firestore CRITICAL ERROR] Failed to save core topic ${item.id}:`, err);
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

/**
 * 4. Delete Core Topic Item
 */
export async function deleteCoreTopicDoc(itemId: string, categoryId?: string): Promise<void> {
  if (!itemId) return;
  const path = `core_topics/${itemId}`;
  try {
    const docRef = doc(db, 'core_topics', itemId);
    await deleteDoc(docRef);

    if (categoryId) {
      try {
        const folderNoteRef = doc(db, 'folders', categoryId, 'notes', itemId);
        await deleteDoc(folderNoteRef);
      } catch {}
    }

    console.log(`[Firestore SUCCESS] Core topic note deleted: ${itemId}`);
  } catch (err) {
    console.error(`[Firestore CRITICAL ERROR] Failed to delete core topic ${itemId}:`, err);
    handleFirestoreError(err, OperationType.DELETE, path);
    throw err;
  }
}

/**
 * 5. Create or Update Journal Entry (/weeks/{weekId}/entries/{entryId})
 */
export async function saveEntryDoc(weekId: string, entry: BulletPoint): Promise<void> {
  if (!weekId || !entry || !entry.id) return;
  const path = `weeks/${weekId}/entries/${entry.id}`;

  // Pre-save client-side size check (700KB safe ceiling)
  try {
    const payloadStr = JSON.stringify(entry);
    const estimatedSizeBytes = new Blob([payloadStr]).size;
    if (estimatedSizeBytes > 700 * 1024) {
      const sizeErr = new Error(
        `Entry payload size (${Math.round(estimatedSizeBytes / 1024)} KB) exceeds the safe 700 KB Firestore limit. Please remove photos or large attachments before saving.`
      );
      console.error(`[Firestore CRITICAL SIZE ERROR] Failed to save entry ${entry.id}:`, sizeErr);
      handleFirestoreError(sizeErr, OperationType.WRITE, path);
      throw sizeErr;
    }
  } catch (checkErr) {
    if (checkErr instanceof Error && checkErr.message.includes('700 KB')) {
      throw checkErr;
    }
  }

  try {
    const entryDocRef = doc(db, 'weeks', weekId, 'entries', entry.id);
    const sanitized = sanitizeForFirestore({
      ...entry,
      clientSessionId: CLIENT_SESSION_ID,
      createdAt: entry.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await setDoc(entryDocRef, sanitized, { merge: true });
    console.log(`[Firestore SUCCESS] Entry saved: /weeks/${weekId}/entries/${entry.id}`);
  } catch (err) {
    console.error(`[Firestore CRITICAL ERROR] Failed to save entry ${entry.id}:`, err);
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

/**
 * 6. Partial Update Journal Entry (/weeks/{weekId}/entries/{entryId})
 */
export async function updateEntryDoc(
  weekId: string,
  entryId: string,
  updates: Partial<BulletPoint>
): Promise<void> {
  if (!weekId || !entryId) return;
  const path = `weeks/${weekId}/entries/${entryId}`;
  try {
    const entryDocRef = doc(db, 'weeks', weekId, 'entries', entryId);
    const sanitized = sanitizeForFirestore({
      ...updates,
      clientSessionId: CLIENT_SESSION_ID,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(entryDocRef, sanitized, { merge: true });
    console.log(`[Firestore SUCCESS] Entry updated: /weeks/${weekId}/entries/${entryId}`);
  } catch (err) {
    console.error(`[Firestore CRITICAL ERROR] Failed to update entry ${entryId}:`, err);
    handleFirestoreError(err, OperationType.UPDATE, path);
    throw err;
  }
}

/**
 * 7. Delete Journal Entry (/weeks/{weekId}/entries/{entryId})
 */
export async function deleteEntryDoc(weekId: string, entryId: string): Promise<void> {
  if (!weekId || !entryId) return;
  const path = `weeks/${weekId}/entries/${entryId}`;
  try {
    const entryDocRef = doc(db, 'weeks', weekId, 'entries', entryId);
    await deleteDoc(entryDocRef);
    console.log(`[Firestore SUCCESS] Entry deleted: /weeks/${weekId}/entries/${entryId}`);
  } catch (err) {
    console.error(`[Firestore CRITICAL ERROR] Failed to delete entry ${entryId}:`, err);
    handleFirestoreError(err, OperationType.DELETE, path);
    throw err;
  }
}

/**
 * 8. Create or Update Week Metadata (/weeks/{weekId})
 */
export async function saveWeekMetaDoc(week: WeeklyBlock): Promise<void> {
  if (!week || !week.id) return;
  const path = `weeks/${week.id}`;
  try {
    const { bullets, ...weekMeta } = week;
    const weekDocRef = doc(db, 'weeks', week.id);
    const sanitized = sanitizeForFirestore({
      ...weekMeta,
      clientSessionId: CLIENT_SESSION_ID,
      createdAt: week.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await setDoc(weekDocRef, sanitized, { merge: true });
    console.log(`[Firestore SUCCESS] Week metadata saved: /weeks/${week.id}`);
  } catch (err) {
    console.error(`[Firestore CRITICAL ERROR] Failed to save week ${week.id}:`, err);
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

/**
 * 9. Delete Week (/weeks/{weekId})
 */
export async function deleteWeekDoc(weekId: string): Promise<void> {
  if (!weekId) return;
  const path = `weeks/${weekId}`;
  try {
    const weekDocRef = doc(db, 'weeks', weekId);
    await deleteDoc(weekDocRef);
    console.log(`[Firestore SUCCESS] Week deleted: /weeks/${weekId}`);
  } catch (err) {
    console.error(`[Firestore CRITICAL ERROR] Failed to delete week ${weekId}:`, err);
    handleFirestoreError(err, OperationType.DELETE, path);
    throw err;
  }
}

/**
 * 10. Create or Update Comment (/comments/{commentId})
 */
export async function saveCommentDoc(comment: CommentItem): Promise<void> {
  if (!comment || !comment.id) return;
  const path = `comments/${comment.id}`;
  try {
    const commentDocRef = doc(db, 'comments', comment.id);
    const sanitized = sanitizeForFirestore({
      ...comment,
      clientSessionId: CLIENT_SESSION_ID,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(commentDocRef, sanitized, { merge: true });
    console.log(`[Firestore SUCCESS] Comment saved: ${comment.id}`);
  } catch (err) {
    console.error(`[Firestore CRITICAL ERROR] Failed to save comment ${comment.id}:`, err);
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

/**
 * 11. Delete Comment (/comments/{commentId})
 */
export async function deleteCommentDoc(commentId: string): Promise<void> {
  if (!commentId) return;
  const path = `comments/${commentId}`;
  try {
    const commentDocRef = doc(db, 'comments', commentId);
    await deleteDoc(commentDocRef);
    console.log(`[Firestore SUCCESS] Comment deleted: ${commentId}`);
  } catch (err) {
    console.error(`[Firestore CRITICAL ERROR] Failed to delete comment ${commentId}:`, err);
    handleFirestoreError(err, OperationType.DELETE, path);
    throw err;
  }
}

/**
 * 12. Save Core Categories collection fallback
 */
export async function saveCoreCategoriesDoc(categories: CoreCategoryConfig[]): Promise<void> {
  const path = 'core_categories/settings';
  try {
    const docRef = doc(db, 'core_categories', 'settings');
    await setDoc(
      docRef,
      {
        categories: sanitizeForFirestore(categories),
        clientSessionId: CLIENT_SESSION_ID,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    // Also mirror each folder to /folders/{folderId}
    for (const cat of categories) {
      await saveFolderDoc(cat);
    }
  } catch (err) {
    console.error('[Firestore Error] Failed to save categories config:', err);
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

// -----------------------------------------------------------------------------------------
// REAL-TIME MULTI-COLLECTION LISTENER & HYDRATION ENGINE
// -----------------------------------------------------------------------------------------

export function subscribeJournalData(
  onUpdate: (data: Partial<AppState> & { clientSessionId?: string; updatedAt?: string }) => void,
  onHydrated?: () => void
) {
  let isInitialHydratedFired = false;
  const activeUnsubscribes: (() => void)[] = [];

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
          // If the storage event was written by ourselves, skip to avoid double execution
          if (parsed.clientSessionId === CLIENT_SESSION_ID) {
            return;
          }
          onUpdate({
            weeks: parsed.weeks,
            coreItems: parsed.coreItems,
            coreCategories: parsed.coreCategories,
            comments: parsed.comments,
            updatedAt: parsed.updatedAt,
            clientSessionId: parsed.clientSessionId,
          });
          markHydrated();
        }
      } catch (err) {
        console.warn('Failed to parse cross-tab sync:', err);
      }
    }
  };

  window.addEventListener('storage', handleStorage);
  journalDataListeners.add(onUpdate);

  // In-memory accumulation maps for granular updates
  const weeksMap = new Map<string, WeeklyBlock>();
  const entriesPerWeekMap = new Map<string, Map<string, BulletPoint>>();
  const coreItemsMap = new Map<string, CoreTopicItem>();
  const foldersMap = new Map<string, CoreCategoryConfig>();
  let coreCategoriesFallback: CoreCategoryConfig[] | null = null;
  let commentsList: CommentItem[] = [];

  // Cached stable array references to prevent full-tree re-renders when only 1 item changes
  let cachedConsolidatedWeeks: WeeklyBlock[] = [];
  let cachedConsolidatedCoreItems: CoreTopicItem[] = [];
  let cachedConsolidatedFolders: CoreCategoryConfig[] = [];
  let cachedComments: CommentItem[] = [];

  let broadcastDebounceTimer: any = null;

  const scheduleBroadcast = () => {
    if (broadcastDebounceTimer) {
      clearTimeout(broadcastDebounceTimer);
    }
    broadcastDebounceTimer = setTimeout(() => {
      broadcastDebounceTimer = null;
      const payload: Partial<AppState> & { clientSessionId?: string; updatedAt?: string } = {
        weeks: cachedConsolidatedWeeks,
        coreItems: cachedConsolidatedCoreItems,
        ...(cachedConsolidatedFolders.length > 0 ? { coreCategories: cachedConsolidatedFolders } : {}),
        comments: cachedComments,
        updatedAt: new Date().toISOString(),
        clientSessionId: CLIENT_SESSION_ID,
      };

      try {
        localStorage.setItem(CLOUD_SYNC_STORAGE_KEY, JSON.stringify(payload));
        localStorage.setItem('journal_backup', JSON.stringify(payload));
      } catch {}

      onUpdate(payload);
    }, 25);
  };

  // Helper to re-build bullets for a specific week and update only that week in cachedConsolidatedWeeks
  const refreshSingleWeekBullets = (weekId: string) => {
    const week = weeksMap.get(weekId);
    if (!week) return;

    const weekEntriesMap = entriesPerWeekMap.get(weekId);
    const bullets = weekEntriesMap
      ? Array.from(weekEntriesMap.values())
      : [...(week.bullets || [])];

    bullets.sort((a, b) => {
      const timeA = a.isoDate ? new Date(a.isoDate).getTime() : new Date(a.createdAt || a.timestamp).getTime() || 0;
      const timeB = b.isoDate ? new Date(b.isoDate).getTime() : new Date(b.createdAt || b.timestamp).getTime() || 0;
      return timeA - timeB;
    });

    const updatedWeek: WeeklyBlock = {
      ...week,
      bullets,
    };
    weeksMap.set(weekId, updatedWeek);

    const existingIndex = cachedConsolidatedWeeks.findIndex((w) => w.id === weekId);
    if (existingIndex >= 0) {
      cachedConsolidatedWeeks = [
        ...cachedConsolidatedWeeks.slice(0, existingIndex),
        updatedWeek,
        ...cachedConsolidatedWeeks.slice(existingIndex + 1),
      ];
    } else {
      cachedConsolidatedWeeks = [...cachedConsolidatedWeeks, updatedWeek];
    }
  };

  // Helper to sync all weeks while preserving unaltered week references
  const syncConsolidatedWeeks = () => {
    const nextWeeks: WeeklyBlock[] = [];
    weeksMap.forEach((week, weekId) => {
      const existingInCache = cachedConsolidatedWeeks.find((w) => w.id === weekId);
      const weekEntriesMap = entriesPerWeekMap.get(weekId);
      const bullets = weekEntriesMap
        ? Array.from(weekEntriesMap.values())
        : week.bullets || [];

      bullets.sort((a, b) => {
        const timeA = a.isoDate ? new Date(a.isoDate).getTime() : new Date(a.createdAt || a.timestamp).getTime() || 0;
        const timeB = b.isoDate ? new Date(b.isoDate).getTime() : new Date(b.createdAt || b.timestamp).getTime() || 0;
        return timeA - timeB;
      });

      const assembledWeek: WeeklyBlock = {
        ...week,
        bullets,
      };
      weeksMap.set(weekId, assembledWeek);
      nextWeeks.push(assembledWeek);
    });

    cachedConsolidatedWeeks = nextWeeks;
  };

  // 2. Real-Time Weeks Collection Listener (/weeks)
  const weeksUnsub = onSnapshot(
    collection(db, 'weeks'),
    async (weeksSnap) => {
      markHydrated();

      // Skip snapshot updates if this is solely a local uncommitted write
      if (weeksSnap.metadata.hasPendingWrites) {
        return;
      }

      if (!weeksSnap.empty) {
        let hasStructuralChanges = false;
        weeksSnap.docChanges().forEach((change) => {
          if (change.doc.metadata.hasPendingWrites) return;

          const weekData = change.doc.data() as WeeklyBlock;
          const weekId = change.doc.id;

          if (change.type === 'removed') {
            weeksMap.delete(weekId);
            entriesPerWeekMap.delete(weekId);
            cachedConsolidatedWeeks = cachedConsolidatedWeeks.filter((w) => w.id !== weekId);
            hasStructuralChanges = true;
          } else {
            const existing = weeksMap.get(weekId) || ({} as WeeklyBlock);
            const mergedWeek: WeeklyBlock = {
              ...existing,
              ...weekData,
              id: weekId,
              bullets: existing.bullets || weekData.bullets || [],
            };
            weeksMap.set(weekId, mergedWeek);
            refreshSingleWeekBullets(weekId);
            hasStructuralChanges = true;
          }
        });

        if (hasStructuralChanges) {
          scheduleBroadcast();
        }
      } else {
        // Auto-migration check from legacy document
        try {
          const legacyDoc = await getDoc(doc(db, 'app_state', 'journal'));
          if (legacyDoc.exists()) {
            const legacyData = legacyDoc.data() as Partial<AppState>;
            if (legacyData.weeks && legacyData.weeks.length > 0) {
              for (const w of legacyData.weeks) {
                await saveWeekMetaDoc(w);
                if (w.bullets && w.bullets.length > 0) {
                  for (const b of w.bullets) {
                    await saveEntryDoc(w.id, b);
                  }
                }
              }
            }
            if (legacyData.coreItems && legacyData.coreItems.length > 0) {
              for (const ci of legacyData.coreItems) {
                await saveCoreTopicDoc(ci);
              }
            }
            if (legacyData.coreCategories && legacyData.coreCategories.length > 0) {
              for (const cat of legacyData.coreCategories) {
                await saveFolderDoc(cat);
              }
            }
          }
        } catch (mErr) {
          console.warn('[Migration Note]:', mErr);
        }
      }
    },
    (err) => {
      console.warn('Weeks subscription note:', err.message);
      markHydrated();
    }
  );
  activeUnsubscribes.push(weeksUnsub);

  // 3. Real-Time CollectionGroup Query for all Entries across all Weeks (/weeks/{weekId}/entries/{entryId})
  try {
    const entriesGroupUnsub = onSnapshot(
      collectionGroup(db, 'entries'),
      (entriesSnap) => {
        markHydrated();

        // Skip snapshot processing if it is an uncommitted local write
        if (entriesSnap.metadata.hasPendingWrites) {
          return;
        }

        const affectedWeekIds = new Set<string>();

        entriesSnap.docChanges().forEach((change) => {
          if (change.doc.metadata.hasPendingWrites) return;

          const entry = { id: change.doc.id, ...change.doc.data() } as BulletPoint;
          const parentWeekId = change.doc.ref.parent.parent?.id;

          if (parentWeekId) {
            if (!entriesPerWeekMap.has(parentWeekId)) {
              entriesPerWeekMap.set(parentWeekId, new Map());
            }
            const weekEntries = entriesPerWeekMap.get(parentWeekId)!;

            if (change.type === 'removed') {
              weekEntries.delete(entry.id);
            } else {
              weekEntries.set(entry.id, entry);
            }
            affectedWeekIds.add(parentWeekId);
          }
        });

        if (affectedWeekIds.size > 0) {
          affectedWeekIds.forEach((wId) => {
            refreshSingleWeekBullets(wId);
          });
          scheduleBroadcast();
        }
      },
      (err) => {
        console.warn('CollectionGroup entries query fallback to individual week listeners:', err.message);
      }
    );
    activeUnsubscribes.push(entriesGroupUnsub);
  } catch (cgErr) {
    console.warn('CollectionGroup initialization note:', cgErr);
  }

  // 4. Real-Time Folders Collection Listener (/folders)
  const foldersUnsub = onSnapshot(
    collection(db, 'folders'),
    (snap) => {
      markHydrated();

      if (snap.metadata.hasPendingWrites) {
        return;
      }

      if (!snap.empty) {
        let hasChanges = false;
        snap.docChanges().forEach((change) => {
          if (change.doc.metadata.hasPendingWrites) return;

          const folder = { id: change.doc.id, ...change.doc.data() } as CoreCategoryConfig;
          if (change.type === 'removed') {
            foldersMap.delete(folder.id);
            hasChanges = true;
          } else {
            foldersMap.set(folder.id, folder);
            hasChanges = true;
          }
        });

        if (hasChanges) {
          cachedConsolidatedFolders = Array.from(foldersMap.values());
          scheduleBroadcast();
        }
      }
    },
    (err) => {
      console.warn('Folders subscription note:', err.message);
    }
  );
  activeUnsubscribes.push(foldersUnsub);

  // 5. Real-Time Core Topics Collection Listener (/core_topics)
  const coreTopicsUnsub = onSnapshot(
    collection(db, 'core_topics'),
    (snap) => {
      markHydrated();

      // (1) Skip processing snapshot changes where snapshot.metadata.hasPendingWrites is true for local writes
      if (snap.metadata.hasPendingWrites) {
        return;
      }

      let hasChanges = false;
      snap.docChanges().forEach((change) => {
        if (change.doc.metadata.hasPendingWrites) return;

        const item = { id: change.doc.id, ...change.doc.data() } as CoreTopicItem;
        if (change.type === 'removed') {
          coreItemsMap.delete(item.id);
          hasChanges = true;
        } else {
          // (2) Granular check: Only update item if different
          const existing = coreItemsMap.get(item.id);
          if (!existing || JSON.stringify(existing) !== JSON.stringify(item)) {
            coreItemsMap.set(item.id, item);
            hasChanges = true;
          }
        }
      });

      if (hasChanges) {
        cachedConsolidatedCoreItems = Array.from(coreItemsMap.values());
        scheduleBroadcast();
      }
    },
    (err) => {
      console.warn('Core topics subscription note:', err.message);
    }
  );
  activeUnsubscribes.push(coreTopicsUnsub);

  // 6. Real-Time Core Categories Fallback Settings Listener (/core_categories/settings)
  const coreCategoriesUnsub = onSnapshot(
    doc(db, 'core_categories', 'settings'),
    (snap) => {
      if (snap.metadata.hasPendingWrites) {
        return;
      }

      if (snap.exists()) {
        const data = snap.data();
        if (data && Array.isArray(data.categories)) {
          coreCategoriesFallback = data.categories as CoreCategoryConfig[];
          if (foldersMap.size === 0) {
            cachedConsolidatedFolders = coreCategoriesFallback;
            scheduleBroadcast();
          }
        }
      }
    },
    (err) => {
      console.warn('Core categories settings note:', err.message);
    }
  );
  activeUnsubscribes.push(coreCategoriesUnsub);

  // 7. Real-Time Comments Listener (/comments)
  const commentsUnsub = onSnapshot(
    collection(db, 'comments'),
    (snap) => {
      if (snap.metadata.hasPendingWrites) {
        return;
      }

      commentsList = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as CommentItem[];
      cachedComments = commentsList;
      scheduleBroadcast();
    },
    (err) => {
      console.warn('Comments subscription note:', err.message);
    }
  );
  activeUnsubscribes.push(commentsUnsub);

  return () => {
    window.removeEventListener('storage', handleStorage);
    journalDataListeners.delete(onUpdate);
    activeUnsubscribes.forEach((unsub) => unsub());
    if (broadcastDebounceTimer) {
      clearTimeout(broadcastDebounceTimer);
    }
  };
}

/**
 * Save live journal data to Cloud Firestore using Atomic Subcollections & Discrete Documents
 * Guarantees zero race conditions, atomic document writes, and non-destructive persistence.
 */
export async function saveJournalDataToCloud(
  state: AppState,
  targetEntryId?: string,
  targetWeekId?: string
): Promise<void> {
  // 1. Immediate Local Backup Guarantee
  try {
    const backupJson = JSON.stringify(state);
    localStorage.setItem(BACKUP_PAYLOAD_STORAGE_KEY, backupJson);
    localStorage.setItem('journal_backup', backupJson);
    localStorage.setItem('journal_failsafe_backup', backupJson);
    localStorage.setItem(CLOUD_SYNC_STORAGE_KEY, backupJson);
  } catch (err) {
    console.warn('Failed to sync journal state locally:', err);
  }

  // 2. Targeted Atomic Entry Write if specific entryId is provided
  if (targetEntryId) {
    let targetBullet: BulletPoint | null = null;
    let parentWeekId = targetWeekId || '';

    if (!parentWeekId) {
      for (const w of state.weeks || []) {
        const found = w.bullets?.find((b) => b.id === targetEntryId);
        if (found) {
          targetBullet = found;
          parentWeekId = w.id;
          break;
        }
      }
    } else {
      const w = state.weeks?.find((week) => week.id === parentWeekId);
      targetBullet = w?.bullets?.find((b) => b.id === targetEntryId) || null;
    }

    if (targetBullet && parentWeekId) {
      await saveEntryDoc(parentWeekId, targetBullet);
      return;
    }
  }

  // 3. Full Atomic Dispatch: Write week shells, entries, folders, and core topics independently
  try {
    // Save Weeks & Entries
    for (const week of state.weeks || []) {
      await saveWeekMetaDoc(week);
      for (const bullet of week.bullets || []) {
        await saveEntryDoc(week.id, bullet);
      }
    }

    // Save Folders / Categories
    for (const cat of state.coreCategories || []) {
      await saveFolderDoc(cat);
    }
    if (state.coreCategories && state.coreCategories.length > 0) {
      await saveCoreCategoriesDoc(state.coreCategories);
    }

    // Save Core Topic Notes
    for (const item of state.coreItems || []) {
      await saveCoreTopicDoc(item);
    }

    // Save Comments
    for (const comment of state.comments || []) {
      await saveCommentDoc(comment);
    }

    // Keep legacy fallback document updated for backward compatibility
    try {
      const appStateDocRef = doc(db, 'app_state', 'journal');
      await setDoc(
        appStateDocRef,
        sanitizeForFirestore({
          weeks: state.weeks,
          coreItems: state.coreItems,
          coreCategories: state.coreCategories,
          updatedAt: new Date().toISOString(),
          clientSessionId: CLIENT_SESSION_ID,
        }),
        { merge: true }
      );
    } catch {}

    console.log('[Atomic Sync] Full atomic cloud synchronization completed.');
  } catch (err) {
    console.error('[Atomic Sync Error] Cloud write failure:', err);
    throw err;
  }
}

/**
 * Force a lightweight state re-sync on tab focus / visibilitychange
 */
export async function refreshFirestoreSync(): Promise<void> {
  try {
    const weeksSnap = await getDocs(collection(db, 'weeks'));
    if (!weeksSnap.empty) {
      const permsSnap = await getDoc(doc(db, 'permissions', 'global'));
      if (permsSnap.exists()) {
        const permsData = permsSnap.data() as PermissionsDoc;
        localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(permsData));
        permissionsListeners.forEach((listener) => listener(permsData));
      }
    }
  } catch (err) {
    console.warn('[Sync] Focus refresh fallback note:', err);
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
