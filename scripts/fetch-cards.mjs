import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_BASE = "https://api.github.com/repos/AlteredEquinox/cards-nonunique";

// Rarity labels for each variant index (3 images = C/R1/R2, 1 image = hero)
const RARITY_LABELS = ["C", "R1", "R2"];

async function fetchJSON(url) {
  const headers = { Accept: "application/vnd.github.v3+json" };
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok)
    throw new Error(`GitHub API ${res.status}: ${res.statusText} — ${url}`);
  return res.json();
}

async function getSubtreeSha(parentSha, name) {
  const tree = await fetchJSON(`${API_BASE}/git/trees/${parentSha}`);
  const entry = tree.tree.find((t) => t.path === name && t.type === "tree");
  if (!entry) throw new Error(`"${name}" not found in tree ${parentSha}`);
  return entry.sha;
}

async function main() {
  console.log("Fetching FUGUE cards from GitHub...");

  // Walk down to assets/FUGUE/CARDS to get a focused recursive tree
  const main = await fetchJSON(`${API_BASE}/git/trees/main`);
  const assetsSha = await getSubtreeSha(main.sha, "assets");
  const fugueSha = await getSubtreeSha(assetsSha, "FUGUE");
  const cardsSha = await getSubtreeSha(fugueSha, "CARDS");

  const cardsTree = await fetchJSON(
    `${API_BASE}/git/trees/${cardsSha}?recursive=1`,
  );
  if (cardsTree.truncated) {
    console.warn("Warning: tree was truncated, some cards may be missing");
  }

  // Detect whether the structure uses a JPG/ intermediate folder
  const hasJpgDir = cardsTree.tree.some((e) => e.path.includes("/JPG/"));

  // Collect raw images per cardId per lang (files sorted alphabetically by git)
  const rawCards = new Map();

  for (const entry of cardsTree.tree) {
    if (entry.type !== "blob" || !entry.path.endsWith(".jpg")) continue;

    const parts = entry.path.split("/");
    let cardId, lang, filename;

    if (parts.length === 3 && !parts.includes("JPG")) {
      [cardId, lang, filename] = parts;
    } else if (parts.length === 4 && parts[1] === "JPG") {
      [cardId, , lang, filename] = parts;
    } else {
      continue;
    }

    if (!rawCards.has(cardId)) {
      const match = cardId.match(/^ALT_FUGUE_([A-Z])_([A-Z]{2})_(\d+)$/);
      if (!match) continue;
      rawCards.set(cardId, {
        id: cardId,
        product: match[1],
        faction: match[2],
        slot: parseInt(match[3]),
        images: {},
      });
    }

    const card = rawCards.get(cardId);
    if (!card.images[lang]) card.images[lang] = [];
    card.images[lang].push(filename);
  }

  // Explode each card's images into individual variant entries (C, R1, R2)
  // Each image becomes its own card entry with a rarity label
  const cards = [];

  for (const raw of rawCards.values()) {
    // Determine variant count from the first available language
    const firstLang = Object.keys(raw.images)[0];
    if (!firstLang) continue;
    const variantCount = raw.images[firstLang].length;

    for (let vi = 0; vi < variantCount; vi++) {
      const rarity =
        variantCount === 1 ? "HERO" : (RARITY_LABELS[vi] ?? `V${vi}`);

      // Build per-lang image map (single file per lang for this variant)
      const image = {};
      for (const [lang, files] of Object.entries(raw.images)) {
        if (files[vi]) image[lang] = files[vi];
      }

      cards.push({
        id: `${raw.id}_${rarity}`,
        family: `${raw.faction}_${raw.slot}`,
        product: raw.product,
        faction: raw.faction,
        slot: raw.slot,
        rarity,
        image,
      });
    }
  }

  const sorted = cards.sort((a, b) => {
    if (a.faction !== b.faction) return a.faction.localeCompare(b.faction);
    if (a.slot !== b.slot) return a.slot - b.slot;
    if (a.product !== b.product) return a.product.localeCompare(b.product);
    // C < R1 < R2 < HERO
    const rarityOrder = { C: 0, R1: 1, R2: 2, HERO: 3 };
    return (rarityOrder[a.rarity] ?? 9) - (rarityOrder[b.rarity] ?? 9);
  });

  const result = {
    cards: sorted,
    hasJpgDir,
    fetchedAt: new Date().toISOString(),
  };

  const outDir = join(__dirname, "..", "src", "data");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "cards.json"), JSON.stringify(result, null, 2));

  const factions = [...new Set(sorted.map((c) => c.faction))];
  const products = [...new Set(sorted.map((c) => c.product))];
  const rarities = [...new Set(sorted.map((c) => c.rarity))];
  const families = [...new Set(sorted.map((c) => c.family))];
  console.log(
    `Found ${sorted.length} card variants from ${families.length} card families`,
  );
  console.log(`  Factions: ${factions.join(", ")}`);
  console.log(`  Products: ${products.join(", ")}`);
  console.log(`  Rarities: ${rarities.join(", ")}`);
  console.log(`  JPG subfolder: ${hasJpgDir}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
