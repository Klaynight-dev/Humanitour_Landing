import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'node',
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			include: ['src/lib/**/*.ts'],
			exclude: [
				'src/lib/**/*.{test,spec}.ts',
				'src/lib/server/prisma-client/**',
				// Acces base sans logique propre : les regles qu'ils portaient ont ete
				// extraites en fonctions pures, testees a part. Les couvrir exigerait
				// un PostgreSQL, ce qui n'est pas le role d'un test unitaire.
				'src/lib/server/db.ts',
				'src/lib/server/survey/queries.ts',
				'src/lib/server/survey/export-query.ts',
				// Constantes d'identite et de configuration : rien a executer.
				'src/lib/shared/site.ts'
			],
			// Les seuils sont justifies dans AGENTS.md section 3.2 : on couvre ce qui
			// produit des chiffres publies, pas le cablage.
			thresholds: {
				lines: 70,
				functions: 70,
				branches: 70,
				statements: 70,
				'src/lib/server/survey/**': {
					lines: 95,
					functions: 95,
					branches: 90,
					statements: 95
				},
				'src/lib/server/import/**': {
					lines: 90,
					functions: 90,
					branches: 85,
					statements: 90
				},
				'src/lib/shared/**': {
					lines: 90,
					functions: 90,
					branches: 85,
					statements: 90
				}
			}
		}
	}
});
