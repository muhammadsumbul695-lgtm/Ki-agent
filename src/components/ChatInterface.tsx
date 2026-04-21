import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import HistoryPanel from '@/components/HistoryPanel';
import InputBox from '@/components/InputBox';
import MessageList from '@/components/MessageList';
import PlanViewer from '@/components/PlanViewer';
import Settings from '@/components/Settings';
import { useChat } from '@/hooks/useChat';
import { useContextAwareness } from '@/hooks/useContextAwareness';

const ChatInterface: FC = () => {
  const { messages, isLoading, sendMessage, currentPlan, approvePlan, rejectPlan, executeScan } = useChat();
  const { contextInfo, isContextIncluded, toggleContext } = useContextAwareness();
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [askBeforeActing, setAskBeforeActing] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentPlan]);

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
    // Ideally clear history here
    window.location.reload(); 
  };

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  return (
    <div className="app-layout">
      {/* Left Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo-dot" />
          {sidebarOpen && <span className="brand-text">Muwahhid AI</span>}
        </div>
        
        <div className="sidebar-nav">
          <button className="nav-item" onClick={handleNewChat}>
            <span className="nav-icon">✨</span>
            {sidebarOpen && <span className="nav-label">New Chat</span>}
          </button>
          <button className="nav-item" onClick={() => setHistoryOpen(true)}>
            <span className="nav-icon">🕒</span>
            {sidebarOpen && <span className="nav-label">History</span>}
          </button>
          <button className="nav-item" onClick={() => setSettingsOpen(true)}>
            <span className="nav-icon">⚙️</span>
            {sidebarOpen && <span className="nav-label">Settings</span>}
          </button>
        </div>
        
        <div className="sidebar-footer">
          <button className="nav-item toggle-sidebar-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <span className="nav-icon">{sidebarOpen ? '◀' : '▶'}</span>
            {sidebarOpen && <span className="nav-label">Collapse</span>}
          </button>
        </div>
      </aside>

      <div className="chat-container">
        <header className="header">
          <div className="header-left">
            <span className="header-title">Assistant</span>
            <span className="status-indicator">
              <span className="status-dot"></span> Online
            </span>
          </div>
          <div className="header-actions">
             <button className="icon-btn" title="Refresh" onClick={() => window.location.reload()}>⚡</button>
          </div>
        </header>

        <main className="messages-list">
          {messages.length === 0 && !isLoading && (
            <div className="empty-chat">
              <div className="empty-logo-glow" />
              <h2>How can I help you?</h2>
              <p>Type below or use the slash command / to begin.</p>
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
