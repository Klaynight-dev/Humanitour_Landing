# DESIGN.md — Humanitour

Direction artistique du site, **extraite de la charte imprimée** (`docs/sources/`
et `source/`, planche typo/couleurs et les trois versions du logo). Ce fichier
consolide la décision en un seul endroit pour que tout travail d'interface
(agent ou humain) parte de la même référence, au lieu de la redéduire du CSS à
chaque fois. Le code correspondant vit dans [`src/app.css`](./src/app.css).

La charte a une autrice : Jeanne Tardivel, référente de la communication de
l'association (plaquette, section « L'équipe »). Ce document la transcrit, il ne
la réinvente pas.

## Correction du 18 septembre 2026

La version précédente de ce fichier décrivait un **« néo-brutalisme éditorial »** :
ombres portées dures de 5 px, bordures noires de 2 px, titrage en capitales
anguleuses. Cette direction n'était pas dans les sources, elle avait été déduite
du code existant. La charte imprimée dit l'inverse :

| Élément | Ce que dit la charte | Ce qui était codé |
| --- | --- | --- |
| Titrage | SLTF Curo : très grasse, **ronde**, contreformes circulaires | Syne, anguleuse et technique |
| Corps | Crusoe Text : sans **géométrique légère**, famille Futura | Plus Jakarta, humaniste, documentée à tort comme « serif » |
| Formes | cercle, angles pleinement arrondis, **aucune ombre** | rayon 0,75 rem et ombre dure partout |
| Noir | **surface primaire** : le logo principal est blanc sur noir | simple couleur de trait |

Le brutalisme a donc été retiré. Rouvrir ce choix demande de rouvrir la charte
avec son autrice, pas une préférence.

## Identité

**Affiche associative chaleureuse.** Formes rondes et pleines, aplats noirs
francs, dégradé corail/rose/orange employé comme la voix de l'association. Le
dessin au trait fin du logo (le globe enlacé) est le motif graphique du site.

Référence la plus proche : l'affiche associative et le fanzine imprimé, pas un
SaaS ni un site gouvernemental. L'institut existe *contre* l'opacité des
instituts classiques ; l'interface doit avoir la même franchise directe que le
propos, mais la chaleur de sa charte.

## Les deux registres

C'est la décision structurante, et elle vient du produit lui-même : le site fait
deux choses opposées, il doit donc parler sur deux tons.

| Registre | Pages | Fond | Énergie |
| --- | --- | --- | --- |
| **L'argument** | accueil, le tour, soutien | crème, aplats noirs, dégradé de marque | forte |
| **Les chiffres** | données, explorateur, méthodologie | blanc pur, aucun dégradé, aucune ombre | sobre |

Un institut qui reproche aux autres d'habiller leurs chiffres ne peut pas
habiller les siens. Aucune surface de marque ne passe jamais derrière un
graphique.

Le back-office est un troisième registre, au cadran le plus bas : même palette,
Jost partout, cartes cernées d'un trait fin (`panel`) parce qu'un écran de
travail aligne des tableaux denses.

## Palette

Les six couleurs de la planche source, sans teinte inventée :

| Rôle | Token | Valeur |
| --- | --- | --- |
| Accent principal | `--color-coral` | `#FF5757` |
| Accent transition | `--color-pink` | `#FF88B7` |
| Accent fin de dégradé | `--color-orange` | `#FF751F` |
| Encre et surface pleine | `--color-ink` | `#000000` |
| Fond de page, registre argument | `--color-cream` | `#FFF1EB` |
| Fond de page, registre chiffres | `--color-paper` | `#FFFFFF` |

Deux teintes dérivées existent, et seulement pour la lisibilité : `--color-coral-ink`
(`#C1201F`, du texte corail sur fond clair, le `#FF5757` de la charte ne donnant
que 2,2:1) et `--color-coral-wash` (`#FFE4E0`, fond d'étiquette).

**La règle de contraste, non négociable :** sur les couleurs de marque, le texte
est **noir, jamais blanc**. Mesures WCAG sur les valeurs exactes de la charte :

| Paire | Ratio | Texte courant |
| --- | --- | --- |
| noir sur corail | 6,75:1 | conforme |
| noir sur orange | 7,82:1 | conforme |
| noir sur rose | 9,46:1 | conforme |
| **blanc sur corail** | **3,11:1** | **échoue** |
| **blanc sur orange** | **2,69:1** | **échoue** |

Le dégradé (`surface-brand`, `surface-mesh`) suit l'ordre de la planche source,
blanc puis corail, rose, orange. C'est un **accent délibéré**, réservé aux
moments où l'association parle en son nom propre : couverture, appel au soutien,
sigle du back-office.

Il se porte de deux façons, et la couverture de l'accueil emploie la seconde :

| Forme | Où | Contrainte |
| --- | --- | --- |
| En fond (`surface-brand`, `surface-mesh`) | appel au soutien, bilan du tour, couverture de `/le-tour` | texte noir, jamais blanc |
| En remplissage de texte (`background-clip: text`) | les chiffres d'affiche de la couverture d'accueil, sur aplat noir | titres et gros chiffres seulement |

La couverture de l'accueil est donc un **aplat noir plein**, et le dégradé y vit
dans les chiffres plutôt que derrière eux. La charte l'autorise : le logo
principal est blanc sur noir, le noir est une surface, et le remplissage de
texte est le traitement des titres des documents imprimés. Sur le noir, les
trois couleurs de marque passent AA en texte courant (corail 6,75:1, rose
9,46:1, orange 7,82:1), ce qui n'est vrai dans aucun autre sens.

Vert et rouge d'état (`--color-success`, `--color-danger`) ne codent jamais une
opinion politique. Ils sont réservés aux statuts d'interface.

## Typographie

Les trois polices d'origine sont des fontes Canva non redistribuables. Les
substituts libres sont auto-hébergés (raison RGPD : aucun CDN tiers).

| Rôle | Police d'origine | Substitut | Usage |
| --- | --- | --- | --- |
| Titrage | SLTF Curo | **Bowlby One** | `h1` et gros chiffres d'affiche, uniquement |
| Corps et sous-titres | Crusoe Text | **Jost Variable** | `h2`, `h3`, paragraphes, toute l'interface |
| Accent manuscrit | Budger Script | **Caveat Variable** | **une seule fois par page**, jamais en corps de texte |
| Données | absent de la charte | JetBrains Mono Variable | colonnes de chiffres publiés, exports, chaînes techniques |

Bowlby One n'a qu'une graisse et pas de bas de casse caractéristique : elle ne
tient que sur les titres courts. Les niveaux inférieurs reviennent à Jost, qui
module sa graisse. Le back-office n'emploie pas Bowlby du tout.

Jost est une géométrique à hauteur d'x basse : le corps est posé à 17 px avec un
interlignage de 1,7, et la mesure de lecture est plafonnée à 62 signes
(utilitaire `measure`).

**Le plancher du `clamp` de `h1` est dicté par le mobile**, pas par le goût :
Bowlby One est très large et ne coupe pas les mots. Toute augmentation de ce
plancher doit être revérifiée à 320 px.

## Formes

Quatre rayons, et l'écart entre eux porte une information :

| Token | Valeur | Usage |
| --- | --- | --- |
| `--radius-field` | 0,625 rem | champs de saisie |
| `--radius-panel` | 1 rem | surfaces du back-office |
| `--radius-block` | 1,75 rem | cartes et blocs du site public |
| `--radius-photo` | 2,25 rem | blocs photographiques |
| `--radius-pill` | 999 px | boutons et étiquettes |

**La courbure est continue, pas circulaire.** Les grands rayons (`block-card`,
`rounded-block`, `photo-block`) portent `corner-shape: squircle` : le rayon entre
et sort progressivement du côté au lieu de s'y raccorder d'un coup. C'est la
forme des vignettes d'iOS, et c'est ce que la charte demande — le logo est un
globe enlacé, ses contreformes sont pleines, et un quart de cercle franc faisait
une cassure visible dès 1,75 rem.

C'est une **amélioration progressive** : `border-radius` fait tout le travail
partout, `corner-shape` ne lisse la jonction que là où il est connu. Un
navigateur qui l'ignore affiche l'angle arrondi habituel, jamais un angle droit.
À rayon égal un squircle se lit plus carré, d'où `--radius-photo` plus grand que
`--radius-block` : sans ça, les photographies perdaient la rondeur de la charte.

**Aucune carte ne porte d'ombre.** Deux élévations existent, et aucune autre :

| Token | Valeur | Usage |
| --- | --- | --- |
| `--shadow-lift` | `0 10px 30px -12px` | les surfaces qui passent réellement au-dessus du contenu : l'en-tête collé, le menu mobile ouvert |
| `--shadow-photo` | `0 26px 60px -28px` | les blocs photographiques posés sur une surface de marque, et rien d'autre |

Ce qui détache un bloc de contenu, c'est le contraste de fond, pas un contour ni
une ombre. `--shadow-photo` est l'exception ajoutée le 18 septembre 2026 : une
photographie rectangulaire posée sur le dégradé mesh se lit comme un trou dans
l'aplat tant qu'elle ne porte pas d'ombre.

### Le verre

**Une seule surface translucide sur le site : l'étiquette du deck de l'accueil**
(`.photo-deck-label`). Elle flotte sur les photographies, donc elle prend ce qui
passe derrière : `backdrop-filter: blur(20px) saturate(180%)`, un voile blanc à
0,72, un liseré clair pour l'épaisseur, et `--shadow-lift` — le token des
surfaces qui passent réellement au-dessus du contenu, pas une troisième
élévation.

Le texte y est **noir**, comme partout sur les surfaces claires. Mesuré au pixel
sur le rendu et dans la bande où les glyphes vivent réellement, pas estimé :
**4,95:1 au pire cas**, 6,72:1 au premier centile, 13,96:1 en médiane. Le
plancher passe donc AA.

**C'est ce plancher qui fixe l'opacité du voile**, pas le goût : à 0,62 il tient,
en dessous il passerait sous AA sur les clichés sombres. Rendre le verre plus
transparent demande donc de remesurer sur le rendu, et les photographies de
`DECK_PHOTOS` sont ce qui décide.

Deux replis, parce qu'un fond translucide n'est pas toujours souhaitable ni
disponible : sans `backdrop-filter`, le blanc monte à 0,94 (la photographie
passerait sinon **nette** sous le texte) ; sous `prefers-reduced-transparency`,
il monte à 0,96 et le flou tombe.

**Les titres ne se coupent pas.** `hyphens: auto` est retiré de `h1` : combinée
à `text-wrap: balance`, la césure automatique offrait au navigateur une coupure
au milieu d'un mot là où le passage à la ligne suivante suffisait, et « Un
collectif engagé » se lisait « Un collec- / tif engagé ». Sur une typo d'affiche,
c'est une faute. `overflow-wrap` reste en dernier recours contre le défilement
horizontal, et le plancher du `clamp` garantit qu'il ne se déclenche jamais.

## Le motif : le mot marqué

Un mot du titre est posé sur une étiquette, légèrement de travers, comme un coup
de surligneur sur une affiche imprimée. C'est ce qui fait qu'on reconnaît une
page Humanitour à sa première ligne.

Il a **deux formes**, et c'est la surface qui décide, pas le goût :

| Utilitaire | Fond | Texte | Sur quelles surfaces | Contraste |
| --- | --- | --- | --- | --- |
| `mark-brand` | `--gradient-brand-dense` | noir | crème, blanc, aplat noir | 6,75:1 au pire |
| `mark-ink` | noir | papier | le dégradé de marque | 21:1 |

Sur le dégradé, `mark-brand` serait un dégradé sur un dégradé : l'étiquette
disparaîtrait. `mark-ink` est la même étiquette retournée, pas un second motif.

| Règle | Valeur |
| --- | --- |
| Portée | titres uniquement, `h1` et `h2` |
| Dose | un mot par titre, **deux titres par page au maximum** |
| Dégradé | `--gradient-brand-dense`, sans le départ blanc de `--gradient-brand` |

Le titre qui la porte desserre son interlignage à 1,06 : à 0,95, le rembourrage
vertical de l'étiquette mord sur la ligne au-dessus.

## Les aplats organiques

Deux formes pleines aux contours irréguliers, en débord de coin. La charte est
faite de formes rondes et pleines, son logo est un globe enlacé, et l'affiche
imprimée travaille par aplats découpés : c'est la même grammaire, à l'échelle de
la page.

Trois règles les tiennent, et ce sont elles qui les séparent de l'orbe floue
générique : elles sont **plates** (aucun dégradé, aucun flou, aucune lueur),
**immobiles**, et **sans teinte hors charte**.

**Leur géométrie est figée dans `app.css`**, pas recopiée page par page : deux
formes, aux deux mêmes coins, aux mêmes tailles. C'est ce qui en fait un motif
reconnu d'une page à l'autre plutôt que deux taches posées au hasard.

| Règle | Valeur |
| --- | --- |
| Dose | **une section par page**, et toujours une section crème |
| Placement | dans les marges, jamais sous un bloc de texte dense |
| Section hôte | doit porter `relative isolate overflow-hidden` |

Une première version les faisait énormes et centrées : la section devenait une
affiche colorée où le propos ne passait plus, et elle a été retirée. **La dose
est la contrainte, pas la forme.**

## Ce que chaque page reçoit

Le langage ne s'applique pas uniformément, et la raison est la séparation des
registres, la décision structurante de ce fichier. Un institut qui reproche aux
autres d'habiller leurs chiffres ne peut pas habiller les siens : **le motif,
les aplats et le mouvement s'arrêtent à la porte des pages de données.**

| Page | Registre | Mot marqué | Aplats | Entrée `enter` | `reveal` |
| --- | --- | --- | --- | --- | --- |
| `/` | argument | `vérité`, `l'urne` | engagements | oui | deck de photos, portraits |
| `/le-tour` | argument | `France` (`mark-ink`) | méthode | oui | schéma du parcours |
| `/a-propos` | argument | `engagé` | couverture | oui | portraits |
| `/medias` | éditorial | `voix` | non | oui | cartes, par rangée |
| `/galerie` | éditorial | `visages` | non | oui | vignettes, par rangée |
| `/donnees` | **chiffres, en-tête colorée** | non | en-tête de fiche | non | non |
| `/methodologie` | **chiffres** | non | non | non | non |
| back-office | outil | non | non | non | non |

Les deux pages de chiffres restent à `ENERGY 1 / MOTION 1`, sans ombre et sans
apparition. Ce n'est pas un oubli : c'est la règle, et la rouvrir revient à
rouvrir la séparation des registres.

**`/galerie` et `/medias` partagent le registre éditorial sans se recouvrir**, et
la frontière est nette : `/medias` liste ce qui se lit, s'écoute et se regarde
(articles, vidéos, podcasts, revue de presse), piloté par le back-office ;
`/galerie` ne montre que les photographies du tour, qui n'ont ni auteur à créditer
ni corps de texte et vivent donc dans un simple tableau. Les fusionner
demanderait une nature « photo » au modèle des médias — ce serait un autre choix,
pas une correction.

**Révision du 19 septembre 2026, à la demande du porteur du projet.** La fiche
d'une enquête (`/donnees/[slug]`) ouvre désormais sur un bandeau au dégradé de
marque, texte noir, portant le titre, les trois repères de l'enquête et le seuil
d'anonymat. La règle qui la précédait interdisait toute couleur sur les pages de
chiffres ; elle est remplacée par une règle plus étroite, et c'est elle qui
compte :

> **Le dégradé se pose là où l'enquête se présente, jamais là où elle se
> mesure.** L'en-tête est coloré, la zone de résultat ne l'est pas : fond blanc,
> aucun aplat derrière un graphique, aucune ombre. Les seules couleurs qui
> entrent dans la zone de résultat sont celles de la palette de données
> (`src/lib/charts/palette.ts`), et chacune désigne une modalité.

Ce qui justifie l'écart : un bandeau qui identifie l'enquête n'habille aucun
chiffre. Un aplat derrière une barre, lui, en change la lecture. Le reproche
adressé aux instituts porte sur le second, pas sur le premier.

Trois garde-fous conservés, non négociables :

1. **Texte noir sur le dégradé, jamais blanc.** Blanc sur `#FF751F` donne 2,69:1.
2. **Aucun chiffre posé directement sur le dégradé.** Les repères de l'en-tête
   sont sur des cartouches blancs : du texte de corps sur un fond qui varie ne
   tient pas le contraste d'un bout à l'autre.
3. **La zone de résultat reste à `MOTION 1`.** Les animations d'apparition
   d'ECharts sont désactivées d'office (`charts/echarts/theme.ts`).
## La signature du pied de page

Le nom, en Bowlby One, occupe toute la largeur du conteneur en sous-fond du pied
de page, à `rgb(255 255 255 / 0.12)` sur l'aplat noir. Il ferme la page comme la
signature d'une affiche.

Le corps est exprimé en `cqw`, pourcentage de la largeur du **conteneur** : en
`vw`, le mot continuerait de grandir une fois le conteneur arrivé à ses 72 rem
et déborderait sur les grands écrans. La valeur (13,2 cqw) est accordée à la
chasse réelle de Bowlby One sur ces dix signes, mesurée dans le navigateur.

Il est `aria-hidden` : le nom est déjà porté par le logo du pied de page et par
le titre du document.

## La couverture tient dans un écran

La couverture d'accueil ne dépasse pas `calc(100svh - var(--header-h))`,
c'est-à-dire un écran, en-tête déduit. Mesuré : l'en-tête fait 68 px à tous les
paliers.

Trois points qui ne sont pas négociables, parce qu'ils viennent chacun d'un
défaut constaté :

1. **`min-height`, jamais `height`.** Sur un écran très court, ou avec un corps
   agrandi par le lecteur, la section grandit au lieu de rogner. Une couverture
   qui dépasse de quelques pixels vaut mieux qu'un titre coupé. En pratique elle
   tient jusqu'à 720 px de haut sur grand écran et 740 px sur téléphone ;
   en dessous, elle défile un peu.
2. **`svh`, jamais `vh`.** Sur mobile, `vh` se cale sur la fenêtre barre d'URL
   rétractée : une couverture en `100vh` déborde donc toujours au chargement.
3. **Le voile de la photographie se mesure en `rem`, pas en pourcentage.** La
   bande photographique est élastique : en pourcentage, la zone sombre suivait
   sa hauteur et l'accent manuscrit se retrouvait à 2,2:1 sur un écran court. En
   longueurs fixes, le pied du cadre garde toujours son aplat quasi opaque.

La bande photographique prend ce que le texte laisse (`flex: 1 1 0`), avec un
plancher de 8 rem. L'image est en `position: absolute` : en flux, sa hauteur
intrinsèque de 1024 px servait de base flexible et la bande occupait 520 px au
lieu de la place restante.

**Attention aux marges automatiques dans un conteneur flex :** `mx-auto` sur un
élément flex annule son étirement. Le bloc de texte s'est retrouvé réduit à son
contenu et recentré, désaligné du logo de l'en-tête. Il porte donc `w-full`.

## Photographie

Le site montre les personnes qui ont fait le tour. C'est la seule matière du
projet qui ne soit ni un chiffre ni un aplat, et elle porte ce que la charte
appelle la chaleur.

| Emploi | Où | Traitement |
| --- | --- | --- |
| Couverture | accueil | plein cadre, colonne de droite sur grand écran, bandeau de tête sur mobile |
| Deck | bilan du tour | trois cartes en `photo-block`, deux visibles au repos, en regard du texte |
| Galerie | `/galerie` | grille de vignettes `photo-block`, cadrage commun `aspect-4/5` |
| Portraits | accueil, `/a-propos` | carré arrondi ou cercle, jamais recadrés serré |

Les photographies sont déclarées **une seule fois**, dans
[`src/lib/shared/photos.ts`](./src/lib/shared/photos.ts) : l'accueil y prend la
couverture et les trois cartes du deck, `/galerie` les prend toutes. Leurs
`width` et `height` sont les dimensions natives des fichiers, relevées sur les
fichiers eux-mêmes ; c'est ce qui réserve leur place avant le chargement.

Trois règles, et elles ne sont pas négociables :

1. **Aucune image sous droits, aucune banque d'images, aucune image générée.**
   Les photographies viennent de l'association. Un institut qui publie ses
   données brutes ne met pas une photo d'illustration achetée sur sa couverture.
2. **Le texte ne passe jamais sur la photo sans voile mesuré.** Sous du texte,
   le voile noir ne descend pas sous 0,93 d'opacité, ce qui ramène même un blanc
   pur à une luminance de 0,06 et garantit plus de 9:1. Quand un écran est trop
   étroit pour porter voile et photo à la fois, c'est la superposition qui
   tombe, pas le contraste : la photo devient alors une bande séparée.
3. **Aucune photo n'est étirée au-delà de sa définition utile.** Les originaux
   de l'association mesurent 1536×2048 (ou l'inverse en paysage) depuis le
   versement de septembre 2026 ; la contrainte des 480×640 qui limitait la
   couverture à une colonne étroite a donc disparu. Le cadrage en colonne, lui,
   est conservé : c'est désormais une décision de composition, pas une limite
   technique. Une seule vignette rogne, celle de `/galerie`, parce qu'une grille
   dont chaque case a sa propre hauteur devient un escalier — et l'original
   entier reste à un clic.

## Mouvement

`MOTION 2`, depuis le 18 septembre 2026. La version précédente posait `MOTION 1`
et interdisait tout déclenchement au défilement. La contrainte a été rouverte à
la demande du porteur du projet : la page d'accueil paraissait figée.

Ce qui reste interdit, et c'est l'essentiel : **aucune boucle, aucune parallaxe,
aucune apparition généralisée.** Une page où chaque section monte en fondu n'a
plus de point focal, et c'est le geste le plus reconnaissable d'une interface
générée.

Ce qui est autorisé, nommément :

| Geste | Où | Déclencheur |
| --- | --- | --- |
| `press` | toute commande | clic ou toucher |
| transitions de couleur | liens, commandes | survol, focus |
| `MeshShader` | couverture de `/le-tour` | montage, fond seulement |
| `enter` | couverture d'accueil | chargement, une fois, échelonné dans l'ordre de lecture |
| `drop-in` | colonne « Dans l'urne » | chargement, une fois, ligne par ligne |
| `reveal` | deck de photographies, portraits de l'équipe, vignettes de `/galerie` | entrée dans la zone de lecture, une fois |
| ouverture du deck | bilan du tour, accueil | survol **et** focus clavier |
| barre de progression | en haut de la fenêtre, **toutes** les pages | pendant une navigation qui dépasse 120 ms |
| en-tête flottant | `Header.svelte`, **toutes** les pages | défilement au-delà de 24 px : la barre se détache, se resserre à 56 rem et prend `--radius-block` |

**Ajout du 20 septembre 2026, à la demande directe du porteur du projet.** L'en-tête
flottant n'est pas une apparition : l'état de base (haut de page) reste la barre
pleine largeur déjà en place, et le changement suit la position de défilement,
pas un chargement ou une entrée dans le viewport. Il est plus proche de la barre
de progression, un mouvement fonctionnel qui répond à « où en est la page ? »,
que d'un `reveal`. `prefers-reduced-motion` retire la transition, l'état final
(flottant ou plein cadre) reste atteint sans elle.

La **barre de progression** (`NavigationProgress`) est un mouvement fonctionnel,
au même titre que `press` : elle répond à « est-ce que mon clic a été pris en
compte ? ». Trois garde-fous la séparent d'un ruban décoratif : elle n'existe
que pendant une navigation, elle n'apparaît pas en dessous de 120 ms (sinon elle
clignoterait sur une page en cache), et `prefers-reduced-motion` supprime la
progression continue sans supprimer la barre, parce que l'information « ça
charge » n'est pas un ornement.

Elle ne promet jamais 100 % avant l'arrivée : elle approche 90 % de façon
asymptotique, et seul le chargement effectif la termine.

`reveal` ($lib/actions/reveal) est limité à ces **deux** moments de la page
d'accueil. Un troisième emploi demande de rouvrir ce fichier.

Trois garde-fous valent pour tous ces gestes : l'état de base du DOM est déjà
l'état final, donc rien ne dépend de l'animation pour être lu ; sans JavaScript
rien n'est masqué ; et `prefers-reduced-motion` les supprime tous.

**La courbe est unique** : `--ease-overshoot`, `cubic-bezier(0.34, 1.42, 0.64, 1)`.
Elle dépasse légèrement avant de se poser, parce que la charte est ronde et
pleine et que ses mouvements doivent l'être aussi. Une courbe sans rebond
donnait une couverture qui s'affichait au lieu d'arriver. Seule l'opacité garde
une courbe sans dépassement : une valeur au-dessus de 1 est écrêtée par le
navigateur et le fondu se figerait avant la fin du déplacement.

### Références

Le porteur du projet a désigné ces sites comme repères le 18 septembre 2026 :
[vincelinise.com](https://vincelinise.com) (et son
[code source](https://github.com/ecnivtwelve/vincelinise.com)),
`old.tomthings.fr`, `beta.tomthings.fr`, [labs.google](https://labs.google),
[discord.com](https://discord.com) et [papillon.bzh](https://papillon.bzh).

Ce qui en a été repris, et pourquoi ça tient dans la charte :

| Repris | D'où | Pourquoi c'est compatible |
| --- | --- | --- |
| Le mot surligné dans le titre | `vl-highlight` de vincelinise.com | La charte a déjà le dégradé, la pilule et la règle du texte noir : le motif est traduit, pas copié |
| Le mouvement à dépassement, échelonné | les animations à ressort de vincelinise.com | Traduit la rondeur de la charte, là où un `ease-out` strict la contredisait |
| Les aplats organiques en débord | labs.google | Formes rondes et pleines, aplats découpés : c'est déjà le vocabulaire de l'affiche imprimée |
| Le nom en très grand en sous-fond du pied de page | discord.com | Signature d'affiche, et Bowlby One est dessinée pour ce corps-là |

Ce qui a été **écarté**, et pourquoi :

- **La page-carte** (tout le contenu dans un bloc arrondi flottant sur un fond
  dégradé), signature structurante de vincelinise.com. Elle enfermerait les
  sections dans un conteneur unique, alors que `RHYTHM 3` repose justement sur
  l'alternance des aplats pleine largeur. L'adopter reviendrait à remplacer la
  direction, pas à s'en inspirer.
- **La couverture centrée de papillon.bzh**, qui contredirait la couverture
  photographique asymétrique adoptée le même jour. Le reste de sa direction
  (fond monochrome profond, gros titre en deux lignes, paire de boutons pilule
  plein et contour) était **déjà en place** ici : il n'y avait rien à
  transposer. Le seul écart restant est l'icône en tête de bouton, qui
  demanderait un jeu d'icônes que la charte ne contient pas.

## Ton

Directe et sans détour, jamais agressive gratuitement : l'institut assume sa
critique de l'opacité, mais la porte par la méthode et les chiffres. Vouvoiement
sur les données, la méthodologie et le légal ; tutoiement sur les appels à
l'action. Voir `CLAUDE.md`, décision #21.

Le tour a eu lieu : **le site s'écrit au passé**, et les chiffres publiés sont
ceux de la plaquette, centralisés dans `TOUR` et `QUESTIONS`
(`src/lib/shared/site.ts`). Aucun chiffre ne s'affiche sans source.

## Cadrans

`Dial: ENERGY 3 (argument) / 1 (chiffres et back-office) — RHYTHM 3 — MOTION 2`

- **ENERGY**, deux valeurs assumées : c'est la séparation des registres
  ci-dessus, et c'est elle qui porte toute la direction.
- **RHYTHM 3** — les compositions varient délibérément d'une section à l'autre :
  couverture photographique, bande noire pleine, colonne asymétrique, tableau,
  liste de définitions, grille de portraits. Aucune section ne répète le gabarit
  « titre centré plus grille de cartes identiques ».
- **MOTION 2** — voir ci-dessus. Le cadran est passé de 1 à 2 le 18 septembre
  2026 ; le registre « chiffres » et le back-office restent, eux, à `MOTION 1`.

## Ce que ce fichier ne couvre pas

Le détail des décisions produit (stack, auth, permissions, ce qui reste à
construire) est dans `CLAUDE.md`. Les invariants de données (non-réponses,
k-anonymat, pas de redressement) sont dans `AGENTS.md`. Ce fichier ne concerne
que la direction visuelle.
