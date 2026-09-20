import { error } from '@sveltejs/kit';
import { contentTypeFor, readUpload } from '$lib/server/content/images';
import type { RequestHandler } from './$types';

/**
 * Sert les images deposees depuis le back-office.
 *
 * Elles ne peuvent pas aller dans `static/` : ce dossier est fige a la
 * construction, et un fichier depose en production disparaitrait au
 * deploiement suivant. Elles vivent donc dans le volume de stockage, et cette
 * route les rend.
 *
 * Aucun controle d'acces : ce sont les images du site public, affichees sur
 * ses pages. Le chemin est resolu par le pilote de stockage, qui refuse tout
 * ce qui sort de sa racine (`storage/local.ts`) — une adresse remontant
 * l'arborescence ne lit donc rien.
 *
 * L'adresse est un contrat : elle est ecrite dans le contenu des pages, donc
 * dans la base. La renommer romprait les images deja posees (AGENTS.md § 1.4).
 */
export const GET: RequestHandler = async ({ params, setHeaders }) => {
	const path = params.chemin;
	if (!path) error(404, 'Fichier introuvable.');

	const bytes = await readUpload(path).catch(() => null);
	if (bytes === null) error(404, 'Fichier introuvable.');

	// Le nom porte l'horodatage du depot : un fichier servi ici ne change jamais
	// de contenu, il est donc mis en cache pour de bon. Deposer une nouvelle
	// version produit une nouvelle adresse.
	setHeaders({
		'content-type': contentTypeFor(path),
		'content-length': String(bytes.byteLength),
		'cache-control': 'public, max-age=31536000, immutable'
	});

	return new Response(bytes as BodyInit);
};
