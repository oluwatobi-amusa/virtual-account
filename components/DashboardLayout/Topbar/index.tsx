'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BiMenu } from 'react-icons/bi';
import { ChevronRight } from 'lucide-react';

interface TopBarProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}
export default function TopBar({ onToggleSidebar, isSidebarOpen }: TopBarProps) {
  const pathname = usePathname();
  const module = pathname.startsWith('/dashboard/merchants')
    ? 'Merchants'
    : pathname.startsWith('/dashboard/disputes')
      ? 'Disputes'
      : 'Overview';
  return (
    <nav className="flex h-[64px] items-center gap-3 border-b border-gray-200 bg-white px-4 lg:ml-60">
      <button
        type="button"
        aria-label="Toggle navigation"
        aria-expanded={isSidebarOpen}
        onClick={onToggleSidebar}
        className="rounded-md p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
      >
        <BiMenu size={20} />
      </button>
      <Link href="/dashboard" className="text-sm text-gray-500">
        Virtual Accounts
      </Link>
      <ChevronRight size={14} className="text-gray-400" />
      <span className="text-sm font-medium text-gray-900">{module}</span>
    </nav>
  );
}
