import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="placeholder-page">
      <h1>404</h1>
      <p className="placeholder-note">
        Page not found. <Link to="/dashboard">Back to Dashboard</Link>
      </p>
    </div>
  );
}
