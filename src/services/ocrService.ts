import { createWorker } from 'tesseract.js';

export const ocrService = {
  async readArabicAndEnglish(imageDataUrl: string): Promise<string> {
    const worker = await createWorker('ara+eng');
    try {
      const result = await worker.recognize(imageDataUrl);
      return result.data.text?.trim() ?? '';
    } finally {
      await worker.terminate();
    }
  },
};
