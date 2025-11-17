import React from "react";
import { Link, useNavigate } from "react-router-dom";

const Home = ({ token }) => {
  let navigate = useNavigate();

  function handleLogout() {
    sessionStorage.removeItem("token");
    navigate("/");
  }

  return (
    <div className="text-gray-800">
      {/* ✅ Hero Section */}
      <section className="bg-green-50 py-6 md:py-10 px-4 md:px-6 text-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-700">
          Welcome Back, {token?.user?.user_metadata?.full_name} 👋
        </h1>
        <p className="mt-2 md:mt-3 text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
          TB TeleHealth helps you detect tuberculosis symptoms early, consult
          doctors remotely, and keep your medical records safe.
        </p>
        <div className="mt-4 md:mt-6 flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
          <Link
            to="/patient/symptomchecklist"
            className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 text-sm sm:text-base font-medium"
          >
            Check Your TB Risk
          </Link>
          <Link
            to="/patient/patientprofile"
            className="border border-green-600 text-green-600 px-3 sm:px-4 py-2 rounded-lg hover:bg-green-50 text-sm sm:text-base font-medium"
          >
            Profile Page
          </Link>
        </div>
      </section>

      {/* ✅ Problem Statement */}
      <section className="py-6 md:py-10 px-4 md:px-6 text-center bg-white">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-green-700">
          Why This Matters
        </h2>
        <p className="mt-3 md:mt-4 max-w-3xl mx-auto text-xs sm:text-sm md:text-base text-gray-600">
          Nigeria is one of the top 10 countries with the highest TB burden
          globally and ranks first in Africa. Millions of people remain
          undiagnosed until it's too late. Our system helps bridge this gap
          through early detection and telemedicine.
        </p>
      </section>

      {/* ✅ Features */}
      <section className="py-6 md:py-10 px-4 md:px-6 bg-green-50">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-center text-green-700">
          What You Can Do Here
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mt-6 md:mt-8 max-w-5xl mx-auto">
          <div className="p-4 md:p-6 bg-white rounded-2xl shadow">
            <h3 className="text-base sm:text-lg md:text-lg font-bold text-green-700">
              📝 Symptom Checker
            </h3>
            <p className="mt-2 text-xs sm:text-sm md:text-sm text-gray-600">
              Know your TB risk instantly with our checklist.
            </p>
          </div>
          <div className="p-4 md:p-6 bg-white rounded-2xl shadow">
            <h3 className="text-base sm:text-lg md:text-lg font-bold text-green-700">💻 Teleconsult</h3>
            <p className="mt-2 text-xs sm:text-sm md:text-sm text-gray-600">
              Talk to a doctor online without leaving your home.
            </p>
          </div>
          <div className="p-4 md:p-6 bg-white rounded-2xl shadow">
            <h3 className="text-base sm:text-lg md:text-lg font-bold text-green-700">📂 E-Records</h3>
            <p className="mt-2 text-xs sm:text-sm md:text-sm text-gray-600">
              Keep your medical history safe and accessible anytime.
            </p>
          </div>
          <div className="p-4 md:p-6 bg-white rounded-2xl shadow">
            <h3 className="text-base sm:text-lg md:text-lg font-bold text-green-700">📅 Appointments</h3>
            <p className="mt-2 text-xs sm:text-sm md:text-sm text-gray-600">
              Book visits and consultations with ease.
            </p>
          </div>
        </div>
      </section>

      {/* ✅ Educational Facts */}
      <section className="py-6 md:py-10 px-4 md:px-6 bg-white text-center">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-green-700">
          Did You Know? 🤔
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mt-6 md:mt-8 max-w-5xl mx-auto">
          <div className="p-3 md:p-6 bg-green-50 rounded-2xl shadow text-xs sm:text-sm md:text-base">
            🦠 TB spreads through the air when someone coughs or sneezes.
          </div>
          <div className="p-3 md:p-6 bg-green-50 rounded-2xl shadow text-xs sm:text-sm md:text-base">
            ⏱ Early detection and treatment saves lives.
          </div>
          <div className="p-3 md:p-6 bg-green-50 rounded-2xl shadow text-xs sm:text-sm md:text-base">
            🇳🇬 Nigeria has the highest TB burden in Africa.
          </div>
        </div>
      </section>

      {/* ✅ Logout Button */}
      <div className="flex justify-center py-4 md:py-6 px-4">
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 md:px-6 py-2 rounded-lg hover:bg-red-600 text-sm md:text-base font-medium"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Home;
