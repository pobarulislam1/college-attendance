"use client";

import { useState, useRef, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
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
    const [lastStatus, setLastStatus] = useState(null);

    function todayKey() {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function playBeep(type) {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContextClass();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            if (type === "in") {
                oscillator.frequency.value = 880; // উঁচু স্বর — check-in
            } else if (type === "out") {
                oscillator.frequency.value = 523; // মাঝারি স্বর — check-out
            } else {
                oscillator.frequency.value = 220; // নিচু স্বর — এরর/অজানা
            }

            oscillator.type = "sine";
            gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.25);
        } catch (err) {
            // সাউন্ড না বাজলেও অ্যাপের কাজে কোনো প্রভাব পড়বে না
        }
    }


    function makeThumbnail(video) {
        const thumbCanvas = document.createElement("canvas");
        const targetWidth = 160;
        const scale = targetWidth / video.videoWidth;
        thumbCanvas.width = targetWidth;
        thumbCanvas.height = video.videoHeight * scale;
        const ctx = thumbCanvas.getContext("2d");
        ctx.drawImage(video, 0, 0, thumbCanvas.width, thumbCanvas.height);
        return thumbCanvas.toDataURL("image/jpeg", 0.5);
    }

    async function checkInOrOut(roll, photoDataUrl) {
        if (!roll) return;

        const studentsRef = collection(db, "students");
        const studentQuery = query(studentsRef, where("roll", "==", roll));
        const studentSnap = await getDocs(studentQuery);

        if (studentSnap.empty) {
            playBeep("error");
            setMessage(`অজানা কোড — রোল ${roll} এর কোনো শিক্ষার্থী নেই`);
            return;
        }

        const student = studentSnap.docs[0].data();
        const dateKey = todayKey();
        const docId = `${dateKey}_${roll}`;
        const attRef = doc(db, "attendance", docId);
        const existingSnap = await getDoc(attRef);

        const time = new Date().toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });
        const nowMs = Date.now();
        const COOLDOWN_MS = 30 * 60 * 1000; // ৩০ মিনিট

        if (!existingSnap.exists()) {
            // প্রথম স্ক্যান আজকের জন্য — CHECK-IN, কুলডাউনের প্রশ্নই নেই
            await setDoc(attRef, {
                roll,
                studentName: student.name,
                date: dateKey,
                checkInTime: time,
                checkInPhoto: photoDataUrl || null,
                checkOutTime: null,
                checkOutPhoto: null,
                status: "in",
                lastActionAtMs: nowMs,
                createdAt: serverTimestamp(),
            });

            playBeep("in");
            setMessage(`✓ ${student.name} — ক্লাসে প্রবেশ (Check-in) করা হয়েছে`);
            setLastStatus({ name: student.name, status: "in", time });

            setTodayLog((prev) => [{ roll, name: student.name, time, status: "in", photo: photoDataUrl }, ...prev]);
            return;
        }

        const existing = existingSnap.data();
        const lastActionAtMs = existing.lastActionAtMs || 0;
        const elapsed = nowMs - lastActionAtMs;

        // ৩০ মিনিট এখনো পার হয়নি
        if (elapsed < COOLDOWN_MS) {
            const remainingMin = Math.ceil((COOLDOWN_MS - elapsed) / 60000);
            playBeep("error");
            setMessage(`${student.name} — একটু আগেই স্ক্যান হয়েছে। আরও ${remainingMin} মিনিট পর আবার চেষ্টা করুন।`);
            return;
        }

        if (existing.status === "in") {
            // কুলডাউন পার হয়েছে, এখন CHECK-OUT
            await updateDoc(attRef, {
                checkOutTime: time,
                checkOutPhoto: photoDataUrl || null,
                status: "out",
                lastActionAtMs: nowMs,
            });

            playBeep("out");
            setMessage(`✓ ${student.name} — ক্লাস থেকে বের হলো (Check-out) — সময়: ${time}`);
            setLastStatus({ name: student.name, status: "out", time });
            setTodayLog((prev) => [{ roll, name: student.name, time, status: "out", photo: photoDataUrl }, ...prev]);
        } else {
            setMessage(`${student.name} — আজকের জন্য প্রবেশ ও বাহির দুটোই সম্পন্ন হয়ে গেছে`);
        }
    }

    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            streamRef.current = stream;
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            scanningRef.current = true;
            setIsScanning(true);
            setMessage("QR কোড ক্যামেরার সামনে ধরুন");
            requestAnimationFrame(scanLoop);
        } catch (err) {
            setMessage("ক্যামেরা চালু করা যায়নি — নিচে ম্যানুয়ালি রোল দিয়ে চেক-ইন/আউট করুন");
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

            if (code && code.data && code.data.indexOf("ATTEND:") === 0) {
                const now = Date.now();
                if (now - lastScanRef.current > 3000) {
                    lastScanRef.current = now;
                    const roll = code.data.replace("ATTEND:", "");
                    const thumbnail = makeThumbnail(video);
                    checkInOrOut(roll, thumbnail);
                }
            }
        }
        setTimeout(() => requestAnimationFrame(scanLoop), 150);
    }

    useEffect(() => {
        return () => stopCamera();
    }, []);

    function handleManualSubmit(e) {
        e.preventDefault();
        if (!manualRoll.trim()) return;
        checkInOrOut(manualRoll.trim(), null);
        setManualRoll("");
    }

    return (
        <ProtectedRoute>
            <Header/>
            <PageTitle>হাজিরা নিন (Check-in / Check-out)</PageTitle>
            <main className="ledger-wrap">
                <div className="card-box">
                    <div
                        style={{
                            background: "#111",
                            borderRadius: 12,
                            overflow: "hidden",
                            position: "relative",
                            aspectRatio: "4/3",
                            maxWidth: 350,
                            margin: "0 auto",
                        }}
                    >
                        <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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

                    <form onSubmit={handleManualSubmit} style={{ marginTop: 24, display: "flex", gap: 8 }}>
                        <input
                            className="field-input"
                            placeholder="রোল নম্বর দিয়ে ম্যানুয়ালি চেক-ইন/আউট করুন"
                            value={manualRoll}
                            onChange={(e) => setManualRoll(e.target.value)}
                        />
                        <button type="submit" className="btn-ghost">
                            সাবমিট
                        </button>
                    </form>
                </div>

                {lastStatus && (
                    <div className="card-box" style={{ textAlign: "center" }}>
                        <div
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "10px 20px",
                                borderRadius: 30,
                                background: lastStatus.status === "in" ? "var(--success-bg)" : "var(--danger-bg)",
                            }}
                        >
                            <span
                                className="live-dot"
                                style={{
                                    width: 14,
                                    height: 14,
                                    background: lastStatus.status === "in" ? "var(--success)" : "var(--danger)",
                                    boxShadow: `0 0 10px ${lastStatus.status === "in" ? "var(--success)" : "var(--danger)"}`,
                                }}
                            />
                            <span style={{ fontWeight: 700, color: lastStatus.status === "in" ? "var(--success)" : "var(--danger)" }}>
                                {lastStatus.name} — {lastStatus.status === "in" ? "ভিতরে আছে (Check-in)" : "বের হয়েছে (Check-out)"} · {lastStatus.time}
                            </span>
                        </div>
                    </div>
                )}

                <div className="card-box">
                    <h2 style={{ fontSize: 17, marginTop: 0 }}>আজকের কার্যক্রম</h2>
                    {todayLog.length === 0 ? (
                        <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>এখনো কেউ স্ক্যান করেনি।</p>
                    ) : (
                        todayLog.map((entry, i) => (
                            <div
                                key={i}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    padding: "10px 0",
                                    borderBottom: "1px solid var(--border)",
                                    fontSize: 14,
                                }}
                            >
                                <span
                                    style={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: "50%",
                                        background: entry.status === "in" ? "var(--success)" : "var(--danger)",
                                        flexShrink: 0,
                                    }}
                                />
                                {entry.photo ? (
                                    <img src={entry.photo} alt={entry.name} style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                                ) : (
                                    <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--surface-soft)", flexShrink: 0 }} />
                                )}
                                <span style={{ flex: 1 }}>
                                    {entry.name} <span style={{ color: "var(--ink-soft)", fontSize: 12 }}>(রোল: {entry.roll})</span>
                                </span>
                                <span style={{ fontSize: 12, fontWeight: 600, color: entry.status === "in" ? "var(--success)" : "var(--danger)" }}>
                                    {entry.status === "in" ? "IN" : "OUT"}
                                </span>
                                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--ink-soft)" }}>{entry.time}</span>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </ProtectedRoute>
    );
}