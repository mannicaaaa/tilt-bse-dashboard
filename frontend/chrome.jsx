// v2 chrome — 3-item sidebar (Today, Portfolio, Settings)

const { Icon, Button, IconChip } = window;
const { useState } = React;

const V2_NAV_ITEMS = [
  { id: 'today',     label: 'Today',     icon: 'Sparkles' },
  { id: 'portfolio', label: 'Portfolio', icon: 'Briefcase' },
  { id: 'settings',  label: 'Settings',  icon: 'Settings' },
];

const Sidebar = ({ current, onNavigate }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-line bg-ink-800 transition-[width] duration-150 overflow-hidden"
      style={{ width: expanded ? 220 : 56 }}
    >
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-line shrink-0">
        <div className="text-bull shrink-0"><Icon.Logo size={22} /></div>
        <div className="text-[15px] font-semibold tracking-tight text-fg whitespace-nowrap transition-opacity duration-150"
             style={{ opacity: expanded ? 1 : 0 }}>Tilt</div>
      </div>

      <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5">
        {V2_NAV_ITEMS.map((item) => {
          const IconCmp = Icon[item.icon];
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`relative flex items-center gap-3 h-10 rounded-md transition-colors duration-150 ${
                active ? 'bg-ink-600 text-fg' : 'text-fg-muted hover:bg-ink-700 hover:text-fg'
              }`}
              title={item.label}
            >
              {active && <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-sm bg-bull" />}
              <span className="shrink-0 w-10 flex items-center justify-center"><IconCmp size={18} /></span>
              <span className="text-[13px] font-medium whitespace-nowrap transition-opacity duration-150"
                    style={{ opacity: expanded ? 1 : 0 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-line text-[11px] text-fg-faint whitespace-nowrap">
        <div style={{ opacity: expanded ? 1 : 0 }} className="transition-opacity duration-150">v0.5.0 · localhost</div>
      </div>
    </div>
  );
};

const Topbar = ({ current, theme, onToggleTheme }) => {
  const titles = {
    today: "Today's Picks",
    portfolio: 'Portfolio',
    settings: 'Settings',
    stock: 'Stock Detail',
  };
  return (
    <div className="fixed top-0 right-0 z-30 h-14 border-b border-line bg-ink-900/85 backdrop-blur" style={{ left: 56 }}>
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-[14px] font-semibold text-fg tracking-tight whitespace-nowrap">{titles[current] || 'Tilt'}</h1>
          <span className="hidden md:inline-flex items-center gap-1.5 px-2 h-6 rounded border border-line bg-ink-700 text-[11px] text-fg-muted whitespace-nowrap shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-bull tilt-pulse shrink-0"></span>
            <span className="mono">NSE · LIVE</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <IconChip onClick={onToggleTheme} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
            {theme === 'dark' ? <Icon.Sun size={15} /> : <Icon.Moon size={15} />}
          </IconChip>
        </div>
      </div>
    </div>
  );
};

const Shell = ({ children }) => (
  <div className="min-h-screen pl-14 pt-14">
    <div className="mx-auto px-8 py-7" style={{ maxWidth: 1440 }}>{children}</div>
  </div>
);

const PageHeader = ({ title, subtitle, right, kicker }) => (
  <div className="flex items-start justify-between gap-6 mb-6">
    <div className="min-w-0">
      {kicker && <div className="text-[11px] uppercase tracking-[0.14em] text-fg-dim font-medium mb-2">{kicker}</div>}
      <h1 className="text-[26px] font-semibold tracking-tight text-fg leading-tight">{title}</h1>
      {subtitle && <p className="mt-1.5 text-[13.5px] text-fg-muted max-w-2xl">{subtitle}</p>}
    </div>
    {right && <div className="shrink-0">{right}</div>}
  </div>
);

Object.assign(window, { Sidebar, Topbar, Shell, PageHeader, V2_NAV_ITEMS });
