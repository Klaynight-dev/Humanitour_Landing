-- Openforms, canal unique de collecte.
--
-- Cette migration N'EST PAS additive : elle supprime les tuyaux d'entree autres
-- qu'Openforms, parce qu'ils n'existent plus dans le produit. Trois effets,
-- dans cet ordre.
--
-- 1. Les reponses qui ne viennent pas d'Openforms disparaissent. Elles n'ont
--    aucune reference de soumission distante, donc plus rien ne permettrait de
--    les resynchroniser ni de les recouper avec la source : les garder
--    donnerait un total que la source ne sait pas justifier. Une enquete qui
--    perd toutes ses reponses ici doit etre recollectee via un formulaire
--    Openforms, ce qui est precisement la decision prise.
-- 2. `ImportBatch` disparait avec elles, ainsi que les enums qui n'avaient de
--    sens que pour lui.
-- 3. La liaison au formulaire distant entre dans `Survey`, et la
--    correspondance champ / question entre dans `Question`.
--
-- Les fichiers d'import deja deposes restent sur le disque (`imports/…`) : les
-- effacer serait une perte irreversible decidee par une migration, ce qui n'est
-- pas son role. Ils se suppriment a la main une fois la bascule verifiee.

-- --------------------------------------------------------------------------
-- 1. Reponses sans origine Openforms
-- --------------------------------------------------------------------------

DELETE FROM "Response" WHERE "externalRef" IS NULL;

-- --------------------------------------------------------------------------
-- 2. Journal de synchronisation, a la place des lots d'import
-- --------------------------------------------------------------------------

CREATE TYPE "SyncTrigger" AS ENUM ('MANUAL', 'SCHEDULED', 'WEBHOOK');
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');

CREATE TABLE "OpenformsSync" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "trigger" "SyncTrigger" NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'RUNNING',
    "fetchedCount" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB NOT NULL DEFAULT '[]',
    "message" TEXT,
    "triggeredById" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "OpenformsSync_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OpenformsSync_surveyId_startedAt_idx" ON "OpenformsSync"("surveyId", "startedAt");

ALTER TABLE "OpenformsSync"
    ADD CONSTRAINT "OpenformsSync_surveyId_fkey"
    FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OpenformsSync"
    ADD CONSTRAINT "OpenformsSync_triggeredById_fkey"
    FOREIGN KEY ("triggeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- --------------------------------------------------------------------------
-- 3. Response : `source` et le lot d'import cedent la place a la synchro
-- --------------------------------------------------------------------------

ALTER TABLE "Response" DROP CONSTRAINT IF EXISTS "Response_importBatchId_fkey";
ALTER TABLE "Response" DROP COLUMN "importBatchId";
ALTER TABLE "Response" DROP COLUMN "source";

-- `externalRef` devient obligatoire : les lignes sans reference ont ete
-- supprimees a l'etape 1, la contrainte ne peut donc plus echouer.
ALTER TABLE "Response" ALTER COLUMN "externalRef" SET NOT NULL;

ALTER TABLE "Response" ADD COLUMN "syncId" TEXT;

ALTER TABLE "Response"
    ADD CONSTRAINT "Response_syncId_fkey"
    FOREIGN KEY ("syncId") REFERENCES "OpenformsSync"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- --------------------------------------------------------------------------
-- 4. Disparition d'ImportBatch et des enums devenus sans objet
-- --------------------------------------------------------------------------

DROP TABLE "ImportBatch";
DROP TYPE "ImportStatus";
DROP TYPE "ResponseSource";

-- --------------------------------------------------------------------------
-- 5. Liaison au formulaire distant
-- --------------------------------------------------------------------------

ALTER TABLE "Survey" ADD COLUMN "openformsFormId" TEXT;
ALTER TABLE "Survey" ADD COLUMN "openformsSlug" TEXT;
ALTER TABLE "Survey" ADD COLUMN "openformsSyncedAt" TIMESTAMP(3);
ALTER TABLE "Survey" ADD COLUMN "openformsOpen" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Survey" ADD COLUMN "opensAt" TIMESTAMP(3);
ALTER TABLE "Survey" ADD COLUMN "closesAt" TIMESTAMP(3);
ALTER TABLE "Survey" ADD COLUMN "maxResponses" INTEGER;

CREATE UNIQUE INDEX "Survey_openformsFormId_key" ON "Survey"("openformsFormId");
CREATE INDEX "Survey_openformsOpen_status_idx" ON "Survey"("openformsOpen", "status");

ALTER TABLE "Question" ADD COLUMN "openformsKey" TEXT;

-- Une cle de champ distante ne peut alimenter qu'une seule question de
-- l'enquete : deux questions branchees sur le meme champ compteraient deux fois
-- la meme reponse dans un croisement.
CREATE UNIQUE INDEX "Question_surveyId_openformsKey_key" ON "Question"("surveyId", "openformsKey");
