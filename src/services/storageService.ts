interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Settings {
  provider: 'local' | 'anthropic' | 'google' | 'groq' | 'openrouter';
  apiKey: string;
  googleApiKey: string;
  groqApiKey: string;
  openrouterApiKey: string;
  model: string;
  googleModel: string;
  groqModel: string;
  openrouterModel: string;
  localModel: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
  theme: 'light' | 'dark' | 'auto';
  showPlanApproval: boolean;
  saveHistory: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  provider: 'groq',
  apiKey: '',
  googleApiKey: '',
  groqApiKey: '',
  openrouterApiKey: '',
  model: 'claude-3-5-sonnet-20241022',
  googleModel: 'gemini-1.5-flash',
  groqModel: 'llama-3.3-70b-versatile',
  openrouterModel: 'google/gemma-7b-it:free',
  localModel: 'llama3.2:3b',
  temperature: 0.7,
  maxTokens: 4096,
  theme: 'auto',
  showPlanApproval: true,
  saveHistory: true,
};

export const storageService = {
  async getSettings(): Promise<Settings> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['settings'], (result) => {
        resolve({ ...DEFAULT_SETTINGS, ...(result.settings ?? {}) });
      });
    });
  },

  async saveSettings(settings: Partial<Settings>): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['settings'], (result) => {
        const merged = { ...DEFAULT_SETTINGS, ...(result.settings ?? {}), ...settings };
        chrome.storage.sync.set({ settings: merged }, resolve);
      });
    });
  },

  async getConversationHistory(): Promise<Message[]> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['conversationHistory'], (result) => {
        const history = (result.conversationHistory ?? []) as Message[];
        resolve(Array.isArray(history) ? history : []);
      });
    });
  },

  async saveMessage(message: Message): Promise<void> {
    const history = await this.getConversationHistory();
    const trimmed = [...history, message].slice(-100);
    return new Promise((resolve) => {
      chrome.storage.local.set({ conversationHistory: trimmed }, resolve);
    });
  },

  async clearHistory(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.remove(['conversationHistory'], resolve);
    });
  },
};

export const defaultSettings = DEFAULT_SETTINGS;
