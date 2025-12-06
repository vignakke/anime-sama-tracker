# Anime Sama Tracker Extension

Cette extension de navigateur (compatible Chrome et Firefox) vous aide à gérer les changements de domaine du site Anime-Sama et à suivre votre progression d'épisodes.

## Fonctionnalités

1.  **Gestionnaire de Redirection :** Permet de définir des règles pour rediriger automatiquement l'ancien domaine d'Anime-Sama vers le nouveau, en conservant le chemin de l'URL.
2.  **Suivi des Épisodes :**
    *   Détecte automatiquement le titre de l'anime et le dernier épisode sélectionné sur une page d'Anime-Sama.
    *   Sauvegarde cette information localement.
    *   Affiche l'épisode sauvegardé à côté du titre de l'anime sur la page.
    *   Un bouton "Sauvegarder la progression et Rafraîchir" est injecté sur la page pour faciliter la mise à jour de votre progression.

## Installation

### Pour Google Chrome

1.  Téléchargez le dossier `anime-tracker-extension`.
2.  Ouvrez Chrome et allez sur `chrome://extensions`.
3.  Activez le "Mode développeur" (en haut à droite).
4.  Cliquez sur "Charger l'extension non empaquetée" et sélectionnez le dossier `anime-tracker-extension`.
5.  L'extension devrait apparaître dans votre liste.

### Pour Mozilla Firefox

1.  Téléchargez le dossier `anime-tracker-extension`.
2.  Ouvrez Firefox et allez sur `about:debugging#/runtime/this-firefox`.
3.  Cliquez sur "Charger un module complémentaire temporaire...".
4.  Sélectionnez n'importe quel fichier à l'intérieur du dossier `anime-tracker-extension` (par exemple, `manifest.json`).
5.  L'extension sera chargée temporairement jusqu'à ce que vous fermiez Firefox. Pour une installation permanente, vous devrez la signer et la distribuer via le store de Firefox, ce qui n'est pas couvert par ces instructions.

## Utilisation

### Gestion des Redirections

1.  Cliquez sur l'icône de l'extension dans votre barre d'outils.
2.  Dans le popup, entrez l'ancien domaine (ex: `anime-sama.org`) et le nouveau domaine (ex: `anime-sama.eu`).
3.  Cliquez sur "Ajouter la règle".
4.  Les redirections seront actives immédiatement. Si vous avez des onglets ouverts sur l'ancien domaine, il suffit de les rafraîchir pour qu'ils soient redirigés.

### Suivi des Épisodes

1.  Naviguez sur une page d'épisode sur Anime-Sama (assurez-vous que le domaine correspond à ceux définis dans la section `matches` du `manifest.json`, ou que vous avez ajouté une règle de redirection si le domaine a changé).
2.  L'extension affichera automatiquement "(Dernier : [Nom de l'épisode])" à côté du titre de l'anime (`<h3 id="titreOeuvre">`).
3.  Après avoir changé d'épisode sur la page (par exemple, en cliquant sur un nouveau numéro d'épisode), cliquez sur le bouton "Sauvegarder la progression et Rafraîchir" qui est injecté sur la page. Cela rechargera la page, et l'extension enregistrera le nouvel épisode affiché.

---

**Note :** Le domaine `anime-sama.eu` (et potentiellement `anime-sama.org`) est actuellement configuré dans le `manifest.json`. Si le site change de domaine à nouveau, vous devrez mettre à jour les règles de redirection via le popup de l'extension, et potentiellement le `manifest.json` si le script de contenu ne se charge plus sur le nouveau domaine (dans ce cas, contactez l'agent Gemini pour une mise à jour).
