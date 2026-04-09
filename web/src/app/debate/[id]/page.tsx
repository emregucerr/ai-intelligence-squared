import { Navbar } from "@/components/Navbar";
import { DebateReplay } from "@/components/debate/DebateReplay";
import { notFound } from "next/navigation";
import { getDebateById, getDebates } from "@/lib/benchmark-data";
import fs from "fs";
import path from "path";

interface Props {
  params: Promise<{ id: string }>;
}

async function getDebateData(id: string) {
  // Try to load full transcript from filesystem (available in monorepo dev/build)
  try {
    const debatePath = path.join(
      process.cwd(),
      "..",
      "benchmark",
      "results",
      "debates",
      `${id}.json`
    );
    if (fs.existsSync(debatePath)) {
      const raw = fs.readFileSync(debatePath, "utf-8");
      return JSON.parse(raw);
    }
  } catch {
    // fall through
  }

  // Fall back to bundled benchmark-results.json summary data
  return getDebateById(id);
}

export default async function DebateReplayPage({ params }: Props) {
  const { id } = await params;
  const debate = await getDebateData(id);

  if (!debate) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DebateReplay debate={debate} />
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  // Try filesystem first (monorepo dev/build)
  try {
    const debatesDir = path.join(
      process.cwd(),
      "..",
      "benchmark",
      "results",
      "debates"
    );
    if (fs.existsSync(debatesDir)) {
      const fromFs = fs
        .readdirSync(debatesDir)
        .filter((f) => f.endsWith(".json") && !f.startsWith("test"))
        .map((f) => ({ id: f.replace(".json", "") }));
      if (fromFs.length > 0) return fromFs;
    }
  } catch {
    // fall through
  }

  // Fall back to bundled data
  return getDebates().map((d) => ({ id: d.debate_id }));
}
