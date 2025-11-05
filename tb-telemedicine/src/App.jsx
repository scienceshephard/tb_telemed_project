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
// import PatientVideoChat from './pages/patient/VideoChatWrapper'
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

const App = () => {
  const [token, setToken] = useState(null);

  // Persist token in sessionStorage
  useEffect(() => {
    if (token) {
      sessionStorage.setItem("token", JSON.stringify(token));
    }
  }, [token]);

  // Restore token on reload using Supabase session and subscribe to auth changes
  useEffect(() => {
    let subscription = null;
    async function restore() {
      try {
        const sessionResp = await supabase.auth.getSession();
        const session = sessionResp?.data?.session;
        const userResp = await supabase.auth.getUser();
        const user = userResp?.data?.user;

        if (user) {
          setToken({ user, session });
        } else {
          const storedToken = sessionStorage.getItem("token");
          if (storedToken) setToken(JSON.parse(storedToken));
        }

        const sub = supabase.auth.onAuthStateChange((_event, nextSession) => {
          if (nextSession?.user) setToken({ user: nextSession.user, session: nextSession });
          else setToken(null);
        });

        subscription = sub?.data?.subscription || sub;
      } catch (err) {
        console.warn('Error restoring session:', err);
      }
    }

    restore();

    return () => {
      try {
        subscription?.unsubscribe?.();
      } catch (e) {
        // ignore
      }
    };
  }, []);

  return (
    <Routes>
      {/* ✅ Pass setToken here */}
      <Route path="/" element={<Landing/>} />
      <Route path="/login" element={<Login setToken={setToken} token = {token} />} />
      <Route path="/SignUpPatient" element={<SignUpPatient />} />
      <Route path="/SignUpDoctor" element={<SignUpDoctor />} />

      <Route path="/patient" element={<PatientDashboard />}>
        <Route path="home" element={<PatientHome token={token} />} />
        <Route path="patientprofile" element={<PatientProfile token={token} />} />
        <Route path="symptomchecklist" element={<PatientSymptomChecklist/>}/>
        <Route path="labresults" element={<PatientLabResults token={token}/>}/>
        <Route path="erecord" element={<PatientERecord token={token}/>}/>
  <Route path="teleconsultation" element={<PatientTeleconsultation token={token}/>}/>
  <Route path="teleconsultation/:appointmentId/room" element={<VideoChatWrapper token={token} />} />
  <Route path="patientbookappointment" element={<PatientBookAppointment token={token}/>}/>
      </Route>

      <Route path="/doctor" element={<DoctorDashboard />}>
        <Route path="home" element={<DoctorHome token={token} />} />
        <Route path="profile" element={< DoctorProfile token={token} />} />
        <Route path="appointments" element={< Appointments/>} />
        <Route path="consultations" element={< Consultations />} />
  <Route path="consultations/room/:appointmentId" element={<DoctorVideoChatWrapper token={token} />} />
        <Route path="patientlist" element={< PatientList />} />
          {/* ✅ New doctor routes for patient detail views */}
        <Route path="patient/:id/patientprofile" element={<PatientProfile token={token} />} /> 
        <Route path="patient/:id/labresults" element={ <PatientLabResults token={token}/>}/> 
        <Route path="patient/:id/erecord" element={ <PatientERecord token={token}/>}/> 
        
      </Route>
    </Routes>
  );
};

export default App;