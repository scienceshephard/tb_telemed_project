import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { Login, SignUpPatient, SignUpDoctor, PatientDashboard, DoctorDashboard, Landing } from "./pages";
import {
  Home as PatientHome, 
  Profile as PatientProfile,
  SymptomChecklist as PatientSymptomChecklist,
  LabResults as PatientLabResults,
  Teleconsultation as PatientTeleconsultation,
  ERecord as PatientERecord,
  BookAppointment as PatientBookAppointment
 } from "./pages/patient";

import {
    Appointments as Appointments,
    Home as DoctorHome,
    Profile as DoctorProfile,
    PatientList as PatientList,
    Consultations as Consultations
   } from "./pages/doctor";
import { supabase } from './client';
import VideoChatWrapper from "./pages/patient/VideoChatWrapper";
import DoctorVideoChatWrapper from "./pages/doctor/DoctorVideoChatWrapper";
import ChatPage from "./pages/ChatPage";
import ProtectedRoute from "./components/ProtectedRoute";

const App = () => {
  const [token, setToken] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // IMPORTANT: Use sessionStorage key specific to THIS tab/window
  // This prevents different browser tabs from interfering with each other
  const SESSION_STORAGE_KEY = "tb_telemedicine_token_" + (typeof window !== 'undefined' ? sessionStorage.getItem('__session_id__') || 'default' : 'default');

  // Initialize sessionStorage ID on first load (unique per tab)
  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('__session_id__')) {
      const sessionId = Math.random().toString(36).substring(7);
      sessionStorage.setItem('__session_id__', sessionId);
    }
  }, []);

  // Persist token in sessionStorage (per tab)
  useEffect(() => {
    if (token) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(token));
      console.log('💾 Token saved to sessionStorage for this tab');
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      console.log('🗑️ Token removed from sessionStorage for this tab');
    }
  }, [token, SESSION_STORAGE_KEY]);

  // Restore token on reload - ONLY from THIS tab's sessionStorage, NOT from global Supabase auth
  useEffect(() => {
    async function restore() {
      try {
        console.log('🔍 Restoring session for this tab...');
        
        // IMPORTANT: First check THIS tab's sessionStorage (primary source)
        const storedToken = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (storedToken) {
          try {
            const parsed = JSON.parse(storedToken);
            setToken(parsed);
            console.log('✅ Token restored from THIS tab\'s sessionStorage');
            setIsLoadingAuth(false);
            return;
          } catch (e) {
            console.warn('⚠️ Failed to parse stored token:', e);
          }
        }

        // FALLBACK: If no token in THIS tab's sessionStorage, try current Supabase session
        // But DO NOT subscribe to auth changes (that causes cross-tab interference)
        const sessionResp = await supabase.auth.getSession();
        const session = sessionResp?.data?.session;

        if (session?.user) {
          setToken({ user: session.user, session });
          console.log('✅ Token restored from Supabase session');
        } else {
          console.log('ℹ️ No session found - user is logged out');
          setToken(null);
        }
      } catch (err) {
        console.warn('⚠️ Error restoring session:', err);
      } finally {
        setIsLoadingAuth(false);
      }
    }

    restore();

    // NOTE: Deliberately NOT subscribing to onAuthStateChange here
    // because it causes different browser tabs to interfere with each other
    // Instead, each tab manages its own session independently via setToken in Login.jsx
  }, [SESSION_STORAGE_KEY]);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing/>} />
      <Route path="/login" element={<Login setToken={setToken} token={token} />} />
      <Route path="/SignUpPatient" element={<SignUpPatient />} />
      <Route path="/SignUpDoctor" element={<SignUpDoctor />} />

      {/* Patient Protected Routes */}
      <Route 
        path="/patient" 
        element={
          <ProtectedRoute token={token} requiredRole="patient" isLoading={isLoadingAuth}>
            <PatientDashboard />
          </ProtectedRoute>
        }
      >
        <Route path="home" element={<PatientHome token={token} />} />
        <Route path="patientprofile" element={<PatientProfile token={token} />} />
        <Route path="symptomchecklist" element={<PatientSymptomChecklist/>}/>
        <Route path="labresults" element={<PatientLabResults token={token}/>}/>
        <Route path="erecord" element={<PatientERecord token={token}/>}/>
        <Route path="teleconsultation" element={<PatientTeleconsultation token={token}/>}/>
        <Route path="teleconsultation/:appointmentId/room" element={<VideoChatWrapper token={token} />} />
        <Route path="chat/:appointmentId" element={<ChatPage token={token} />} />
        <Route path="patientbookappointment" element={<PatientBookAppointment token={token}/>}/>
      </Route>

      {/* Doctor Protected Routes */}
      <Route 
        path="/doctor" 
        element={
          <ProtectedRoute token={token} requiredRole="doctor" isLoading={isLoadingAuth}>
            <DoctorDashboard />
          </ProtectedRoute>
        }
      >
        <Route path="home" element={<DoctorHome token={token} />} />
        <Route path="profile" element={<DoctorProfile token={token} />} />
        <Route path="appointments" element={<Appointments/>} />
        <Route path="consultations" element={<Consultations />} />
        <Route path="chat/:appointmentId" element={<ChatPage token={token} />} />
        <Route path="consultations/room/:appointmentId" element={<DoctorVideoChatWrapper token={token} />} />
        <Route path="patientlist" element={<PatientList />} />
        {/* Doctor viewing patient details */}
        <Route path="patient/:id/patientprofile" element={<PatientProfile token={token} />} /> 
        <Route path="patient/:id/labresults" element={<PatientLabResults token={token}/>}/> 
        <Route path="patient/:id/erecord" element={<PatientERecord token={token}/>}/> 
      </Route>
    </Routes>
  );
};

export default App;