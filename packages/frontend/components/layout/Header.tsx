'use client';

import { Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 px-4 sm:px-6">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        aria-label="Toggle menu"
      >
        <Menu className="h-6 w-6" />
      </button>
      <div className="flex flex-1 items-center gap-4">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
          Admin Dashboard
        </h2>
      </div>
      <div className="flex items-center gap-4">
        {/* Dark mode toggle can be added here */}
        <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600"></div>
      </div>
    </header>
  );
}

