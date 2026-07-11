"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import ProtectedRoute from "@/lib/ProtectedRoute";
import Header from "@/lib/Header";
import PageTitle from "@/lib/PageTitle";

export default function DashboardPage() {
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [selectedDate, setSelectedDate] = useState(todayKey());
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    function todayKey() {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    const loadData = useCallback(async () => {
        setLoading(true);

        const studentsSnap = await getDocs(collection(db, "students"));
        const studentsList = studentsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setStudents(studentsList);

        const attendanceRef = collection(db, "attendance");
        const attendanceQuery = query(attendanceRef, where("date", "==", selectedDate));
        const attendanceSnap = await getDocs(attendanceQuery);
        const attendanceList = attendanceSnap.docs.map((doc) => doc.data());
        setAttendance(attendanceList);

        setLoading(false);
    }, [selectedDate]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const presentRolls = new Set(attendance.map((a) => a.roll));
    const totalCount = students.length;
    const presentCount = students.filter((s) => presentRolls.has(s.roll)).length;
    const absentCount = totalCount - presentCount;
    const percent = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

    const filteredStudents = students
        .slice()
        .filter((s) => {
            const q = search.trim().toLowerCase();
            if (!q) return true;
            return s.name.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q);
        })
        .sort((a, b) => a.roll.localeCompare(b.roll));

    return (
        <ProtectedRoute>
            <Header />
            <PageTitle>হাজিরার ড্যাশবোর্ড</PageTitle>
            <main className="ledger-wrap">
                <div className="card-box" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <label style={{ fontWeight: 600, fontSize: 14 }}>তারিখ:</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="field-input"
                        style={{ width: "auto" }}
                    />
                    <button onClick={loadData} className="btn-ghost">
                        রিফ্রেশ করুন
                    </button>
                    <input
                        className="field-input"
                        placeholder="নাম বা রোল দিয়ে খুঁজুন..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ flex: 1, minWidth: 180 }}
                    />
                </div>

                {loading ? (
                    <p style={{ color: "var(--ink-soft)" }}>লোড হচ্ছে...</p>
                ) : (
                    <>
                        <div className="stat-row">
                            <StatBox label="মোট শিক্ষার্থী" value={totalCount} />
                            <StatBox label="উপস্থিত" value={presentCount} />
                            <StatBox label="অনুপস্থিত" value={absentCount} />
                            <StatBox label="হাজিরার হার" value={`${percent}%`} />
                        </div>

                        <div className="card-box">
                            <table className="ledger-table">
                                <thead>
                                    <tr>
                                        <th>রোল</th>
                                        <th>নাম</th>
                                        <th>স্তর / বিভাগ</th>
                                        <th>অবস্থা</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.map((s) => {
                                        const isPresent = presentRolls.has(s.roll);
                                        return (
                                            <tr key={s.id}>
                                                <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>{s.roll}</td>
                                                <td>{s.name}</td>
                                                <td>
                                                    {s.level} {s.year ? `· ${s.year}` : ""} · {s.department}
                                                </td>
                                                <td>
                                                    <span className={`status-pill ${isPresent ? "status-present" : "status-absent"}`}>
                                                        {isPresent ? "উপস্থিত" : "অনুপস্থিত"}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {filteredStudents.length === 0 && (
                                <p style={{ color: "var(--ink-soft)", marginTop: 12 }}>
                                    কোনো শিক্ষার্থী পাওয়া যায়নি।
                                </p>
                            )}
                        </div>
                    </>
                )}
            </main>
        </ProtectedRoute>
    );
}

function StatBox({ label, value }) {
    return (
        <div className="stat-box">
            <div className="num">{value}</div>
            <div className="lbl">{label}</div>
        </div>
    );
}