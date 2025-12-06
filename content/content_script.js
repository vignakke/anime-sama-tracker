//- Script de contenu pour l'enregistrement et l'affichage des épisodes.

const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;

// Fonction pour récupérer le titre de l'anime
function getAnimeTitle() {
    const titleElement = document.getElementById('titreOeuvre');
    if (titleElement) {
        return titleElement.innerText.trim();
    }
    return null;
}

// Fonction pour récupérer l'épisode actuellement affiché sur la page
function getCurrentEpisode() {
    const episodeElement = document.getElementById('savedEpisodeId');
    if (episodeElement) {
        return episodeElement.innerText.trim();
    }
    return null;
}

// Fonction pour sauvegarder la progression de l'épisode
async function saveEpisodeProgress(animeTitle, episode) {
    if (!animeTitle || !episode) {
        return;
    }

    try {
        const result = await storage.sync.get({ animeProgress: {} });
        const animeProgress = result.animeProgress;
        
        const today = new Date().toLocaleDateString('fr-FR', { year: '2-digit', month: '2-digit', day: '2-digit' });
        const newProgress = {
            episode: episode,
            date: today
        };

        if (JSON.stringify(animeProgress[animeTitle]) === JSON.stringify(newProgress)) {
            return;
        }

        animeProgress[animeTitle] = newProgress;
        
        await Promise.all([
            storage.sync.set({ animeProgress: animeProgress }),
            storage.local.set({ animeProgress: animeProgress })
        ]);
    } catch (error) {
        console.error('[Content Script] Erreur lors de la sauvegarde de la progression:', error);
    }
}

// Fonction pour afficher le dernier épisode sauvegardé à côté du titre
async function displaySavedEpisode(animeTitle) {
    if (!animeTitle) {
        return;
    }

    try {
        const titleElement = document.getElementById('titreOeuvre');
        
        const existingSpan = titleElement ? titleElement.querySelector('.anime-tracker-saved-episode') : null;
        if (existingSpan) {
            existingSpan.remove();
        }

        const result = await storage.local.get({ animeProgress: {} });
        const animeProgress = result.animeProgress;
        const savedProgress = animeProgress[animeTitle];

        if (savedProgress && titleElement) {
            const span = document.createElement('span');
            span.classList.add('anime-tracker-saved-episode');

            if (typeof savedProgress === 'object' && savedProgress.episode && savedProgress.date) {
                span.textContent = ` (${savedProgress.episode} - ${savedProgress.date})`;
            } else {
                span.textContent = ` (Dernier : ${savedProgress})`;
            }

            titleElement.appendChild(span);
        }
    } catch (error) {
        console.error("[Content Script] Erreur lors de l'affichage de l'épisode sauvegardé:", error);
    }
}

// Fonction pour injecter le bouton "Sauvegarder et Rafraîchir"
function injectSaveRefreshButton() {
    const titleElement = document.getElementById('titreOeuvre');

    if (titleElement && !document.getElementById('anime-tracker-refresh-btn')) {
        const button = document.createElement('button');
        button.id = 'anime-tracker-refresh-btn';
        button.classList.add('anime-tracker-save-refresh-btn');
        button.textContent = 'Refresh pour sauvegarder dernier episode';
        button.title = 'Cliquez ici pour sauvegarder le dernier épisode sélectionné et rafraîchir la page.';

        const targetElement = document.getElementById('printLastEpisode');
        const buttonWrapper = document.createElement('div');
        buttonWrapper.style.marginTop = '10px';
        buttonWrapper.style.marginBottom = '20px';
        buttonWrapper.style.textAlign = 'center';
        buttonWrapper.appendChild(button);

        if (targetElement) {
            targetElement.parentNode.insertBefore(buttonWrapper, targetElement.nextSibling);
        } else {
            titleElement.parentNode.insertBefore(buttonWrapper, titleElement.nextSibling);
        }
        
        button.addEventListener('click', (e) => {
            button.disabled = true;
            e.stopPropagation();
            location.reload();
        });
    }
}

// Exécution principale de la logique
async function mainContentScriptLogic() {
    const animeTitle = getAnimeTitle();
    const currentEpisode = getCurrentEpisode();

    if (animeTitle && currentEpisode) {
        await saveEpisodeProgress(animeTitle, currentEpisode);
        await displaySavedEpisode(animeTitle); 
    } else if (animeTitle) {
        await displaySavedEpisode(animeTitle);
    }

    if (animeTitle) {
      injectSaveRefreshButton();
    }
}

// --- Logique d'Initialisation Robuste ---

function initialize() {
    const titleElement = document.getElementById('titreOeuvre');
    const episodeElement = document.getElementById('savedEpisodeId');

    if (titleElement && episodeElement) {
        mainContentScriptLogic();
        return;
    }

    const observer = new MutationObserver((mutations, obs) => {
        const titleElement = document.getElementById('titreOeuvre');
        const episodeElement = document.getElementById('savedEpisodeId');
        
        if (titleElement && episodeElement) {
            obs.disconnect();
            mainContentScriptLogic();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

initialize();


// Écoute les changements dans le stockage pour mettre à jour l'UI en temps réel
storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.animeProgress) {
        const animeTitle = getAnimeTitle();
        if (!animeTitle) return;

        const oldValue = changes.animeProgress.oldValue ? changes.animeProgress.oldValue[animeTitle] : undefined;
        const newValue = changes.animeProgress.newValue ? changes.animeProgress.newValue[animeTitle] : undefined;

        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            displaySavedEpisode(animeTitle);
        }
    }
});