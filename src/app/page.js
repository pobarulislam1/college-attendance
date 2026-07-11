"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import ProtectedRoute from "@/lib/ProtectedRoute";
import Header from "@/lib/Header";
import PageTitle from "@/lib/PageTitle";

const yearOptions = {
  "ইন্টারমিডিয়েট": ["১ম বর্ষ", "২য় বর্ষ"],
  "অনার্স": ["১ম বর্ষ", "২য় বর্ষ", "৩য় বর্ষ", "৪র্থ বর্ষ"],
  "মাস্টার্স": ["১ম বর্ষ", "২য় বর্ষ"],
};

export default function Home() {
  const [name, setName] = useState("");
  const [roll, setRoll] = useState("");
  const [level, setLevel] = useState("ইন্টারমিডিয়েট");
  const [year, setYear] = useState("১ম বর্ষ");
  const [department, setDepartment] = useState("");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadStudents() {
    setLoading(true);
    const snapshot = await getDocs(collection(db, "students"));
    const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setStudents(list);
    setLoading(false);
  }

  useEffect(() => {
    loadStudents();
  }, []);

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
    setName("");
    setRoll("");
    setDepartment("");
    loadStudents();
  }

  return (
    <ProtectedRoute>
      <Header />
      <PageTitle>শিক্ষার্থী তালিকা</PageTitle>
      <main className="ledger-wrap">
        <div className="card-box">
          <h2 style={{ fontSize: 17, marginTop: 0 }}>নতুন শিক্ষার্থী যোগ করুন</h2>
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

        <div className="card-box">
          <h2 style={{ fontSize: 17, marginTop: 0 }}>মোট {students.length} জন শিক্ষার্থী</h2>
          {loading ? (
            <p style={{ color: "var(--ink-soft)" }}>লোড হচ্ছে...</p>
          ) : (
            <div className="id-card-grid">
              {students.map((s) => (
                <div key={s.id} className="id-card">
                  <div className="id-body">
                    <QRCodeSVG value={`ATTEND:${s.roll}`} size={70} />
                    <div>
                      <div className="name">{s.name}</div>
                      <div className="meta">
                        রোল: <b>{s.roll}</b>
                        <br />
                        {s.level} {s.year ? `· ${s.year}` : ""}
                        <br />
                        {s.department}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}