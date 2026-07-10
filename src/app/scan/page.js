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

    const [lastPhoto, setLastPhoto] = useState(null);

    const [message, setMessage] = useState("ক্যামেরা চালু করতে নিচের বাটনে চাপুন");
    const [isScanning, setIsScanning] = useState(false);
    const [manualRoll, setManualRoll] = useState("");
    const [todayLog, setTodayLog] = useState([]);

    function todayKey() {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return year + "-" + month + "-" + day;
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

    async function checkIn(roll, photoDataUrl) {
        if (!roll) return;

        const studentsRef = collection(db, "students");
        const studentQuery = query(studentsRef, where("roll", "==", roll));
        const studentSnap = await getDocs(studentQuery);

        if (studentSnap.empty) {
            setMessage("অজানা কোড — রোল " + roll + " এর কোনো শিক্ষার্থী নেই");
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
            setMessage(student.name + " — আগেই হাজিরা দেওয়া হয়েছে");
            return;
        }

        const time = new Date().toLocaleTimeString("bn-BD", {
            hour: "2-digit",
            minute: "2-digit",
        });

        const photoToSave = photoDataUrl ? photoDataUrl : null;

        await addDoc(attendanceRef, {
            roll: roll,
            studentName: student.name,
            date: todayKey(),
            time: time,
            createdAt: serverTimestamp(),
            photo: photoToSave,
        });

        setMessage("✓ " + student.name + " — হাজিরা নেওয়া হয়েছে");

        const newEntry = {
            roll: roll,
            name: student.name,
            time: time,
            photo: photoToSave,
        };
        setTodayLog(function (prev) {
            const updated = [newEntry].concat(prev);
            return updated;
        });
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
            const tracks = streamRef.current.getTracks();
            for (let i = 0; i < tracks.length; i++) {
                tracks[i].stop();
            }
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
                if (now - lastScanRef.current > 2000) {
                    lastScanRef.current = now;
                    const roll = code.data.replace("ATTEND:", "");
                    const thumbnail = makeThumbnail(video);
                    console.log("Thumbnail তৈরি হয়েছে, দৈর্ঘ্য:", thumbnail ? thumbnail.length : "কিছুই তৈরি হয়নি");
                    setLastPhoto(thumbnail);
                    checkIn(roll, thumbnail);
                }
            }
        }
        setTimeout(function () {
            requestAnimationFrame(scanLoop);
        }, 150);
    }

    useEffect(function () {
        return function () {
            stopCamera();
        };
    }, []);

    function handleManualCheckIn(e) {
        e.preventDefault();
        if (!manualRoll.trim()) return;
        checkIn(manualRoll.trim(), null);
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

                    {lastPhoto && (
                        <div style={{ textAlign: "center", marginTop: 12 }}>
                            <p style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 6 }}>
                                সর্বশেষ ধারণকৃত ছবি:
                            </p>
                            <img
                                src={lastPhoto}
                                alt="সর্বশেষ ছবি"
                                style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 8, border: "2px solid var(--indigo)" }}
                            />
                        </div>
                    )}

                    <p />

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
                        todayLog.map(function (entry, i) {
                            return (
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
                                    {entry.photo ? (
                                        <img
                                            src={entry.photo}
                                            alt="প্রমাণ"
                                            style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 8,
                                                objectFit: "cover",
                                                flexShrink: 0,
                                            }}
                                        />
                                    ) : (
                                        <div
                                            style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 8,
                                                background: "var(--surface-soft)",
                                                flexShrink: 0,
                                            }}
                                        />
                                    )}
                                    <span style={{ flex: 1 }}>
                                        {entry.name}{" "}
                                        <span style={{ color: "var(--ink-soft)", fontSize: 12 }}>
                                            (রোল: {entry.roll})
                                        </span>
                                    </span>
                                    <span
                                        style={{
                                            fontFamily: "'JetBrains Mono', monospace",
                                            fontSize: 12,
                                            color: "var(--ink-soft)",
                                        }}
                                    >
                                        {entry.time}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>
        </ProtectedRoute>
    );
}