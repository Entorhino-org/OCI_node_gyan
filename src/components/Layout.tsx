
import React, { useState, useEffect, useRef } from 'react';
import { Zap, Wifi, WifiOff, Menu, X, Home, User, Settings, LogOut, BookOpen, Layers, Users, Calendar, ClipboardList, Trophy, FileText, Briefcase, Brain, School, LayoutDashboard, Megaphone, AlertTriangle, Target } from 'lucide-react';
import logoNew from '../assets/logo-new.png';


import { api } from '../services/api';
import { UserRole, Student, Teacher, Parent } from '../types';

import { UserProfileModal } from './UserProfileModal';

interface LayoutProps {
  children: React.ReactNode;
  logoUrl?: string;
  userRole?: UserRole | null;
  currentUser?: Student | Teacher | Parent;
  onLogout?: () => void;
  onUpdateUser?: (updatedUser: any) => void;
  activeTab?: string;
  onNavigate?: (tab: string) => void;
  hideHeader?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, logoUrl, userRole, currentUser, onLogout, onUpdateUser, hideHeader = false, activeTab, onNavigate }) => {
  const [scrollFlash, setScrollFlash] = useState(false);
  const [isAiOnline, setIsAiOnline] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const lastScrollY = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkConnection = async () => {
    setIsChecking(true);
    const online = await api.checkSystemHealth();
    setIsAiOnline(online);
    setIsChecking(false);
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 60000); // Check every minute

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = Math.abs(currentScrollY - lastScrollY.current);
      if (delta > 50) {
        setScrollFlash(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setScrollFlash(false), 300);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  // --- MENU ITEMS CONFIG ---
  const scrollToSection = (id: string) => {
    if (window.location.pathname !== '/') {
      window.location.href = `/#${id}`;
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false);
    }
  };

  // --- MENU ITEMS CONFIG ---
  const getMenuItems = () => {
    // Helper to request navigation from parent app
    const navigate = (tab: string) => {
      if (onNavigate) onNavigate(tab);
      setIsMenuOpen(false);
    };

    const commonItems = !userRole ? [
      { label: 'Home', icon: Home, action: () => { navigate('HOME'); } },
      { label: 'About Us', icon: Layers, action: () => { navigate('ABOUT'); } },
      { label: 'Our Team', icon: Users, action: () => { navigate('TEAM'); } },
      { label: 'Contact', icon: FileText, action: () => { navigate('CONTACT'); } },
    ] : [];

    if (!userRole) {
      return [
        ...commonItems,
        { label: 'Features', icon: Brain, action: () => scrollToSection('features') },
        { label: 'Pricing', icon: Zap, action: () => scrollToSection('pricing') },
        { label: 'Login / Join', icon: LayoutDashboard, action: () => navigate('ROLE_SELECTION') },
      ];
    }
    // If userRole is set but no role-specific items, return common items only (no Login/Join)
    // This prevents showing Login/Join when user is authenticated

    let roleItems: any[] = [];
    if (userRole === 'STUDENT') {
      roleItems = [
        { label: 'My Profile', icon: User, action: () => { setShowProfileModal(true); setIsMenuOpen(false); } },
        { label: 'Dashboard', icon: LayoutDashboard, action: () => navigate('LEARN') },
        { label: 'Assignments', icon: ClipboardList, action: () => navigate('ASSIGNMENTS') },
        { label: 'Mind Maps', icon: Brain, action: () => navigate('MINDMAP') },
        { label: 'Quizzes', icon: Trophy, action: () => navigate('PRACTICE') },
        { label: 'Leaderboard', icon: Trophy, action: () => navigate('LEADERBOARD') },
        { label: 'Remedial', icon: Layers, action: () => navigate('REMEDIAL') },
      ];
    } else if (userRole === 'TEACHER') {
      roleItems = [
        { label: 'My Profile', icon: User, action: () => { setShowProfileModal(true); setIsMenuOpen(false); } },
        { label: 'Dashboard', icon: LayoutDashboard, action: () => navigate('HOME') },
        { label: 'Class & Attendance', icon: Users, action: () => navigate('CLASSES') },
        { label: 'Assignments', icon: ClipboardList, action: () => navigate('ASSIGNMENTS') },
        { label: 'Learning Gaps', icon: AlertTriangle, action: () => navigate('GAPS') },
      ];
    } else if (userRole === 'ADMIN') {
      roleItems = [
        { label: 'Dashboard', icon: LayoutDashboard, action: () => navigate('HOME') },
        { label: 'Classes', icon: Briefcase, action: () => navigate('CLASSES') },
        { label: 'Teachers', icon: Users, action: () => navigate('TEACHERS') },
        { label: 'Students', icon: Users, action: () => navigate('STUDENTS') },
        { label: 'Announcements', icon: Megaphone, action: () => navigate('ANNOUNCEMENTS') },
        { label: 'Leaderboard', icon: Trophy, action: () => navigate('LEADERBOARD') },
      ];
    }

    return [...commonItems, ...roleItems];
  };


  return (
    <div className="min-h-screen relative font-sans text-gray-100 selection:bg-neon-cyan selection:text-black">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 bg-dark-bg">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
        <div className="absolute top-[-10%] left-[-10%] w-1/2 h-1/2 bg-neon-purple/10 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-1/2 h-1/2 bg-neon-cyan/10 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className={`lightning-flash ${scrollFlash ? 'animate-flash' : ''}`}></div>

      {showProfileModal && currentUser && (
        <UserProfileModal
          user={currentUser}
          role={userRole || undefined}
          onClose={() => setShowProfileModal(false)}
          onUpdateUser={(updated) => {
            if (onUpdateUser) onUpdateUser(updated);
            setShowProfileModal(false);
          }}
        />
      )}

      {/* --- SIDEBAR DRAWER --- */}
      <div className={`fixed inset-0 z-[100] transition-opacity duration-300 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={toggleMenu}></div>
        <div className={`absolute top-0 left-0 w-80 h-full bg-[#0f1115] border-r border-white/10 shadow-2xl transform transition-transform duration-300 flex flex-col ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>

          {/* Menu Header */}
          <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
            <h2 className="text-xl font-display font-bold text-white tracking-widest">MENU</h2>
            <button onClick={toggleMenu} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Info (if logged in) */}
          {currentUser && (
            <div className="p-6 bg-gradient-to-r from-neon-purple/10 to-transparent border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {(currentUser.name || 'U').charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-white leading-tight">{currentUser.name || 'User'}</h3>
                  <span className="text-xs font-bold text-neon-cyan px-2 py-0.5 rounded bg-neon-cyan/10 border border-neon-cyan/20 mt-1 inline-block">
                    {userRole}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {getMenuItems().map((item, idx) => (
              <button
                key={idx}
                onClick={item.action}
                className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 data-[active=true]:bg-neon-purple/20 data-[active=true]:text-neon-purple text-gray-400 hover:text-white transition-all group"
              >
                <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="font-medium tracking-wide">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Footer Actions */}
          <div className="p-4 border-t border-white/10 bg-black/20 space-y-3">
            {/* AI Status in Menu */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
              <span className="text-xs text-gray-400 font-bold uppercase">AI System</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isAiOnline ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500'}`}></div>
                <span className={`text-xs font-bold ${isAiOnline ? 'text-green-500' : 'text-red-500'}`}>{isAiOnline ? 'ONLINE' : 'OFFLINE'}</span>
              </div>
            </div>

            {onLogout && userRole && (
              <button onClick={() => { toggleMenu(); onLogout(); }} className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 transition-all font-bold text-sm">
                <LogOut className="w-4 h-4" />
                LOGOUT
              </button>
            )}
          </div>
        </div>
      </div>


      <main className="relative z-10 flex flex-col min-h-screen">
        {/* Header - Conditionally rendered */}
        {!hideHeader && (
          <header className="px-2 py-3 flex justify-between items-center glass-panel sticky top-0 z-50 border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-2 md:gap-4">
              {/* Hamburger and Logo */}
              <button
                onClick={toggleMenu}
                className="p-2 -ml-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-cyan-400 transition-all duration-300 transform hover:scale-110"
              >
                <Menu className="w-5 h-5 md:w-6 md:h-6" />
              </button>

              <div className="flex items-center gap-2 md:gap-3 group cursor-pointer" onClick={() => onNavigate?.(userRole ? 'DASHBOARD' : 'HOME')}>
                {logoUrl ? (
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg overflow-hidden border border-neon-cyan/50 shadow-[0_0_10px_rgba(6,182,212,0.3)] group-hover:shadow-[0_0_15px_rgba(6,182,212,0.6)] transition-all">
                    <img src={logoUrl} alt="School Logo" className="w-full h-full object-cover" />
                  </div>
                ) : null}
                <div>
                  <img src={logoNew} alt="Gyan AI" className="h-8 md:h-12 lg:h-14 w-auto object-contain logo-glow group-hover:scale-105 transition-transform" />
                </div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-8 pr-6 border-r border-white/10">
                {/* Section Links (Only for Home/Guest) */}
                {!userRole && (
                  <>
                    <button onClick={() => scrollToSection('features')} className="relative text-gray-400 hover:text-neon-cyan transition-colors text-xs font-bold tracking-[0.2em] uppercase group/nav transition-all">
                      FEATURES
                      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-neon-cyan transition-all duration-300 group-hover/nav:w-full shadow-[0_0_8px_#00f3ff]"></span>
                    </button>
                    <button onClick={() => scrollToSection('pricing')} className="relative text-gray-400 hover:text-neon-cyan transition-colors text-xs font-bold tracking-[0.2em] uppercase group/nav transition-all">
                      PRICING
                      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-neon-cyan transition-all duration-300 group-hover/nav:w-full shadow-[0_0_8px_#00f3ff]"></span>
                    </button>

                    {/* Constant Policy/Info Links - Only for Guest */}
                    {['ABOUT', 'TEAM', 'CONTACT'].map((item) => (
                      <button
                        key={item}
                        onClick={() => onNavigate?.(item)}
                        className="relative text-gray-400 hover:text-neon-cyan transition-colors text-xs font-bold tracking-[0.2em] uppercase group/nav transition-all"
                      >
                        {item}
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-neon-cyan transition-all duration-300 group-hover/nav:w-full shadow-[0_0_8px_#00f3ff]"></span>
                      </button>
                    ))}
                  </>
                )}
              </div>

              {/* Action Area (Profile/Login) */}
              <div className="flex items-center gap-4">
                {userRole && currentUser ? (
                  <div
                    onClick={() => setShowProfileModal(true)}
                    className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-neon-cyan/50 hover:bg-white/10 transition-all cursor-pointer group shadow-inner"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center text-white font-bold text-xs ring-2 ring-neon-cyan/20 group-hover:ring-neon-cyan group-hover:scale-105 transition-all">
                      {(currentUser.name || 'U').charAt(0)}
                    </div>
                    <div className="text-left hidden lg:block">
                      <div className="text-[10px] font-bold text-white leading-none truncate max-w-[80px]">{currentUser.name}</div>
                      <div className="text-[8px] text-neon-cyan uppercase tracking-[0.2em] mt-1 font-black opacity-80 group-hover:opacity-100">{userRole}</div>
                    </div>
                  </div>
                ) : userRole ? (
                  /* User has a role but currentUser is still loading — hide login button */
                  <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
                ) : (
                  <button
                    onClick={() => onNavigate?.('ROLE_SELECTION')}
                    className="group relative px-6 py-2 bg-neon-cyan text-black font-black text-xs tracking-[0.25em] rounded-lg overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(0,243,255,0.4)] active:scale-95"
                  >
                    <div className="absolute inset-0 bg-white/40 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 skew-x-12"></div>
                    <span className="relative">LOGIN / JOIN</span>
                  </button>
                )}

                {/* System Status */}
                <div className="hidden sm:flex flex-col items-end pr-4 border-r border-white/10">
                  <div className="text-[9px] text-gray-500 font-mono tracking-tighter">BUILD v3.2</div>
                  <div className="text-[8px] text-neon-cyan uppercase tracking-[0.25em] font-black animate-pulse">CORE ACTIVE</div>
                </div>

                <div className="relative flex items-center justify-center">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${isAiOnline ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'} animate-pulse`}
                    title={isAiOnline ? "Quantum AI Protocol: ONLINE" : "Quantum AI Protocol: OFFLINE"}
                  ></div>
                  {isAiOnline && (
                    <div className="absolute w-3 h-3 rounded-full bg-green-500 animate-ping opacity-30"></div>
                  )}
                </div>
              </div>
            </div>
          </header>
        )}

        <div className="flex-grow w-full py-6 md:py-12">
          {children}
        </div>

        <footer className="p-6 text-center text-gray-600 text-sm border-t border-white/5 glass-panel flex flex-col md:flex-row items-center justify-center md:justify-between gap-4 relative">
          <div className="flex flex-col items-center md:items-start">
            <p>&copy; 2025 Gyan EdTech. <span className="block md:inline md:ml-2">Powered by <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 font-bold">Google Gemini</span></span></p>
          </div>

        </footer>
      </main>
    </div >
  );
};
