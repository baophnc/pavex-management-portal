import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Pavex Management Portal",
    template: "%s | Pavex Management Portal",
  },
  description: "Cổng quản trị vận hành Pavex Express",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
