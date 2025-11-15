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
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) console.error('Error getting supabase user:', userError);

        const user = userData?.user;
        if (!user) {
          console.warn('No authenticated user available for fetching appointments');
          setLoading(false);
          return;
        }

        const { data: apps, error: appsError } = await supabase
          .from('appointments')
          .select('id, appointment_date, appointment_time, status, doctor_id')
          .eq('patient_id', user.id)
          .order('appointment_date', { ascending: true });

        if (appsError) throw appsError;

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

        const withDoctor = apps.map((a) => ({
          ...a,
          doctor: doctorsMap[a.doctor_id] || { id: a.doctor_id, full_name: 'Unknown' },
        }));

        setAppointments(withDoctor);
      } catch (err) {
        console.error('Error fetching appointments or doctors:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAppointments();
  }, [token]);

  
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-bold text-green-600 mb-4">Your Appointments</h2>
      {loading ? (
        <p>Loading...</p>
      ) : appointments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No appointments yet.</p>
          <button
            onClick={() => navigate('/patient/patientbookappointment')}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
          >
            Book an Appointment
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((app) => (
            <div key={app.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">
                    Dr. {app.doctor.full_name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    📅 {(() => {
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
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  app.status === 'approved' 
                    ? 'bg-green-100 text-green-800'
                    : app.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : app.status === 'completed'
                    ? 'bg-blue-100 text-blue-800'
                    : app.status === 'cancelled'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {app.status.toUpperCase()}
                </span>
              </div>

              <div className="flex gap-2">
                {/* Chat Button - Always available */}
                <button
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  onClick={() => navigate(`/patient/chat/${app.id}`)}
                >
                  💬 Chat
                </button>

                {/* Video Call Button - Only for approved */}
                {app.status === 'approved' ? (
                  <button
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                    onClick={() => navigate(`/patient/teleconsultation/${app.id}/room`)}
                  >
                    🎥 Join Video Call
                  </button>
                ) : (
                  <button
                    disabled
                    title={
                      app.status === 'pending' 
                        ? 'Waiting for doctor to approve'
                        : app.status === 'completed'
                        ? 'Appointment completed'
                        : 'Appointment not available'
                    }
                    className="flex-1 bg-gray-300 text-gray-600 px-4 py-2 rounded-md cursor-not-allowed"
                  >
                    🎥 Join Video Call
                  </button>
                )}
              </div>

              {app.status === 'pending' && (
                <p className="text-xs text-yellow-600 mt-2 text-center">
                  ⏳ Waiting for doctor to approve this appointment
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}