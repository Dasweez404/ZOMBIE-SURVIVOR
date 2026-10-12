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

## Contenu

- **Monde généré** (graine optionnelle) : forêts, lacs, routes, ~70 lieux : maisons, cabanes, stations-service, fermes, supermarchés, commissariat, hôpital, entrepôts, bunkers, tour radio, camps de pillards, avant-postes militaires, village allié.
- **Survie** : faim, soif, endurance, saignements, infections, intoxication, jour/nuit (hordes la nuit, lampe torche), poids du sac.
- **Armes** : mêlée (couteau, gourdin, batte, hache, pioche, machette) et armes à feu avec leur propre portée, cadence, dispersion, chargeur, munitions : pistolet, PM, fusil à pompe (gerbe), fusil de chasse (lunette), fusil d'assaut, arbalète (silencieuse), lance-flammes. **Modules** : lunette, point rouge, silencieux, chargeur étendu, laser. Armes et armures **améliorables** (5 niveaux).
- **Armures** (tête / torse / pieds), sacs à dos, **gadgets** (grenade, molotov, mine, fusée éclairante, pétard leurre), soins (bandage, antidouleur, antibiotiques, trousse), cuisine au feu de camp, **plans** à trouver ou acheter pour débloquer des recettes.
- **Ennemis** : rôdeurs, coureurs, colosses, cracheurs (à distance), hurleuses (attirent la horde), gonflés (explosent), zombies soldats, boss *Abomination*. **Milices** : les *Chacals* (pillards) et la *Légion rouge* (militaires) avec chefs.
- **Animaux** : chasse, et **apprivoisement** (loups, sangliers avec de la nourriture ; chiens et ours mutants avec du sérum). Les compagnons combattent et montent en niveau.
- **Alliances & quêtes** : village *Fort Espoir* (Mara, Jonas le marchand, Dr Lin), chaîne de quêtes, contrats répétables, réputation, recrutement de gardes, commerce.
- **Bases** : dégagez un bâtiment, plantez-y votre drapeau, construisez (murs bois/pierre/métal, portes, barricades, pièges, établi, coffre, lit, lampes, cultures, collecteur de pluie, tourelles automatiques), améliorez la base (5 niveaux), postez des gardes et défendez-la contre les **assauts nocturnes**.
- **Événements** : hordes, largages de ravitaillement, embuscades de pillards, boss.
- Compétences, niveaux, sauvegarde automatique (localStorage), mort définitive.
