import { contextExtractor } from '@/services/contextExtractor';
import type { RuntimeRequest, RuntimeResponse } from '@/types';

chrome.runtime.onMessage.addListener((request: RuntimeRequest, _sender, sendResponse) => {
  if (request.type === 'GET_PAGE_CONTEXT') {
    const context = contextExtractor.extract();
    sendResponse({ context } satisfies RuntimeResponse);
    return true;
  }

  if (request.type === 'EXECUTE_TAB_ACTION') {
    const payload = request.data as { 
      action: 'READ_VISIBLE_TEXT' | 'SCROLL_BY' | 'CLICK' | 'INPUT' | 'EXECUTE_JS'; 
      value?: number | string;
      target?: string;
    };
    
    if (payload.action === 'READ_VISIBLE_TEXT') {
      const text = getVisibleReadableText();
      sendResponse({ actionResult: { ok: true, text } } satisfies RuntimeResponse);
      return true;
    }

    if (payload.action === 'SCROLL_BY') {
      const amount = typeof payload.value === 'number' ? payload.value : 700;
      window.scrollBy({ top: amount, behavior: 'smooth' });
      sendResponse({ actionResult: { ok: true, scrolledBy: amount } } satisfies RuntimeResponse);
      return true;
    }

    if (payload.action === 'CLICK' && payload.target) {
      try {
        const el = document.querySelector(payload.target) as HTMLElement;
        if (el) {
          el.click();
          sendResponse({ actionResult: { ok: true, message: `Clicked ${payload.target}` } } satisfies RuntimeResponse);
        } else {
          sendResponse({ actionResult: { ok: false, error: `Element not found: ${payload.target}` } } satisfies RuntimeResponse);
        }
      } catch (e) {
        sendResponse({ actionResult: { ok: false, error: String(e) } } satisfies RuntimeResponse);
      }
      return true;
    }

    if (payload.action === 'INPUT' && payload.target && payload.value) {
      try {
        const el = document.querySelector(payload.target) as HTMLInputElement | HTMLTextAreaElement;
        if (el) {
          el.value = String(payload.value);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          sendResponse({ actionResult: { ok: true, message: `Typed into ${payload.target}` } } satisfies RuntimeResponse);
        } else {
          sendResponse({ actionResult: { ok: false, error: `Element not found: ${payload.target}` } } satisfies RuntimeResponse);
        }
      } catch (e) {
        sendResponse({ actionResult: { ok: false, error: String(e) } } satisfies RuntimeResponse);
      }
      return true;
    }

    if (payload.action === 'EXECUTE_JS' && payload.value) {
      try {
        // Evaluate simple script snippets returned by the AI
        // eslint-disable-next-line no-eval
        const result = eval(String(payload.value));
        sendResponse({ actionResult: { ok: true, message: `Executed JS block. Result: ${String(result).slice(0, 500)}` } } satisfies RuntimeResponse);
      } catch (e) {
         sendResponse({ actionResult: { ok: false, error: String(e) } } satisfies RuntimeResponse);
      }
      return true;
    }
  }
  return false;
});

function getVisibleReadableText(): string {
  const selectedText = window.getSelection()?.toString().trim();
  if (selectedText) {
    return selectedText;
  }

  const blocks = Array.from(document.querySelectorAll('p,li,h1,h2,h3,h4,blockquote'))
    .map((node) => node.textContent?.trim() ?? '')
    .filter((text) => text.length > 40)
    .slice(0, 40);

  const joined = blocks.join('\n').slice(0, 8000);
  return joined || document.body?.innerText?.slice(0, 8000) || '';
}
