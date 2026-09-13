import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './prisma-client/client';

/**
 * Client Prisma unique.
 *
 * Le rechargement a chaud de Vite reevalue ce module a chaque modification : sans
 * memorisation sur `globalThis`, chaque sauvegarde ouvrirait un pool de plus et
 * finirait par saturer les connexions de PostgreSQL.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
	const connectionString = env.DATABASE_URL;

	// Pendant `vite build`, aucune requete n'est emise : echouer ici casserait le
	// build sur une machine sans base, alors qu'aucune donnee n'est lue.
	if (!connectionString && !building) {
		throw new Error(
			'DATABASE_URL est absente. Copiez .env.example vers .env et renseignez la connexion.'
		);
	}

	return new PrismaClient({
		adapter: new PrismaPg({ connectionString: connectionString ?? '' })
	});
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') {
	globalForPrisma.prisma = prisma;
}
