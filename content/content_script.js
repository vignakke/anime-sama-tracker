// --- Anime Sama Tracker V2: Content Script ---

// Guard to prevent multiple injections
if (window.__animeTrackerInjected) {
    // Already running
} else {
    window.__animeTrackerInjected = true;
    const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;

    // --- Helpers ---

    function parseEpisodeNumber(episodeStr) {
        if (!episodeStr) return null;
        // Matches "Episode 05", "Ep 5", "5", "E05"
        const match = episodeStr.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : null;
    }

    function getAnimeKey() {
        const titleEl = document.getElementById('titreOeuvre');
        const seasonEl = document.getElementById('avOeuvre');
        if (!titleEl) return null;

        // Remove badge from title if present
        const clone = titleEl.cloneNode(true);
        const badge = clone.querySelector('.anime-tracker-saved-episode');
        if (badge) badge.remove();

        const baseTitle = clone.innerText.trim();
        const season = seasonEl ? seasonEl.innerText.trim() : null;

        return season ? `${baseTitle} | ${season}` : baseTitle;
    }

    function getCurrentEpisode() {
        const el = document.getElementById('savedEpisodeId');
        return el ? el.innerText.trim() : null;
    }

    // --- Core Logic ---

    async function saveEpisodeProgress(animeKey, episode, url) {
        if (!animeKey || !episode) return;

        try {
            const data = await storage.sync.get({ animeProgress: {} });
            const animeProgress = data.animeProgress;
            const existing = animeProgress[animeKey];

            const newEpNum = parseEpisodeNumber(episode);

            // Default: Use new data
            let finalEpisode = episode;
            let finalDate = new Date().toLocaleDateString('fr-FR', { year: '2-digit', month: '2-digit', day: '2-digit' });
            let finalUrl = url || window.location.href;

            if (existing && existing.episode) {
                const savedEpNum = parseEpisodeNumber(existing.episode);

                // If current episode is older than saved one
                if (newEpNum !== null && savedEpNum !== null && newEpNum < savedEpNum) {
                    // PRESERVE historical progress
                    finalEpisode = existing.episode;
                    finalDate = existing.date;
                    // BUT UPDATE URL (to ensure link is valid/current)
                    // finalUrl is already set to current page URL above
                }
            }

            const newProgress = { episode: finalEpisode, date: finalDate, url: finalUrl };

            // Optimization: Don't save if identical
            if (JSON.stringify(animeProgress[animeKey]) === JSON.stringify(newProgress)) return;

            // Save
            animeProgress[animeKey] = newProgress;
            await Promise.all([
                storage.sync.set({ animeProgress }),
                storage.local.set({ animeProgress })
            ]);

        } catch (err) {
            console.error('[AnimeTracker] Save failed:', err);
        }
    }

    async function displaySavedEpisode(animeKey) {
        if (!animeKey) return;
        const data = await storage.local.get({ animeProgress: {} });
        const progress = data.animeProgress[animeKey];

        const titleEl = document.getElementById('titreOeuvre');
        if (!titleEl) return;

        // Clean existing
        titleEl.querySelectorAll('.anime-tracker-saved-episode').forEach(el => el.remove());

        if (progress) {
            const span = document.createElement('span');
            span.classList.add('anime-tracker-saved-episode');

            if (typeof progress === 'object' && progress.episode) {
                span.textContent = ` (${progress.episode} - ${progress.date})`;
            } else {
                span.textContent = ` (Dernier : ${progress})`; // Backwards compatibility
            }
            titleEl.appendChild(span);
        }
    }

    function injectRefreshButton() {
        const titleEl = document.getElementById('titreOeuvre');
        if (!titleEl || document.getElementById('anime-tracker-refresh-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'anime-tracker-refresh-btn';
        btn.classList.add('anime-tracker-save-refresh-btn');
        btn.textContent = '↻ Sauvegarder & Rafraîchir';
        btn.title = 'Force la sauvegarde de cet épisode (et met à jour le lien)';

        btn.onclick = (e) => {
            e.stopPropagation();
            btn.disabled = true;
            btn.textContent = '...';
            location.reload();
        };

        const wrapper = document.createElement('div');
        Object.assign(wrapper.style, { marginTop: '10px', marginBottom: '20px', textAlign: 'center' });
        wrapper.appendChild(btn);

        const target = document.getElementById('printLastEpisode');
        if (target) target.parentNode.insertBefore(wrapper, target.nextSibling);
        else titleEl.parentNode.insertBefore(wrapper, titleEl.nextSibling);
    }

    // --- Initialization ---

    async function init() {
        const animeKey = getAnimeKey();
        const currentEp = getCurrentEpisode();

        if (animeKey) {
            if (currentEp) {
                await saveEpisodeProgress(animeKey, currentEp, window.location.href);
            }
            await displaySavedEpisode(animeKey);
            injectRefreshButton();
        }
    }

    // Observer for dynamic content loading
    const observer = new MutationObserver((mutations, obs) => {
        if (document.getElementById('titreOeuvre')) {
            obs.disconnect();
            init();
        }
    });

    if (document.getElementById('titreOeuvre')) {
        init();
    } else {
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => observer.disconnect(), 10000); // 10s fallback
    }

    // Live UI updates
    storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.animeProgress && getAnimeKey()) {
            displaySavedEpisode(getAnimeKey());
        }
    });
}
