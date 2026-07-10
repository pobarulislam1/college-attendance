"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, serverTimestamp } from "firebase/firestore";

export default function Home() {
  const [name, setName] = useState("");
  const [roll, setRoll] = useState("");
  const [level, setLevel] = useState("ইন্টারমিডিয়েট");
  const [department, setDepartment] = useState("");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // পেজ লোড হলে সব শিক্ষার্থী নিয়ে আসা
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

  // নতুন শিক্ষার্থী যোগ করা
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
      department: department.trim() || "—",
      createdAt: serverTimestamp(),
    });
    setName("");
    setRoll("");
    setDepartment("");
    loadStudents(); // তালিকা রিফ্রেশ করা
  }

  return (
    <main style={{ maxWidth: 700, margin: "0 auto", padding: 24, fontFamily: "sans-serif" }}>
      <h1>শিক্ষার্থী তালিকা</h1>

      <form onSubmit={handleAddStudent} style={{ marginBottom: 32, display: "grid", gap: 12 }}>
        <input
          placeholder="নাম"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: 8 }}
        />
        <input
          placeholder="রোল নম্বর"
          value={roll}
          onChange={(e) => setRoll(e.target.value)}
          style={{ padding: 8 }}
        />
        <select value={level} onChange={(e) => setLevel(e.target.value)} style={{ padding: 8 }}>
          <option>ইন্টারমিডিয়েট</option>
          <option>অনার্স</option>
          <option>মাস্টার্স</option>
        </select>
        <input
          placeholder="বিভাগ / শ্রেণি"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          style={{ padding: 8 }}
        />
        <button type="submit" style={{ padding: 10, background: "#1B3A2E", color: "#fff", border: "none", borderRadius: 6 }}>
          শিক্ষার্থী যোগ করুন
        </button>
      </form>

      <h2>মোট {students.length} জন শিক্ষার্থী</h2>
      {loading ? (
        <p>লোড হচ্ছে...</p>
      ) : (
        <ul>
          {students.map((s) => (
            <li key={s.id}>
              {s.name} — রোল: {s.roll} — {s.level} — {s.department}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}