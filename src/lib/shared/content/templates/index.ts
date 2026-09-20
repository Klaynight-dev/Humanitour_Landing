import { requireContentBlockType } from '../index';
import type { ContentPageKey } from '../types';
import { aboutTemplate } from './about';
import { answerTemplate, dataTemplate, galleryTemplate, mediaTemplate } from './catalogues';
import { homeTemplate } from './home';
import { methodTemplate } from './method';
import { tourTemplate } from './tour';
import type { ContentTemplate } from './types';

/**
 * Les modeles d'origine, une par page editable.
 *
 * Chaque page du registre en a un : sans cela, « reappliquer le modele »
 * marcherait sur certaines pages et pas sur d'autres, et personne ne saurait
 * lesquelles avant d'en avoir besoin. `templates.test.ts` le verifie.
 */
const TEMPLATES: readonly ContentTemplate[] = [
	homeTemplate,
	aboutTemplate,
	tourTemplate,
	methodTemplate,
	galleryTemplate,
	dataTemplate,
	mediaTemplate,
	answerTemplate
];

const BY_KEY = new Map(TEMPLATES.map((template) => [template.key, template]));

export const CONTENT_TEMPLATES = TEMPLATES;

export function getContentTemplate(key: ContentPageKey): ContentTemplate | null {
	return BY_KEY.get(key) ?? null;
}

export type TemplateBlockResult =
	| { readonly ok: true; readonly blocks: readonly { type: string; data: Record<string, unknown> }[] }
	| { readonly ok: false; readonly reason: string };

/**
 * Valide un modele et rend ses sections pretes a etre ecrites en base.
 *
 * Le modele passe par la MEME validation qu'une saisie de back-office. Deux
 * chemins d'ecriture differents finiraient par diverger, et le modele — celui
 * qu'on applique justement quand une page est cassee — serait le seul contenu
 * du site que personne n'aurait verifie.
 */
export function prepareTemplate(template: ContentTemplate): TemplateBlockResult {
	const blocks: { type: string; data: Record<string, unknown> }[] = [];

	for (const [index, block] of template.blocks.entries()) {
		const type = requireContentBlockType(block.type);
		const parsed = type.parseData(block.data);

		if (!parsed.ok) {
			return {
				ok: false,
				reason: `Modèle « ${template.key} », section ${index + 1} (${block.type}) : ${parsed.reason}`
			};
		}

		blocks.push({ type: block.type, data: parsed.data });
	}

	return { ok: true, blocks };
}

export type { ContentTemplate, ContentTemplateBlock } from './types';
