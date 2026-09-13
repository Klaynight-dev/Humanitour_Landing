import path from 'node:path';
import { defineConfig } from 'prisma/config';

// Prisma 7 ne charge plus .env automatiquement.
try {
	process.loadEnvFile('.env');
} catch {
	// Absent en CI et en production, ou les variables viennent de l'environnement.
}

export default defineConfig({
	// Le schema est decoupe par domaine metier (AGENTS.md section 2).
	schema: path.join('prisma', 'schema'),
	datasource: {
		url: process.env.DATABASE_URL ?? ''
	},
	migrations: {
		path: path.join('prisma', 'migrations'),
		seed: 'bun run prisma/seed.ts'
	}
});
