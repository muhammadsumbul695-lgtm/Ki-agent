import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/popup/popup.css';

function Popup() {
  return (
    <div className="popup">
      <h2>Muwahhid AI</h2>
      <p>Open the side panel to start chatting.</p>
      <button
        type="button"
        onClick={() => {
          void chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
          window.close();
        }}
      >
        Open Side Panel
      </button>
    </div>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Popup />
  </StrictMode>,
);
