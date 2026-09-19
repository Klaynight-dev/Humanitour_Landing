import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/lib/server/prisma-client/client';
import { PERMISSION_KEYS } from '../src/lib/shared/permissions';

/**
 * Synchronisation des permissions des roles systeme.
 *
 * Il n'y a pas de joker dans la resolution des permissions : le role
 * d'administration porte la liste complete, en clair. Ajouter une permission au
 * registre ne suffit donc pas, il faut la donner a ce role — sinon la
 * fonctionnalite existe mais reste invisible, y compris pour l'administrateur.
 *
 * Ce script ne touche QUE les roles marques `isSystem`. Les roles crees par
 * l'equipe au back-office gardent exactement les permissions qu'on leur a
 * donnees : une nouvelle fonctionnalite ne s'accorde jamais toute seule.
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error('DATABASE_URL est absente. Copiez .env.example vers .env.');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const roles = await prisma.role.findMany({ where: { isSystem: true } });

for (const role of roles) {
	const missing = PERMISSION_KEYS.filter((key) => !role.permissions.includes(key));

	if (missing.length === 0) {
		console.warn(`${role.slug} : deja a jour`);
		continue;
	}

	await prisma.role.update({
		where: { id: role.id },
		data: { permissions: [...PERMISSION_KEYS] }
	});

	console.warn(`${role.slug} : ${missing.length} permission(s) ajoutee(s) — ${missing.join(', ')}`);
}

await prisma.$disconnect();
