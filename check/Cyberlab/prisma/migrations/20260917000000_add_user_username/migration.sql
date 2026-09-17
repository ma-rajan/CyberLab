-- Rebuild only the Phase 2 User table so username is required. Existing Phase 1
-- AppSetting records are untouched; any already-created accounts receive a stable,
-- valid legacy handle derived from their existing cuid.
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_User" ("id", "username", "email", "passwordHash", "createdAt", "updatedAt")
SELECT "id", 'legacy_' || substr("id", 1, 24), "email", "passwordHash", "createdAt", "updatedAt"
FROM "User";

DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
