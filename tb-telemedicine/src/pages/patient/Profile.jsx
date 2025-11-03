import { useState, useEffect } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { supabase } from "../../client";
import Avatar from '../../Avatar';

export default function PatientProfile({ token }) {
  const { id } = useParams();
  const location = useLocation();
  
  // If the route contains '/doctor/', then a doctor is viewing this
  const isDoctor = location.pathname.includes('/doctor/');
  
  // Use the patient ID from URL if doctor is viewing, otherwise use token user ID
  const userId = isDoctor && id ? id : token?.user?.id;
  // Resolved user id used for fetches — fall back to supabase auth or sessionStorage
  const [resolvedUserId, setResolvedUserId] = useState(isDoctor && id ? id : token?.user?.id);

  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState(null) // Add role state
  const [fullName, setFullName] = useState(null)
  const [age, setAge] = useState(null)
  const [gender, setGender] = useState(null)
  const [phone, setPhone] = useState(null)
  const [maritalStatus, setMaritalStatus] = useState(null)
  const [householdSize, setHouseholdSize] = useState(null)
  const [occupation, setOccupation] = useState(null)
  const [livingCondition, setLivingCondition] = useState(null)
  const [travelHistory, setTravelHistory] = useState(null)
  const [medicalHistory, setMedicalHistory] = useState(null)
  const [avatar_url, setAvatarUrl] = useState(null)

  // Fetch user role (viewer) — try token first, then supabase auth as a fallback
  useEffect(() => {
    async function fetchRole() {
      let viewerId = token?.user?.id;
      if (!viewerId) {
        const { data: userData } = await supabase.auth.getUser();
        viewerId = userData?.user?.id;
      }
      if (!viewerId) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", viewerId)
        .single();

      if (!error && data) {
        setRole(data.role);
      }
    }
    fetchRole();
  }, [token]);

  // Resolve the subject user id if it isn't available via props/token
  useEffect(() => {
    async function resolveUserId() {
      if (resolvedUserId) return;
      // If doctor is viewing and id param is present, use it
      if (isDoctor && id) {
        setResolvedUserId(id);
        return;
      }

      // Try supabase client
      const { data: userData } = await supabase.auth.getUser();
      const maybeId = userData?.user?.id;
      if (maybeId) {
        setResolvedUserId(maybeId);
        return;
      }

      // Finally try sessionStorage (best-effort)
      try {
        const stored = sessionStorage.getItem('token');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.user?.id) setResolvedUserId(parsed.user.id);
        }
      } catch (e) {
        // ignore
      }
    }
    resolveUserId();
  }, [resolvedUserId, token, id, isDoctor]);

  useEffect(() => {
    let ignore = false
    async function getProfile() {
      setLoading(true)

      const { data, error } = await supabase
        .from('patient_profiles')
        .select(`full_name, age, gender, phone, marital_status, household_size, occupation, living_condition, travel_history, medical_history, avatar_url`)
        .eq('user_id', resolvedUserId)
        .single()

      if (!ignore) {
        if (error && error.code !== "PGRST116") {
          console.warn(error)
        } else if (data) {
          setFullName(data.full_name)
          setAge(data.age)
          setGender(data.gender)
          setPhone(data.phone)
          setMaritalStatus(data.marital_status)
          setHouseholdSize(data.household_size)
          setOccupation(data.occupation)
          setLivingCondition(data.living_condition)
          setTravelHistory(data.travel_history)
          setMedicalHistory(data.medical_history)
          setAvatarUrl(data.avatar_url)
        }
      }

      setLoading(false)
    }

    if (resolvedUserId) {
      getProfile()
    }

    return () => {
      ignore = true
    }
  }, [token, userId])

  async function updateProfile(event, avatarUrl) {
    event.preventDefault()

    setLoading(true)

    const updates = {
      user_id: resolvedUserId,
      full_name: fullName,
      age: parseInt(age, 10),
      gender: gender,
      phone: phone,
      marital_status: maritalStatus,
      household_size: parseInt(householdSize, 10),
      occupation: occupation,
      living_condition: livingCondition,
      travel_history: travelHistory,
      medical_history: medicalHistory,
      avatar_url: avatarUrl || avatar_url,
      updated_at: new Date(),
    }

    const { error } = await supabase.from('patient_profiles').upsert(updates)

    if (error) {
      alert(error.message)
    } else {
      if (avatarUrl) setAvatarUrl(avatarUrl)
      alert('Profile updated successfully!')
    }
    setLoading(false)
  }

  // Add loading check for token / resolved user id
  if (!resolvedUserId) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-2xl p-6 bg-white rounded-2xl shadow-md">
        <h2 className="text-2xl font-semibold text-center text-green-600 mb-6">
          {isDoctor ? 'Patient Profile (View Only)' : 'Patient Profile'}
        </h2>

        <form onSubmit={updateProfile} className="space-y-4">
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-4">
            <Avatar
              url={avatar_url}
              size={150}
              onUpload={(event, url) => {
                updateProfile(event, url)
              }}
              readOnly={role === "doctor"}
            />
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <label className="block text-green-600 font-medium" htmlFor="email">
              Email
            </label>
            <input 
              id="email" 
              type="text" 
              value={token?.user?.email} 
              disabled 
              className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed"
            />
          </div>

          {/* All form fields - disabled for doctors */}
          <div className="space-y-2">
            <label className="block text-green-600 font-medium" htmlFor="fullName">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName || ''}
              onChange={(e) => setFullName(e.target.value)}
              disabled={role === "doctor"}
              className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-colors ${
                role === "doctor" ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
              }`}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-green-600 font-medium" htmlFor="age">
              Age
            </label>
            <input
              id="age"
              type="number"
              required
              value={age || ''}
              onChange={(e) => setAge(e.target.value)}
              disabled={role === "doctor"}
              className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-colors ${
                role === "doctor" ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
              }`}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-green-600 font-medium" htmlFor="gender">
              Gender
            </label>
            <select
              id="gender"
              required
              value={gender || ''}
              onChange={(e) => setGender(e.target.value)}
              disabled={role === "doctor"}
              className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-colors ${
                role === "doctor" ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
              }`}
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-green-600 font-medium" htmlFor="phone">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              required
              value={phone || ''}
              onChange={(e) => setPhone(e.target.value)}
              disabled={role === "doctor"}
              className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-colors ${
                role === "doctor" ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
              }`}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-green-600 font-medium">
              Marital Status
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="maritalStatus"
                  value="single"
                  checked={maritalStatus === "single"}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  disabled={role === "doctor"}
                  className="mr-2"
                />
                Single
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="maritalStatus"
                  value="married"
                  checked={maritalStatus === "married"}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  disabled={role === "doctor"}
                  className="mr-2"
                />
                Married
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-green-600 font-medium" htmlFor="householdSize">
              Household Size
            </label>
            <input
              id="householdSize"
              type="number"
              required
              value={householdSize || ''}
              onChange={(e) => setHouseholdSize(e.target.value)}
              disabled={role === "doctor"}
              className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-colors ${
                role === "doctor" ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
              }`}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-green-600 font-medium" htmlFor="occupation">
              Occupation
            </label>
            <input
              id="occupation"
              type="text"
              placeholder="e.g., healthcare worker, miner, etc."
              value={occupation || ''}
              onChange={(e) => setOccupation(e.target.value)}
              disabled={role === "doctor"}
              className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-colors ${
                role === "doctor" ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
              }`}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-green-600 font-medium" htmlFor="livingCondition">
              Living Condition
            </label>
            <select
              id="livingCondition"
              required
              value={livingCondition || ''}
              onChange={(e) => setLivingCondition(e.target.value)}
              disabled={role === "doctor"}
              className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-colors ${
                role === "doctor" ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
              }`}
            >
              <option value="">Select Living Condition</option>
              <option value="crowded">Crowded housing</option>
              <option value="poor-ventilation">Poor ventilation</option>
              <option value="good-ventilation">Good ventilation</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-green-600 font-medium" htmlFor="travelHistory">
              Travel History
            </label>
            <textarea
              id="travelHistory"
              placeholder="Travel history (to/from high-TB burden areas)"
              value={travelHistory || ''}
              onChange={(e) => setTravelHistory(e.target.value)}
              disabled={role === "doctor"}
              className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-colors ${
                role === "doctor" ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
              } resize-none`}
              rows="3"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-green-600 font-medium" htmlFor="medicalHistory">
              Medical History
            </label>
            <textarea
              id="medicalHistory"
              placeholder="Medical history (e.g. TB exposure, other conditions)"
              value={medicalHistory || ''}
              onChange={(e) => setMedicalHistory(e.target.value)}
              disabled={role === "doctor"}
              className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-colors ${
                role === "doctor" ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
              } resize-none`}
              rows="3"
            />
          </div>

          {/* Buttons - Only show for patients */}
          {role === "patient" && (
            <div className="space-y-3 pt-4">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-md transition-colors duration-200 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Update Profile'}
              </button>
              
              <button 
                type="button" 
                onClick={() => supabase.auth.signOut()}
                className="w-full bg-black hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-md transition-colors duration-200"
              >
                Sign Out
              </button>
            </div>
          )}

          {/* Doctor viewing message */}
          {role === "doctor" && (
            <div className="pt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-blue-700 text-center">
                You are viewing this patient's profile in read-only mode.
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}