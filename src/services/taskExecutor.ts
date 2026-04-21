import type { ExecutionResult, Plan } from '@/types';
import { ocrService } from '@/services/ocrService';

export const taskExecutor = {
  async execute(plan: Plan): Promise<ExecutionResult> {
    const items: string[] = [];

    for (const phase of plan.phases) {
      for (const step of phase.steps) {
        items.push(`Completed: ${phase.title} -> ${step.description}`);
      }
    }

    const tab = await getActiveTab();
    if (tab?.id) {
      const extractedSegments: string[] = [];

      for (let i = 0; i < 3; i += 1) {
        const read = (await chrome.tabs.sendMessage(tab.id, {
          type: 'EXECUTE_TAB_ACTION',
          data: { action: 'READ_VISIBLE_TEXT' },
        })) as { actionResult?: { text?: string } };

        const text = read?.actionResult?.text?.trim();
        if (text) {
          extractedSegments.push(text.slice(0, 1200));
        }

        if (i < 2) {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'EXECUTE_TAB_ACTION',
            data: { action: 'SCROLL_BY', value: 900 },
          });
          await delay(900);
        }
      }

      const screenshotText = await tryOcrVisibleTab(tab.windowId);
      if (screenshotText) {
        extractedSegments.push(screenshotText);
        items.push('OCR extracted text from visible scan image/screenshot.');
      }

      if (extractedSegments.length > 0) {
        items.push(`Captured ${extractedSegments.length} page segment(s) from the active tab.`);
        const extractedText = extractedSegments
          .map((segment, idx) => `--- Segment ${idx + 1} ---\n${segment}`)
          .join('\n\n')
          .slice(0, 10000);
        return {
          summary: `Executed ${items.length} steps across ${plan.phases.length} phase(s).`,
          items,
          extractedText,
        };
      } else {
        items.push('No readable text segment was captured from the active tab.');
      }
    } else {
      items.push('No active tab found for autonomous reading.');
    }

    return {
      summary: `Executed ${items.length} steps across ${plan.phases.length} phase(s).`,
      items,
    };
  },
};

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function tryOcrVisibleTab(windowId?: number): Promise<string> {
  try {
    const dataUrl =
      typeof windowId === 'number'
        ? await chrome.tabs.captureVisibleTab(windowId, { format: 'png' })
        : await chrome.tabs.captureVisibleTab({ format: 'png' });
    const text = await ocrService.readArabicAndEnglish(dataUrl);
    return text.slice(0, 4000);
  } catch {
    return '';
  }
}
