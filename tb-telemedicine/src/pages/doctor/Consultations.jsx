
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../client';

const Consultations = () => {
  const [approvedAppointments, setApprovedAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchApprovedAppointments();
  }, []);

  async function fetchApprovedAppointments() {
    try {
      setLoading(true);
      console.log('📋 Fetching approved appointments for consultations...');
      
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData?.user?.id) {
        console.error('No user ID found');
        setLoading(false);
        return;
      }

      console.log('👨‍⚕️ Doctor ID:', userData.user.id);

      const { data, error } = await supabase
        .from('appointments')
        .select('id, appointment_date, appointment_time, status, patient_id')
        .eq('doctor_id', userData.user.id)
        .eq('status', 'approved')
        .order('appointment_date', { ascending: true });
          
      if (error) {
        console.error('❌ Error fetching approved appointments:', error);
        setLoading(false);
        return;
      }

      console.log('✅ Approved appointments:', data);
      
      // Fetch patient names
      const patientIds = [...new Set(data.map(a => a.patient_id).filter(Boolean))];
      let patientsMap = {};

      if (patientIds.length > 0) {
        // Try patient_profiles first
        const { data: patientProfiles } = await supabase
          .from('patient_profiles')
          .select('user_id, full_name')
          .in('user_id', patientIds);

        if (patientProfiles) {
          patientProfiles.forEach(p => {
            if (p.user_id && p.full_name) {
              patientsMap[p.user_id] = p.full_name;
            }
          });
        }

        // Fallback to profiles table for missing names
        const missingIds = patientIds.filter(id => !patientsMap[id]);
        if (missingIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', missingIds);

          if (profiles) {
            profiles.forEach(p => {
              if (p.id && p.full_name && !patientsMap[p.id]) {
                patientsMap[p.id] = p.full_name;
              }
            });
          }
        }
      }

      // Process appointments with patient names
      const processedAppointments = data.map(appointment => ({
        ...appointment,
        patient: {
          full_name: patientsMap[appointment.patient_id] || `Patient (ID: ${appointment.patient_id?.substring(0, 8)}...)`
        }
      }));

      console.log('✨ Processed appointments:', processedAppointments);
      setApprovedAppointments(processedAppointments);
      
    } catch (err) {
      console.error('❌ Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Format date for display
  function formatAppointmentDate(appointment) {
    try {
      let dateObj;
      if (typeof appointment.appointment_date === 'string') {
        if (appointment.appointment_time) {
          dateObj = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
        } else {
          dateObj = new Date(appointment.appointment_date);
        }
      } else {
        dateObj = appointment.appointment_date;
      }
      
      return !isNaN(dateObj.getTime()) ? dateObj.toLocaleString() : 'Date not set';
    } catch (e) {
      console.warn('Error formatting date:', e);
      return 'Invalid date';
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Consultations</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-gray-200 rounded"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Approved Consultations</h1>
      
      {approvedAppointments.length === 0 ? (
        <div className="p-8 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <div className="text-blue-600 text-6xl mb-4">🎥</div>
          <h3 className="text-lg font-semibold text-blue-800 mb-2">No Approved Consultations</h3>
          <p className="text-blue-600">
            When you approve appointments from the Appointments page, they will appear here for video consultations.
          </p>
          <button
            onClick={() => navigate('/doctor/appointments')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Go to Appointments
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            You have {approvedAppointments.length} approved consultation{approvedAppointments.length !== 1 ? 's' : ''} ready for video calls.
          </p>
          
          {approvedAppointments.map(appointment => (
            <div key={appointment.id} className="p-6 border rounded-lg bg-white shadow-md">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Patient: {appointment.patient.full_name}
                  </h3>
                  <p className="text-gray-600 mt-1">
                    📅 {formatAppointmentDate(appointment)}
                  </p>
                </div>
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  APPROVED
                </span>
              </div>
              
              <div className="flex gap-3">
                {/* Chat Button */}
                <button
                  onClick={() => navigate(`/doctor/chat/${appointment.id}`)}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  💬 Chat with Patient
                </button>

                {/* Video Call Button */}
                <button
                  onClick={() => navigate(`/doctor/consultations/room/${appointment.id}`)}
                  className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  🎥 Join Video Call
                </button>
                
                {/* View Patient Button */}
                <button
                  onClick={() => navigate(`/doctor/patient/${appointment.patient_id}/patientprofile`)}
                  className="bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 font-medium transition-colors"
                >
                  👤 View Patient
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Consultations;