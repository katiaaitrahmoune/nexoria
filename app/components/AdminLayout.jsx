import Sidebar from "./SideBar";

export default function AdminLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-[#f3f4f0]">
      <Sidebar />
      {/* main content — offset by sidebar width (w-64 = 256px) */}
      <main className="ml-64 flex-1 min-h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}