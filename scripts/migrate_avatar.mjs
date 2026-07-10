import pg from "pg";

async function main() {
  const pool = new pg.Pool({
    connectionString: "postgresql://llmops:llmops_test_pw@172.23.84.67:15432/nexamarket_test",
  });

  console.log("Adding avatar_url column to user_profiles...");
  await pool.query("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url text;");

  console.log("Assigning professional avatars to existing profiles...");
  await pool.query(`
    UPDATE user_profiles
    SET avatar_url = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'
    WHERE role = 'ADMIN';

    UPDATE user_profiles
    SET avatar_url = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80'
    WHERE email LIKE '%seller%' OR display_name LIKE '%Vendedor%' OR display_name LIKE '%Store%' OR display_name LIKE '%Official%';

    UPDATE user_profiles
    SET avatar_url = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80'
    WHERE avatar_url IS NULL;
  `);

  console.log("Checking sample users with avatars...");
  const res = await pool.query("SELECT id, display_name, email, role, avatar_url FROM user_profiles LIMIT 5");
  console.table(res.rows);

  await pool.end();
  console.log("Migration complete!");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
