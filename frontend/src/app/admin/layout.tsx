import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GetOrder Admin — Панель управления",
  description: "Панель управления рестораном GetOrder",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
