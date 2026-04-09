import { Navbar } from "@/components/Navbar";
import { DebateReplay } from "@/components/debate/DebateReplay";
import { notFound } from "next/navigation";
import fs from "fs";
import path from "path";

interface Props {
  params: Promise<{ id: string }>;
}

async function getDebateData(id: string) {
  // Try to load from benchmark results
  const debatePath = path.join(
    process.cwd(),
    "..",
    "benchmark",
    "results",
    "debates",
    `${id}.json`
  );

  try {
    if (fs.existsSync(debatePath)) {
      const raw = fs.readFileSync(debatePath, "utf-8");
      return JSON.parse(raw);
    }
  } catch {
    // fall through
  }

  return null;
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

// Generate static paths for completed debates
export async function generateStaticParams() {
  const debatesDir = path.join(
    process.cwd(),
    "..",
    "benchmark",
    "results",
    "debates"
  );

  try {
    if (fs.existsSync(debatesDir)) {
      return fs
        .readdirSync(debatesDir)
        .filter((f) => f.endsWith(".json") && !f.startsWith("test"))
        .map((f) => ({ id: f.replace(".json", "") }));
    }
  } catch {
    // fall through
  }

  return [];
}
