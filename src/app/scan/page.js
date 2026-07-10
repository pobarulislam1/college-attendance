"use client";

import { useState, useRef, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    serverTimestamp,
} from "firebase/firestore";
import jsQR from "jsqr";
import ProtectedRoute from "@/lib/ProtectedRoute";
import Header from "@/lib/Header";
import PageTitle from "@/lib/PageTitle";

export default function ScanPage() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const scanningRef = useRef(false);
    const lastScanRef = useRef(0);

    const [message, setMessage] = useState("ক্যামেরা চালু করতে নিচের বাটনে চাপুন");
    const [isScanning, setIsScanning] = useState(false);
    const [manualRoll, setManualRoll] = useState("");
    const [todayLog, setTodayLog] = useState([]);

    function todayKey() {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    async function checkIn(roll) {
        if (!roll) return;

        const studentsRef = collection(db, "students");
        const studentQuery = query(studentsRef, where("roll", "==", roll));
        const studentSnap = await getDocs(studentQuery);

        if (studentSnap.empty) {
            setMessage(`অজানা কোড — রোল ${roll} এর কোনো শিক্ষার্থী নেই`);
            return;
        }
        const student = studentSnap.docs[0].data();

        const attendanceRef = collection(db, "attendance");
        const todayQuery = query(
            attendanceRef,
            where("roll", "==", roll),
            where("date", "==", todayKey())
        );
        const existing = await getDocs(todayQuery);

        if (!existing.empty) {
            setMessage(`${student.name} — আগেই হাজিরা দেওয়া হয়েছে`);
            return;
        }

        const time = new Date().toLocaleTimeString("bn-BD", {
            hour: "2-digit",
            minute: "2-digit",
        });
        await addDoc(attendanceRef, {
            roll,
            studentName: student.name,
            date: todayKey(),
            time,
            createdAt: serverTimestamp(),
        });

        setMessage(`✓ ${student.name} — হাজিরা নেওয়া হয়েছে`);
        setTodayLog((prev) => [{ roll, name: student.name, time }, ...prev]);
    }

    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
            });
            streamRef.current = stream;
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            scanningRef.current = true;
            setIsScanning(true);
            setMessage("QR কোড ক্যামেরার সামনে ধরুন");
            requestAnimationFrame(scanLoop);
        } catch (err) {
            setMessage("ক্যামেরা চালু করা যায়নি — নিচে ম্যানুয়ালি রোল দিয়ে হাজিরা দিন");
        }
    }

    function stopCamera() {
        scanningRef.current = false;
        setIsScanning(false);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        setMessage("ক্যামেরা বন্ধ আছে");
    }

    function scanLoop() {
        if (!scanningRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
            const scale = 480 / video.videoWidth;
            canvas.width = 480;
            canvas.height = video.videoHeight * scale;

            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (code && code.data && code.data.startsWith("ATTEND:")) {
                const now = Date.now();
                if (now - lastScanRef.current > 2000) {
                    lastScanRef.current = now;
                    const roll = code.data.replace("ATTEND:", "");
                    checkIn(roll);
                }
            }
        }
        setTimeout(() => requestAnimationFrame(scanLoop), 150);
    }

    useEffect(() => {
        return () => stopCamera();
    }, []);

    function handleManualCheckIn(e) {
        e.preventDefault();
        if (!manualRoll.trim()) return;
        checkIn(manualRoll.trim());
        setManualRoll("");
    }

    return (
        <ProtectedRoute>
            <Header />
            <PageTitle>হাজিরা নিন</PageTitle>
            <main className="ledger-wrap">
                <div className="card-box">
                    <div
                        style={{
                            background: "#111",
                            borderRadius: 12,
                            overflow: "hidden",
                            position: "relative",
                            aspectRatio: "4/3",
                            maxWidth: 380,
                            margin: "0 auto",
                        }}
                    >
                        <video
                            ref={videoRef}
                            playsInline
                            muted
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                        <canvas ref={canvasRef} style={{ display: "none" }} />
                    </div>

                    <p
                        style={{
                            background: "var(--surface-soft)",
                            color: "var(--ink)",
                            padding: "10px 14px",
                            borderRadius: 8,
                            marginTop: 14,
                            fontSize: 14,
                            textAlign: "center",
                        }}
                    >
                        {message}
                    </p>

                    <div style={{ textAlign: "center" }}>
                        <button onClick={isScanning ? stopCamera : startCamera} className="btn-primary">
                            {isScanning ? "ক্যামেরা বন্ধ করুন" : "ক্যামেরা চালু করুন"}
                        </button>
                    </div>

                    <form onSubmit={handleManualCheckIn} style={{ marginTop: 24, display: "flex", gap: 8 }}>
                        <input
                            className="field-input"
                            placeholder="রোল নম্বর দিয়ে ম্যানুয়ালি হাজিরা দিন"
                            value={manualRoll}
                            onChange={(e) => setManualRoll(e.target.value)}
                        />
                        <button type="submit" className="btn-ghost">
                            হাজিরা দিন
                        </button>
                    </form>
                </div>

                <div className="card-box">
                    <h2 style={{ fontSize: 17, marginTop: 0 }}>আজকের স্ক্যান তালিকা</h2>
                    {todayLog.length === 0 ? (
                        <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>এখনো কেউ হাজিরা দেয়নি।</p>
                    ) : (
                        todayLog.map((entry, i) => (
                            <div
                                key={i}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    padding: "10px 0",
                                    borderBottom: "1px solid var(--border)",
                                    fontSize: 14,
                                }}
                            >
                                <span>
                                    {entry.name} <span style={{ color: "var(--ink-soft)", fontSize: 12 }}>(রোল: {entry.roll})</span>
                                </span>
                                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--ink-soft)" }}>
                                    {entry.time}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </ProtectedRoute>
    );
}