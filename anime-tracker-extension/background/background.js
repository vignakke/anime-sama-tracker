//- Gère la logique de redirection des URLs en arrière-plan en utilisant declarativeNetRequest.

const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;

// Fonction pour mettre à jour les règles de redirection via declarativeNetRequest
async function updateDeclarativeNetRequestRules() {
    if (typeof chrome.declarativeNetRequest === 'undefined') {
        console.warn("[Background] declarativeNetRequest n'est pas disponible. Ce navigateur pourrait ne pas le supporter.");
        return;
    }

    try {
        const result = await storage.local.get({ redirectRules: [] });
        const redirectRules = result.redirectRules;

        const newRules = redirectRules.map((rule, index) => {
            // Échapper les points dans le domaine pour le regex
            const fromDomainRegex = rule.from.replace(/\./g, '\\.');
            
            return {
                id: index + 1, // L'ID des règles doit être un entier unique
                priority: 1, // Priorité de la règle
                action: {
                    type: "redirect",
                    redirect: {
                        // Utilise regexSubstitution pour conserver le chemin de l'URL
                        // `\1` dans une template string JS devient `\1` pour l'API declarativeNetRequest
                        regexSubstitution: `https://${rule.to}\\1` 
                    }
                },
                condition: {
                    // Le regex capture tout ce qui suit le domaine pour le réutiliser dans regexSubstitution
                    // Supprimé le '/' après fromDomainRegex car (.*) devrait capturer le slash aussi
                    regexFilter: `^https?:\/\/${fromDomainRegex}(.*)$`,
                    // Appliquer la redirection principalement aux requêtes de cadre principal et sous-cadre
                    resourceTypes: [
                        "main_frame", 
                        "sub_frame"
                    ]
                }
            };
        });

        // Récupérer les règles dynamiques existantes pour les supprimer avant d'ajouter les nouvelles
        console.log("[Background] Récupération des règles dynamiques existantes...");
        const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
        const existingRuleIds = existingRules.map(rule => rule.id);
        console.log("[Background] Règles existantes:", existingRules);
        console.log("[Background] IDs des règles existantes à supprimer:", existingRuleIds);
        console.log("[Background] Nouvelles règles à ajouter:", newRules);

        // Mettre à jour les règles : supprimer les anciennes et ajouter les nouvelles
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: existingRuleIds,
            addRules: newRules
        });
        console.log("[Background] Règles Declarative Net Request mises à jour avec succès:", newRules);
        console.log("[Background] updateDynamicRules terminé.");
    } catch (error) {
        console.error("[Background] Erreur lors de la mise à jour des règles Declarative Net Request:", error);
    }
}

// Mettre à jour les règles au démarrage du service worker ou à l'installation de l'extension
chrome.runtime.onInstalled.addListener(updateDeclarativeNetRequestRules);
chrome.runtime.onStartup.addListener(updateDeclarativeNetRequestRules);

// Écouter les changements dans le stockage local (quand une nouvelle règle est ajoutée/supprimée via le popup)
storage.local.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.redirectRules) {
        console.log("[Background] Changement détecté dans les règles de redirection. Mise à jour des règles Declarative Net Request.");
        updateDeclarativeNetRequestRules();
    }
});

console.log("[Background] Script d'arrière-plan initialisé (declarativeNetRequest).");