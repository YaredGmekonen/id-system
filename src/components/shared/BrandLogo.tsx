interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  variant?: 'light' | 'dark' | 'auto';
}

export default function BrandLogo({
  className = '',
  size = 'md',
  showText = true,
  variant = 'auto',
}: BrandLogoProps) {
  const sizeMap = {
    sm: { icon: 'w-7 h-7', text: 'text-xs', sub: 'text-[9px]' },
    md: { icon: 'w-9 h-9', text: 'text-sm', sub: 'text-[10px]' },
    lg: { icon: 'w-12 h-12', text: 'text-lg', sub: 'text-xs' },
    xl: { icon: 'w-16 h-16', text: 'text-xl', sub: 'text-sm' },
  };

  const currentSize = sizeMap[size];
  const isLight = variant === 'light';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Real SiliconLabs PNG Logo */}
      <div className={`${currentSize.icon} flex items-center justify-center flex-shrink-0`}>
        <img
          src="/siliconlabs-logo.png"
          alt="SiliconLabs"
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1">
            <span
              className={`font-black tracking-wider uppercase ${currentSize.text} ${
                isLight ? 'text-white' : 'text-slate-900'
              }`}
            >
              SILICON<span className="text-[#84a92c] font-black">LABS</span>
            </span>
          </div>
          <span className={`${isLight ? 'text-slate-400' : 'text-slate-500'} font-mono tracking-widest text-[8px] uppercase font-bold mt-0.5`}>
            CREDENTIAL PLATFORM
          </span>
        </div>
      )}
    </div>
  );
}
