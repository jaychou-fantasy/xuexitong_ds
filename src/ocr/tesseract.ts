/**
 * Tesseract.js OCR wrapper for the Chaoxing extension.
 *
 * Uses Tesseract.js v5 with 'chi_sim' (Simplified Chinese) language.
 * Language data (~10MB) downloads from CDN on first use, cached in IndexedDB.
 */

import Tesseract from 'tesseract.js';

const OCR_TIMEOUT_MS = 20_000;

/**
 * Pre-download Tesseract language data so OCR is instant later.
 * Call once when the extension loads. Downloads ~20MB total for
 * chi_sim + eng, cached in IndexedDB permanently.
 *
 * Returns progress messages: 'downloading' | 'done' | 'failed'
 */
export async function preloadOCRLanguages(
  onProgress?: (status: string) => void,
): Promise<void> {
  onProgress?.('开始下载中文语言包...');
  let worker: Tesseract.Worker | null = null;

  try {
    // Create worker with Chinese + English
    worker = await Tesseract.createWorker('chi_sim+eng', undefined, {
      logger: (m) => {
        if (m.status === 'loading tesseract core') {
          onProgress?.('加载 OCR 引擎...');
        } else if (m.status === 'loading language traineddata') {
          onProgress?.(`下载语言包... ${Math.round((m.progress || 0) * 100)}%`);
        } else if (m.status === 'initializing api') {
          onProgress?.('初始化...');
        }
      },
    });

    // Run a dummy recognition to ensure everything is cached
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    await worker.recognize(canvas);

    onProgress?.('done');
    console.log('[xuexitong_ds] OCR languages preloaded (chi_sim+eng)');
  } catch (err) {
    onProgress?.('failed');
    console.warn('[xuexitong_ds] OCR preload failed:', err);
  } finally {
    if (worker) {
      await worker.terminate().catch(() => {});
    }
  }
}
const MAX_RETRIES = 2;

/**
 * Recognize text from a single image element.
 * Returns empty string on failure.
 */
export async function recognizeImage(
  img: HTMLImageElement | HTMLCanvasElement,
): Promise<string> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Capture promise to swallow late rejections after timeout
      const recognizePromise = Tesseract.recognize(img, 'chi_sim', {});
      recognizePromise.catch(() => {});

      const result = await withTimeout(recognizePromise, OCR_TIMEOUT_MS);
      const text = cleanOCRText(result.data.text);
      return text;
    } catch (err) {
      const isLast = attempt === MAX_RETRIES;
      if (isLast) {
        console.warn(
          `[xuexitong_ds] OCR failed after ${MAX_RETRIES + 1} attempts:`,
          err instanceof Error ? err.message : err,
        );
        return '';
      }
      await sleep(1000);
    }
  }
  return '';
}

/**
 * Batch recognize multiple images. Reuses a single Tesseract worker
 * for efficiency, then terminates it.
 */
export async function recognizeImages(
  images: (HTMLImageElement | HTMLCanvasElement)[],
  onProgress?: (current: number, total: number) => void,
): Promise<string[]> {
  if (images.length === 0) return [];

  const results: string[] = [];
  let worker: Tesseract.Worker | null = null;

  try {
    worker = await Tesseract.createWorker('chi_sim');

    for (let i = 0; i < images.length; i++) {
      onProgress?.(i + 1, images.length);

      try {
        // Capture the raw promise so we can silence late rejections
        // that fire after worker termination (avoids "Cannot read
        // properties of null (reading 'postMessage')").
        const recognizePromise = worker!.recognize(images[i]);
        recognizePromise.catch(() => {});

        const result = await withTimeout(recognizePromise, OCR_TIMEOUT_MS);
        results.push(cleanOCRText(result.data.text));
      } catch (err) {
        console.warn(
          `[xuexitong_ds] OCR image ${i + 1}/${images.length} failed:`,
          err instanceof Error ? err.message : err,
        );
        results.push('');

        // Worker may be stuck after timeout — terminate and recreate
        // so subsequent images get a clean worker.
        if (worker) {
          await worker.terminate().catch(() => {});
          worker = null;
        }
        if (i < images.length - 1) {
          worker = await Tesseract.createWorker('chi_sim');
        }
      }
    }
  } finally {
    if (worker) {
      await worker.terminate().catch(() => {});
    }
  }

  return results;
}

/**
 * Clean common OCR output artifacts.
 */
function cleanOCRText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')    // max 2 consecutive newlines
    .replace(/^\s+|\s+$/gm, '')     // trim each line
    .trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('OCR 超时')), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}
