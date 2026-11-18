import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Bell, LogOut, Moon, Sun } from 'lucide-react';

type AppShellFrameProps = {
  navigation: ReactNode; children: ReactNode; workspaceLabel: string;
  displayName?: string; roleLabel?: string; onExit: () => void;
  pendingSaves?: boolean; exitLabel?: string; headerLabel?: string; preview?: boolean; themeEnabled?: boolean;
};

// Presentation only: no auth, operational stores or API dependencies.
export function AppShellFrame({ navigation, children, workspaceLabel, displayName, roleLabel,
  onExit, pendingSaves = false, exitLabel = 'Sign out', headerLabel = 'Operations overview', preview = false, themeEnabled = false }: AppShellFrameProps) {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem('navapack.dashboard.theme') === 'dark';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!themeEnabled) return;
    try {
      localStorage.setItem('navapack.dashboard.theme', dark ? 'dark' : 'light');
    } catch {
      // The switch still works for the current session when storage is blocked.
    }
  }, [dark, themeEnabled]);

  return (
    <div data-dashboard-theme={themeEnabled && dark ? 'dark' : undefined} className="min-h-screen bg-[radial-gradient(circle_at_72%_0%,#2dbb4c_0%,#16803d_42%,#0b3c2a_100%)] p-3 sm:p-5">
      <div className="flex min-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-[24px] bg-[#f5f8f5] shadow-2xl shadow-emerald-950/25 md:h-[calc(100dvh-2.5rem)] md:min-h-0 md:flex-row">
      <aside className="flex min-h-0 w-full shrink-0 flex-col bg-[#102d24] text-white md:w-[230px]">
        <div className="flex items-center gap-2 px-5 py-6">
          <img src="/assets/Nava-logo.png" alt="NavaPack" className="h-8 w-auto max-w-[155px] object-contain" />
        </div>

        <div className="mx-4 mb-5 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-white/45">Active workspace</p>
          <p className="mt-1 text-xs font-medium text-white/90">{workspaceLabel}</p>
        </div>

        <nav aria-label="Main navigation" className="sidebar-navigation min-h-0 max-h-[40dvh] flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 pb-4 md:max-h-none">
          {navigation}
        </nav>

        <div className="shrink-0 border-t border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-semibold">{displayName?.slice(0, 1)}</div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-white">{displayName}</p>
              <p className="truncate text-[10px] capitalize text-white/45">{roleLabel}</p>
            </div>
          </div>
          <button
            disabled={pendingSaves}
            title={pendingSaves ? 'Finish or resolve pending database saves before signing out.' : undefined}
            onClick={onExit}
            className="sidebar-sign-out mt-4 text-white/45 hover:text-white"
          >
            <LogOut size={14} /> {exitLabel}
          </button>
        </div>
      </aside>

      <main className="dashboard-workspace min-h-0 min-w-0 flex-1 bg-[#f5f8f5] md:overflow-y-auto">
        <div className="flex items-center justify-end gap-4 border-b border-[#e6eee8] px-5 py-4 sm:px-8">
          {themeEnabled && <button type="button" aria-pressed={dark} onClick={() => setDark(value => !value)}
            className="rounded-lg border border-current text-sm focus-visible:outline-2 focus-visible:outline-offset-2">
            {dark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
            Dark mode
          </button>}
          <button disabled={preview} data-button-icon className="relative rounded-full p-2 text-[#668075] hover:bg-white" aria-label="Notifications"><Bell size={17} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#40bd5b]" /></button>
          <div className="h-7 w-px bg-[#dce8df]" />
          <span className="text-xs text-[#668075]">{headerLabel}</span>
        </div>
        <div className="p-5 sm:p-8">{children}</div>
      </main>
      </div>
    </div>
  );
}
