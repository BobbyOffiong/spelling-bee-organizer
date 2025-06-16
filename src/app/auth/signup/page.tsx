'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from "lucide-react"; // optional, if using lucide icons
import Link from "next/link";
import Footer from '@/components/Footer';
import InstallButton from '@/components/InstallButton';


export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

   const [mounted, setMounted] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  await fetch('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setLoading(false);
  router.push('/auth/login');
};

useEffect(() => {
  setMounted(true); // your fade-in effect
}, []);

return (
  <div className={`flex flex-col min-h-screen bg-green-50 
    transition-opacity duration-1000 relative overflow-hidden 
    ${ mounted ? "opacity-100" : "opacity-0"
      }`}>
    
    {/* Curve Title */}
    <svg className="absolute top-5 z-10 w-full h-60" viewBox="0 0 800 100">
      <path id="curve" d="M 66,150 A 390,200 0 0,1 660,98" fill="transparent" />
      <text fill="#047857" fontSize="35" fontWeight="bold">
        <textPath href="#curve" startOffset="57%" textAnchor="middle">
          B's SPELLING BEE ORGANIZER
        </textPath>
      </text>
    </svg>

    {/* Main Content */}
    <div
      className={"flex flex-1 items-center justify-center"}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white px-8 py-10 rounded-xl shadow-xl w-100 animate-fade-in"
      >
        <h1 className="text-3xl font-bold text-green-700 mb-5 text-center">Sign up</h1>

        <input
          type="email"
          placeholder="Email"
          className="w-full mb-4 px-3 py-2 border-b-2 border-green-400 
          focus:outline-none focus:border-green-600 transition-all text-gray-500"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="relative mb-6">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            className="w-full px-3 py-2 border-b-2 border-green-400 
            text-gray-500 focus:outline-none pr-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-2 top-2 text-green-500"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-green-500 to-teal-400 
          text-white py-2 rounded-full shadow-md hover:shadow-lg 
          cursor-pointer transition-all duration-300 hover:scale-105"
        >
          {loading ? "Signing up..." : "Sign up"}
        </button>

        <p className="text-sm text-center text-gray-500 mt-6">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-green-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </form>

 <InstallButton />

    </div>

    {/* Footer at the bottom */}
    <Footer />
  </div>
);

}
