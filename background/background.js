// --- Anime Sama Tracker V2: Background Service ---

// State management for Redirect Guard
const brokenRedirects = new Map();

// --- 1. Redirect Guard Logic ---
// Detects when a site redirects from a deep path (e.g. /catalogue/...) to root (/)
// indicating a broken redirect or domain migration issue.

chrome.webRequest.onBeforeRedirect.addListener((details) => {
    if (details.type !== 'main_frame') return;

    try {
        const redirectUrl = new URL(details.redirectUrl);
        const originalUrl = new URL(details.url);

        // Logic: Path was deep (>1 char), Redirect is strict root
        if (redirectUrl.pathname === '/' && originalUrl.pathname.length > 1) {
            brokenRedirects.set(details.tabId, details.url);
        }
    } catch (e) {
        // Ignore invalid URLs
    }
}, { urls: ["<all_urls>"] });

chrome.tabs.onRemoved.addListener((tabId) => {
    brokenRedirects.delete(tabId);
});

// Banner Injection Function
function showRedirectBanner(originalUrl) {
    if (document.getElementById('anime-tracker-redirect-guard')) return;

    const banner = document.createElement('div');
    banner.id = 'anime-tracker-redirect-guard';
    Object.assign(banner.style, {
        position: 'fixed', top: '0', left: '0', right: '0',
        backgroundColor: '#ff9800', color: 'white',
        padding: '15px', textAlign: 'center', zIndex: '2147483647',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        fontFamily: 'Segoe UI, sans-serif', fontWeight: '500'
    });

    const currentDomain = window.location.hostname;
    const oldUrlObj = new URL(originalUrl);
    const newTarget = `${window.location.protocol}//${currentDomain}${oldUrlObj.pathname}${oldUrlObj.search}`;

    banner.innerHTML = `
        ⚠️ <strong>Redirection suspecte détectée</strong><br>
        Vous veniez de <em>${oldUrlObj.pathname}</em> mais avez été redirigé vers l'accueil.<br>
        <button id="anime-tracker-fix-btn" style="
            margin-top: 10px; padding: 8px 15px; border: none; background: white; color: #ff9800;
            font-weight: bold; cursor: pointer; border-radius: 4px;">
            ➜ Restaurer le chemin sur ${currentDomain}
        </button>
        <button id="anime-tracker-close-btn" style="
            margin-left: 10px; padding: 8px 15px; border: 1px solid white; background: transparent; color: white;
            cursor: pointer; border-radius: 4px;">
            Ignorer
        </button>
    `;

    document.body.prepend(banner);

    document.getElementById('anime-tracker-fix-btn').onclick = () => {
        window.location.href = newTarget;
    };
    document.getElementById('anime-tracker-close-btn').onclick = () => {
        banner.remove();
    };
}

// --- 2. Tab Updates & Injection ---

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Only act on complete load with valid URL
    if (changeInfo.status !== 'complete' || !tab.url) return;

    // A. Dynamic Content Script Injection (Matches regex for any TLD)
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
            // Script might be already injected or other innocuous error
        }
    }

    // B. Handle Redirect Guard Injection (If needed)
    if (brokenRedirects.has(tabId)) {
        const originalUrl = brokenRedirects.get(tabId);
        brokenRedirects.delete(tabId); // Consume event

        try {
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: showRedirectBanner,
                args: [originalUrl]
            });
        } catch (error) {
            console.error("[Background] Failed to inject Redirect Guard:", error);
        }
    }
});

// --- 3. Redirect Rules (DNR) ---

function updateRedirectRules() {
    chrome.storage.sync.get({ redirectRules: [] }, (result) => {
        const rules = result.redirectRules;
        const dnrRules = rules.map((rule, index) => ({
            id: index + 1,
            priority: 999,
            action: {
                type: 'redirect',
                redirect: { regexSubstitution: `https://${rule.to}\\2` }
            },
            condition: {
                // Regex: ^https?://(www\.)?FROM_DOMAIN(.*)$
                // Capture group 2 corresponds to the path (.*)
                regexFilter: `^https?://(www\\.)?${rule.from.replace('.', '\\.')}(.*)$`,
                resourceTypes: ['main_frame']
            }
        }));

        chrome.declarativeNetRequest.getDynamicRules((existingRules) => {
            const removeRuleIds = existingRules.map(r => r.id);
            chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: removeRuleIds,
                addRules: dnrRules
            });
        });
    });
}

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.redirectRules) {
        updateRedirectRules();
    }
});

chrome.runtime.onInstalled.addListener(updateRedirectRules);
chrome.runtime.onStartup.addListener(updateRedirectRules);
