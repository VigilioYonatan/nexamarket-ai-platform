import pg from "pg";
import "dotenv/config";

async function main() {
  const pool = new pg.Pool({
    connectionString:
      process.env.DATABASE_URL ??
      "postgresql://llmops:llmops_test_pw@172.23.84.67:15432/nexamarket_test",
  });

  await pool.query(`
    DELETE FROM seller_applications
    WHERE display_name ILIKE 'QA%' OR display_name ILIKE 'E2E%' OR display_name ILIKE 'Test%';
  `);

  const richUsers = [
    {
      id: "00000000-0000-4000-8000-000000000011",
      sub: "buyer-diego-sub",
      email: "diego.alvarado@pucp.edu.pe",
      display_name: "Diego Alvarado",
      role: "BUYER",
      avatar_url:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80",
    },
    {
      id: "00000000-0000-4000-8000-000000000012",
      sub: "buyer-camila-sub",
      email: "camila.vargas@outlook.com.pe",
      display_name: "Camila Vargas",
      role: "BUYER",
      avatar_url:
        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80",
    },
    {
      id: "00000000-0000-4000-8000-000000000013",
      sub: "buyer-roberto-sub",
      email: "roberto.salazar@bcp.com.pe",
      display_name: "Roberto Salazar",
      role: "BUYER",
      avatar_url:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80",
    },
    {
      id: "00000000-0000-4000-8000-000000000014",
      sub: "buyer-ximena-sub",
      email: "ximena.castro@interbank.pe",
      display_name: "Ximena Castro",
      role: "BUYER",
      avatar_url:
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80",
    },
  ];

  for (const u of richUsers) {
    await pool.query(
      `
      INSERT INTO user_profiles (id, subject, email, display_name, role, avatar_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE
      SET display_name = EXCLUDED.display_name,
          avatar_url = EXCLUDED.avatar_url;
    `,
      [u.id, u.sub, u.email, u.display_name, u.role, u.avatar_url],
    );
  }

  await pool.query(`
    UPDATE user_profiles
    SET display_name = 'Valeria Mendoza · Admin Principal',
        avatar_url = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'
    WHERE email = 'admin@test.pe';

    UPDATE user_profiles
    SET display_name = 'Carlos Paredes · Seller Oficial',
        avatar_url = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80'
    WHERE email = 'seller@test.pe';

    UPDATE user_profiles
    SET display_name = 'Lucía Fernández · Compradora',
        avatar_url = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80'
    WHERE email = 'buyer@test.pe';

    DELETE FROM user_profiles
    WHERE email ILIKE 'qa-%' OR email ILIKE 'e2e-%' OR display_name ILIKE 'QA%';

    UPDATE user_profiles
    SET email = REPLACE(REPLACE(email, '.pe.invalid', '.pe'), '.invalid', '.pe')
    WHERE email LIKE '%.invalid';

    UPDATE user_profiles
    SET created_at = now() + interval '5 minutes'
    WHERE email IN ('admin@test.pe', 'seller@test.pe', 'buyer@test.pe');

    UPDATE user_profiles
    SET email = COALESCE(email, 'cliente.verificado@nexamarket.pe'),
        display_name = COALESCE(display_name, 'Mateo Quispe · Comprador Verificado')
    WHERE email IS NULL OR display_name IS NULL;

    UPDATE global_settings_versions
    SET tokens = jsonb_set(tokens, '{brand_name}', '"NexaMarket AI"', true);
  `);

  const kybApps = [
    {
      id: "10000000-0000-4000-8000-000000000101",
      userId: "00000000-0000-4000-8000-000000000011",
      name: "Andes Sound & Hi-Fi Perú",
      legalName: "Andes Sound & Hi-Fi Perú S.A.C.",
      taxId: "20608914521",
      status: "APPLIED",
    },
    {
      id: "10000000-0000-4000-8000-000000000102",
      userId: "00000000-0000-4000-8000-000000000012",
      name: "Lima Urban Lab & Sneakers",
      legalName: "Lima Urban Lab & Sneakers E.I.R.L.",
      taxId: "20609412839",
      status: "APPLIED",
    },
    {
      id: "10000000-0000-4000-8000-000000000103",
      userId: "00000000-0000-4000-8000-000000000013",
      name: "Inca Digital & Apple Reseller Perú",
      legalName: "Inca Digital Importaciones S.A.C.",
      taxId: "20607741902",
      status: "APPROVED",
    },
  ];
  for (const app of kybApps) {
    await pool.query(
      `
      INSERT INTO seller_applications (id, user_id, display_name, legal_name, tax_id, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE
      SET display_name = EXCLUDED.display_name,
          legal_name = EXCLUDED.legal_name,
          tax_id = EXCLUDED.tax_id,
          status = EXCLUDED.status;
    `,
      [app.id, app.userId, app.name, app.legalName, app.taxId, app.status],
    );
  }

  const summary = await Promise.all([
    pool.query("SELECT count(*) as c FROM seller_listings WHERE status = 'PUBLISHED'"),
    pool.query("SELECT count(*) as c FROM orders"),
    pool.query("SELECT count(*) as c FROM user_profiles"),
    pool.query("SELECT count(*) as c FROM sellers"),
    pool.query("SELECT count(*) as c FROM seller_applications"),
    pool.query("SELECT count(*) as c FROM support_tickets"),
    pool.query("SELECT count(*) as c FROM audit_events"),
  ]);
  console.log("Super Seeder Database Status:", {
    published_listings: Number(summary[0].rows[0].c),
    orders: Number(summary[1].rows[0].c),
    users: Number(summary[2].rows[0].c),
    sellers: Number(summary[3].rows[0].c),
    kyb_applications: Number(summary[4].rows[0].c),
    support_tickets: Number(summary[5].rows[0].c),
    audit_events: Number(summary[6].rows[0].c),
  });

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
