"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import ProtectedRoute from "@/lib/ProtectedRoute";
import Header from "@/lib/Header";
import PageTitle from "@/lib/PageTitle";

const yearOptions = {
  "ইন্টারমিডিয়েট": ["১ম বর্ষ", "২য় বর্ষ"],
  "অনার্স": ["১ম বর্ষ", "২য় বর্ষ", "৩য় বর্ষ", "৪র্থ বর্ষ"],
  "মাস্টার্স": ["১ম বর্ষ", "২য় বর্ষ"],
};

const groupOptions = ["Science", "Arts", "Commerce"];

const subjectList = [
  "Bangla",
  "English",
  "Economics",
  "Political Science",
  "History",
  "Philosophy",
  "Sociology",
  "Management",
  "Accounting",
  "Marketing",
  "Finance",
  "Physics",
  "Chemistry",
  "Mathematics",
  "Botany",
  "Zoology",
  "Psychology",
  "Geography",
  "Other",
];

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [roll, setRoll] = useState("");
  const [level, setLevel] = useState("ইন্টারমিডিয়েট");
  const [year, setYear] = useState("১ম বর্ষ");
  const [group, setGroup] = useState("Science");
  const [subject, setSubject] = useState("Bangla");
  const [customSubject, setCustomSubject] = useState("");
  const [justAdded, setJustAdded] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isIntermediate = level === "ইন্টারমিডিয়েট";

  function handleLevelChange(newLevel) {
    setLevel(newLevel);
    setYear(yearOptions[newLevel][0]);
  }

  async function handleAddStudent(e) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !roll.trim()) {
      setError("নাম এবং রোল নম্বর দুটোই দিন");
      return;
    }

    const groupKey = isIntermediate
      ? group
      : (subject === "Other" ? (customSubject.trim() || "Other") : subject);

    // একই স্তর + বর্ষ + বিভাগ/বিষয়ের মধ্যে রোল সংঘর্ষ যাচাই করা
    const studentsRef = collection(db, "students");
    const dupQuery = query(studentsRef, where("roll", "==", roll.trim()));
    const dupSnap = await getDocs(dupQuery);
    const conflict = dupSnap.docs.find((d) => {
      const data = d.data();
      const dataGroupKey = data.level === "ইন্টারমিডিয়েট" ? data.department : data.subject;
      return data.level === level && data.year === year && dataGroupKey === groupKey;
    });
    if (conflict) {
      setError("এই স্তর, বর্ষ ও বিভাগ/বিষয়ে এই রোল নম্বর ইতিমধ্যে ব্যবহৃত হয়েছে, অন্য একটা রোল দিন");
      return;
    }

    setSaving(true);
    await addDoc(collection(db, "students"), {
      name: name.trim(),
      roll: roll.trim(),
      level,
      year,
      department: isIntermediate ? group : "—",
      subject: isIntermediate ? "—" : groupKey,
      createdAt: serverTimestamp(),
    });
    setSaving(false);

    setJustAdded(name.trim());
    setName("");
    setRoll("");
    setGroup("Science");
    setSubject("Bangla");
    setCustomSubject("");
  }

  return (
    <ProtectedRoute>
      <Header title="নতুন শিক্ষার্থী" />
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

            {isIntermediate ? (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", display: "block", marginBottom: 6 }}>
                  বিভাগ
                </label>
                <select className="field-select" value={group} onChange={(e) => setGroup(e.target.value)}>
                  {groupOptions.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", display: "block", marginBottom: 6 }}>
                  বিষয় (Subject)
                </label>
                <select className="field-select" value={subject} onChange={(e) => setSubject(e.target.value)}>
                  {subjectList.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                {subject === "Other" && (
                  <input
                    className="field-input"
                    placeholder="বিষয়ের নাম লিখুন"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    style={{ marginTop: 8 }}
                  />
                )}
              </div>
            )}

            {error && (
              <p
                style={{
                  background: "var(--danger-bg)",
                  color: "var(--danger)",
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  margin: 0,
                }}
              >
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "যোগ করা হচ্ছে..." : "শিক্ষার্থী যোগ করুন"}
            </button>
          </form>
        </div>
      </main>
    </ProtectedRoute>
  );
}