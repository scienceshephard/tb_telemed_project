import React from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Welcome Message */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-600 mb-2">Doctor Dashboard</h1>
        <p className="text-xs sm:text-sm md:text-base text-gray-600 mb-4 md:mb-6">
          Welcome back, Doctor! Select an option below to get started.
        </p>

        {/* Quick Navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <div
            className="p-4 md:p-6 bg-white rounded-xl shadow-md cursor-pointer hover:shadow-lg transition"
            onClick={() => navigate("/doctor/patientlist")}
          >
            <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-2">Patients List</h2>
            <p className="text-xs sm:text-sm md:text-sm text-gray-500">
              View and manage your patients' profiles, lab results, and e-records.
            </p>
          </div>

          <div
            className="p-4 md:p-6 bg-white rounded-xl shadow-md cursor-pointer hover:shadow-lg transition"
            onClick={() => navigate("/doctor/appointments")}
          >
            <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-2">Appointments</h2>
            <p className="text-xs sm:text-sm md:text-sm text-gray-500">
              See all your scheduled appointments and update their status.
            </p>
          </div>

          <div
            className="p-4 md:p-6 bg-white rounded-xl shadow-md cursor-pointer hover:shadow-lg transition"
            onClick={() => navigate("/doctor/consultations")}
          >
            <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-2">Consultations</h2>
            <p className="text-xs sm:text-sm md:text-sm text-gray-500">
              Join or start live video consultations with patients.
            </p>
          </div>

          <div
            className="p-4 md:p-6 bg-white rounded-xl shadow-md cursor-pointer hover:shadow-lg transition"
            onClick={() => navigate("/doctor/profile")}
          >
            <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-2">Profile</h2>
            <p className="text-xs sm:text-sm md:text-sm text-gray-500">
              Update your personal information and credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
