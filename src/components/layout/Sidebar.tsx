import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Lightbulb,
  Upload,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/insights', icon: Lightbulb, label: 'Insights' },
  { to: '/upload', icon: Upload, label: 'Upload' },
];

const activeStyle = {
  backgroundColor: '#0F2732',
  color: 'white',
  borderLeft: '3px solid #10B981',
};

const inactiveStyle = {
  borderLeft: '3px solid transparent',
};

const Sidebar = () => {
  return (
    <aside className="w-56 h-screen bg-sidebar flex flex-col overflow-y-auto">

      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <h1 className="text-white text-lg font-bold tracking-wide">SpendLens</h1>
        <p className="text-white/40 text-xs uppercase tracking-widest mt-0.5">Personal Finance</p>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => isActive ? activeStyle : inactiveStyle}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'text-white'
                  : 'text-white/60 hover:bg-sidebar-hover hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} style={{ color: isActive ? 'white' : undefined }} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User profile */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: '#0d9488' }}
          >
            R
          </div>
          <div>
            <p className="text-white text-sm font-medium">Rahul Sharma</p>
            <p className="text-white/40 text-xs">Premium Member</p>
          </div>
        </div>
      </div>

    </aside>
  );
};

export default Sidebar;