import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth, formatFullName, cleanText } from '../store/authContext';
import { 
  LayoutDashboard, Shirt, Package, ShoppingCart, Bookmark,
  Hammer, Truck, Receipt, Landmark, Banknote, BarChart3, History, ShieldCheck, LogOut 
} from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { logout, isAdmin, user } = useAuth();

  const links = [
    { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { to: '/stocks', label: 'Achats Matières Premières', icon: Package },
    { to: '/production', label: 'Confection', icon: Hammer },
    { to: '/catalogue', label: 'Catalogue', icon: Shirt },
    { to: '/reservations', label: 'Réservations', icon: Bookmark },
    { to: '/commandes', label: 'Ventes & Commandes', icon: ShoppingCart },
    { to: '/livraisons', label: 'Livraisons', icon: Truck },
    { to: '/depenses', label: 'Dépenses', icon: Receipt },
    { to: '/remunerations', label: 'Rémunérations', icon: Landmark, adminOnly: true },
    { to: '/caisse', label: 'Caisse', icon: Banknote },
    { to: '/rapports', label: 'Rapports', icon: BarChart3, adminOnly: true },
    { to: '/journal-activite', label: "Journal d'activité", icon: History, adminOnly: true },
    { to: '/utilisateurs', label: 'Utilisateurs', icon: ShieldCheck, adminOnly: true },
  ];

  const activeStyle = "flex items-center space-x-3 px-4 py-3 rounded-lg bg-gold-600 text-white font-medium shadow-lg shadow-gold-600/20 transition-all duration-300";
  const inactiveStyle = "flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-400 hover:text-gold-400 hover:bg-slate-800 transition-all duration-200";

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800/80 flex flex-col justify-between transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      
      {/* Top Brand Logo */}
      <div>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/80">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-gold-300 via-gold-400 to-gold-600">
              SUIVI BROCARD
            </span>
          </div>
          <button onClick={toggleSidebar} className="md:hidden text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        {/* Scrollable Navigation Links */}
        <nav className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-140px)]">
          {links.map((link) => {
            if (link.adminOnly && !isAdmin) return null;
            const Icon = link.icon;
            return (
              <NavLink 
                key={link.to} 
                to={link.to}
                onClick={() => {
                  if (window.innerWidth < 768) toggleSidebar();
                }}
                className={({ isActive }) => isActive ? activeStyle : inactiveStyle}
              >
                <Icon size={18} />
                <span className="text-sm">{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom User Action */}
      <div className="p-4 border-t border-slate-800/80 space-y-4">
        {user && (
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60 flex flex-col space-y-1.5">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Administration</span>
            <span className={`w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isAdmin ? 'bg-gold-950/80 text-gold-400 border border-gold-800/30' : 'bg-slate-800 text-slate-300'}`}>
              {isAdmin ? 'Admin' : 'Vendeur'}
            </span>
            <div className="pt-1">
              <p className="text-sm font-semibold text-white tracking-wide">
                {formatFullName(user.first_name, user.last_name, user.username)}
              </p>
              <p className="text-xs text-slate-400 truncate mt-0.5" title={cleanText(user.email)}>
                {cleanText(user.email)}
              </p>
            </div>
          </div>
        )}
        <button 
          onClick={logout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-rose-400 hover:text-white hover:bg-rose-950/40 transition-all duration-200"
        >
          <LogOut size={18} />
          <span className="text-sm font-semibold">Se déconnecter</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
