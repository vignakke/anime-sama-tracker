//- Gère l'interface du popup pour les règles de redirection.

const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;

document.addEventListener('DOMContentLoaded', () => {
    const redirectForm = document.getElementById('redirect-form');
    const rulesList = document.getElementById('rules-list');

    // Charge et affiche les règles de redirection existantes
    const loadRules = () => {
        storage.local.get({ redirectRules: [] }, (result) => {
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

    // Ajoute une nouvelle règle
    redirectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fromDomain = document.getElementById('from-domain').value.trim();
        const toDomain = document.getElementById('to-domain').value.trim();

        if (fromDomain && toDomain) {
            storage.local.get({ redirectRules: [] }, (result) => {
                const rules = result.redirectRules;
                // Empêche les doublons
                if (!rules.some(rule => rule.from === fromDomain && rule.to === toDomain)) {
                    rules.push({ from: fromDomain, to: toDomain });
                    storage.local.set({ redirectRules: rules }, () => {
                        console.log(`[Popup] Règle ajoutée: ${fromDomain} -> ${toDomain}`);
                        loadRules();
                        redirectForm.reset();
                    });
                } else {
                    alert('Cette règle existe déjà.');
                }
            });
        }
    });

    // Supprime une règle par son index
    const deleteRule = (ruleIndex) => {
        storage.local.get({ redirectRules: [] }, (result) => {
            let rules = result.redirectRules;
            const deletedRule = rules[ruleIndex];
            rules.splice(ruleIndex, 1); // Supprime l'élément à l'index donné
            storage.local.set({ redirectRules: rules }, () => {
                console.log(`[Popup] Règle supprimée: ${deletedRule.from} -> ${deletedRule.to}`);
                loadRules();
            });
        }); // Missing closing brace for storage.local.get callback
    };

    // Chargement initial
    loadRules();
});
