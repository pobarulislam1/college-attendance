"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    if (loading) {
        return <p style={{ textAlign: "center", marginTop: 60 }}>লোড হচ্ছে...</p>;
    }

    if (!user) {
        return null; // লগইন পেজে পাঠানো হচ্ছে
    }

    return children;
}