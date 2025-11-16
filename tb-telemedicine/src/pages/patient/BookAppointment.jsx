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
      
      //testing something
      console.log('Selected doctor id', doctorId);
      console.log('patient id: ', user?.id);
       const { data: selectedDoctor } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', doctorId)
      .single();
 console.log('✅ Selected Doctor Profile:', selectedDoctor);

    const yload = {
      patient_id: user.id,
      doctor_id: doctorId,
      appointment_date: date,
      appointment_time: time,
      reason,
      status: 'pending',
    };
    console.log('📤 Inserting appointment payload:', yload);

      //testing ends
      

      
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
    <div className="max-w-lg mx-auto p-4 md:p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-xl md:text-2xl font-bold text-green-600 mb-4">Book Appointment</h2>
      <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
        <select
          required
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          className="w-full px-3 md:px-4 py-2 border rounded-md text-sm md:text-base"
        >
          <option value="">Select Doctor</option>
          {doctors.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.full_name}
            </option>
          ))}
        </select>

        <div className="flex flex-col md:flex-row gap-2 md:gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="flex-1 px-3 md:px-4 py-2 border rounded-md text-sm md:text-base"
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            className="flex-1 px-3 md:px-4 py-2 border rounded-md text-sm md:text-base"
          />
        </div>

        <textarea
          placeholder="Reason / Notes"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-3 md:px-4 py-2 border rounded-md text-sm md:text-base"
          rows={3}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 text-sm md:text-base font-medium"
        >
          {loading ? "Booking..." : "Book Appointment"}
        </button>
      </form>
    </div>
  );
}
