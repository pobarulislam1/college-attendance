"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import ProtectedRoute from "@/lib/ProtectedRoute";
import Header from "@/lib/Header";
import PageTitle from "@/lib/PageTitle";

export default function VerifyPage() {
    const [selectedDate, setSelectedDate] = useState(todayKey());
    const [records, setRecords] = useState([]);
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
        const attendanceRef = collection(db, "attendance");
        const q = query(attendanceRef, where("date", "==", selectedDate));
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => d.data());

        // যে আগে হাজিরা দিয়েছে সে আগে থাকবে (createdAt অনুযায়ী ক্রমানুসারে)
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

    function handlePrint() {
        window.print();
    }

    const withPhoto = records.filter((r) => r.photo).length;

    return (
        <ProtectedRoute>
            <div className="no-print">
                <Header />
                <PageTitle>হাজিরা যাচাই শিট</PageTitle>
            </div>

            <main className="ledger-wrap">
                <div className="card-box no-print" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
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
                    <button onClick={handlePrint} className="btn-primary">
                        প্রিন্ট / PDF সেভ করুন
                    </button>
                </div>

                <div id="print-area">
                    <div className="print-only" style={{ display: "none", textAlign: "center", marginBottom: 16 }}>
                        <h1 style={{ fontSize: 20, margin: 0 }}>হাজিরা যাচাই শিট</h1>
                        <p style={{ fontSize: 13, margin: "4px 0" }}>তারিখ: {selectedDate}</p>
                    </div>

                    {loading ? (
                        <p style={{ color: "var(--ink-soft)" }}>লোড হচ্ছে...</p>
                    ) : records.length === 0 ? (
                        <div className="card-box">
                            <p style={{ color: "var(--ink-soft)", margin: 0 }}>
                                এই তারিখে কোনো হাজিরার রেকর্ড নেই।
                            </p>
                        </div>
                    ) : (
                        <>
                            <p className="no-print" style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                                মোট {records.length} জনের হাজিরা, এর মধ্যে {withPhoto} জনের ছবি প্রমাণসহ আছে। ক্রম অনুযায়ী কে আগে হাজিরা দিয়েছে তা দেখানো হচ্ছে।
                            </p>

                            <div className="card-box verify-list">
                                {records.map((r, i) => (
                                    <div key={i} className="verify-row">
                                        <div className="verify-serial">{i + 1}</div>
                                        <div className="verify-info">
                                            <div className="verify-name">{r.studentName}</div>
                                            <div className="verify-meta">
                                                রোল: {r.roll} · সময়: {r.time}
                                            </div>
                                        </div>
                                        {r.photo ? (
                                            <img src={r.photo} alt={r.studentName} className="verify-photo" />
                                        ) : (
                                            <div className="verify-photo verify-no-photo">নেই</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </main>

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
        </ProtectedRoute>
    );
}