import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-content">
        <div className="app-content-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
