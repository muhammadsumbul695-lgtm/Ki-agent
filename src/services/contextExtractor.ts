export interface PageContext {
  title: string;
  url: string;
  selectedText: string;
  pageText: string;
}

export const contextExtractor = {
  extract(): PageContext {
    const selectedText = window.getSelection()?.toString() ?? '';
    const pageText = document.body?.innerText?.slice(0, 12000) ?? '';

    return {
      title: document.title,
      url: window.location.href,
      selectedText,
      pageText,
    };
  },
};
