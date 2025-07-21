// components/Footer.tsx
export default function Footer() {
  return (
    <div>
    <footer className="w-full mt-auto py-4 text-center text-sm text-gray-600 bg-gray-200">
      &copy; {new Date().getFullYear()} B's Spelling Bee Organizer. All rights reserved.
    </footer></div>
  );
}
