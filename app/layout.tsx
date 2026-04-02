import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { getActiveCustomerId } from "@/lib/customer-session";
import { selectOne } from "@/lib/db";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Student Shop App",
  description: "Simple customer and warehouse workflow app",
};

type Customer = {
  customer_id: number;
  full_name: string;
};

const NAV_LINKS = [
  { href: "/select-customer", label: "Select Customer" },
  { href: "/dashboard", label: "Customer Dashboard" },
  { href: "/place-order", label: "Place Order" },
  { href: "/order-history", label: "Order History" },
  { href: "/warehouse-priority-queue", label: "Fraud Review Queue" },
  { href: "/run-scoring", label: "Run Fraud Scoring" },
];

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const customerId = await getActiveCustomerId();
  const activeCustomer = customerId
  ? selectOne<Customer>("SELECT customer_id, full_name FROM customers WHERE customer_id = ?", [
      customerId,
    ])
  : null;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <header className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h1 className="text-xl font-semibold">Student Shop</h1>
            <p className="mt-1 text-sm text-slate-600">
            {activeCustomer
              ? `Acting as: ${activeCustomer.full_name}`
              : "No active customer selected"}
            </p>
            <nav className="mt-4 flex flex-wrap gap-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm hover:bg-slate-100"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
