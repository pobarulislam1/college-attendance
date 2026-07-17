"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import * as XLSX from "xlsx";
import ProtectedRoute from "@/lib/ProtectedRoute";
import Header from "@/lib/Header";
import PageTitle from "@/lib/PageTitle";

const levelOptions = ["সব", "ইন্টারমিডিয়েট", "অনার্স", "মাস্টার্স"];
const yearOptions = ["সব", "১ম বর্ষ", "২য় বর্ষ", "৩য় বর্ষ", "৪র্থ বর্ষ"];

function todayKey() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState("attendance"); // "attendance" | "verify"

    return (
        <ProtectedRoute>
            <div className="no-print">
                <Header />
                <PageTitle>রিপোর্ট</PageTitle>
            </div>

            <main className="ledger-wrap">
                <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                    <button
                        onClick={() => setActiveTab("attendance")}
                        className={activeTab === "attendance" ? "btn-primary" : "btn-ghost"}
                    >
                        হাজিরার রিপোর্ট
                    </button>
                    <button
                        onClick={() => setActiveTab("verify")}
                        className={activeTab === "verify" ? "btn-primary" : "btn-ghost"}
                    >
                        যাচাই রিপোর্ট
                    </button>
                </div>

                {activeTab === "attendance" ? <AttendanceReportTab /> : <VerifyReportTab />}
            </main>
        </ProtectedRoute>
    );
}

// ================= ট্যাব ১: হাজিরার রিপোর্ট (শতাংশ, এক্সেল) =================
function AttendanceReportTab() {
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterLevel, setFilterLevel] = useState("সব");
    const [filterYear, setFilterYear] = useState("সব");
    const [filterDept, setFilterDept] = useState("সব");

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

    const totalDays = useMemo(() => {
        const distinctDates = new Set(attendance.map((a) => a.date));
        return distinctDates.size;
    }, [attendance]);

    const report = useMemo(() => {
        return students.map((s) => {
            const presentDays = attendance.filter((a) => a.roll === s.roll).length;
            const percent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
            return { ...s, presentDays, percent };
        });
    }, [students, attendance, totalDays]);

    const deptOptions = useMemo(() => {
        const set = new Set();
        students.forEach((s) => {
            if (s.department && s.department !== "—") set.add(s.department);
        });
        return ["সব", ...Array.from(set).sort()];
    }, [students]);

    const filtered = useMemo(() => {
        return report
            .filter((s) => filterLevel === "সব" || s.level === filterLevel)
            .filter((s) => filterYear === "সব" || s.year === filterYear)
            .filter((s) => filterDept === "সব" || s.department === filterDept)
            .filter((s) => {
                const q = search.trim().toLowerCase();
                if (!q) return true;
                return s.name.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q);
            })
            .sort((a, b) => a.roll.localeCompare(b.roll));
    }, [report, search, filterLevel, filterYear, filterDept]);

    function exportToExcel() {
        const rows = filtered.map((s) => ({
            "রোল": s.roll,
            "নাম": s.name,
            "স্তর": s.level,
            "বর্ষ": s.year || "—",
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
        <>
            <div className="card-box" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <label style={{ fontSize: 13, color: "var(--ink-soft)" }}>স্তর:</label>
                        <select className="field-select" value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} style={{ width: "auto" }}>
                            {levelOptions.map((l) => <option key={l}>{l}</option>)}
                        </select>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <label style={{ fontSize: 13, color: "var(--ink-soft)" }}>বর্ষ:</label>
                        <select className="field-select" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={{ width: "auto" }}>
                            {yearOptions.map((y) => <option key={y}>{y}</option>)}
                        </select>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <label style={{ fontSize: 13, color: "var(--ink-soft)" }}>বিভাগ/শ্রেণি:</label>
                        <select className="field-select" value={filterDept} onChange={(e) => setFilterDept(e.target.value)} style={{ width: "auto" }}>
                            {deptOptions.map((d) => <option key={d}>{d}</option>)}
                        </select>
                    </div>
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <input
                        className="field-input"
                        placeholder="নাম বা রোল দিয়ে খুঁজুন..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ flex: 1, minWidth: 200 }}
                    />
                    <button onClick={exportToExcel} className="btn-primary">
                        এক্সেল ডাউনলোড করুন
                    </button>
                </div>
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
                                <th>স্তর / বর্ষ / বিভাগ</th>
                                <th>উপস্থিত</th>
                                <th>হাজিরার হার</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((s) => (
                                <tr key={s.id}>
                                    <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>{s.roll}</td>
                                    <td>{s.name}</td>
                                    <td>{s.level} {s.year ? `· ${s.year}` : ""} · {s.department}</td>
                                    <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>{s.presentDays}/{totalDays}</td>
                                    <td>
                                        <span className={`status-pill ${s.percent >= 75 ? "status-present" : "status-absent"}`}>
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
        </>
    );
}

// ================= TAB 2: Verification Report (Date, Photo, Print) =================

function VerifyReportTab() {
    const [selectedDate, setSelectedDate] = useState(todayKey());
    const [records, setRecords] = useState([]);
    const [studentsMap, setStudentsMap] = useState({});
    const [loading, setLoading] = useState(true);

    const [filterLevel, setFilterLevel] = useState("সব");
    const [filterYear, setFilterYear] = useState("সব");
    const [filterDept, setFilterDept] = useState("সব");

    const loadData = useCallback(async () => {
        setLoading(true);

        const studentsSnap = await getDocs(collection(db, "students"));
        const map = {};
        studentsSnap.docs.forEach((d) => {
            const data = d.data();
            map[data.roll] = data;
        });
        setStudentsMap(map);

        const attendanceRef = collection(db, "attendance");
        const q = query(attendanceRef, where("date", "==", selectedDate));
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => d.data());

        list.sort((a, b) => {
            const aTime = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
            const bTime = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
            return aTime - bTime;
        });

        setRecords(list);
        setLoading(false);
    }, [selectedDate]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const deptOptions = useMemo(() => {
        const set = new Set();
        Object.values(studentsMap).forEach((s) => {
            if (s.department && s.department !== "—") set.add(s.department);
        });
        return ["সব", ...Array.from(set).sort()];
    }, [studentsMap]);

    const filteredRecords = records.filter((r) => {
        const student = studentsMap[r.roll];
        if (!student) return false;
        if (filterLevel !== "সব" && student.level !== filterLevel) return false;
        if (filterYear !== "সব" && student.year !== filterYear) return false;
        if (filterDept !== "সব" && student.department !== filterDept) return false;
        return true;
    });

    function handlePrint() {
        window.print();
    }

    const withPhoto = filteredRecords.filter((r) => r.photo).length;

    return (
        <>
            <div className="card-box no-print" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <label style={{ fontSize: 13, color: "var(--ink-soft)" }}>স্তর:</label>
                        <select className="field-select" value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} style={{ width: "auto" }}>
                            {levelOptions.map((l) => <option key={l}>{l}</option>)}
                        </select>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <label style={{ fontSize: 13, color: "var(--ink-soft)" }}>বর্ষ:</label>
                        <select className="field-select" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={{ width: "auto" }}>
                            {yearOptions.map((y) => <option key={y}>{y}</option>)}
                        </select>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <label style={{ fontSize: 13, color: "var(--ink-soft)" }}>বিভাগ/শ্রেণি:</label>
                        <select className="field-select" value={filterDept} onChange={(e) => setFilterDept(e.target.value)} style={{ width: "auto" }}>
                            {deptOptions.map((d) => <option key={d}>{d}</option>)}
                        </select>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <label style={{ fontWeight: 600, fontSize: 14 }}>তারিখ:</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="field-input"
                        style={{ width: "auto" }}
                    />
                    <button onClick={loadData} className="btn-ghost">রিফ্রেশ করুন</button>
                    <button onClick={handlePrint} className="btn-primary" style={{ marginLeft: "auto" }}>
                        প্রিন্ট / PDF সেভ করুন
                    </button>
                </div>
            </div>

            <div id="print-area">
                <div className="print-only" style={{ display: "none", textAlign: "center", marginBottom: 16 }}>
                    <h1 style={{ fontSize: 20, margin: 0 }}>হাজিরা যাচাই শিট</h1>
                    <p style={{ fontSize: 13, margin: "4px 0" }}>
                        তারিখ: {selectedDate}
                        {filterLevel !== "সব" ? ` · স্তর: ${filterLevel}` : ""}
                        {filterYear !== "সব" ? ` · বর্ষ: ${filterYear}` : ""}
                        {filterDept !== "সব" ? ` · বিভাগ: ${filterDept}` : ""}
                    </p>
                </div>

                {loading ? (
                    <p style={{ color: "var(--ink-soft)" }}>লোড হচ্ছে...</p>
                ) : filteredRecords.length === 0 ? (
                    <div className="card-box">
                        <p style={{ color: "var(--ink-soft)", margin: 0 }}>এই ফিল্টার অনুযায়ী কোনো হাজিরার রেকর্ড নেই।</p>
                    </div>
                ) : (
                    <>
                        <p className="no-print" style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                            মোট {filteredRecords.length} জনের হাজিরা, এর মধ্যে {withPhoto} জনের ছবি প্রমাণসহ আছে।
                        </p>

                        <div className="card-box verify-list">
                            {filteredRecords.map((r, i) => {
                                const student = studentsMap[r.roll];
                                return (
                                    <div key={i} className="verify-row">
                                        <div className="verify-serial">{i + 1}</div>
                                        <div className="verify-info">
                                            <div className="verify-name">{r.studentName}</div>
                                            <div className="verify-meta">
                                                রোল: {r.roll} · সময়: {r.time}
                                                {student ? ` · ${student.level} · ${student.year} · ${student.department}` : ""}
                                            </div>
                                        </div>
                                        {r.photo ? (
                                            <img src={r.photo} alt={r.studentName} className="verify-photo" />
                                        ) : (
                                            <div className="verify-photo verify-no-photo">নেই</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            <style jsx global>{`
        .verify-list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .verify-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 4px;
          border-bottom: 1px solid var(--border);
        }
        .verify-row:last-child {
          border-bottom: none;
        }
        .verify-serial {
          width: 28px;
          height: 28px;
          flex-shrink: 0;
          border-radius: 50%;
          background: var(--indigo-light);
          color: var(--indigo-dark);
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .verify-info {
          flex: 1;
          min-width: 0;
        }
        .verify-name {
          font-weight: 700;
          font-size: 14.5px;
        }
        .verify-meta {
          font-size: 12.5px;
          color: var(--ink-soft);
          font-family: "JetBrains Mono", monospace;
        }
        .verify-photo {
          width: 50px;
          height: 50px;
          border-radius: 8px;
          object-fit: cover;
          flex-shrink: 0;
          background: var(--surface-soft);
        }
        .verify-no-photo {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: var(--ink-soft);
        }

        @media print {
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          body {
            background: white !important;
          }
          .verify-row {
            break-inside: avoid;
          }
        }
      `}</style>
        </>
    );
}