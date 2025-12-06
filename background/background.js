//- Gère la logique de synchronisation et de redirection en arrière-plan.

const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;

// Met à jour les règles de redirection en lisant depuis `storage.sync`
async function updateDeclarativeNetRequestRules() {
    if (typeof chrome.declarativeNetRequest === 'undefined') {
        return;
    }
    try {
        const result = await storage.sync.get({ redirectRules: [] });
        await storage.local.set({ redirectRules: result.redirectRules });
        
        const newRules = result.redirectRules.map((rule, index) => ({
            id: index + 1,
            priority: 1,
            action: { type: "redirect", redirect: { regexSubstitution: `https://${rule.to}\\1` } },
            condition: { regexFilter: `^https?:\/\/${rule.from.replace(/\./g, '\\.')}(.*)$`, resourceTypes: ["main_frame", "sub_frame"] }
        }));

        const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
        const existingRuleIds = existingRules.map(rule => rule.id);
        
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: existingRuleIds,
            addRules: newRules
        });
    } catch (error) {
        console.error("[Background] Erreur lors de la mise à jour des règles:", error);
    }
}

// Synchronise toutes les données de `sync` vers `local` (le cache)
async function syncAllDataToLocal() {
    try {
        const result = await storage.sync.get(['animeProgress', 'redirectRules']);
        await storage.local.set(result);
    } catch (error) {
        console.error('[Background] Erreur lors de la synchronisation des données vers local:', error);
    }
}

// Au démarrage et à l'installation, on synchronise tout et on met à jour les règles
chrome.runtime.onInstalled.addListener(async () => {
    await syncAllDataToLocal();
    await updateDeclarativeNetRequestRules();
});

chrome.runtime.onStartup.addListener(async () => {
    await syncAllDataToLocal();
    await updateDeclarativeNetRequestRules();
});

// Écouteur principal pour les changements de synchronisation
storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'sync') {
        return;
    }

    if (changes.redirectRules) {
        storage.local.set({ redirectRules: changes.redirectRules.newValue || [] });
        updateDeclarativeNetRequestRules();
    }

    if (changes.animeProgress) {
        storage.local.set({ animeProgress: changes.animeProgress.newValue || {} });
    }
});

// Injecte le script de contenu dynamiquement sur les sites correspondants
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete' || !tab.url) {
        return;
    }

    const animeSamaRegex = /^https?:\/\/([a-z0-9-]+\.)*anime-sama\.[a-z]{2,}/;

    if (animeSamaRegex.test(tab.url)) {
        try {
            await chrome.scripting.insertCSS({
                target: { tabId: tabId },
                files: ['content/content_style.css']
            });
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content/content_script.js']
            });
        } catch (error) {
            console.error(`[Background] Erreur lors de l'injection des scripts:`, error);
        }
    }
});