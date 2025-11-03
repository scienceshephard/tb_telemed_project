import React, { useEffect, useState } from "react";
import { supabase } from "../../client";

export default function Teleconsultation({ token }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

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
          .select('id, appointment_date, status, doctor_id')
          .eq('patient_id', user.id)
          .order('appointment_date', { ascending: true });

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
                  {new Date(app.appointment_date).toLocaleString()}
                </td>
                <td className="border px-2 py-1">{app.status}</td>
                <td className="border px-2 py-1">
                  <button
                    className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700"
                    // replace with real video link later
                    onClick={() => alert("Join consultation (placeholder)")}
                  >
                    Join
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
