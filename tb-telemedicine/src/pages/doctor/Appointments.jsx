import React, { useEffect, useState } from 'react';
import { supabase } from '../../client';

const Appointments = () => {

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true)
  useEffect(()=>{
    async function fetcAppointments(){
      const { data, error } = await supabase
        .from('appointments')
        .select('id, appointment_date, status, patient_id, doctor_id')
        .order('appointment_date', { ascending: true });

      if (error) {
        console.log('Error fetching appointments:', error);
        setLoading(false);
        return;
      }

      // Collect unique patient ids from appointments
      const patientIds = Array.from(new Set(data.map((a) => a.patient_id).filter(Boolean)));

      // Fetch patient profiles (names)
      let profilesMap = {};
      if (patientIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', patientIds);

        if (profilesError) console.warn('Error fetching profiles:', profilesError);
        else profilesMap = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
      }

      // Fetch lab results for patients (if any)
      let labResultsMap = {};
      if (patientIds.length > 0) {
        const { data: labs, error: labsError } = await supabase
          .from('lab_results')
          .select('user_id, xray_path, sputum_path')
          .in('user_id', patientIds);

        if (labsError) console.warn('Error fetching lab results:', labsError);
        else labResultsMap = labs.reduce((acc, r) => ({ ...acc, [r.user_id]: r }), {});
      }

      // Attach patient and lab info to appointments
      const enriched = data.map((a) => ({
        ...a,
        patient: profilesMap[a.patient_id] || { id: a.patient_id, full_name: 'Unknown' },
        lab_results: labResultsMap[a.patient_id] || null,
      }));

      setAppointments(enriched);
      setLoading(false);
    }
    fetcAppointments()
  }, [])

  // download preview for lab files
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

  // Update appointment status (doctor action)
  async function updateAppointmentStatus(appointmentId, newStatus) {
    try {
      // sanitize and log the status we are about to send
      const sanitized = (typeof newStatus === 'string' ? newStatus.trim() : newStatus);
      console.log('Updating appointment', appointmentId, '->', sanitized);

      // attempt update
      const { data, error } = await supabase
        .from('appointments')
        .update({ status: sanitized })
        .eq('id', appointmentId)
        .select();

      if (error) {
        console.error('Error updating appointment status:', error);
        // show more detail to help debug constraint issues
        const msg = error.message || 'Unknown error';
        const details = error.details ? `\nDetails: ${error.details}` : '';
        alert('Could not update status: ' + msg + details);
        return;
      }

      // Update local UI: replace the appointment with the updated row if returned
      if (data && data.length > 0) {
        setAppointments((prev) => prev.map((a) => (a.id === appointmentId ? { ...a, ...data[0] } : a)));
      } else {
        // fallback: just update status locally
        setAppointments((prev) => prev.map((a) => (a.id === appointmentId ? { ...a, status: newStatus } : a)));
      }
    } catch (err) {
      console.error('Unexpected error updating status:', err);
      alert('Unexpected error updating status: ' + err.message);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Appointments</h1>
      {
        loading ? (
          <p>Loading...</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {appointments.map((appointment) => (
              <li key={appointment.id} className="p-4 border rounded-md">
                <p><strong>Patient:</strong> {appointment.patient?.full_name || 'Unknown'}</p>
                <p><strong>Date:</strong> {new Date(appointment.appointment_date).toLocaleString()}</p>
                <p><strong>Status:</strong> {appointment.status}</p>

                {/* Lab results quick links */}
                {appointment.lab_results?.xray_path && (
                  <button
                    onClick={() => downloadAndOpenFile(appointment.lab_results.xray_path)}
                    className="mr-2 mt-2 inline-block bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700"
                  >
                    View X-ray
                  </button>
                )}
                {appointment.lab_results?.sputum_path && (
                  <button
                    onClick={() => downloadAndOpenFile(appointment.lab_results.sputum_path)}
                    className="mr-2 mt-2 inline-block bg-yellow-600 text-white px-3 py-1 rounded-md hover:bg-yellow-700"
                  >
                    View Sputum
                  </button>
                )}

                {/* Action buttons for doctor to change status */}
                <div className="mt-3">
                  {appointment.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                        className="mr-2 bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                        className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700"
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {appointment.status === 'confirmed' && (
                    <button
                      onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                      className="bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700"
                    >
                      Mark Complete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )
      }
    </div>
  );
};

export default Appointments;