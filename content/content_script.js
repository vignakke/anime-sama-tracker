//- Script de contenu pour l'enregistrement et l'affichage des épisodes.

// Guard: Évite les injections multiples
if (window.__animeTrackerInjected) {
    // Script déjà injecté, on s'arrête
} else {
    window.__animeTrackerInjected = true;

    const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;

    // Fonction pour extraire le numéro d'épisode de façon robuste
    function parseEpisodeNumber(episodeStr) {
        if (!episodeStr) return null;
        // Cherche le premier nombre dans la chaîne (supporte "Episode 5", "Ep 5", "5", "E05", etc.)
        const match = episodeStr.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : null;
    }

    // Fonction pour récupérer le titre de l'anime (sans saison)
    function getAnimeBaseTitle() {
        const titleElement = document.getElementById('titreOeuvre');
        if (titleElement) {
            // Récupère le texte sans le badge de progression
            const clone = titleElement.cloneNode(true);
            const badge = clone.querySelector('.anime-tracker-saved-episode');
            if (badge) badge.remove();
            return clone.innerText.trim();
        }
        return null;
    }

    // Fonction pour récupérer la saison
    function getAnimeSeason() {
        const seasonElement = document.getElementById('avOeuvre');
        if (seasonElement) {
            return seasonElement.innerText.trim();
        }
        return null;
    }

    // Fonction pour récupérer la clé unique (titre + saison)
    function getAnimeKey() {
        const baseTitle = getAnimeBaseTitle();
        const season = getAnimeSeason();
        if (!baseTitle) return null;

        if (season) {
            return `${baseTitle} | ${season}`;
        }
        return baseTitle;
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
    async function saveEpisodeProgress(animeKey, episode) {
        if (!animeKey || !episode) {
            return;
        }

        try {
            const result = await storage.sync.get({ animeProgress: {} });
            const animeProgress = result.animeProgress;

            const existingProgress = animeProgress[animeKey];
            const newEpisodeNumber = parseEpisodeNumber(episode);

            if (existingProgress && existingProgress.episode) {
                const savedEpisodeNumber = parseEpisodeNumber(existingProgress.episode);
                if (newEpisodeNumber !== null && savedEpisodeNumber !== null && newEpisodeNumber <= savedEpisodeNumber) {
                    // Ne pas mettre à jour si l'épisode actuel n'est pas plus récent
                    return;
                }
            }

            const today = new Date().toLocaleDateString('fr-FR', { year: '2-digit', month: '2-digit', day: '2-digit' });
            const newProgress = {
                episode: episode,
                date: today
            };

            if (JSON.stringify(animeProgress[animeKey]) === JSON.stringify(newProgress)) {
                return;
            }

            animeProgress[animeKey] = newProgress;

            await Promise.all([
                storage.sync.set({ animeProgress: animeProgress }),
                storage.local.set({ animeProgress: animeProgress })
            ]);
        } catch (error) {
            console.error('[Content Script] Erreur lors de la sauvegarde de la progression:', error);
        }
    }

    // Fonction pour afficher le dernier épisode sauvegardé à côté du titre
    async function displaySavedEpisode(animeKey) {
        if (!animeKey) {
            return;
        }

        try {
            const result = await storage.local.get({ animeProgress: {} });
            const animeProgress = result.animeProgress;
            const savedProgress = animeProgress[animeKey];

            const titleElement = document.getElementById('titreOeuvre');
            if (!titleElement) return;

            // Supprime TOUS les badges existants (évite les doublons causés par race conditions)
            const existingSpans = titleElement.querySelectorAll('.anime-tracker-saved-episode');
            existingSpans.forEach(span => span.remove());

            if (savedProgress) {
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
        const animeKey = getAnimeKey();
        const currentEpisode = getCurrentEpisode();

        if (animeKey && currentEpisode) {
            await saveEpisodeProgress(animeKey, currentEpisode);
            await displaySavedEpisode(animeKey);
        } else if (animeKey) {
            await displaySavedEpisode(animeKey);
        }

        if (animeKey) {
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

        // Timeout: Déconnecte l'observer après 10 secondes pour éviter les fuites de mémoire
        setTimeout(() => {
            observer.disconnect();
        }, 10000);
    }

    initialize();


    // Écoute les changements dans le stockage pour mettre à jour l'UI en temps réel
    storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.animeProgress) {
            const animeKey = getAnimeKey();
            if (!animeKey) return;

            const oldValue = changes.animeProgress.oldValue ? changes.animeProgress.oldValue[animeKey] : undefined;
            const newValue = changes.animeProgress.newValue ? changes.animeProgress.newValue[animeKey] : undefined;

            if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                displaySavedEpisode(animeKey);
            }
        }
    });

} // End of injection guard