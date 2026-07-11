"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import ProtectedRoute from "@/lib/ProtectedRoute";
import Header from "@/lib/Header";
import PageTitle from "@/lib/PageTitle";

export default function StudentsPage() {
    const router = useRouter();
    const [students, setStudents] = useState([]);
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
        setLoading(false);
    }

    const filteredStudents = students.filter((s) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return s.name.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q);
    });

    return (
        <ProtectedRoute>
            <Header />
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
                        <input
                            className="field-input"
                            placeholder="নাম বা রোল দিয়ে খুঁজুন..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ maxWidth: 240 }}
                        />
                    </div>

                    {loading ? (
                        <p style={{ color: "var(--ink-soft)" }}>লোড হচ্ছে...</p>
                    ) : filteredStudents.length === 0 ? (
                        <p style={{ color: "var(--ink-soft)" }}>কোনো শিক্ষার্থী পাওয়া যায়নি।</p>
                    ) : (
                        <div className="id-card-grid">
                            {filteredStudents.map((s) => (
                                <div
                                    key={s.id}
                                    className="id-card"
                                    onClick={() => router.push(`/student/${s.id}`)}
                                    style={{ cursor: "pointer" }}
                                >
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