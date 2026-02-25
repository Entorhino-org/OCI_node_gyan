import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { api } from './services/api';
import { Layout } from './components/Layout';
import { RoleSelection } from './components/RoleSelection';
import { AppState, UserRole, SchoolProfile, Student, Teacher, Parent, Classroom, Announcement } from './types';
import { Home } from './components/Home';
import { NeonCard, NeonButton, Input } from './components/UIComponents';
import { SmoothScroll } from './components/SmoothScroll';
import { GRADE_SUBJECTS } from './constants';
import { useAppData } from './hooks/useAppData';
import { useAuth } from './hooks/useAuth';
import { GlobalNotice } from './components/GlobalNotice';
import { noticeService } from './services/noticeService';

// Lazy load components for performance

const TeacherDashboard = lazy(() => import('./components/TeacherDashboard').then(m => ({ default: m.TeacherDashboard })));
const ParentDashboard = lazy(() => import('./components/ParentDashboard').then(m => ({ default: m.ParentDashboard })));
const StudentDashboard = lazy(() => import('./components/StudentDashboard').then(m => ({ default: m.StudentDashboard })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const SchoolJoin = lazy(() => import('./components/SchoolJoin').then(m => ({ default: m.SchoolJoin })));
const ClassSelection = lazy(() => import('./components/ClassSelection').then(m => ({ default: m.ClassSelection })));
const DeveloperConsole = lazy(() => import('./components/DeveloperConsole').then(m => ({ default: m.DeveloperConsole })));
const AboutUs = lazy(() => import('./components/AboutUs').then(m => ({ default: m.AboutUs })));
const Team = lazy(() => import('./components/Team').then(m => ({ default: m.Team })));
const Contact = lazy(() => import('./components/Contact').then(m => ({ default: m.Contact })));


const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
    <div className="flex flex-col items-center">
      <div className="w-12 h-12 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-neon-cyan animate-pulse">GYAN AI initializing...</p>
    </div>
  </div>
);

const DevLogin: React.FC<{ onLogin: (success: boolean) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      await api.devLogin({ email, password });
      onLogin(true);
    } catch (e) {
      setError('Invalid Credentials');
    }
  };

  return (
    <div className="space-y-4">
      {error && <div className="p-3 bg-red-500/20 border border-red-500 rounded text-red-200 text-sm">{error}</div>}
      <div>
        <label className="block text-gray-400 text-sm mb-1">Email</label>
        <Input
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          placeholder="admin@example.com"
        />
      </div>
      <div>
        <label className="block text-gray-400 text-sm mb-1">Password</label>
        <Input
          type="password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      <NeonButton onClick={handleLogin} className="w-full mt-4" glow>
        Access Console
      </NeonButton>
    </div>
  );
};

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Modularized State Management
  const {
    schools, setSchools,
    globalStudents, setGlobalStudents,
    classrooms, setClassrooms,
    announcements, setAnnouncements,
    teachers,
    isLoading, error,
    needsMigration, refreshData
  } = useAppData();

  const [showMigration, setShowMigration] = useState(needsMigration);

  const {
    appState, setAppState,
    devAuthenticated, setDevAuthenticated,
    authMode, setAuthMode,
    tempSignupData, setTempSignupData
  } = useAuth({ schools, globalStudents, teachers });

  const handleMigration = async () => {
    try {
      const localSchools = JSON.parse(localStorage.getItem('GYAN_V2_SCHOOLS') || '[]');
      const localStudents = JSON.parse(localStorage.getItem('GYAN_V2_STUDENTS') || '[]');
      const localClassrooms = JSON.parse(localStorage.getItem('GYAN_V2_CLASSROOMS') || '[]');
      const localAnnouncements = JSON.parse(localStorage.getItem('GYAN_V2_ANNOUNCEMENTS') || '[]');

      await api.migrateData({
        schools: localSchools,
        students: localStudents,
        classrooms: localClassrooms,
        announcements: localAnnouncements
      });

      window.location.reload();
    } catch (e) {
      noticeService.error('Migration failed. Please check your connection and try again.');
    }
  };

  // Derive dashboard tab from URL path
  const dashboardTab = React.useMemo((): string => {
    const path = location.pathname;
    if (path.startsWith('/dashboard/')) {
      const tabSlug = path.split('/dashboard/')[1]?.split('/')[0]?.toUpperCase();
      // Map URL slugs to tab names
      const tabMap: Record<string, string> = {
        'LEARN': 'LEARN',
        'LEARN_AI': 'LEARN_AI',
        'ASSIGNMENTS': 'ASSIGNMENTS',
        'MINDMAP': 'MINDMAP',
        'PRACTICE': 'PRACTICE',
        'LEADERBOARD': 'LEADERBOARD',
        'REMEDIAL': 'REMEDIAL',
        'ATTENDANCE': 'ATTENDANCE',
        'ANNOUNCEMENTS': 'ANNOUNCEMENTS',
        'OPPORTUNITIES': 'OPPORTUNITIES',
        'HISTORY': 'HISTORY',
        'OVERVIEW': 'OVERVIEW',
        'CLASSES': 'CLASSES',
        'GRADEBOOK': 'GRADEBOOK',
        'RANKINGS': 'RANKINGS',
        'GAPS': 'GAPS',
        'REMEDIAL_CENTER': 'REMEDIAL_CENTER',
        'CONTENT_HUB': 'CONTENT_HUB',
        'RESOURCES': 'RESOURCES',
        'TEACHERS': 'TEACHERS',
        'STUDENTS': 'STUDENTS',
        'CHARTS': 'CHARTS',
        'HOME': 'HOME',
      };
      return tabMap[tabSlug] || 'HOME';
    }
    // Default tab based on role
    if (appState.userRole === 'STUDENT') return 'LEARN';
    return 'HOME';
  }, [location.pathname, appState.userRole]);

  // Navigate to dashboard tab
  const navigateToDashboardTab = React.useCallback((tab: string) => {
    const tabSlug = tab.toLowerCase();
    navigate(`/dashboard/${tabSlug}`);
  }, [navigate]);

  const handleRegisterSchool = React.useCallback(async (data: any) => {
    const uniqueCode = `${data.schoolName.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newSchool: SchoolProfile = {
      id: `SCH-${Date.now()}`,
      name: data.schoolName,
      adminEmail: data.adminEmail,
      password: data.password, // [FIX] Store admin password
      mobileNumber: data.mobileNumber,
      motto: data.motto,
      address: data.address,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      subscriptionStatus: 'TRIAL',
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      studentCount: 0,
      maxStudents: 100,
      plan: 'TRIAL',
      inviteCode: uniqueCode,
      logoUrl: data.logoUrl
    };
    try {
      await api.createSchool(newSchool);
      setSchools(prev => [...prev, newSchool]);
      const adminUser = {
        id: newSchool.id,
        schoolId: newSchool.id,
        name: 'School Administrator',
        email: newSchool.adminEmail,
        role: 'ADMIN' as const
      };
      setAppState(prev => ({ ...prev, userRole: 'ADMIN', schoolName: newSchool.name, schoolId: newSchool.id, schoolLogo: newSchool.logoUrl, currentUser: adminUser }));
      navigate('/dashboard');
      noticeService.success(`School created! Invite Code: ${uniqueCode} — Share this with teachers and students.`, 8000);
    } catch (e: any) {
      console.error(e);
      noticeService.handleApiError(e, 'Failed to register school. Please try again.');
    }
  }, [navigate, setAppState, setSchools]);

  const handleSyncUserToSchool = React.useCallback(async (schoolId: string) => {
    // [FIX] Guard against missing signup data (e.g. on refresh)
    if (!tempSignupData) {
      noticeService.warning('Session expired. Please start the signup process again.');
      navigate('/auth');
      return;
    }

    const targetSchool = schools.find(s => s.id === schoolId); if (!targetSchool) return;

    if (appState.userRole === 'STUDENT') {
      // Generate Username: Name_SchoolInitials_RollNo
      const schoolInitials = targetSchool.name.split(' ').map(w => w[0].toLowerCase()).join('');
      const generatedUsername = `${tempSignupData.name.replace(/\s+/g, '_')}_${schoolInitials}_${tempSignupData.rollNumber}`;

      const newStudent: Student = {
        id: `STU-${Date.now()}`,
        schoolId: targetSchool.id,
        name: tempSignupData.name,
        email: tempSignupData.email,
        mobileNumber: tempSignupData.mobileNumber,
        rollNumber: tempSignupData.rollNumber,
        username: generatedUsername,
        password: tempSignupData.password,
        classId: '', // To be selected next
        grade: tempSignupData.className,
        attendance: 100,
        avgScore: 0,
        status: 'Active',
        weakerSubjects: [],
        weaknessHistory: [],
        google_id: tempSignupData.google_id,
        auth_provider: tempSignupData.google_id ? 'google' : 'email'
      };

      try {
        await api.createStudent(newStudent);
        setGlobalStudents(prev => [...prev, newStudent]);
        noticeService.success(`Registration successful! Your username is: ${generatedUsername} — Please save this for login.`, 8000);
        setAppState(prev => ({ ...prev, schoolName: targetSchool.name, schoolId: targetSchool.id, schoolLogo: targetSchool.logoUrl, currentUser: newStudent }));
        navigate('/class-selection');
      } catch (e: any) {
        console.error("Join School Error:", e);
        // [FIX] Handle Duplicate User -> Attempt Login
        if (e.message?.includes('duplicate key') || e.message?.includes('violates unique constraint')) {
          console.log("Duplicate user detected. Attempting auto-login...");
          try {
            const loginRes = await api.login({
              username: tempSignupData.email || generatedUsername,
              password: tempSignupData.password,
              role: 'STUDENT'
            });

            console.log("Auto-login successful:", loginRes);
            setAppState(prev => ({
              ...prev,
              schoolName: targetSchool.name,
              schoolId: targetSchool.id,
              schoolLogo: targetSchool.logoUrl,
              currentUser: loginRes
            }));

            if (loginRes.classId) {
              navigate('/dashboard');
            } else {
              navigate('/class-selection');
            }
            return;
          } catch (loginErr) {
            console.error("Auto-login failed:", loginErr);
            noticeService.warning('An account with this information already exists. Please go back and login instead.');
          }
        } else {
          noticeService.handleApiError(e, 'Failed to join school. Please try again.');
        }
      }
    } else if (appState.userRole === 'TEACHER') {
      const newTeacher: Teacher = {
        id: `TCH-${Date.now()}`,
        schoolId: targetSchool.id,
        name: tempSignupData.name,
        email: tempSignupData.email,
        mobileNumber: tempSignupData.mobileNumber,
        subject: tempSignupData.stream,
        password: tempSignupData.password,
        joinedAt: new Date().toISOString(),
        assignedClasses: [],
        google_id: tempSignupData.google_id,
        auth_provider: tempSignupData.google_id ? 'google' : 'email'
      };
      try {
        await api.createTeacher(newTeacher);
        // Update local schools state to include new faculty
        setSchools(prev => prev.map(s => s.id === targetSchool.id ? { ...s, faculty: [...(s.faculty || []), newTeacher] } : s));
        setAppState(prev => ({ ...prev, schoolName: targetSchool.name, schoolId: targetSchool.id, schoolLogo: targetSchool.logoUrl, currentUser: newTeacher }));
        noticeService.success('Teacher account created successfully! Welcome to your school.');
        navigate('/dashboard/overview');
      } catch (e: any) {
        if (e.message?.includes('duplicate key') || e.message?.includes('violates unique constraint')) {
          noticeService.warning('A teacher account already exists with these credentials. Please login instead.');
        } else {
          noticeService.handleApiError(e, 'Failed to join school as teacher. Please try again.');
        }
      }
    }
  }, [tempSignupData, schools, appState.userRole, navigate, setAppState, setGlobalStudents, setSchools]);

  const handleCreateClassroom = React.useCallback(async (data: any) => {
    const teacher = appState.currentUser as Teacher;
    // For Admin, use a generic ID if teacher.id is missing (though handleLogin will now set it)
    const creatorId = teacher?.id || 'ADMIN';

    // Get primary subject if subjects provided, otherwise default to grade subjects
    const defaultSubjects = GRADE_SUBJECTS[data.name] || ['General'];
    const primarySubject = data.subjects
      ? data.subjects.split(',')[0].trim()
      : (defaultSubjects[0] || 'General');

    // [UPDATED] Naming Convention: "Grade 10 - Mathematics"
    // Section is stored separately in `section` field.
    // This allows grouping all sections of "Grade 10 - Mathematics" together.
    const className = `${data.name} - ${primarySubject}`;

    // Check for duplicate in current school's classrooms (Same Name + Same Section)
    const schoolClassrooms = classrooms.filter(c => c.schoolId === appState.schoolId);
    const duplicate = schoolClassrooms.find(
      c => c.name.toLowerCase() === className.toLowerCase() && c.section.toLowerCase() === data.section.toLowerCase()
    );
    if (duplicate) {
      noticeService.warning(`Section "${data.section}" for "${className}" already exists.`);
      return;
    }

    const subjectList = data.subjects
      ? data.subjects.split(',').map((s: string) => s.trim()).filter(Boolean)
      : defaultSubjects;

    const newClass: Classroom = {
      id: `CLS-${Date.now()}`,
      schoolId: appState.schoolId!,
      teacherId: creatorId,
      name: className, // "Grade 10 - Physics"
      subject: primarySubject, // [NEW] Explicit subject
      section: data.section,
      motto: data.motto,
      inviteCode: `${primarySubject.substring(0, 3).toUpperCase()}-${data.section}-${Math.floor(Math.random() * 9999)}`,
      studentIds: [],
      subjects: subjectList.map((sub: string) => ({ id: `SUB-${Date.now()}-${Math.random()}`, name: sub })),
      status: 'ACTIVE'
    };
    try {
      await api.createClassroom(newClass);
      setClassrooms(prev => [...prev, newClass]);
      noticeService.success(`${className} created successfully!`);
    } catch (e) {
      console.error(e);
      noticeService.handleApiError(e, 'Failed to create classroom. Please try again.');
    }
  }, [appState.currentUser, appState.schoolId, classrooms, setClassrooms]);

  // Archive class (soft delete)
  const handleArchiveClass = React.useCallback(async (classId: string) => {
    try {
      await api.updateClassroom(classId, { status: 'ARCHIVED', archivedAt: new Date().toISOString() });
      setClassrooms(prev => prev.map(c =>
        c.id === classId ? { ...c, status: 'ARCHIVED' as const, archivedAt: new Date().toISOString() } : c
      ));
      noticeService.warning('Section archived. It will be permanently deleted after 7 days if not restored.');
    } catch (e) {
      noticeService.handleApiError(e, 'Failed to archive class.');
    }
  }, [setClassrooms]);

  // Restore archived class
  const handleRestoreClass = React.useCallback(async (classId: string) => {
    try {
      if (appState.userRole !== 'ADMIN') return;

      await api.updateClassroom(classId, { status: 'ACTIVE', archivedAt: undefined });

      setClassrooms(prev => prev.map(c => c.id === classId ? { ...c, status: 'ACTIVE' as const, archivedAt: undefined } : c));
      noticeService.success('Section restored successfully!');
    } catch (error) {
      console.error('Failed to restore class:', error);
      noticeService.handleApiError(error, 'Failed to restore section.');
    }
  }, [appState.userRole, setClassrooms]);

  const handleRemoveStudentFromClass = React.useCallback(async (studentId: string, classId: string) => {
    try {
      if (appState.userRole !== 'TEACHER' && appState.userRole !== 'ADMIN') return;

      const student = globalStudents.find(s => s.id === studentId);
      if (!student) return;

      const currentClassIds = student.classIds || (student.classId ? [student.classId] : []);
      const newClassIds = currentClassIds.filter(id => id !== classId);
      const newPrimaryClassId = newClassIds.length > 0 ? newClassIds[0] : undefined;

      const updatedStudent = { ...student, classId: newPrimaryClassId, classIds: newClassIds, sectionId: undefined };
      await api.updateStudent(updatedStudent);

      setGlobalStudents(prev => prev.map(s => s.id === studentId ? { ...updatedStudent } : s));
      // Also update currentUser if it's the same person
      if (appState.currentUser?.id === studentId) {
        setAppState(prev => prev ? { ...prev, currentUser: { ...prev.currentUser, ...updatedStudent } as Student } : prev);
      }
      // Also remove student from the classroom's studentIds list
      setClassrooms(prev => prev.map(c =>
        c.id === classId ? { ...c, studentIds: c.studentIds.filter(id => id !== studentId) } : c
      ));

      noticeService.success('Student removed from class successfully.');
    } catch (error) {
      console.error('Failed to remove student:', error);
      noticeService.handleApiError(error, 'Failed to remove student.');
    }
  }, [appState.userRole, appState.currentUser?.id, globalStudents, setAppState, setClassrooms, setGlobalStudents]);

  // Permanently delete class (for purge after 7 days or manual)
  const handlePermanentDeleteClass = React.useCallback(async (classId: string) => {
    try {
      await api.deleteClassroom(classId);
      setClassrooms(prev => prev.filter(c => c.id !== classId));
      // Unassign students
      const studentsInClass = globalStudents.filter(s => s.classId === classId);
      for (const s of studentsInClass) {
        await api.updateStudent({ ...s, classId: undefined });
      }
      setGlobalStudents(prev => prev.map(s => s.classId === classId ? { ...s, classId: undefined } : s));
    } catch (e) {
      noticeService.handleApiError(e, 'Failed to delete class.');
    }
  }, [globalStudents, setClassrooms, setGlobalStudents]);

  // Auto-purge expired archived classes (older than 7 days)
  useEffect(() => {
    const purgeExpiredArchives = async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const expiredClasses = classrooms.filter(c =>
        c.status === 'ARCHIVED' && c.archivedAt && new Date(c.archivedAt) < sevenDaysAgo
      );
      for (const expired of expiredClasses) {
        await handlePermanentDeleteClass(expired.id);
      }
    };
    if (classrooms.length > 0) {
      purgeExpiredArchives();
    }
  }, [classrooms, handlePermanentDeleteClass]);

  const handleRenameClass = async (classId: string, newSectionName: string) => {
    try {
      await api.updateClassroom(classId, { section: newSectionName });
      setClassrooms(prev => prev.map(c => c.id === classId ? { ...c, section: newSectionName } : c));
    } catch (e) {
      alert("Failed to rename section");
    }
  };

  const handleToggleClassLock = React.useCallback(async (classId: string, locked: boolean) => {
    const newStatus = locked ? 'LOCKED' : 'ACTIVE';
    try {
      await api.updateClassroom(classId, { status: newStatus });
      setClassrooms(prev => prev.map(c => c.id === classId ? { ...c, status: newStatus } : c));
    } catch (e) {
      console.error("Failed to toggle class lock:", e);
      noticeService.handleApiError(e, 'Failed to update class status.');
    }
  }, [setClassrooms]);

  const handleLockAllClasses = React.useCallback(async () => {
    try {
      await Promise.all(classrooms.map(c => api.updateClassroom(c.id, { status: 'LOCKED' })));
      setClassrooms(prev => prev.map(c => ({ ...c, status: 'LOCKED' })));
    } catch (e) {
      console.error("Failed to lock all classes:", e);
      noticeService.handleApiError(e, 'Failed to lock all classes.');
    }
  }, [classrooms, setClassrooms]);

  const handleUpdateTeacher = React.useCallback(async (teacherId: string, assignedClassIds: string[]) => {
    try {
      await api.updateTeacher(teacherId, { assignedClasses: assignedClassIds });
      // Update local state
      setSchools(prev => prev.map(s => ({
        ...s,
        faculty: s.faculty?.map(t => t.id === teacherId ? { ...t, assignedClasses: assignedClassIds } : t) || []
      })));
    } catch (e) {
      console.error(e);
      noticeService.handleApiError(e, 'Failed to update teacher assignments.');
      throw e;
    }
  }, [setSchools]);


  const handleJoinClass = async (studentId: string, inviteCode: string) => {
    const targetClass = classrooms.find(c => (c.inviteCode || '').trim().toUpperCase() === inviteCode.trim().toUpperCase());
    const student = globalStudents.find(s => s.id === studentId);

    if (targetClass && student) {
      try {
        const updatedStudentIds = [...targetClass.studentIds, studentId];
        await api.updateClassroom(targetClass.id, { studentIds: updatedStudentIds });

        // [NEW] Support multiple classes
        const currentClassIds = student.classIds || (student.classId ? [student.classId] : []);
        // Prevent duplicate join
        if (currentClassIds.includes(targetClass.id)) return true;

        const newClassIds = [...currentClassIds, targetClass.id];
        await api.updateStudent({ ...student, classId: targetClass.id, classIds: newClassIds });

        setGlobalStudents(prev => prev.map(s => s.id === studentId ? { ...s, classId: targetClass.id, classIds: newClassIds } : s));
        setClassrooms(prev => prev.map(c => c.id === targetClass.id ? { ...c, studentIds: updatedStudentIds } : c));
        return true;
      } catch (e: any) {
        noticeService.handleApiError(e, 'Failed to join class. Please try again.');
        return false;
      }
    }
    return false;
  };

  const handleClassSelected = async (classId: string) => {
    if (!appState.currentUser || appState.userRole !== 'STUDENT') return;

    try {
      console.log("Joining class:", classId);
      // 1. Update Student record
      const student = appState.currentUser as Student;
      const currentClassIds = student.classIds || (student.classId ? [student.classId] : []);

      if (!currentClassIds.includes(classId)) {
        const newClassIds = [...currentClassIds, classId];
        await api.updateStudent({ ...student, classId, classIds: newClassIds });
        console.log("Student updated with new class");

        // 3. Update local state
        const updatedUser = { ...student, classId, classIds: newClassIds };
        setGlobalStudents(prev => prev.map(s => s.id === updatedUser.id ? updatedUser : s));
        setAppState(prev => ({ ...prev, currentUser: updatedUser }));
        navigate('/dashboard');
      } else {
        // Already joined, just switch view
        navigate('/dashboard');
      }

      // 2. Update Classroom record (add student ID)
      const targetClass = classrooms.find(c => c.id === classId);
      if (targetClass) {
        const currentIds = targetClass.studentIds || [];
        if (!currentIds.includes(appState.currentUser.id)) {
          const updatedStudentIds = [...currentIds, appState.currentUser.id];
          await api.updateClassroom(classId, { studentIds: updatedStudentIds });
          setClassrooms(prev => prev.map(c => c.id === classId ? { ...c, studentIds: updatedStudentIds } : c));
        }
      }
      console.log("Classroom updated");

    } catch (e: any) {
      console.error("Join Error:", e);
      noticeService.handleApiError(e, 'Failed to join class. Please try again.');
    }
  };

  const handlePostAnnouncement = async (content: string, type: 'THOUGHT' | 'NOTICE', classId?: string, className?: string) => {
    const newAnnouncement: Announcement = {
      id: `ANN-${Date.now()}`,
      schoolId: appState.schoolId!,
      classId,
      className: className || (classId ? 'Class' : 'School-wide'),
      authorId: appState.currentUser?.id,
      authorName: appState.currentUser?.name || 'Admin',
      content,
      type,
      timestamp: new Date().toISOString()
    };
    try {
      await api.createAnnouncement(newAnnouncement);
      setAnnouncements(prev => [newAnnouncement, ...prev]);
      noticeService.success('Announcement posted successfully!');
    } catch (e) {
      noticeService.handleApiError(e, 'Failed to post announcement.');
    }
  };



  const handleLogin = React.useCallback(async (role: UserRole, schoolName: string, credentials?: any) => {
    if (!credentials) return;

    try {
      let user;

      // [NEW] Handle Google OAuth Login
      if (credentials.authProvider === 'google' && credentials.idToken) {
        console.log('[Auth] Handling Google login...');
        user = await api.googleLogin(credentials.idToken, role);
      } else {
        // Traditional password-based login
        console.log('[Auth] Handling password login...');
        const loginPayload = { ...credentials, role };
        user = await api.login(loginPayload);
      }

      const userSchoolId = user.schoolId || user.school?.id;
      const userSchool = schools.find(s => s.id === userSchoolId);

      // Decide next route based on Role
      let nextRoute = '/dashboard';
      if (role === 'STUDENT') {
        nextRoute = user.classId ? '/dashboard' : '/class-selection';
      } else if (role === 'PARENT') {
        nextRoute = '/dashboard';
      } else if (role === 'TEACHER') {
        nextRoute = '/dashboard/overview';
      } else if (role === 'ADMIN') {
        nextRoute = '/dashboard/overview';
      }

      console.log("[Auth] handleLogin success. User ID:", user.id);
      setAppState(prev => ({
        ...prev,
        userRole: role,
        schoolName: userSchool?.name || schoolName || "Nebula Academy",
        schoolId: userSchoolId,
        schoolLogo: userSchool?.logoUrl,
        currentUser: user
      }));
      navigate(nextRoute);
    } catch (e: any) {
      console.error("Login Failed:", e);
      noticeService.error(noticeService.mapApiError(e));
    }
  }, [navigate, schools, setAppState]);

  const getDisplayName = (student: Student) => {
    return globalStudents.filter(s => s.name === student.name && s.classId === student.classId).length > 1 ? `${student.name} (ID#${student.id.slice(-4)})` : student.name;
  };



  // Persist to backend
  const handleUpdateStudent = React.useCallback(async (updatedStudent: Student) => {
    // Update local state
    setGlobalStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));

    // Update current user if it matches
    if (appState.currentUser?.id === updatedStudent.id) {
      setAppState(prev => ({ ...prev, currentUser: updatedStudent }));
    }

    try {
      await api.updateStudent(updatedStudent);
    } catch (e) {
      console.error("Failed to update student:", e);
    }
  }, [appState.currentUser, setAppState, setGlobalStudents]);

  const handleJoinClasses = async (classIds: string[]) => {
    if (!appState.currentUser || appState.userRole !== 'STUDENT') return;
    try {
      const student = appState.currentUser as Student;
      const currentClassIds = student.classIds || (student.classId ? [student.classId] : []);

      // Filter out already joined classes
      const newIdsToJoin = classIds.filter(id => !currentClassIds.includes(id));
      console.log("Bulk Joining Classes - Input:", classIds);
      console.log("Current ClassIds:", currentClassIds);
      console.log("New IDs to Join:", newIdsToJoin);

      if (newIdsToJoin.length === 0) {
        navigate('/dashboard');
        return;
      }

      const newClassIds = [...currentClassIds, ...newIdsToJoin];
      const primaryClassId = newClassIds[0];

      // Update Student
      const updatedUser = { ...student, classId: primaryClassId, classIds: newClassIds };
      await api.updateStudent(updatedUser);

      // Update Classrooms (one by one or bulk if api supported, do one by one for now as it's safer for classroom integrity)
      // Note: This is still parallel but on different resources (classrooms), so less risk of race condition on the USER object.
      await Promise.all(newIdsToJoin.map(async (classId) => {
        const targetClass = classrooms.find(c => c.id === classId);
        if (targetClass && !targetClass.studentIds.includes(student.id)) {
          const updatedStudentIds = [...targetClass.studentIds, student.id];
          await api.updateClassroom(classId, { studentIds: updatedStudentIds });
          // Update local classroom state immediately to avoid lag
          setClassrooms(prev => prev.map(c => c.id === classId ? { ...c, studentIds: updatedStudentIds } : c));
        }
      }));

      setGlobalStudents(prev => prev.map(s => s.id === updatedUser.id ? updatedUser : s));
      setAppState(prev => ({ ...prev, currentUser: updatedUser }));
      navigate('/dashboard');

    } catch (e: any) {
      console.error("Bulk Join Error:", e);
      noticeService.handleApiError(e, 'Failed to join classes. Please try again.');
    }
  };


  /* State for controlling Dashboard Tabs from Sidebar - Moved to top */

  // Helper to get current view from URL
  const getCurrentView = () => {
    const path = location.pathname;
    if (path === '/') return 'HOME';
    if (path === '/about') return 'ABOUT';
    if (path === '/team') return 'TEAM';
    if (path === '/contact') return 'CONTACT';
    if (path === '/auth') return 'ROLE_SELECTION';
    if (path === '/join-school') return 'SCHOOL_JOIN';
    if (path === '/class-selection') return 'CLASS_SELECTION';
    if (path === '/dashboard') return 'DASHBOARD';
    if (path === '/developer') return 'DEV_CONSOLE';
    return 'HOME';
  };


  // These callbacks must be defined as hooks BEFORE the early returns
  const handleLayoutNavigate = React.useCallback((tab: string) => {
    if (tab === 'ABOUT') {
      navigate('/about');
    } else if (tab === 'TEAM') {
      navigate('/team');
    } else if (tab === 'CONTACT') {
      navigate('/contact');
    } else if (tab === 'ROLE_SELECTION') {
      setAuthMode('login');
      navigate('/auth');
    } else if (tab === 'DASHBOARD') {
      navigate('/dashboard');
    } else if (tab === 'HOME' && !appState.userRole) {
      navigate('/');
    } else {
      navigateToDashboardTab(tab);
    }
  }, [navigate, appState.userRole, navigateToDashboardTab, setAuthMode]);

  const handleLayoutUpdateUser = React.useCallback((updated: Student | Teacher | Parent) => {
    if (appState.userRole === 'STUDENT') {
      handleUpdateStudent(updated as Student);
    } else if (appState.userRole === 'TEACHER') {
      const updatedTeacher = updated as Teacher;
      setSchools(prev => prev.map(s => ({
        ...s,
        faculty: (s.faculty || []).map(f => f.id === updatedTeacher.id ? { ...f, ...updatedTeacher } : f)
      })));
      setAppState(prev => ({ ...prev, currentUser: updatedTeacher }));
    } else if (appState.userRole === 'PARENT') {
      setAppState(prev => ({ ...prev, currentUser: updated as Parent }));
    }
  }, [appState.userRole, handleUpdateStudent, setSchools, setAppState]);

  if (isLoading) return (
    <div style={{ backgroundColor: '#020617', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
      <div style={{ width: '40px', height: '40px', border: '4px solid #00f3ff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ marginTop: '20px', fontFamily: 'Outfit, sans-serif', letterSpacing: '0.1em' }}>INITIALIZING GYAN SYSTEM...</p>
    </div>
  );

  if (error) return (
    <div style={{ backgroundColor: '#020617', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ff5f1f', padding: '20px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>SYSTEM ERROR</h1>
      <div style={{ padding: '20px', backgroundColor: 'rgba(255,95,31,0.1)', border: '1px solid #ff5f1f', borderRadius: '8px', maxWidth: '500px' }}>
        <p>{error}</p>
      </div>
      <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#ff5f1f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        Retry Connection
      </button>
    </div>
  );

  return (
    <SmoothScroll>
      <GlobalNotice />
      <Layout
        logoUrl={appState.schoolLogo}
        userRole={appState.userRole}
        currentUser={appState.currentUser}
        onLogout={() => {
          api.logout(); // [NEW] Clear session
          setAppState(prev => ({ ...prev, userRole: null, currentUser: undefined }));
          navigate('/');
        }}
        /* Pass Tab Control to Layout */
        activeTab={dashboardTab}
        onNavigate={handleLayoutNavigate}
        onUpdateUser={handleLayoutUpdateUser}
        hideHeader={false}
      >
        <>
          {showMigration && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: '#f59e0b', color: 'black', padding: '10px', textAlign: 'center', zIndex: 9999 }}>
              <span>We found local data. Do you want to sync it to the server?</span>
              <button onClick={handleMigration} style={{ marginLeft: '10px', padding: '5px 10px', background: 'black', color: 'white', border: 'none', cursor: 'pointer' }}>Sync Now</button>
              <button onClick={() => setShowMigration(false)} style={{ marginLeft: '10px', padding: '5px 10px', background: 'transparent', border: '1px solid black', cursor: 'pointer' }}>Dismiss</button>
            </div>
          )}

          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={
                appState.currentUser ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Home
                    onGetStarted={() => { setAuthMode('signup'); navigate('/auth'); }}
                    onLogin={() => { setAuthMode('login'); navigate('/auth'); }}
                    onDashboard={() => navigate('/dashboard')}
                    isLoggedIn={!!appState.currentUser}
                    onDevConsole={() => navigate('/developer')}
                    onNavigate={(page) => {
                      if (page === 'ABOUT') navigate('/about');
                      else if (page === 'TEAM') navigate('/team');
                      else if (page === 'CONTACT') navigate('/contact');
                    }}
                  />
                )
              } />

              <Route path="/about" element={appState.currentUser ? <Navigate to="/dashboard" replace /> : <AboutUs onBack={() => navigate('/')} />} />
              <Route path="/team" element={appState.currentUser ? <Navigate to="/dashboard" replace /> : <Team onBack={() => navigate('/')} />} />
              <Route path="/contact" element={appState.currentUser ? <Navigate to="/dashboard" replace /> : <Contact onBack={() => navigate('/')} />} />

              <Route path="/auth" element={
                import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
                    <RoleSelection
                      onSelectRole={(r) => { setAppState(prev => ({ ...prev, userRole: r })); navigate('/join-school'); }}
                      onLogin={handleLogin}
                      onSignupDetails={setTempSignupData}
                      onRegisterSchool={handleRegisterSchool}
                      onBackToHome={() => navigate('/')}
                      faculty={schools[0]?.faculty}
                      initialView={authMode === 'login' ? 'LOGIN' : 'HOME'}
                      showLoginButton={authMode !== 'signup'}
                    />
                  </GoogleOAuthProvider>
                ) : (
                  <RoleSelection
                    onSelectRole={(r) => { setAppState(prev => ({ ...prev, userRole: r })); navigate('/join-school'); }}
                    onLogin={handleLogin}
                    onSignupDetails={setTempSignupData}
                    onRegisterSchool={handleRegisterSchool}
                    onBackToHome={() => navigate('/')}
                    faculty={schools[0]?.faculty}
                    initialView={authMode === 'login' ? 'LOGIN' : 'HOME'}
                    showLoginButton={authMode !== 'signup'}
                  />
                )
              } />

              <Route path="/join-school" element={
                <SchoolJoin
                  role={appState.userRole}
                  availableSchools={schools}
                  onJoinSchool={handleSyncUserToSchool}
                  onBack={() => navigate('/auth')}
                  tempStudentName={tempSignupData?.name}
                  prefilledCode={tempSignupData?.inviteCode}
                />
              } />

              <Route path="/class-selection" element={
                appState.currentUser && appState.userRole === 'STUDENT' ? (
                  <ClassSelection
                    studentName={appState.currentUser.name}
                    username={(appState.currentUser as Student).username}
                    schoolName={appState.schoolName || "your School"}
                    studentGrade={(appState.currentUser as Student).grade}
                    classrooms={classrooms.filter(c =>
                      c.schoolId === appState.schoolId && c.status !== 'ARCHIVED' && c.status !== 'LOCKED' &&
                      // [FIX] Smart Grade Matching (handles "9" vs "9th" vs "Grade 9")
                      (() => {
                        const student = appState.currentUser as Student;
                        if (!student.grade) return true;

                        const getGradeNum = (s: string) => (s || '').replace(/\D/g, '');
                        const studentGradeNum = getGradeNum(student.grade);
                        const classGradeNum = getGradeNum(c.name);

                        // If both have numbers, they MUST match (e.g. "9" == "9", "9" != "10")
                        if (studentGradeNum && classGradeNum) {
                          return studentGradeNum === classGradeNum;
                        }

                        // Fallback: substring match (e.g. "Physics" matches "Physics")
                        return c.name.toLowerCase().includes(student.grade.toLowerCase());
                      })() &&
                      !((appState.currentUser as Student).classIds?.includes(c.id) || (appState.currentUser as Student).classId === c.id)
                    )}
                    debugClassrooms={classrooms.filter(c => c.schoolId === appState.schoolId)}
                    onSelectClass={handleClassSelected}
                    onJoinClasses={handleJoinClasses}
                    onJoinByCode={async (code) => {
                      const trimmedCode = code.trim();
                      const success = await handleJoinClass(appState.currentUser!.id, trimmedCode);
                      if (success) {
                        const targetClass = classrooms.find(c => c.inviteCode === trimmedCode);
                        if (targetClass) handleClassSelected(targetClass.id);
                      } else {
                        alert(`Failed to join. Please check the code: "${trimmedCode}"`);
                      }
                    }}
                    onBack={() => navigate('/dashboard')}
                    currentUser={appState.currentUser}
                  />
                ) : (
                  <div className="min-h-screen flex items-center justify-center bg-black">
                    <p className="text-white">Please log in first.</p>
                  </div>
                )
              } />

              <Route path="/developer" element={
                devAuthenticated ? (
                  <DeveloperConsole
                    onBack={() => navigate('/')}
                  />
                ) : (
                  <div className="min-h-screen flex items-center justify-center bg-black p-4">
                    <div className="absolute top-4 left-4">
                      <NeonButton variant="ghost" onClick={() => navigate('/')}>Back</NeonButton>
                    </div>
                    <NeonCard className="w-full max-w-md p-8 border-neon-cyan/50">
                      <h2 className="text-2xl font-bold text-white mb-6 text-center">Developer Access</h2>
                      <DevLogin
                        onLogin={(success) => setDevAuthenticated(success)}
                      />
                    </NeonCard>
                  </div>
                )
              } />

              <Route path="/dashboard/*" element={
                appState.userRole === 'STUDENT' ? (
                  <StudentDashboard
                    student={appState.currentUser as Student}
                    classrooms={classrooms.filter(c => c.schoolId === appState.schoolId)}
                    announcements={announcements.filter(a => a.schoolId === appState.schoolId)}
                    schoolName={appState.schoolName!}
                    schoolProfile={schools.find(s => s.id === appState.schoolId)}
                    onUpdateStudent={handleUpdateStudent}
                    students={globalStudents.filter(s => s.schoolId === appState.schoolId)}
                    onJoinClassClick={() => navigate('/class-selection')}
                    activeTab={dashboardTab}
                    onTabChange={navigateToDashboardTab}
                  />
                ) : appState.userRole === 'TEACHER' ? (
                  <TeacherDashboard
                    schoolName={appState.schoolName!}
                    schoolProfile={schools.find(s => s.id === appState.schoolId)}
                    students={globalStudents.filter(s => s.schoolId === appState.schoolId)}
                    classrooms={classrooms.filter(c => c.schoolId === appState.schoolId)}
                    announcements={announcements.filter(a => a.schoolId === appState.schoolId)}
                    setStudents={setGlobalStudents}
                    onLogout={() => { setAppState(prev => ({ ...prev, userRole: null, currentUser: undefined })); navigate('/'); }}
                    userRole={appState.userRole}
                    currentUser={appState.currentUser}
                    onCreateClass={handleCreateClassroom}
                    onPostAnnouncement={handlePostAnnouncement}
                    getDisplayName={getDisplayName}
                    onRenameClass={handleRenameClass}
                    onUpdateTeacher={handleUpdateTeacher}
                    onKickStudent={handleRemoveStudentFromClass}
                    activeTab={dashboardTab}
                    onTabChange={navigateToDashboardTab}
                  />
                ) : appState.userRole === 'ADMIN' ? (
                  <AdminDashboard
                    schoolName={appState.schoolName!}
                    schoolProfile={schools.find(s => s.id === appState.schoolId)}
                    students={globalStudents.filter(s => s.schoolId === appState.schoolId)}
                    classrooms={classrooms.filter(c => c.schoolId === appState.schoolId)}
                    announcements={announcements.filter(a => a.schoolId === appState.schoolId)}
                    onLogout={() => { setAppState(prev => ({ ...prev, userRole: null, currentUser: undefined })); navigate('/'); }}
                    currentUser={appState.currentUser}
                    onUpdateTeacher={handleUpdateTeacher}
                    onPostAnnouncement={handlePostAnnouncement}
                    onCreateClass={handleCreateClassroom}
                    onToggleClassLock={handleToggleClassLock}
                    onLockAllClasses={handleLockAllClasses}
                    onArchiveClass={handleArchiveClass}
                    onRestoreClass={handleRestoreClass}
                    onUpdateStudent={handleUpdateStudent}
                    activeTab={dashboardTab}
                    onTabChange={navigateToDashboardTab}
                  />
                ) : appState.userRole === 'PARENT' ? (
                  <ParentDashboard
                    schoolName={appState.schoolName!}
                    onLogout={() => { setAppState(prev => ({ ...prev, userRole: null, currentUser: undefined })); navigate('/'); }}
                    currentUser={appState.currentUser}
                    students={globalStudents.filter(s => s.schoolId === appState.schoolId)}
                    classrooms={classrooms.filter(c => c.schoolId === appState.schoolId)}
                  />
                ) : null
              } />
            </Routes>
          </Suspense>
        </>
      </Layout>
    </SmoothScroll>
  );
};



// App wrapper that provides BrowserRouter context
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;