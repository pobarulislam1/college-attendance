"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import ProtectedRoute from "@/lib/ProtectedRoute";
import Header from "@/lib/Header";
import PageTitle from "@/lib/PageTitle";

const yearOptions = {
  "ইন্টারমিডিয়েট": ["১ম বর্ষ", "২য় বর্ষ"],
  "অনার্স": ["১ম বর্ষ", "২য় বর্ষ", "৩য় বর্ষ", "৪র্থ বর্ষ"],
  "মাস্টার্স": ["১ম বর্ষ", "২য় বর্ষ"],
};

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [roll, setRoll] = useState("");
  const [level, setLevel] = useState("ইন্টারমিডিয়েট");
  const [year, setYear] = useState("১ম বর্ষ");
  const [department, setDepartment] = useState("");
  const [justAdded, setJustAdded] = useState(null);

  function handleLevelChange(newLevel) {
    setLevel(newLevel);
    setYear(yearOptions[newLevel][0]);
  }

  async function handleAddStudent(e) {
    e.preventDefault();
    if (!name.trim() || !roll.trim()) {
      alert("নাম এবং রোল নম্বর দুটোই দিন");
      return;
    }
    await addDoc(collection(db, "students"), {
      name: name.trim(),
      roll: roll.trim(),
      level,
      year,
      department: department.trim() || "—",
      createdAt: serverTimestamp(),
    });
    setJustAdded(name.trim());
    setName("");
    setRoll("");
    setDepartment("");
  }

  return (
    <ProtectedRoute>
      <Header />
      <PageTitle>নতুন শিক্ষার্থী যোগ করুন</PageTitle>
      <main className="ledger-wrap">
        <div className="card-box" style={{ maxWidth: 480, margin: "0 auto" }}>
          {justAdded && (
            <p
              style={{
                background: "var(--success-bg)",
                color: "var(--success)",
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 14,
                marginTop: 0,
              }}
            >
              ✓ {justAdded} যোগ করা হয়েছে।{" "}
              <span
                style={{ textDecoration: "underline", cursor: "pointer" }}
                onClick={() => router.push("/students")}
              >
                তালিকায় দেখুন
              </span>
            </p>
          )}
          <form onSubmit={handleAddStudent} style={{ display: "grid", gap: 12 }}>
            <input
              className="field-input"
              placeholder="নাম"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="field-input"
              placeholder="রোল নম্বর"
              value={roll}
              onChange={(e) => setRoll(e.target.value)}
            />
            <select
              className="field-select"
              value={level}
              onChange={(e) => handleLevelChange(e.target.value)}
            >
              <option>ইন্টারমিডিয়েট</option>
              <option>অনার্স</option>
              <option>মাস্টার্স</option>
            </select>
            <select className="field-select" value={year} onChange={(e) => setYear(e.target.value)}>
              {yearOptions[level].map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
            <input
              className="field-input"
              placeholder="বিভাগ / শ্রেণি"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
            <button type="submit" className="btn-primary">
              শিক্ষার্থী যোগ করুন
            </button>
          </form>
        </div>
      </main>
    </ProtectedRoute>
  );
}