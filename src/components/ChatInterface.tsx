import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import HistoryPanel from '@/components/HistoryPanel';
import InputBox from '@/components/InputBox';
import MessageList from '@/components/MessageList';
import PlanViewer from '@/components/PlanViewer';
import Settings from '@/components/Settings';
import { useChat } from '@/hooks/useChat';
import { useContextAwareness } from '@/hooks/useContextAwareness';
import { storageService } from '@/services/storageService';

const ChatInterface: FC = () => {
  const { messages, isLoading, sendMessage, currentPlan, approvePlan, rejectPlan, executeScan } = useChat();
  const { contextInfo, isContextIncluded, toggleContext } = useContextAwareness();
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [askBeforeActing, setAskBeforeActing] = useState<boolean>(true);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentPlan]);

  // Auto-open settings on first load if no API key is configured
  useEffect(() => {
    void storageService.getSettings().then((s) => {
      const hasKey =
        (s.provider === 'groq' && !!s.groqApiKey) ||
        (s.provider === 'google' && !!s.googleApiKey) ||
        (s.provider === 'anthropic' && !!s.apiKey) ||
        s.provider === 'local';
      if (!hasKey) setSettingsOpen(true);
    });
  }, []);

  const handleSendMessage = async (text: string): Promise<void> => {
    const hasRealContext = isContextIncluded && (contextInfo.title || contextInfo.url || contextInfo.selectedText);
    let messageToSend = text;
    if (hasRealContext) {
      const parts: string[] = [];
      if (contextInfo.title) parts.push(`Page: ${contextInfo.title}`);
      if (contextInfo.url) parts.push(`URL: ${contextInfo.url}`);
      if (contextInfo.selectedText) parts.push(`Selected text: "${contextInfo.selectedText}"`);
      messageToSend = `[Page Context]\n${parts.join('\n')}\n\n${text}`;
    }
    await sendMessage(messageToSend);
  };

  const handleNewChat = (): void => {
    window.location.reload();
  };

  const IconPlaceholder = ({ src, fallback, alt }: { src: string, fallback: string, alt: string }) => {
    const [error, setError] = useState(false);
    return error ? (
      <span className="nav-icon">{fallback}</span>
    ) : (
      <img 
        src={src} 
        alt={alt} 
        className="nav-icon custom-icon" 
        onError={() => setError(true)} 
      />
    );
  };

  return (
    <div className="app-layout">
      {/* Floating sidebar overlay */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo-dot" />
          <span className="brand-text">Muwahhid AI</span>
        </div>

        <div className="sidebar-nav">
          <button className="nav-item" onClick={() => { handleNewChat(); }}>
            <IconPlaceholder src="/assets/icons/new-chat.png" fallback="✨" alt="New Chat" />
            <span className="nav-label">New Chat</span>
          </button>
          <button className="nav-item" onClick={() => { setHistoryOpen(true); setSidebarOpen(false); }}>
            <IconPlaceholder src="/assets/icons/history.png" fallback="🕒" alt="History" />
            <span className="nav-label">History</span>
          </button>
          <button className="nav-item" onClick={() => { setSettingsOpen(true); setSidebarOpen(false); }}>
            <IconPlaceholder src="/assets/icons/settings.png" fallback="⚙️" alt="Settings" />
            <span className="nav-label">Settings</span>
          </button>
        </div>

        <div className="sidebar-footer">
          <button className="nav-item" onClick={() => setSidebarOpen(false)}>
            <IconPlaceholder src="/assets/icons/close.png" fallback="◀" alt="Close" />
            <span className="nav-label">Close</span>
          </button>
        </div>
      </aside>

      {/* Backdrop – click outside to close sidebar */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Chat Panel – always full width */}
      <div className="chat-container">
        <header className="header">
          <div className="header-left">
            <button className="icon-btn" onClick={() => setSidebarOpen((o) => !o)} title="Menu">
               <IconPlaceholder src="/assets/icons/menu.png" fallback="☰" alt="Menu" />
            </button>
            <span className="header-title">Muwahhid AI</span>
            <span className="status-indicator">
              <span className="status-dot" />
              {isLoading ? 'Thinking…' : 'Online'}
            </span>
          </div>
          <div className="header-actions">
            <button className="icon-btn" title="New Chat" onClick={handleNewChat}>
              <IconPlaceholder src="/assets/icons/new-chat.png" fallback="✨" alt="New Chat" />
            </button>
            <button className="icon-btn" title="Settings" onClick={() => setSettingsOpen(true)}>
              <IconPlaceholder src="/assets/icons/settings.png" fallback="⚙️" alt="Settings" />
            </button>
          </div>
        </header>

        <main className="messages-list">
          {messages.length === 0 && !isLoading && (
            <div className="empty-chat">
              <img src="/assets/icons/logo.png" alt="AI Agent" className="empty-logo-glow" onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
              <div className="empty-logo-glow hidden default-glow" />
              <h2>How can I help you?</h2>
              <p>Type below or press / for commands.</p>
            </div>
          )}
          <MessageList messages={messages} isLoading={isLoading} />
          {currentPlan && !currentPlan.approved && (
            <PlanViewer
              plan={currentPlan}
              onApprove={() => void approvePlan(currentPlan.id)}
              onReject={() => void rejectPlan(currentPlan.id)}
            />
          )}
          <div ref={messagesEndRef} />
        </main>

        <InputBox
          onSendMessage={handleSendMessage}
          onScan={executeScan}
          isLoading={isLoading}
          hasContext={isContextIncluded}
          onToggleContext={toggleContext}
          askBeforeActing={askBeforeActing}
          setAskBeforeActing={setAskBeforeActing}
        />

        <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <HistoryPanel open={historyOpen} messages={messages} onClose={() => setHistoryOpen(false)} />
      </div>
    </div>
  );
};

export default ChatInterface;
