import { ReactNode } from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { colors } from "@/theme/tokens";

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * Hand-drawn 24px line icons — no icon-font dependency, so they render
 * identically on web and native and can be tinted per theme.
 */
const Icon = ({
  size = 24,
  color = colors.accent,
  strokeWidth = 1.7,
  children,
}: IconProps & { children: ReactNode }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </Svg>
);

export const IconHome = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M4 10.6 12 4l8 6.6V19a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 19v-8.4Z" />
    <Path d="M9.6 20.6v-5.4h4.8v5.4" />
  </Icon>
);

export const IconGrid = (p: IconProps) => (
  <Icon {...p}>
    <Rect x="3.6" y="3.6" width="7" height="7" rx="2.2" />
    <Rect x="13.4" y="3.6" width="7" height="7" rx="2.2" />
    <Rect x="3.6" y="13.4" width="7" height="7" rx="2.2" />
    <Rect x="13.4" y="13.4" width="7" height="7" rx="2.2" />
  </Icon>
);

export const IconGear = (p: IconProps) => (
  <Icon {...p}>
    <Circle cx="12" cy="12" r="3.3" />
    <Path d="M12 2.6v3M12 18.4v3M2.6 12h3M18.4 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
  </Icon>
);

export const IconChevronRight = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M9.5 6l6 6-6 6" />
  </Icon>
);

export const IconChevronLeft = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M14.5 6l-6 6 6 6" />
  </Icon>
);

export const IconSparkle = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M12 3.2l1.9 5.1 5.1 1.9-5.1 1.9-1.9 5.1-1.9-5.1L5 10.2l5.1-1.9L12 3.2Z" />
    <Path d="M18.6 16.4l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9Z" />
  </Icon>
);

export const IconBolt = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M13.4 2.6 5.2 13.4h5.1l-.9 8 8.4-11h-5.2l.8-7.8Z" />
  </Icon>
);

export const IconShield = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M12 3.2l7.4 2.6v5.6c0 4.7-3.1 7.9-7.4 8.8-4.3-.9-7.4-4.1-7.4-8.8V5.8L12 3.2Z" />
    <Path d="M9.2 12.1l2 2 3.6-3.9" />
  </Icon>
);

export const IconBook = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M5.4 4.6h9.8a3 3 0 0 1 3 3v11.8H8.4a3 3 0 0 1-3-3V4.6Z" />
    <Path d="M8.4 8.6h6.4M8.4 12.4h4.4" />
  </Icon>
);

export const IconTarget = (p: IconProps) => (
  <Icon {...p}>
    <Circle cx="12" cy="12" r="8.4" />
    <Circle cx="12" cy="12" r="4.4" />
    <Circle cx="12" cy="12" r="1" />
  </Icon>
);

export const IconWallet = (p: IconProps) => (
  <Icon {...p}>
    <Rect x="3.2" y="6.2" width="17.6" height="13" rx="3" />
    <Path d="M3.2 10.4h17.6" />
    <Path d="M16.2 14.6h1.6" />
  </Icon>
);

export const IconBell = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M6.4 9.6a5.6 5.6 0 0 1 11.2 0c0 4.6 1.9 5.6 1.9 5.6H4.5s1.9-1 1.9-5.6Z" />
    <Path d="M10.2 18.9a2 2 0 0 0 3.6 0" />
  </Icon>
);

export const IconChart = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M4.4 20.2V11M11.2 20.2V4.6M18 20.2v-6.4" />
  </Icon>
);

export const IconUser = (p: IconProps) => (
  <Icon {...p}>
    <Circle cx="12" cy="8.4" r="3.6" />
    <Path d="M5.2 20.4c1.4-3.4 3.9-5 6.8-5s5.4 1.6 6.8 5" />
  </Icon>
);

export const IconLogOut = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M14.8 4.4h3a2 2 0 0 1 2 2v11.2a2 2 0 0 1-2 2h-3" />
    <Path d="M10.2 8.4 6.6 12l3.6 3.6" />
    <Path d="M6.6 12h8.2" />
  </Icon>
);

export const IconInfo = (p: IconProps) => (
  <Icon {...p}>
    <Circle cx="12" cy="12" r="8.6" />
    <Path d="M12 11.2v5" />
    <Circle cx="12" cy="7.9" r="0.4" fill={p.color ?? colors.accent} />
  </Icon>
);

export const IconCheck = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M4.6 12.6l4.8 4.8L19.4 6.8" />
  </Icon>
);

export const IconCloud = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M7 18.4a4.2 4.2 0 0 1-.6-8.4 5.6 5.6 0 0 1 10.8 1.2 3.6 3.6 0 0 1-.6 7.2H7Z" />
  </Icon>
);

export const IconWand = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M4.6 19.4 15.2 8.8" />
    <Path d="M14 4.2l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9.9-2.4Z" />
    <Path d="M19.4 13.4l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5.5-1.4Z" />
  </Icon>
);

/* ── Document manager ──────────────────────────────────────────────────── */

export const IconFolder = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M3.4 7.4a2 2 0 0 1 2-2h3.4l1.8 2.2h8a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2H5.4a2 2 0 0 1-2-2V7.4Z" />
  </Icon>
);

export const IconUpload = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M12 16.4V4.6" />
    <Path d="M7.6 9l4.4-4.4L16.4 9" />
    <Path d="M4.6 15.4v2.8a2 2 0 0 0 2 2h10.8a2 2 0 0 0 2-2v-2.8" />
  </Icon>
);

export const IconDownload = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M12 4.6v11.8" />
    <Path d="M16.4 12 12 16.4 7.6 12" />
    <Path d="M4.6 15.4v2.8a2 2 0 0 0 2 2h10.8a2 2 0 0 0 2-2v-2.8" />
  </Icon>
);

export const IconTrash = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M4.6 7.4h14.8" />
    <Path d="M9.4 7.4V5.6a1 1 0 0 1 1-1h3.2a1 1 0 0 1 1 1v1.8" />
    <Path d="M6.6 7.4l.8 11.2a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5l.8-11.2" />
  </Icon>
);

export const IconUsers = (p: IconProps) => (
  <Icon {...p}>
    <Circle cx="9.4" cy="8.6" r="3.2" />
    <Path d="M3.6 19.6c1.2-3 3.3-4.4 5.8-4.4s4.6 1.4 5.8 4.4" />
    <Path d="M15.6 6.2a3 3 0 0 1 0 5.8" />
    <Path d="M17.4 15.6c1.4.6 2.5 1.8 3 3.4" />
  </Icon>
);

export const IconLock = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M6.6 10.6h10.8a1.8 1.8 0 0 1 1.8 1.8v6a1.8 1.8 0 0 1-1.8 1.8H6.6a1.8 1.8 0 0 1-1.8-1.8v-6a1.8 1.8 0 0 1 1.8-1.8Z" />
    <Path d="M8.4 10.6V8.2a3.6 3.6 0 0 1 7.2 0v2.4" />
  </Icon>
);

export const IconPlus = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M12 5.4v13.2M5.4 12h13.2" />
  </Icon>
);

export const IconLink = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M10.4 13.6a3.6 3.6 0 0 0 5.1 0l2.6-2.6a3.6 3.6 0 0 0-5.1-5.1l-1.3 1.3" />
    <Path d="M13.6 10.4a3.6 3.6 0 0 0-5.1 0l-2.6 2.6a3.6 3.6 0 0 0 5.1 5.1l1.3-1.3" />
  </Icon>
);

export const IconFile = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M13.6 3.6H7.4a1.8 1.8 0 0 0-1.8 1.8v13.2a1.8 1.8 0 0 0 1.8 1.8h9.2a1.8 1.8 0 0 0 1.8-1.8V8.4l-4.8-4.8Z" />
    <Path d="M13.4 3.8V8.6h4.8" />
  </Icon>
);

export const IconFileImage = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M13.6 3.6H7.4a1.8 1.8 0 0 0-1.8 1.8v13.2a1.8 1.8 0 0 0 1.8 1.8h9.2a1.8 1.8 0 0 0 1.8-1.8V8.4l-4.8-4.8Z" />
    <Path d="M13.4 3.8V8.6h4.8" />
    <Circle cx="10.2" cy="13" r="1.1" />
    <Path d="M6.6 19.4l3.6-3.8 2.6 2.4 2-1.8 2.6 2.4" />
  </Icon>
);

export const IconFilePdf = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M13.6 3.6H7.4a1.8 1.8 0 0 0-1.8 1.8v13.2a1.8 1.8 0 0 0 1.8 1.8h9.2a1.8 1.8 0 0 0 1.8-1.8V8.4l-4.8-4.8Z" />
    <Path d="M13.4 3.8V8.6h4.8" />
    <Path d="M8.6 17.4v-4.2h1.3a1.2 1.2 0 0 1 0 2.4H8.6" />
    <Path d="M13.4 13.2v4.2h1a1.6 1.6 0 0 0 1.6-1.6v-1a1.6 1.6 0 0 0-1.6-1.6h-1Z" />
  </Icon>
);

export const IconFileSheet = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M13.6 3.6H7.4a1.8 1.8 0 0 0-1.8 1.8v13.2a1.8 1.8 0 0 0 1.8 1.8h9.2a1.8 1.8 0 0 0 1.8-1.8V8.4l-4.8-4.8Z" />
    <Path d="M13.4 3.8V8.6h4.8" />
    <Path d="M7.4 13.4h9.2M7.4 17h9.2M12 13.4V20" />
  </Icon>
);

export const IconFileSlides = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M13.6 3.6H7.4a1.8 1.8 0 0 0-1.8 1.8v13.2a1.8 1.8 0 0 0 1.8 1.8h9.2a1.8 1.8 0 0 0 1.8-1.8V8.4l-4.8-4.8Z" />
    <Path d="M13.4 3.8V8.6h4.8" />
    <Path d="M7.4 13.6h9.2v4.6H7.4z" />
  </Icon>
);

export const IconRotateCw = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M19.4 12a7.4 7.4 0 1 1-2.2-5.2" />
    <Path d="M19.6 4.6v4.2h-4.2" />
  </Icon>
);

export const IconRotateCcw = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M4.6 12a7.4 7.4 0 1 0 2.2-5.2" />
    <Path d="M4.4 4.6v4.2h4.2" />
  </Icon>
);

export const IconFlipHorizontal = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M12 3.6v16.8" />
    <Path d="M9 7.4 4.6 12 9 16.6V7.4Z" />
    <Path d="M15 7.4 19.4 12 15 16.6V7.4Z" />
  </Icon>
);

export const IconFlipVertical = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M3.6 12h16.8" />
    <Path d="M7.4 9 12 4.6 16.6 9H7.4Z" />
    <Path d="M7.4 15 12 19.4 16.6 15H7.4Z" />
  </Icon>
);

export const IconLayers = (p: IconProps) => (
  <Icon {...p}>
    <Path d="M12 3.6 3.6 8.4 12 13.2l8.4-4.8L12 3.6Z" />
    <Path d="M3.6 12.6 12 17.4l8.4-4.8" />
    <Path d="M3.6 16.4 12 21.2l8.4-4.8" />
  </Icon>
);

