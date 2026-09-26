-- Redressement par calage sur marges.
--
-- Additive : une colonne nullable et une table. Aucune reponse existante ne
-- change de valeur, et tant qu'aucun calage n'a ete lance, `weight` reste
-- `null` partout — le site continue de ne publier que le comptage brut.

ALTER TABLE "Response" ADD COLUMN "weight" DOUBLE PRECISION;

CREATE TABLE "SurveyWeighting" (
    "surveyId" TEXT NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "source" TEXT,
    "minWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "maxWeight" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "version" INTEGER NOT NULL DEFAULT 0,
    "diagnostics" JSONB,
    "computedAt" TIMESTAMP(3),
    "computedById" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyWeighting_pkey" PRIMARY KEY ("surveyId")
);

ALTER TABLE "SurveyWeighting" ADD CONSTRAINT "SurveyWeighting_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SurveyWeighting" ADD CONSTRAINT "SurveyWeighting_computedById_fkey" FOREIGN KEY ("computedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
