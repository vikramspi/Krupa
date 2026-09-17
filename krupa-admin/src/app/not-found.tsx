import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-bold">Not found</h1>
      <Link href="/" className="font-semibold text-brand-700 underline">
        Back to the dashboard
      </Link>
    </main>
  );
}
