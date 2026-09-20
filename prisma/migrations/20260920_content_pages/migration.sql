-- Les pages editables ne sont plus trois mais huit.
--
-- Le site entier passe sous back-office : les pages d'argument comme les pages
-- de catalogue, dont l'en-tete et les textes d'etat vide etaient jusqu'ici
-- ecrits en dur dans les composants.
--
-- Ajout seul : aucune valeur existante n'est renommee ni retiree, les lignes
-- deja ecrites gardent leur cle.
ALTER TYPE "ContentPageKey" ADD VALUE IF NOT EXISTS 'METHOD';
ALTER TYPE "ContentPageKey" ADD VALUE IF NOT EXISTS 'GALLERY';
ALTER TYPE "ContentPageKey" ADD VALUE IF NOT EXISTS 'DATA';
ALTER TYPE "ContentPageKey" ADD VALUE IF NOT EXISTS 'MEDIA';
ALTER TYPE "ContentPageKey" ADD VALUE IF NOT EXISTS 'ANSWER';
