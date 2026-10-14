import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

interface BrandMarkProps {
  size?: number;
  /** Hides the rounded plate, leaving just the glyph + orbit. */
  bare?: boolean;
}

/**
 * The Eternalz mark, drawn as vectors — the crystalline "E" with its orbital
 * ring and spark, on a rounded cosmic plate. Vector so it stays crisp at every
 * size and can sit on any background.
 */
export const BrandMark = ({ size = 72, bare = false }: BrandMarkProps) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <SvgLinearGradient id="plate" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#191339" />
        <Stop offset="0.55" stopColor="#0E0B20" />
        <Stop offset="1" stopColor="#080712" />
      </SvgLinearGradient>
      <SvgLinearGradient id="glyph" x1="0.15" y1="0" x2="0.85" y2="1">
        <Stop offset="0" stopColor="#FFFFFF" />
        <Stop offset="0.42" stopColor="#D8CCFF" />
        <Stop offset="0.78" stopColor="#9B7CF8" />
        <Stop offset="1" stopColor="#6D28D9" />
      </SvgLinearGradient>
      <SvgLinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#EDE9FE" stopOpacity="0.95" />
        <Stop offset="0.5" stopColor="#A78BFA" stopOpacity="0.55" />
        <Stop offset="1" stopColor="#5B21B6" stopOpacity="0.15" />
      </SvgLinearGradient>
      <RadialGradient id="star" cx="50%" cy="50%" r="50%">
        <Stop offset="0" stopColor="#FFFFFF" />
        <Stop offset="0.45" stopColor="#EDE9FE" />
        <Stop offset="1" stopColor="#8B5CF6" stopOpacity="0" />
      </RadialGradient>
      <RadialGradient id="halo" cx="50%" cy="46%" r="52%">
        <Stop offset="0" stopColor="#8B5CF6" stopOpacity="0.45" />
        <Stop offset="1" stopColor="#8B5CF6" stopOpacity="0" />
      </RadialGradient>
    </Defs>

    {!bare && (
      <>
        <Rect
          x="1.5"
          y="1.5"
          width="97"
          height="97"
          rx="26"
          fill="url(#plate)"
          stroke="rgba(167,139,250,0.32)"
          strokeWidth="1.2"
        />
        <Circle cx="50" cy="46" r="34" fill="url(#halo)" />
      </>
    )}

    <G>
      {/* light beams above and below the mark */}
      <Path d="M50 6 L50 16" stroke="#C4B5FD" strokeWidth="1.4" strokeOpacity="0.5" strokeLinecap="round" />
      <Path d="M50 86 L50 95" stroke="#C4B5FD" strokeWidth="1.4" strokeOpacity="0.35" strokeLinecap="round" />

      {/* orbital ring, behind the glyph */}
      <Ellipse
        cx="50"
        cy="52"
        rx="39"
        ry="13"
        stroke="url(#ring)"
        strokeWidth="1.7"
        fill="none"
        transform="rotate(-16 50 52)"
      />

      {/* glyph */}
      <G fill="url(#glyph)">
        <Path d="M31 21 H44 L43 79 H32 Z" />
        <Path d="M44 23 L81 18.5 L76.5 30.5 L44 31.5 Z" />
        <Path d="M44 45 L69 42.5 L66.5 53.5 L44 54.5 Z" />
        <Path d="M44 68.5 L76.5 69.5 L81 81.5 L44 77 Z" />
      </G>

      {/* ring passing in front of the glyph, for depth */}
      <Path
        d="M15 63 Q48 84 86 47"
        stroke="url(#ring)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />

      {/* spark */}
      <Circle cx="30" cy="50" r="11" fill="url(#star)" opacity="0.85" />
      <Path
        d="M30 41 L31.6 47.6 L38.2 50 L31.6 52.4 L30 59 L28.4 52.4 L21.8 50 L28.4 47.6 Z"
        fill="#FFFFFF"
      />
    </G>
  </Svg>
);
