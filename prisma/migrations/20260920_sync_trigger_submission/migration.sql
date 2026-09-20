-- Une reponse deposee sur `/repondre` declenche sa propre reprise, immediate.
--
-- Elle n'est ni un clic du back-office, ni un tour de minuterie, ni une
-- notification d'Openforms : lui coller l'une de ces trois etiquettes rendrait
-- le journal des synchronisations trompeur, et c'est precisement ce journal
-- qu'on lit quand on cherche pourquoi un chiffre a bouge.

ALTER TYPE "SyncTrigger" ADD VALUE 'SUBMISSION';
