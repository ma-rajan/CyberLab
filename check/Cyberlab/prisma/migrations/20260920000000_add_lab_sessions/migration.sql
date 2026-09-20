-- AlterTable
ALTER TABLE "Lab" ADD COLUMN "hints" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Lab" ADD COLUMN "instructions" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Lab" ADD COLUMN "objective" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "LabSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT "LabSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LabSession_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "LabSession_userId_labId_key" ON "LabSession"("userId", "labId");
CREATE INDEX "LabSession_labId_idx" ON "LabSession"("labId");
CREATE INDEX "LabSession_userId_status_idx" ON "LabSession"("userId", "status");
