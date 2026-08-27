import { Attachment } from '../types';
import { uploadFileToStorage } from '../lib/firebase';

/**
 * 950KB safe payload threshold.
 * Firestore enforces a strict 1MB (1,048,576 bytes) document limit.
 * Keeping attachments under 950KB provides a safe headroom for document metadata.
 */
export const MAX_SAFE_ATTACHMENTS_SIZE_BYTES = 950 * 1024; // 950 KB

/**
 * Calculates the total approximate storage payload size in bytes of attachments.
 * Base64 data URLs consume their actual string character length.
 * Cloud Storage URLs consume only their minimal URL string length (~150 bytes).
 */
export function calculateAttachmentsSize(attachments?: Attachment[]): number {
  if (!attachments || !Array.isArray(attachments)) return 0;
  return attachments.reduce((total, att) => {
    if (!att || !att.url) return total;
    if (att.url.startsWith('data:')) {
      return total + att.url.length;
    }
    return total + (att.url.length || 150);
  }, 0);
}

/**
 * Checks if total attachments size exceeds the safe threshold.
 */
export function isAttachmentsSizeExceeded(
  attachments?: Attachment[],
  limit = MAX_SAFE_ATTACHMENTS_SIZE_BYTES
): boolean {
  return calculateAttachmentsSize(attachments) > limit;
}

/**
 * Generates a clean unique ID for an attachment.
 */
export function generateAttachmentId(): string {
  return `att_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Checks if a URL or MIME type indicates a video.
 */
export function isVideoMedia(url?: string, mimeType?: string): boolean {
  if (mimeType && (mimeType === 'video' || mimeType.startsWith('video/'))) return true;
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  if (
    lowerUrl.startsWith('data:video/') ||
    lowerUrl.endsWith('.mp4') ||
    lowerUrl.endsWith('.webm') ||
    lowerUrl.endsWith('.mov') ||
    lowerUrl.endsWith('.ogg') ||
    lowerUrl.includes('.mp4?') ||
    lowerUrl.includes('.webm?') ||
    lowerUrl.includes('.mov?') ||
    lowerUrl.includes('.ogg?') ||
    lowerUrl.includes('youtube.com') ||
    lowerUrl.includes('youtu.be') ||
    lowerUrl.includes('vimeo.com')
  ) {
    return true;
  }
  return false;
}

/**
 * Checks if a URL or MIME type indicates a PDF document.
 */
export function isPdfMedia(url?: string, mimeType?: string): boolean {
  if (mimeType && (mimeType === 'pdf' || mimeType === 'application/pdf')) return true;
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  if (
    lowerUrl.startsWith('data:application/pdf') ||
    lowerUrl.endsWith('.pdf') ||
    lowerUrl.includes('.pdf?')
  ) {
    return true;
  }
  return false;
}

/**
 * Generates a first-frame thumbnail from a video File or URL.
 * Seeks to currentTime = 0.1 to avoid blank/black initial frames.
 */
export function generateVideoThumbnail(
  source: string | File
): Promise<string | undefined> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve(undefined);
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    let objectUrlToRevoke: string | null = null;
    if (source instanceof File) {
      objectUrlToRevoke = URL.createObjectURL(source);
      video.src = objectUrlToRevoke;
    } else {
      video.src = source;
    }

    let isResolved = false;
    const cleanup = () => {
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
        objectUrlToRevoke = null;
      }
      video.removeAttribute('src');
      video.load();
    };

    const finish = (result?: string) => {
      if (isResolved) return;
      isResolved = true;
      clearTimeout(timer);
      cleanup();
      resolve(result);
    };

    // Safety timeout in case video metadata/seek fails
    const timer = setTimeout(() => {
      finish(undefined);
    }, 6000);

    video.onloadedmetadata = () => {
      try {
        const targetTime = video.duration && video.duration > 0.1 ? 0.1 : 0;
        video.currentTime = targetTime;
      } catch {
        finish(undefined);
      }
    };

    video.onseeked = () => {
      try {
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 360;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          finish(undefined);
          return;
        }

        ctx.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        finish(dataUrl);
      } catch (err) {
        console.warn('[Video Thumbnail] Canvas export failed:', err);
        finish(undefined);
      }
    };

    video.onerror = () => {
      finish(undefined);
    };
  });
}

/**
 * High-performance image compressor (fallback for offline or local preview):
 * - Downscales photos to max dimension 1200px (width or height).
 * - Encodes with JPEG quality 0.7.
 * - Iteratively steps down quality/resolution if size exceeds 180KB.
 */
export function compressImageToBase64(
  file: File,
  maxDimension = 1200,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If SVG, read directly as text DataURL
    if (file.type.includes('svg')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Downscale to maxDimension
        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to JPEG
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Secondary compression pass if Base64 string > 240,000 chars (~180KB)
        if (dataUrl.length > 240000) {
          const secondCanvas = document.createElement('canvas');
          const secondWidth = Math.round(width * 0.75);
          const secondHeight = Math.round(height * 0.75);
          secondCanvas.width = secondWidth;
          secondCanvas.height = secondHeight;
          const secondCtx = secondCanvas.getContext('2d');
          if (secondCtx) {
            secondCtx.drawImage(img, 0, 0, secondWidth, secondHeight);
            dataUrl = secondCanvas.toDataURL('image/jpeg', 0.55);
          }
        }

        // Tertiary failsafe pass if still > 350,000 chars
        if (dataUrl.length > 350000) {
          const thirdCanvas = document.createElement('canvas');
          const thirdWidth = Math.round(width * 0.5);
          const thirdHeight = Math.round(height * 0.5);
          thirdCanvas.width = thirdWidth;
          thirdCanvas.height = thirdHeight;
          const thirdCtx = thirdCanvas.getContext('2d');
          if (thirdCtx) {
            thirdCtx.drawImage(img, 0, 0, thirdWidth, thirdHeight);
            dataUrl = thirdCanvas.toDataURL('image/jpeg', 0.5);
          }
        }

        resolve(dataUrl);
      };
      img.onerror = () => {
        resolve(e.target?.result as string);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Reads PDF file into Data URL with safety guard (fallback only).
 */
export function readPdfFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Reads video file into Data URL with safety guard (fallback only).
 */
export function readVideoFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 10 * 1024 * 1024) {
      console.warn('Large video file detected (>10MB). Uploading to Cloud Storage is strongly recommended.');
    }
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a browser File into a persistent Attachment by uploading directly to Firebase Cloud Storage.
 * Stores only the lightweight download URL in the Firestore entry document.
 */
export async function fileToPersistentAttachment(file: File): Promise<Attachment> {
  const isPdf = file.type === 'application/pdf' || isPdfMedia(file.name, file.type);
  const isVideo = !isPdf && (file.type.startsWith('video/') || isVideoMedia(file.name));
  let persistentUrl: string;
  let thumbnailUrl: string | undefined;

  try {
    // 1. Primary path: Upload to Firebase Cloud Storage
    const folder = isPdf
      ? 'attachments/pdfs'
      : isVideo
      ? 'attachments/videos'
      : 'attachments/images';
    persistentUrl = await uploadFileToStorage(file, folder);
    console.log(`[Attachment Upload] Successfully stored file in Cloud Storage: ${file.name}`);
  } catch (storageErr) {
    console.warn('[Attachment Upload] Cloud Storage direct upload failed or offline. Falling back to local Base64:', storageErr);
    // 2. Fallback path:
    if (isPdf) {
      persistentUrl = await readPdfFileAsBase64(file);
    } else if (isVideo) {
      persistentUrl = await readVideoFileAsBase64(file);
    } else {
      persistentUrl = await compressImageToBase64(file);
    }
  }

  // Generate a first-frame thumbnail on upload for videos
  if (isVideo) {
    try {
      thumbnailUrl = await generateVideoThumbnail(file);
      if (!thumbnailUrl && persistentUrl) {
        thumbnailUrl = await generateVideoThumbnail(persistentUrl);
      }
    } catch (thumbErr) {
      console.warn('[Attachment Upload] Video thumbnail generation skipped:', thumbErr);
    }
  }

  return {
    id: generateAttachmentId(),
    url: persistentUrl,
    type: isPdf ? 'pdf' : isVideo ? 'video' : 'image',
    name: file.name || (isPdf ? 'PDF Document' : isVideo ? 'Video Attachment' : 'Photo Attachment'),
    createdAt: new Date().toISOString(),
    size: file.size,
    thumbnailUrl,
  };
}

/**
 * Converts multiple browser Files into persistent Cloud Storage Attachment objects in parallel.
 */
export async function filesToPersistentAttachments(files: FileList | File[]): Promise<Attachment[]> {
  const fileArray = Array.from(files);
  const promises = fileArray.map((file) => fileToPersistentAttachment(file));
  return Promise.all(promises);
}

/**
 * Creates an Attachment from an external or pasted URL.
 */
export function createAttachmentFromUrl(
  url: string,
  name?: string,
  caption?: string
): Attachment {
  const isPdf = isPdfMedia(url);
  const isVideo = !isPdf && isVideoMedia(url);
  return {
    id: generateAttachmentId(),
    url: url.trim(),
    type: isPdf ? 'pdf' : isVideo ? 'video' : 'image',
    name: name || (isPdf ? 'External PDF' : isVideo ? 'External Video' : 'External Image'),
    createdAt: new Date().toISOString(),
    caption: caption?.trim() || undefined,
  };
}

/**
 * Normalizes legacy item media (`mediaUrl`, `mediaType`, `mediaCaption`)
 * with modern `attachments` array to ensure 100% backward & forward compatibility.
 */
export function getNormalizedAttachments(item: {
  attachments?: Attachment[];
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'link';
  mediaCaption?: string;
}): Attachment[] {
  const result: Attachment[] = [];

  if (item.attachments && Array.isArray(item.attachments) && item.attachments.length > 0) {
    result.push(...item.attachments);
  } else if (item.mediaUrl && item.mediaUrl.trim()) {
    result.push({
      id: `legacy_${item.mediaUrl.slice(-10)}`,
      url: item.mediaUrl.trim(),
      type: item.mediaType === 'video' || isVideoMedia(item.mediaUrl)
        ? 'video'
        : isPdfMedia(item.mediaUrl)
        ? 'pdf'
        : 'image',
      name: item.mediaCaption || 'Attached Media',
      createdAt: new Date().toISOString(),
      caption: item.mediaCaption,
    });
  }

  return result;
}
