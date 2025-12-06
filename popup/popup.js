//- Gère l'interface du popup pour les règles de redirection synchronisées.

const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;

document.addEventListener('DOMContentLoaded', () => {
    const redirectForm = document.getElementById('redirect-form');
    const rulesList = document.getElementById('rules-list');

    // Charge et affiche les règles depuis `storage.sync`
    const loadRules = () => {
        storage.sync.get({ redirectRules: [] }, (result) => {
            const rules = result.redirectRules;
            rulesList.innerHTML = ''; // Vide la liste actuelle

            if (rules.length === 0) {
                rulesList.innerHTML = '<li>Aucune règle active.</li>';
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

    // Ajoute une nouvelle règle dans `storage.sync`
    redirectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fromDomain = document.getElementById('from-domain').value.trim();
        const toDomain = document.getElementById('to-domain').value.trim();

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

    // Supprime une règle de `storage.sync`
    const deleteRule = (ruleIndex) => {
        storage.sync.get({ redirectRules: [] }, (result) => {
            let rules = result.redirectRules;
            rules.splice(ruleIndex, 1);
            storage.sync.set({ redirectRules: rules }, () => {
                loadRules();
            });
        });
    };

    // Si les règles changent (ex: depuis un autre appareil), on rafraîchit la liste
    storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && changes.redirectRules) {
            loadRules();
        }
    });

    // Chargement initial
    loadRules();
});
