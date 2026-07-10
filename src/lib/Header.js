"use client";

import Link from "next/link";
import { useAuth } from "./AuthContext";

export default function Header({ title }) {
    const { logout } = useAuth();

    return (
        <div
            style={{
                position: "sticky",
                top: 0,
                zIndex: 50,
                height: 72,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                padding: "0 24px",
                background: "rgba(245, 244, 252, 0.92)",
                backdropFilter: "blur(8px)",
                borderBottom: "1px solid var(--border)",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 20, minWidth: 0 }}>
                <h1
                    style={{
                        margin: 0,
                        fontSize: 18,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {title}
                </h1>
                <nav style={{ display: "flex", gap: 14, fontSize: 13.5, whiteSpace: "nowrap" }}>
                    <Link href="/" style={{ color: "var(--indigo-dark)" }}>শিক্ষার্থী তালিকা</Link>
                    <Link href="/scan" style={{ color: "var(--indigo-dark)" }}>হাজিরা নিন</Link>
                    <Link href="/dashboard" style={{ color: "var(--indigo-dark)" }}>ড্যাশবোর্ড</Link>
                    <Link href="/reports" style={{ color: "var(--indigo-dark)" }}>রিপোর্ট</Link>
                </nav>
            </div>
            <button
                onClick={logout}
                style={{
                    flexShrink: 0,
                    padding: "8px 16px",
                    background: "var(--danger-bg)",
                    color: "var(--danger)",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                }}
            >
                লগআউট
            </button>
        </div>
    );
}