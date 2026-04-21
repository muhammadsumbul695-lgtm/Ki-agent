import type { Plan } from '@/types/chat';

export type RuntimeRequestType =
  | 'SEND_MESSAGE'
  | 'APPROVE_PLAN'
  | 'REJECT_PLAN'
  | 'GET_CHAT_HISTORY'
  | 'GET_PAGE_CONTEXT'
  | 'EXECUTE_SCAN'
  | 'EXECUTE_TAB_ACTION';

export interface RuntimeRequest<T = unknown> {
  type: RuntimeRequestType;
  data?: T;
}

export interface RuntimeResponse {
  type?: 'MESSAGE' | 'PLAN' | 'EXECUTION_COMPLETE' | 'PLAN_REJECTED';
  content?: string;
  plan?: Plan;
  planId?: string;
  results?: {
    summary: string;
    items: string[];
    extractedText?: string;
  };
  history?: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>;
  context?: {
    title: string;
    url: string;
    selectedText: string;
    pageText: string;
  };
  actionResult?: {
    ok: boolean;
    text?: string;
    scrolledBy?: number;
  };
  error?: string;
}
