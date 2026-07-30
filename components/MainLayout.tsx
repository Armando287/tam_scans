"use client";
import { usePathname } from "next/navigation";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isReader = pathname?.includes("/read/");

  return (
    <main className={isReader ? "reader-main" : "main-content"}>
      {children}
    </main>
  );
}
