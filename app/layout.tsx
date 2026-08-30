import type { Metadata, Viewport } from "next";
import "./globals.css";
import { InstallPrompt } from "@/components/install-prompt";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { OfflineBanner } from "@/components/offline-banner";
import { PwaRuntime } from "@/components/pwa-runtime";
import { BottomNav } from "@/components/bottom-nav";
import { NavigationLoader } from "@/components/navigation-loader";

export const metadata: Metadata = {
  title: "The Library",
  description: "Browse a personal book collection by literary period and movement.",
  applicationName: "The Library",
  appleWebApp: {
    capable: true,
    title: "The Library",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Extend under the Android gesture bar / notch so safe-area insets apply.
  viewportFit: "cover",
  themeColor: "#f1f4f1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <NavigationLoader />
        <BottomNav />
        <OfflineBanner />
        <InstallPrompt />
        <ServiceWorkerRegister />
        <PwaRuntime />
      </body>
    </html>
  );
}
