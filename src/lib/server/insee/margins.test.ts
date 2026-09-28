import { describe, expect, it } from 'vitest';
import { NON_RESPONSE_KEY } from '$lib/shared/questions';
import type { CensusReference } from './census';
import {
	censusOrigin,
	censusSource,
	normalizeLabel,
	parseAgeRange,
	proposeMargins,
	type MatchableQuestion
} from './margins';

/** Un referentiel jouet : chaque age revolu compte 100 personnes. */
const REFERENCE: CensusReference = {
	period: '2023',
	fetchedAt: '2026-09-28T10:00:00.000Z',
	adults: 8_300,
	sex: { F: 52, M: 48 },
	ages: Array.from({ length: 101 }, () => 100),
	regions: {
		'11': 190,
		'24': 40,
		'27': 40,
		'28': 50,
		'32': 90,
		'44': 85,
		'52': 60,
		'53': 50,
		'75': 90,
		'76': 90,
		'84': 120,
		'93': 75,
		'94': 5
	},
	pcs: { '1': 1, '2': 4, '3': 12, '4': 15, '5': 15, '6': 12, '7': 29, '9': 12 },
	pcsYoungShare: 0.4
};

function question(code: string, label: string, modalities: string[]): MatchableQuestion {
	return {
		code,
		label,
		modalities: [
			...modalities.map((modality, index) => ({
				key: `m${index}`,
				label: modality,
				isNonResponse: false
			})),
			{ key: NON_RESPONSE_KEY, label: 'Sans réponse', isNonResponse: true }
		]
	};
}

function shares(proposal: ReturnType<typeof proposeMargins>): (number | null)[] {
	return proposal?.modalities.map((modality) => modality.share) ?? [];
}

describe('normalizeLabel', () => {
	it('retire accents, casse et ponctuation, mais garde le plus', () => {
		expect(normalizeLabel("Provence-Alpes-Côte d'Azur")).toBe('provence alpes cote d azur');
		expect(normalizeLabel('  65+ ')).toBe('65+');
	});
});

describe('parseAgeRange', () => {
	it.each([
		['18-24 ans', { lo: 18, hi: 24 }],
		['De 25 à 34 ans', { lo: 25, hi: 34 }],
		['entre 35 et 49 ans', { lo: 35, hi: 49 }],
		['65 ans et plus', { lo: 65, hi: 100 }],
		['65 ans ou +', { lo: 65, hi: 100 }],
		['65+', { lo: 65, hi: 100 }],
		['Moins de 25 ans', { lo: 0, hi: 24 }],
		['24 ans et moins', { lo: 0, hi: 24 }],
		['Plus de 65 ans', { moreThan: 65 }]
	])('lit « %s »', (label, expected) => {
		expect(parseAgeRange(label)).toEqual(expected);
	});

	it('ne lit pas un libelle sans age, ni une tranche a l envers', () => {
		expect(parseAgeRange('Retraité')).toBeNull();
		expect(parseAgeRange('34-25')).toBeNull();
	});
});

describe('proposeMargins', () => {
	it('propose le sexe, dans l ordre des modalites', () => {
		const proposal = proposeMargins(question('sexe', 'Vous êtes', ['Femme', 'Homme']), REFERENCE);

		expect(proposal?.dimension).toBe('sexe');
		expect(proposal?.targets).toEqual({ m0: 0.52, m1: 0.48 });
		expect(proposal?.notes).toEqual([]);
	});

	it('laisse vide une modalite de genre que le recensement ne connait pas', () => {
		const proposal = proposeMargins(
			question('genre', 'Genre', ['F', 'H', 'Autre / non-binaire']),
			REFERENCE
		);

		expect(shares(proposal)).toEqual([0.52, 0.48, null]);
		expect(proposal?.modalities[2]?.reason).toMatch(/deux sexes/);
		expect(proposal?.notes.at(-1)).toMatch(/à la main/);
	});

	it('construit n importe quel decoupage d ages a partir des ages detailles', () => {
		const proposal = proposeMargins(
			question('age_cat', "Tranche d'âge", ['18-24', '25-34', '35-49', '50-64', '65 ans et plus']),
			REFERENCE
		);

		// 7, 10, 15, 15 et 36 ages revolus sur 83.
		expect(proposal?.dimension).toBe('age');
		expect(shares(proposal).map((share) => Number(share?.toFixed(6)))).toEqual(
			[7, 10, 15, 15, 36].map((ages) => Number((ages / 83).toFixed(6)))
		);
		expect(proposal?.modalities[4]?.census).toBe('65 ans ou plus');
	});

	it('fait commencer « plus de 65 ans » a 66 quand une tranche finit a 65', () => {
		const proposal = proposeMargins(
			question('age', 'Âge', ['18-49 ans', '50-65 ans', 'Plus de 65 ans']),
			REFERENCE
		);

		expect(proposal?.modalities[2]?.census).toBe('66 ans ou plus');
		expect(proposal?.notes).toEqual([]);
	});

	it('lit « plus de 65 ans » seul comme 65 ans ou plus', () => {
		const proposal = proposeMargins(
			question('age', 'Âge', ['18-64 ans', 'Plus de 65 ans']),
			REFERENCE
		);

		expect(proposal?.modalities[1]?.census).toBe('65 ans ou plus');
	});

	it('ecarte les mineurs et signale les ages que personne ne couvre', () => {
		const proposal = proposeMargins(
			question('age', 'Âge', ['Moins de 18 ans', '20-29 ans', '30-39 ans', '60 ans et plus']),
			REFERENCE
		);

		expect(proposal?.modalities[0]?.share).toBeNull();
		expect(proposal?.modalities[0]?.reason).toMatch(/18 ans ou plus/);
		expect(proposal?.modalities[1]?.census).toBe('20 à 29 ans');
		expect(proposal?.notes[0]).toMatch(/18 à 19 ans, 40 à 59 ans/);
	});

	it('refuse de partager une categorie couverte par deux modalites', () => {
		const proposal = proposeMargins(
			question('age', 'Âge', ['18-30 ans', '25-40 ans', '41 ans et plus']),
			REFERENCE
		);

		expect(proposal?.modalities[0]?.share).toBeNull();
		expect(proposal?.modalities[1]?.reason).toMatch(/même catégorie/);
		expect(proposal?.modalities[2]?.share).toBe(1);
	});

	it('range la PCS, y compris une modalite qui regroupe deux groupes', () => {
		const proposal = proposeMargins(
			question('pcs', 'Catégorie socioprofessionnelle', [
				'Agriculteurs, artisans, commerçants',
				'Cadres et professions intellectuelles supérieures',
				'Professions intermédiaires',
				'Employés',
				'Ouvriers',
				'Retraités',
				'Autres inactifs (étudiants, au foyer)'
			]),
			REFERENCE
		);

		expect(proposal?.dimension).toBe('pcs');
		expect(proposal?.modalities[0]?.census).toBe(
			'Agriculteurs exploitants + Artisans, commerçants et chefs d’entreprise'
		);
		expect(shares(proposal)).toEqual([0.05, 0.12, 0.15, 0.15, 0.12, 0.29, 0.12]);
	});

	it('ne partage pas « autres inactifs » entre etudiants et personnes au foyer', () => {
		const proposal = proposeMargins(
			question('statut', 'Profession', [
				'Cadre',
				'Employé',
				'Ouvrier',
				'Étudiant',
				'Au foyer',
				'Retraité'
			]),
			REFERENCE
		);

		expect(proposal?.modalities[3]?.share).toBeNull();
		expect(proposal?.modalities[4]?.share).toBeNull();
	});

	it('explique pourquoi les chomeurs n ont pas de marge propre', () => {
		const proposal = proposeMargins(
			question('pcs', 'PCS', ['Cadre', 'Ouvrier', 'Chômeur']),
			REFERENCE
		);

		expect(proposal?.modalities[2]?.reason).toMatch(/dernier emploi/);
	});

	it('reconnait les treize regions, alias compris', () => {
		const proposal = proposeMargins(
			question('region', 'Région de résidence', [
				'Île-de-France',
				'Centre-Val de Loire',
				'Bourgogne-Franche-Comté',
				'Normandie',
				'Hauts-de-France',
				'Grand Est',
				'Pays de la Loire',
				'Bretagne',
				'Nouvelle-Aquitaine',
				'Occitanie',
				'Auvergne-Rhône-Alpes',
				'PACA',
				'Corse',
				'Outre-mer'
			]),
			REFERENCE
		);

		expect(proposal?.dimension).toBe('region');
		expect(proposal?.targets.m0).toBeCloseTo(190 / 985, 10);
		expect(proposal?.modalities[11]?.census).toBe("Provence-Alpes-Côte d'Azur");
		expect(proposal?.modalities[13]?.reason).toMatch(/hors de la France métropolitaine/);
	});

	it('distingue Ile-de-France et province', () => {
		const proposal = proposeMargins(
			question('zone', 'Zone', ['Île-de-France', 'Province']),
			REFERENCE
		);

		expect(proposal?.dimension).toBe('territoire');
		expect(proposal?.targets.m0).toBeCloseTo(190 / 985, 10);
		expect(proposal?.targets.m1).toBeCloseTo(795 / 985, 10);
	});

	it('lit « hors Ile-de-France » comme la province, pas comme l Ile-de-France', () => {
		const proposal = proposeMargins(
			question('zone', 'Territoire', ['Paris et Île-de-France', 'Hors Île-de-France']),
			REFERENCE
		);

		expect(proposal?.modalities.map((modality) => modality.census)).toEqual([
			'Île-de-France',
			'Province (douze régions hors Île-de-France)'
		]);
	});

	it('signale une region absente des modalites', () => {
		const proposal = proposeMargins(
			question('region', 'Région', ['Bretagne', 'Normandie', 'Corse']),
			REFERENCE
		);

		expect(proposal?.notes[0]).toMatch(/Île-de-France, Centre-Val de Loire/);
	});

	it('ne propose rien pour une question qui n est pas socio-demographique', () => {
		expect(
			proposeMargins(
				question('media', 'Quels médias consultez-vous ?', ['Télévision', 'Radio', 'Presse']),
				REFERENCE
			)
		).toBeNull();
	});

	it('ne propose rien quand une seule modalite ressemble a une region', () => {
		expect(
			proposeMargins(
				question('sujet', 'Sujet', ['Bretagne', 'Santé', 'Climat', 'Retraites des élus']),
				REFERENCE
			)
		).toBeNull();
	});

	it('ne propose rien pour une question a une seule modalite', () => {
		expect(proposeMargins(question('sexe', 'Sexe', ['Femme']), REFERENCE)).toBeNull();
	});

	it('se laisse departager par le libelle de la question', () => {
		// « Paris » et « Province » : territoire ; le libelle confirme.
		const proposal = proposeMargins(
			question('lieu', 'Territoire de résidence', ['Paris', 'Régions']),
			REFERENCE
		);

		expect(proposal?.dimension).toBe('territoire');
	});
});

describe('censusSource et censusOrigin', () => {
	it('nomme le millesime, le champ, les tableaux et la date de consultation', () => {
		expect(censusSource(REFERENCE)).toBe(
			'Insee, recensement de la population 2023 (RP 2023), France métropolitaine, population de 18 ans ou plus. Tableaux POP1 et POP6, API Melodi, consultée le 28 septembre 2026.'
		);
	});

	it('cite POP6 pour la PCS, POP1 seul pour le reste', () => {
		expect(censusOrigin(REFERENCE, 'pcs').datasets).toEqual([
			'DS_RP_TD_POPULATION_PCSAGESEX_COMP',
			'DS_RP_TD_POPULATION_AGESEX_PRINC'
		]);
		expect(censusOrigin(REFERENCE, 'age')).toEqual({
			provider: 'insee-melodi',
			datasets: ['DS_RP_TD_POPULATION_AGESEX_PRINC'],
			period: '2023',
			geo: 'FRANCE-FM',
			dimension: 'age',
			fetchedAt: '2026-09-28T10:00:00.000Z'
		});
	});
});
