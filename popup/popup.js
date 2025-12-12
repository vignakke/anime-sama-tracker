//- Gère l'interface du popup pour les règles de redirection et le suivi des animes.

const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;

document.addEventListener('DOMContentLoaded', () => {
    const redirectForm = document.getElementById('redirect-form');
    const rulesList = document.getElementById('rules-list');
    const animeList = document.getElementById('anime-list');
    const animeEmptyMessage = document.getElementById('anime-empty-message');
    const themeToggle = document.getElementById('theme-toggle');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');

    // === THÈME SOMBRE ===
    const loadTheme = () => {
        storage.local.get({ darkTheme: false }, (result) => {
            if (result.darkTheme) {
                document.body.classList.add('dark-theme');
                themeToggle.textContent = '☀️';
            } else {
                document.body.classList.remove('dark-theme');
                themeToggle.textContent = '🌙';
            }
        });
    };

    themeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-theme');
        themeToggle.textContent = isDark ? '☀️' : '🌙';
        storage.local.set({ darkTheme: isDark });
    });

    // === LISTE DES ANIMES ===
    const loadAnimes = () => {
        storage.sync.get({ animeProgress: {} }, (result) => {
            const animes = result.animeProgress;
            animeList.innerHTML = '';

            const entries = Object.entries(animes);
            if (entries.length === 0) {
                animeEmptyMessage.style.display = 'block';
                return;
            }

            animeEmptyMessage.style.display = 'none';

            // Trie par date la plus récente
            entries.sort((a, b) => {
                const dateA = parseDate(a[1].date);
                const dateB = parseDate(b[1].date);
                return dateB - dateA;
            });

            entries.forEach(([key, progress]) => {
                const listItem = document.createElement('li');
                listItem.classList.add('anime-item');

                const animeInfo = document.createElement('div');
                animeInfo.classList.add('anime-info');

                // Parse "Titre | Saison X" format
                const parts = key.split(' | ');
                const animeTitle = parts[0];
                const season = parts[1] || null;

                const titleEl = document.createElement('span');
                titleEl.classList.add('anime-title');
                titleEl.textContent = animeTitle;
                titleEl.title = key;

                const episodeEl = document.createElement('span');
                episodeEl.classList.add('anime-episode');
                let episodeText = '';
                if (season) {
                    episodeText += `${season} • `;
                }
                if (typeof progress === 'object' && progress.episode) {
                    episodeText += `${progress.episode} • ${progress.date || ''}`;
                } else {
                    episodeText += progress;
                }
                episodeEl.textContent = episodeText;

                animeInfo.appendChild(titleEl);
                animeInfo.appendChild(episodeEl);

                const deleteButton = document.createElement('button');
                deleteButton.textContent = '×';
                deleteButton.classList.add('delete-btn');
                deleteButton.title = 'Supprimer cet anime';

                deleteButton.addEventListener('click', () => {
                    deleteAnime(key); // Use full key for deletion
                });

                listItem.appendChild(animeInfo);
                listItem.appendChild(deleteButton);
                animeList.appendChild(listItem);
            });
        });
    };

    // Parse date FR format (DD/MM/YY)
    const parseDate = (dateStr) => {
        if (!dateStr) return new Date(0);
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return new Date(`20${parts[2]}`, parts[1] - 1, parts[0]);
        }
        return new Date(0);
    };

    // Supprime un anime
    const deleteAnime = (title) => {
        if (!confirm(`Supprimer "${title}" de votre liste ?`)) return;

        storage.sync.get({ animeProgress: {} }, (result) => {
            const animes = result.animeProgress;
            delete animes[title];
            storage.sync.set({ animeProgress: animes }, () => {
                storage.local.set({ animeProgress: animes });
                loadAnimes();
            });
        });
    };

    // === RÈGLES DE REDIRECTION ===
    const loadRules = () => {
        storage.sync.get({ redirectRules: [] }, (result) => {
            const rules = result.redirectRules;
            rulesList.innerHTML = '';

            if (rules.length === 0) {
                rulesList.innerHTML = '<li class="empty-item">Aucune règle active.</li>';
                return;
            }

            rules.forEach((rule, index) => {
                const listItem = document.createElement('li');
                const ruleDetails = document.createElement('div');
                ruleDetails.classList.add('rule-details');
                ruleDetails.innerHTML = `<span>${rule.from}</span> &rarr; <span>${rule.to}</span>`;

                const deleteButton = document.createElement('button');
                deleteButton.textContent = '×';
                deleteButton.classList.add('delete-btn');
                deleteButton.title = 'Supprimer cette règle';

                deleteButton.addEventListener('click', () => {
                    deleteRule(index);
                });

                listItem.appendChild(ruleDetails);
                listItem.appendChild(deleteButton);
                rulesList.appendChild(listItem);
            });
        });
    };

    // Validation de domaine
    const isValidDomain = (domain) => {
        const regex = /^[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;
        return regex.test(domain);
    };

    // Ajoute une nouvelle règle
    redirectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fromDomain = document.getElementById('from-domain').value.trim();
        const toDomain = document.getElementById('to-domain').value.trim();

        if (!isValidDomain(fromDomain) || !isValidDomain(toDomain)) {
            alert('Veuillez entrer des domaines valides (ex: anime-sama.org)');
            return;
        }

        if (fromDomain && toDomain) {
            storage.sync.get({ redirectRules: [] }, (result) => {
                const rules = result.redirectRules;
                if (!rules.some(rule => rule.from === fromDomain && rule.to === toDomain)) {
                    rules.push({ from: fromDomain, to: toDomain });
                    storage.sync.set({ redirectRules: rules }, () => {
                        loadRules();
                        redirectForm.reset();
                    });
                } else {
                    alert('Cette règle existe déjà.');
                }
            });
        }
    });

    // Supprime une règle
    const deleteRule = (ruleIndex) => {
        storage.sync.get({ redirectRules: [] }, (result) => {
            let rules = result.redirectRules;
            rules.splice(ruleIndex, 1);
            storage.sync.set({ redirectRules: rules }, () => {
                loadRules();
            });
        });
    };

    // === EXPORT / IMPORT ===
    exportBtn.addEventListener('click', () => {
        storage.sync.get(['animeProgress', 'redirectRules'], (result) => {
            const data = {
                version: 1,
                exportDate: new Date().toISOString(),
                animeProgress: result.animeProgress || {},
                redirectRules: result.redirectRules || []
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `anime-sama-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    });

    importBtn.addEventListener('click', () => {
        importFile.click();
    });

    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);

                if (!data.animeProgress && !data.redirectRules) {
                    alert('Fichier invalide: données manquantes.');
                    return;
                }

                const confirmMsg = `Importer les données ?\n\n` +
                    `- ${Object.keys(data.animeProgress || {}).length} animes\n` +
                    `- ${(data.redirectRules || []).length} règles de redirection\n\n` +
                    `⚠️ Cela remplacera vos données actuelles.`;

                if (!confirm(confirmMsg)) return;

                const toSave = {};
                if (data.animeProgress) toSave.animeProgress = data.animeProgress;
                if (data.redirectRules) toSave.redirectRules = data.redirectRules;

                storage.sync.set(toSave, () => {
                    storage.local.set(toSave, () => {
                        loadAnimes();
                        loadRules();
                        alert('Import réussi !');
                    });
                });
            } catch (err) {
                alert('Erreur lors de la lecture du fichier: ' + err.message);
            }
        };
        reader.readAsText(file);
        importFile.value = ''; // Reset pour permettre de réimporter le même fichier
    });

    // Écoute les changements
    storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync') {
            if (changes.redirectRules) loadRules();
            if (changes.animeProgress) loadAnimes();
        }
    });

    // Chargement initial
    loadTheme();
    loadAnimes();
    loadRules();
});
