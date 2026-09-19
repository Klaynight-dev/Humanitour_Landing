# CLAUDE.md

Description du projet **Humanitour** et de sa stack.
Les règles de modification du code sont dans [`AGENTS.md`](./AGENTS.md).

---

## Le projet

**Humanitour** est un institut de sondage citoyen : une association loi 1901 qui a
parcouru **4 000 km à vélo en deux mois**, à travers les treize régions
métropolitaines, pour rencontrer **1 000 personnes** en face-à-face en vue de la
présidentielle 2027. Quatre questions, posées dans cet ordre :

1. Quel sujet vous tient le plus à cœur ?
2. Au premier tour, pour qui voterez-vous ?
3. Au second tour, contre qui voterez-vous ?
4. Pour vous informer, quels médias consultez-vous ?

Ces valeurs viennent de la plaquette de l'association et vivent dans les
constantes `TOUR` et `QUESTIONS` de `src/lib/shared/site.ts`. **L'enquête a eu
lieu : le site public s'écrit au passé.**

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

**Mandat.** Côme Moudenner, référent des sondages, a missionné Elouan Passereau
pour ce site. **Les quatre membres de l'équipe ont donné leur accord pour
l'usage de leur image**, portraits et photographies de terrain comprises : ni le
portrait ni la photo de couverture n'ont à être revalidés au cas par cas. La
règle « pas d'image sous droits » (`AGENTS.md` § 6) reste entière et vise les
images de tiers, pas celles de l'association.

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
| Graphiques | **Apache ECharts 6** (rendu SVG, côté serveur puis repris côté client) | Le même moteur que `forms.humanitour.fr` : une seule bibliothèque à maîtriser pour les deux applications. Rendu en SVG et non en canvas, parce que cette page est publique : les libellés et les chiffres doivent être du texte, indexable et lisible par un lecteur d'écran, présents avant tout JavaScript |
| Tests | **Vitest** + couverture | Runner natif de l'écosystème Vite |
| Lint | ESLint 9 (flat config) + `eslint-plugin-svelte` | |
| Exécution | Bun | |
| Déploiement | `adapter-node` + Docker Compose sur VPS | Cohérent avec l'hébergement Contabo déjà déclaré |
| Base en développement | **PostgreSQL**, via `docker-compose` | Le même moteur qu'en production. Une base de développement qui diffère du moteur réel laisse passer ce qui casse ensuite : types, transactions, contraintes |

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
| 8 | Sections vitrine | Le constat (Bourdieu), le tour et son parcours, méthodologie et transparence, **l'équipe et l'association** (`/a-propos`), soutien HelloAsso et newsletter |

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
| 24 | Photographie | La page d'accueil s'ouvre sur une **photographie de terrain**, pas sur un tableau. Uniquement des images de l'association : ni banque d'images, ni image générée |
| 25 | Mouvement | Cadran passé de `MOTION 1` à **`MOTION 2`** le 18 septembre 2026 (apparition au défilement autorisée sur deux blocs nommés, boucles et parallaxe toujours interdites) |
| 26 | Résilience | La lecture de session **échoue en visiteur anonyme** si la base est injoignable (`src/hooks.server.ts`). Sans cela, une base en panne renvoyait 500 sur tout le site public, y compris les pages qui n'affichent aucune donnée. Échouer ainsi n'accorde aucun droit, il en retire |

### Ce qui reste à construire

| Sujet | État |
| --- | --- |
| Pages légales `/legal/*` | **Manquantes** : le pied de page pointe vers cinq pages qui n'existent pas (décision 13) |
| Carte choroplèthe | Bloquée : il faut une géométrie des régions sous licence compatible (ODbL ou Etalab) |
| Courbe d'évolution temporelle | À construire ; la donnée existe déjà (`Response.collectedAt`) |
| Tracé du parcours | `TourMap` est un schéma assumé : l'itinéraire ville par ville n'est pas publié |
| Jeu de démonstration | `prisma/seed.ts` porte encore trois questions, pas les quatre de la plaquette |
| Pondération | La plaquette annonce « pondérer les résultats », `AGENTS.md` § 6 l'interdit. À trancher |
| Portrait de Mareva Vaucher | Extrait de la plaquette en 210 px : nettement plus doux que les trois autres, à remplacer par un original |
| Photographies de terrain | `static/photos/` ne contient que deux images, extraites de la plaquette et plafonnant à 480×640. **À remplacer par les originaux** (le compte Instagram `humanitour.france` en héberge d'autres, mais il est derrière un mur de connexion et rien ne peut en être récupéré automatiquement) |
| URL de la campagne HelloAsso | `TODO` explicite dans `src/lib/shared/site.ts` |
| Contact | Le code utilise `contact@humanitour.fr`, la plaquette `humanitour.france@gmail.com` |
| Externalisation des chaînes | `src/lib/i18n/` est annoncé en § 5 d'`AGENTS.md` mais n'existe pas |

---

## L'identité visuelle

Extraite des documents de communication de l'association (`docs/sources/`).

| Token | Valeur | Usage |
| --- | --- | --- |
| `--color-coral` | `#FF5757` | Couleur principale, cœur du dégradé |
| `--color-pink` | `#FF88B7` | Transition |
| `--color-orange` | `#FF751F` | Fin du dégradé |
| `--color-ink` | `#000000` | Texte **et surface pleine** |
| `--color-cream` | `#FFF1EB` | Fond du registre « argument » |
| `--color-paper` | `#FFFFFF` | Fond du registre « chiffres » |

Le fond signature est un **dégradé mesh** blanc → corail → rose → orange. Sur ce
dégradé, le texte est **noir, jamais blanc** : blanc sur orange ne donne que
2,69:1, sous le minimum WCAG AA.

**Typographies.** Les documents utilisent SLTF Curo (titrage très gras et rond),
Crusoe Text (sans géométrique légère, famille Futura) et Budger Script en accent
manuscrit, des polices Canva non redistribuables. Les substituts libres retenus
sont Bowlby One, Jost et Caveat, documentés dans `src/app.css` avec pour chaque
rôle la fonte d'origine qu'elle remplace.

**La direction artistique complète est dans [`DESIGN.md`](./DESIGN.md)**, y
compris la raison pour laquelle le « néo-brutalisme » décrit dans les versions
antérieures a été retiré : il ne figurait pas dans la charte.

---

## Les commandes

| Commande | Effet |
| --- | --- |
| `bun install` | Installe les dépendances |
| `bun run services:up` | PostgreSQL de développement (docker-compose, port 5432) |
| `bun run setup` | Base, migrations et jeu de démonstration |
| `bun run dev` | Serveur de développement, contre une base déjà démarrée |
| `bun run db:migrate:deploy` | Applique les migrations existantes, sans en générer |
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

