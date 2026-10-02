import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import ThemeProvider from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: {
    default: "لم‌فود | منوی آنلاین رستوران",
    template: "%s | لم‌فود",
  },
  description:
    "منوی آنلاین رستوران لم‌فود — سفارش آسان و سریع از طریق واتساپ و اسنپ‌فود",
  icons: { icon: "/uploads/logo.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#166b73",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Inline FOUC-prevention script: reads the saved light/dark mode from
  // localStorage and adds the `.dark` class to <html> BEFORE first paint,
  // so the page doesn't flash the wrong theme for a frame. Runs synchronously
  // in <head> before the body renders.
  const themeModeScript = `(function(){try{var s=localStorage.getItem("lamfood-theme-mode");var d=s==="dark"||(s===null&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");}catch(e){}})();`

  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{ __html: themeModeScript }}
        />
      </head>
      <body className="antialiased bg-background text-foreground">
        <ThemeProvider />
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
