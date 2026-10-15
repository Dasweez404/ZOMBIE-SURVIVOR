# ZOMBIE SURVIVOR

Jeu de survie **vue du dessus** en HTML5 Canvas, 100 % hors-ligne, sans dépendance.
Ouvrez simplement `index.html` dans un navigateur récent (ou servez le dossier : `npx http-server .`).

**But : survivre le plus longtemps possible.** Un score est calculé à la mort (temps, éliminations, quêtes, assauts repoussés) et le meilleur est conservé.

## Commandes

| Touche | Action |
|---|---|
| ZQSD / WASD / flèches (positions physiques) | Se déplacer |
| Souris · clic gauche · clic droit maintenu | Viser · tirer/frapper · viser (portée/zoom lunette) |
| Maj | Sprinter |
| **E** (maintenir) | Interagir : fouiller, récolter, parler, apprivoiser, dormir, drapeau… |
| R | Recharger |
| 1-5 / molette | Armes |
| H / V / C | Soigner / manger / boire |
| G / F | Choisir / utiliser un gadget (grenade, molotov, mine, fusée, pétard leurre) |
| Tab (I) | Sac, équipement, fabrication, améliorations |
| B | Mode construction (molette = choisir, clic droit = démonter) |
| J / K / M | Quêtes / Compétences / Carte |
| L / P / Échap | Lampe / Sauvegarde / Pause |
| E / X (près d'un véhicule) | Monter, descendre / entretien, carburant, coffre |

## Contenu

- **Monde généré par graine** : la même graine + les mêmes options redonnent exactement le même monde (copiable depuis le menu pause, « graine du jour », « même monde » après la mort). Options : taille (Petit 110 / Moyen 150 / Grand 200 tuiles), terrain (équilibré, forêts denses, aride, archipel), densité de lieux, avec **aperçu en direct** sur l'écran titre.
- **Arsenal étendu** : 46 armes (12 mêlée nouvelles : katana, masse, lance, tronçonneuse, lame à plasma… ; 21 armes à distance nouvelles : revolver, fusil à rafales, mitrailleuse, minigun, antimatériel, arcs, lance-roquettes, lance-grenades, taser, plasma, canon électrique, cracheur d'acide…), 61 pièces d'équipement sur 5 emplacements (tête, torse, mains, pieds, dos) avec effets (discrétion, vision nocturne, résistance au feu et à la pluie, charge, régénération, bonus de mêlée/rechargement/récolte), 17 gadgets (fumigène, assourdissante, fragmentation, toxique, incendiaire, piège à loups, radio leurre, tourelle portable, balise de largage, drone, kits de réparation…), nouveaux soins et buffs (stimulant, adrénaline…), 14 modules (poignée, canon, munitions spéciales…), 4 nouveaux plans et 170+ recettes. Butin, coffres de largage et commerçants mis à jour.
- **Mode 3D low-poly (F3 ou Options)** : même jeu, même vue du dessus, mais rendu en 3D (three.js chargé à la demande depuis `lib/`) : relief du terrain, bâtiments en volume dont le toit s'efface à l'entrée, arbres/rochers/véhicules/personnages low-poly, ombres dynamiques, cycle jour/nuit, lumières de feux et lampes. **Culling** : seuls les chunks de terrain visibles sont générés puis libérés quand ils s'éloignent, les objets ne sont instanciés que dans la zone visible, et ce qui se trouve sous un toit fermé n'est pas dessiné (F4 affiche les compteurs). Lisibilité : pictogramme de fonction sur chaque toit, entrées marquées (auvent rayé, linteau, seuil, paillasson rouge, lanterne), fenêtres éclairées la nuit, étiquettes de lieux, bannières et tenues de faction (Chacals, Légion, Fort, Nomades). Optimisations : objets extérieurs fusionnés par chunk (une seule géométrie, ~0,5 ms CPU par image au repos), construction des chunks répartie sur le temps, résolution adaptative, zoom +/-. Le relief est purement visuel, les collisions restent 2D.
- **Monde aéré** : cartes triplées (390/540/720 cases de côté, plusieurs centaines de lieux), nettement moins d'arbres, rochers, épaves et lieux, bien plus d'espace pour marcher et conduire. **Combat plus ludique** : roulade d'esquive (Espace, esquive parfaite = ralenti + coup renforcé), enchaînement mêlée en 3 coups avec fente et coup final, Q pour l'arme précédente, usure et réparation des armes, séries de kills.
- **Construction « juicy »** : pose avec rebond élastique, onde de choc + poussière + coût flottant, « AMÉLIORÉ ! » en étincelles dorées quand on monte un mur de tier, démontage avec débris, aperçu fantôme animé (sprite réel, coins pulsants, grille discrète, portée de pose), pose en traînant (clic maintenu).
- **4 lieux stylés de plus** : fête foraine (grande roue et carrousel animés, boss Le Clown), ciné drive-in (écran géant, voitures en rangs), centrale électrique (pylônes à arcs électriques, barils radioactifs), château en ruines (remparts, tours, Seigneur déchu, conquérable comme base).
- **22 types de lieux** dont 13 nouveaux : église (pews, autel), école (salles de classe), restaurant, caserne de pompiers (camion garé dedans), laboratoire secret (sol carrelé, cuves), phare (sur la côte), prison (enceinte, miradors, cellules, boss Gardien), camp de caravanes, mine abandonnée (filons à miner, rails), nid infecté (sol organique, œufs, Reine), site de crash d'avion, cimetière, camp des Nomades (marchands neutres avec stock rare). Chacun a son propre butin, ses occupants et ses conseils.
- **Monde généré** : forêts, lacs, routes, ~70 lieux : maisons, cabanes, stations-service, fermes, supermarchés, commissariat, hôpital, entrepôts, bunkers, tour radio, camps de pillards, avant-postes militaires, village allié.
- **Température** : chaleur/froid selon l'heure, le terrain (désert brûlant le jour, glacial la nuit), l'abri d'un bâtiment, les feux de camp et vos vêtements (chaque pièce d'armure donne de la chaleur).
- **Radioactivité** : zones contaminées (barils, jauge, compteur Geiger) qui réduisent vos PV max et tuent à 100 % ; combinaison NRBC, masque à gaz et anti-radiations ; butin rare et mutants à l'intérieur.
- **Météo (rare)** : pluie, orage (foudre) et brouillard : froid, vêtements mouillés, sol glissant, discrétion accrue, collecteurs de pluie plus rapides.
- **Véhicules** : moto, voiture et camion à conduire (ZQSD, Maj = frein à main, E = monter/descendre, X = carburant, réparation et coffre). Ils écrasent les zombies, protègent des balles et des radiations (cabine fermée), consomment du carburant, font du bruit et peuvent exploser. **Fabricables** à l'établi (moto, voiture et camion avec le plan véhicules) et **améliorables** (moteur, blindage, réservoir, pare-buffle, mitrailleuse montée automatique).
- **Tutoriel guidé** interactif (12 étapes, flèches et marqueurs), **conseils contextuels** (ne s'affichent qu'une fois) et menu d'**options** (volumes, secousses, taille de l'interface, qualité…).
- **Graphismes** : terrain lissé avec fusion des biomes, eau avec profondeur, écume et reflets animés, routes avec marquage, ombres du soleil qui tournent au fil de la journée (longues à l'aube et au crépuscule), toits en bardeaux avec cheminées et ombres portées, arbres variés (chêne, pin, bouleau, automne, palmier, arbres morts), rochers, buissons, épaves, caisses, structures, personnages, zombies, milices, animaux et véhicules dessinés avec dégradés, contours et animations, lueurs additives (feu, balles, explosions) et cadavres/douilles/cratères.
- **Interface & feedback** : HUD retravaillé (barres animées, boussole, minimap orientée, viseur avec munitions, indicateurs de dégâts et de menaces hors écran), notifications d'objets, bannières jour/nuit, hit-markers, hit-stop, recul de caméra, cadavres, douilles, étalonnage aube/crépuscule, lucioles, nappe sonore dynamique.
- **Survie** : faim, soif, endurance, saignements, infections, intoxication, jour/nuit (hordes la nuit, lampe torche), poids du sac.
- **Armes** : mêlée (couteau, gourdin, batte, hache, pioche, machette) et armes à feu avec leur propre portée, cadence, dispersion, chargeur, munitions : pistolet, PM, fusil à pompe (gerbe), fusil de chasse (lunette), fusil d'assaut, arbalète (silencieuse), lance-flammes. **Modules** : lunette, point rouge, silencieux, chargeur étendu, laser. Armes et armures **améliorables** (5 niveaux).
- **Armures** (tête / torse / pieds), sacs à dos, **gadgets** (grenade, molotov, mine, fusée éclairante, pétard leurre), soins (bandage, antidouleur, antibiotiques, trousse), cuisine au feu de camp, **plans** à trouver ou acheter pour débloquer des recettes.
- **Nouveaux monstres** : Rampant (ralentit), Sauteur (bondit), Zombie toxique (traînée de gaz), Ardent (insensible au feu, enflamme), Taureau (charge télégraphiée, s'étourdit contre les murs), Nécromancien (relève des rôdeurs), Zombie anti-émeute (bouclier frontal), Rats infectés (en meute), Goule irradiée (irradie autour d'elle), Reine de la ruche (boss : essaims + acide), Araignée mutante (toiles) et Scorpion géant (venin).
- **Ennemis** : rôdeurs, coureurs, colosses, cracheurs (à distance), hurleuses (attirent la horde), gonflés (explosent), zombies soldats, boss *Abomination*. **Milices** : les *Chacals* (pillards) et la *Légion rouge* (militaires) avec chefs.
- **Animaux** : chasse, et **apprivoisement** (loups, sangliers avec de la nourriture ; chiens et ours mutants avec du sérum). Les compagnons combattent et montent en niveau.
- **Alliances & quêtes** : village *Fort Espoir* (Mara, Jonas le marchand, Dr Lin), chaîne de quêtes, contrats répétables, réputation, recrutement de gardes, commerce.
- **Bases** : dégagez un bâtiment, plantez-y votre drapeau, construisez (murs bois/pierre/métal, portes, barricades, pièges, établi, coffre, lit, lampes, cultures, collecteur de pluie, tourelles automatiques), améliorez la base (5 niveaux), postez des gardes et défendez-la contre les **assauts nocturnes**.
- **Événements** : hordes, largages de ravitaillement, embuscades de pillards, boss.
- Compétences, niveaux, sauvegarde automatique (localStorage), mort définitive.
