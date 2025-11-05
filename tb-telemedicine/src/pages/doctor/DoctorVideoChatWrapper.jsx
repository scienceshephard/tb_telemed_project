import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import VideoChat from '../../components/VideoChat'
import { supabase } from '../../client'

export default function DoctorVideoChatWrapper({ token }) {
  const { appointmentId } = useParams()
  const [appointment, setAppointment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('appointments')
        .select('id, patient_id, doctor_id, status')
        .eq('id', appointmentId)
        .single()

      if (!mounted) return
      if (error) {
        console.error('Error loading appointment for doctor video chat:', error)
        setLoading(false)
        return
      }

      setAppointment(data)

      // resolve current user id
      const userResp = await supabase.auth.getUser()
      const currentId = userResp?.data?.user?.id || token?.user?.id

      // basic client-side guard: user must be the doctor on the appointment
      if (currentId && currentId === data.doctor_id) {
        setAuthorized(true)
      } else {
        setAuthorized(false)
      }

      setLoading(false)
    }

    load()
    return () => {
      mounted = false
    }
  }, [appointmentId, token])

  if (loading) return <div className="p-6">Loading video room…</div>
  if (!appointment) return <div className="p-6">Appointment not found.</div>
  if (appointment.status !== 'approved') return <div className="p-6">Appointment not confirmed yet.</div>
  if (!authorized) return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
      <div className="text-red-800 font-semibold">Access denied</div>
      <div className="text-red-600">You are not authorized to join this consultation</div>
    </div>
  )

  const roomName = `tbcare-appointment-${appointment.id}`
  const displayName = token?.user?.user_metadata?.full_name || 'Doctor'

  return <VideoChat roomName={roomName} displayName={displayName} isDoctor onHangup={() => { /* optional hook */ }} />
}
