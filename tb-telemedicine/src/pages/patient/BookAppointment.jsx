import React, { useState, useEffect } from "react";
import { supabase } from "../../client";

export default function BookAppointment({ token }) {
  const [doctors, setDoctors] = useState([]);
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchDoctors() {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "doctor");

      if (error) console.error(error);
      else setDoctors(data);
    }

    fetchDoctors();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    const appointmentDateTime = new Date(`${date}T${time}`);

    try {
      // Use Supabase client auth to get the current user so RLS WITH CHECK passes
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) console.error('Error fetching supabase user:', userError);

      const user = userData?.user;
      console.log('supabase user:', user, 'token prop:', token);

      if (!user) {
        alert('You must be signed in to book an appointment.');
        setLoading(false);
        return;
      }

      const payload = {
        patient_id: user.id,
        doctor_id: doctorId,
        appointment_date: appointmentDateTime,
        appointment_time: time,
        reason,
        status: 'pending',
      };

      console.log('inserting appointment payload:', payload);

      const { error } = await supabase.from('appointments').insert([payload]);

      if (error) {
        console.error('Insert error:', error);
        alert('Error booking appointment: ' + error.message);
      } else {
        alert('Appointment booked successfully!');
        setDate('');
        setTime('');
        setReason('');
        setDoctorId('');
      }
    } catch (err) {
      console.error('Unexpected error booking appointment:', err);
      alert('Unexpected error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-bold text-green-600 mb-4">Book Appointment</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <select
          required
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          className="w-full px-4 py-2 border rounded-md"
        >
          <option value="">Select Doctor</option>
          {doctors.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.full_name}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="flex-1 px-4 py-2 border rounded-md"
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            className="flex-1 px-4 py-2 border rounded-md"
          />
        </div>

        <textarea
          placeholder="Reason / Notes"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-4 py-2 border rounded-md"
          rows={3}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700"
        >
          {loading ? "Booking..." : "Book Appointment"}
        </button>
      </form>
    </div>
  );
}
