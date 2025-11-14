// ChatPage.jsx - Updated to pass current user name
// Copy to: src/pages/ChatPage.jsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../client';
import Chat from '../components/Chat';

export default function ChatPage({ token }) {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [otherUserInfo, setOtherUserInfo] = useState(null);
  const [currentUserInfo, setCurrentUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        console.log('🔍 Loading chat data...');

        // Get current user
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        const userId = userData.user.id;
        setCurrentUserId(userId);
        console.log('✅ Current user ID:', userId);

        // Get user role and name
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', userId)
          .single();

        if (profileError) throw profileError;
        
        const role = profileData.role;
        setUserRole(role);
        
        // Set current user info
        let currentName = profileData.full_name || 'You';
        
        // If patient, try to get name from patient_profiles
        if (role === 'patient') {
          const { data: patientProfile } = await supabase
            .from('patient_profiles')
            .select('full_name')
            .eq('user_id', userId)
            .maybeSingle();
          
          if (patientProfile?.full_name) {
            currentName = patientProfile.full_name;
          }
        }
        
        setCurrentUserInfo({ id: userId, name: currentName });
        console.log('✅ Current user:', currentName, '(', role, ')');

        // Get appointment
        const { data: appointmentData, error: appointmentError } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', appointmentId)
          .single();

        if (appointmentError) throw appointmentError;
        
        setAppointment(appointmentData);

        // Check authorization
        const isPatient = userId === appointmentData.patient_id;
        const isDoctor = userId === appointmentData.doctor_id;
        
        if (isPatient || isDoctor) {
          setAuthorized(true);

          // Get other user info
          const otherUserId = isPatient ? appointmentData.doctor_id : appointmentData.patient_id;

          if (isDoctor) {
            // Doctor viewing patient
            const { data: patientData } = await supabase
              .from('patient_profiles')
              .select('full_name')
              .eq('user_id', otherUserId)
              .maybeSingle();

            if (patientData?.full_name) {
              setOtherUserInfo({ id: otherUserId, name: patientData.full_name });
              console.log('✅ Patient:', patientData.full_name);
            } else {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', otherUserId)
                .maybeSingle();
              
              setOtherUserInfo({ 
                id: otherUserId, 
                name: profileData?.full_name || 'Patient' 
              });
            }
          } else {
            // Patient viewing doctor
            const { data: doctorData } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', otherUserId)
              .maybeSingle();

            setOtherUserInfo({ 
              id: otherUserId, 
              name: doctorData?.full_name || 'Doctor' 
            });
            console.log('✅ Doctor:', doctorData?.full_name);
          }
        }

      } catch (error) {
        console.error('❌ Error loading chat:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [appointmentId, token]);

  function handleBack() {
    if (userRole === 'doctor') {
      navigate('/doctor/appointments');
    } else {
      navigate('/patient/teleconsultation');
    }
  }

  function handleJoinVideoCall() {
    if (userRole === 'doctor') {
      navigate(`/doctor/consultations/room/${appointmentId}`);
    } else {
      navigate(`/patient/teleconsultation/${appointmentId}/room`);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!authorized || !appointment) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <div className="text-red-600 text-5xl mb-4 text-center">🚫</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2 text-center">
            Access Denied
          </h2>
          <p className="text-gray-600 text-center mb-4">
            You don't have permission to view this chat.
          </p>
          <button
            onClick={handleBack}
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="text-gray-600 hover:text-gray-900 flex items-center gap-2 font-medium"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Chat with {otherUserInfo?.name}
                </h1>
                <p className="text-sm text-gray-500">
                  Appointment on{' '}
                  {new Date(appointment.appointment_date).toLocaleDateString()}
                  {appointment.appointment_time && ` at ${appointment.appointment_time}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                appointment.status === 'approved' 
                  ? 'bg-green-100 text-green-800'
                  : appointment.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : appointment.status === 'completed'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {appointment.status.toUpperCase()}
              </span>
              
              {appointment.status === 'approved' && (
                <button
                  onClick={handleJoinVideoCall}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium"
                >
                  🎥 Join Video Call
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
          {currentUserId && otherUserInfo && currentUserInfo && (
            <Chat
              appointmentId={appointmentId}
              currentUserId={currentUserId}
              otherUserId={otherUserInfo.id}
              otherUserName={otherUserInfo.name}
              currentUserName={currentUserInfo.name}
            />
          )}
        </div>
      </div>
    </div>
  );
}