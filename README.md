<div align="center">

# Humanitour

**L'institut de sondage citoyen.**
Les données brutes, la méthodologie, et les non-réponses. Tout est public.

[![Licence du code : AGPL v3](https://img.shields.io/badge/code-AGPL--3.0-FF5757)](./LICENSE)
[![Licence des données : ODbL 1.0](https://img.shields.io/badge/donn%C3%A9es-ODbL%201.0-FF751F)](https://opendatacommons.org/licenses/odbl/1-0/)

</div>

---

## Pourquoi ce projet existe

En 1972, Pierre Bourdieu identifiait trois biais des sondages d'opinion :
l'imposition de problématiques que personne ne se pose, l'illusion que tout le monde
a un avis, et la fabrication d'un consensus par l'effacement des non-réponses.

Cinquante ans plus tard, les instituts qui produisent ces chiffres appartiennent aux
mêmes groupes que les médias qui les publient, ne diffusent ni leurs données brutes
ni leurs redressements, et recrutent par formulaire en ligne auprès de volontaires
rémunérés en bons d'achat.

Humanitour prend le problème par l'autre bout : **5 000 kilomètres à vélo, deux
mois, toutes les régions métropolitaines**, des entretiens en face-à-face, et la
totalité du matériau publiée.

> « L'opinion publique n'existe pas. » — Pierre Bourdieu, 1972

## Ce que fait cette plateforme

- **Explorateur de données** — croiser n'importe quelle variable avec n'importe
  quelle autre, sur n'importe quelle enquête, et partager le résultat par un lien
  permanent.
- **Données brutes** — export CSV et JSON de chaque sondage publié, sans compte.
- **Médiathèque** — articles, reportages vidéo, podcasts, revue de presse.
- **Répondre en ligne** — les enquêtes encore ouvertes se remplissent sur
  `/repondre`, sans compte et sans quitter le site. Le questionnaire est rendu
  nativement à partir de sa définition Openforms, et la réponse repart chez
  Openforms, seul canal de collecte.
- **Back-office** — liaison aux formulaires Openforms, construction des questionnaires,
  publication des cartes, gestion des rôles.

## Les garanties, écrites dans le code

| Promesse | Où elle est tenue |
| --- | --- |
| Aucun redressement, aucune pondération | L'agrégation ne fait que compter |
| Les non-réponses sont comptées | `NON_RESPONSE` est une modalité ordinaire, jamais un `null` filtré |
| Les effectifs accompagnent les pourcentages | Le `n` brut voyage avec chaque part |
| Pas de ré-identification possible | Seuil de k-anonymat appliqué dans la couche d'agrégation |
| Les liens partagés ne cassent jamais | Les permaliens et l'API publique sont un contrat |

Le détail de ces invariants, et la raison pour laquelle ils sont des contraintes
techniques et non des intentions, se trouve dans [`AGENTS.md`](./AGENTS.md).

## Démarrer

PostgreSQL en développement comme en production : le même moteur que celui qui
sert les données publiées, avec les mêmes types et le même comportement
transactionnel.

```bash
bun install
cp .env.example .env
bun run setup   # PostgreSQL via docker-compose, migrations, jeu de démonstration
bun run dev     # serveur de développement
```

Le compte de démonstration est `contact@humanitour.fr` / `humanitour-dev-2026`.
`bun run services:down` arrête la base ; y ajouter `-v` efface son volume et
remet donc tout à zéro.

Pour travailler contre une base déjà en place ailleurs, il suffit de pointer
`DATABASE_URL` dessus : `bun run db:migrate:deploy` applique le schéma.

## Contribuer

Avant toute contribution, lisez [`AGENTS.md`](./AGENTS.md) : le projet a des règles
explicites sur la modularité, la couverture de tests et le traitement des
non-réponses. Une contribution qui les ignore sera refusée même si elle fonctionne.

La porte de qualité doit être verte :

```bash
bun run quality:gate
```

## Licences

Le **code** est sous [AGPL-3.0](./LICENSE) : si vous hébergez une version modifiée
de cette plateforme, vous devez en publier le code. Un institut de sondage qui
reproche l'opacité aux autres ne peut pas distribuer un outil refermable.

Les **données** publiées sont sous [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) :
réutilisation libre, attribution obligatoire, partage à l'identique.

## L'association

HUMANITOUR — association loi 1901, RNA W224012149
9 lieu-dit Kersaint, 22120 Hillion — contact@humanitour.fr
