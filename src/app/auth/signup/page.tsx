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
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null); // Stores the PWA install event
  // Removed showInstallButton state, as the button will now always be visible

  // DEBUGGING: Log state changes (kept for general debugging)
  useEffect(() => {
    console.log('deferredPrompt state:', deferredPrompt);
  }, [deferredPrompt]);


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

  // Handler for the PWA install button click
  const handleInstallClick = async () => {
    console.log('Download App button clicked.');
    if (deferredPrompt) {
      console.log('Attempting to prompt PWA installation...');
      deferredPrompt.prompt(); // Show the browser's install prompt
      const { outcome } = await deferredPrompt.userChoice; // Wait for user's choice
      if (outcome === 'accepted') {
        toast.success('App installed successfully!');
        console.log('PWA installation accepted.');
      } else {
        toast('App installation dismissed. Maybe later?');
        console.log('PWA installation dismissed.');
      }
      setDeferredPrompt(null); // Clear the prompt after use, as it's a one-time use
      // No need to hide button, as it's always visible, but its function changes
    } else {
      // Fallback message if the prompt is not available (e.g., not yet fired, or browser doesn't support)
      toast("🧭 To install, use your browser's menu: 'Install app' or 'Add to Home Screen'.");
      console.log('deferredPrompt is null. Cannot trigger prompt programmatically. Guiding user to manual install.');
    }
  };

  useEffect(() => {
    console.log('useEffect in SignUpPage is running.'); // DEBUGGING: Confirm useEffect runs
    setMounted(true);

    // Event listener for the 'beforeinstallprompt' event
    const beforeInstallPromptHandler = (e: Event) => {
      e.preventDefault(); // Prevent the mini-infobar from appearing on mobile
      setDeferredPrompt(e); // Stash the event so it can be triggered later
      // No longer setting showInstallButton to true here, as the button is always visible
      toast('Install app for a better experience!', { duration: 5000, icon: '📱' });
      console.log('✅ beforeinstallprompt event captured. deferredPrompt set.');
    };

    // Event listener for when the PWA is actually installed
    const appInstalledHandler = () => {
      // No need to hide button, but can update its text or disable it if desired
      toast.success('App is now installed!');
      console.log('🎉 PWA appinstalled event fired!');
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', beforeInstallPromptHandler);
    window.addEventListener('appinstalled', appInstalledHandler);

    // Safari iOS fallback (manual install guide) - Keep this as iOS handles PWA installation differently
    const isSafari = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);
    if (isSafari) {
      // This toast is shown immediately on Safari to guide users
      toast(
        '📲 On iOS, tap the Share icon and choose "Add to Home Screen" to install this app.',
        {
          duration: 8000,
          icon: '🍏',
          style: {
            borderRadius: '10px',
            background: '#ffffff',
            color: '#047857',
          },
        }
      );
    }

    // Cleanup function for event listeners
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstallPromptHandler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []); // Empty dependency array means this runs once on mount

  return (
    <div className={`flex flex-col min-h-screen bg-green-50
      transition-opacity duration-1000 relative overflow-hidden
      ${ mounted ? "opacity-100" : "opacity-0"
        }`}>

      <Toaster /> {/* Global Toaster at the top level of the component */}

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

            {/* Install Button - Always rendered */}
            <button
              type="button"
              onClick={handleInstallClick} // Use the new handler
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
