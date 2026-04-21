import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { defaultSettings, storageService, type Settings as AppSettings } from '@/services/storageService';

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

const Settings: FC<SettingsProps> = ({ open, onClose }) => {
  const [form, setForm] = useState<AppSettings>(defaultSettings);
  const [saved, setSaved] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    void storageService.getSettings().then((s) => setForm(s));
  }, [open]);

  const onSave = async (): Promise<void> => {
    await storageService.saveSettings(form);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  };

  if (!open) return null;

  return (
    <div className="modal">
      <div className="modal-card">
        <h3>Settings</h3>
        <p>Manage providers and core behavior</p>

        <label className="field-label">AI Engine</label>
        <select
          className="field-input"
          value={form.provider}
          onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value as AppSettings['provider'] }))}
        >
          <option value="groq">Groq (Ultra Speed)</option>
          <option value="openrouter">OpenRouter (Free Models)</option>
          <option value="google">Google Gemini (Free)</option>
          <option value="local">Ollama (Local)</option>
        </select>

        {form.provider === 'groq' && (
          <>
            <label className="field-label">Groq API Key</label>
            <input
              type="password"
              className="field-input"
              value={form.groqApiKey}
              onChange={(e) => setForm((p) => ({ ...p, groqApiKey: e.target.value }))}
              placeholder="gsk_..."
            />
            <label className="field-label">Groq Model</label>
            <select
              className="field-input"
              value={form.groqModel}
              onChange={(e) => setForm((p) => ({ ...p, groqModel: e.target.value }))}
            >
              <option value="llama-3.3-70b-versatile">Llama 3.3 70B</option>
              <option value="llama-3.1-8b-instant">Llama 3.1 8B</option>
            </select>
          </>
        )}

        {form.provider === 'openrouter' && (
          <>
            <label className="field-label">OpenRouter API Key</label>
            <input
              type="password"
              className="field-input"
              value={form.openrouterApiKey}
              onChange={(e) => setForm((p) => ({ ...p, openrouterApiKey: e.target.value }))}
              placeholder="sk-or-v1-..."
            />
            <label className="field-label">OpenRouter Model (Free)</label>
            <select
              className="field-input"
              value={form.openrouterModel}
              onChange={(e) => setForm((p) => ({ ...p, openrouterModel: e.target.value }))}
            >
              <option value="google/gemma-7b-it:free">Gemma 7B (Free)</option>
              <option value="mistralai/mistral-7b-instruct:free">Mistral 7B (Free)</option>
              <option value="meta-llama/llama-3-8b-instruct:free">Llama 3 8B (Free)</option>
            </select>
          </>
        )}

        <div className="settings-grid">
          <div>
            <label className="field-label">Context</label>
            <label className="toggle-group" style={{marginTop: '4px'}}>
              <input 
                type="checkbox" 
                checked={form.showPlanApproval} 
                onChange={(e) => setForm(p => ({...p, showPlanApproval: e.target.checked}))} 
              />
              <span style={{fontSize: '11px'}}>Ask Before Acting</span>
            </label>
          </div>
          <div>
            <label className="field-label">History</label>
            <label className="toggle-group" style={{marginTop: '4px'}}>
              <input 
                type="checkbox" 
                checked={form.saveHistory} 
                onChange={(e) => setForm(p => ({...p, saveHistory: e.target.checked}))} 
              />
              <span style={{fontSize: '11px'}}>Save History</span>
            </label>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-plan btn-cancel" onClick={onClose}>
            Close
          </button>
          <button className="btn-plan btn-proceed" onClick={() => void onSave()}>
            {saved ? 'Saved ✓' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
