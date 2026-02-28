import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styles/Auth.css";

export default function Signup() {
  const navigate = useNavigate();

  const [role, setRole] = useState("borrower");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSignup(e) {
    e.preventDefault();

    if (!role || !email || !password) {
      return alert("All fields are required");
    }

    try {
      const res = await fetch("http://localhost:4000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, email, password }),
      });

      const data = await res.json();
      if (!data.success) {
        return alert(data.message || "Signup failed");
      }

      alert("Signup successful. Please login.");
      navigate("/login");
    } catch (err) {
      console.error(err);
      alert("Server error. Please try again.");
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Sign Up</h2>

        <form className="auth-form" onSubmit={handleSignup}>
          <label className="auth-label">Role</label>
          <select
            className="auth-input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="borrower">Borrower</option>
            <option value="lender">Lender</option>
            <option value="analyst">Financial Analyst</option>
            <option value="admin">Admin</option>
          </select>

          <label className="auth-label">Email</label>
          <input
            className="auth-input"
            type="email"
            value={email}
            placeholder="you@example.com"
            onChange={(e) => setEmail(e.target.value)}
          />

          <label className="auth-label">Password</label>
          <input
            className="auth-input"
            type="password"
            value={password}
            placeholder="Create a strong password"
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="auth-button" type="submit">
            Create Account
          </button>
        </form>

        <p className="auth-footer-text">
          Already have an account?{" "}
          <Link to="/login" className="auth-link">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
