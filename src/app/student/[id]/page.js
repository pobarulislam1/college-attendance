"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore"; import ProtectedRoute from "@/lib/ProtectedRoute";
import Header from "@/lib/Header";
import PageTitle from "@/lib/PageTitle";
import { QRCodeSVG } from "qrcode.react";


export default function StudentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [student, setStudent] = useState(null);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [totalDays, setTotalDays] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStudentData();
    }, [params.id]);

    async function loadStudentData() {
        setLoading(true);

        // Fetch Student Basic Information
        const studentDoc = await getDoc(doc(db, "students", params.id));
        if (!studentDoc.exists()) {
            setLoading(false);
            return;
        }
        const studentData = { id: studentDoc.id, ...studentDoc.data() };
        setStudent(studentData);

        // Retrieve All Attendance Records for This Student
        const attendanceRef = collection(db, "attendance");
        const attQuery = query(attendanceRef, where("roll", "==", studentData.roll));
        const attSnap = await getDocs(attQuery);
        const records = attSnap.docs.map((d) => d.data()).sort((a, b) => b.date.localeCompare(a.date));
        setAttendanceRecords(records);

        // Calculate the Total Number of Attendance Days (Across All Students)
        const allAttSnap = await getDocs(collection(db, "attendance"));
        const distinctDates = new Set(allAttSnap.docs.map((d) => d.data().date));
        setTotalDays(distinctDates.size);

        setLoading(false);
    }

    async function handleDelete() {
        const confirmed = window.confirm(
            `আপনি কি নিশ্চিত ${student.name} (রোল: ${student.roll}) কে মুছে ফেলতে চান? এই কাজটি ফিরিয়ে নেওয়া যাবে না।`
        );
        if (!confirmed) return;

        await deleteDoc(doc(db, "students", student.id));
        router.push("/students");
    }

    function handlePrint() {
        window.print();
    }

    if (loading) {
        return (
            <ProtectedRoute>
                <Header title="শিক্ষার্থীর বিবরণ" />
                <main className="ledger-wrap">
                    <p style={{ color: "var(--ink-soft)" }}>লোড হচ্ছে...</p>
                </main>
            </ProtectedRoute>
        );
    }

    if (!student) {
        return (
            <ProtectedRoute>
                <Header title="শিক্ষার্থীর বিবরণ" />
                <main className="ledger-wrap">
                    <div className="card-box">
                        <p>এই শিক্ষার্থী খুঁজে পাওয়া যায়নি।</p>
                        <button className="btn-ghost" onClick={() => router.push("/students")}>
                            তালিকায় ফিরে যান
                        </button>
                    </div>
                </main>
            </ProtectedRoute>
        );
    }

    const presentDays = attendanceRecords.length;
    const percent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    return (
        <ProtectedRoute>
            <div className="no-print">
                <Header />
                <PageTitle>শিক্ষার্থীর বিবরণ</PageTitle>
            </div>

            <main className="ledger-wrap">
                <div id="print-area">
                    {/* Print Header - Visible Only When Printing */}
                    <div className="print-only" style={{ display: "none", textAlign: "center", marginBottom: 20 }}>
                        <h1 style={{ fontSize: 20 }}>হাজিরার রিপোর্ট</h1>
                        <p style={{ fontSize: 12 }}>তৈরির তারিখ: {new Date().toLocaleDateString("bn-BD")}</p>
                    </div>

                    <div className="card-box" style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
                        <QRCodeSVG value={`ATTEND:${student.roll}`} size={90} />
                        <div style={{ flex: 1, minWidth: 200 }}>
                            <h2 style={{ fontSize: 22, margin: "0 0 8px 0" }}>{student.name}</h2>
                            <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: "2px 0" }}>রোল: {student.roll}</p>
                            <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: "2px 0" }}>
                                {student.level} {student.year ? `· ${student.year}` : ""}
                            </p>
                            <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: "2px 0" }}>বিভাগ: {student.department}</p>
                        </div>
                    </div>

                    <div className="stat-row">
                        <div className="stat-box">
                            <div className="num">{presentDays}</div>
                            <div className="lbl">উপস্থিত দিন</div>
                        </div>
                        <div className="stat-box">
                            <div className="num">{totalDays}</div>
                            <div className="lbl">মোট দিন</div>
                        </div>
                        <div className="stat-box">
                            <div className="num">{percent}%</div>
                            <div className="lbl">হাজিরার হার</div>
                        </div>
                        <div className="stat-box">
                            <div className="num" style={{ color: percent >= 75 ? "var(--success)" : "var(--danger)" }}>
                                {percent >= 75 ? "যোগ্য" : "অযোগ্য"}
                            </div>
                            <div className="lbl">পরীক্ষার শর্ত (৭৫%)</div>
                        </div>
                    </div>

                    <div className="card-box">
                        <h2 style={{ fontSize: 17, marginTop: 0 }}>হাজিরার ইতিহাস</h2>
                        {attendanceRecords.length === 0 ? (
                            <p style={{ color: "var(--ink-soft)" }}>এখনো কোনো হাজিরা রেকর্ড নেই।</p>
                        ) : (
                            <table className="ledger-table">
                                <thead>
                                    <tr>
                                        <th>তারিখ</th>
                                        <th>সময়</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendanceRecords.map((r, i) => (
                                        <tr key={i}>
                                            <td>{r.date}</td>
                                            <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>{r.time}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                <div className="no-print" style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                    <button className="btn-primary" onClick={handlePrint}>
                        রিপোর্ট প্রিন্ট করুন
                    </button>
                    <button className="btn-ghost" onClick={() => router.push("/students")}>
                        তালিকায় ফিরে যান
                    </button>
                    <button
                        onClick={handleDelete}
                        style={{
                            padding: "9px 16px",
                            background: "var(--danger-bg)",
                            color: "var(--danger)",
                            border: "none",
                            borderRadius: 10,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            marginLeft: "auto",
                        }}
                    >
                        শিক্ষার্থী মুছে ফেলুন
                    </button>
                </div>
            </main>

            <style jsx global>{`
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
        }
      `}</style>
        </ProtectedRoute>
    );
}