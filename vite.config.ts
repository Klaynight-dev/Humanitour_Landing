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
				// Meme cas : il lit les marges et ecrit `Response.weight`. Le calage
				// lui-meme (`rake`) et la preparation du plan vivent dans
				// `weighting.ts` et `weighting-plan.ts`, couverts a part.
				'src/lib/server/survey/weighting-store.ts',
				'src/lib/server/media/queries.ts',
				// Orchestration de la synchronisation Openforms : base, reseau et
				// minuterie. La seule regle qu'elle portait — la mise a plat des
				// soumissions — vit dans `openforms/rows.ts`, couvert a part.
				'src/lib/server/openforms/sync.ts',
				'src/lib/server/openforms/schedule.ts',
				// Constantes d'identite et de configuration : rien a executer.
				'src/lib/shared/site.ts',
				// Lecture de l'environnement et fabrique du client : rien a tester
				// sans reproduire l'environnement lui-meme.
				'src/lib/server/mail/config.ts',
				// Orchestration de la reception et des evenements de remise : base,
				// stockage et reseau. Les regles qu'elles appliquent vivent dans
				// `mail/routing.ts`, `mail/webhook-event.ts` et `shared/mail/status.ts`.
				'src/lib/server/mail/inbound.ts',
				'src/lib/server/mail/events.ts',
				// Envoi du lien de confirmation : base et reseau. Le texte du courriel
				// et ses liens vivent dans `newsletter/emails.ts`, couvert a part.
				'src/lib/server/newsletter/confirmation.ts',
				// Diffusion d'une campagne : base, reseau et minuterie. La cle des lots
				// et le texte des courriels vivent dans `batches.ts` et `emails.ts`.
				'src/lib/server/newsletter/campaign.ts',
				// Messagerie : controle d'acces, envoi et suppression, tous trois base,
				// stockage et reseau. Leurs regles vivent dans `shared/mail/*`,
				// `mail/compose.ts` et `mail/routing.ts`, couverts a part.
				'src/lib/server/mail/access.ts',
				'src/lib/server/mail/outbound.ts',
				'src/lib/server/mail/cleanup.ts'
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
				// Successeurs du registre d'import : la chaine par laquelle TOUTE
				// donnee publiee entre desormais. Un bug ici corrompt le jeu de
				// donnees, d'ou le meme seuil qu'auparavant.
				'src/lib/server/normalize/**': {
					lines: 90,
					functions: 90,
					branches: 85,
					statements: 90
				},
				'src/lib/server/openforms/**': {
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
