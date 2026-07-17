"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import ProtectedRoute from "@/lib/ProtectedRoute";
import Header from "@/lib/Header";
import PageTitle from "@/lib/PageTitle";

function todayKey() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export default function StudentsPage() {
    const router = useRouter();
    const [students, setStudents] = useState([]);
    const [statusMap, setStatusMap] = useState({});
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStudents();
    }, []);

    async function loadStudents() {
        setLoading(true);
        const snapshot = await getDocs(collection(db, "students"));
        const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setStudents(list);

        const attendanceRef = collection(db, "attendance");
        const q = query(attendanceRef, where("date", "==", todayKey()));
        const attSnap = await getDocs(q);
        const map = {};
        attSnap.docs.forEach((d) => {
            const data = d.data();
            map[data.roll] = data.status;
        });
        setStatusMap(map);

        setLoading(false);
    }

    const filteredStudents = students.filter((s) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return s.name.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q);
    });

    function statusLabel(roll) {
        const status = statusMap[roll];
        if (status === "in") return { text: "ভিতরে আছে", color: "var(--success)", bg: "var(--success-bg)" };
        if (status === "out") return { text: "বের হয়েছে", color: "var(--danger)", bg: "var(--danger-bg)" };
        return { text: "আজ আসেনি", color: "var(--ink-soft)", bg: "var(--surface-soft)" };
    }

    return (
        <ProtectedRoute>
            <Header/>
            <PageTitle>শিক্ষার্থী তালিকা</PageTitle>
            <main className="ledger-wrap">
                <div className="card-box">
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 12,
                            marginBottom: 14,
                        }}
                    >
                        <h2 style={{ fontSize: 17, margin: 0 }}>মোট {filteredStudents.length} জন শিক্ষার্থী</h2>
                        <div style={{ display: "flex", gap: 8 }}>
                            <input
                                className="field-input"
                                placeholder="নাম বা রোল দিয়ে খুঁজুন..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ maxWidth: 240 }}
                            />
                            <button className="btn-ghost" onClick={loadStudents}>
                                রিফ্রেশ
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <p style={{ color: "var(--ink-soft)" }}>লোড হচ্ছে...</p>
                    ) : filteredStudents.length === 0 ? (
                        <p style={{ color: "var(--ink-soft)" }}>কোনো শিক্ষার্থী পাওয়া যায়নি।</p>
                    ) : (
                        <div className="id-card-grid">
                            {filteredStudents.map((s) => {
                                const st = statusLabel(s.roll);
                                return (
                                    <div
                                        key={s.id}
                                        className="id-card"
                                        onClick={() => router.push(`/student/${s.id}`)}
                                        style={{ cursor: "pointer", position: "relative" }}
                                    >
                                        <div
                                            style={{
                                                position: "absolute",
                                                top: 10,
                                                right: 10,
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 5,
                                                fontSize: 10,
                                                fontWeight: 700,
                                                padding: "3px 8px",
                                                borderRadius: 20,
                                                background: st.bg,
                                                color: st.color,
                                            }}
                                        >
                                            <span
                                                className={statusMap[s.roll] ? "live-dot" : ""}
                                                style={{ width: 7, height: 7, borderRadius: "50%", background: st.color }}
                                            />
                                            {st.text}
                                        </div>
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
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </ProtectedRoute>
    );
}