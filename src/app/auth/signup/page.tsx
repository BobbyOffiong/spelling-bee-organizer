// pages/auth/signup.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import Footer from '@/components/Footer';
import toast, { Toaster } from 'react-hot-toast'; // Import Toaster

// --- Firebase Imports ---
import { auth } from '@/lib/firebaseConfig'; // Adjust path as needed based on your project structure
import { createUserWithEmailAndPassword } from 'firebase/auth'; // Import Firebase Auth methods and FirebaseError type


export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // --- Firebase Authentication: Create User ---
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('User signed up successfully:', userCredential.user);
      toast.success('Account created successfully!');
      router.push('/dashboard'); // Redirect to dashboard after successful signup
    } catch (error: any) { // 'any' for now, as we don't import FirebaseError type
      console.error('Signup error:', error);
      // Directly check for error.code as Firebase errors will have it
      if (error.code) { // This indicates it's likely a Firebase error
        switch (error.code) {
          case 'auth/email-already-in-use':
            toast.error('This email is already registered. Please sign in or use a different email.');
            break;
          case 'auth/invalid-email':
            toast.error('Please enter a valid email address.');
            break;
          case 'auth/weak-password':
            toast.error('Password is too weak. It should be at least 6 characters.');
            break;
          default:
            toast.error(error.message || 'An unexpected error occurred during signup.');
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

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      console.log('✅ beforeinstallprompt event captured');
      setDeferredPrompt(e); // Save it for manual trigger
    };

    // ✅ iOS Safari fallback (manual install guide)
    const isSafari = typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    if (isSafari) {
      toast(
        '📲 Tap the Share icon and choose "Add to Home Screen" to install this app.',
        {
          duration: 8000,
          icon: '📱',
          style: {
            borderRadius: '10px',
            background: '#ffffff',
            color: '#047857',
          },
        }
      );
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);


  return (
    <div className={`flex flex-col min-h-screen bg-green-50
      transition-opacity duration-1000 relative overflow-hidden
      ${ mounted ? "opacity-100" : "opacity-0"
        }`}>

      {/* Curve Title */}
      <svg className="absolute top-1 z-10 w-full h-60" viewBox="0 0 800 100">
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
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            {/* Sign up Form */}
            <form
              onSubmit={handleSubmit}
              className="bg-white px-8 py-10 rounded-xl shadow-xl w-96 animate-fade-in"
            >
              <Toaster /> {/* Toaster should be here to display toasts */}
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
                disabled={loading} // Disable button when loading
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

            {/* Install Button */}
            <button
              type="button"
              onClick={() => {
                if (deferredPrompt) {
                  deferredPrompt.prompt();
                  deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => { // Type choiceResult
                    if (choiceResult.outcome === 'accepted') {
                      toast.success("App installed!");
                    } else {
                      toast("Maybe later?");
                    }
                    setDeferredPrompt(null);
                  });
                } else if (typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent)) { // Add typeof navigator !== 'undefined'
                  toast(
                    '📲 On iOS, tap the Share icon and choose "Add to Home Screen".',
                    {
                      duration: 8000,
                      icon: '🍏',
                    }
                  );
                } else {
                  toast("🧭 Your browser might not support app install prompts.");
                }
              }}
              className="bg-gradient-to-r from-green-500 to-teal-400 mt-5
                text-white py-2 rounded-full shadow-md hover:shadow-lg
                cursor-pointer transition-all duration-300 hover:scale-105 w-57
                text-center text-xl"
            >
              📲 Download The App
            </button>
          </div>
        </div>
      </div>
      {/* Footer at the bottom */}
      <Footer />
    </div>
  );
}

{/*OLD 
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from "lucide-react"; // optional, if using lucide icons
import Link from "next/link";
import Footer from '@/components/Footer';
import toast from 'react-hot-toast';


export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json(); // Always parse JSON to get the message

      if (response.ok) { // Status is 2xx (e.g., 201 Created)
        toast.success(data.message || 'Signup successful!');
        // Only redirect to login after successful registration
        router.push('/auth/login');
      } else {
        // Handle specific error messages from your API
        if (response.status === 400) {
          toast.error(data.message || 'Please provide both email and password.');
        } else if (response.status === 409) {
          toast.error(data.message || 'User with this email already exists.');
        } else {
          // Catch-all for other server errors (e.g., 500)
          toast.error(data.message || 'An unexpected error occurred. Please try again.');
        }
      }
    } catch (error) {
      // This catches network errors or issues with the fetch request itself
      console.error('Network error during signup:', error);
      toast.error('A network error occurred. Please check your internet connection.');
    } finally {
      setLoading(false); // Always stop loading, regardless of success or failure
    }
  };

useEffect(() => {
  setMounted(true);

  const handleBeforeInstallPrompt = (e: any) => {
  e.preventDefault();
  console.log('✅ beforeinstallprompt event captured');
  setDeferredPrompt(e); // Save it for manual trigger
};

  // ✅ iOS Safari fallback (manual install guide)
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  if (isSafari) {
    toast(
      '📲 Tap the Share icon and choose "Add to Home Screen" to install this app.',
      {
        duration: 8000,
        icon: '📱',
        style: {
          borderRadius: '10px',
          background: '#ffffff',
          color: '#047857',
        },
      }
    );
  }

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

  return () => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  };
}, []);


return (
  <div className={`flex flex-col min-h-screen bg-green-50 
    transition-opacity duration-1000 relative overflow-hidden 
    ${ mounted ? "opacity-100" : "opacity-0"
      }`}>
    
    {/* Curve Title *
    <svg className="absolute top-1 z-10 w-full h-60" viewBox="0 0 800 100">
      <path id="curve" d="M 66,150 A 390,200 0 0,1 660,98" fill="transparent" />
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
      <div className="flex flex-1 items-center justify-center">
  <div className="flex flex-col items-center space-y-4">
    
  
  {/* Sign up Form *
    <form
      onSubmit={handleSubmit}
      className="bg-white px-8 py-10 rounded-xl shadow-xl w-96 animate-fade-in"
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

    {/* Install Button *
    <button
       type="button"
  onClick={() => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          toast.success("App installed!");
        } else {
          toast("Maybe later?");
        }
        setDeferredPrompt(null);
      });
    } else if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      toast(
        '📲 On iOS, tap the Share icon and choose "Add to Home Screen".',
        {
          duration: 8000,
          icon: '🍏',
        }
      );
    } else {
      toast("🧭 Your browser might not support app install prompts.");
    }
  }}
      className="bg-gradient-to-r from-green-500 to-teal-400 mt-5
        text-white py-2 rounded-full shadow-md hover:shadow-lg 
        cursor-pointer transition-all duration-300 hover:scale-105 w-57
         text-center text-xl"
    >
      📲 Download The App
    </button>
  </div>
</div>
  </div>

   {/* Footer at the bottom *
    <Footer />
  </div>
);

}
CODE*/}