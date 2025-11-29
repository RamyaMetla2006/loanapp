// server.js
import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

import User from "./models/User.js";
import LoanApplication from "./models/LoanApplication.js";

dotenv.config();

const app = express();

// ---------- MANUAL CORS ----------
app.use((req, res, next) => {
  // Allow all origins (fine here, we don't use cookies)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// JSON body parser
app.use(express.json());

// Simple logger
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.path}`);
  next();
});

const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key";
const PORT = process.env.PORT || 5000;

// -------------------- DB CONNECTION --------------------
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("Mongo error:", err.message));

// -------------------- AUTH MIDDLEWARE --------------------
function auth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token)
    return res.status(401).json({ success: false, message: "No token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ success: false, message: "Forbidden for this role" });
    }
    next();
  };
}

// -------------------- AUTH ROUTES --------------------

// Signup
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { role, email, password } = req.body;

    if (!role || !email || !password) {
      return res.json({ success: false, message: "All fields required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.json({ success: false, message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({ role, email, passwordHash });

    return res.json({
      success: true,
      message: "Signup successful. Please login.",
      userId: user._id,
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { role, email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.json({ success: false, message: "User not found" });

    if (user.role !== role)
      return res.json({ success: false, message: "Role mismatch" });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match)
      return res.json({ success: false, message: "Incorrect password" });

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      role: user.role,
      email: user.email,
      userId: user._id,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------- BORROWER ROUTES --------------------

// Create loan application + risk analysis
app.post(
  "/api/borrower/application",
  auth,
  requireRole("borrower"),
  async (req, res) => {
    try {
      const {
        fullName,
        income,
        employmentStatus,
        creditScore,
        requestedAmount,
        tenureMonths,
        purpose,
      } = req.body;

      if (
        !fullName ||
        !income ||
        !employmentStatus ||
        !creditScore ||
        !requestedAmount ||
        !tenureMonths
      ) {
        return res.json({
          success: false,
          message: "All fields are required",
        });
      }

      const incomeNum = Number(income);
      const creditScoreNum = Number(creditScore);
      const amountNum = Number(requestedAmount);
      const tenureNum = Number(tenureMonths);

      // Simple "analysis" logic
      const incomeScore = Math.min(incomeNum / 1000, 50); // up to 50 points
      const creditScoreNorm = Math.max(Math.min(creditScoreNum, 900), 300);
      const creditScoreScore = ((creditScoreNorm - 300) / 600) * 50; // up to 50

      const riskScore = Math.round(incomeScore + creditScoreScore); // 0–100

      const application = await LoanApplication.create({
        borrower: req.user.id,
        borrowerName: fullName,
        borrowerEmail: req.user.email,
        income: incomeNum,
        employmentStatus,
        creditScore: creditScoreNum,
        requestedAmount: amountNum,
        tenureMonths: tenureNum,
        purpose,
        riskScore,
        status: "pending",
      });

      return res.json({
        success: true,
        message: "Application submitted and analysed",
        application,
      });
    } catch (err) {
      console.error("Borrower application error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// Get all loans of logged-in borrower
app.get(
  "/api/borrower/my-loans",
  auth,
  requireRole("borrower"),
  async (req, res) => {
    try {
      const loans = await LoanApplication.find({ borrower: req.user.id })
        .sort({ createdAt: -1 })
        .lean();

      res.json({ success: true, loans });
    } catch (err) {
      console.error("Borrower my loans error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// Pay EMI for a loan
app.post(
  "/api/borrower/loans/:id/pay-emi",
  auth,
  requireRole("borrower"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { monthsToPay } = req.body;

      const monthsNum = Number(monthsToPay);
      if (!monthsNum || monthsNum < 1) {
        return res.json({
          success: false,
          message: "monthsToPay must be at least 1",
        });
      }

      const loan = await LoanApplication.findById(id);
      if (!loan) {
        return res.json({ success: false, message: "Loan not found" });
      }

      if (loan.borrower.toString() !== req.user.id) {
        return res
          .status(403)
          .json({ success: false, message: "Not your loan" });
      }

      if (loan.status !== "approved") {
        return res.json({
          success: false,
          message: "Only approved loans can be paid",
        });
      }

      if (!loan.monthlyEmi || !loan.remainingTenure) {
        return res.json({
          success: false,
          message: "Loan EMI details not available",
        });
      }

      const monthsApplied = Math.min(monthsNum, loan.remainingTenure);
      const amountPaid = loan.monthlyEmi * monthsApplied;

      // Very simple principal reduction approximation
      if (!loan.principal) {
        loan.principal = loan.requestedAmount;
      }
      if (loan.remainingPrincipal == null) {
        loan.remainingPrincipal = loan.principal;
      }

      const principalPerMonth = loan.principal / loan.tenureMonths;
      const principalReduction = principalPerMonth * monthsApplied;

      loan.remainingTenure -= monthsApplied;
      loan.remainingPrincipal = Math.max(
        0,
        loan.remainingPrincipal - principalReduction
      );

      if (loan.remainingTenure <= 0) {
        loan.remainingTenure = 0;
        loan.remainingPrincipal = 0;
        loan.status = "closed";
      }

      loan.payments.push({
        amount: amountPaid,
        monthsPaid: monthsApplied,
        paidBy: req.user.id,
      });

      await loan.save();

      res.json({
        success: true,
        message: "EMI payment recorded",
        loan,
      });
    } catch (err) {
      console.error("Pay EMI error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// -------------------- LENDER ROUTES --------------------

// Get all pending applications
app.get(
  "/api/lender/applications",
  auth,
  requireRole("lender"),
  async (req, res) => {
    try {
      const applications = await LoanApplication.find({ status: "pending" })
        .sort({ createdAt: -1 })
        .lean();

      res.json({ success: true, applications });
    } catch (err) {
      console.error("Get applications error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// Approve application with interest rate
app.post(
  "/api/lender/applications/:id/approve",
  auth,
  requireRole("lender"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { interestRate } = req.body;

      const rate = Number(interestRate) || 12; // default 12% annual
      const appDoc = await LoanApplication.findById(id);
      if (!appDoc)
        return res.json({ success: false, message: "Application not found" });

      const P = appDoc.requestedAmount;
      const n = appDoc.tenureMonths;
      const r = rate / 12 / 100; // monthly rate

      let emi;
      if (r === 0) {
        emi = P / n;
      } else {
        const pow = Math.pow(1 + r, n);
        emi = (P * r * pow) / (pow - 1);
      }

      appDoc.status = "approved";
      appDoc.approvedBy = req.user.id;
      appDoc.approvedAt = new Date();
      appDoc.interestRate = rate;
      appDoc.monthlyEmi = Math.round(emi * 100) / 100;
      appDoc.principal = P;
      appDoc.remainingPrincipal = P;
      appDoc.remainingTenure = n;

      await appDoc.save();

      res.json({
        success: true,
        message: "Application approved",
        application: appDoc,
      });
    } catch (err) {
      console.error("Approve application error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// Get approved loans + EMI info (for lender)
app.get(
  "/api/lender/approved-loans",
  auth,
  requireRole("lender"),
  async (req, res) => {
    try {
      const loans = await LoanApplication.find({ status: "approved" })
        .sort({ createdAt: -1 })
        .lean();

      res.json({ success: true, loans });
    } catch (err) {
      console.error("Lender approved loans error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// -------------------- ADMIN ROUTES --------------------

app.get(
  "/api/admin/users",
  auth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const users = await User.find({})
        .select("-passwordHash")
        .sort({ createdAt: -1 })
        .lean();

      res.json({ success: true, users });
    } catch (err) {
      console.error("Admin users error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

app.get(
  "/api/admin/loans",
  auth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const loans = await LoanApplication.find({})
        .sort({ createdAt: -1 })
        .lean();

      res.json({ success: true, loans });
    } catch (err) {
      console.error("Admin loans error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// -------------------- ANALYST ROUTES --------------------
app.get(
  "/api/analyst/summary",
  auth,
  requireRole("analyst"),
  async (req, res) => {
    try {
      const totalLoans = await LoanApplication.countDocuments({});
      const loans = await LoanApplication.find({}).lean();

      let totalPrincipal = 0;
      let totalApprovedPrincipal = 0;
      let totalRisk = 0;
      let riskCount = 0;
      const byStatus = {};

      for (const l of loans) {
        totalPrincipal += l.requestedAmount || 0;
        if (l.status === "approved" || l.status === "closed") {
          totalApprovedPrincipal += l.requestedAmount || 0;
        }
        if (typeof l.riskScore === "number") {
          totalRisk += l.riskScore;
          riskCount += 1;
        }
        byStatus[l.status] = (byStatus[l.status] || 0) + 1;
      }

      const avgRiskScore = riskCount ? totalRisk / riskCount : 0;

      res.json({
        success: true,
        totalLoans,
        totalPrincipal,
        totalApprovedPrincipal,
        avgRiskScore,
        byStatus,
      });
    } catch (err) {
      console.error("Analyst summary error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// -------------------- ROOT --------------------
app.get("/", (req, res) => {
  res.send("Loan App Backend Running");
});

// -------------------- START SERVER --------------------
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
