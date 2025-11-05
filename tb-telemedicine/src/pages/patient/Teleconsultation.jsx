import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom'
import { supabase } from "../../client";

export default function Teleconsultation({ token }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchAppointments() {
      try {
        // Ensure we have the current authenticated user
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) console.error('Error getting supabase user:', userError);

        const user = userData?.user;
        if (!user) {
          console.warn('No authenticated user available for fetching appointments');
          setLoading(false);
          return;
        }

        // First fetch appointments for the patient
        const { data: apps, error: appsError } = await supabase
          .from('appointments')
          .select('id, appointment_date, appointment_time, status, doctor_id')
          .eq('patient_id', user.id)
          .order('appointment_date', { ascending: true });
console.log('apps: ', apps);

        if (appsError) throw appsError;

        // If there are doctor_ids, fetch doctor profiles in one query
        const doctorIds = Array.from(new Set(apps.map((a) => a.doctor_id).filter(Boolean)));
        let doctorsMap = {};

        if (doctorIds.length > 0) {
          const { data: docs, error: docsError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', doctorIds);

          if (docsError) throw docsError;

          doctorsMap = docs.reduce((acc, d) => ({ ...acc, [d.id]: d }), {});
        }

        // Attach doctor info to appointments for rendering
        const withDoctor = apps.map((a) => ({
          ...a,
          doctor: doctorsMap[a.doctor_id] || { id: a.doctor_id, full_name: 'Unknown' },
        }));

        setAppointments(withDoctor);
        console.log('appointments loaded', withDoctor);
      } catch (err) {
        console.error('Error fetching appointments or doctors:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAppointments();
  }, [token]);

  
  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-bold text-green-600 mb-4">Upcoming Teleconsultations</h2>
      {loading ? (
        <p>Loading...</p>
      ) : appointments.length === 0 ? (
        <p>No upcoming consultations.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border px-2 py-1">Doctor</th>
              <th className="border px-2 py-1">Date & Time</th>
              <th className="border px-2 py-1">Status</th>
              <th className="border px-2 py-1">Action</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((app) => (
              <tr key={app.id}>
                <td className="border px-2 py-1">{app.doctor.full_name}</td>
                <td className="border px-2 py-1">
                  {(() => {
                    try {
                      const d = app.appointment_date;
                      const t = app.appointment_time;
                      if (d && typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && t) {
                        return new Date(`${d}T${t}`).toLocaleString();
                      }
                      if (d) {
                        const dt = new Date(d);
                        return isNaN(dt.getTime()) ? String(d) : dt.toLocaleString();
                      }
                    } catch (e) {
                      console.warn('Error formatting appointment date', e);
                    }
                    return 'Unknown';
                  })()}
                </td>
                <td className="border px-2 py-1">{app.status}</td>
                <td className="border px-2 py-1">
                  {app.status === 'approved' ? (
                    <button
                      className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700"
                      onClick={() => navigate(`/patient/teleconsultation/${app.id}/room`)}
                    >
                      Join
                    </button>
                  ) : (
                    <button
                      disabled
                      title="Waiting for doctor to confirm"
                      className="bg-gray-300 text-gray-600 px-3 py-1 rounded-md cursor-not-allowed"
                    >
                      Join
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
