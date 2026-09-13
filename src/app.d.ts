import type { SessionUser } from '$lib/server/auth/session';

declare global {
	namespace App {
		interface Locals {
			/** Utilisateur de la session en cours, `null` pour un visiteur anonyme. */
			user: SessionUser | null;
		}
		interface PageData {
			user: SessionUser | null;
		}
		interface Error {
			code?: string;
		}
	}
}

export {};
