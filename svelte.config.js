import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		// Le controle d'origine des formulaires est refait dans
		// `src/hooks.server.ts` (`server/csrf.ts`), a l'identique, pour pouvoir en
		// exempter la seule desinscription en un clic de l'infolettre : les
		// messageries la postent sans en-tete `Origin`. `'*'` est la facon non
		// depreciee de desactiver le controle integre ; elle ne fait confiance a
		// aucune origine, puisque le crochet refait la verification.
		csrf: { trustedOrigins: ['*'] },
		alias: {
			$components: 'src/lib/components',
			$shared: 'src/lib/shared',
			$charts: 'src/lib/charts'
		}
	}
};

export default config;
