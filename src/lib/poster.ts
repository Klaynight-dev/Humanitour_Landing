/**
 * L affiche : un resultat exporte en image, habille de la charte.
 *
 * Une image de graphique circule sans sa page. Elle doit donc emporter avec
 * elle tout ce qui la rend lisible et verifiable : la question EXACTE, la base,
 * la periode de terrain, la licence et l adresse ou la refaire. Un graphique
 * qui voyage sans sa base est exactement ce que l association reproche aux
 * autres (`AGENTS.md` section 0).
 *
 * Elle est composee dans le navigateur, sur un canvas, a partir du PNG rendu
 * par ECharts. Aucune dependance de plus, et aucun rasteriseur a installer sur
 * le serveur.
 */

/** Largeur de l affiche. Deux fois la largeur de lecture : nette en projection. */
export const POSTER_WIDTH = 1200;
const PADDING = 56;
const HEADER_PADDING = 44;
const TITLE_SIZE = 42;
const TITLE_LINE = 52;
const SURVEY_SIZE = 20;
const FOOTER_SIZE = 19;
const FOOTER_LINE = 30;

/** Un graphique rendu en image, avec les mesures qui servent a le replacer. */
export interface PosterChart {
	readonly dataUrl: string;
	readonly width: number;
	readonly height: number;
}

export interface PosterContent {
	readonly surveyTitle: string;
	/** Libelle exact de la question. */
	readonly question: string;
	readonly crossedWith: string | null;
	readonly base: string;
	readonly fieldwork: string;
	readonly licence: string;
	readonly url: string;
	/** Le graphique, deja rendu par ECharts. */
	readonly chart: PosterChart;
}

/** Mesure d une chaine, injectee pour que la mise en page se teste sans canvas. */
export type Measure = (text: string) => number;

/**
 * Coupe un texte en lignes qui tiennent dans la largeur.
 *
 * Un mot plus large que la ligne occupe sa propre ligne plutot que d etre
 * tronque : le libelle d une question ne se coupe pas, il fait partie du
 * resultat.
 */
export function wrapLines(text: string, maxWidth: number, measure: Measure): readonly string[] {
	const words = text.split(/\s+/).filter(Boolean);
	if (words.length === 0) return [];

	const lines: string[] = [];
	let current = '';

	for (const word of words) {
		const candidate = current === '' ? word : `${current} ${word}`;
		if (current !== '' && measure(candidate) > maxWidth) {
			lines.push(current);
			current = word;
			continue;
		}
		current = candidate;
	}

	lines.push(current);
	return lines;
}

export interface PosterLayout {
	readonly width: number;
	readonly height: number;
	readonly headerHeight: number;
	readonly chart: {
		readonly x: number;
		readonly y: number;
		readonly width: number;
		readonly height: number;
	};
	readonly footerY: number;
}

/**
 * Place les trois blocs de l affiche.
 *
 * Le graphique garde ses PROPORTIONS : l etirer pour remplir une hauteur fixe
 * fausserait la lecture des longueurs, ce qui est le seul mensonge qu un
 * graphique a barres puisse raconter.
 */
export function posterLayout(
	titleLines: number,
	footerLines: number,
	chart: { width: number; height: number }
): PosterLayout {
	const headerHeight = HEADER_PADDING * 2 + SURVEY_SIZE + 16 + titleLines * TITLE_LINE;

	const chartWidth = POSTER_WIDTH - PADDING * 2;
	const chartHeight = Math.round((chart.height / chart.width) * chartWidth);
	const footerHeight = PADDING + footerLines * FOOTER_LINE + PADDING;

	return {
		width: POSTER_WIDTH,
		height: headerHeight + PADDING + chartHeight + footerHeight,
		headerHeight,
		chart: { x: PADDING, y: headerHeight + PADDING, width: chartWidth, height: chartHeight },
		footerY: headerHeight + PADDING + chartHeight + PADDING
	};
}

/** Les lignes de pied de page, dans l ordre ou elles doivent se lire. */
export function footerLines(content: PosterContent): readonly string[] {
	const context = [content.base, content.fieldwork].filter(Boolean).join(' · ');

	return [
		context,
		`Effectifs bruts, sans pondération ni redressement · ${content.licence}`,
		content.url
	].filter((line) => line.trim() !== '');
}

function loadImage(source: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error(`Image illisible : ${source}`));
		image.src = source;
	});
}

/** Le degrade de marque, dans l ordre de la charte. */
function brandGradient(ctx: CanvasRenderingContext2D, width: number, height: number) {
	const gradient = ctx.createLinearGradient(0, 0, width, height);
	gradient.addColorStop(0, '#ffffff');
	gradient.addColorStop(0.38, '#ff5757');
	gradient.addColorStop(0.68, '#ff88b7');
	gradient.addColorStop(1, '#ff751f');
	return gradient;
}

const SANS = "'Jost Variable', ui-sans-serif, system-ui, sans-serif";

/**
 * Compose l affiche et rend le PNG.
 *
 * Le texte est NOIR sur le degrade, jamais blanc : blanc sur l orange de la
 * charte ne donne que 2,69:1 (`app.css`). C est la seule combinaison lisible,
 * et elle vaut aussi en image.
 */
export async function composePoster(content: PosterContent, logoUrl?: string): Promise<Blob> {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error("Le navigateur n'a pas fourni de contexte de dessin.");

	const textWidth = POSTER_WIDTH - HEADER_PADDING * 2;
	ctx.font = `700 ${TITLE_SIZE}px ${SANS}`;
	const titleLines = wrapLines(content.question, textWidth, (text) => ctx.measureText(text).width);
	const footer = footerLines(content);

	const layout = posterLayout(titleLines.length, footer.length, content.chart);
	canvas.width = layout.width;
	canvas.height = layout.height;

	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, layout.width, layout.height);

	ctx.fillStyle = brandGradient(ctx, layout.width, layout.headerHeight);
	ctx.fillRect(0, 0, layout.width, layout.headerHeight);

	ctx.fillStyle = '#000000';
	ctx.textBaseline = 'top';

	ctx.font = `600 ${SURVEY_SIZE}px ${SANS}`;
	const surveyLine = content.crossedWith
		? `${content.surveyTitle} · croisé avec « ${content.crossedWith} »`
		: content.surveyTitle;
	ctx.fillText(surveyLine, HEADER_PADDING, HEADER_PADDING);

	ctx.font = `700 ${TITLE_SIZE}px ${SANS}`;
	titleLines.forEach((line, index) => {
		ctx.fillText(line, HEADER_PADDING, HEADER_PADDING + SURVEY_SIZE + 16 + index * TITLE_LINE);
	});

	const chartImage = await loadImage(content.chart.dataUrl);
	ctx.drawImage(
		chartImage,
		layout.chart.x,
		layout.chart.y,
		layout.chart.width,
		layout.chart.height
	);

	ctx.fillStyle = '#6b6360';
	ctx.font = `400 ${FOOTER_SIZE}px ${SANS}`;
	footer.forEach((line, index) => {
		ctx.fillText(line, PADDING, layout.footerY + index * FOOTER_LINE);
	});

	if (logoUrl) {
		// Le logo signe l affiche. Son echec ne doit pas emporter l export : une
		// image sans logo reste une image juste.
		await loadImage(logoUrl)
			.then((logo) => {
				const height = 40;
				const width = (logo.width / logo.height) * height;
				ctx.drawImage(logo, layout.width - PADDING - width, layout.footerY, width, height);
			})
			.catch(() => undefined);
	}

	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error("L'image n'a pas pu être produite."))),
			'image/png'
		);
	});
}
