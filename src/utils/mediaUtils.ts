import { Attachment } from '../types';

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
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  if (mimeType && mimeType.startsWith('video/')) return true;
  if (
    lowerUrl.startsWith('data:video/') ||
    lowerUrl.endsWith('.mp4') ||
    lowerUrl.endsWith('.webm') ||
    lowerUrl.endsWith('.mov') ||
    lowerUrl.endsWith('.ogg') ||
    lowerUrl.includes('youtube.com') ||
    lowerUrl.includes('youtu.be') ||
    lowerUrl.includes('vimeo.com')
  ) {
    return true;
  }
  return false;
}

/**
 * Optimizes an image File to a crisp, persistent Base64 Data URL.
 * Automatically downscales if exceeding maxDimension to keep Firestore/LocalStorage payload snappy.
 */
export function compressImageToBase64(
  file: File,
  maxDimension = 1600,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If not an image or SVG/GIF, read directly as DataURL
    if (!file.type.startsWith('image/') || file.type.includes('svg') || file.type.includes('gif')) {
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
        if (width <= maxDimension && height <= maxDimension && file.size < 500 * 1024) {
          // If already within dimensions and < 500KB, use raw data URL
          resolve(e.target?.result as string);
          return;
        }

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

        ctx.drawImage(img, 0, 0, width, height);
        // Use image/jpeg for photos, image/png for transparent photos
        const targetType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(targetType, quality);
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
 * Reads any video file into a persistent Data URL.
 */
export function readVideoFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a browser File to a persistent Attachment object.
 */
export async function fileToPersistentAttachment(file: File): Promise<Attachment> {
  const isVideo = file.type.startsWith('video/') || isVideoMedia(file.name);
  let dataUrl: string;

  if (isVideo) {
    dataUrl = await readVideoFileAsBase64(file);
  } else {
    dataUrl = await compressImageToBase64(file);
  }

  return {
    id: generateAttachmentId(),
    url: dataUrl,
    type: isVideo ? 'video' : 'image',
    name: file.name || (isVideo ? 'Video Attachment' : 'Photo Attachment'),
    createdAt: new Date().toISOString(),
    size: file.size,
  };
}

/**
 * Converts multiple browser Files into persistent Attachment objects in parallel.
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
  const isVideo = isVideoMedia(url);
  return {
    id: generateAttachmentId(),
    url: url.trim(),
    type: isVideo ? 'video' : 'image',
    name: name || (isVideo ? 'External Video' : 'External Image'),
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
      type: item.mediaType === 'video' || isVideoMedia(item.mediaUrl) ? 'video' : 'image',
      name: item.mediaCaption || 'Attached Media',
      createdAt: new Date().toISOString(),
      caption: item.mediaCaption,
    });
  }

  return result;
}
