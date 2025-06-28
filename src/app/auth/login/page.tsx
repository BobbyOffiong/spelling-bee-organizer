// pages/auth/login.tsx
'use client';

import { useState, useEffect } from 'react';
// import { signIn } from 'next-auth/react'; // <-- REMOVE THIS IMPORT
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import Footer from '@/components/Footer';
import toast, { Toaster } from 'react-hot-toast'; // Import Toaster

// --- Firebase Imports ---
import { auth } from '@/lib/firebaseConfig'; // Adjust path as needed
import { signInWithEmailAndPassword } from 'firebase/auth'; // Import Firebase Auth method


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // --- Firebase Authentication: Sign In ---
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('User logged in successfully:', userCredential.user);
      toast.success('Logged in successfully!');
      router.push('/dashboard'); // Redirect to dashboard after successful login
    } catch (error: any) { // Catch potential FirebaseError or other errors
      console.error('Login error:', error);
      // Directly check for error.code as Firebase errors will have it
      if (error.code) { // This indicates it's likely a Firebase error
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential': // More generic for recent Firebase SDKs
            toast.error('Invalid email or password. Please try again.');
            break;
          case 'auth/invalid-email':
            toast.error('Please enter a valid email address.');
            break;
          case 'auth/user-disabled':
            toast.error('Your account has been disabled. Please contact support.');
            break;
          case 'auth/too-many-requests':
            toast.error('Too many unsuccessful login attempts. Please try again later.');
            break;
          default:
            toast.error(error.message || 'An unexpected error occurred during login.');
            break;
        }
      } else {
        // Handle non-Firebase errors (e.g., network issues)
        toast.error('A network error occurred. Please check your internet connection.');
      }
    } finally {
      setLoading(false); // Always stop loading, regardless of success or failure
    }
  };


  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={`flex flex-col min-h-screen bg-green-50
      transition-opacity duration-1000 relative overflow-hidden
      ${ mounted ? "opacity-100" : "opacity-0"
        }`}>

      <svg className="absolute top-5 z-10 w-full h-60" viewBox="0 0 800 100">
        <path
          id="curve"
          d="M 66,150 A 390,200 0 0,1 660,98"
          fill="transparent"
        />
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
          onSubmit={handleLogin}
          className="bg-white px-8 py-10 rounded-xl shadow-xl w-100 animate-fade-in"
        >
          <Toaster /> {/* Toaster should be here to display toasts */}
          <h1 className="text-3xl font-bold text-green-700 mb-5
          text-center">LOGIN</h1>


          <input
            type="email"
            placeholder="Email"
            className="w-full mb-4 px-3 py-2 border-b-2 border-green-400
            focus:outline-none focus:border-green-600 transition-all
            text-gray-500"
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
            disabled={loading}
            className={`w-full bg-gradient-to-r from-green-500 to-teal-400
              text-white py-2 rounded-full shadow-md transition-all duration-300
              ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-lg hover:scale-105 cursor-pointer'}`}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
                Logging in...
              </div>
            ) : (
              'LOGIN'
            )}
          </button>

          <p className="text-sm text-center text-gray-500 mt-6">
            Don't have an account?{" "}
            <Link href="/auth/signup" className="text-green-600 font-medium hover:underline">
              Sign up
            </Link>
          </p>

        </form>
      </div>
      {/* Footer at the bottom */}
      <Footer />
    </div>
  );
}

{/*OLD CODE
'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from "lucide-react"; // optional, if using lucide icons
import Link from "next/link";
import Footer from '@/components/Footer';
import toast from 'react-hot-toast'; // Ensure react-hot-toast is installed and accessible

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  const res = await signIn('credentials', {
    redirect: false,
    email,
    password,
  });

  setLoading(false);

  {/*OLD CODE
  if (!res?.error) {
    router.push('/dashboard');
  } else {
    alert('Login failed');
  }
}; *

if (!res?.error) {
      // Login successful, redirect to dashboard
      router.push('/dashboard');
      toast.success('Logged in successfully!'); // Optional: success toast
    } else {
      // Login failed, display error using react-hot-toast for consistency
      console.error('Login failed:', res.error); // Log the actual error for debugging
      let errorMessage = 'Login failed. Please check your credentials.';

      // NextAuth.js sends error messages in res.error.
      // You can make these more specific based on the error string returned by NextAuth
      // from your authorize function (e.g., 'No user found with that email', 'Invalid password')
      if (res.error === 'No user found with that email') {
        errorMessage = 'No account found with this email.';
      } else if (res.error === 'Invalid password') {
        errorMessage = 'Incorrect password.';
      } else if (res.error === 'CredentialsSignin') { // Generic error for credentials provider
        errorMessage = 'Invalid email or password.';
      }
      // Add more specific checks if your authorize function throws other specific error messages

      toast.error(errorMessage);
    }
  };


  useEffect(() => {
      setMounted(true);
    }, []);

  return (
     <div className={`flex flex-col min-h-screen bg-green-50 
    transition-opacity duration-1000 relative overflow-hidden 
    ${ mounted ? "opacity-100" : "opacity-0"
      }`}>

<svg className="absolute top-5 z-10 w-full h-60" viewBox="0 0 800 100">
  <path
    id="curve"
    d="M 66,150 A 390,200 0 0,1 660,98"
    fill="transparent"
  />
  <text fill="#047857" fontSize="35" fontWeight="bold">
    <textPath href="#curve" startOffset="57%" textAnchor="middle">
       B's SPELLING BEE ORGANIZER
    </textPath>
  </text>
</svg>

 {/* Main Content *
    <div
      className={"flex flex-1 items-center justify-center"}
    >

      <form
        onSubmit={handleLogin}
        className="bg-white px-8 py-10 rounded-xl shadow-xl w-100 animate-fade-in"
      >
        <h1 className="text-3xl font-bold text-green-700 mb-5
        text-center">LOGIN</h1>
        

        <input
          type="email"
          placeholder="Email"
          className="w-full mb-4 px-3 py-2 border-b-2 border-green-400 
          focus:outline-none focus:border-green-600 transition-all
          text-gray-500"
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
  disabled={loading}
  className={`w-full bg-gradient-to-r from-green-500 to-teal-400 
    text-white py-2 rounded-full shadow-md transition-all duration-300 
    ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-lg hover:scale-105 cursor-pointer'}`}
>
  {loading ? (
    <div className="flex items-center justify-center gap-2">
      <svg
        className="animate-spin h-5 w-5 text-white"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        ></path>
      </svg>
      Logging in...
    </div>
  ) : (
    'LOGIN'
  )}
</button>

<p className="text-sm text-center text-gray-500 mt-6">
          Don't have an account?{" "}
          <Link href="/auth/signup" className="text-green-600 font-medium hover:underline">
    Sign up
  </Link>
        </p>

      </form>
    </div>
    {/* Footer at the bottom *
        <Footer />
        </div>
  );
}
*/}