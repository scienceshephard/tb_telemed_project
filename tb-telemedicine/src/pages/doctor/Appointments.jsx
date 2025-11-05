import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../client';

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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

  async function downloadAndOpenFile(path) {
    try {
      const { data, error } = await supabase.storage.from('labresults').download(path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Error downloading file:', err);
      alert('Error downloading file: ' + err.message);
    }
  }

  async function updateAppointmentStatus(appointmentId, newStatus) {
    try {
      const sanitized = (typeof newStatus === 'string' ? newStatus.trim() : newStatus);

      const { data, error } = await supabase
        .from('appointments')
        .update({ status: sanitized })
        .eq('id', appointmentId)
        .select();

      if (error) {
        console.error('Error updating appointment status:', error);
        alert('Could not update status: ' + error.message);
        return;
      }

      const updatedRow = data && data.length > 0 ? data[0] : { id: appointmentId, status: sanitized };
      setAppointments((prev) => prev.map((a) => (a.id === appointmentId ? { ...a, status: updatedRow.status } : a)));

      alert('Appointment status updated successfully!');

      if (sanitized === 'approved') {
        navigate(`/doctor/consultations/room/${appointmentId}`);
      }
    } catch (err) {
      console.error('Unexpected error updating status:', err);
      alert('Unexpected error updating status: ' + err.message);
    }
  }

  useEffect(() => {
    async function fetchAppointments() {
      try {
        setLoading(true);
        setError(null);

        console.log('🔍 Fetching doctor appointments...');

        // Step 1: Get current doctor
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('❌ Auth error:', userError);
          setError('Authentication error: ' + userError.message);
          setLoading(false);
          return;
        }

        if (!userData?.user?.id) {
          console.error('❌ No user ID found');
          setError('No user ID found. Please log in again.');
          setLoading(false);
          return;
        }

        const doctorId = userData.user.id;
        console.log('✅ Doctor ID:', doctorId);

        // Step 2: Fetch ALL appointments for this doctor
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('appointments')
          .select('*')
          .eq('doctor_id', doctorId)
          .order('appointment_date', { ascending: false });
        
        console.log('📋 Raw appointments:', appointmentsData);
        
        if (appointmentsError) {
          console.error('❌ Error fetching appointments:', appointmentsError);
          setError('Error loading appointments: ' + appointmentsError.message);
          setLoading(false);
          return;
        }

        if (!appointmentsData || appointmentsData.length === 0) {
          console.log('ℹ️ No appointments found');
          setAppointments([]);
          setLoading(false);
          return;
        }

        console.log(`✅ Found ${appointmentsData.length} appointment(s)`);

        // Step 3: Get unique patient IDs
        const patientIds = [...new Set(appointmentsData.map(a => a.patient_id).filter(Boolean))];
        console.log('👥 Patient IDs:', patientIds);

        // Step 4: Fetch patient names (with fallback strategy)
        let patientsMap = {};

        if (patientIds.length > 0) {
          // Try patient_profiles first
          const { data: patientProfiles, error: ppError } = await supabase
            .from('patient_profiles')
            .select('user_id, full_name')
            .in('user_id', patientIds);

          console.log('📄 Patient profiles found:', patientProfiles);

          if (!ppError && patientProfiles && patientProfiles.length > 0) {
            patientProfiles.forEach(p => {
              if (p.user_id && p.full_name) {
                patientsMap[p.user_id] = p.full_name;
              }
            });
          }

          // Fallback to profiles table for any missing names
          const missingIds = patientIds.filter(id => !patientsMap[id]);
          if (missingIds.length > 0) {
            console.log('🔄 Trying profiles table for missing IDs:', missingIds);
            
            const { data: profiles, error: pError } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', missingIds);

            if (!pError && profiles && profiles.length > 0) {
              profiles.forEach(p => {
                if (p.id && p.full_name && !patientsMap[p.id]) {
                  patientsMap[p.id] = p.full_name;
                }
              });
            }
          }
        }

        console.log('👤 Final patients map:', patientsMap);

        // Step 5: Fetch lab results
        let labResultsMap = {};
        if (patientIds.length > 0) {
          const { data: labs, error: labsError } = await supabase
            .from('lab_results')
            .select('user_id, xray_path, sputum_path')
            .in('user_id', patientIds);

          if (!labsError && labs) {
            labResultsMap = labs.reduce((acc, r) => ({ ...acc, [r.user_id]: r }), {});
          }
        }

        // Step 6: Enrich appointments with patient info
        const enriched = appointmentsData.map((a) => {
          const patientName = patientsMap[a.patient_id];
          return {
            ...a,
            patient_name: patientName || `Patient (ID: ${a.patient_id?.substring(0, 8)}...)`,
            has_complete_profile: !!patientName,
            lab_results: labResultsMap[a.patient_id] || null,
          };
        });

        console.log('✨ Enriched appointments:', enriched);
        setAppointments(enriched);
      } catch (err) {
        console.error('❌ Unexpected error in fetchAppointments:', err);
        setError('Unexpected error: ' + err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAppointments();

    // Real-time subscription
    const subscription = supabase
      .channel('appointment-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
      }, (payload) => {
        console.log('🔔 Real-time update received:', payload);
        fetchAppointments();
      })
      .subscribe();

    return () => {
      console.log('Unsubscribing from real-time updates');
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Appointments</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Appointments</h1>
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-semibold">Error Loading Appointments</p>
          <p className="text-red-600 mt-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">Appointments</h1>
      
      {appointments.length === 0 ? (
        <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">No appointments found.</p>
          <p className="text-yellow-600 text-sm mt-2">
            When patients book appointments with you, they will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Showing {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
          </p>
          
          {appointments.map((appointment) => (
            <div key={appointment.id} className="p-4 border rounded-md bg-white shadow">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-lg">
                    <strong>Patient:</strong> {appointment.patient_name}
                  </p>
                  {!appointment.has_complete_profile && (
                    <p className="text-xs text-orange-600 mt-1">
                      ⚠️ Patient profile incomplete
                    </p>
                  )}
                </div>
                <button
                  onClick={() => navigate(`/doctor/patient/${appointment.patient_id}/patientprofile`)}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  View Profile
                </button>
              </div>
              
              <div className="space-y-1 text-sm">
                <p><strong>Date & Time:</strong> {formatAppointmentDate(appointment)}</p>
                {appointment.reason && (
                  <p><strong>Reason:</strong> {appointment.reason}</p>
                )}
                <p>
                  <strong>Status:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                    appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    appointment.status === 'approved' ? 'bg-green-100 text-green-800' :
                    appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    appointment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {appointment.status}
                  </span>
                </p>
              </div>

              {/* Lab results */}
              {(appointment.lab_results?.xray_path || appointment.lab_results?.sputum_path) && (
                <div className="mt-3 flex gap-2">
                  {appointment.lab_results?.xray_path && (
                    <button
                      onClick={() => downloadAndOpenFile(appointment.lab_results.xray_path)}
                      className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                    >
                      📊 View X-ray
                    </button>
                  )}
                  {appointment.lab_results?.sputum_path && (
                    <button
                      onClick={() => downloadAndOpenFile(appointment.lab_results.sputum_path)}
                      className="bg-yellow-600 text-white px-3 py-1 rounded-md hover:bg-yellow-700 text-sm"
                    >
                      🧪 View Sputum
                    </button>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-3 flex gap-2">
                {appointment.status === 'pending' && (
                  <>
                    <button
                      onClick={() => updateAppointmentStatus(appointment.id, 'approved')}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm font-medium"
                    >
                      ✓ approved
                    </button>
                    <button
                      onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm font-medium"
                    >
                      ✗ Cancel
                    </button>
                  </>
                )}

                {appointment.status === 'approved' && (
                  <button
                    onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium"
                  >
                    ✓ Mark Complete
                  </button>
                )}

                {appointment.status === 'completed' && (
                  <span className="text-green-600 text-sm font-medium">
                    ✓ Completed
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Appointments;