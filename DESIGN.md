# DESIGN.md — Humanitour

Direction artistique du site. Extraite des documents de communication de
l'association (`docs/sources/`, charte typo/couleurs) et déjà en grande partie
codée dans [`src/app.css`](./src/app.css). Ce fichier consolide la décision en un
seul endroit pour que tout travail d'interface (agent ou humain) parte de la
même référence, au lieu de la redéduire du CSS à chaque fois.

## Identité

**Néo-brutalisme éditorial chaleureux.** Fond crème (jamais blanc pur en fond de
page), aplats noirs francs, ombres portées nettes sans flou (`--shadow-brut`,
5px/5px, zéro blur), titrages massifs en capitales. Le noir n'est pas une
teinte parmi d'autres : c'est lui qui porte le trait, la bordure, le texte.

Référence la plus proche : les affiches et zines militants imprimés en
sérigraphie — pas un SaaS, pas un site gouvernemental. L'institut existe *contre*
l'opacité des instituts de sondage classiques ; l'interface doit avoir la même
franchise directe que le propos (cf. README : Bourdieu, 1972).

**Pourquoi pas civic/gov ni Stripe/Vercel tel quel :** ces deux pistes ont été
envisagées en amont, mais le code existant et la charte de marque (dégradé
corail/rose/orange, logo mains-autour-du-globe, typo blocky) vont dans une
direction plus affirmée et plus chaude. On en garde une chose de chacune : la
clarté structurelle du gov (jamais d'ornement qui nuit à la lecture d'une
donnée) et la discipline d'exécution de Stripe/Vercel (grille propre, un seul
système de composants, pas de décoration gratuite) — appliquées au vocabulaire
visuel brutaliste réel du projet, pas à sa place.

## Personnalité

Directe et sans détour, jamais agressive gratuitement : l'institut assume sa
critique de l'opacité des sondages, mais la porte par la méthode et les
chiffres, pas par le ton. Vouvoiement sur tout ce qui touche aux données et au
légal ; tutoiement sur les appels à l'action (« Explore les données »,
« Soutiens le tour »). Voir CLAUDE.md, décision #21.

## Palette

Définie dans `src/app.css` (`@theme`) et documentée dans `CLAUDE.md` §
« L'identité visuelle ». Trois couleurs de marque + neutres + dégradé :

| Rôle | Token | Valeur |
| --- | --- | --- |
| Accent principal | `--color-coral-500` | `#FF5757` |
| Accent transition | `--color-pink-400` | `#FF88B7` |
| Accent fin de dégradé | `--color-orange-500` | `#FF751F` |
| Encre (texte, traits, ombres) | `--color-ink` | `#000000` |
| Fond de page | `--color-cream` | `#FFF1EB` |
| Fond des cartes | `--color-paper` | `#FFFFFF` |

Le dégradé de marque (`--gradient-line`, rose → corail → orange) est **un
accent délibéré**, pas un fond par défaut : il sert le texte des gros titres
(`text-gradient`) et le fond mesh de la hero (`surface-mesh`), jamais
généralisé à toute la page ni empilé avec glow/glassmorphism. Vert et rouge
d'état (`--color-success` / `--color-danger`) ne codent jamais une opinion
politique — ils restent réservés aux statuts d'interface (import réussi,
erreur de formulaire).

## Typographie

Les documents d'origine utilisent trois polices Canva non redistribuables ;
les équivalents libres et auto-hébergés (raison RGPD : pas de CDN tiers, voir
`app.css`) sont :

| Rôle | Police d'origine | Substitut libre | Usage |
| --- | --- | --- | --- |
| Titrage (blocky) | SLTF Curo | Syne Variable, 800/900 | `h1`–`h3`, logo, gros chiffres |
| Corps de texte | Crusoe Text | Plus Jakarta Sans Variable | paragraphes, UI |
| Accent manuscrit | Budger Script | Caveat Variable | citations, légendes — jamais en corps de texte |
| Données | — | JetBrains Mono Variable | tableaux de chiffres, exports, `%`, `n=` |

## Mouvement

Fonctionnel, jamais décoratif : `brut-press` (bouton qui s'enfonce au clic/hover,
translate + réduction d'ombre), `scroll-behavior: smooth`, transitions de
couleur sur la nav. `prefers-reduced-motion` est déjà respecté globalement
dans `app.css` — toute nouvelle animation doit passer par les mêmes règles, pas
en ajouter une exception.

## Cadrans (dials)

`Dial: ENERGY 3 / RHYTHM 2 / MOTION 1`

- **ENERGY 3** — le brutalisme éditorial est une prise de position visuelle
  assumée (aplats noirs, ombres nettes, titrage massif, dégradé en remplissage
  de texte) : ce n'est pas un site calme.
- **RHYTHM 2** — un système cohérent (cartes `brut`, grille sur `max-w-6xl`)
  avec des ruptures volontaires : la hero en `surface-mesh` tranche
  nettement des sections de contenu en cartes crème/blanches.
- **MOTION 1** — mouvement utilitaire uniquement (press, hover, transitions de
  couleur, scroll fluide) ; pas de scroll-reveal, pas de parallax, pas de
  choreographie. Cohérent avec le respect strict de `prefers-reduced-motion`.

## Ce que ce fichier ne couvre pas

Le detail des décisions produit (stack, auth, permissions, ce qui reste à
construire) est dans `CLAUDE.md`. Les invariants de données (non-réponses,
k-anonymat, pas de redressement) sont dans `AGENTS.md`. Ce fichier ne concerne
que la direction visuelle.
