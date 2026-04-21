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
      action: 'READ_VISIBLE_TEXT' | 'SCROLL_BY' | 'CLICK' | 'INPUT' | 'QUERY_DOM' | 'GET_INTERACTIVE_ELEMENTS'; 
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

    if (payload.action === 'QUERY_DOM' && payload.target) {
      try {
        const elements = Array.from(document.querySelectorAll(payload.target)).map(el => ({
          text: (el as HTMLElement).innerText?.trim().slice(0, 500),
          value: (el as HTMLInputElement).value,
          attributes: Array.from(el.attributes).reduce((acc, attr) => ({ ...acc, [attr.name]: attr.value }), {})
        }));
        sendResponse({ actionResult: { ok: true, text: JSON.stringify(elements.slice(0, 10)) } } satisfies RuntimeResponse);
      } catch (e) {
         sendResponse({ actionResult: { ok: false, error: String(e) } } satisfies RuntimeResponse);
      }
      return true;
    }

    if (payload.action === 'GET_INTERACTIVE_ELEMENTS') {
      const elements = getInteractiveElements();
      sendResponse({ actionResult: { ok: true, text: JSON.stringify(elements) } } satisfies RuntimeResponse);
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

function getInteractiveElements() {
  const interactive = Array.from(document.querySelectorAll('button, input, a, select, textarea, [role="button"], [onclick]'));
  return interactive.map(el => {
    const htmlEl = el as HTMLElement;
    // Generate a simple unique-ish selector
    let selector = htmlEl.tagName.toLowerCase();
    if (htmlEl.id) selector += `#${htmlEl.id}`;
    else if (htmlEl.className) {
      const firstClass = htmlEl.className.split(' ')[0];
      if (firstClass && typeof firstClass === 'string') selector += `.${firstClass}`;
    }

    return {
      tagName: htmlEl.tagName,
      type: (htmlEl as any).type || '',
      text: htmlEl.innerText?.trim().slice(0, 50) || (htmlEl as HTMLInputElement).placeholder || htmlEl.getAttribute('aria-label') || '',
      selector: selector,
      isVisible: htmlEl.offsetWidth > 0 && htmlEl.offsetHeight > 0
    };
  }).filter(item => item.isVisible && (item.text || item.selector.includes('#'))).slice(0, 50);
}
