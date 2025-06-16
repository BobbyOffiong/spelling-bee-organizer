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
  await fetch('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setLoading(false);
  router.push('/auth/login');
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

const handleInstallClick = async () => {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();

  const choiceResult = await deferredPrompt.userChoice;
  if (choiceResult.outcome === 'accepted') {
    console.log('🎉 User accepted the install prompt');
  } else {
    console.log('👋 User dismissed the install prompt');
  }

  setDeferredPrompt(null);
};

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

    {/* Install Button */}
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
   {/* Footer at the bottom */}
    <Footer />
  </div>
);

}
