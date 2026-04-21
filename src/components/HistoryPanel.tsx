import type { FC } from 'react';
import type { ChatMessage } from '@/types';

interface HistoryPanelProps {
  open: boolean;
  messages: ChatMessage[];
  onClose: () => void;
}

const HistoryPanel: FC<HistoryPanelProps> = ({ open, messages, onClose }) => {
  if (!open) {
    return null;
  }
  return (
    <div className="modal">
      <div className="modal-card">
        <h3>Chat History</h3>
        <ul>
          {messages.slice(-20).map((message) => (
            <li key={message.id}>
              <strong>{message.role}:</strong> {message.content.slice(0, 80)}
            </li>
          ))}
        </ul>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default HistoryPanel;
