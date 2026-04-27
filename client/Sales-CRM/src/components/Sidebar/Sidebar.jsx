import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const navItems = [
  { key: 'dashboard', label: 'Dashboard', to: '/dashboard' },
  { key: 'leads', label: 'Leads', to: '/leads' },
  { key: 'employees', label: 'Employees', to: '/employees' },
  { key: 'settings', label: 'Settings', to: '/settings' },
];

const Sidebar = () => {
  return (
    <aside className="sidebar" id="sidebar">
      <div className="sidebar-logo">
        <h1>Canova<span className="logo-accent">CRM</span></h1>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.key}
            to={item.to}
            className={({ isActive }) => `nav-link nav-link--${item.key} ${isActive ? 'active' : ''}`}
            id={`nav-${item.key}`}
          >
            <span className="nav-link-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer"></div>
    </aside>
  );
};

export default Sidebar;
