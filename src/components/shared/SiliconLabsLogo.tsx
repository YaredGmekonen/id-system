import { useTheme } from '../../context/ThemeContext';

export interface SiliconLabsLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  layout?: 'horizontal' | 'stacked' | 'symbol';
  variant?: 'light' | 'dark' | 'auto' | 'black' | 'white';
  showText?: boolean;
  showSubText?: boolean;
  subText?: string;
}

export default function SiliconLabsLogo({
  className = '',
  size = 'md',
  layout = 'horizontal',
  variant = 'auto',
  showText = true,
  showSubText = false,
  subText = 'CREDENTIAL PLATFORM',
}: SiliconLabsLogoProps) {
  let isDarkTheme = true;
  try {
    const theme = useTheme();
    isDarkTheme = theme.isDark;
  } catch {
    // Fallback if rendered outside ThemeProvider
  }

  const effectiveLayout = showText === false ? 'symbol' : layout;

  // Resolve color scheme: dark background needs white logo, light background needs color/dark logo
  const isDarkBg =
    variant === 'white'
      ? true
      : variant === 'black' || variant === 'light'
      ? false
      : variant === 'dark'
      ? false
      : isDarkTheme;

  // Select the exact official asset according to the brand guide
  let logoSrc = '/brand/silicon-labs-master-horizontal-web.png';

  if (effectiveLayout === 'symbol') {
    if (variant === 'black') {
      logoSrc = '/brand/silicon-labs-symbol-black.png';
    } else if (isDarkBg) {
      logoSrc = '/brand/silicon-labs-symbol-white.png';
    } else {
      logoSrc = '/brand/silicon-labs-symbol-only.png';
    }
  } else if (effectiveLayout === 'stacked') {
    if (variant === 'black') {
      logoSrc = '/brand/silicon-labs-stacked-black.png';
    } else if (isDarkBg) {
      logoSrc = '/brand/silicon-labs-stacked-white.png';
    } else {
      logoSrc = '/brand/silicon-labs-stacked-color.png';
    }
  } else {
    // Horizontal Lockup
    if (variant === 'black') {
      logoSrc = '/brand/silicon-labs-black-horizontal.png';
    } else if (isDarkBg) {
      logoSrc = '/brand/silicon-labs-white-reverse-horizontal.png';
    } else {
      logoSrc = '/brand/silicon-labs-master-horizontal-web.png';
    }
  }

  // Dimension scaling mapping
  const heightClasses = {
    xs: effectiveLayout === 'symbol' ? 'h-5 w-5' : effectiveLayout === 'stacked' ? 'h-8' : 'h-6',
    sm: effectiveLayout === 'symbol' ? 'h-6 w-6' : effectiveLayout === 'stacked' ? 'h-10' : 'h-7',
    md: effectiveLayout === 'symbol' ? 'h-8 w-8' : effectiveLayout === 'stacked' ? 'h-12' : 'h-9',
    lg: effectiveLayout === 'symbol' ? 'h-10 w-10' : effectiveLayout === 'stacked' ? 'h-16' : 'h-12',
    xl: effectiveLayout === 'symbol' ? 'h-14 w-14' : effectiveLayout === 'stacked' ? 'h-20' : 'h-16',
    '2xl': effectiveLayout === 'symbol' ? 'h-20 w-20' : effectiveLayout === 'stacked' ? 'h-28' : 'h-22',
  };

  return (
    <div className={`inline-flex flex-col items-start select-none ${className}`}>
      <img
        src={logoSrc}
        alt="Silicon Labs"
        className={`${heightClasses[size]} w-auto object-contain transition-opacity duration-200`}
        draggable={false}
      />
      {showSubText && subText && (
        <span
          className={`text-[8px] font-mono tracking-widest uppercase font-bold mt-1 ${
            isDarkBg ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          {subText}
        </span>
      )}
    </div>
  );
}
