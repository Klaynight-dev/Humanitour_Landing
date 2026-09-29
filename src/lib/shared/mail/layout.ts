import { ORGANISATION, SITE } from '$lib/shared/site';
import { escapeHtml, markdownToHtml, markdownToText, type MarkdownOptions } from './markdown';

/**
 * Les deux enveloppes de courriel.
 *
 * - `brandedEmail` : quand l'association parle en son nom (infolettre,
 *   confirmation d'inscription, invitation). Carte blanche sur fond creme,
 *   bandeau du degrade de marque en tete, pied avec l'identite legale et, pour
 *   une diffusion, le lien de desinscription.
 * - `plainEmail` : un membre de l'equipe ecrit a quelqu'un depuis la
 *   messagerie. Aucun habillage, parce qu'une reponse a un courriel doit se
 *   lire comme une reponse, pas comme une plaquette.
 *
 * Les deux sont des fonctions pures, isomorphes : l'apercu du back-office rend
 * exactement le HTML qui partira, sans aller-retour au serveur.
 *
 * Le degrade suit DESIGN.md : c'est l'accent reserve aux moments ou
 * l'association parle en son nom propre, et une lettre d'information en est un.
 * Il est pose en bandeau, jamais derriere du texte, et un `bgcolor` corail sert
 * de repli aux messageries qui ignorent `linear-gradient`.
 */

export interface RenderedEmail {
	readonly html: string;
	readonly text: string;
}

export interface BrandedEmailInput extends MarkdownOptions {
	readonly subject: string;
	readonly markdown: string;
	/** Texte d'apercu affiche par la messagerie a cote de l'objet. */
	readonly preheader?: string;
	/** Pourquoi la personne recoit ce courriel, en une phrase. */
	readonly reason: string;
	/** Present pour une diffusion : la loi et les messageries l'exigent. */
	readonly unsubscribeUrl?: string;
}

const FONT = "'Jost','Helvetica Neue',Helvetica,Arial,sans-serif";

function preheaderHtml(preheader: string | undefined): string {
	if (!preheader) return '';
	// Masque par trois moyens a la fois : chaque messagerie en respecte un autre.
	return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(preheader)}</div>`;
}

function documentHtml(subject: string, body: string): string {
	return [
		'<!doctype html>',
		'<html lang="fr">',
		'<head>',
		'<meta charset="utf-8">',
		'<meta name="viewport" content="width=device-width,initial-scale=1">',
		'<meta name="color-scheme" content="light">',
		'<meta name="supported-color-schemes" content="light">',
		`<title>${escapeHtml(subject)}</title>`,
		'</head>',
		body,
		'</html>'
	].join('\n');
}

function footerLines(input: BrandedEmailInput): string[] {
	const lines = [
		escapeHtml(input.reason),
		`${escapeHtml(ORGANISATION.legalName)}, ${escapeHtml(ORGANISATION.form.toLowerCase())}. ${escapeHtml(ORGANISATION.address)}.`
	];

	if (input.unsubscribeUrl) {
		lines.push(
			`<a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#000000;text-decoration:underline;">Se désinscrire de l'infolettre</a>`
		);
	}

	return lines;
}

export function brandedEmail(input: BrandedEmailInput): RenderedEmail {
	const content = markdownToHtml(input.markdown, input);
	const footer = footerLines(input)
		.map(
			(line) =>
				`<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#3D3D3D;">${line}</p>`
		)
		.join('');

	const body = `<body style="margin:0;padding:0;background:#FFF1EB;font-family:${FONT};">
${preheaderHtml(input.preheader)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFF1EB;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
<tr><td style="padding:0 4px 16px;font-family:${FONT};font-size:20px;font-weight:800;letter-spacing:0.02em;color:#000000;">
<a href="https://${SITE.domain}" style="color:#000000;text-decoration:none;">${escapeHtml(SITE.name)}</a>
</td></tr>
<tr><td style="background:#FFFFFF;border:1px solid #000000;border-radius:18px;overflow:hidden;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td height="8" bgcolor="#FF5757" style="height:8px;line-height:8px;font-size:0;background:#FF5757;background-image:linear-gradient(90deg,#FF5757,#FF88B7,#FF751F);">&nbsp;</td></tr>
<tr><td style="padding:32px 28px 16px;font-family:${FONT};">
${content}
</td></tr>
</table>
</td></tr>
<tr><td style="padding:20px 8px 0;font-family:${FONT};">
${footer}
</td></tr>
</table>
</td></tr>
</table>
</body>`;

	const textFooter = [input.reason, `${ORGANISATION.legalName}, ${ORGANISATION.address}.`];
	if (input.unsubscribeUrl) textFooter.push(`Se désinscrire : ${input.unsubscribeUrl}`);

	return {
		html: documentHtml(input.subject, body),
		text: `${markdownToText(input.markdown, input)}\n\n--\n${textFooter.join('\n')}\n`
	};
}

export interface PlainEmailInput extends MarkdownOptions {
	readonly subject: string;
	readonly markdown: string;
	/** Signature de la boite, en Markdown, ajoutee sous un tiret de separation. */
	readonly signature?: string | null;
	/** Le message auquel on repond ou que l'on transfere, cite sous le texte. */
	readonly quoted?: { readonly header: string; readonly text: string } | null;
}

function quotedHtml(quoted: PlainEmailInput['quoted']): string {
	if (!quoted) return '';
	const lines = quoted.text
		.split(/\r?\n/)
		.map((line) => escapeHtml(line))
		.join('<br>');
	return `<p style="margin:24px 0 8px;font-size:14px;color:#3D3D3D;">${escapeHtml(quoted.header)}</p>
<blockquote style="margin:0;padding:0 0 0 12px;border-left:2px solid #CCCCCC;color:#3D3D3D;font-size:14px;line-height:1.5;">${lines}</blockquote>`;
}

function quotedText(quoted: PlainEmailInput['quoted']): string {
	if (!quoted) return '';
	const lines = quoted.text
		.split(/\r?\n/)
		.map((line) => `> ${line}`)
		.join('\n');
	return `\n\n${quoted.header}\n${lines}`;
}

export function plainEmail(input: PlainEmailInput): RenderedEmail {
	const signature = input.signature?.trim() ? input.signature.trim() : null;

	const html = [markdownToHtml(input.markdown, input)];
	if (signature) {
		html.push(
			`<div style="margin-top:24px;color:#3D3D3D;">-- <br>${markdownToHtml(signature, input)}</div>`
		);
	}
	html.push(quotedHtml(input.quoted));

	const body = `<body style="margin:0;padding:16px;font-family:${FONT};color:#000000;">
<div style="max-width:680px;">
${html.join('\n')}
</div>
</body>`;

	const text = [markdownToText(input.markdown, input)];
	if (signature) text.push(`-- \n${markdownToText(signature, input)}`);

	return {
		html: documentHtml(input.subject, body),
		text: `${text.join('\n\n')}${quotedText(input.quoted)}\n`
	};
}
