import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const slug = (t) =>
  t.toLowerCase()
    .replace(/æ/g, "ae").replace(/ø/g, "oe").replace(/å/g, "aa")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// ---------- Edition 1: Olav Duun, Minneutgave ----------
const duunEd = {
  id: "ed--olav-duun-minneutgave-skrifter-i-12-bind-1949----print",
  name: "Olav Duun: Minneutgave (Skrifter i 12 bind, Olaf Norlis Forlag, 1949)",
  publisher: "Olaf Norlis Forlag",
  language: "Norwegian",
  format: "print",
};

// [title, first_published, bind, extraNote?]
const duunContents = [
  ["Marjane", 1908, 1],
  ["Løglege skruvar og anna folk", 1907, 1],
  ["På tvert", 1909, 1],
  ["Gamal jord", 1911, 1],
  ["Nøkksjølia", 1910, 2],
  ["Hilderøya", 1912, 2],
  ["Sigyn", 1913, 2],
  ["På Lyngsøya", 1917, 3],
  ["Tre venner", 1914, 3],
  ["Harald", 1915, 4],
  ["Det gode samvite", 1916, 4],
  ["Juvikingar", 1918, 5, "Part 1 of the Juvikfolke cycle (1918–1923)"],
  ["I blinda", 1919, 5, "Part 2 of the Juvikfolke cycle (1918–1923)"],
  ["Storbryllope", 1920, 6, "Part 3 of the Juvikfolke cycle (1918–1923)"],
  ["I eventyre", 1921, 6, "Part 4 of the Juvikfolke cycle (1918–1923)"],
  ["I ungdommen", 1922, 7, "Part 5 of the Juvikfolke cycle (1918–1923)"],
  ["I stormen", 1923, 7, "Part 6 of the Juvikfolke cycle (1918–1923)"],
  ["Straumen og Evja", 1926, 8],
  ["Carolus Magnus", 1928, 8],
  ["Blind-Anders", 1924, 9],
  ["Olsøygutane", 1927, 9],
  ["Vegar og Villstig", 1930, 9],
  ["Medmenneske", 1929, 10, "Part 1 of the Medmenneske trilogy (1929–1933)"],
  ["Ragnhild", 1931, 10, "Part 2 of the Medmenneske trilogy (1929–1933)"],
  ["Siste leveåre", 1933, 10, "Part 3 of the Medmenneske trilogy (1929–1933)"],
  ["Ettermæle", 1932, 11],
  ["Gud smiler", 1935, 11],
  ["Samtid", 1936, 12],
  ["Menneske og maktene", 1938, 12],
];

const duunWorks = duunContents.map(([title, yr, bind, extra]) => ({
  id: "olav-duun--" + slug(title),
  title,
  author: "Olav Duun",
  author_sort: "Duun, Olav",
  first_published: yr,
  original_language: "Norwegian",
  period: "Modernist / early 20th century",
  primary_movement: "Realism",
  secondary_movements: null,
  notes: `Minneutgave bind ${bind} (Olaf Norlis Forlag, 1949); nynorsk.` + (extra ? ` ${extra}.` : ""),
}));

// ---------- Edition 2: Thomas Korsgaard, Trilogien om Tue ----------
const korsEd = {
  id: "ed--thomas-korsgaard-trilogien-om-tue-2024----print",
  name: "Thomas Korsgaard: Trilogien om Tue (Bonnier norsk forlag, 2024)",
  publisher: "Bonnier norsk forlag",
  language: "Norwegian",
  format: "print",
};

// [no title, year, danish original]
const korsContents = [
  ["Hvis det skulle komme et menneske", 2017, "Hvis der skulle komme et menneske forbi"],
  ["En dag vil vi le av det", 2019, "En dag vil vi grine af det"],
  ["En måtte nok ha vært der", 2020, "Man skulle nok have været der"],
];

const korsWorks = korsContents.map(([title, yr, dan]) => ({
  id: "thomas-korsgaard--" + slug(title),
  title,
  author: "Thomas Korsgaard",
  author_sort: "Korsgaard, Thomas",
  first_published: yr,
  original_language: "Danish",
  period: "Contemporary",
  primary_movement: "Contemporary literary fiction",
  secondary_movements: "Autofiction",
  notes: `From "Trilogien om Tue" (Bonnier norsk forlag, 2024), Norwegian translation by Hilde Rød-Larsen. Orig. Danish: "${dan}" (${yr}).`,
}));

// ---------- read_status from goodreads.csv ----------
const reads = [
  { work_id: "olav-duun--menneske-og-maktene", title: "Menneske og maktene", author: "Olav Duun", date_read: "2025-10-07", rating: 5, source: "goodreads" },
  { work_id: "thomas-korsgaard--hvis-det-skulle-komme-et-menneske", title: "Hvis det skulle komme et menneske", author: "Thomas Korsgaard", date_read: "2023-03-09", rating: 4, source: "goodreads" },
];

async function run() {
  for (const ed of [duunEd, korsEd]) {
    const { error } = await s.from("editions").upsert(ed, { onConflict: "id" });
    if (error) throw new Error(`edition ${ed.id}: ${error.message}`);
    console.log("edition ok:", ed.id);
  }

  const allWorks = [...duunWorks, ...korsWorks];
  for (const w of allWorks) {
    const { error } = await s.from("works").upsert(w, { onConflict: "id" });
    if (error) throw new Error(`work ${w.id}: ${error.message}`);
  }
  console.log("works upserted:", allWorks.length);

  const links = [
    ...duunWorks.map((w) => ({ work_id: w.id, edition_id: duunEd.id })),
    ...korsWorks.map((w) => ({ work_id: w.id, edition_id: korsEd.id })),
  ];
  for (const l of links) {
    const { error } = await s.from("work_editions").upsert(l, { onConflict: "work_id,edition_id" });
    if (error) throw new Error(`link ${l.work_id}: ${error.message}`);
  }
  console.log("links upserted:", links.length);

  for (const r of reads) {
    const { error } = await s.from("read_status").upsert(r, { onConflict: "work_id" });
    if (error) throw new Error(`read ${r.work_id}: ${error.message}`);
  }
  console.log("read_status upserted:", reads.length);
}

run().then(() => { console.log("DONE"); process.exit(0); })
     .catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
