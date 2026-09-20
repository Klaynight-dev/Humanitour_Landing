-- Renommage de la permission « survey.import » en « survey.sync ».
--
-- Migration SEPAREE de `20260920_openforms_only`, et non fondue dedans : celle-ci
-- touche des DONNEES et non un schema. Elle doit pouvoir etre relue, rejouee et
-- annulee sans rapport avec la refonte des tables.
--
-- Pourquoi elle est necessaire. Un role porte une liste de cles de permission,
-- et `sanitizePermissions` ecarte en silence celles que le registre ne connait
-- plus. C'est le bon comportement en general — desinstaller une fonctionnalite
-- ne doit pas casser les roles — mais ici la fonctionnalite n'a pas disparu,
-- elle a change de nom. Sans cette mise a jour, les comptes qui pouvaient
-- importer des reponses perdraient en silence le droit de synchroniser
-- Openforms, et il faudrait le leur rendre un par un au back-office.

UPDATE "Role"
SET "permissions" = array_replace("permissions", 'survey.import', 'survey.sync')
WHERE 'survey.import' = ANY("permissions");
