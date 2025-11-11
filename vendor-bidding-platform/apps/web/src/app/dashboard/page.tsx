'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, fetchUser, logout } = useAuthStore();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    const init = async () => {
      await fetchUser();
      fetchProjects();
    };

    init();
  }, [token, router]);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Vendor Bidding Platform
            </h1>
            <p className="text-sm text-gray-600">
              Welcome, {user.firstName} {user.lastName} ({user.role.replace('_', ' ')})
            </p>
          </div>
          <button onClick={handleLogout} className="btn btn-outline">
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {user.role === 'PROPERTY_MANAGER' ? 'Your Projects' : 'Available Projects'}
          </h2>

          {loading ? (
            <p>Loading projects...</p>
          ) : projects.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-500 mb-4">
                {user.role === 'PROPERTY_MANAGER'
                  ? "You haven't created any projects yet."
                  : 'No projects available for bidding at the moment.'}
              </p>
              {user.role === 'PROPERTY_MANAGER' && (
                <p className="text-sm text-gray-600">
                  Create a property first, then add projects to request vendor bids.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project: any) => (
                <div key={project.id} className="card">
                  <h3 className="font-semibold text-lg mb-2">{project.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{project.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded">
                      {project.type}
                    </span>
                    <span className="text-gray-500">
                      {project._count?.bids || 0} bids
                    </span>
                  </div>
                  {project.budget && (
                    <p className="mt-2 text-sm font-medium">
                      Budget: ${project.budget.toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="card">
            <h3 className="text-sm font-medium text-gray-600">Total Projects</h3>
            <p className="text-3xl font-bold mt-2">{projects.length}</p>
          </div>
          <div className="card">
            <h3 className="text-sm font-medium text-gray-600">
              {user.role === 'PROPERTY_MANAGER' ? 'Total Bids Received' : 'Bids Submitted'}
            </h3>
            <p className="text-3xl font-bold mt-2">-</p>
          </div>
          <div className="card">
            <h3 className="text-sm font-medium text-gray-600">Active</h3>
            <p className="text-3xl font-bold mt-2">
              {projects.filter((p: any) => p.status === 'OPEN').length}
            </p>
          </div>
        </div>

        {/* Next Steps */}
        <div className="card mt-8">
          <h3 className="font-semibold text-lg mb-4">Getting Started</h3>
          {user.role === 'PROPERTY_MANAGER' ? (
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Add your properties in the Properties section</li>
              <li>Create a project for vendor bidding</li>
              <li>Review and accept bids from vendors</li>
              <li>Communicate with vendors through the messaging system</li>
            </ol>
          ) : (
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Browse available projects</li>
              <li>Submit your bid with pricing and timeline</li>
              <li>Wait for property manager approval</li>
              <li>Communicate with property managers</li>
            </ol>
          )}
        </div>
      </main>
    </div>
  );
}
