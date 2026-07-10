/** One-shot operator action after verifying Keycloak subject through trusted identity console. */
import { Pool } from "pg";
import { cfg } from "../config.js";

async function main() {
  const subject = process.env.ADMIN_SUBJECT;
  if (!subject || subject.length < 8)
    throw new Error("ADMIN_SUBJECT required (verified Keycloak subject)");
  if (process.env.ADMIN_BOOTSTRAP_APPROVED !== "yes")
    throw new Error("ADMIN_BOOTSTRAP_APPROVED=yes required");
  const pool = new Pool({ connectionString: cfg.DATABASE_URL });
  try {
    const row = await pool.query(
      `UPDATE user_profiles SET role='ADMIN' WHERE subject=$1 RETURNING id`,
      [subject],
    );
    if (row.rowCount !== 1) throw new Error("Account must log in first; no user was promoted");
    // Revoke every pre-promotion session. Operator must require TOTP in Keycloak before granting any admin access.
    await pool.query(
      "UPDATE user_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
      [row.rows[0].id],
    );
    await pool.query(
      "INSERT INTO audit_events(actor_user_id,action,resource_id) VALUES($1,$2,$1)",
      [row.rows[0].id, "ADMIN_BOOTSTRAP"],
    );
    console.log(
      "Admin role assigned; all previous sessions revoked. MFA enrollment must be verified in Keycloak before further use.",
    );
  } finally {
    await pool.end();
  }
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "bootstrap failed");
  process.exit(1);
});
