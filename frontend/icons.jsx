// Lucide-style inline SVG icons. Outline, 1.5px stroke.
// Sized via the `size` prop (default 16). Pass className for color.

const IconBase = ({ size = 16, className = '', children, style }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden="true"
  >
    {children}
  </svg>
);

const Icon = {
  Logo: ({ size = 22, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M3 17 L9 11 L13 14 L21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="21" cy="6" r="2" fill="currentColor" />
      <path d="M3 20 L21 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
    </svg>
  ),
  LayoutDashboard: (p) => (<IconBase {...p}><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></IconBase>),
  Briefcase: (p) => (<IconBase {...p}><rect x="2.5" y="7" width="19" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M2.5 12h19"/></IconBase>),
  Radar: (p) => (<IconBase {...p}><path d="M19.07 4.93a10 10 0 1 0 .65 13.31"/><path d="M16.24 7.76a6 6 0 1 0 .73 8.97"/><path d="M12 12 22 2"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></IconBase>),
  History: (p) => (<IconBase {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></IconBase>),
  Settings: (p) => (<IconBase {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></IconBase>),
  RefreshCw: (p) => (<IconBase {...p}><path d="M21 12a9 9 0 0 1-15.4 6.36L3 16"/><path d="M3 12a9 9 0 0 1 15.4-6.36L21 8"/><path d="M21 3v5h-5"/><path d="M3 21v-5h5"/></IconBase>),
  Sun: (p) => (<IconBase {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M4.93 19.07l1.41-1.41"/><path d="M17.66 6.34l1.41-1.41"/></IconBase>),
  Moon: (p) => (<IconBase {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></IconBase>),
  ChevronRight: (p) => (<IconBase {...p}><path d="m9 18 6-6-6-6"/></IconBase>),
  ChevronDown: (p) => (<IconBase {...p}><path d="m6 9 6 6 6-6"/></IconBase>),
  ChevronUp: (p) => (<IconBase {...p}><path d="m18 15-6-6-6 6"/></IconBase>),
  ArrowUp: (p) => (<IconBase {...p}><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></IconBase>),
  ArrowDown: (p) => (<IconBase {...p}><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></IconBase>),
  ArrowUpRight: (p) => (<IconBase {...p}><path d="M7 17 17 7"/><path d="M7 7h10v10"/></IconBase>),
  ArrowLeft: (p) => (<IconBase {...p}><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></IconBase>),
  TrendingUp: (p) => (<IconBase {...p}><path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/></IconBase>),
  TrendingDown: (p) => (<IconBase {...p}><path d="M22 17 13.5 8.5 8.5 13.5 2 7"/><path d="M16 17h6v-6"/></IconBase>),
  Flame: (p) => (<IconBase {...p}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 17c1.4 0 2.5-1.1 2.5-2.5 0-1.7-1-3-2-4 0 0 .5 2-.5 3-.5.5-1 .5-1.5 0-1-1-.5-3-.5-3-.5 1.5-1 2.5-1.5 3.5-.5 1-.5 2 .5 3z"/><path d="M15.7 5.4a5 5 0 0 1 1.6 8.4 6 6 0 0 1-3.8 2.2c1.4-.6 2-2 1.5-3.4-.5-1.4-2-2-3.4-1.5-2 .8-2.7 3.4-1 5C9.4 17 8 16.4 7 15.3a7 7 0 0 1-1.4-7C7 6 9.6 4.6 12 5a9 9 0 0 1 3.7.4z"/></IconBase>),
  Snowflake: (p) => (<IconBase {...p}><path d="M2 12h20"/><path d="M12 2v20"/><path d="m20 16-4-4 4-4"/><path d="m4 8 4 4-4 4"/><path d="m16 4-4 4-4-4"/><path d="m8 20 4-4 4 4"/></IconBase>),
  Minus: (p) => (<IconBase {...p}><path d="M5 12h14"/></IconBase>),
  Plus: (p) => (<IconBase {...p}><path d="M5 12h14"/><path d="M12 5v14"/></IconBase>),
  Check: (p) => (<IconBase {...p}><path d="M20 6 9 17l-5-5"/></IconBase>),
  X: (p) => (<IconBase {...p}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></IconBase>),
  Search: (p) => (<IconBase {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></IconBase>),
  ChevronsUpDown: (p) => (<IconBase {...p}><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></IconBase>),
  Filter: (p) => (<IconBase {...p}><path d="M22 3H2l8 9.46V19l4 2v-8.54z"/></IconBase>),
  Layers: (p) => (<IconBase {...p}><path d="m12 2 9 5-9 5-9-5 9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></IconBase>),
  ListTree: (p) => (<IconBase {...p}><path d="M21 12h-9"/><path d="M21 6H9"/><path d="M21 18h-7"/><path d="M3 3v18"/><path d="M3 9h4"/><path d="M3 15h4"/></IconBase>),
  Copy: (p) => (<IconBase {...p}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></IconBase>),
  Bookmark: (p) => (<IconBase {...p}><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></IconBase>),
  ExternalLink: (p) => (<IconBase {...p}><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></IconBase>),
  Info: (p) => (<IconBase {...p}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></IconBase>),
  AlertTriangle: (p) => (<IconBase {...p}><path d="m10.29 3.86-8.13 14.07A2 2 0 0 0 3.89 21h16.22a2 2 0 0 0 1.73-3.07L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></IconBase>),
  Target: (p) => (<IconBase {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></IconBase>),
  Activity: (p) => (<IconBase {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></IconBase>),
  Calendar: (p) => (<IconBase {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></IconBase>),
  Play: (p) => (<IconBase {...p}><polygon points="6 3 20 12 6 21 6 3"/></IconBase>),
  Sparkles: (p) => (<IconBase {...p}><path d="m12 3-1.9 5.7a2 2 0 0 1-1.4 1.4L3 12l5.7 1.9a2 2 0 0 1 1.4 1.4L12 21l1.9-5.7a2 2 0 0 1 1.4-1.4L21 12l-5.7-1.9a2 2 0 0 1-1.4-1.4z"/><path d="M5 3v4"/><path d="M3 5h4"/><path d="M19 17v4"/><path d="M17 19h4"/></IconBase>),
  CircleDot: (p) => (<IconBase {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2" fill="currentColor"/></IconBase>),
  Eye: (p) => (<IconBase {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></IconBase>),
  Clock: (p) => (<IconBase {...p}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></IconBase>),
  Hash: (p) => (<IconBase {...p}><path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 3 8 21"/><path d="m16 3-2 18"/></IconBase>),
  Link2: (p) => (<IconBase {...p}><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><path d="M8 12h8"/></IconBase>),
};

window.Icon = Icon;
