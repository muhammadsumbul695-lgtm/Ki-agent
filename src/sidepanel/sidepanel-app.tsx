import type { FC } from 'react';
import ChatInterface from '@/components/ChatInterface';
import '@/styles/globals.css';
import '@/styles/variables.css';
import '@/styles/components.css';
import '@/styles/animations.css';

const SidepanelApp: FC = function SidepanelApp() {
  return <ChatInterface />;
};

export default SidepanelApp;
