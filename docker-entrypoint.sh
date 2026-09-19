#!/bin/sh
set -e

# Demarrage du conteneur.
#
# Les migrations sont appliquees AVANT que le serveur n'ecoute : demarrer sur un
# schema plus ancien que le code donnerait des erreurs a la premiere requete,
# sur des pages publiques.
#
# `migrate deploy` n'applique que les migrations deja ecrites et ne genere ni ne
# reinitialise rien. Sur une base qui contient deja les tables, la marquer comme
# a jour une seule fois :
#   bunx prisma migrate resolve --applied 0_init

if [ -z "${DATABASE_URL}" ]; then
	echo "DATABASE_URL est absente : le serveur ne peut pas demarrer." >&2
	exit 1
fi

echo "Application des migrations..."
node node_modules/prisma/build/index.js migrate deploy

exec "$@"
