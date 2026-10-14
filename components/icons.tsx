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
