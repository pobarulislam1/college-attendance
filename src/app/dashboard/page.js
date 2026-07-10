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

        // সব শিক্ষার্থী আনা
        const studentsSnap = await getDocs(collection(db, "students"));
        const studentsList = studentsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setStudents(studentsList);

        // নির্বাচিত তারিখের হাজিরা আনা
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

    return (
        <ProtectedRoute>
            <Header />
            <PageTitle>হাজিরার ড্যাশবোর্ড</PageTitle>
            <main className="ledger-wrap">




                <div style={{ marginBottom: 24 }}>
                    <label style={{ marginRight: 8, fontWeight: "bold" }}>তারিখ:</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        style={{ padding: 6 }}
                    />
                    <button onClick={loadData} style={{ marginLeft: 8, padding: "6px 14px" }}>
                        রিফ্রেশ করুন
                    </button>
                </div>

                {loading ? (
                    <p>লোড হচ্ছে...</p>
                ) : (
                    <>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
                            <StatBox label="মোট শিক্ষার্থী" value={totalCount} />
                            <StatBox label="উপস্থিত" value={presentCount} color="#1B3A2E" />
                            <StatBox label="অনুপস্থিত" value={absentCount} color="#A3272B" />
                            <StatBox label="হাজিরার হার" value={`${percent}%`} />
                        </div>

                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ borderBottom: "2px solid #1B3A2E", textAlign: "left" }}>
                                    <th style={{ padding: 8 }}>রোল</th>
                                    <th style={{ padding: 8 }}>নাম</th>
                                    <th style={{ padding: 8 }}>স্তর / বিভাগ</th>
                                    <th style={{ padding: 8 }}>অবস্থা</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students
                                    .slice()
                                    .sort((a, b) => a.roll.localeCompare(b.roll))
                                    .map((s) => {
                                        const isPresent = presentRolls.has(s.roll);
                                        return (
                                            <tr key={s.id} style={{ borderBottom: "1px solid #ddd" }}>
                                                <td style={{ padding: 8 }}>{s.roll}</td>
                                                <td style={{ padding: 8 }}>{s.name}</td>
                                                <td style={{ padding: 8 }}>
                                                    {s.level} · {s.department}
                                                </td>
                                                <td style={{ padding: 8 }}>
                                                    <span
                                                        style={{
                                                            padding: "3px 10px",
                                                            borderRadius: 20,
                                                            fontSize: 12,
                                                            fontWeight: "bold",
                                                            background: isPresent ? "#e4efe8" : "#f6e4e2",
                                                            color: isPresent ? "#1B3A2E" : "#A3272B",
                                                        }}
                                                    >
                                                        {isPresent ? "উপস্থিত" : "অনুপস্থিত"}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>

                        {totalCount === 0 && <p>কোনো শিক্ষার্থী নেই। প্রথমে হোমপেজ থেকে শিক্ষার্থী যোগ করুন।</p>}
                    </>
                )}
            </main>
        </ProtectedRoute>
    );
}

function StatBox({ label, value, color = "#333" }) {
    return (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 28, fontWeight: "bold", color }}>{value}</div>
            <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
        </div>
    );
}