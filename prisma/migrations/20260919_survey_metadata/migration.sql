-- Fiche du jeu de donnees et referencement.
--
-- Migration ADDITIVE : six colonnes facultatives, aucune donnee existante
-- touchee. Les enquetes deja publiees restent valides sans etre modifiees, et
-- la fiche publique n'affiche que ce qui est renseigne.

ALTER TABLE "Survey" ADD COLUMN "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Survey" ADD COLUMN "geographicCoverage" TEXT;
ALTER TABLE "Survey" ADD COLUMN "collectionMode" TEXT;
ALTER TABLE "Survey" ADD COLUMN "updateFrequency" TEXT;
ALTER TABLE "Survey" ADD COLUMN "metaTitle" TEXT;
ALTER TABLE "Survey" ADD COLUMN "metaDescription" TEXT;
