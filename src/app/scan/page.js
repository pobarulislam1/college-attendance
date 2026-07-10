"use client";

import { useState, useRef, useEffect } from "react";
import Header from "@/lib/Header";
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

    // ---------- হাজিরা রেকর্ড করার মূল ফাংশন ----------
    async function checkIn(roll) {
        if (!roll) return;

        // ১. শিক্ষার্থী খুঁজে বের করা
        const studentsRef = collection(db, "students");
        const studentQuery = query(studentsRef, where("roll", "==", roll));
        const studentSnap = await getDocs(studentQuery);

        if (studentSnap.empty) {
            setMessage(`অজানা কোড — রোল ${roll} এর কোনো শিক্ষার্থী নেই`);
            return;
        }
        const student = studentSnap.docs[0].data();

        // ২. আজকে আগেই হাজিরা দিয়েছে কিনা চেক করা
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

        // ৩. নতুন হাজিরা রেকর্ড সেভ করা
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

    // ---------- ক্যামেরা চালু/বন্ধ ----------
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

    // ---------- প্রতি ফ্রেমে স্ক্যান করার লুপ ----------
    function scanLoop() {
        if (!scanningRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
            // পারফরম্যান্সের জন্য ছোট সাইজে প্রসেস করা (আসল ভিডিও সাইজ না)
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
        // প্রতি ফ্রেমে না করে একটু বিরতি দিয়ে স্ক্যান করা (CPU বাঁচাতে)
        setTimeout(() => requestAnimationFrame(scanLoop), 150);
    }

    // পেজ থেকে বেরিয়ে গেলে ক্যামেরা বন্ধ করে দেওয়া
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
            <Header title="শিক্ষার্থী তালিকা" />
            <main className="ledger-wrap">
                <main style={{ maxWidth: 500, margin: "0 auto", padding: 24, fontFamily: "sans-serif" }}>


                    <div style={{ background: "#111", borderRadius: 8, overflow: "hidden", position: "relative", aspectRatio: "4/3" }}>
                        <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <canvas ref={canvasRef} style={{ display: "none" }} />
                    </div>

                    <p style={{ background: "#eee", padding: 10, borderRadius: 6, marginTop: 12 }}>{message}</p>

                    <button
                        onClick={isScanning ? stopCamera : startCamera}
                        style={{ padding: "10px 20px", background: "#1B3A2E", color: "#fff", border: "none", borderRadius: 6 }}
                    >
                        {isScanning ? "ক্যামেরা বন্ধ করুন" : "ক্যামেরা চালু করুন"}
                    </button>

                    <form onSubmit={handleManualCheckIn} style={{ marginTop: 24, display: "flex", gap: 8 }}>
                        <input
                            placeholder="রোল নম্বর দিয়ে ম্যানুয়ালি হাজিরা দিন"
                            value={manualRoll}
                            onChange={(e) => setManualRoll(e.target.value)}
                            style={{ flex: 1, padding: 8 }}
                        />
                        <button type="submit" style={{ padding: "8px 16px" }}>
                            হাজিরা দিন
                        </button>
                    </form>

                    <h2 style={{ marginTop: 32 }}>আজকের স্ক্যান তালিকা</h2>
                    <ul>
                        {todayLog.map((entry, i) => (
                            <li key={i}>
                                {entry.name} (রোল: {entry.roll}) — {entry.time}
                            </li>
                        ))}
                    </ul>
                </main>
            </main>
        </ProtectedRoute>


    );
}