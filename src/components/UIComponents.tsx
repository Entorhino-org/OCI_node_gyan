import React, { memo, useState } from 'react';
import { CardProps, ButtonProps } from '../types';
import { Loader2, Eye, EyeOff } from 'lucide-react';

export const NeonCard: React.FC<CardProps & React.HTMLAttributes<HTMLDivElement>> = memo(({ children, className = '', glowColor = 'cyan', hoverEffect = false, ...props }) => {
  const borderClass = glowColor === 'orange' ? 'group-hover:border-signal-orange/50' : 'group-hover:border-neon-cyan/50';
  const shadowClass = glowColor === 'orange' ? 'hover:shadow-[0_0_30px_rgba(255,95,31,0.3)]' : 'hover:shadow-[0_0_30px_rgba(0,243,255,0.3)]';

  const gradientFrom = glowColor === 'cyan' ? 'cyan-400' : glowColor === 'orange' ? 'orange-500' : 'blue-500';

  return (
    <div className={`glass-panel rounded-xl p-6 transition-all duration-300 relative overflow-hidden group border border-white/10 ${hoverEffect ? `hover:-translate-y-2 ${shadowClass} ${borderClass}` : ''} ${className}`} {...props}>
      <div className={`absolute inset-0 opacity-0 ${hoverEffect ? 'group-hover:opacity-10' : ''} transition-opacity duration-500 bg-gradient-to-br from-${gradientFrom} to-transparent pointer-events-none`} />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
});

export const NeonButton: React.FC<ButtonProps & { isLoading?: boolean }> = memo(({ children, variant = 'primary', size = 'md', glow = false, className = '', isLoading = false, disabled, ...props }) => {
  const baseStyles = "relative rounded-lg font-display font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg"
  };

  const variants = {
    primary: "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 border border-cyan-400/30",
    secondary: "bg-white/5 text-cyan-300 hover:bg-white/10 border border-cyan-500/30",
    danger: "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30",
    ghost: "bg-transparent text-gray-400 hover:text-white"
  };
  const glowStyle = glow ? "shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_35px_rgba(6,182,212,0.6)]" : "";

  return (
    <button className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${glowStyle} ${className}`} disabled={isLoading || disabled} {...props}>
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
});

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = memo(({ label, className = '', type, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="w-full">
      {label && <label className="block text-gray-400 text-sm mb-2 font-medium">{label}</label>}
      <div className="relative group/input">
        <input
          {...props}
          type={isPassword ? (showPassword ? 'text' : 'password') : type}
          className={`w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan/50 transition-all ${isPassword ? 'pr-12' : ''} ${className}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-md text-gray-400 hover:text-neon-cyan hover:bg-white/5 transition-all outline-none"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>
    </div>
  );
});

export const NeonTag: React.FC<{ label: string; color: 'cyan' | 'purple' | 'blue' | 'red' | 'green' }> = memo(({ label, color }) => {
  const colorStyles: Record<string, string> = {
    cyan: 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30',
    orange: 'bg-signal-orange/20 text-signal-orange border-signal-orange/30',
    blue: 'bg-neon-blue/20 text-neon-blue border-neon-blue/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };
  return <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${colorStyles[color] || colorStyles.cyan}`}>{label}</span>;
});
