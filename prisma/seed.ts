import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from '@node-rs/argon2';
import { PrismaClient, type Prisma } from '../src/lib/server/prisma-client/client';
import { PERMISSION_KEYS } from '../src/lib/shared/permissions';
import { requireMediaType } from '../src/lib/shared/media';
import { requireQuestionType } from '../src/lib/shared/questions';
import type { QuestionOptionLike } from '../src/lib/shared/questions/types';

/**
 * Jeu de donnees de developpement.
 *
 * Idempotent : relancer le seed met a jour, ne duplique pas. Les reponses de
 * demonstration sont regenerees a chaque fois, pour rester coherentes avec le
 * questionnaire.
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error('DATABASE_URL est absente. Copiez .env.example vers .env.');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/**
 * Generateur pseudo-aleatoire a graine fixe.
 *
 * `Math.random` donnerait un jeu different a chaque execution : impossible de
 * reproduire un bug d'agregation ou de comparer deux captures d'ecran.
 */
function makeRandom(seed: number) {
	let state = seed;
	return () => {
		state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
		return state / 4_294_967_296;
	};
}

const random = makeRandom(20_260_914);

function pick<T>(items: readonly (readonly [T, number])[]): T {
	const total = items.reduce((acc, [, weight]) => acc + weight, 0);
	let roll = random() * total;

	for (const [value, weight] of items) {
		roll -= weight;
		if (roll <= 0) return value;
	}

	return items[items.length - 1]![0];
}

// --- Roles -----------------------------------------------------------------

const ROLES = [
	{
		slug: 'administration',
		name: 'Administration',
		description: "Acces complet, y compris les reglages et la gestion des comptes.",
		// Le role systeme porte la liste complete : il n'existe pas de joker dans
		// la resolution des permissions (voir shared/permissions.ts).
		permissions: [...PERMISSION_KEYS],
		isSystem: true
	},
	{
		slug: 'redaction',
		name: 'Redaction',
		description: 'Redige et publie les articles, videos, podcasts et reprises de presse.',
		permissions: ['media.read', 'media.write', 'media.publish', 'survey.read'],
		isSystem: false
	},
	{
		slug: 'analyse',
		name: 'Analyse',
		description: 'Importe les reponses, construit les questionnaires et les cartes.',
		permissions: ['survey.read', 'survey.write', 'survey.import', 'card.write', 'media.read'],
		isSystem: false
	},
	{
		slug: 'lecture',
		name: 'Lecture',
		description: 'Consulte le back-office sans rien modifier.',
		permissions: ['survey.read', 'media.read', 'user.read', 'audit.read'],
		isSystem: false
	}
] as const;

async function seedRoles() {
	for (const role of ROLES) {
		await prisma.role.upsert({
			where: { slug: role.slug },
			create: { ...role, permissions: [...role.permissions] },
			// Le nom et la description restent modifiables au back-office : on ne
			// reecrit que les permissions du role systeme, pour qu'il recupere celles
			// ajoutees par une nouvelle fonctionnalite.
			update: role.isSystem ? { permissions: [...role.permissions] } : {}
		});
	}

	console.warn(`  roles : ${ROLES.length}`);
}

async function seedAdmin() {
	const email = process.env.SEED_ADMIN_EMAIL ?? 'contact@humanitour.fr';
	const password = process.env.SEED_ADMIN_PASSWORD ?? 'humanitour-dev-2026';

	const role = await prisma.role.findUniqueOrThrow({ where: { slug: 'administration' } });
	const passwordHash = await hash(password, { algorithm: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 });

	await prisma.user.upsert({
		where: { email },
		create: { email, passwordHash, displayName: 'Administration', roleId: role.id },
		update: { roleId: role.id, isActive: true }
	});

	console.warn(`  compte admin : ${email} / ${password}`);
}

async function seedSettings() {
	await prisma.appSetting.upsert({
		where: { key: 'anonymity.k' },
		create: { key: 'anonymity.k', value: 5 },
		update: {}
	});

	console.warn('  reglages : seuil k-anonymat');
}

// --- Questionnaire de demonstration ----------------------------------------

interface OptionSeed {
	code: string;
	label: string;
	isNonResponse?: boolean;
	color?: string;
}

interface QuestionSeed {
	code: string;
	label: string;
	type: string;
	// Le type JSON de Prisma, et non Record<string, unknown> : la configuration
	// part telle quelle dans une colonne Json.
	config?: Prisma.InputJsonObject;
	options?: OptionSeed[];
	isCrossable?: boolean;
}

const QUESTIONS: QuestionSeed[] = [
	{
		code: 'priorite',
		label: 'Quelle est votre priorite pour la France ?',
		type: 'single_choice',
		options: [
			{ code: 'pouvoir_achat', label: "Le pouvoir d'achat" },
			{ code: 'sante', label: 'La sante' },
			{ code: 'securite', label: 'La securite' },
			{ code: 'ecologie', label: "L'ecologie" },
			{ code: 'education', label: "L'education" },
			{ code: 'immigration', label: "L'immigration" },
			{ code: 'nsp', label: 'Ne se prononce pas', isNonResponse: true }
		]
	},
	{
		code: 'tour1',
		label: 'Au premier tour, pour qui allez-vous voter ?',
		type: 'single_choice',
		options: [
			{ code: 'gauche', label: 'Un candidat de gauche' },
			{ code: 'centre', label: 'Un candidat du centre' },
			{ code: 'droite', label: 'Un candidat de droite' },
			{ code: 'extreme_droite', label: "Un candidat d'extreme droite" },
			{ code: 'blanc', label: 'Vote blanc ou nul' },
			{ code: 'abstention', label: 'Je ne compte pas voter' },
			{ code: 'indecis', label: "Je ne sais pas encore", isNonResponse: true }
		]
	},
	{
		code: 'tour2_jamais',
		label: 'Au second tour, pour qui ne voterez-vous jamais ?',
		type: 'single_choice',
		options: [
			{ code: 'gauche', label: 'Un candidat de gauche' },
			{ code: 'centre', label: 'Un candidat du centre' },
			{ code: 'droite', label: 'Un candidat de droite' },
			{ code: 'extreme_droite', label: "Un candidat d'extreme droite" },
			{ code: 'aucun', label: "Aucun, je peux voter pour n'importe qui" },
			{ code: 'nsp', label: 'Ne se prononce pas', isNonResponse: true }
		]
	},
	{
		code: 'region',
		label: 'Dans quelle region habitez-vous ?',
		type: 'single_choice',
		options: [
			{ code: 'bretagne', label: 'Bretagne' },
			{ code: 'normandie', label: 'Normandie' },
			{ code: 'idf', label: 'Ile-de-France' },
			{ code: 'grand_est', label: 'Grand Est' },
			{ code: 'nouvelle_aquitaine', label: 'Nouvelle-Aquitaine' },
			{ code: 'occitanie', label: 'Occitanie' },
			{ code: 'aura', label: 'Auvergne-Rhone-Alpes' },
			{ code: 'paca', label: "Provence-Alpes-Cote d'Azur" },
			{ code: 'hauts_de_france', label: 'Hauts-de-France' },
			{ code: 'pays_de_la_loire', label: 'Pays de la Loire' },
			{ code: 'cvl', label: 'Centre-Val de Loire' },
			{ code: 'bfc', label: 'Bourgogne-Franche-Comte' }
		]
	},
	{
		code: 'territoire',
		label: 'Comment qualifieriez-vous votre commune ?',
		type: 'single_choice',
		options: [
			{ code: 'rural', label: 'Rurale' },
			{ code: 'periurbain', label: 'Periurbaine' },
			{ code: 'urbain', label: 'Urbaine' }
		]
	},
	{
		code: 'age',
		label: 'Quel age avez-vous ?',
		type: 'number',
		config: { min: 18, max: 97, bucketSize: 10, bucketStart: 18, unit: 'ans' }
	},
	{
		code: 'genre',
		label: 'Comment vous identifiez-vous ?',
		type: 'single_choice',
		options: [
			{ code: 'femme', label: 'Femme' },
			{ code: 'homme', label: 'Homme' },
			{ code: 'autre', label: 'Autre' },
			{ code: 'refus', label: 'Refus de repondre', isNonResponse: true }
		]
	},
	{
		code: 'csp',
		label: 'Quelle est votre categorie socioprofessionnelle ?',
		type: 'single_choice',
		options: [
			{ code: 'agriculteur', label: 'Agriculteur' },
			{ code: 'artisan', label: 'Artisan, commercant, chef d entreprise' },
			{ code: 'cadre', label: 'Cadre et profession intellectuelle' },
			{ code: 'intermediaire', label: 'Profession intermediaire' },
			{ code: 'employe', label: 'Employe' },
			{ code: 'ouvrier', label: 'Ouvrier' },
			{ code: 'retraite', label: 'Retraite' },
			{ code: 'etudiant', label: 'Etudiant' },
			{ code: 'sans_emploi', label: 'Sans emploi' },
			{ code: 'refus', label: 'Refus de repondre', isNonResponse: true }
		]
	},
	{
		code: 'confiance_sondages',
		label: 'Quelle confiance accordez-vous aux sondages d opinion ?',
		type: 'scale',
		config: { min: 1, max: 10, minLabel: 'aucune confiance', maxLabel: 'confiance totale' }
	},
	{
		code: 'verbatim',
		label: 'Souhaitez-vous ajouter quelque chose ?',
		type: 'free_text',
		isCrossable: false
	}
];

const SURVEY_SLUG = 'presidentielle-2027';

async function seedSurvey() {
	const survey = await prisma.survey.upsert({
		where: { slug: SURVEY_SLUG },
		create: {
			slug: SURVEY_SLUG,
			title: 'Presidentielle 2027 — le tour de France',
			subtitle: '5 000 kilometres a velo, a la rencontre des habitants',
			description:
				"Enquete menee en face-a-face pendant le tour de France a velo d'Humanitour. Chaque reponse a ete recueillie sur le terrain, sans panel ni remuneration.",
			methodology:
				"Collecte en face-a-face, sur la voie publique et dans les commerces, le long d'un parcours de 5 000 kilometres traversant les regions metropolitaines. Aucun redressement n'est applique : les effectifs publies sont des comptages bruts. Les non-reponses, refus et « sans opinion » sont comptes comme des modalites a part entiere. L'echantillon n'est pas representatif au sens des instituts prives : il est decrit tel qu'il est, region par region.",
			status: 'PUBLISHED',
			publishedAt: new Date('2026-09-01'),
			fieldworkStart: new Date('2026-06-15'),
			fieldworkEnd: new Date('2026-08-20')
		},
		update: { status: 'PUBLISHED' }
	});

	await prisma.question.deleteMany({ where: { surveyId: survey.id } });

	for (const [position, seed] of QUESTIONS.entries()) {
		await prisma.question.create({
			data: {
				surveyId: survey.id,
				code: seed.code,
				position,
				label: seed.label,
				type: seed.type,
				config: seed.config ?? {},
				isCrossable: seed.isCrossable ?? true,
				options: {
					create: (seed.options ?? []).map((option, index) => ({
						code: option.code,
						label: option.label,
						position: index,
						isNonResponse: option.isNonResponse ?? false,
						color: option.color ?? null
					}))
				}
			}
		});
	}

	console.warn(`  sondage : ${survey.slug} (${QUESTIONS.length} questions)`);
	return survey.id;
}

// --- Reponses de demonstration ---------------------------------------------

/** Priorites, ponderees par categorie socioprofessionnelle. */
const PRIORITY_BY_CSP: Record<string, readonly (readonly [string, number])[]> = {
	ouvrier: [['pouvoir_achat', 45], ['securite', 15], ['sante', 12], ['immigration', 14], ['ecologie', 4], ['education', 6], ['',4]],
	employe: [['pouvoir_achat', 38], ['sante', 18], ['securite', 12], ['education', 12], ['ecologie', 8], ['immigration', 8], ['',4]],
	cadre: [['ecologie', 24], ['education', 20], ['sante', 16], ['pouvoir_achat', 18], ['securite', 8], ['immigration', 6], ['',8]],
	retraite: [['sante', 34], ['securite', 20], ['pouvoir_achat', 22], ['immigration', 10], ['ecologie', 6], ['education', 4], ['',4]],
	etudiant: [['ecologie', 30], ['education', 26], ['pouvoir_achat', 20], ['sante', 8], ['securite', 6], ['immigration', 4], ['',6]],
	agriculteur: [['pouvoir_achat', 34], ['ecologie', 14], ['securite', 16], ['sante', 14], ['immigration', 14], ['education', 4], ['',4]]
};

const DEFAULT_PRIORITY: readonly (readonly [string, number])[] = [
	['pouvoir_achat', 32], ['sante', 18], ['securite', 14], ['ecologie', 14], ['education', 10], ['immigration', 8], ['',4]
];

const VOTE_BY_PRIORITY: Record<string, readonly (readonly [string, number])[]> = {
	ecologie: [['gauche', 48], ['centre', 20], ['droite', 10], ['extreme_droite', 4], ['blanc', 6], ['abstention', 6], ['',6]],
	education: [['gauche', 38], ['centre', 22], ['droite', 16], ['extreme_droite', 8], ['blanc', 6], ['abstention', 4], ['',6]],
	sante: [['gauche', 28], ['centre', 20], ['droite', 22], ['extreme_droite', 14], ['blanc', 6], ['abstention', 4], ['',6]],
	pouvoir_achat: [['gauche', 22], ['centre', 12], ['droite', 16], ['extreme_droite', 28], ['blanc', 8], ['abstention', 8], ['',6]],
	securite: [['droite', 30], ['extreme_droite', 34], ['centre', 14], ['gauche', 8], ['blanc', 4], ['abstention', 4], ['',6]],
	immigration: [['extreme_droite', 52], ['droite', 22], ['centre', 8], ['gauche', 4], ['blanc', 4], ['abstention', 4], ['',6]]
};

const Regions: readonly (readonly [string, number])[] = [
	['idf', 18], ['aura', 13], ['nouvelle_aquitaine', 10], ['occitanie', 10], ['hauts_de_france', 9],
	['grand_est', 9], ['paca', 8], ['pays_de_la_loire', 6], ['bretagne', 6], ['normandie', 5],
	['bfc', 4], ['cvl', 4]
];

const CSPS: readonly (readonly [string, number])[] = [
	['retraite', 22], ['employe', 18], ['cadre', 14], ['ouvrier', 13], ['intermediaire', 12],
	['etudiant', 7], ['artisan', 5], ['sans_emploi', 5], ['agriculteur', 3], ['',1]
];

const RESPONSE_COUNT = 900;

interface ResolvedQuestion {
	id: string;
	code: string;
	type: string;
	config: Record<string, unknown>;
	options: QuestionOptionLike[];
	optionIds: Map<string, string>;
}

async function loadQuestions(surveyId: string): Promise<Map<string, ResolvedQuestion>> {
	const questions = await prisma.question.findMany({
		where: { surveyId },
		include: { options: true }
	});

	return new Map(
		questions.map((question) => [
			question.code,
			{
				id: question.id,
				code: question.code,
				type: question.type,
				config: (question.config ?? {}) as Record<string, unknown>,
				options: question.options.map((option) => ({
					code: option.code,
					label: option.label,
					position: option.position,
					isNonResponse: option.isNonResponse,
					color: option.color
				})),
				optionIds: new Map(question.options.map((option) => [option.code, option.id]))
			}
		])
	);
}

/**
 * Fabrique les lignes `Answer` a partir d'une valeur BRUTE, en passant par le
 * registre des types de question.
 *
 * Le seed produit donc exactement ce que produirait un import de fichier : il ne
 * peut pas fabriquer une donnee que le registre refuserait, et il n'a pas a
 * recopier la logique des tranches ou de la non-reponse.
 */
function buildAnswers(question: ResolvedQuestion, raw: unknown) {
	const type = requireQuestionType(question.type);
	const result = type.normalize(raw, { config: question.config, options: question.options });

	if (!result.ok) {
		throw new Error(`Seed incoherent sur « ${question.code} » : ${result.reason}`);
	}

	return result.values.map((value) => ({
		questionId: question.id,
		optionId: value.optionCode ? (question.optionIds.get(value.optionCode) ?? null) : null,
		modalityKey: value.modalityKey,
		valueNumber: value.valueNumber,
		valueText: value.valueText
	}));
}

async function seedResponses(surveyId: string) {
	await prisma.response.deleteMany({ where: { surveyId } });

	const questions = await loadQuestions(surveyId);
	const start = new Date('2026-06-15').getTime();
	const end = new Date('2026-08-20').getTime();

	for (let index = 0; index < RESPONSE_COUNT; index += 1) {
		const csp = pick(CSPS);
		const priority = pick(PRIORITY_BY_CSP[csp] ?? DEFAULT_PRIORITY);
		const vote = pick(VOTE_BY_PRIORITY[priority] ?? VOTE_BY_PRIORITY.pouvoir_achat!);
		const region = pick(Regions);
		const age = 18 + Math.floor(random() * 72);

		// Valeurs BRUTES, telles qu'elles arriveraient d'un fichier importe : c'est
		// le registre qui les normalise, tranches d'age et non-reponses comprises.
		const raw: Record<string, unknown> = {
			csp,
			priorite: priority,
			tour1: vote,
			region,
			age,
			genre: pick([['femme', 50], ['homme', 47], ['autre', 1], ['', 2]]),
			territoire: pick([['urbain', 45], ['periurbain', 32], ['rural', 23]]),
			tour2_jamais: pick(
				vote === 'extreme_droite'
					? [['gauche', 55], ['centre', 15], ['aucun', 12], ['droite', 8], ['', 10]]
					: [['extreme_droite', 58], ['droite', 12], ['aucun', 10], ['gauche', 8], ['', 12]]
			),
			confiance_sondages: 1 + Math.floor(random() * 10)
		};

		const answers = Object.entries(raw).flatMap(([code, value]) =>
			buildAnswers(questions.get(code)!, value)
		);

		await prisma.response.create({
			data: {
				surveyId,
				collectedAt: new Date(start + random() * (end - start)),
				source: 'MANUAL',
				answers: { create: answers }
			}
		});
	}

	console.warn(`  reponses : ${RESPONSE_COUNT}`);
}


// --- Mediatheque de demonstration ------------------------------------------

interface MediaSeed {
	slug: string;
	kind: 'ARTICLE' | 'VIDEO' | 'PODCAST' | 'PRESS';
	title: string;
	excerpt: string;
	/** Paragraphes, joints a l'enregistrement : plus lisible qu'une chaine echappee. */
	body?: string[];
	publishedAt: string;
	tags: string[];
	data: Record<string, unknown>;
}

const MEDIA: MediaSeed[] = [
	{
		slug: 'pourquoi-nous-publions-les-donnees-brutes',
		kind: 'ARTICLE',
		title: 'Pourquoi nous publions les donnees brutes',
		excerpt:
			"Aucun institut prive ne diffuse ses reponses ligne a ligne. Voici pourquoi nous le faisons, et ce que cela nous oblige a changer dans notre facon de compter.",
		body: [
			"Un chiffre sans ses donnees est une affirmation, pas une mesure.",
			"Quand un institut annonce qu'un candidat est a 28 %, personne ne peut verifier combien de personnes ont ete interrogees dans chaque region, combien n'ont pas voulu repondre, ni quel redressement a ete applique entre le comptage et la publication. Le lecteur doit croire sur parole.",
			"Nous publions donc l'integralite du materiau. Chaque enquete expose son export complet, en CSV et en JSON, sans compte ni inscription. Quiconque veut refaire nos calculs le peut.",
			"Cette promesse nous coute quelque chose, et c'est tant mieux. Elle nous interdit de ponderer nos resultats pour les rendre plus presentables. Elle nous oblige a compter les non-reponses au lieu de les faire disparaitre. Elle nous force a ecrire noir sur blanc les limites de notre echantillon : rencontrer les gens dehors surrepresente celles et ceux qui sortent.",
			"Un sondage honnete n'est pas un sondage parfait. C'est un sondage dont on peut mesurer les defauts."
		],
		publishedAt: '2026-09-02',
		tags: ['methodologie', 'open data'],
		data: {
			standfirst:
				"La transparence n'est pas un argument de communication : c'est une contrainte technique."
		}
	},
	{
		slug: 'etape-12-le-pouvoir-d-achat-en-tete',
		kind: 'ARTICLE',
		title: "Etape 12 : le pouvoir d'achat arrive en tete, partout",
		excerpt:
			"Douze etapes, plus de neuf cents entretiens. Une priorite domine dans toutes les regions traversees, mais pas pour les memes raisons.",
		body: [
			"Sur les douze premieres etapes, une reponse revient plus que toutes les autres a la question de la priorite pour la France : le pouvoir d'achat.",
			"Le croisement avec la categorie socioprofessionnelle raconte pourtant deux histoires differentes. Chez les ouvriers et les employes, la reponse arrive largement en tete. Chez les cadres, elle passe derriere l'ecologie et l'education.",
			"La part de personnes qui ne se prononcent pas merite autant d'attention que les autres. Nous la comptons et nous l'affichons, parce qu'un refus de repondre est une information politique, pas un trou dans le tableau.",
			"Vous pouvez refaire ce croisement vous-meme depuis la page des donnees."
		],
		publishedAt: '2026-08-18',
		tags: ['resultats', 'le tour'],
		data: {}
	},
	{
		slug: 'sur-la-route-entre-deux-marches',
		kind: 'VIDEO',
		title: 'Sur la route, entre deux marches',
		excerpt:
			"Quinze minutes de rencontres filmees entre deux etapes, la ou les panels en ligne ne vont jamais.",
		publishedAt: '2026-08-05',
		tags: ['reportage', 'le tour'],
		data: { sourceUrl: 'https://framatube.org/w/abcdefgh12345678' }
	},
	{
		slug: 'episode-1-on-ne-me-demande-jamais-mon-avis',
		kind: 'PODCAST',
		title: "Episode 1 : « On ne me demande jamais mon avis »",
		excerpt:
			"Premier episode des echanges enregistres sur le terrain. Une heure de conversation avec des personnes que les sondages n'appellent pas.",
		publishedAt: '2026-07-22',
		tags: ['podcast', 'terrain'],
		data: {
			audioUrl: 'https://media.humanitour.fr/podcast/episode-1.mp3',
			durationSeconds: 3720,
			transcript:
				"Transcription de demonstration. Elle rend l'episode accessible aux personnes sourdes et malentendantes, et indexable par les moteurs de recherche."
		}
	},
	{
		slug: 'reprise-un-institut-de-sondage-a-velo',
		kind: 'PRESS',
		title: 'Un institut de sondage a velo veut rendre les chiffres verifiables',
		excerpt:
			'Un media local consacre un article au projet et a sa methode de collecte en face-a-face.',
		publishedAt: '2026-07-10',
		tags: ['revue de presse'],
		data: {
			sourceName: "La Gazette des Cotes-d'Armor",
			sourceUrl: 'https://exemple.fr/humanitour-institut-a-velo',
			author: 'Redaction locale'
		}
	}
];

async function seedMedia() {
	const author = await prisma.user.findFirst({ where: { role: { slug: 'administration' } } });

	for (const item of MEDIA) {
		// La validation passe par le registre : le seed ne peut pas fabriquer un
		// media que le back-office refuserait.
		const parsed = requireMediaType(item.kind).parseData(item.data);
		if (!parsed.ok) throw new Error(`Media « ${item.slug} » invalide : ${parsed.reason}`);

		const payload = {
			kind: item.kind,
			status: 'PUBLISHED' as const,
			title: item.title,
			excerpt: item.excerpt,
			body: item.body?.join('\n\n') ?? null,
			publishedAt: new Date(item.publishedAt),
			tags: item.tags,
			data: parsed.data as Prisma.InputJsonObject,
			authorId: author?.id ?? null
		};

		await prisma.mediaItem.upsert({
			where: { slug: item.slug },
			create: { slug: item.slug, ...payload },
			update: payload
		});
	}

	console.warn(`  medias : ${MEDIA.length}`);
}

async function main() {
	console.warn('Seed Humanitour');
	await seedRoles();
	await seedAdmin();
	await seedSettings();
	const surveyId = await seedSurvey();
	await seedResponses(surveyId);
	await seedMedia();
	console.warn('Termine.');
}

main()
	.catch((error: unknown) => {
		console.error(error);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
