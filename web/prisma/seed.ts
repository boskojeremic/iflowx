import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  console.log("Seed skipped (manual Core Admin setup).");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });