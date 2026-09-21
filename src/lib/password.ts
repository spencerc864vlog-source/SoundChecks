// Deliberately has no "server-only" import (unlike auth.ts) so it can also
// be used from plain Node scripts like the DB seeder.
import bcrypt from "bcryptjs";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
