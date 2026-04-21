interface ChatOptions {
  provider?: 'local' | 'anthropic' | 'google' | 'groq' | 'openrouter';
  apiKey: string;
  model: string;
  localModel?: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

let cachedGeminiModel: string | null = null;

export const aiService = {
  async chat(userMessage: string, options: ChatOptions): Promise<string> {
    const messages = [...(options.conversationHistory ?? []), { role: 'user', content: userMessage }];

    if (options.provider === 'local') return this.chatWithOllama(messages, options);
    if (options.provider === 'google') return this.chatWithGemini(messages, options);
    if (options.provider === 'groq') return this.chatWithGroq(messages, options);
    if (options.provider === 'openrouter') return this.chatWithOpenRouter(messages, options);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': options.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: options.model,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        system: options.systemPrompt ?? getDefaultSystemPrompt(),
        messages,
      }),
    });

    if (!response.ok) {
      const payload = await response.text();
      throw new Error(`Anthropic request failed (${response.status}): ${payload}`);
    }

    const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = data?.content?.find((block: { type: string }) => block.type === 'text');
    return text?.text ?? 'No response generated.';
  },

  async chatWithOllama(messages: Array<{ role: string; content: string }>, options: ChatOptions): Promise<string> {
    const model = options.localModel || 'llama3.2:3b';
    const conversation = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    const endpoints = ['http://localhost:11434/api/generate', 'http://127.0.0.1:11434/api/generate'];
    let lastError = 'Unknown local model error';

    for (const endpoint of endpoints) {
      try {
        const promptBody = `### HISTORY ###\n${conversation}\n\n### SYSTEM ###\n${options.systemPrompt ?? getDefaultSystemPrompt()}\n\nASSISTANT:`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            prompt: promptBody,
            stream: false,
            options: { temperature: options.temperature, num_predict: options.maxTokens },
          }),
        });

        if (!response.ok) {
          if (response.status === 403) {
            lastError = `Ollama 403: Set OLLAMA_ORIGINS="*" and restart.`;
            continue;
          }
          lastError = `Ollama Error ${response.status}`;
          continue;
        }

        const data = await response.json();
        return data?.response?.trim() || 'No response generated.';
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Ollama failed';
      }
    }
    throw new Error(lastError);
  },

  async chatWithGroq(messages: Array<{ role: string; content: string }>, options: ChatOptions): Promise<string> {
    const model = options.model || 'llama-3.3-70b-versatile';
    const systemPrompt = options.systemPrompt ?? getDefaultSystemPrompt();
    
    // Groq uses OpenAI-compatible format
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
      }),
    });

    if (!response.ok) {
      const payload = await response.text();
      throw new Error(`Groq request failed (${response.status}): ${payload}`);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content ?? 'No response generated.';
  },

  async chatWithOpenRouter(messages: Array<{ role: string; content: string }>, options: ChatOptions): Promise<string> {
    const model = options.model || 'google/gemma-7b-it:free';
    const systemPrompt = options.systemPrompt ?? getDefaultSystemPrompt();
    
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${options.apiKey}`,
        'HTTP-Referer': 'https://github.com/muhammadsumbul695-lgtm/Ki-agent',
        'X-Title': 'Muwahhid AI',
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
      }),
    });

    if (!response.ok) {
      const payload = await response.text();
      throw new Error(`OpenRouter request failed (${response.status}): ${payload}`);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content ?? 'No response generated.';
  },

  async getBestGeminiModel(apiKey: string): Promise<string> {
    if (cachedGeminiModel) return cachedGeminiModel;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
      if (response.ok) {
        const data = await response.json();
        const models = data.models || [];
        const flash = models.find((m: any) => m.name.includes('gemini-1.5-flash'));
        const pro = models.find((m: any) => m.name.includes('gemini-1.5-pro'));
        cachedGeminiModel = flash?.name || pro?.name || 'models/gemini-1.5-flash';
        return cachedGeminiModel!.replace('models/', '');
      }
    } catch {}
    return 'gemini-1.5-flash';
  },

  async chatWithGemini(messages: Array<{ role: string; content: string }>, options: ChatOptions): Promise<string> {
    const apiKey = options.apiKey;
    if (!apiKey) throw new Error('Gemini API key is missing. Please add it in settings.');
    const model = await this.getBestGeminiModel(apiKey);
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
    contents.unshift({ role: 'user', parts: [{ text: `SYSTEM_INSTRUCTIONS: ${options.systemPrompt ?? getDefaultSystemPrompt()}` }] });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: { temperature: options.temperature, maxOutputTokens: options.maxTokens } }),
    });

    if (!response.ok) {
      const payload = await response.text();
      throw new Error(`Gemini failed: ${payload}`);
    }
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response generated.';
  },
};

function getDefaultSystemPrompt(): string {
  return `You are Muwahhid AI, an intelligent, modern browser assistant. You communicate naturally in the user's language (especially German and English).

Key instructions:
- Automatically adapt to the language the user speaks.
- Be crisp, helpful, and friendly. Avoid robotic disclaimers.
- Summary & Analysis: When provided with extracted page text, summarize it concisely or answer the user's questions about it.
- Format responses beautifully using Markdown.

**FOR BROWSER ACTIONS:**
If the user asks you to navigate, click, type, or execute Javascript on the current page, you MUST output a JSON execution plan in exactly this format, surrounded by \`\`\`json block:
\`\`\`json
{
  "type": "PLAN",
  "plan": {
    "id": "random-id",
    "estimatedTime": 2000,
    "phases": [
      {
        "id": "phase-1",
        "title": "Performing Actions",
        "estimatedTime": 2000,
        "steps": [
          {
            "id": "step-1",
            "description": "Click the login button",
            "action": {
              "type": "CLICK",
              "target": "#login-button",
              "value": ""
            }
          },
          {
            "id": "step-2",
            "description": "Navigate to Google",
            "action": {
              "type": "NAVIGATE",
              "target": "https://google.com"
            }
          }
        ]
      }
    ]
  }
}
\`\`\`
Supported action types: NAVIGATE (target=URL), CLICK (target=CSS selector from the provided interactive elements map), INPUT (target=CSS selector, value=text to type), SCROLL_BY (value=number of pixels), QUERY_DOM (target=CSS selector), SWITCH_TAB (target=Tab title/URL kw).

Always try to use the 'selector' provided in the Interactive Elements map for the most reliable results. For data extraction, use QUERY_DOM instead of custom JS.`;
}
