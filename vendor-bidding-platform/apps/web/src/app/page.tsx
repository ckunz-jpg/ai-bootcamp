'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function Home() {
  const router = useRouter();
  const { user, token } = useAuthStore();

  useEffect(() => {
    if (token && user) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [token, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Vendor Bidding Platform</h1>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
