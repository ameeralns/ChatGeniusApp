import { useState, useRef, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface NavbarContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onSignOut: () => Promise<void>;
}

function NavbarContextMenu({ x, y, onClose, onSignOut }: NavbarContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 50
      }}
      className="bg-[#18191C] rounded-lg shadow-lg py-2 min-w-[220px]"
    >
      <button
        onClick={onSignOut}
        className="w-full px-3 py-2 text-left text-red-500 hover:bg-red-500 hover:text-white"
      >
        Sign Out
      </button>
    </div>
  );
}

export default function Navbar() {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const { signOut } = useAuth();
  const router = useRouter();

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    setContextMenu({
      x: rect.left,
      y: rect.bottom + 5
    });
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setContextMenu(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="h-12 bg-[#1E1F22] border-b border-[#1E1F22] flex items-center justify-between px-4">
      <div className="flex items-center">
        <span className="text-white font-semibold text-lg">ChatGenius</span>
      </div>
      
      <button
        onClick={handleSettingsClick}
        className="text-[#949BA4] hover:text-white transition-colors"
      >
        <Settings className="w-5 h-5" />
      </button>

      {contextMenu && (
        <NavbarContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onSignOut={handleSignOut}
        />
      )}
    </nav>
  );
} 