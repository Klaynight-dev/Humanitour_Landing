# CLAUDE.md

Description du projet **Humanitour** et de sa stack.
Les règles de modification du code sont dans [`AGENTS.md`](./AGENTS.md).

---

## Le projet

**Humanitour** est un institut de sondage citoyen : une association loi 1901 qui
parcourt **5 000 km à vélo en deux mois**, à travers toutes les régions
métropolitaines, pour recueillir en face-à-face un échantillon de la population sur
la présidentielle. Trois questions simples :

1. Quelle est votre priorité pour la France ?
2. Au premier tour, pour qui allez-vous voter ?
3. Au second tour, pour qui ne voterez-vous **jamais** ?

La promesse tient en trois mots : **sur le terrain, humain, citoyen**. Et en une
différence : les données brutes sont publiées, la méthodologie est publique, les
non-réponses sont comptées, aucun commanditaire privé n'achète de question.

Ce dépôt est **la plateforme complète** : la vitrine, l'explorateur de données, la
médiathèque et le back-office.

### L'association

| | |
| --- | --- |
| Raison sociale | HUMANITOUR |
| Forme | Association déclarée, loi du 1er juillet 1901 |
| RNA | W224012149 |
| Siège | 9 lieu-dit Kersaint, 22120 Hillion, France |
| Déclaration | Préfecture des Côtes-d'Armor, 23 août 2026 (récépissé du 7 septembre 2026) |
| Directeur de publication | Elouan Passereau |
| Contact | contact@humanitour.fr |
| Hébergeur | Contabo GmbH — datacenter de Nuremberg, Allemagne (UE) |
| Code déontologique | ICC/ESOMAR — Commission des sondages |

### L'écosystème existant

| Domaine | Rôle | Remarque |
| --- | --- | --- |
| `humanitour.fr` | La plateforme — **ce dépôt** | |
| `forms.humanitour.fr` | Collecte des réponses | SvelteKit également ; code ouvert : `Klaynight/Openforms` (MIT) |
| HelloAsso | Dons et adhésions | Lien sortant |

---

## La stack

| Couche | Choix | Pourquoi |
| --- | --- | --- |
| Framework | **SvelteKit 2** + Svelte 5 (runes) | SSR natif : les articles et les pages de résultats doivent être indexables. Même langage que `forms.humanitour.fr` et que le dashboard Kotbo |
| Build | Vite | |
| Styles | **Tailwind 4** + tokens CSS | Le thème vit dans des variables CSS, donc reskinnable en une passe |
| Base | **PostgreSQL** + Prisma | Schéma découpé par domaine sous `prisma/schema/` |
| Auth | Maison : Argon2id + sessions en base | Aucune dépendance d'identité à un tiers |
| Graphiques | Chart.js + SVG maison pour la carte | Chart.js est déjà maîtrisé en interne |
| Tests | **Vitest** + couverture | Runner natif de l'écosystème Vite |
| Lint | ESLint 9 (flat config) + `eslint-plugin-svelte` | |
| Exécution | Bun | |
| Déploiement | `adapter-node` + Docker Compose sur VPS | Cohérent avec l'hébergement Contabo déjà déclaré |
| Base en développement | **PGlite** servi par `pglite-server` | Un PostgreSQL compilé en WebAssembly, parlant le vrai protocole réseau. Zéro installation, mêmes types que la production — tableaux, énumérations et tout le reste |

---

## L'architecture

```
prisma/schema/          Schéma Prisma, un fichier par domaine
src/
  lib/
    shared/             Code isomorphe (client + serveur)
      questions/        REGISTRE des types de question
      media/            REGISTRE des types de média
      permissions.ts    REGISTRE des permissions atomiques
    server/             Jamais importable côté client (garanti par SvelteKit)
      auth/             Mots de passe, sessions
      rbac/             Résolution des permissions, gardes
      survey/           Agrégation, k-anonymat, croisements
      import/           REGISTRE des formats d'import
      storage/          REGISTRE des backends de fichiers
    charts/             REGISTRE des visualisations
    components/         UI réutilisable
  routes/
    (public)/           Vitrine, données, médias, légal
    admin/              Back-office
    api/public/         API ouverte — contrat stable, voir AGENTS.md §1.4
```

**Le principe, en une phrase :** les six dossiers marqués REGISTRE s'étendent en
ajoutant un fichier, jamais en modifiant un `switch`.

---

## Le modèle de données

Un sondage n'est **pas** un type TypeScript. C'est une ligne en base qui porte un
schéma de questions.

```
Survey ──< Question ──< QuestionOption
   │
   └────< Response ──< Answer ──> QuestionOption (ou valeur typée)
```

Conséquences :

- Créer une enquête ne produit **aucun diff**. Tout se fait au back-office.
- L'explorateur peut croiser n'importe quelle question avec n'importe quelle autre,
  y compris sur un sondage qui n'existait pas à la dernière mise en production.
- Les variables socio-démographiques (géographie, âge, genre, CSP, rapport au vote)
  sont **des questions comme les autres**. Pas de colonnes dédiées, pas de cas
  particulier — voir la règle du « bon goût » dans `AGENTS.md` §1.2.
- `NON_RESPONSE` est une modalité ordinaire, jamais un `null` filtré.

---

## Les décisions actées

Toutes tranchées avec le mainteneur le 14 septembre 2026. Les rouvrir demande une
raison, pas une préférence.

### Produit

| # | Sujet | Décision |
| --- | --- | --- |
| 1 | Périmètre | Plateforme complète : vitrine + données + médias + back-office |
| 2 | Modèle de sondage | 100 % dynamique, schéma défini en base |
| 3 | Sources de données | Les quatre : upload CSV/XLSX, connecteur `forms.humanitour.fr`, saisie manuelle terrain, API d'ingestion |
| 4 | Variables croisables | **Tous les champs disponibles**, sans socle figé |
| 5 | Explorateur | Cartes publiées par le back-office **et** exploration libre avec permalien |
| 6 | Visualisations | Carte choroplèthe, barres / barres empilées / camembert, tableau croisé, évolution temporelle |
| 7 | Médias | Articles rédigés au back-office, vidéos et reportages, podcasts, revue de presse |
| 8 | Sections vitrine | Le constat (Bourdieu), le tour et son parcours, méthodologie et transparence, soutien HelloAsso et newsletter |

### Données et droit

| # | Sujet | Décision |
| --- | --- | --- |
| 9 | Publication | Données brutes publiques, sans compte |
| 10 | Anonymat | Seuil k configurable au back-office, **défaut 5** |
| 11 | Licence du code | **AGPL-3.0** — un réutilisateur qui héberge doit rouvrir son code |
| 12 | Licence des données | **ODbL 1.0** — attribution et partage à l'identique |
| 13 | Pages légales | Récupérées de `forms.humanitour.fr` et réhébergées ici sous `/legal/*` |

### Technique

| # | Sujet | Décision |
| --- | --- | --- |
| 14 | Stack | SvelteKit + Prisma + PostgreSQL |
| 15 | Comptes | Équipe uniquement, créés par invitation. Aucune inscription publique |
| 16 | Authentification | Email + mot de passe, Argon2id, sessions en base, TOTP optionnel pour les admins |
| 17 | Droits | Permissions atomiques regroupées en rôles **éditables au back-office** |
| 18 | Qualité | ESLint + typecheck + Vitest + seuils de couverture, en une porte unique |
| 19 | Hébergement | VPS Docker Compose, `adapter-node` |

### Identité

| # | Sujet | Décision |
| --- | --- | --- |
| 20 | Direction artistique | Le dégradé des documents de communication. **Pas** le violet `#673ab7` de `forms.humanitour.fr`, qui est un Material Deep Purple par défaut |
| 21 | Ton | Vouvoiement sur les données et le légal, tutoiement sur les appels à l'action |
| 22 | Langue | Interface en français, code en anglais, chaînes externalisées |
| 23 | Attribution | Les commits ne portent **aucune ligne de co-auteur** |

### Ce qui reste à construire

| Sujet | État |
| --- | --- |
| Pages légales `/legal/*` | À récupérer depuis `forms.humanitour.fr` (décision 13) |
| Page « Le tour » et carte du parcours | À construire |
| Carte choroplèthe | Bloquée : il faut une géométrie des régions sous licence compatible (ODbL ou Etalab) |
| Courbe d'évolution temporelle | À construire ; la donnée existe déjà (`Response.collectedAt`) |
| Textes du back-office | Encore sans accents, contrairement au site public |
| URL de la campagne HelloAsso | `TODO` explicite dans `src/lib/shared/site.ts` |

---

## L'identité visuelle

Extraite des documents de communication de l'association (`docs/sources/`).

| Token | Valeur | Usage |
| --- | --- | --- |
| `--brand-coral` | `#FF5757` | Couleur principale, cœur du dégradé |
| `--brand-pink` | `#FF88B7` | Transition |
| `--brand-orange` | `#FF751F` | Fin du dégradé, accents |
| `--ink` | `#000000` | Texte |
| `--paper` | `#FFFFFF` | Fond |

Le fond signature est un **dégradé mesh** blanc → corail → rose → orange. Les titres
forts portent ce dégradé en remplissage de texte.

**Typographies.** Les documents utilisent Crusoe Text (serif éditorial), un sans
arrondi et BadgerScript en accent manuscrit — des polices Canva non redistribuables.
Les équivalents web libres retenus sont documentés dans `src/app.css`, avec pour
chaque rôle la fonte d'origine qu'elle remplace.

---

## Les commandes

| Commande | Effet |
| --- | --- |
| `bun install` | Installe les dépendances |
| `bun run dev:local` | **Base embarquée + serveur de développement, en une commande** |
| `bun run db:local` | PostgreSQL embarqué seul (PGlite, port 55432) |
| `bun run dev` | Serveur de développement, contre une base déjà démarrée |
| `bun run build` | Build de production |
| `bun run lint` | ESLint |
| `bun run typecheck` | `svelte-check` |
| `bun run test` | Vitest |
| `bun run test:coverage` | Vitest + seuils |
| `bun run quality:gate` | Lint + typecheck + tests + couverture |
| `bun run db:push` | Applique le schéma en développement |
| `bun run db:migrate` | Crée une migration |
| `bun run db:seed` | Jeu de données de démonstration |
| `bun run setup` | Schéma + seed, en une fois |
| `bun run services:up` | PostgreSQL via Docker Compose (production) |

<!-- antislop:start -->
## antislop

Pour tout travail d'interface, de texte, d'accessibilité ou de layout mobile,
lire `DESIGN.md` (direction artistique du projet) puis invoquer le skill
correspondant via l'outil Skill (paquet `antislop`, déjà installé) :
- Visuel / UI : `antislop:antislop-ui`
- Copywriting : `antislop:antislop-copywriting`
- Accessibilité : `antislop:antislop-human`
- Mobile / responsive : `antislop:antislop-layoutmobile`
- Commentaires de code : `antislop:antislop-code`

Avant de commencer, demander à l'utilisateur si antislop s'applique PENDANT le
travail ou APRÈS (audit).
<!-- antislop:end -->

