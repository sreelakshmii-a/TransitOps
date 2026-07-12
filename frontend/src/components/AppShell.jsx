import { Outlet } from "react-router-dom";
import NavBar from "./NavBar";

export default function AppShell() {
  return (
    <div className="app-shell">
      <NavBar />
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
