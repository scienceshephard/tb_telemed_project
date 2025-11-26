import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute Component
 * Guards routes so they can only be accessed by authenticated users with the correct role
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The component to render if authorized
 * @param {Object} props.token - The authentication token object containing user info
 * @param {string|string[]} props.requiredRole - The role(s) required to access this route
 * @param {boolean} props.isLoading - Whether data is still loading
 * 
 * @returns {React.ReactNode} The protected component or a redirect to login
 */
const ProtectedRoute = ({ children, token, requiredRole, isLoading = false }) => {
  // If still loading initial auth state, show loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // If no token, redirect to login
  if (!token || !token.user) {
    console.warn('⚠️ Unauthorized access attempt - no valid token');
    return <Navigate to="/login" replace />;
  }

  // If requiredRole is specified, check if user has the correct role
  if (requiredRole) {
    const userRole = token.user?.user_metadata?.role;
    const rolesArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

    if (!rolesArray.includes(userRole)) {
      console.warn(`⚠️ Unauthorized role - user is ${userRole}, required: ${rolesArray.join(' or ')}`);
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="p-8 bg-white rounded-lg shadow-md max-w-md text-center">
            <div className="text-red-600 text-4xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You don't have permission to access this page. 
              Please log in with the correct account.
            </p>
            <a
              href="/login"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Go to Login
            </a>
          </div>
        </div>
      );
    }
  }

  // User is authenticated and has correct role (if required)
  return children;
};

export default ProtectedRoute;
