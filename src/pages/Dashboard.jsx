// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";

const API_BASE = "http://localhost:4000";

async function apiGet(path, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
}

async function apiPost(path, body, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body || {}),
  });
  return res.json();
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [role, setRole] = useState(localStorage.getItem("role") || "");
  const [email, setEmail] = useState(localStorage.getItem("email") || "");
  const [token, setToken] = useState(localStorage.getItem("token") || "");

  const [activeTab, setActiveTab] = useState("");

  const [globalMessage, setGlobalMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // --------- BORROWER STATE ----------
  const [borrowForm, setBorrowForm] = useState({
    fullName: "",
    income: "",
    employmentStatus: "",
    creditScore: "",
    requestedAmount: "",
    tenureMonths: "",
    purpose: "",
  });
  const [myLoans, setMyLoans] = useState([]);
  const [emiMonthsInput, setEmiMonthsInput] = useState({}); // loanId -> months

  // --------- LENDER STATE ----------
  const [pendingApps, setPendingApps] = useState([]);
  const [approvedLoans, setApprovedLoans] = useState([]);
  const [interestInputs, setInterestInputs] = useState({}); // loanId -> rate

  // --------- ADMIN STATE ----------
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminLoans, setAdminLoans] = useState([]);

  // --------- ANALYST STATE ----------
  const [analytics, setAnalytics] = useState(null);

  // --------- INIT ---------
  useEffect(() => {
    if (!token || !role) {
      navigate("/login");
      return;
    }

    if (role === "borrower") setActiveTab("borrow-apply");
    else if (role === "lender") setActiveTab("lender-pending");
    else if (role === "admin") setActiveTab("admin-users");
    else if (role === "analyst") setActiveTab("analyst-summary");
  }, [role, token, navigate]);

  // Fetch data when activeTab changes
  useEffect(() => {
    if (!token || !role || !activeTab) return;

    const run = async () => {
      try {
        setGlobalMessage("");
        if (role === "borrower" && activeTab === "borrow-loans") {
          setLoading(true);
          const data = await apiGet("/api/borrower/my-loans", token);
          if (data.success) setMyLoans(data.loans || []);
          else setGlobalMessage(data.message || "Failed to load loans");
          setLoading(false);
        }

        if (role === "lender" && activeTab === "lender-pending") {
          setLoading(true);
          const data = await apiGet("/api/lender/applications", token);
          if (data.success) setPendingApps(data.applications || []);
          else setGlobalMessage(data.message || "Failed to load applications");
          setLoading(false);
        }

        if (role === "lender" && activeTab === "lender-approved") {
          setLoading(true);
          const data = await apiGet("/api/lender/approved-loans", token);
          if (data.success) setApprovedLoans(data.loans || []);
          else setGlobalMessage(data.message || "Failed to load loans");
          setLoading(false);
        }

        if (role === "admin" && activeTab === "admin-users") {
          setLoading(true);
          const data = await apiGet("/api/admin/users", token);
          if (data.success) setAdminUsers(data.users || []);
          else setGlobalMessage(data.message || "Failed to load users");
          setLoading(false);
        }

        if (role === "admin" && activeTab === "admin-loans") {
          setLoading(true);
          const data = await apiGet("/api/admin/loans", token);
          if (data.success) setAdminLoans(data.loans || []);
          else setGlobalMessage(data.message || "Failed to load loans");
          setLoading(false);
        }

        if (role === "analyst" && activeTab === "analyst-summary") {
          setLoading(true);
          const data = await apiGet("/api/analyst/summary", token);
          if (data.success) setAnalytics(data);
          else setGlobalMessage(data.message || "Failed to load analytics");
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        setGlobalMessage("Server error while loading data");
        setLoading(false);
      }
    };

    run();
  }, [role, activeTab, token]);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("email");
    localStorage.removeItem("userId");
    navigate("/login");
  }

  // ------------ BORROWER HANDLERS ------------
  async function handleBorrowFormSubmit(e) {
    e.preventDefault();
    setGlobalMessage("");

    const {
      fullName,
      income,
      employmentStatus,
      creditScore,
      requestedAmount,
      tenureMonths,
      purpose,
    } = borrowForm;

    if (
      !fullName ||
      !income ||
      !employmentStatus ||
      !creditScore ||
      !requestedAmount ||
      !tenureMonths
    ) {
      alert("All fields are required");
      return;
    }

    try {
      setLoading(true);
      const data = await apiPost(
        "/api/borrower/application",
        {
          fullName,
          income: Number(income),
          employmentStatus,
          creditScore: Number(creditScore),
          requestedAmount: Number(requestedAmount),
          tenureMonths: Number(tenureMonths),
          purpose,
        },
        token
      );

      if (!data.success) {
        setGlobalMessage(data.message || "Failed to submit application");
      } else {
        setGlobalMessage("Application submitted successfully");
        setBorrowForm({
          fullName: "",
          income: "",
          employmentStatus: "",
          creditScore: "",
          requestedAmount: "",
          tenureMonths: "",
          purpose: "",
        });
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setGlobalMessage("Server error while submitting application");
      setLoading(false);
    }
  }

  async function handlePayEmi(loanId) {
    const months = Number(emiMonthsInput[loanId] || 0);
    if (!months || months < 1) {
      alert("Enter how many months you are paying");
      return;
    }

    try {
      setLoading(true);
      const data = await apiPost(
        `/api/borrower/loans/${loanId}/pay-emi`,
        { monthsToPay: months },
        token
      );
      if (!data.success) {
        setGlobalMessage(data.message || "Failed to record EMI payment");
      } else {
        setGlobalMessage("EMI payment recorded");
        setMyLoans((prev) =>
          prev.map((l) => (l._id === loanId ? data.loan : l))
        );
        setEmiMonthsInput((prev) => ({ ...prev, [loanId]: "" }));
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setGlobalMessage("Server error while paying EMI");
      setLoading(false);
    }
  }

  // ------------ LENDER HANDLERS ------------
  async function handleApproveApplication(appId) {
    const rate = Number(interestInputs[appId] || 12);
    if (!rate || rate <= 0) {
      alert("Enter a valid interest rate");
      return;
    }

    try {
      setLoading(true);
      const data = await apiPost(
        `/api/lender/applications/${appId}/approve`,
        { interestRate: rate },
        token
      );
      if (!data.success) {
        setGlobalMessage(data.message || "Failed to approve application");
      } else {
        setGlobalMessage("Application approved");
        // Remove from pending list
        setPendingApps((prev) => prev.filter((a) => a._id !== appId));
        // Optionally refresh approved list if on that tab
        if (activeTab === "lender-approved") {
          const ref = await apiGet("/api/lender/approved-loans", token);
          if (ref.success) setApprovedLoans(ref.loans || []);
        }
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setGlobalMessage("Server error while approving application");
      setLoading(false);
    }
  }

  // ---------------- RENDER HELPERS ----------------
  function renderBorrowerApply() {
    return (
      <div>
        <h2 className="section-title">Apply for a Loan</h2>
        <form className="form-grid" onSubmit={handleBorrowFormSubmit}>
          <div className="form-row">
            <label>Full Name</label>
            <input
              type="text"
              value={borrowForm.fullName}
              onChange={(e) =>
                setBorrowForm({ ...borrowForm, fullName: e.target.value })
              }
            />
          </div>

          <div className="form-row">
            <label>Monthly Income</label>
            <input
              type="number"
              value={borrowForm.income}
              onChange={(e) =>
                setBorrowForm({ ...borrowForm, income: e.target.value })
              }
            />
          </div>

          <div className="form-row">
            <label>Employment Status</label>
            <input
              type="text"
              placeholder="Salaried / Self-employed / etc."
              value={borrowForm.employmentStatus}
              onChange={(e) =>
                setBorrowForm({
                  ...borrowForm,
                  employmentStatus: e.target.value,
                })
              }
            />
          </div>

          <div className="form-row">
            <label>Credit Score</label>
            <input
              type="number"
              value={borrowForm.creditScore}
              onChange={(e) =>
                setBorrowForm({ ...borrowForm, creditScore: e.target.value })
              }
            />
          </div>

          <div className="form-row">
            <label>Requested Amount</label>
            <input
              type="number"
              value={borrowForm.requestedAmount}
              onChange={(e) =>
                setBorrowForm({
                  ...borrowForm,
                  requestedAmount: e.target.value,
                })
              }
            />
          </div>

          <div className="form-row">
            <label>Tenure (months)</label>
            <input
              type="number"
              value={borrowForm.tenureMonths}
              onChange={(e) =>
                setBorrowForm({
                  ...borrowForm,
                  tenureMonths: e.target.value,
                })
              }
            />
          </div>

          <div className="form-row">
            <label>Purpose</label>
            <textarea
              rows={3}
              value={borrowForm.purpose}
              onChange={(e) =>
                setBorrowForm({ ...borrowForm, purpose: e.target.value })
              }
            />
          </div>

          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit Application"}
          </button>
        </form>
      </div>
    );
  }

  function renderBorrowerLoans() {
    return (
      <div>
        <h2 className="section-title">My Loans & EMI Payments</h2>
        {loading && <p>Loading...</p>}
        {!loading && myLoans.length === 0 && (
          <p className="muted-text">No loans found.</p>
        )}

        {myLoans.length > 0 && (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Loan ID</th>
                  <th>Amount</th>
                  <th>Tenure</th>
                  <th>Risk</th>
                  <th>Status</th>
                  <th>Interest %</th>
                  <th>Monthly EMI</th>
                  <th>Remaining Tenure</th>
                  <th>Remaining Principal</th>
                  <th>Pay EMI</th>
                </tr>
              </thead>
              <tbody>
                {myLoans.map((loan) => (
                  <tr key={loan._id}>
                    <td>{loan._id.slice(-6)}</td>
                    <td>{loan.requestedAmount}</td>
                    <td>{loan.tenureMonths}</td>
                    <td>{loan.riskScore}</td>
                    <td>{loan.status}</td>
                    <td>{loan.interestRate || "-"}</td>
                    <td>{loan.monthlyEmi || "-"}</td>
                    <td>{loan.remainingTenure ?? "-"}</td>
                    <td>
                      {loan.remainingPrincipal != null
                        ? loan.remainingPrincipal.toFixed(2)
                        : "-"}
                    </td>
                    <td>
                      {loan.status === "approved" &&
                      loan.remainingTenure &&
                      loan.remainingTenure > 0 ? (
                        <div className="emi-pay-row">
                          <input
                            type="number"
                            min={1}
                            max={loan.remainingTenure}
                            placeholder="Months"
                            value={emiMonthsInput[loan._id] || ""}
                            onChange={(e) =>
                              setEmiMonthsInput((prev) => ({
                                ...prev,
                                [loan._id]: e.target.value,
                              }))
                            }
                          />
                          <button
                            className="secondary-btn"
                            type="button"
                            onClick={() => handlePayEmi(loan._id)}
                          >
                            Pay
                          </button>
                        </div>
                      ) : (
                        <span className="muted-text">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {myLoans.map(
          (loan) =>
            loan.payments &&
            loan.payments.length > 0 && (
              <details key={loan._id + "-payments"} className="payments-block">
                <summary>
                  Payment History for Loan {loan._id.slice(-6)}
                </summary>
                <table className="data-table nested-table">
                  <thead>
                    <tr>
                      <th>Paid Amount</th>
                      <th>Months Covered</th>
                      <th>Paid At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loan.payments.map((p, idx) => (
                      <tr key={idx}>
                        <td>{p.amount}</td>
                        <td>{p.monthsPaid}</td>
                        <td>{new Date(p.paidAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )
        )}
      </div>
    );
  }

  function renderLenderPending() {
    return (
      <div>
        <h2 className="section-title">Pending Applications</h2>
        {loading && <p>Loading...</p>}
        {!loading && pendingApps.length === 0 && (
          <p className="muted-text">No pending applications.</p>
        )}
        {pendingApps.length > 0 && (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Loan ID</th>
                  <th>Borrower</th>
                  <th>Email</th>
                  <th>Amount</th>
                  <th>Tenure</th>
                  <th>Income</th>
                  <th>Credit Score</th>
                  <th>Risk Score</th>
                  <th>Interest %</th>
                  <th>Approve</th>
                </tr>
              </thead>
              <tbody>
                {pendingApps.map((app) => (
                  <tr key={app._id}>
                    <td>{app._id.slice(-6)}</td>
                    <td>{app.borrowerName}</td>
                    <td>{app.borrowerEmail}</td>
                    <td>{app.requestedAmount}</td>
                    <td>{app.tenureMonths}</td>
                    <td>{app.income}</td>
                    <td>{app.creditScore}</td>
                    <td>{app.riskScore}</td>
                    <td>
                      <input
                        type="number"
                        className="small-input"
                        placeholder="12"
                        value={interestInputs[app._id] || ""}
                        onChange={(e) =>
                          setInterestInputs((prev) => ({
                            ...prev,
                            [app._id]: e.target.value,
                          }))
                        }
                      />
                    </td>
                    <td>
                      <button
                        className="primary-btn small-btn"
                        type="button"
                        onClick={() => handleApproveApplication(app._id)}
                      >
                        Approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function renderLenderApproved() {
    return (
      <div>
        <h2 className="section-title">Approved Loans & EMI History</h2>
        {loading && <p>Loading...</p>}
        {!loading && approvedLoans.length === 0 && (
          <p className="muted-text">No approved loans.</p>
        )}

        {approvedLoans.length > 0 && (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Loan ID</th>
                  <th>Borrower</th>
                  <th>Email</th>
                  <th>Amount</th>
                  <th>Tenure</th>
                  <th>Interest %</th>
                  <th>Monthly EMI</th>
                  <th>Remaining Tenure</th>
                  <th>Remaining Principal</th>
                </tr>
              </thead>
              <tbody>
                {approvedLoans.map((loan) => (
                  <tr key={loan._id}>
                    <td>{loan._id.slice(-6)}</td>
                    <td>{loan.borrowerName}</td>
                    <td>{loan.borrowerEmail}</td>
                    <td>{loan.requestedAmount}</td>
                    <td>{loan.tenureMonths}</td>
                    <td>{loan.interestRate}</td>
                    <td>{loan.monthlyEmi}</td>
                    <td>{loan.remainingTenure ?? "-"}</td>
                    <td>
                      {loan.remainingPrincipal != null
                        ? loan.remainingPrincipal.toFixed(2)
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {approvedLoans.map(
          (loan) =>
            loan.payments &&
            loan.payments.length > 0 && (
              <details key={loan._id + "-payments"} className="payments-block">
                <summary>
                  Payment History for Loan {loan._id.slice(-6)}
                </summary>
                <table className="data-table nested-table">
                  <thead>
                    <tr>
                      <th>Paid Amount</th>
                      <th>Months Covered</th>
                      <th>Paid At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loan.payments.map((p, idx) => (
                      <tr key={idx}>
                        <td>{p.amount}</td>
                        <td>{p.monthsPaid}</td>
                        <td>{new Date(p.paidAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )
        )}
      </div>
    );
  }

  function renderAdminUsers() {
    return (
      <div>
        <h2 className="section-title">All Users</h2>
        {loading && <p>Loading...</p>}
        {!loading && adminUsers.length === 0 && (
          <p className="muted-text">No users found.</p>
        )}
        {adminUsers.length > 0 && (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.map((u) => (
                  <tr key={u._id}>
                    <td>{u._id.slice(-6)}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>{new Date(u.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function renderAdminLoans() {
    return (
      <div>
        <h2 className="section-title">All Loans</h2>
        {loading && <p>Loading...</p>}
        {!loading && adminLoans.length === 0 && (
          <p className="muted-text">No loans found.</p>
        )}
        {adminLoans.length > 0 && (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Loan ID</th>
                  <th>Borrower</th>
                  <th>Email</th>
                  <th>Amount</th>
                  <th>Tenure</th>
                  <th>Status</th>
                  <th>Risk</th>
                  <th>Interest %</th>
                  <th>Monthly EMI</th>
                </tr>
              </thead>
              <tbody>
                {adminLoans.map((loan) => (
                  <tr key={loan._id}>
                    <td>{loan._id.slice(-6)}</td>
                    <td>{loan.borrowerName}</td>
                    <td>{loan.borrowerEmail}</td>
                    <td>{loan.requestedAmount}</td>
                    <td>{loan.tenureMonths}</td>
                    <td>{loan.status}</td>
                    <td>{loan.riskScore}</td>
                    <td>{loan.interestRate || "-"}</td>
                    <td>{loan.monthlyEmi || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function renderAnalystSummary() {
    return (
      <div>
        <h2 className="section-title">Risk & Portfolio Analytics</h2>
        {loading && <p>Loading...</p>}
        {!loading && !analytics && (
          <p className="muted-text">No analytics available.</p>
        )}
        {analytics && (
          <div className="analytics-grid">
            <div className="stat-card">
              <h3>Total Loans</h3>
              <p>{analytics.totalLoans}</p>
            </div>
            <div className="stat-card">
              <h3>Total Principal (All)</h3>
              <p>{analytics.totalPrincipal}</p>
            </div>
            <div className="stat-card">
              <h3>Total Approved Principal</h3>
              <p>{analytics.totalApprovedPrincipal}</p>
            </div>
            <div className="stat-card">
              <h3>Average Risk Score</h3>
              <p>{analytics.avgRiskScore.toFixed(2)}</p>
            </div>

            <div className="stat-card full-row">
              <h3>Loans by Status</h3>
              {analytics.byStatus &&
                Object.entries(analytics.byStatus).map(([k, v]) => (
                  <p key={k}>
                    <strong>{k}:</strong> {v}
                  </p>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------- MAIN RENDER ----------------
  let content = null;

  if (role === "borrower") {
    if (activeTab === "borrow-apply") content = renderBorrowerApply();
    if (activeTab === "borrow-loans") content = renderBorrowerLoans();
  }

  if (role === "lender") {
    if (activeTab === "lender-pending") content = renderLenderPending();
    if (activeTab === "lender-approved") content = renderLenderApproved();
  }

  if (role === "admin") {
    if (activeTab === "admin-users") content = renderAdminUsers();
    if (activeTab === "admin-loans") content = renderAdminLoans();
  }

  if (role === "analyst") {
    if (activeTab === "analyst-summary") content = renderAnalystSummary();
  }

  return (
    <div className="dashboard-root">
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <div>
            <h1 className="dash-title">Loan Decision Dashboard</h1>
            <p className="dash-subtitle">
              Logged in as <strong>{role.toUpperCase()}</strong> ({email})
            </p>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </header>

        <div className="dashboard-body">
          <aside className="dashboard-sidebar">
            {role === "borrower" && (
              <ul className="menu-list">
                <li
                  className={
                    activeTab === "borrow-apply" ? "menu-item active" : "menu-item"
                  }
                  onClick={() => setActiveTab("borrow-apply")}
                >
                  Apply Loan
                </li>
                <li
                  className={
                    activeTab === "borrow-loans" ? "menu-item active" : "menu-item"
                  }
                  onClick={() => setActiveTab("borrow-loans")}
                >
                  My Loans & EMI
                </li>
              </ul>
            )}

            {role === "lender" && (
              <ul className="menu-list">
                <li
                  className={
                    activeTab === "lender-pending"
                      ? "menu-item active"
                      : "menu-item"
                  }
                  onClick={() => setActiveTab("lender-pending")}
                >
                  Pending Applications
                </li>
                <li
                  className={
                    activeTab === "lender-approved"
                      ? "menu-item active"
                      : "menu-item"
                  }
                  onClick={() => setActiveTab("lender-approved")}
                >
                  Approved Loans & EMI
                </li>
              </ul>
            )}

            {role === "admin" && (
              <ul className="menu-list">
                <li
                  className={
                    activeTab === "admin-users" ? "menu-item active" : "menu-item"
                  }
                  onClick={() => setActiveTab("admin-users")}
                >
                  Users
                </li>
                <li
                  className={
                    activeTab === "admin-loans" ? "menu-item active" : "menu-item"
                  }
                  onClick={() => setActiveTab("admin-loans")}
                >
                  Loans
                </li>
              </ul>
            )}

            {role === "analyst" && (
              <ul className="menu-list">
                <li
                  className={
                    activeTab === "analyst-summary"
                      ? "menu-item active"
                      : "menu-item"
                  }
                  onClick={() => setActiveTab("analyst-summary")}
                >
                  Analytics
                </li>
              </ul>
            )}
          </aside>

          <main className="dashboard-main">
            {globalMessage && (
              <div className="global-message">{globalMessage}</div>
            )}
            {content}
          </main>
        </div>
      </div>
    </div>
  );
}
