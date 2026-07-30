import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";
import MainLayout from "@/components/MainLayout";

export default function MainRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <MainLayout>{children}</MainLayout>
      <BottomNav />
    </>
  );
}
