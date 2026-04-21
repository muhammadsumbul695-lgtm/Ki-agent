import { aiService } from '@/services/aiService';
import { storageService, type Settings } from '@/services/storageService';
import { taskExecutor } from '@/services/taskExecutor';
import type { RuntimeRequest, RuntimeResponse } from '@/types';

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => undefined);
});

chrome.runtime.onMessage.addListener((request: RuntimeRequest, _sender, sendResponse) => {
  void routeRequest(request, sendResponse);
  return true;
});

async function routeRequest(
  request: RuntimeRequest,
  sendResponse: (response: RuntimeResponse) => void,
): Promise<void> {
  try {
    switch (request.type) {
      case 'SEND_MESSAGE':
        await handleUserMessage(request.data as { content: string }, sendResponse);
        break;
      case 'EXECUTE_SCAN':
        await handleExecuteScan(sendResponse);
        break;
      case 'APPROVE_PLAN':
        await handlePlanApproval(request.data as { planId: string; plan: any }, sendResponse);
        break;
      case 'REJECT_PLAN':
        sendResponse({ type: 'PLAN_REJECTED', content: 'Plan rejected.' });
        break;
      case 'GET_CHAT_HISTORY':
        sendResponse({ history: await storageService.getConversationHistory() });
        break;
      default:
        sendResponse({ error: 'Unsupported request type.' });
    }
  } catch (error) {
    sendResponse({ error: error instanceof Error ? error.message : 'Unexpected error' });
  }
}

function getChatOptions(settings: Settings, history: any[] = []) {
  const base = {
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
    systemPrompt: settings.systemPrompt,
    conversationHistory: history.map((h) => ({ role: h.role, content: h.content })),
  };

  if (settings.provider === 'groq') {
    return { ...base, provider: 'groq' as const, apiKey: settings.groqApiKey, model: settings.groqModel };
  }
  if (settings.provider === 'google') {
    return { ...base, provider: 'google' as const, apiKey: settings.googleApiKey, model: settings.googleModel };
  }
  if (settings.provider === 'anthropic') {
    return { ...base, provider: 'anthropic' as const, apiKey: settings.apiKey, model: settings.model };
  }
  return { ...base, provider: 'local' as const, apiKey: '', model: settings.localModel, localModel: settings.localModel };
}

// Shared helper: extract page text with auto-injection fallback
async function getPageText(tabId: number): Promise<string> {
  // First try the already-injected content script
  try {
    const result = await chrome.tabs.sendMessage(tabId, {
      type: 'EXECUTE_TAB_ACTION',
      data: { action: 'READ_VISIBLE_TEXT' },
    }) as { actionResult?: { text?: string } };
    const text = result?.actionResult?.text?.trim();
    if (text) return text;
  } catch {
    // Content script not injected — inject it dynamically
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['src/content/content-script.js'],
      });
      // Small wait for script to register
      await new Promise(resolve => setTimeout(resolve, 300));
      const result = await chrome.tabs.sendMessage(tabId, {
        type: 'EXECUTE_TAB_ACTION',
        data: { action: 'READ_VISIBLE_TEXT' },
      }) as { actionResult?: { text?: string } };
      const text = result?.actionResult?.text?.trim();
      if (text) return text;
    } catch {
      // Last resort: inject a raw inline script to grab DOM text
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            const blocks = Array.from(document.querySelectorAll('p,li,h1,h2,h3,h4,blockquote,article,section'))
              .map(el => (el as HTMLElement).innerText?.trim())
              .filter(t => t && t.length > 30)
              .slice(0, 60);
            return blocks.join('\n') || (document.body as HTMLElement).innerText.slice(0, 8000);
          },
        });
        return (results?.[0]?.result as string) ?? '';
      } catch {
        return '';
      }
    }
  }
  return '';
}

async function handleExecuteScan(
  sendResponse: (response: RuntimeResponse) => void,
): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    if (!activeTab?.id) {
      sendResponse({ error: 'No active tab found. Make sure you have a webpage open.' });
      return;
    }

    if (activeTab.url?.startsWith('chrome://') || activeTab.url?.startsWith('edge://') || activeTab.url?.startsWith('chrome-extension://')) {
      sendResponse({ error: 'Browser restrictions prevent scanning system pages (like new tabs or settings). Please open a regular website.' });
      return;
    }

    const pageText = await getPageText(activeTab.id);
    if (!pageText) {
      sendResponse({ error: 'No readable text found. If this is a complex dynamic page, try scrolling down a bit and click Scan again.' });
      return;
    }

    const settings = await storageService.getSettings();
    const options = getChatOptions(settings);
    if (!options.apiKey && options.provider !== 'local') {
      sendResponse({ error: 'API key missing. Open Settings to add your key.' });
      return;
    }

    const pageTitle = activeTab.title ?? 'this page';
    const analysis = await aiService.chat(
      `The user wants you to read and summarize the content on "${pageTitle}".

Here is the full extracted text:

---
${pageText.slice(0, 7000)}
---

Please provide a clear, structured summary of what this page contains. Include key points, any important quotes, and context.`,
      { ...options, temperature: 0.3 }
    );

    sendResponse({ type: 'MESSAGE', content: analysis });
  } catch (error) {
    sendResponse({ error: `Scan failed: ${error instanceof Error ? error.message : 'Unknown'}` });
  }
}

async function handleUserMessage(
  payload: { content: string },
  sendResponse: (response: RuntimeResponse) => void,
): Promise<void> {
  const settings = await storageService.getSettings();
  const history = await storageService.getConversationHistory();

  try {
    const options = getChatOptions(settings, history);
    if (options.provider !== 'local' && !options.apiKey) {
      sendResponse({ error: `${options.provider} API key is missing. Open Settings to add it.` });
      return;
    }

    // ── Page-read intent detection ──────────────────────────────────────
    // Trigger on: [Page Context] header present, OR any natural language
    // asking to read/see/look at the current tab/page.
    const hasContextHeader = payload.content.includes('[Page Context]');
    const pageReadIntent = hasContextHeader ||
      /\b(read|scan|summarize|translate|tell me about|analyze|see|show|look|check)\b.{0,40}\b(tab|page|this|it|here|content|text|open|url)\b/i.test(payload.content) ||
      /\bwhat (do you see|is (on|in)|does (this|it|the)|can you see)\b/i.test(payload.content) ||
      /\bread (what|this|it|the)\b/i.test(payload.content) ||
      /\b(what's|whats) (on|in) (the|this|my)?\s*(tab|page)\b/i.test(payload.content);

    let enrichedMessage = payload.content;

    if (pageReadIntent) {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];
        if (activeTab?.id) {
          const pageText = await getPageText(activeTab.id);
          if (pageText) {
            // Build a clean context block — keep user's original question, add real page content
            const userQuestion = payload.content.replace(/^\[Page Context\][^\n]+\n(URL:[^\n]+\n)?/i, '').trim();
            enrichedMessage = `The user is asking: "${userQuestion}"

They are currently viewing this page: "${activeTab.title ?? activeTab.url ?? 'Unknown'}"

Here is the actual text content extracted from that page:

---
${pageText.slice(0, 7000)}
---

Please answer the user's question based on the above page content. Be specific and reference the actual text.`;
          }
        }
      } catch {
        // fall through to normal reply if extraction fails
      }
    }

    const aiResponse = await aiService.chat(enrichedMessage, options);
    sendResponse({ type: 'MESSAGE', content: aiResponse });

    await storageService.saveMessage({ role: 'user', content: payload.content, timestamp: Date.now() });
    await storageService.saveMessage({ role: 'assistant', content: aiResponse, timestamp: Date.now() });
  } catch (error) {
    sendResponse({ error: `AI Error: ${error instanceof Error ? error.message : 'Unknown error'}` });
  }
}

async function handlePlanApproval(
  payload: { planId: string; plan: any },
  sendResponse: (response: RuntimeResponse) => void,
): Promise<void> {
  try {
    const results = await taskExecutor.execute(payload.plan);
    let analysis = '';

    if (results.extractedText?.trim()) {
      const settings = await storageService.getSettings();
      try {
        const options = getChatOptions(settings);
        analysis = await aiService.chat(
          `The following text was extracted from the user's browser page via OCR. Please analyze it and provide a clear, useful summary with key points.

Extracted text:
${results.extractedText.slice(0, 6000)}`,
          { ...options, temperature: 0.3, maxTokens: Math.min(settings.maxTokens, 2000) }
        );
      } catch {
        analysis = 'Scan completed but analysis failed.';
      }
    }
    
    sendResponse({ type: 'EXECUTION_COMPLETE', results, content: analysis });
  } catch (error) {
    sendResponse({ error: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
  }
}
