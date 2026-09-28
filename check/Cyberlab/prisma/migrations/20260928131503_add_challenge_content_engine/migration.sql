-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lab" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "objective" TEXT NOT NULL DEFAULT '',
    "instructions" TEXT NOT NULL DEFAULT '',
    "hints" TEXT NOT NULL DEFAULT '[]',
    "target" TEXT NOT NULL DEFAULT '',
    "challengeType" TEXT NOT NULL DEFAULT 'PLACEHOLDER',
    "validatorType" TEXT NOT NULL DEFAULT 'PLACEHOLDER',
    "flagHash" TEXT
);
INSERT INTO "new_Lab" ("category", "createdAt", "description", "difficulty", "estimatedMinutes", "hints", "id", "instructions", "isPublished", "objective", "points", "slug", "title", "updatedAt") SELECT "category", "createdAt", "description", "difficulty", "estimatedMinutes", "hints", "id", "instructions", "isPublished", "objective", "points", "slug", "title", "updatedAt" FROM "Lab";
DROP TABLE "Lab";
ALTER TABLE "new_Lab" RENAME TO "Lab";
CREATE UNIQUE INDEX "Lab_slug_key" ON "Lab"("slug");
CREATE INDEX "Lab_isPublished_idx" ON "Lab"("isPublished");
CREATE INDEX "Lab_category_difficulty_idx" ON "Lab"("category", "difficulty");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
