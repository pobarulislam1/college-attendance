"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    async function handleLogin(e) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(email, password);
            router.push("/");
        } catch (err) {
            setError("ইমেইল বা পাসওয়ার্ড ভুল হয়েছে");
        }
        setLoading(false);
    }

    return (
        <main
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
            }}
        >
            <div className="card-box" style={{ width: "100%", maxWidth: 380 }}>
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <div
                        style={{
                            width: 52,
                            height: 52,
                            borderRadius: 14,
                            background: "linear-gradient(135deg, var(--indigo) 0%, var(--violet) 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 14px auto",
                            fontSize: 24,
                        }}
                    >
                        📋
                    </div>
                    <h1 style={{ fontSize: 22, margin: 0 }}>শিক্ষক লগইন</h1>
                    <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 6 }}>
                        হাজিরা সিস্টেমে প্রবেশ করতে লগইন করুন
                    </p>
                </div>

                <form onSubmit={handleLogin} style={{ display: "grid", gap: 14 }}>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", display: "block", marginBottom: 6 }}>
                            ইমেইল
                        </label>
                        <input
                            type="email"
                            placeholder="teacher@college.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="field-input"
                            required
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", display: "block", marginBottom: 6 }}>
                            পাসওয়ার্ড
                        </label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="field-input"
                            required
                        />
                    </div>

                    {error && (
                        <p
                            style={{
                                background: "var(--danger-bg)",
                                color: "var(--danger)",
                                fontSize: 13,
                                padding: "8px 12px",
                                borderRadius: 8,
                                margin: 0,
                            }}
                        >
                            {error}
                        </p>
                    )}

                    <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: 6 }}>
                        {loading ? "লগইন হচ্ছে..." : "লগইন করুন"}
                    </button>
                </form>
            </div>
        </main>
    );
}