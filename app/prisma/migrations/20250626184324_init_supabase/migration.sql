-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "salary" TEXT,
    "url" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "fitScore" INTEGER NOT NULL,
    "confidence" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "analysis" TEXT NOT NULL,
    "jobSummary" TEXT,
    "fitSummary" TEXT,
    "whyGoodFit" TEXT,
    "potentialConcerns" TEXT,
    "keyTechnologies" TEXT,
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progress" JSONB NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SearchSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProcessedJob_userId_idx" ON "ProcessedJob"("userId");

-- CreateIndex
CREATE INDEX "ProcessedJob_userId_url_idx" ON "ProcessedJob"("userId", "url");

-- CreateIndex
CREATE INDEX "SearchSession_userId_idx" ON "SearchSession"("userId");

-- CreateIndex
CREATE INDEX "SearchSession_userId_status_idx" ON "SearchSession"("userId", "status");

-- AddForeignKey
ALTER TABLE "ProcessedJob" ADD CONSTRAINT "ProcessedJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchSession" ADD CONSTRAINT "SearchSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
