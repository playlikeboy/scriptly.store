import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_Jm8eVuf9QLZq@ep-snowy-waterfall-aolziam1-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = neon(connectionString);

async function main() {
  console.log("=== Converting raw.githubusercontent.com URLs to jsDelivr CDN ===\n");

  const before = await sql`
    SELECT count(*)::int as count 
    FROM products 
    WHERE thumbnail LIKE '%raw.githubusercontent.com/30tools/scriptly-codes/main/%'
       OR screenshots LIKE '%raw.githubusercontent.com/30tools/scriptly-codes/main/%'
       OR file_url LIKE '%raw.githubusercontent.com/30tools/scriptly-codes/main/%'
       OR description LIKE '%raw.githubusercontent.com/30tools/scriptly-codes/main/%'
  `;
  console.log(`Matching records before migration: ${before[0].count}`);

  if (before[0].count === 0) {
    console.log("No matching records found. Nothing to update.");
    return;
  }

  // Update products to use jsDelivr CDN
  await sql`
    UPDATE products
    SET 
      thumbnail = replace(thumbnail, 'https://raw.githubusercontent.com/30tools/scriptly-codes/main/', 'https://cdn.jsdelivr.net/gh/30tools/scriptly-codes@main/'),
      screenshots = replace(screenshots, 'https://raw.githubusercontent.com/30tools/scriptly-codes/main/', 'https://cdn.jsdelivr.net/gh/30tools/scriptly-codes@main/'),
      file_url = replace(file_url, 'https://raw.githubusercontent.com/30tools/scriptly-codes/main/', 'https://cdn.jsdelivr.net/gh/30tools/scriptly-codes@main/'),
      preview_gif = replace(preview_gif, 'https://raw.githubusercontent.com/30tools/scriptly-codes/main/', 'https://cdn.jsdelivr.net/gh/30tools/scriptly-codes@main/'),
      description = replace(description, 'https://raw.githubusercontent.com/30tools/scriptly-codes/main/', 'https://cdn.jsdelivr.net/gh/30tools/scriptly-codes@main/')
    WHERE 
      thumbnail LIKE '%raw.githubusercontent.com/30tools/scriptly-codes/main/%' OR 
      screenshots LIKE '%raw.githubusercontent.com/30tools/scriptly-codes/main/%' OR 
      file_url LIKE '%raw.githubusercontent.com/30tools/scriptly-codes/main/%' OR 
      description LIKE '%raw.githubusercontent.com/30tools/scriptly-codes/main/%';
  `;
  console.log("Update executed successfully.");

  const after = await sql`
    SELECT count(*)::int as count 
    FROM products 
    WHERE thumbnail LIKE '%raw.githubusercontent.com/30tools/scriptly-codes/main/%'
       OR screenshots LIKE '%raw.githubusercontent.com/30tools/scriptly-codes/main/%'
       OR file_url LIKE '%raw.githubusercontent.com/30tools/scriptly-codes/main/%'
       OR description LIKE '%raw.githubusercontent.com/30tools/scriptly-codes/main/%'
  `;
  console.log(`Remaining raw.githubusercontent.com records for 30tools/scriptly-codes: ${after[0].count}`);

  const jsdelivrCount = await sql`
    SELECT count(*)::int as count 
    FROM products 
    WHERE thumbnail LIKE '%cdn.jsdelivr.net/gh/30tools/scriptly-codes%'
       OR screenshots LIKE '%cdn.jsdelivr.net/gh/30tools/scriptly-codes%'
       OR file_url LIKE '%cdn.jsdelivr.net/gh/30tools/scriptly-codes%'
  `;
  console.log(`Total products now using jsDelivr for 30tools/scriptly-codes: ${jsdelivrCount[0].count}`);

  // Sample check
  const sample = await sql`
    SELECT title, thumbnail, file_url 
    FROM products 
    WHERE thumbnail LIKE '%cdn.jsdelivr.net/gh/30tools/scriptly-codes%' 
    LIMIT 3
  `;
  console.log("\nSample updated products:");
  for (const s of sample) {
    console.log(`- ${s.title}`);
    console.log(`    thumbnail: ${s.thumbnail}`);
    console.log(`    file_url : ${s.file_url}`);
  }
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
