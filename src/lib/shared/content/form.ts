/**
 * Lecture d'un formulaire de section.
 *
 * Une section porte des champs simples, des images (adresse, description,
 * dimensions) et des listes repetables. Un formulaire HTML, lui, est plat :
 * il n'envoie que des couples nom/valeur. Le nom porte donc le chemin —
 * `data.items.0.value` — et cette fonction le rend a sa forme.
 *
 * C'est ce qui permet a l'editeur de rester un formulaire ordinaire :
 * l'ajout et le retrait d'une ligne se font au clavier ou au clic, sans
 * requete, et l'enregistrement reste un `POST` que le serveur sait relire
 * meme si JavaScript n'a jamais demarre.
 *
 * Aucune valeur n'est interpretee ici : la validation appartient au registre
 * des sections, qui seul sait ce que chaque champ accepte.
 */

type Node = Record<string, unknown>;

/** Un segment entierement numerique designe un rang de liste. */
function isIndex(segment: string): boolean {
	return /^\d+$/.test(segment);
}

/**
 * Les rangs saisis ne sont pas forcement continus.
 *
 * Retirer la deuxieme ligne d'une liste de quatre laisse les rangs 0, 2 et 3.
 * On les trie et on les resserre : le rang n'est qu'un ordre de saisie, pas
 * une identite. Sans ce resserrement, une ligne retiree laisserait un trou que
 * la validation prendrait pour une ligne vide.
 */
function toArray(node: Node): unknown[] {
	return Object.keys(node)
		.map(Number)
		.sort((a, b) => a - b)
		.map((index) => node[String(index)]);
}

function isIndexed(node: Node): boolean {
	const keys = Object.keys(node);
	return keys.length > 0 && keys.every(isIndex);
}

/** Transforme en tableaux les objets dont toutes les cles sont des rangs. */
function normalise(value: unknown): unknown {
	if (typeof value !== 'object' || value === null) return value;

	const node = value as Node;
	for (const key of Object.keys(node)) node[key] = normalise(node[key]);

	return isIndexed(node) ? toArray(node) : node;
}

/**
 * Reconstruit l'objet decrit par les champs prefixes.
 *
 * `data.title`, `data.image.src` et `data.items.0.value` donnent
 * `{ title, image: { src }, items: [{ value }] }`.
 */
export function readNested(form: FormData, prefix: string): Record<string, unknown> {
	const root: Node = {};

	for (const [name, raw] of form.entries()) {
		if (!name.startsWith(`${prefix}.`)) continue;
		// Un fichier n'a rien a faire dans un champ de contenu : le televersement
		// a sa propre action, qui rend une adresse.
		if (typeof raw !== 'string') continue;

		const path = name.slice(prefix.length + 1).split('.');
		let node = root;

		for (const segment of path.slice(0, -1)) {
			const next = node[segment];
			// Une branche deja occupee par une valeur est ecrasee plutot que fusionnee :
			// un formulaire qui envoie `a` et `a.b` est malforme, et le dernier
			// segment le plus precis l'emporte.
			if (typeof next !== 'object' || next === null) node[segment] = {};
			node = node[segment] as Node;
		}

		node[path[path.length - 1]!] = raw;
	}

	return normalise(root) as Record<string, unknown>;
}
