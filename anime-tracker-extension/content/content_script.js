//- Script de contenu pour l'enregistrement et l'affichage des épisodes.

const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;

console.error("LOGSSCRIPT: Content Script Démarrage PROMINENT.");
console.log("[Content Script] Démarrage du script de contenu.");

// Fonction pour récupérer le titre de l'anime
function getAnimeTitle() {
    const titleElement = document.getElementById('titreOeuvre');
    if (titleElement) {
        console.log("[Content Script] #titreOeuvre trouvé:", titleElement.innerText.trim());
        return titleElement.innerText.trim();
    }
    console.log("[Content Script] #titreOeuvre NON trouvé.");
    return null;
}

// Fonction pour récupérer l'épisode actuellement affiché sur la page
function getCurrentEpisode() {
    const episodeElement = document.getElementById('savedEpisodeId');
    if (episodeElement) {
        console.log("[Content Script] #savedEpisodeId trouvé:", episodeElement.innerText.trim());
        return episodeElement.innerText.trim();
    }
    console.log("[Content Script] #savedEpisodeId NON trouvé.");
    return null;
}

// Fonction pour sauvegarder la progression de l'épisode
async function saveEpisodeProgress(animeTitle, episode) {
    if (!animeTitle || !episode) {
        console.log("[Content Script] Pas de titre ou d'épisode pour la sauvegarde, annulation.");
        return;
    }

    try {
        const result = await storage.local.get({ animeProgress: {} });
        const animeProgress = result.animeProgress;
        animeProgress[animeTitle] = episode;
        await storage.local.set({ animeProgress: animeProgress });
        console.log(`[Content Script] Progression sauvegardée: ${animeTitle} - ${episode}`);
    } catch (error) {
        console.error('[Content Script] Erreur lors de la sauvegarde de la progression:', error);
    }
}

// Fonction pour afficher le dernier épisode sauvegardé à côté du titre
async function displaySavedEpisode(animeTitle) {
    if (!animeTitle) {
        console.log("[Content Script] Pas de titre d'anime pour l'affichage, annulation.");
        return;
    }

    try {
        const result = await storage.local.get({ animeProgress: {} });
        const animeProgress = result.animeProgress;
        const savedEpisode = animeProgress[animeTitle];

        if (savedEpisode) {
            console.log(`[Content Script] Épisode sauvegardé trouvé pour ${animeTitle}: ${savedEpisode}`);
            const titleElement = document.getElementById('titreOeuvre');
            if (titleElement && !titleElement.querySelector('.anime-tracker-saved-episode')) {
                const span = document.createElement('span');
                span.classList.add('anime-tracker-saved-episode');
                span.textContent = `(Dernier : ${savedEpisode})`;
                titleElement.appendChild(span);
                console.log(`[Content Script] Affichage de l'épisode sauvegardé: ${savedEpisode}`);
            } else {
                console.log("[Content Script] #titreOeuvre non trouvé ou épisode déjà affiché.");
            }
        } else {
            console.log(`[Content Script] Pas d'épisode sauvegardé trouvé pour ${animeTitle}.`);
        }
    } catch (error) {
        console.error("[Content Script] Erreur lors de l'affichage de l'épisode sauvegardé:", error);
    }
}

// Fonction pour injecter le bouton "Sauvegarder et Rafraîchir"
function injectSaveRefreshButton() {
    console.log("[Content Script] Tentative d'injection du bouton Sauvegarder et Rafraîchir.");
    const titleElement = document.getElementById('titreOeuvre'); // On se base uniquement sur #titreOeuvre

    if (titleElement && !document.getElementById('anime-tracker-refresh-btn')) {
        const button = document.createElement('button');
        button.id = 'anime-tracker-refresh-btn';
        button.classList.add('anime-tracker-save-refresh-btn');
        button.textContent = 'Refresh pour sauvegarder dernier episode';
        button.title = 'Cliquez ici pour sauvegarder le dernier épisode sélectionné et rafraîchir la page.';

        const targetElement = document.getElementById('printLastEpisode'); // Target the <a> tag containing #savedEpisodeId
        const buttonWrapper = document.createElement('div'); // Create wrapper regardless of targetElement
        buttonWrapper.style.marginTop = '10px';
        buttonWrapper.style.marginBottom = '20px';
        buttonWrapper.style.textAlign = 'center';
        buttonWrapper.appendChild(button);

        if (targetElement) {
            targetElement.parentNode.insertBefore(buttonWrapper, targetElement.nextSibling);
            console.log('[Content Script] Bouton "Refresh pour sauvegarder dernier episode" injecté après #printLastEpisode.');
        } else { // Fallback if #printLastEpisode is not found, inject after #titreOeuvre
            titleElement.parentNode.insertBefore(buttonWrapper, titleElement.nextSibling);
            console.log('[Content Script] Bouton "Refresh pour sauvegarder dernier episode" injecté après #titreOeuvre (fallback).');
        }
        
        button.addEventListener('click', (e) => { // Add 'e' parameter
            e.stopPropagation(); // Prevent event from bubbling up to parent elements
            console.log('[Content Script] Clic sur "Sauvegarder et Rafraîchir", rechargement de la page...');
            location.reload();
        });

    } else {
        console.log("[Content Script] #titreOeuvre non trouvé ou bouton déjà présent, injection annulée.");
    }
}

// Exécution principale de la logique après que les éléments nécessaires soient chargés
async function mainContentScriptLogic() {
    console.log("[Content Script] Exécution de la logique principale.");
    const animeTitle = getAnimeTitle();
    const currentEpisode = getCurrentEpisode();

    if (animeTitle && currentEpisode) {
        console.log("[Content Script] Titre et épisode trouvés. Sauvegarde et affichage.");
        await saveEpisodeProgress(animeTitle, currentEpisode);
        await displaySavedEpisode(animeTitle);
    } else if (animeTitle) {
        console.log("[Content Script] Titre trouvé, mais pas d'épisode. Affichage de la progression sauvegardée.");
        await displaySavedEpisode(animeTitle);
    } else {
        console.log("[Content Script] Ni titre ni épisode trouvés. Pas de suivi d'épisode sur cette page.");
    }

    // Toujours essayer d'injecter le bouton si un titre est trouvé
    if (animeTitle) {
      injectSaveRefreshButton();
    } else {
        console.log("[Content Script] Pas de titre d'anime détecté, bouton non injecté.");
    }
    console.log("[Content Script] Fin de l'exécution principale.");
}


// MutationObserver pour détecter quand les éléments sont ajoutés au DOM
const observer = new MutationObserver((mutations, obs) => {
    console.log("[Content Script] MutationObserver callback triggered.");
    const titleElement = document.getElementById('titreOeuvre');
    const episodeElement = document.getElementById('savedEpisodeId');

    // On attend seulement les éléments essentiels pour le titre et l'épisode
    if (titleElement && episodeElement) {
        console.log("[Content Script] Éléments #titreOeuvre et #savedEpisodeId détectés par MutationObserver. Exécution de la logique principale.");
        obs.disconnect(); // Arrêter d'observer une fois les éléments trouvés
        mainContentScriptLogic();
    } else {
        console.log("[Content Script] Attente de #titreOeuvre et #savedEpisodeId via MutationObserver...");
    }
});

// Commencer à observer le body pour les changements
observer.observe(document.body, {
    childList: true, // Observer l'ajout/suppression d'enfants directs
    subtree: true     // Observer les changements dans toute la sous-arborescence du body
});

// Fallback: si l'observateur n'a pas déclenché et que le DOM est déjà chargé
// (peut arriver si les éléments sont très rapides à charger ou déjà là)
document.addEventListener('DOMContentLoaded', () => {
    console.log("[Content Script] DOMContentLoaded fallback triggered.");
    const titleElement = document.getElementById('titreOeuvre');
    const episodeElement = document.getElementById('savedEpisodeId');
    if (titleElement && episodeElement) {
        console.log("[Content Script] DOMContentLoaded: #titreOeuvre et #savedEpisodeId déjà présents ou chargés rapidement. Exécution.");
        if (observer) observer.disconnect(); // S'assurer que l'observateur est déconnecté
        mainContentScriptLogic();
    } else {
        console.log("[Content Script] DOMContentLoaded: #titreOeuvre ou #savedEpisodeId non présents, l'observateur devrait continuer.");
    }
});
