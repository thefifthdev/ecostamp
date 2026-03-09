// EcoStamp Icon Library — white SVG icons, no emojis
// All icons render at the size passed via className / width+height props.

import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

const base = (d: string | React.ReactNode, viewBox = '0 0 24 24') =>
  ({ className, size = 20 }: IconProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {d}
    </svg>
  );

// ── Travel / provider categories ────────────────────────────────────────────
export const IconHotel = base(<>
  <path d="M3 21V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14" />
  <path d="M3 21h18" />
  <path d="M9 21V12h6v9" />
  <rect x="9" y="7" width="2" height="2" fill="currentColor" stroke="none" rx="0.3" />
  <rect x="13" y="7" width="2" height="2" fill="currentColor" stroke="none" rx="0.3" />
</>);

export const IconTrain = base(<>
  <rect x="4" y="3" width="16" height="14" rx="3" />
  <path d="M4 11h16" />
  <path d="M8 3v8" />
  <path d="M16 3v8" />
  <path d="M6 17l-2 4" />
  <path d="M18 17l2 4" />
  <path d="M8 21h8" />
</>);

export const IconPlane = base(<>
  <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 4s-2 1-3.5 2.5L4 10 2 12l5 2 2 5 2-1 .5-3 6 6z" />
</>);

export const IconCar = base(<>
  <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3.3a2 2 0 0 1 1.7.9L10 10h4l1-2.1A2 2 0 0 1 16.7 7H20a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2" />
  <circle cx="7.5" cy="17.5" r="2.5" />
  <circle cx="16.5" cy="17.5" r="2.5" />
</>);

export const IconActivity = base(<>
  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
</>);

export const IconLeaf = base(<>
  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
</>);

export const IconShip = base(<>
  <path d="M12 2v6" />
  <path d="M8 8h8" />
  <path d="M4 16c.5 1 1.5 2 2 2h12c.5 0 1.5-1 2-2" />
  <path d="M2 14l2 2c.5-1.5 1-2 2-2h16c1 0 1.5.5 2 2l2-2-2-6H4z" />
</>);

export const IconRestaurant = base(<>
  <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
  <path d="M7 2v20" />
  <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
</>);

// ── Nature / eco ─────────────────────────────────────────────────────────────
export const IconSprout = base(<>
  <path d="M7 20h10" />
  <path d="M10 20c5.5-2.5.8-6.4 3-9" />
  <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
  <path d="M14.1 6a7 7 0 0 1 1.1 4.8c-1.6.1-3-.2-4.1-.9C9.9 9.1 9.3 7.8 9.2 6c2.7.1 4 .9 4.9 0z" />
</>);

export const IconGlobe = base(<>
  <circle cx="12" cy="12" r="10" />
  <path d="M12 2a14.5 14.5 0 0 0 0 20A14.5 14.5 0 0 0 12 2" />
  <path d="M2 12h20" />
</>);

export const IconShield = base(<>
  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
</>);

export const IconAward = base(<>
  <circle cx="12" cy="8" r="6" />
  <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
</>);

export const IconStar = base(<>
  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
</>);

export const IconBitcoin = base(<>
  <path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727" />
</>);

export const IconMap = base(<>
  <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
  <line x1="9" y1="3" x2="9" y2="18" />
  <line x1="15" y1="6" x2="15" y2="21" />
</>);

// ── UI actions ───────────────────────────────────────────────────────────────
export const IconUpload = base(<>
  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
  <polyline points="17 8 12 3 7 8" />
  <line x1="12" y1="3" x2="12" y2="15" />
</>);

export const IconCheck = base(<>
  <polyline points="20 6 9 17 4 12" />
</>);

export const IconCheckCircle = base(<>
  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
  <polyline points="22 4 12 14.01 9 11.01" />
</>);

export const IconSearch = base(<>
  <circle cx="11" cy="11" r="8" />
  <line x1="21" y1="21" x2="16.65" y2="16.65" />
</>);

export const IconWallet = base(<>
  <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
  <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
  <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
</>);

export const IconLink = base(<>
  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
</>);

export const IconArrowRight = base(<>
  <line x1="5" y1="12" x2="19" y2="12" />
  <polyline points="12 5 19 12 12 19" />
</>);

export const IconX = base(<>
  <line x1="18" y1="6" x2="6" y2="18" />
  <line x1="6" y1="6" x2="18" y2="18" />
</>);

export const IconMenu = base(<>
  <line x1="3" y1="12" x2="21" y2="12" />
  <line x1="3" y1="6" x2="21" y2="6" />
  <line x1="3" y1="18" x2="21" y2="18" />
</>);

export const IconChevronRight = base(<>
  <polyline points="9 18 15 12 9 6" />
</>);

export const IconFile = base(<>
  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
  <polyline points="14 2 14 8 20 8" />
</>);

export const IconLock = base(<>
  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
</>);

export const IconTrendingUp = base(<>
  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
  <polyline points="17 6 23 6 23 12" />
</>);

export const IconZap = base(<>
  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
</>);

export const IconVerified = base(<>
  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  <polyline points="9 12 11 14 15 10" />
</>);

export const IconKey = base(<>
  <circle cx="7" cy="15" r="4" />
  <path d="M11 15h10" />
  <path d="M17 15v3" />
  <path d="M20 15v2" />
</>);

// Category → icon mapping
export const CATEGORY_ICONS: Record<string, React.FC<IconProps>> = {
  hotel:      IconHotel,
  train:      IconTrain,
  airline:    IconPlane,
  'car-share':IconCar,
  activity:   IconActivity,
  restaurant: IconRestaurant,
  cruise:     IconShip,
  key: IconKey
};

export function CategoryIcon({ category, size = 20, className = '' }: { category: string; size?: number; className?: string }) {
  const Icon = CATEGORY_ICONS[category] || IconLeaf;
  return <Icon size={size} className={className} />;
}