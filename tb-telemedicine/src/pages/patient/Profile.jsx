import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from "../../client";
import Avatar from '../../Avatar';

export default function PatientProfile({ token }) {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // If the route contains '/doctor/', then a doctor is viewing this
  const isDoctor = location.pathname.includes('/doctor/');
  
  // Use the patient ID from URL if doctor is viewing, otherwise use token user ID
  const [resolvedUserId, setResolvedUserId] = useState(isDoctor && id ? id : token?.user?.id);
  const [patientEmail, setPatientEmail] = useState('');

  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState(null)
  const [profileExists, setProfileExists] = useState(false)
  const [fullName, setFullName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [phone, setPhone] = useState('')
  const [maritalStatus, setMaritalStatus] = useState('')
  const [householdSize, setHouseholdSize] = useState('')
  const [occupation, setOccupation] = useState('')
  const [livingCondition, setLivingCondition] = useState('')
  const [travelHistory, setTravelHistory] = useState('')
  const [medicalHistory, setMedicalHistory] = useState('')
  const [avatar_url, setAvatarUrl] = useState(null)

  // Fetch user role (viewer) and resolve user ID
  useEffect(() => {
    async function initialize() {
      try {
        // Get the current viewer's info
        let viewerId = token?.user?.id;
        let viewerEmail = token?.user?.email;
        
        if (!viewerId) {
          const { data: userData } = await supabase.auth.getUser();
          viewerId = userData?.user?.id;
          viewerEmail = userData?.user?.email;
        }

        // Get viewer's role
        if (viewerId) {
          const { data, error } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", viewerId)
            .single();

          if (!error && data) {
            setRole(data.role);
          }
        }

        // Resolve which patient profile to load
        let targetUserId = resolvedUserId;
        
        if (!targetUserId) {
          if (isDoctor && id) {
            targetUserId = id;
          } else if (viewerId) {
            targetUserId = viewerId;
          } else {
            // Try sessionStorage as last resort
            try {
              const stored = sessionStorage.getItem('token');
              if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed?.user?.id) {
                  targetUserId = parsed.user.id;
                }
              }
            } catch (e) {
              console.error('Error parsing session storage:', e);
            }
          }
          
          setResolvedUserId(targetUserId);
        }

        // If doctor is viewing someone else's profile, get that patient's email
        if (isDoctor && id && id !== viewerId) {
          const { data: patientData } = await supabase.auth.admin.getUserById(id);
          if (patientData?.user?.email) {
            setPatientEmail(patientData.user.email);
          }
        } else {
          setPatientEmail(viewerEmail || '');
        }

      } catch (err) {
        console.error('Error in initialization:', err);
      }
    }

    initialize();
  }, [token, id, isDoctor, resolvedUserId]);

  // Fetch patient profile
  useEffect(() => {
    let ignore = false;
    
    async function getProfile() {
      if (!resolvedUserId) return;
      
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from('patient_profiles')
          .select('*')
          .eq('user_id', resolvedUserId)
          .single();

        if (!ignore) {
          if (error) {
            if (error.code === "PGRST116") {
              // No profile found - this is a new user
              console.log('No profile found for user, showing empty form');
              setProfileExists(false);
            } else {
              console.error('Error fetching profile:', error);
            }
          } else if (data) {
            // Profile exists - populate form
            setProfileExists(true);
            setFullName(data.full_name || '');
            setAge(data.age || '');
            setGender(data.gender || '');
            setPhone(data.phone || '');
            setMaritalStatus(data.marital_status || '');
            setHouseholdSize(data.household_size || '');
            setOccupation(data.occupation || '');
            setLivingCondition(data.living_condition || '');
            setTravelHistory(data.travel_history || '');
            setMedicalHistory(data.medical_history || '');
            setAvatarUrl(data.avatar_url);
          }
        }
      } catch (err) {
        console.error('Unexpected error fetching profile:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    getProfile();

    return () => {
      ignore = true;
    };
  }, [resolvedUserId]);

  async function updateProfile(event, avatarUrl) {
    event.preventDefault();

    if (!resolvedUserId) {
      alert('User ID not found. Please try logging in again.');
      return;
    }

    setLoading(true);

    try {
      const updates = {
        user_id: resolvedUserId,
        full_name: fullName.trim(),
        age: parseInt(age, 10),
        gender: gender,
        phone: phone.trim(),
        marital_status: maritalStatus,
        household_size: parseInt(householdSize, 10),
        occupation: occupation.trim(),
        living_condition: livingCondition,
        travel_history: travelHistory.trim(),
        medical_history: medicalHistory.trim(),
        avatar_url: avatarUrl || avatar_url,
        updated_at: new Date(),
      };

      const { error } = await supabase.from('patient_profiles').upsert(updates);

      if (error) {
        console.error('Error updating profile:', error);
        alert('Error updating profile: ' + error.message);
      } else {
        if (avatarUrl) setAvatarUrl(avatarUrl);
        setProfileExists(true);
        alert('Profile saved successfully!');
        
        // If this was their first time filling the profile, redirect to home
        if (!profileExists && !isDoctor) {
          setTimeout(() => {
            navigate('/patient/home');
          }, 1000);
        }
      }
    } catch (err) {
      console.error('Unexpected error updating profile:', err);
      alert('Unexpected error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Show loading state
  if (!resolvedUserId || (loading && profileExists === false && role === null)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-sm md:text-base text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 py-4 md:py-8 px-4">
      <div className="w-full max-w-2xl p-4 md:p-6 bg-white rounded-2xl shadow-md">
        {/* Header with status indicator */}
        <div className="mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-semibold text-center text-green-600">
            {isDoctor ? 'Patient Profile (View Only)' : 'Patient Profile'}
          </h2>
          {!profileExists && !isDoctor && (
            <div className="mt-2 md:mt-3 p-2 md:p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs md:text-sm text-yellow-800 text-center">
                ⚠️ Please complete your profile to continue using the platform
              </p>
            </div>
          )}
        </div>

        <form onSubmit={updateProfile} className="space-y-3 md:space-y-4">
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-3 md:space-y-4">
            <Avatar
              url={avatar_url}
              size={150}
              onUpload={(event, url) => {
                updateProfile(event, url);
              }}
              readOnly={role === "doctor"}
            />
          </div>

          {/* Email Field */}
          <div className="space-y-1 md:space-y-2">
            <label className="block text-xs md:text-sm text-green-600 font-medium" htmlFor="email">
              Email
            </label>
            <input 
              id="email" 
              type="text" 
              value={patientEmail || token?.user?.email || ''} 
              disabled 
              className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed text-sm md:text-base"
            />
          </div>

          {/* Full Name */}
          <div className="space-y-1 md:space-y-2">
            <label className="block text-xs md:text-sm text-green-600 font-medium" htmlFor="fullName">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={role === "doctor"}
              className={`w-full px-3 md:px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-colors text-sm md:text-base ${
                role === "doctor" ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
              }`}
              placeholder="Enter your full name"
            />
          </div>

          {/* Age */}
          <div className="space-y-1 md:space-y-2">
            <label className="block text-xs md:text-sm text-green-600 font-medium" htmlFor="age">
              Age <span className="text-red-500">*</span>
            </label>
            <input
              id="age"
              type="number"
              required
              min="1"
              max="150"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              disabled={role === "doctor"}
              className={`w-full px-3 md:px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-colors text-sm md:text-base ${
                role === "doctor" ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
              }`}
              placeholder="Enter your age"
            />
          </div>

          {/* Gender */}
          <div className="space-y-1 md:space-y-2">
            <label className="block text-xs md:text-sm text-green-600 font-medium" htmlFor="gender">
              Gender <span className="text-red-500">*</span>
            </label>
            <select
              id="gender"
              required
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              disabled={role === "doctor"}
              className={`w-full px-3 md:px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-colors text-sm md:text-base ${
                role === "doctor" ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
              }`}
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          {/* Phone */}
          <div className="space-y-1 md:space-y-2">
            <label className="block text-xs md:text-sm text-green-600 font-medium" htmlFor="phone">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              id="phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={role === "doctor"}
              className={`w-full px-3 md:px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-colors text-sm md:text-base ${
                role === "doctor" ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
              }`}
              placeholder="Enter your phone number"
            />
          </div>

          {/* Marital Status */}
          <div className="space-y-1 md:space-y-2">
            <label className="block text-xs md:text-sm text-green-600 font-medium">
              Marital Status <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <label className="flex items-center text-sm md:text-base">
                <input
                  type="radio"
                  name="maritalStatus"
                  value="single"
                  checked={maritalStatus === "single"}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  disabled={role === "doctor"}
                  required
                  className="mr-2"
                />
                Single
              </label>
              <label className="flex items-center text-sm md:text-base">
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

          {/* Household Size */}
          <div className="space-y-1 md:space-y-2">
            <label className="block text-xs md:text-sm text-green-600 font-medium" htmlFor="householdSize">
              Household Size <span className="text-red-500">*</span>
            </label>
            <input
              id="householdSize"
              type="number"
              required
              min="1"
              value={householdSize}
              onChange={(e) => setHouseholdSize(e.target.value)}
              disabled={role === "doctor"}
              className={`w-full px-3 md:px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-colors text-sm md:text-base ${
                role === "doctor" ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
              }`}
              placeholder="Number of people in household"
            />
          </div>

          {/* Occupation */}
          <div className="space-y-1 md:space-y-2">
            <label className="block text-xs md:text-sm text-green-600 font-medium" htmlFor="occupation">
              Occupation
            </label>
            <input
              id="occupation"
              type="text"
              placeholder="e.g., healthcare worker, miner, etc."
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              disabled={role === "doctor"}
              className={`w-full px-3 md:px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-colors text-sm md:text-base ${
                role === "doctor" ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
              }`}
            />
          </div>

          {/* Living Condition */}
          <div className="space-y-1 md:space-y-2">
            <label className="block text-xs md:text-sm text-green-600 font-medium" htmlFor="livingCondition">
              Living Condition <span className="text-red-500">*</span>
            </label>
            <select
              id="livingCondition"
              required
              value={livingCondition}
              onChange={(e) => setLivingCondition(e.target.value)}
              disabled={role === "doctor"}
              className={`w-full px-3 md:px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-colors text-sm md:text-base ${
                role === "doctor" ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
              }`}
            >
              <option value="">Select Living Condition</option>
              <option value="crowded">Crowded housing</option>
              <option value="poor-ventilation">Poor ventilation</option>
              <option value="good-ventilation">Good ventilation</option>
            </select>
          </div>

          {/* Travel History */}
          <div className="space-y-1 md:space-y-2">
            <label className="block text-xs md:text-sm text-green-600 font-medium" htmlFor="travelHistory">
              Travel History
            </label>
            <textarea
              id="travelHistory"
              placeholder="Travel history (to/from high-TB burden areas)"
              value={travelHistory}
              onChange={(e) => setTravelHistory(e.target.value)}
              disabled={role === "doctor"}
              className={`w-full px-3 md:px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-colors text-sm md:text-base resize-none ${
                role === "doctor" ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
              }`}
              rows="3"
            />
          </div>

          {/* Medical History */}
          <div className="space-y-1 md:space-y-2">
            <label className="block text-xs md:text-sm text-green-600 font-medium" htmlFor="medicalHistory">
              Medical History
            </label>
            <textarea
              id="medicalHistory"
              placeholder="Medical history (e.g. TB exposure, other conditions)"
              value={medicalHistory}
              onChange={(e) => setMedicalHistory(e.target.value)}
              disabled={role === "doctor"}
              className={`w-full px-3 md:px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-colors text-sm md:text-base resize-none ${
                role === "doctor" ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
              }`}
              rows="3"
            />
          </div>

          {/* Buttons - Only show for patients */}
          {role === "patient" && (
            <div className="space-y-2 md:space-y-3 pt-3 md:pt-4">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 md:py-3 px-3 md:px-4 rounded-md transition-colors duration-200 disabled:cursor-not-allowed text-sm md:text-base"
              >
                {loading ? 'Saving...' : profileExists ? 'Update Profile' : 'Create Profile'}
              </button>
              
              {profileExists && (
                <button 
                  type="button" 
                  onClick={() => supabase.auth.signOut()}
                  className="w-full bg-black hover:bg-gray-800 text-white font-medium py-2 md:py-3 px-3 md:px-4 rounded-md transition-colors duration-200 text-sm md:text-base"
                >
                  Sign Out
                </button>
              )}
            </div>
          )}

          {/* Doctor viewing message */}
          {role === "doctor" && (
            <div className="pt-3 md:pt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 md:p-4 text-xs md:text-sm text-blue-700 text-center">
                You are viewing this patient's profile in read-only mode.
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}