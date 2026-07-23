"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import ProtectedRoute from "@/lib/ProtectedRoute";
import Header from "@/lib/Header";
import PageTitle from "@/lib/PageTitle";
import { QRCodeSVG } from "qrcode.react";

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

export default function StudentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [student, setStudent] = useState(null);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [totalDays, setTotalDays] = useState(0);
    const [loading, setLoading] = useState(true);

    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [editRoll, setEditRoll] = useState("");
    const [editLevel, setEditLevel] = useState("ইন্টারমিডিয়েট");
    const [editYear, setEditYear] = useState("১ম বর্ষ");
    const [editGroup, setEditGroup] = useState("Science");
    const [editSubject, setEditSubject] = useState("Bangla");
    const [editCustomSubject, setEditCustomSubject] = useState("");
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState("");

    const isIntermediateEdit = editLevel === "ইন্টারমিডিয়েট";

    useEffect(() => {
        loadStudentData();
    }, [params.id]);

    async function loadStudentData() {
        setLoading(true);

        const studentDoc = await getDoc(doc(db, "students", params.id));
        if (!studentDoc.exists()) {
            setLoading(false);
            return;
        }
        const studentData = { id: studentDoc.id, ...studentDoc.data() };
        setStudent(studentData);
        fillEditForm(studentData);

        const attendanceRef = collection(db, "attendance");
        const attQuery = query(attendanceRef, where("studentId", "==", studentData.id));
        const attSnap = await getDocs(attQuery);
        const records = attSnap.docs.map((d) => d.data()).sort((a, b) => b.date.localeCompare(a.date));
        setAttendanceRecords(records);

        const allAttSnap = await getDocs(collection(db, "attendance"));
        const distinctDates = new Set(allAttSnap.docs.map((d) => d.data().date));
        setTotalDays(distinctDates.size);

        setLoading(false);
    }

    function fillEditForm(s) {
        setEditName(s.name || "");
        setEditRoll(s.roll || "");
        setEditLevel(s.level || "ইন্টারমিডিয়েট");
        setEditYear(s.year || yearOptions[s.level || "ইন্টারমিডিয়েট"][0]);

        const dept = s.department && s.department !== "—" ? s.department : "Science";
        setEditGroup(groupOptions.includes(dept) ? dept : "Science");

        const subj = s.subject && s.subject !== "—" ? s.subject : "Bangla";
        if (subjectList.includes(subj)) {
            setEditSubject(subj);
            setEditCustomSubject("");
        } else {
            setEditSubject("Other");
            setEditCustomSubject(subj);
        }
    }

    function handleLevelChangeInEdit(newLevel) {
        setEditLevel(newLevel);
        setEditYear(yearOptions[newLevel][0]);
    }

    function startEditing() {
        fillEditForm(student);
        setEditError("");
        setIsEditing(true);
    }

    function cancelEditing() {
        setIsEditing(false);
        setEditError("");
    }

    async function handleSaveEdit(e) {
        e.preventDefault();
        setEditError("");

        if (!editName.trim() || !editRoll.trim()) {
            setEditError("নাম এবং রোল নম্বর দুটোই দিন");
            return;
        }

        const editGroupKey = isIntermediateEdit
            ? editGroup
            : (editSubject === "Other" ? (editCustomSubject.trim() || "Other") : editSubject);

        if (editRoll.trim() !== student.roll || editLevel !== student.level || editYear !== student.year) {
            const studentsRef = collection(db, "students");
            const dupQuery = query(studentsRef, where("roll", "==", editRoll.trim()));
            const dupSnap = await getDocs(dupQuery);
            const conflict = dupSnap.docs.find((d) => {
                if (d.id === student.id) return false;
                const data = d.data();
                const dataGroupKey = data.level === "ইন্টারমিডিয়েট" ? data.department : data.subject;
                return data.level === editLevel && data.year === editYear && dataGroupKey === editGroupKey;
            });
            if (conflict) {
                setEditError("এই স্তর, বর্ষ ও বিভাগ/বিষয়ে এই রোল নম্বর ইতিমধ্যে ব্যবহৃত হয়েছে");
                return;
            }
        }

        setSaving(true);
        await updateDoc(doc(db, "students", student.id), {
            name: editName.trim(),
            roll: editRoll.trim(),
            level: editLevel,
            year: editYear,
            department: isIntermediateEdit ? editGroup : "—",
            subject: isIntermediateEdit ? "—" : editGroupKey,
        });
        setSaving(false);
        setIsEditing(false);
        loadStudentData();
    }

    async function handleDelete() {
        const confirmed = window.confirm(
            `আপনি কি নিশ্চিত ${student.name} (রোল: ${student.roll}) কে মুছে ফেলতে চান? এই কাজটি ফিরিয়ে নেওয়া যাবে না।`
        );
        if (!confirmed) return;

        await deleteDoc(doc(db, "students", student.id));
        router.push("/students");
    }

    async function handleDeleteAttendanceRecord(record) {
        const confirmed = window.confirm(
            `${record.date} তারিখের হাজিরা রেকর্ডটি মুছে ফেলতে চান? এই কাজটি ফিরিয়ে নেওয়া যাবে না।`
        );
        if (!confirmed) return;

        const docId = `${record.date}_${record.roll}`;
        await deleteDoc(doc(db, "attendance", docId));
        loadStudentData();
    }

    function handlePrint() {
        window.print();
    }

    if (loading) {
        return (
            <ProtectedRoute>
                <Header />
                <main className="ledger-wrap">
                    <p style={{ color: "var(--ink-soft)" }}>লোড হচ্ছে...</p>
                </main>
            </ProtectedRoute>
        );
    }

    if (!student) {
        return (
            <ProtectedRoute>
                <Header />
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
    const studentIsIntermediate = student.level === "ইন্টারমিডিয়েট";

    return (
        <ProtectedRoute>
            <div className="no-print">
                <Header />
                <PageTitle>শিক্ষার্থীর বিবরণ</PageTitle>
            </div>

            <main className="ledger-wrap">
                <div id="print-area">
                    <div className="print-only" style={{ display: "none", textAlign: "center", marginBottom: 20 }}>
                        <h1 style={{ fontSize: 20 }}>হাজিরার রিপোর্ট</h1>
                        <p style={{ fontSize: 12 }}>তৈরির তারিখ: {new Date().toLocaleDateString("bn-BD")}</p>
                    </div>

                    {!isEditing ? (
                        <div className="card-box" style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
                            <QRCodeSVG value={`ATTEND:${student.id}`} size={90} />
                            <div style={{ flex: 1, minWidth: 200 }}>
                                <h2 style={{ fontSize: 22, margin: "0 0 8px 0" }}>{student.name}</h2>
                                <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: "2px 0" }}>রোল: {student.roll}</p>
                                <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: "2px 0" }}>
                                    {student.level} {student.year ? `· ${student.year}` : ""}
                                </p>
                                {studentIsIntermediate ? (
                                    <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: "2px 0" }}>
                                        বিভাগ: {student.department && student.department !== "—" ? student.department : "—"}
                                    </p>
                                ) : (
                                    <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: "2px 0" }}>
                                        বিষয়: {student.subject && student.subject !== "—" ? student.subject : "—"}
                                    </p>
                                )}
                            </div>
                            <button className="no-print btn-ghost" onClick={startEditing}>
                                তথ্য সম্পাদনা করুন
                            </button>
                        </div>
                    ) : (
                        <div className="card-box no-print">
                            <h2 style={{ fontSize: 17, marginTop: 0 }}>তথ্য সম্পাদনা করুন</h2>
                            <form onSubmit={handleSaveEdit} style={{ display: "grid", gap: 12, maxWidth: 420 }}>
                                <input
                                    className="field-input"
                                    placeholder="নাম"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                />
                                <input
                                    className="field-input"
                                    placeholder="রোল নম্বর"
                                    value={editRoll}
                                    onChange={(e) => setEditRoll(e.target.value)}
                                />
                                <select
                                    className="field-select"
                                    value={editLevel}
                                    onChange={(e) => handleLevelChangeInEdit(e.target.value)}
                                >
                                    <option>ইন্টারমিডিয়েট</option>
                                    <option>অনার্স</option>
                                    <option>মাস্টার্স</option>
                                </select>
                                <select className="field-select" value={editYear} onChange={(e) => setEditYear(e.target.value)}>
                                    {yearOptions[editLevel].map((y) => (
                                        <option key={y}>{y}</option>
                                    ))}
                                </select>

                                {isIntermediateEdit ? (
                                    <div>
                                        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", display: "block", marginBottom: 6 }}>
                                            বিভাগ
                                        </label>
                                        <select className="field-select" value={editGroup} onChange={(e) => setEditGroup(e.target.value)}>
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
                                        <select className="field-select" value={editSubject} onChange={(e) => setEditSubject(e.target.value)}>
                                            {subjectList.map((s) => (
                                                <option key={s}>{s}</option>
                                            ))}
                                        </select>
                                        {editSubject === "Other" && (
                                            <input
                                                className="field-input"
                                                placeholder="বিষয়ের নাম লিখুন"
                                                value={editCustomSubject}
                                                onChange={(e) => setEditCustomSubject(e.target.value)}
                                                style={{ marginTop: 8 }}
                                            />
                                        )}
                                    </div>
                                )}

                                {editError && (
                                    <p style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "8px 12px", borderRadius: 8, fontSize: 13, margin: 0 }}>
                                        {editError}
                                    </p>
                                )}

                                <div style={{ display: "flex", gap: 10 }}>
                                    <button type="submit" className="btn-primary" disabled={saving}>
                                        {saving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
                                    </button>
                                    <button type="button" className="btn-ghost" onClick={cancelEditing}>
                                        বাতিল করুন
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

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
                                        <th>প্রবেশ</th>
                                        <th>বাহির</th>
                                        <th className="no-print"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendanceRecords.map((r, i) => (
                                        <tr key={i}>
                                            <td>{r.date}</td>
                                            <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>{r.checkInTime || r.time || "—"}</td>
                                            <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>{r.checkOutTime || "—"}</td>
                                            <td className="no-print">
                                                <button
                                                    onClick={() => handleDeleteAttendanceRecord(r)}
                                                    style={{
                                                        background: "none",
                                                        border: "none",
                                                        color: "var(--danger)",
                                                        fontSize: 12,
                                                        cursor: "pointer",
                                                        textDecoration: "underline",
                                                        padding: 0,
                                                    }}
                                                >
                                                    মুছুন
                                                </button>
                                            </td>
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