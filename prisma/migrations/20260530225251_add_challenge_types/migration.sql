-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "practiceGoal" INTEGER,
ADD COLUMN     "questions" JSONB,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'simple';

-- AlterTable
ALTER TABLE "ChallengeEntry" ADD COLUMN     "answers" JSONB,
ADD COLUMN     "mediaUrl" TEXT,
ADD COLUMN     "practiceCount" INTEGER DEFAULT 0;
