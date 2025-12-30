// --- Anime Sama Tracker V2: Popup Logic ---

const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const els = {
        animeList: document.getElementById('anime-list'),
        emptyMsg: document.getElementById('anime-empty-message'),
        rulesList: document.getElementById('rules-list'),
        form: document.getElementById('redirect-form'),
        themeToggle: document.getElementById('theme-toggle'),
        scanFixBtn: document.getElementById('scan-fix-btn'),
        exportBtn: document.getElementById('export-btn'),
        importBtn: document.getElementById('import-btn'),
        importFile: document.getElementById('import-file')
    };

    // --- State & Rendering ---

    const renderAnimes = (animes, rules) => {
        els.animeList.innerHTML = '';
        const entries = Object.entries(animes || {});

        if (entries.length === 0) {
            els.emptyMsg.style.display = 'block';
            return;
        }
        els.emptyMsg.style.display = 'none';

        // Sort by date (Newest first)
        entries.sort((a, b) => parseDate(b[1].date) - parseDate(a[1].date));

        entries.forEach(([key, progress]) => {
            const li = document.createElement('li');
            li.className = 'anime-item';

            // Resolve URL with Rules
            let url = progress.url;
            if (url) {
                rules.forEach(r => {
                    if (url.includes(r.from)) url = url.replace(r.from, r.to);
                });
            }

            const [title, season] = key.split(' | ');

            li.innerHTML = `
                <div class="anime-info">
                    ${url ? `<a href="${url}" target="_blank" class="anime-title" title="${key}">${title}</a>`
                    : `<span class="anime-title" title="${key}">${title}</span>`}
                    <span class="anime-meta">
                        ${season ? season + ' • ' : ''}
                        ${progress.episode || progress} • ${progress.date || ''}
                    </span>
                </div>
            `;

            const delBtn = document.createElement('button');
            delBtn.className = 'delete-btn';
            delBtn.innerHTML = '×';
            delBtn.onclick = () => confirm(`Supprimer "${title}" ?`) && deleteAnime(key);

            li.appendChild(delBtn);
            els.animeList.appendChild(li);
        });
    };

    const renderRules = (rules) => {
        els.rulesList.innerHTML = '';
        rules.forEach((rule, idx) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${rule.from} &rarr; ${rule.to}</span>`;

            const btn = document.createElement('button');
            btn.className = 'delete-btn';
            btn.innerHTML = '×';
            btn.onclick = () => deleteRule(idx);

            li.appendChild(btn);
            els.rulesList.appendChild(li);
        });
    };

    // --- Actions ---

    const loadData = () => {
        storage.sync.get(['animeProgress', 'redirectRules'], (res) => {
            renderAnimes(res.animeProgress, res.redirectRules || []);
            renderRules(res.redirectRules || []);
        });
    };

    const deleteAnime = (key) => {
        storage.sync.get(['animeProgress'], (res) => {
            const data = res.animeProgress;
            delete data[key];
            storage.sync.set({ animeProgress: data }, () => {
                storage.local.set({ animeProgress: data }); // Sync local mirror
                loadData();
            });
        });
    };

    const deleteRule = (idx) => {
        storage.sync.get(['redirectRules'], (res) => {
            const rules = res.redirectRules;
            rules.splice(idx, 1);
            storage.sync.set({ redirectRules: rules }, loadData);
        });
    };

    // --- Repair Logic (Global Scan) ---
    els.scanFixBtn.addEventListener('click', () => {
        chrome.tabs.query({}, (tabs) => {
            if (!tabs.length) return alert("Aucun onglet ouvert.");

            storage.sync.get(['animeProgress'], (res) => {
                const animes = res.animeProgress || {};
                let fixed = 0;
                let details = [];

                tabs.forEach(tab => {
                    const tTitle = (tab.title || "").toLowerCase();
                    const tUrl = tab.url;

                    Object.keys(animes).forEach(key => {
                        const entry = animes[key];
                        // Extract "One Piece" from "One Piece | Saison 1"
                        const name = key.split('|')[0].trim().toLowerCase();

                        // Strict check: Name must be long enough to avoid false positives
                        if (name.length < 3) return;

                        // Match logic: Title contains Name OR Name contains Title fragment
                        if (tTitle.includes(name) || name.includes(tTitle)) {
                            // Update if missing or different
                            if (entry.url !== tUrl) {
                                entry.url = tUrl;
                                if (!details.includes(key)) {
                                    fixed++;
                                    details.push(key);
                                }
                            }
                        }
                    });
                });

                if (fixed > 0) {
                    storage.sync.set({ animeProgress: animes }, () => {
                        storage.local.set({ animeProgress: animes });
                        loadData();
                        alert(`✅ ${fixed} animes mis à jour via vos onglets ouverts !\n(${details.join(', ')})`);
                    });
                } else {
                    alert("Aucune correspondance trouvée dans vos onglets ouverts.");
                }
            });
        });
    });

    // --- Form & Theme ---

    els.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const from = document.getElementById('from-domain').value.trim();
        const to = document.getElementById('to-domain').value.trim();

        storage.sync.get({ redirectRules: [] }, (res) => {
            const rules = res.redirectRules;
            if (rules.some(r => r.from === from && r.to === to)) return alert("Règle déjà existante.");

            rules.push({ from, to });
            storage.sync.set({ redirectRules: rules }, () => {
                els.form.reset();
                loadData();
            });
        });
    });

    // Theme logic
    const toggleTheme = () => {
        const isDark = document.body.classList.toggle('dark-theme');
        els.themeToggle.textContent = isDark ? '☀️' : '🌙';
        storage.local.set({ darkTheme: isDark });
    };

    storage.local.get({ darkTheme: false }, r => {
        if (r.darkTheme) toggleTheme();
    });
    els.themeToggle.onclick = toggleTheme;

    // Export/Import (Standard)
    els.exportBtn.onclick = () => {
        storage.sync.get(null, (data) => {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'anime-tracker-backup.json';
            a.click();
        });
    };
    els.importBtn.onclick = () => els.importFile.click();
    els.importFile.onchange = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = (ev) => {
            try {
                const d = JSON.parse(ev.target.result);
                if (confirm("Importer ? Cela écrasera les données actuelles.")) {
                    storage.sync.set(d, () => {
                        storage.local.set(d);
                        location.reload();
                    });
                }
            } catch (err) { alert("Fichier invalide"); }
        };
        r.readAsText(f);
    };

    // Utils
    const parseDate = (d) => {
        if (!d) return 0;
        const p = d.split('/');
        return p.length === 3 ? new Date(`20${p[2]}`, p[1] - 1, p[0]) : 0;
    };

    loadData();
});
