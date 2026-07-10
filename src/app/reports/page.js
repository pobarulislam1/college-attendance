"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import * as XLSX from "xlsx";
import ProtectedRoute from "@/lib/ProtectedRoute";
import Header from "@/lib/Header";
import PageTitle from "@/lib/PageTitle";

export default function ReportsPage() {
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [levelFilter, setLevelFilter] = useState("সব");

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        const studentsSnap = await getDocs(collection(db, "students"));
        const studentsList = studentsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setStudents(studentsList);

        const attendanceSnap = await getDocs(collection(db, "attendance"));
        const attendanceList = attendanceSnap.docs.map((doc) => doc.data());
        setAttendance(attendanceList);
        setLoading(false);
    }

    // মোট কতদিন হাজিরা নেওয়া হয়েছে (attendance রেকর্ডে যত আলাদা তারিখ আছে)
    const totalDays = useMemo(() => {
        const distinctDates = new Set(attendance.map((a) => a.date));
        return distinctDates.size;
    }, [attendance]);

    // প্রতিটা শিক্ষার্থীর জন্য উপস্থিতির সংখ্যা ও শতাংশ হিসাব
    const report = useMemo(() => {
        return students.map((s) => {
            const presentDays = attendance.filter((a) => a.roll === s.roll).length;
            const percent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
            return { ...s, presentDays, percent };
        });
    }, [students, attendance, totalDays]);

    // সার্চ ও স্তর অনুযায়ী ফিল্টার
    const filtered = useMemo(() => {
        return report
            .filter((s) => levelFilter === "সব" || s.level === levelFilter)
            .filter((s) => {
                const q = search.trim().toLowerCase();
                if (!q) return true;
                return s.name.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q);
            })
            .sort((a, b) => a.roll.localeCompare(b.roll));
    }, [report, search, levelFilter]);

    function exportToExcel() {
        const rows = filtered.map((s) => ({
            "রোল": s.roll,
            "নাম": s.name,
            "স্তর": s.level,
            "বিভাগ/শ্রেণি": s.department,
            "উপস্থিত দিন": s.presentDays,
            "মোট দিন": totalDays,
            "হাজিরার হার (%)": s.percent,
        }));
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Report");
        const today = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(workbook, `attendance-report-${today}.xlsx`);
    }

    return (
        <ProtectedRoute>
            <Header title="রিপোর্ট" />
            <PageTitle>হাজিরার রিপোর্ট</PageTitle>
            <main className="ledger-wrap">
                <div className="card-box" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <input
                        className="field-input"
                        placeholder="নাম বা রোল দিয়ে খুঁজুন..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ flex: 1, minWidth: 200 }}
                    />
                    <select
                        className="field-select"
                        value={levelFilter}
                        onChange={(e) => setLevelFilter(e.target.value)}
                        style={{ width: "auto" }}
                    >
                        <option>সব</option>
                        <option>ইন্টারমিডিয়েট</option>
                        <option>অনার্স</option>
                        <option>মাস্টার্স</option>
                    </select>
                    <button onClick={exportToExcel} className="btn-primary">
                        এক্সেল ডাউনলোড করুন
                    </button>
                </div>

                {loading ? (
                    <p style={{ color: "var(--ink-soft)" }}>লোড হচ্ছে...</p>
                ) : (
                    <div className="card-box">
                        <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 0 }}>
                            মোট {totalDays} দিনের হাজিরা রেকর্ড আছে। মোট {filtered.length} জন শিক্ষার্থী দেখানো হচ্ছে।
                        </p>
                        <table className="ledger-table">
                            <thead>
                                <tr>
                                    <th>রোল</th>
                                    <th>নাম</th>
                                    <th>স্তর / বিভাগ</th>
                                    <th>উপস্থিত</th>
                                    <th>হাজিরার হার</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((s) => (
                                    <tr key={s.id}>
                                        <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>{s.roll}</td>
                                        <td>{s.name}</td>
                                        <td>
                                            {s.level} · {s.department}
                                        </td>
                                        <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                            {s.presentDays}/{totalDays}
                                        </td>
                                        <td>
                                            <span
                                                className={`status-pill ${s.percent >= 75 ? "status-present" : "status-absent"}`}
                                            >
                                                {s.percent}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filtered.length === 0 && (
                            <p style={{ color: "var(--ink-soft)", marginTop: 12 }}>কোনো শিক্ষার্থী পাওয়া যায়নি।</p>
                        )}
                    </div>
                )}
            </main>
        </ProtectedRoute>
    );
}