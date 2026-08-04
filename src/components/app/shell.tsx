import { Sidebar } from "./sidebar";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="flex min-h-screen flex-1 flex-col">{children}</main>
    </div>
  );
}