import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { cfg } from "../config.js";

const key = Buffer.from(cfg.MP_TOKEN_ENCRYPTION_KEY, "hex");
export function seal(text: string): string {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${ct.toString("base64url")}`;
}
export function unseal(encoded: string): string {
  const [a, b, c] = encoded.split(".");
  if (!a || !b || !c) throw new Error("Encrypted secret invalid");
  const d = createDecipheriv("aes-256-gcm", key, Buffer.from(a, "base64url"));
  d.setAuthTag(Buffer.from(b, "base64url"));
  return Buffer.concat([d.update(Buffer.from(c, "base64url")), d.final()]).toString("utf8");
}
