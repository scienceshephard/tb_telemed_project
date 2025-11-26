import React, { useState } from "react";
import { supabase } from "../client";
import { Link, useNavigate } from "react-router-dom";

const Login = ({ token, setToken }) => {
  let navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });


  function handleChange(event) {
    setFormData((prevFormData) => {
      return {
        ...prevFormData,
        [event.target.name]: event.target.value,
      };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        alert(error.message);
        return;
      }

      setToken(data);
      

      const role = data.user?.user_metadata?.role;

      if (role === "patient") {
        // check if patient profile exists
        const { data: patientProfile, error: profileError } = await supabase
          .from("patient_profiles")
          .select("user_id")
          .eq("user_id", data.user.id)
          .single();

        if (profileError || !patientProfile) {
          // No profile → redirect to profile form
          navigate("/patient/patientprofile");
        } else {
          // Profile exists → redirect to home
          navigate("/patient/home");
        }
      } else if (role === "doctor") {
        navigate("/doctor/home");
      } else {
        alert("Invalid role. Please contact support.");
        await supabase.auth.signOut();
        navigate("/login");
      }

      // navigate("/homepage"); // redirect after login
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-6 bg-white rounded-2xl shadow-md">
        <h2 className="text-2xl font-semibold text-center text-green-600 mb-6">
          Login
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            placeholder="Email"
            name="email"
            onChange={handleChange}
            value={formData.email}
            required
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
          />

          <input
            placeholder="Password"
            type="password"
            name="password"
            onChange={handleChange}
            value={formData.password}
            required
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
          />

          <button
            type="submit"
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Submit
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Don’t have an account?{" "}
          <Link
            to="/SignUpPatient"
            className="text-green-600 hover:text-green-700 font-medium"
          >
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
