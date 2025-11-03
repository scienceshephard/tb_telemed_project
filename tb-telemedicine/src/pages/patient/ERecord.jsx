import { useState, useEffect } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { supabase } from "../../client";

export default function ERecords({ token }) {
  const { id } = useParams();
  const location = useLocation();
  
  // If the route contains '/doctor/', then a doctor is viewing this
  const isDoctor = location.pathname.includes('/doctor/');
  
  // Use the patient ID from URL if doctor is viewing, otherwise use token user ID
  const patientId = isDoctor && id ? id : token?.user?.id;
  const [loading, setLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState('');
  const [notes, setNotes] = useState('');
  const [role, setRole] = useState(null);
  const [recordId, setRecordId] = useState(null); // Track existing record ID

  // Fetch user role
  useEffect(() => {
    async function fetchRole() {
      if (!token?.user?.id) return;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", token?.user?.id)
        .single();

      if (!error && data) {
        setRole(data.role);
      }
    }
    fetchRole();
  }, [token]);

  // Fetch existing e-record for the patient
  useEffect(() => {
    async function fetchERecord() {
      if (!patientId) return;
      
      const { data, error } = await supabase
        .from('e_records')
        .select('id, prescriptions, notes')
        .eq('patient_id', patientId)
        .single();

      if (!error && data) {
        setRecordId(data.id);
        setPrescriptions(data.prescriptions || '');
        setNotes(data.notes || '');
      }
      setLoading(false);
    }
    
    fetchERecord();
  }, [patientId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (role !== "doctor") return;
    
    setLoading(true);

    try {
      if (recordId) {
        // Update existing record
        const { error } = await supabase
          .from('e_records')
          .update({
            prescriptions,
            notes,
            updated_at: new Date()
          })
          .eq('id', recordId);

        if (error) throw error;
        alert('E-record updated successfully!');
      } else {
        // Create new record
        const { data, error } = await supabase
          .from('e_records')
          .insert([{
            patient_id: patientId,
            doctor_id: token?.user?.id,
            prescriptions,
            notes
          }])
          .select()
          .single();

        if (error) throw error;
        setRecordId(data.id);
        alert('E-record created successfully!');
      }
    } catch (error) {
      alert('Error saving record: ' + error.message);
    }
    
    setLoading(false);
  }

  // Add loading check for token
  if (!token || !patientId) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-xl font-bold text-green-700 mb-4">Patient E-Record</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 font-medium mb-1">Prescriptions</label>
          <textarea
            className="w-full border rounded-lg p-2 resize-none"
            value={prescriptions}
            onChange={(e) => setPrescriptions(e.target.value)}
            disabled={role !== "doctor"}
            rows={4}
            placeholder={role === "doctor" ? "Enter prescriptions..." : "No prescriptions available"}
          />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Additional Notes</label>
          <textarea
            className="w-full border rounded-lg p-2 resize-none"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={role !== "doctor"}
            rows={4}
            placeholder={role === "doctor" ? "Enter additional notes..." : "No notes available"}
          />
        </div>

        {role === "doctor" && (
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Saving...' : recordId ? 'Update Record' : 'Create Record'}
          </button>
        )}

        {role === "patient" && (
          <div className="text-gray-500 text-sm">
            You can view your medical records here. Only doctors can make changes.
          </div>
        )}
      </form>
    </div>
  );
}
