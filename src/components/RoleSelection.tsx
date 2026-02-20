import React, { useState, useRef } from 'react';
import { UserRole, Teacher } from '../types';
import { NeonCard, NeonButton, Input } from './UIComponents';
import { ForgotPassword } from './ForgotPassword';
import { GraduationCap, Users, ShieldCheck, Baby, ArrowLeft, LogIn, UserPlus, ChevronRight, User, Mail, BookOpen, Rocket, Building2, Upload, ScanLine, Phone, MapPin, Camera, Home, CheckCircle, AlertCircle } from 'lucide-react';
import { GoogleAuthBlock } from './GoogleAuthBlock';
import { CredentialResponse } from '@react-oauth/google';

interface RoleSelectionProps {
  onSelectRole: (role: UserRole) => void;
  onLogin: (role: UserRole, schoolName: string, credentials?: any) => void;
  onSignupDetails: (details: any) => void;
  onRegisterSchool: (data: any) => void;
  onBackToHome?: () => void;
  faculty?: Teacher[];
  initialView?: 'HOME' | 'LOGIN';
  showLoginButton?: boolean;
}

export const RoleSelection: React.FC<RoleSelectionProps> = React.memo(({ onSelectRole, onLogin, onSignupDetails, onRegisterSchool, onBackToHome, faculty = [], initialView = 'HOME', showLoginButton = true }) => {
  const [view, setView] = useState<'HOME' | 'LOGIN' | 'SIGNUP_DETAILS' | 'REGISTER_SCHOOL' | 'FORGOT_PASSWORD'>(initialView as any);
  const [signupData, setSignupData] = useState({ name: '', email: '', mobileNumber: '', rollNumber: '', username: '', password: '', className: '', stream: '', inviteCode: '' });
  const [schoolData, setSchoolData] = useState({ schoolName: '', adminName: '', adminEmail: '', password: '', mobileNumber: '', motto: '', address: '', city: '', state: '', pincode: '', logoUrl: '' });
  const [loginRole, setLoginRole] = useState<UserRole | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  // [NEW] Handle Google Login
  const handleGoogleLogin = async (credentialResponse: CredentialResponse) => {
    if (!loginRole) {
      setAuthError('Please select a role first');
      return;
    }

    if (isGoogleLoading) return; // Prevent duplicate submissions

    setIsGoogleLoading(true);
    setAuthError(null);

    try {
      if (view === 'SIGNUP_DETAILS') {
        // Pre-fill signup form instead of logging in
        const { jwtDecode } = await import('jwt-decode');
        const decoded: any = jwtDecode(credentialResponse.credential!);

        // Generate a random secure-ish password for them
        const generatedPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

        setSignupData(prev => ({
          ...prev,
          name: decoded.name || prev.name,
          email: decoded.email || prev.email,
          google_id: decoded.sub, // Store Google ID for linking during signup
          password: generatedPassword, // Auto-fill password
          mobileNumber: decoded.phone_number || prev.mobileNumber, // Might be available in some cases
        }));

        // Success feedback
        console.log('[Google Auth] Form pre-filled from Google');
      } else {
        // Standard Login flow
        await onLogin(loginRole, "", {
          idToken: credentialResponse.credential,
          authProvider: 'google'
        });
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      setAuthError(err.message || 'Google authentication failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };



  if (view === 'HOME') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-12 relative">
        {onBackToHome && (
          <NeonButton variant="ghost" onClick={onBackToHome} className="absolute top-0 left-4 md:left-8">
            <Home className="w-4 h-4 mr-2" /> Homepage
          </NeonButton>
        )}
        <div className="text-center space-y-6"><h2 className="text-6xl md:text-8xl font-display font-bold text-white tracking-tighter">GYAN<span className="text-signal-orange">.AI</span></h2><p className="text-xl text-gray-400">AI-Powered. Gamified. Data-Driven.</p></div>
        <div className="flex flex-wrap justify-center gap-6 w-full max-w-4xl px-4">
          {showLoginButton && (
            <button onClick={() => setView('LOGIN')} className="group px-8 py-8 bg-white/5 border border-white/10 hover:border-neon-cyan/50 rounded-xl flex flex-col items-center gap-4 min-w-[200px]"><LogIn className="w-8 h-8 text-neon-cyan" /><span className="font-bold text-white">LOGIN</span></button>
          )}
          <button onClick={() => setView('SIGNUP_DETAILS')} className="group px-8 py-8 bg-white/5 border border-white/10 hover:border-signal-orange/50 rounded-xl flex flex-col items-center gap-4 min-w-[200px]"><UserPlus className="w-8 h-8 text-signal-orange" /><span className="font-bold text-white">JOIN SCHOOL</span></button>
          <button onClick={() => setView('REGISTER_SCHOOL')} className="group px-8 py-8 bg-gradient-to-br from-signal-orange/10 to-transparent border border-signal-orange/30 rounded-xl flex flex-col items-center gap-4 min-w-[200px]"><Building2 className="w-8 h-8 text-white" /><span className="font-bold text-white">CREATE SCHOOL</span></button>
        </div>
      </div>
    );
  }

  if (view === 'LOGIN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] w-full relative">
        <div className="absolute top-0 left-4 md:left-8 flex gap-2">
          {onBackToHome && (
            <NeonButton variant="ghost" onClick={onBackToHome}>
              <Home className="w-4 h-4 mr-2" /> Homepage
            </NeonButton>
          )}
        </div>
        <NeonButton variant="ghost" onClick={() => setView('HOME')} className="absolute top-0 right-4 md:right-8"><ArrowLeft className="w-4 h-4 mr-2" /> Back</NeonButton>
        <NeonCard className="w-full max-w-md p-8 space-y-8" glowColor="cyan">
          <h3 className="text-3xl font-bold text-white text-center">Login</h3>
          <div className="grid grid-cols-4 gap-2">
            {['STUDENT', 'TEACHER', 'PARENT', 'ADMIN'].map(r =>
              <button key={r} onClick={() => setLoginRole(r as UserRole)} className={`text-[10px] font-bold py-2 rounded border ${loginRole === r ? 'bg-neon-cyan text-black' : 'border-white/10 text-gray-400'}`}>{r}</button>
            )}
          </div>

          {loginRole === 'STUDENT' ? (
            <>
              <Input placeholder="Username, Mobile, or User ID" value={signupData.username} onChange={e => setSignupData({ ...signupData, username: e.target.value })} />
              <Input type="password" placeholder="Password" value={signupData.password} onChange={e => setSignupData({ ...signupData, password: e.target.value })} />
              <NeonButton onClick={() => onLogin(loginRole, "", { username: signupData.username, password: signupData.password })} className="w-full" glow>Login</NeonButton>

              {/* Google Login */}
              <GoogleAuthBlock
                onSuccess={handleGoogleLogin}
                onError={setAuthError}
                isLoading={isGoogleLoading}
                error={authError}
                role={loginRole}
              />
            </>
          ) : loginRole === 'TEACHER' ? (
            <>
              <Input placeholder="Email or Mobile Number" value={signupData.email} onChange={e => setSignupData({ ...signupData, email: e.target.value })} />
              <Input type="password" placeholder="Password" value={signupData.password} onChange={e => setSignupData({ ...signupData, password: e.target.value })} />
              <NeonButton
                onClick={() => onLogin(loginRole, "", { email: signupData.email, password: signupData.password })}
                className="w-full"
                glow
                disabled={!signupData.email || !signupData.password}
              >
                Login as Teacher
              </NeonButton>

              {/* Google Login */}
              <GoogleAuthBlock
                onSuccess={handleGoogleLogin}
                onError={setAuthError}
                isLoading={isGoogleLoading}
                error={authError}
                role={loginRole}
              />
            </>
          ) : loginRole === 'PARENT' ? (
            <>
              <p className="text-xs text-gray-400 mb-2">Use your child's credentials to login</p>
              <Input placeholder="Student Username or Mobile" value={signupData.username} onChange={e => setSignupData({ ...signupData, username: e.target.value })} />
              <Input type="password" placeholder="Student Password" value={signupData.password} onChange={e => setSignupData({ ...signupData, password: e.target.value })} />
              <NeonButton onClick={() => onLogin('PARENT', "", { username: signupData.username, password: signupData.password, asParent: true })} className="w-full" glow>Login as Parent</NeonButton>
            </>
          ) : (
            <>
              <Input placeholder="Admin Email" value={signupData.email} onChange={e => setSignupData({ ...signupData, email: e.target.value })} />
              <Input type="password" placeholder="Password" value={signupData.password} onChange={e => setSignupData({ ...signupData, password: e.target.value })} />
              <NeonButton onClick={() => onLogin(loginRole || 'ADMIN', "", { email: signupData.email, password: signupData.password })} className="w-full" glow>Authenticate</NeonButton>

              {/* Google Login */}
              <GoogleAuthBlock
                onSuccess={handleGoogleLogin}
                onError={setAuthError}
                isLoading={isGoogleLoading}
                error={authError}
                role={loginRole}
              />
            </>
          )}

          <button
            onClick={() => setView('FORGOT_PASSWORD')}
            className="mt-6 w-full text-center text-sm text-neon-cyan/80 hover:text-white underline decoration-dashed hover:decoration-solid transition-all"
          >
            Forgot Password?
          </button>
        </NeonCard>
      </div>
    );
  }

  if (view === 'FORGOT_PASSWORD') {
    return <ForgotPassword onBack={() => { setView('LOGIN'); }} initialRole={loginRole || 'STUDENT'} />;
  }

  if (view === 'REGISTER_SCHOOL') {
    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSchoolData(prev => ({ ...prev, logoUrl: reader.result as string }));
        };
        reader.readAsDataURL(file);
      }
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] w-full relative py-8">
        <div className="absolute top-0 left-4 md:left-8 flex gap-2">
          {onBackToHome && (
            <NeonButton variant="ghost" onClick={onBackToHome}>
              <Home className="w-4 h-4 mr-2" /> Homepage
            </NeonButton>
          )}
        </div>
        <NeonButton variant="ghost" onClick={() => setView('HOME')} className="absolute top-0 right-4 md:right-8">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </NeonButton>

        <NeonCard className="w-full max-w-2xl p-8 space-y-6" glowColor="orange">
          <div className="text-center mb-6">
            <h3 className="text-3xl font-bold text-white">Create Your School</h3>
            <p className="text-gray-400 text-sm mt-2">Fill in the details to set up your school on Gyan.AI</p>
          </div>

          {/* Logo Upload */}
          <div className="flex flex-col items-center gap-4">
            <div
              onClick={() => logoInputRef.current?.click()}
              className="w-24 h-24 rounded-xl bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-neon-purple/50 transition-all overflow-hidden"
            >
              {schoolData.logoUrl ? (
                <img src={schoolData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <Camera className="w-8 h-8 text-gray-500 mx-auto mb-1" />
                  <span className="text-xs text-gray-500">Add Logo</span>
                </div>
              )}
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>

          {/* School Name & Motto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="School Name *"
              value={schoolData.schoolName}
              onChange={e => setSchoolData({ ...schoolData, schoolName: e.target.value })}
            />
            <Input
              placeholder="School Motto / Tagline"
              value={schoolData.motto}
              onChange={e => setSchoolData({ ...schoolData, motto: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Create Admin Password *"
              type="password"
              value={schoolData.password}
              onChange={e => setSchoolData({ ...schoolData, password: e.target.value })}
            />
            <Input
              placeholder="Contact Number"
              value={schoolData.mobileNumber}
              onChange={e => setSchoolData({ ...schoolData, mobileNumber: e.target.value })}
            />
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Admin Email *"
              type="email"
              value={schoolData.adminEmail}
              onChange={e => setSchoolData({ ...schoolData, adminEmail: e.target.value })}
            />
            <Input
              placeholder="Contact Number"
              value={schoolData.mobileNumber}
              onChange={e => setSchoolData({ ...schoolData, mobileNumber: e.target.value })}
            />
          </div>

          {/* Address */}
          <Input
            placeholder="Full Address"
            value={schoolData.address}
            onChange={e => setSchoolData({ ...schoolData, address: e.target.value })}
          />

          {/* City, State, Pincode */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="City"
              value={schoolData.city}
              onChange={e => setSchoolData({ ...schoolData, city: e.target.value })}
            />
            <Input
              placeholder="State"
              value={schoolData.state}
              onChange={e => setSchoolData({ ...schoolData, state: e.target.value })}
            />
            <Input
              placeholder="Pincode"
              value={schoolData.pincode}
              onChange={e => setSchoolData({ ...schoolData, pincode: e.target.value })}
            />
          </div>

          <NeonButton
            onClick={() => {
              if (!schoolData.schoolName) return alert("Please enter school name");
              if (!schoolData.adminEmail) return alert("Please enter admin email");
              if (!schoolData.password) return alert("Please create an admin password");
              onRegisterSchool(schoolData);
            }}
            className="w-full"
            glow
          >
            <Rocket className="w-4 h-4 mr-2" />
            Create School & Generate Invite Code
          </NeonButton>

          {/* Divider */}
          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-500 font-medium tracking-widest uppercase">or quick setup with</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Google Pre-fill for school registration */}
          <GoogleAuthBlock
            onSuccess={async (credentialResponse) => {
              try {
                const { jwtDecode } = await import('jwt-decode');
                const decoded: any = jwtDecode(credentialResponse.credential!);
                setSchoolData(prev => ({
                  ...prev,
                  adminEmail: decoded.email || prev.adminEmail,
                  adminName: decoded.name || prev.adminName,
                }));
              } catch (e) {
                console.error('Google prefill error:', e);
              }
            }}
            onError={setAuthError}
            isLoading={isGoogleLoading}
            error={authError}
            role={'ADMIN' as any}
          />
        </NeonCard>
      </div>
    );
  }

  if (view === 'SIGNUP_DETAILS') {
    if (!loginRole) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8 w-full relative">
          <div className="absolute top-0 left-4 md:left-8 flex gap-2">
            {onBackToHome && (
              <NeonButton variant="ghost" onClick={onBackToHome}>
                <Home className="w-4 h-4 mr-2" /> Homepage
              </NeonButton>
            )}
          </div>
          <NeonButton variant="ghost" onClick={() => setView('HOME')} className="absolute top-0 right-4 md:right-8"><ArrowLeft className="w-4 h-4 mr-2" /> Back</NeonButton>
          <h2 className="text-4xl font-bold text-white">I am a...</h2>
          <div className="grid grid-cols-2 gap-6 w-full max-w-2xl px-4">
            <button onClick={() => setLoginRole('TEACHER')} className="group px-8 py-12 bg-white/5 border border-white/10 hover:border-neon-cyan/50 rounded-xl flex flex-col items-center gap-4 hover:bg-white/10 transition-all">
              <Users className="w-12 h-12 text-neon-cyan" />
              <span className="font-bold text-white text-xl">TEACHER</span>
            </button>
            <button onClick={() => setLoginRole('STUDENT')} className="group px-8 py-12 bg-white/5 border border-white/10 hover:border-signal-orange/50 rounded-xl flex flex-col items-center gap-4 hover:bg-white/10 transition-all">
              <GraduationCap className="w-12 h-12 text-signal-orange" />
              <span className="font-bold text-white text-xl">STUDENT</span>
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] w-full relative">
        <NeonButton variant="ghost" onClick={() => setLoginRole(null as any)} className="absolute top-0 right-4 md:right-8"><ArrowLeft className="w-4 h-4 mr-2" /> Back</NeonButton>
        <NeonCard className="w-full max-w-md p-8 space-y-6" glowColor={loginRole === 'TEACHER' ? 'cyan' : 'orange'}>
          <h3 className="text-3xl font-bold text-white text-center">Join as {loginRole}</h3>

          <Input placeholder="Full Name" value={signupData.name} onChange={e => { setSignupData({ ...signupData, name: e.target.value }); }} />

          <div className="relative">
            <Input
              placeholder="Email Address"
              type="email"
              value={signupData.email}
              onChange={e => {
                setSignupData({ ...signupData, email: e.target.value });
              }}
            />
          </div>

          {loginRole === 'TEACHER' ? (
            <>
              <Input placeholder="Mobile Number" value={signupData.mobileNumber} onChange={e => setSignupData({ ...signupData, mobileNumber: e.target.value })} />
              <Input placeholder="Subject Specialization" value={signupData.stream} onChange={e => setSignupData({ ...signupData, stream: e.target.value })} />
              <Input type="password" placeholder="Create Password" value={signupData.password} onChange={e => setSignupData({ ...signupData, password: e.target.value })} />

              <div className="py-2">
                <GoogleAuthBlock
                  onSuccess={handleGoogleLogin}
                  onError={setAuthError}
                  isLoading={isGoogleLoading}
                  error={authError}
                  role={loginRole}
                />
              </div>
            </>
          ) : (
            <>
              <Input placeholder="Mobile Number" value={signupData.mobileNumber} onChange={e => setSignupData({ ...signupData, mobileNumber: e.target.value })} />
              <Input placeholder="Roll Number" value={signupData.rollNumber} onChange={e => setSignupData({ ...signupData, rollNumber: e.target.value })} />
              <Input type="password" placeholder="Create Password" value={signupData.password} onChange={e => setSignupData({ ...signupData, password: e.target.value })} />
              <select className="w-full bg-black/40 border border-white/10 rounded px-4 py-3 text-white focus:border-neon-purple focus:outline-none" value={signupData.className} onChange={e => setSignupData({ ...signupData, className: e.target.value })}>
                <option value="">Select Grade...</option>
                {[...Array(12)].map((_, i) => <option key={i} value={`Grade ${i + 1}`}>Grade {i + 1}</option>)}
              </select>

              <div className="py-2">
                <GoogleAuthBlock
                  onSuccess={handleGoogleLogin}
                  onError={setAuthError}
                  isLoading={isGoogleLoading}
                  error={authError}
                  role={loginRole}
                />
              </div>
            </>
          )}

          <div className="relative">
            <ScanLine className="absolute left-3 top-3.5 w-5 h-5 text-signal-orange/50" />
            <Input
              placeholder="School Invite Code"
              value={signupData.inviteCode}
              onChange={e => setSignupData({ ...signupData, inviteCode: e.target.value.toUpperCase() })}
              className="pl-10 uppercase font-bold tracking-widest"
            />
          </div>

          <NeonButton
            onClick={() => {
              if (!signupData.name) return alert("Please enter your name");
              if (!signupData.email) return alert("Please enter your email");
              if (loginRole === 'TEACHER' && !signupData.password) return alert("Please create a password");
              if (loginRole === 'STUDENT' && !signupData.className) return alert("Please select your grade");
              if (loginRole === 'STUDENT' && !signupData.rollNumber) return alert("Please enter your roll number");
              if (loginRole === 'STUDENT' && !signupData.password) return alert("Please create a password");
              if (!signupData.mobileNumber) return alert("Please enter your mobile number");
              if (!signupData.inviteCode) return alert("Please enter the School Invite Code provided by your admin");

              // Proceed with signup directly
              const verifiedData = {
                ...signupData,
                emailVerified: true,
                phoneVerified: true
              };
              onSignupDetails(verifiedData);
              onSelectRole(loginRole!);
            }}
            className="w-full"
            glow
          >
            Create {loginRole} Account
          </NeonButton>
        </NeonCard>
      </div>
    );
  }

  return null;
});