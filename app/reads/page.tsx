import { getWorks } from "@/lib/books";
import { ReadsClient } from "@/components/reads-client";
import { AppHeader } from "@/components/app-header";

export const metadata = { title: "Read books — Personal Library" };
export const dynamic = "force-dynamic";

export default async function ReadsPage() {
  const works = await getWorks();

  return (
    <div className="min-h-screen">
      <AppHeader mode="back" />

      <main className="enter-up mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        <ReadsClient initialWorks={works} />
      </main>
    </div>
  );
}
