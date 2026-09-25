import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_Jm8eVuf9QLZq@ep-snowy-waterfall-aolziam1-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = neon(connectionString);

async function run() {
  console.log("=== Starting URL Migration: sh20raj/scriptly-codes -> 30tools/scriptly-codes ===\n");

  // 1. Check before counts
  const beforeCountResult = await sql`
    SELECT count(*)::int as count 
    FROM products 
    WHERE 
      thumbnail ILIKE '%sh20raj/scriptly-codes%' OR 
      screenshots ILIKE '%sh20raj/scriptly-codes%' OR 
      file_url ILIKE '%sh20raj/scriptly-codes%' OR 
      description ILIKE '%sh20raj/scriptly-codes%' OR
      preview_gif ILIKE '%sh20raj/scriptly-codes%' OR
      video_url ILIKE '%sh20raj/scriptly-codes%' OR
      demo_url ILIKE '%sh20raj/scriptly-codes%' OR
      short_description ILIKE '%sh20raj/scriptly-codes%'
  `;
  console.log(`Products to update: ${beforeCountResult[0].count}`);

  if (beforeCountResult[0].count === 0) {
    console.log("No products found matching sh20raj/scriptly-codes. Nothing to update.");
    return;
  }

  // 2. Perform the update
  const updateResult = await sql`
    UPDATE products
    SET 
      thumbnail = regexp_replace(thumbnail, 'sh20raj/scriptly-codes', '30tools/scriptly-codes', 'gi'),
      screenshots = regexp_replace(screenshots, 'sh20raj/scriptly-codes', '30tools/scriptly-codes', 'gi'),
      file_url = regexp_replace(file_url, 'sh20raj/scriptly-codes', '30tools/scriptly-codes', 'gi'),
      description = regexp_replace(description, 'sh20raj/scriptly-codes', '30tools/scriptly-codes', 'gi'),
      preview_gif = regexp_replace(preview_gif, 'sh20raj/scriptly-codes', '30tools/scriptly-codes', 'gi'),
      video_url = regexp_replace(video_url, 'sh20raj/scriptly-codes', '30tools/scriptly-codes', 'gi'),
      demo_url = regexp_replace(demo_url, 'sh20raj/scriptly-codes', '30tools/scriptly-codes', 'gi'),
      short_description = regexp_replace(short_description, 'sh20raj/scriptly-codes', '30tools/scriptly-codes', 'gi')
    WHERE 
      thumbnail ILIKE '%sh20raj/scriptly-codes%' OR 
      screenshots ILIKE '%sh20raj/scriptly-codes%' OR 
      file_url ILIKE '%sh20raj/scriptly-codes%' OR 
      description ILIKE '%sh20raj/scriptly-codes%' OR
      preview_gif ILIKE '%sh20raj/scriptly-codes%' OR
      video_url ILIKE '%sh20raj/scriptly-codes%' OR
      demo_url ILIKE '%sh20raj/scriptly-codes%' OR
      short_description ILIKE '%sh20raj/scriptly-codes%'
  `;
  console.log("Update executed successfully.");

  // 3. Check after counts
  const afterRemaining = await sql`
    SELECT count(*)::int as count 
    FROM products 
    WHERE 
      thumbnail ILIKE '%sh20raj/scriptly-codes%' OR 
      screenshots ILIKE '%sh20raj/scriptly-codes%' OR 
      file_url ILIKE '%sh20raj/scriptly-codes%' OR 
      description ILIKE '%sh20raj/scriptly-codes%' OR
      preview_gif ILIKE '%sh20raj/scriptly-codes%' OR
      video_url ILIKE '%sh20raj/scriptly-codes%' OR
      demo_url ILIKE '%sh20raj/scriptly-codes%' OR
      short_description ILIKE '%sh20raj/scriptly-codes%'
  `;
  console.log(`Remaining sh20raj/scriptly-codes records: ${afterRemaining[0].count}`);

  const newCounts = await sql`
    SELECT count(*)::int as count 
    FROM products 
    WHERE 
      thumbnail ILIKE '%30tools/scriptly-codes%' OR 
      screenshots ILIKE '%30tools/scriptly-codes%' OR 
      file_url ILIKE '%30tools/scriptly-codes%' OR 
      description ILIKE '%30tools/scriptly-codes%'
  `;
  console.log(`Total records now containing 30tools/scriptly-codes: ${newCounts[0].count}`);

  // 4. Sample verification
  const sample = await sql`
    SELECT title, thumbnail, file_url 
    FROM products 
    WHERE thumbnail ILIKE '%30tools/scriptly-codes%' 
    LIMIT 3
  `;
  console.log("\nSample updated products:");
  for (const p of sample) {
    console.log(`- ${p.title}`);
    console.log(`    thumbnail: ${p.thumbnail}`);
    console.log(`    file_url : ${p.file_url}`);
  }
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
