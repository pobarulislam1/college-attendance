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
        <main style={{ maxWidth: 400, margin: "80px auto", padding: 24, fontFamily: "sans-serif" }}>
            <h1>শিক্ষক লগইন</h1>
            <form onSubmit={handleLogin} style={{ display: "grid", gap: 12, marginTop: 20 }}>
                <input
                    type="email"
                    placeholder="ইমেইল"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ padding: 10 }}
                    required
                />
                <input
                    type="password"
                    placeholder="পাসওয়ার্ড"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ padding: 10 }}
                    required
                />
                {error && <p style={{ color: "#A3272B" }}>{error}</p>}
                <button
                    type="submit"
                    disabled={loading}
                    style={{ padding: 12, background: "#1B3A2E", color: "#fff", border: "none", borderRadius: 6 }}
                >
                    {loading ? "লগইন হচ্ছে..." : "লগইন করুন"}
                </button>
            </form>
        </main>
    );
}