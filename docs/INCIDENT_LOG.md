# Security Incident Log

## 2026-06-30 — Legacy DB Credential Exposure

**What happened:**
During early development (May 2026), the platform used Hostinger MySQL before migrating to Supabase PostgreSQL. A `prisma db pull` command run during a Claude Code session recorded the database password in plaintext in `~/.claude/settings.json` (local machine, outside the git repository).

**Discovery:**
Found via automated security audit (/cso) on 2026-06-30.

**Data exposed (potential):**
Legacy database `u509580790_hauslink` containing 4 records, all confirmed to be developer-created test/seed accounts (admin, landlord, tenant demo accounts plus one developer test signup using personal email). No real third-party user data was present.

**Remediation taken:**
1. ✅ Removed credentials from local Claude Code settings file (`~/.claude/settings.json`)
2. ✅ Rotated MySQL password in Hostinger cPanel
3. ✅ Confirmed all exposed records were developer test data, not real users
4. ✅ No user notification required (no real PII)
5. ⬜ RECOMMENDED: Delete legacy database entirely since platform now runs on Supabase

**Root cause:**
Plaintext credentials persisted in local AI coding assistant history during a `prisma db pull` command run inline with `DATABASE_URL=...` as a shell prefix. This is not a codebase vulnerability — HausLink's live Supabase production database and git history were never exposed.

**Prevention:**
Always use `.env.local` for `DATABASE_URL` rather than inline credentials in terminal commands during AI-assisted development sessions. The AI assistant's allowed-commands list stores approved command patterns verbatim, including any inline env vars.

**Status: RESOLVED**

---

**Next manual step:** Delete `u509580790_hauslink` from Hostinger cPanel (MySQL Databases → find the database → Delete) to eliminate any future exposure risk. The platform is fully migrated to Supabase and this database is no longer needed.
