"use client";

import Link from "next/link";
import { useAuth } from "./AuthContext";

export default function Header({ title }) {
    const { logout } = useAuth();

    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 24,
                paddingBottom: 16,
                borderBottom: "1px solid #ddd",
            }}
        >
            <div>
                <h1 style={{ margin: 0 }}>{title}</h1>
                <nav style={{ marginTop: 8, display: "flex", gap: 14, fontSize: 14 }}>
                    <Link href="/" style={{ color: "#1B3A2E" }}>শিক্ষার্থী তালিকা</Link>
                    <Link href="/scan" style={{ color: "#1B3A2E" }}>হাজিরা নিন</Link>
                    <Link href="/dashboard" style={{ color: "#1B3A2E" }}>ড্যাশবোর্ড</Link>
                </nav>
            </div>
            <button
                onClick={logout}
                style={{
                    padding: "8px 16px",
                    background: "transparent",
                    color: "#A3272B",
                    border: "1px solid #A3272B",
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: "pointer",
                    height: "fit-content",
                }}
            >
                লগআউট
            </button>
        </div>
    );
}