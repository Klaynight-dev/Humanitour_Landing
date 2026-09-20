/**
 * Les dimensions natives d'une image, lues dans son en-tete.
 *
 * Elles ne sont pas un detail : le site pose `width` et `height` sur chaque
 * image pour reserver sa place avant son arrivee. Sans elles, la page saute
 * sous les yeux du visiteur au fil des chargements — et c'est la seule facon
 * de tenir cette promesse pour une image televersee, dont personne ne va
 * relever les dimensions a la main.
 *
 * Quatre formats, ceux que le back-office accepte. Une image illisible ne
 * leve pas : elle rend `null`, et le televersement continue sans dimensions
 * plutot que d'echouer sur un detail de confort.
 *
 * Lecture d'en-tete uniquement, pas de decodage : aucune dependance, et le
 * cout ne depend pas du poids du fichier.
 */

export interface ImageDimensions {
	readonly width: number;
	readonly height: number;
}

function isPng(bytes: Uint8Array): boolean {
	return bytes.length > 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e;
}

function isGif(bytes: Uint8Array): boolean {
	return bytes.length > 10 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46;
}

function isJpeg(bytes: Uint8Array): boolean {
	return bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

function isWebp(view: DataView, bytes: Uint8Array): boolean {
	return (
		bytes.length > 30 &&
		view.getUint32(0, false) === 0x52_49_46_46 &&
		view.getUint32(8, false) === 0x57_45_42_50
	);
}

/**
 * JPEG : la taille vit dans un marqueur de cadre, quelque part apres l'en-tete.
 *
 * On avance de segment en segment plutot que de chercher les octets a vue : un
 * fichier contient souvent une vignette, et une recherche naive relevait ses
 * dimensions au lieu de celles de l'image.
 */
function jpegSize(view: DataView): ImageDimensions | null {
	let offset = 2;

	while (offset + 9 < view.byteLength) {
		if (view.getUint8(offset) !== 0xff) return null;

		const marker = view.getUint8(offset + 1);
		const length = view.getUint16(offset + 2, false);

		// SOF0 a SOF15, hors marqueurs qui ne decrivent pas un cadre.
		const isFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
		if (isFrame) {
			return { height: view.getUint16(offset + 5, false), width: view.getUint16(offset + 7, false) };
		}

		if (length < 2) return null;
		offset += 2 + length;
	}

	return null;
}

function webpSize(view: DataView): ImageDimensions | null {
	const format = view.getUint32(12, false);

	// VP8  : le cadre commence a l'octet 26, dimensions sur 14 bits.
	if (format === 0x56_50_38_20) {
		return {
			width: view.getUint16(26, true) & 0x3fff,
			height: view.getUint16(28, true) & 0x3fff
		};
	}

	// VP8L : dimensions empilees sur 14 bits chacune, moins un.
	if (format === 0x56_50_38_4c) {
		const bits = view.getUint32(21, true);
		return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
	}

	// VP8X : forme etendue, dimensions sur 24 bits, moins un.
	if (format === 0x56_50_38_58) {
		const width = view.getUint8(24) | (view.getUint8(25) << 8) | (view.getUint8(26) << 16);
		const height = view.getUint8(27) | (view.getUint8(28) << 8) | (view.getUint8(29) << 16);
		return { width: width + 1, height: height + 1 };
	}

	return null;
}

export function imageDimensions(bytes: Uint8Array): ImageDimensions | null {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

	try {
		if (isPng(bytes)) return { width: view.getUint32(16, false), height: view.getUint32(20, false) };
		if (isGif(bytes)) return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
		if (isWebp(view, bytes)) return webpSize(view);
		if (isJpeg(bytes)) return jpegSize(view);
	} catch {
		// En-tete tronque ou malforme : pas de dimensions, pas d'exception. Une
		// image sans dimensions s'affiche, elle fait seulement sauter la page.
		return null;
	}

	return null;
}
