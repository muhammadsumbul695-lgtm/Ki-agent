import type { FC, KeyboardEvent } from 'react';
import { useRef, useState } from 'react';

interface InputBoxProps {
  onSendMessage: (text: string) => Promise<void>;
  onScan: () => Promise<void>;
  isLoading: boolean;
  hasContext: boolean;
  onToggleContext: () => void;
  askBeforeActing: boolean;
  setAskBeforeActing: (val: boolean) => void;
}

const IconImg = ({ src, fallback }: { src: string; fallback: string }) => {
  const [error, setError] = useState(false);
  if (error) return <span>{fallback}</span>;
  return <img src={src} className="nav-icon" style={{ width: '18px', height: '18px' }} onError={() => setError(true)} />;
};

const InputBox: FC<InputBoxProps> = ({ 
  onSendMessage, 
  onScan, 
  isLoading, 
  hasContext, 
  onToggleContext,
  askBeforeActing,
  setAskBeforeActing
}) => {
  const [input, setInput] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSend = async (): Promise<void> => {
    if (!input.trim() || isLoading) {
      return;
    }
    const text = input.trim();
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await onSendMessage(text);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="input-box">
      <div className="input-container">
        <textarea
          ref={textareaRef}
          value={input}
          disabled={isLoading}
          placeholder="Type / for commands"
          onKeyDown={onKeyDown}
          onChange={(event) => setInput(event.target.value)}
        />
        <div className="input-footer">
          <label className="toggle-group">
            <input 
              type="checkbox" 
              checked={askBeforeActing} 
              onChange={(e) => setAskBeforeActing(e.target.checked)} 
            />
            Ask before acting
          </label>
          <div className="action-group">
            <button 
              className={`btn-round ${hasContext ? 'btn-send' : ''}`}
              title="Include Context"
              onClick={onToggleContext}
            >
              <IconImg src="/assets/icons/context.png" fallback="↗" />
            </button>
            <button 
              className="btn-round" 
              title="Autonomous Scan"
              onClick={() => void onScan()}
            >
              <IconImg src="/assets/icons/new-chat.png" fallback="➕" />
            </button>
            <button 
              className="btn-round btn-send" 
              disabled={isLoading || !input.trim()} 
              onClick={() => void handleSend()} 
              type="button"
            >
              <IconImg src="/assets/icons/send.png" fallback="↑" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InputBox;
