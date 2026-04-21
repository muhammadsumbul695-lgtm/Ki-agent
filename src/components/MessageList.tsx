import type { FC } from 'react';
import type { ChatMessage } from '@/types';

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

const MessageList: FC<MessageListProps> = ({ messages, isLoading }) => {
  return (
    <div className="messages-list">
      {messages.map((message) => (
        <article key={message.id} className={`message message-${message.role === 'assistant' ? 'assistant' : message.role} ${message.kind || ''}`}>
          <div className="message-content">{message.content}</div>
        </article>
      ))}
      {isLoading && (
        <div className="message message-assistant loading-state">
          Thinking...
        </div>
      )}
    </div>
  );
};

export default MessageList;
