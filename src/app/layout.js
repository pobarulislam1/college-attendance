import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";

export const metadata = {
  title: "কলেজ হাজিরা সিস্টেম",
  description: "ডিজিটাল হাজিরা ব্যবস্থাপনা",
};

export default function RootLayout({ children }) {
  return (
    <html lang="bn">
      <body suppressHydrationWarning={true}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}