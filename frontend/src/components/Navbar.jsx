import React from 'react';
import { useAuth, formatFullName, cleanText } from '../store/authContext';
import { Menu, User, ShieldAlert } from 'lucide-react';

const Navbar = ({ toggleSidebar }) => {
  const { user, isAdmin } = useAuth();

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between px-6 sticky top-0 z-40">
      
      {/* Left section: Hamburger & Breadcrumb */}
      <div className="flex items-center space-x-4">
        <button 
          onClick={toggleSidebar} 
          className="text-slate-400 hover:text-white md:hidden"
        >
          <Menu size={22} />
        </button>
        <div className="hidden sm:flex items-center space-x-2">
          <span className="text-slate-500 text-sm">Suivi Brocard</span>
          <span className="text-slate-500">/</span>
          <span className="text-gold-400 text-sm font-medium">Administration</span>
        </div>
      </div>

      {/* Right section: Profile info */}
      <div className="flex items-center space-x-4">
        
        {/* Role Badge */}
        {user && (
          <span className={`px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${isAdmin ? 'bg-gold-950 text-gold-400 border border-gold-800/50' : 'bg-slate-800 text-slate-300'}`}>
            {isAdmin ? (
              <>
                <ShieldAlert size={12} />
                Admin
              </>
            ) : (
              'Vendeur'
            )}
          </span>
        )}

        {/* User Info & Avatar */}
        <div className="flex items-center space-x-3 pl-4 border-l border-slate-800">
          <div className="text-right hidden md:block mr-2">
            <p className="text-sm font-semibold text-slate-100">
              {user ? formatFullName(user.first_name, user.last_name, user.username) : 'Invité'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {user ? cleanText(user.email) : 'Non connecté'}
            </p>
          </div>
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-gold-500 to-gold-700 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-gold-600/10">
            {user ? user.username.substring(0, 2).toUpperCase() : <User size={16} />}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
