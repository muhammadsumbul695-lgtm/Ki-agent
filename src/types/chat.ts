export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  kind?: 'message' | 'plan' | 'execution';
}

export interface PlanStep {
  id: string;
  description: string;
}

export interface PlanPhase {
  id: string;
  title: string;
  estimatedTime: number;
  steps: PlanStep[];
}

export interface Plan {
  id: string;
  estimatedTime: number;
  approved: boolean;
  phases: PlanPhase[];
}

export interface ExecutionResult {
  summary: string;
  items: string[];
  extractedText?: string;
}
