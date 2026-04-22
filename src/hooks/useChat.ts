import { useCallback, useMemo, useState } from 'react';
import type { ChatMessage, Plan, RuntimeResponse } from '@/types';

const generateId = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
};

function makeMessage(role: ChatMessage['role'], content: string, kind: ChatMessage['kind'] = 'message'): ChatMessage {
  return {
    id: generateId(),
    role,
    content,
    timestamp: Date.now(),
    kind,
  };
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    makeMessage('assistant', "Hi! I'm Muwahhid AI. What would you like me to do?"),
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    setMessages((prev) => [...prev, makeMessage('user', content)]);
    setIsLoading(true);
    try {
      const response = (await chrome.runtime.sendMessage({
        type: 'SEND_MESSAGE',
        data: { content },
      })) as RuntimeResponse;

      if (response.error) {
        setMessages((prev) => [...prev, makeMessage('system', response.error ?? 'Request failed.')]);
        return;
      }

      if (response.type === 'PLAN' && response.plan) {
        setCurrentPlan(response.plan);
        setMessages((prev) => [...prev, makeMessage('assistant', response.content ?? 'Generated a plan.', 'plan')]);
        return;
      }

      setMessages((prev) => [...prev, makeMessage('assistant', response.content ?? '')]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const approvePlan = useCallback(async (planId: string) => {
    if (!currentPlan) {
      return;
    }
    setIsLoading(true);
    try {
      const response = (await chrome.runtime.sendMessage({
        type: 'APPROVE_PLAN',
        data: { planId, plan: currentPlan },
      })) as RuntimeResponse;

      if (response.error) {
        setMessages((prev) => [...prev, makeMessage('system', response.error ?? 'Execution failed.')]);
        return;
      }

      if (response && response.results) {
        // We log execution summary silently or via a single message
        setMessages((prev) => [
          ...prev,
          makeMessage('assistant', `Status: ${response.results?.summary ?? 'Autonomous task completed.'}`, 'execution'),
        ]);
        // Note: Raw execution logs and OCR segments are no longer pushed to the UI to keep it clean.
      }

      if (response && response.content) {
        setMessages((prev) => [
          ...prev,
          makeMessage('assistant', response.content || '', 'execution'),
        ]);
      }
      setCurrentPlan((prev) => (prev ? { ...prev, approved: true } : prev));
    } finally {
      setIsLoading(false);
    }
  }, [currentPlan]);

  const rejectPlan = useCallback(async (planId: string) => {
    const response = (await chrome.runtime.sendMessage({
      type: 'REJECT_PLAN',
      data: { planId },
    })) as RuntimeResponse;
    setMessages((prev) => [...prev, makeMessage('assistant', response.content ?? 'Plan rejected.')]);
    setCurrentPlan(null);
  }, []);

  const executeScan = useCallback(async () => {
    setIsLoading(true);
    setMessages((prev) => [...prev, makeMessage('user', '📄 Scan: Read this page')]);
    try {
      const response = (await chrome.runtime.sendMessage({
        type: 'EXECUTE_SCAN',
        data: {},
      })) as RuntimeResponse;

      if (response.error) {
        setMessages((prev) => [...prev, makeMessage('system', response.error ?? 'Scan failed.')]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        makeMessage('assistant', response.content ?? 'Scan complete. No text found on this page.'),
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({ messages, isLoading, sendMessage, currentPlan, approvePlan, rejectPlan, executeScan }),
    [messages, isLoading, sendMessage, currentPlan, approvePlan, rejectPlan, executeScan],
  );

  return value;
}
