// components/Footer.tsx
export default function Footer() {
  return (
    <div>
    <footer className="w-full mt-auto py-4 text-center text-sm text-gray-500 bg-gray-100">
      &copy; {new Date().getFullYear()} B's Spelling Bee Organizer. All rights reserved.
    </footer></div>
  );
}
