/**
 * Utility to compress images in browser before OCR upload or saving.
 * Reduces 10MB phone camera photos down to crisp ~100-200KB JPEGs,
 * preserving high text contrast and legibility for Gemini vision.
 */
export async function compressImage(
  input: File | string,
  maxWidth = 1400,
  maxHeight = 1400,
  quality = 0.8
): Promise<{ dataUrl: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    let sourceUrl: string;
    let needsRevoke = false;

    if (typeof input === 'string') {
      sourceUrl = input;
    } else {
      sourceUrl = URL.createObjectURL(input);
      needsRevoke = true;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          if (needsRevoke) URL.revokeObjectURL(sourceUrl);
          resolve({ dataUrl: typeof input === 'string' ? input : sourceUrl, mimeType: 'image/jpeg' });
          return;
        }

        // Fill white background for transparent PNGs
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Smooth image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        if (needsRevoke) URL.revokeObjectURL(sourceUrl);

        resolve({
          dataUrl: compressedDataUrl,
          mimeType: 'image/jpeg',
        });
      } catch (err) {
        if (needsRevoke) URL.revokeObjectURL(sourceUrl);
        // Fallback to original string if compression failed
        resolve({
          dataUrl: typeof input === 'string' ? input : sourceUrl,
          mimeType: 'image/jpeg',
        });
      }
    };

    img.onerror = (err) => {
      if (needsRevoke) URL.revokeObjectURL(sourceUrl);
      reject(err);
    };

    img.src = sourceUrl;
  });
}
