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

  return (
    <div className="chat-container">
      <header className="header">
        <div className="header-left">
          <div className="logo-dot" />
          <span className="brand-text">Muwahhid AI v1.0</span>
        </div>
        <div className="header-actions">
           <button className="icon-btn" title="Refresh" onClick={() => window.location.reload()}>⚡</button>
           <button className="icon-btn" title="New Chat" onClick={handleNewChat}>💬</button>
           <button className="icon-btn" title="Settings" onClick={() => setSettingsOpen(true)}>⋮</button>
        </div>
      </header>

      <main className="messages-list">
        {messages.length === 0 && !isLoading && (
          <div className="empty-chat">
            <h2>Start a conversation</h2>
            <p>Type below to begin chatting with Muwahhid AI</p>
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
  );
};

export default ChatInterface;
