import { useTheme } from '../../context/ThemeContext';

interface SiliconLabsLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  variant?: 'light' | 'dark' | 'auto';
  subText?: string;
}

export default function SiliconLabsLogo({
  className = '',
  size = 'md',
  showText = true,
  variant = 'auto',
  subText = 'CREDENTIAL PLATFORM',
}: SiliconLabsLogoProps) {
  let isDark = true;
  try {
    const theme = useTheme();
    isDark = theme.isDark;
  } catch {
    // Used outside ThemeProvider (e.g., login page) — default to dark
  }

  // Resolve variant: 'auto' follows system theme, 'light'/'dark' are explicit
  const resolvedVariant = variant === 'auto' ? (isDark ? 'light' : 'dark') : variant;

  const sizeMap = {
    sm: { icon: 'w-6 h-6', text: 'text-xs', sub: 'text-[7px]' },
    md: { icon: 'w-8 h-8', text: 'text-sm', sub: 'text-[8px]' },
    lg: { icon: 'w-10 h-10', text: 'text-base', sub: 'text-[9px]' },
    xl: { icon: 'w-14 h-14', text: 'text-xl', sub: 'text-[10px]' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Real SiliconLabs PNG Logo */}
      <div className={`relative flex-shrink-0 ${currentSize.icon} flex items-center justify-center`}>
        <img
          src="/siliconlabs-logo.png"
          alt="SiliconLabs"
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>

      {/* Typography */}
      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center tracking-tight">
            <span
              className={`font-black uppercase tracking-wider ${currentSize.text} ${
                resolvedVariant === 'dark' ? 'text-slate-900' : 'text-white'
              }`}
            >
              SILICON<span className="text-[#84a92c]">LABS</span>
            </span>
          </div>
          {subText && (
            <span className={`font-mono tracking-widest uppercase font-bold mt-0.5 ${currentSize.sub} ${
              resolvedVariant === 'dark' ? 'text-slate-500' : 'text-[#64748b]'
            }`}>
              {subText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
