import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import VideoChat from '../../components/VideoChat'
import { supabase } from '../../client'

export default function VideoChatWrapper({ token }) {
  const { appointmentId } = useParams()
  const navigate = useNavigate()
  const [appointment, setAppointment] = useState(null)
  const [doctorInfo, setDoctorInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      
      try {
        // Validate token exists
        if (!token?.user?.id && !appointmentId) {
          console.error('❌ No token or appointment ID');
          setLoading(false);
          return;
        }

        console.log('🔍 Loading video chat for appointment:', appointmentId);
        console.log('👤 Current user:', token?.user?.id);

        // Fetch appointment
        const { data, error } = await supabase
          .from('appointments')
          .select('id, patient_id, doctor_id, status')
          .eq('id', appointmentId)
          .single()

        if (!mounted) return
        
        if (error) {
          console.error('❌ Error loading appointment for video chat:', error)
          setLoading(false)
          return
        }

        console.log('✅ Appointment found:', data);
        setAppointment(data)

        // Fetch doctor info
        const { data: doctorData, error: doctorError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', data.doctor_id)
          .single()

        if (!doctorError && doctorData) {
          setDoctorInfo(doctorData)
          console.log('✅ Doctor info:', doctorData);
        }

        // Resolve current user id - use token as primary source
        const currentId = token?.user?.id;

        if (!currentId) {
          console.error('❌ No current user ID available');
          setAuthorized(false);
          setLoading(false);
          return;
        }

        // Authorization check: user must be either patient or doctor
        const isPatient = currentId === data.patient_id;
        const isDoctor = currentId === data.doctor_id;
        
        console.log('🔐 Auth check - isPatient:', isPatient, 'isDoctor:', isDoctor);

        if (isPatient || isDoctor) {
          setAuthorized(true)
          console.log('✅ User authorized for this appointment');
        } else {
          setAuthorized(false)
          console.warn('❌ User not authorized - not patient or doctor');
          console.log("currentId: ", currentId, "id: ", data.id, " patient_id: ", data.patient_id, " doctor_id: ", data.doctor_id, "token: ", token);
        }
      } catch (err) {
        console.error('❌ Unexpected error in video chat setup:', err);
        setAuthorized(false);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [appointmentId, token])

  function handleHangup() {
    navigate('/patient/teleconsultation')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading consultation room...</p>
        </div>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg max-w-md">
          <div className="text-red-800 font-semibold text-lg mb-2">❌ Appointment Not Found</div>
          <p className="text-red-600 mb-4">The appointment you're trying to access does not exist.</p>
          <button
            onClick={() => navigate('/patient/teleconsultation')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Consultations
          </button>
        </div>
      </div>
    )
  }

  if (appointment.status !== 'approved') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg max-w-md">
          <div className="text-yellow-800 font-semibold text-lg mb-2">⏳ Appointment Not Confirmed</div>
          <p className="text-yellow-700 mb-4">
            This appointment is still <strong>{appointment.status}</strong>. 
            Please wait for the doctor to approve it.
          </p>
          <button
            onClick={() => navigate('/patient/teleconsultation')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Consultations
          </button>
        </div>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg max-w-md">
          <div className="text-red-800 font-semibold text-lg mb-2">🚫 Access Denied</div>
          <p className="text-red-600 mb-4">
            You are not authorized to join this consultation. Make sure you're logged in with the correct account.
          </p>
          <button
            onClick={() => navigate('/patient/teleconsultation')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Consultations
          </button>
        </div>
      </div>
    )
  }

  const roomName = `tbcare-appointment-${appointment.id}`
  const displayName = token?.user?.user_metadata?.full_name || 'Patient'

  return (
    <VideoChat 
      roomName={roomName} 
      displayName={displayName} 
      onHangup={handleHangup}
      isDoctor={false}
      appointmentId={appointment.id}
      currentUserId={token?.user?.id}
      otherUserId={appointment.doctor_id}
      otherUserName={doctorInfo?.full_name || 'Doctor'}
    />
  )
}