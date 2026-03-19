import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FILE = path.join(ROOT, "generated", "manifest.json");

export type ManifestPlatformEntry = {
  generated: boolean;
  time: string;
};

export type ManifestEntry = {
  instagram?: ManifestPlatformEntry;
  pinterest?: ManifestPlatformEntry;
};

export type ManifestData = Record<string, ManifestEntry>;

function ensureFile() {
  const dir = path.dirname(FILE);
  fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify({}, null, 2), "utf8");
  }
}

export function readManifest(): ManifestData {
  ensureFile();

  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8")) as ManifestData;
  } catch {
    return {};
  }
}

export function writeManifest(data: ManifestData) {
  ensureFile();
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), "utf8");
}

export function updateManifest(
  slug: string,
  platform: "instagram" | "pinterest"
) {
  const data = readManifest();

  if (!data[slug]) {
    data[slug] = {};
  }

  data[slug][platform] = {
    generated: true,
    time: new Date().toISOString(),
  };

  writeManifest(data);
}