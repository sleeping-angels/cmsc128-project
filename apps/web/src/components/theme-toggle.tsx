import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme, type Theme } from '@/hooks/use-theme';

const themes = {
  light: { icon: SunIcon, label: 'Light', next: 'dark' },
  dark: { icon: MoonIcon, label: 'Dark', next: 'system' },
  system: { icon: MonitorIcon, label: 'System', next: 'light' },
} satisfies Record<Theme, { icon: typeof SunIcon; label: string; next: Theme }>;

/** Cycles light → dark → system on each click. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { icon: Icon, label, next } = themes[theme];

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${label}. Switch to ${themes[next].label}`}
      title={`Theme: ${label}`}
    >
      <Icon />
    </Button>
  );
}
