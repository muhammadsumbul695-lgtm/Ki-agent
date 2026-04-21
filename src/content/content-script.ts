import { contextExtractor } from '@/services/contextExtractor';
import type { RuntimeRequest, RuntimeResponse } from '@/types';

chrome.runtime.onMessage.addListener((request: RuntimeRequest, _sender, sendResponse) => {
  if (request.type === 'GET_PAGE_CONTEXT') {
    const context = contextExtractor.extract();
    sendResponse({ context } satisfies RuntimeResponse);
    return true;
  }

  if (request.type === 'EXECUTE_TAB_ACTION') {
    const payload = request.data as { action: 'READ_VISIBLE_TEXT' | 'SCROLL_BY'; value?: number };
    if (payload.action === 'READ_VISIBLE_TEXT') {
      const text = getVisibleReadableText();
      sendResponse({ actionResult: { ok: true, text } } satisfies RuntimeResponse);
      return true;
    }

    if (payload.action === 'SCROLL_BY') {
      const amount = payload.value ?? 700;
      window.scrollBy({ top: amount, behavior: 'smooth' });
      sendResponse({ actionResult: { ok: true, scrolledBy: amount } } satisfies RuntimeResponse);
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
