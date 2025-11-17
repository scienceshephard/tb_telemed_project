import React, { useState } from "react";
import { Link, Outlet } from "react-router-dom";

const PatientDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile menu button - Shows hamburger or X based on state */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-transparent hover:bg-gray-200/50 transition-colors rounded-lg"
        aria-label={sidebarOpen ? "Close menu" : "Open menu"}
      >
        {sidebarOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 transition-transform duration-300 fixed md:static w-80 h-screen bg-white flex flex-col border-r border-gray-200 z-40`}
      >
        <div className="p-6 pb-8">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-green-500 rounded-sm"></div>
            <h1 className="text-2xl font-semibold text-gray-800">TBcare</h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-4 space-y-1 flex-1">
          <Link
            to="home"
            onClick={() => setSidebarOpen(false)}
            className="block py-2 px-4 hover:bg-blue-100 rounded transition"
          >
            🏠 Home
          </Link>
          <Link
            to="patientprofile"
            onClick={() => setSidebarOpen(false)}
            className="block py-2 px-4 hover:bg-blue-100 rounded transition"
          >
            👤 Profile
          </Link>
          <Link
            to="symptomchecklist"
            onClick={() => setSidebarOpen(false)}
            className="block py-2 px-4 hover:bg-blue-100 rounded transition"
          >
            ❓ Symptom Checklist
          </Link>
          <Link
            to="labresults"
            onClick={() => setSidebarOpen(false)}
            className="block py-2 px-4 hover:bg-blue-100 rounded transition"
          >
            🧪 Lab Results
          </Link>
          <Link
            to="patientbookappointment"
            onClick={() => setSidebarOpen(false)}
            className="block py-2 px-4 hover:bg-blue-100 rounded transition"
          >
            💼 Book Appointment
          </Link>
          <Link
            to="teleconsultation"
            onClick={() => setSidebarOpen(false)}
            className="block py-2 px-4 hover:bg-blue-100 rounded transition"
          >
            📹 Teleconsultation
          </Link>
          <Link
            to="erecord"
            onClick={() => setSidebarOpen(false)}
            className="block py-2 px-4 hover:bg-blue-100 rounded transition"
          >
            📄 E-Record
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 md:py-6">
          <h2 className="text-xl md:text-3xl font-bold text-gray-900">TB Patient Portal</h2>
          <p className="text-gray-500 mt-1 text-sm md:text-base">Manage your health with ease</p>
        </div>

        {/* Nested page will render here */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-transparent md:hidden z-30"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default PatientDashboard;
