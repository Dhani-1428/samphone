import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Samphone Admin",
  description: "Portugal ecommerce admin panel",
};

/** Root layout — auth + dashboard shells in Step 8 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
