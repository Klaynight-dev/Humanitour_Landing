# AGENTS.md

Conventions de travail sur **Humanitour** pour tout agent (Claude Code, Copilot, Cursor…).
`CLAUDE.md` décrit le projet et sa stack ; **ce fichier décrit comment on modifie le
code sans le dégrader.**

Dernière révision : 14 septembre 2026.

---

## 0. Ce qu'on construit, et pourquoi ça contraint le code

Humanitour est un **institut de sondage citoyen** (association loi 1901, RNA
W224012149). Son argumentaire est frontal : les instituts privés fabriquent
l'opinion au lieu de la mesurer. Trois reproches, tirés de Bourdieu (1972) et
actualisés :

1. **L'imposition de problématiques** — on pose des questions que les gens ne se
   posent pas.
2. **L'illusion de la réponse universelle** — on force une réponse même incomprise.
3. **La fabrication d'un consensus** — les non-réponses sont effacées.

S'y ajoutent l'opacité des données brutes, des redressements non publiés, et des
instituts détenus par les propriétaires des médias qui les commandent.

**Conséquence directe sur ce dépôt :** chaque reproche adressé aux autres est une
contrainte technique ici. Ce ne sont pas des préférences esthétiques, ce sont les
invariants du produit.

| Reproche adressé aux instituts | Ce que le code doit garantir |
| --- | --- |
| Données brutes non publiées | Tout sondage publié expose son export brut (CSV + JSON), sans compte |
| Redressements opaques | **Aucune pondération implicite.** Un chiffre affiché est un comptage réel |
| Non-réponses effacées | « Sans opinion », « refus », « non-réponse » sont des **modalités de plein droit**, jamais filtrées par défaut |
| Questions orientées | Le libellé exact de la question est affiché avec chaque graphique |
| Échantillons biaisés | Les effectifs bruts (`n`) accompagnent tout pourcentage |
| Opacité méthodologique | Chaque sondage porte sa méthodologie, versionnée, publique |

Si un changement rend l'un de ces points plus difficile, **c'est le changement qui
est mauvais**, pas la contrainte.

---

## 1. Les règles de code

On applique les règles de Torvalds, pas comme une citation décorative, mais parce
qu'elles se traduisent ici en décisions vérifiables.

### 1.1 « Bad programmers worry about the code. Good programmers worry about data structures. »

La modélisation du sondage est **la** décision du projet. Elle est dynamique : un
sondage est un schéma de questions créé en base, jamais un type TypeScript écrit à
la main. Ajouter une enquête ne doit produire **aucun diff**.

Avant d'écrire une fonction, demandez-vous si un bon schéma la rendait inutile.
C'est presque toujours le cas.

### 1.2 « Good taste » : supprimer le cas particulier, pas le brancher

L'exemple canonique de Torvalds est la suppression dans une liste chaînée : le code
médiocre teste « est-ce le premier élément ? », le bon code manipule un pointeur
indirect et le cas particulier disparaît.

Ici, le cas particulier qui revient sans cesse est **la non-réponse**. La tentation
est permanente :

```ts
// MAUVAIS GOÛT — le cas particulier est branché, donc un jour il sera oublié
const total = answers.filter((a) => a.value !== null && a.value !== 'NSP').length;
if (includeNonResponses) {
  /* … branche parallèle, testée par personne … */
}
```

```ts
// BON GOÛT — la non-réponse est une modalité comme une autre, il n'y a plus de branche
const total = answers.length; // toutes les modalités, y compris NON_RESPONSE
```

C'est exactement la critique de Bourdieu, écrite en TypeScript : **le jour où la
non-réponse est un cas particulier dans le code, elle finira effacée de l'écran.**
Elle est donc une valeur d'énumération ordinaire, comptée comme les autres, et c'est
l'affichage — jamais le calcul — qui peut choisir de la mettre en retrait.

### 1.3 « If you need more than 3 levels of indentation, you're screwed »

Trois niveaux d'indentation dans une fonction, pas plus. Au-delà, la fonction fait
deux choses : on en extrait une. ESLint le vérifie (`max-depth`).
Sorties anticipées plutôt que `else` imbriqués.

### 1.4 « Never break userspace »

Notre « userspace », c'est ce que des tiers ont mis en signet ou en dépendance :

- les **permaliens de croisement** (`/donnees/[sondage]?x=…&y=…&filtre=…`) ;
- l'**API publique** `/api/public/**` et les URLs d'export ;
- les **slugs** d'articles et de sondages.

Ces trois surfaces sont un **contrat**. On ajoute des paramètres, on n'en renomme
jamais. Un permalien partagé par un journaliste en 2026 doit fonctionner en 2030.
Toute évolution incompatible passe par une nouvelle version de route, pas par une
modification en place.

### 1.5 Chercher avant d'écrire

Un utilitaire existe probablement déjà dans `src/lib/server/` ou `src/lib/shared/`.
Un `grep` de trente secondes évite un doublon qui divergera dans six mois. Le
formatage des pourcentages, l'arrondi, le libellé des modalités, le calcul d'un
effectif : **une seule implémentation, testée, utilisée partout.**

### 1.6 Livrer ce qui est demandé

Pas de couche d'abstraction « pour plus tard », pas d'interface à une seule
implémentation, pas de fichier `index.ts` réexportant trois symboles. Pas de
correction cosmétique mêlée à un changement fonctionnel. Un problème repéré hors
périmètre se signale, il ne s'embarque pas dans le commit en cours.

---

## 2. La modularité, concrètement

« Modulaire à 100 % » ne veut pas dire « découpé en paquets ». Un monorepo de six
workspaces dont un seul consommateur est une complexité gratuite. La modularité
utile de ce projet tient dans **six registres**. Chacun a la même forme : un
contrat, un dossier, un `index` qui agrège, zéro `switch` ailleurs dans le code.

| Registre | Emplacement | Étendre = |
| --- | --- | --- |
| Types de question | `src/lib/shared/questions/` | 1 fichier : validation, normalisation, modalités |
| Visualisations | `src/lib/charts/` | 1 fichier : contrat `ChartDef` + composant Svelte |
| Formats d'import | `src/lib/server/import/` | 1 fichier : `parse(buffer) → RowSet` |
| Types de média | `src/lib/shared/media/` | 1 fichier : champs, rendu, validation |
| Permissions | `src/lib/shared/permissions.ts` | 1 constante déclarée |
| Stockage de fichiers | `src/lib/server/storage/` | 1 fichier : disque local aujourd'hui, S3/MinIO demain |

**La règle qui rend ces registres réels :** si ajouter un type de question oblige à
toucher un `switch` dans un composant, un `if` dans l'agrégation et une colonne en
base, le registre a échoué. Un nouveau type de question, c'est **un fichier ajouté
et rien d'autre**. Toute contribution qui viole ça est à refuser.

---

## 3. Les portes de qualité

Aucun commit ne part sans que les portes soient vertes.

| Commande | Attendu |
| --- | --- |
| `bun run lint` | 0 erreur (warnings tolérés) |
| `bun run typecheck` | **0 erreur** |
| `bun run test` | 0 échec |
| `bun run test:coverage` | seuils respectés (voir ci-dessous) |
| `bun run quality:gate` | enchaîne les quatre |

### 3.1 La règle de la ligne de base

Ce dépôt démarre à **zéro erreur de typecheck**. Contrairement à un projet hérité,
il n'y a pas de dette à tolérer : **la ligne de base est zéro et elle le reste.**
Un `any` ajouté pour faire passer la porte est un bug déguisé, pas un correctif.

### 3.2 Seuils de couverture

Le pourcentage global ne veut rien dire. On cible ce qui produit des **chiffres
publiés**, parce qu'une erreur y est une fausse information publique :

| Périmètre | Seuil | Pourquoi |
| --- | --- | --- |
| `src/lib/server/survey/**` (agrégation, k-anonymat) | **95 %** | Un bug ici publie un chiffre faux |
| `src/lib/server/import/**` | **90 %** | Un bug ici corrompt le jeu de données |
| `src/lib/shared/**` (permissions, types de question) | **90 %** | Socle partagé par tout le reste |
| Global | 70 % | Le reste est du câblage et de l'UI |

Les composants Svelte ne sont pas comptés : on teste la logique, extraite en `.ts`,
pas le rendu. **Corollaire : si une logique est difficile à tester, c'est qu'elle
est au mauvais endroit** — sortez-la du composant.

---

## 4. RGPD et anonymat : non négociable

Humanitour collecte des opinions politiques, c'est-à-dire des **données sensibles au
sens de l'article 9 du RGPD**. Deux règles, sans exception :

1. **Seuil k-anonymat.** Tout agrégat portant sur moins de `k` répondants
   (configurable en base, défaut **5**) retourne `suppressed: true` au lieu du
   chiffre. Le seuil s'applique **dans la couche d'agrégation**, jamais dans le
   composant : un chiffre masqué ne doit pas pouvoir fuiter par une autre route,
   un export ou l'API publique.
2. **Aucune donnée directement identifiante en base.** Pas de nom, pas d'email de
   répondant, pas d'adresse. La commune est stockée, pas l'adresse. Si une source
   d'import en contient, **l'import les rejette**, il ne les ignore pas
   silencieusement.

Le corollaire du point 1 est contre-intuitif et doit être testé : le masquage doit
résister à la **soustraction**. Si « Bretagne » affiche 120 et que la somme des
départements bretons affichés fait 117, le département masqué vaut 3. Les tests de
`anonymity` couvrent ce cas.

---

## 5. Conventions

**Langue.** Code, noms de variables, types et commits en **anglais**. Interface,
contenu et documentation en **français**. Toutes les chaînes visibles passent par
`src/lib/i18n/` — le site est monolingue aujourd'hui, il n'y a aucune raison de
rendre la traduction coûteuse demain.

**Ton éditorial.** Vouvoiement sobre sur les données, la méthodologie et le légal.
Tutoiement sur les appels à l'action et les réseaux. C'est l'écart assumé entre les
deux documents de communication de l'association.

**Nommage.** `kebab-case` pour les fichiers, `PascalCase` pour les composants Svelte
et les types, `camelCase` pour le reste. Pas d'abréviation inventée.

**Le texte visible s'écrit, il ne se génère pas.** Les commentaires de code sont
sans accents ; **tout ce que lit un visiteur ou un membre de l'équipe est en
français correct**, accents compris. Cette règle a été apprise à la dure : une
substitution mot à mot a été tentée puis annulée, parce qu'elle avait accentué des
routes (`/données`), un `slug`, une valeur d'énumération Prisma et un rôle ARIA.
Et parce qu'un dictionnaire ne sait pas écrire : « a vélo » veut « à », « tache »
n'est pas « tâche ». On corrige phrase par phrase, ou pas du tout.

Corollaire : **un `code`, un `slug` et un `href` restent en ASCII.** Ce sont des
adresses et des identifiants, pas de la prose. Un code de modalité accentué
invaliderait les réponses déjà enregistrées et les permaliens déjà partagés.

**Commits.** Conventional Commits, en anglais, à l'impératif.
`feat(survey): add stacked bar chart`. Un changement = un commit. Un fichier
découpé = un commit dédié, sans reformulation du corps déplacé.
**Aucune ligne de co-auteur n'est ajoutée aux commits.**

**Serveur / client.** Tout ce qui touche la base, les sessions ou les permissions
vit sous `src/lib/server/`. SvelteKit refuse de l'importer côté client, et c'est
exactement la garantie qu'on veut.

---

## 6. Ce qu'on ne fait pas

- **Pas de pondération ni de redressement.** Même « pour corriger l'échantillon ».
  C'est le reproche central adressé aux autres. Si une pondération devient un jour
  nécessaire, elle sera un champ explicite, affiché, versionné, jamais un défaut.
- **Pas de dépendance à un service tiers pour l'identité.** L'authentification est
  maison (Argon2id + sessions en base). « Aucun milliardaire ne nous dit quoi faire »
  vaut aussi pour l'annuaire des comptes.
- **Pas d'inscription publique.** Les comptes sont créés par invitation depuis le
  back-office. Les données sont consultables sans compte : c'est le sens de l'open
  data.
- **Pas de tracker, pas d'analytics tiers, pas de cookie non essentiel.** Le cookie
  de session est le seul cookie du site public.
- **Pas d'image sous droits.** Les documents sources contiennent une photo de
  couverture de livre (Bourdieu) : elle ne part pas en production.
