import { LineChart, Spade, Swords } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

export function SiteLayout() {
  const location = useLocation();
  const onArena = location.pathname.startsWith("/arena");

  return (
    <div className={onArena ? "site site-arena" : "site"}>
      <nav className="site-nav">
        <div className="site-nav-inner">
          <div className="site-brand">
            <span className="site-brand-mark">
              <LineChart size={18} />
            </span>
            <span className="site-brand-name">Markable</span>
          </div>
          <div className="site-links">
            <NavLink to="/" end className="site-link">
              <Spade size={16} />
              Trainer
            </NavLink>
            <NavLink to="/arena" className="site-link">
              <Swords size={16} />
              Quant Arena
            </NavLink>
          </div>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}
