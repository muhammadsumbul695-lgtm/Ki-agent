import { useCallback, useEffect, useState } from 'react';
import type { RuntimeResponse } from '@/types';

interface ContextInfo {
  title: string;
  url: string;
  selectedText: string;
  pageText: string;
}

const EMPTY_CONTEXT: ContextInfo = {
  title: '',
  url: '',
  selectedText: '',
  pageText: '',
};

export function useContextAwareness() {
  const [isContextIncluded, setIsContextIncluded] = useState<boolean>(true);
  const [contextInfo, setContextInfo] = useState<ContextInfo>(EMPTY_CONTEXT);

  const fetchContext = useCallback(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      return;
    }

    const response = (await chrome.tabs.sendMessage(tab.id, {
      type: 'GET_PAGE_CONTEXT',
    })) as RuntimeResponse;
    if (response?.context) {
      setContextInfo(response.context);
    }
  }, []);

  useEffect(() => {
    if (isContextIncluded) {
      void fetchContext();
    }
  }, [isContextIncluded, fetchContext]);

  const toggleContext = useCallback(async () => {
    const next = !isContextIncluded;
    setIsContextIncluded(next);
    if (next) {
      await fetchContext();
    }
  }, [isContextIncluded, fetchContext]);

  return { contextInfo, isContextIncluded, toggleContext };
}
