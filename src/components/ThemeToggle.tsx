import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { storageService } from '@/services/storageService';

type Theme = 'light' | 'dark' | 'auto';

const ThemeToggle: FC = () => {
  const [theme, setTheme] = useState<Theme>('auto');

  useEffect(() => {
    void storageService.getSettings().then((s) => setTheme(s.theme));
  }, []);

  useEffect(() => {
    if (theme === 'auto') {
      document.documentElement.removeAttribute('data-theme');
      return;
    }
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const cycleTheme = async (): Promise<void> => {
    const next: Theme = theme === 'auto' ? 'dark' : theme === 'dark' ? 'light' : 'auto';
    setTheme(next);
    await storageService.saveSettings({ theme: next });
  };

  return (
    <button type="button" onClick={() => void cycleTheme()} title="Toggle theme">
      Theme: {theme}
    </button>
  );
};

export default ThemeToggle;
