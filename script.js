// ===========================
// SUPABASE REMOVED - Using GitHub API for user management instead
// ===========================

// ===========================
// MICROSOFT OAUTH & ONEDRIVE STORAGE (HYBRID APPROACH)
// ===========================
// DEBUG: Initialize debug system check
if (typeof DEBUG !== 'undefined') {
    DEBUG.log('script.js loaded', { timestamp: new Date().toISOString() });
}
// DEBUG: Wrap UI handlers so we can correlate "what user clicked" -> "what happened"
if (typeof DEBUG !== 'undefined') {
    setTimeout(() => {
        const wrap = (fnName) => {
            try {
                const original = window[fnName];
                if (typeof original !== 'function') return;
                if (original.__debugWrapped) return;

                const wrapped = function(...args) {
                    const click = (typeof DEBUG.consumeLastUiClick === 'function')
                        ? DEBUG.consumeLastUiClick()
                        : null;

                    const handlerTimer = `Handler ${fnName} ${Date.now()}`;

                    DEBUG.group(`▶️ Handler: ${fnName}`);
                    if (click) {
                        DEBUG.log('fromClick', click.info);
                    }
                    DEBUG.log('args', args);
                    DEBUG.time(handlerTimer);

                    const finishOk = () => {
                        DEBUG.timeEnd(handlerTimer);
                        if (click && click.timerLabel) {
                            DEBUG.timeEnd(click.timerLabel);
                        }
                        DEBUG.groupEnd();
                    };

                    const finishErr = (err) => {
                        DEBUG.error(`handlerError: ${fnName}`, { message: err?.message, stack: err?.stack });
                        DEBUG.timeEnd(handlerTimer);
                        if (click && click.timerLabel) {
                            DEBUG.timeEnd(click.timerLabel);
                        }
                        DEBUG.groupEnd();
                        throw err;
                    };

                    try {
                        const result = original.apply(this, args);
                        if (result && typeof result.then === 'function') {
                            return result.then((v) => {
                                finishOk();
                                return v;
                            }).catch((e) => finishErr(e));
                        }
                        finishOk();
                        return result;
                    } catch (e) {
                        return finishErr(e);
                    }
                };

                wrapped.__debugWrapped = true;
                wrapped.__debugOriginal = original;
                window[fnName] = wrapped;
                DEBUG.log('Wrapped UI handler', { fnName });
            } catch (e) {
                // Don't break app if wrapping fails
                DEBUG.warn('Failed to wrap handler', { fnName, error: e?.message });
            }
        };

        // Inline onclick handlers (index.html) and common UI entrypoints
        const handlerNames = [
            'leggTilInntekt',
            'leggTilUtgift',
            'leggTilSkyldner',
            'beregnBudsjett',
            'eksporterPDF',
            'eksporterExcel',
            'nullstillData',
            'slettElement',
            'markerSomBetalt',
            'slettSkyldner',
            'showProductSelection',
            'closeProductSelection',
            'selectProduct',
            'showSettingsModal',
            'closeSettingsModal',
            'signInWithMicrosoft',
            'signInWithGoogle',
            'signInWithGitHub',
            'signInWithEmail',
            'signOut',
            'showSignupModal',
            'hideSignupModal',
            'handleSignup',
        ];

        handlerNames.forEach(wrap);
    }, 0);
}
// Microsoft OAuth is used for authentication and OneDrive data storage.
// When users sign up/login with Microsoft:
//   1. Microsoft account is used for OneDrive data storage
//   2. User subscription status is checked from GitHub API
//   3. App data (inntekter, utgifter, etc.) is synced to OneDrive

// Initialize MSAL (Microsoft Authentication Library)
let msalInstance = null;
let microsoftAccount = null;
let microsoftAccessToken = null;
let msalInitializing = false;
let msalInitialized = false;

// Initialize MSAL (Microsoft Authentication Library)
async function initializeMSAL() {
    if (typeof DEBUG !== 'undefined') {
        DEBUG.time('initializeMSAL');
        DEBUG.auth('Microsoft', 'initialize', { msalInitialized, hasInstance: !!msalInstance });
    }
    
    // If already initialized, return
    if (msalInitialized && msalInstance) {
        if (typeof DEBUG !== 'undefined') {
            DEBUG.log('MSAL already initialized, skipping');
            DEBUG.timeEnd('initializeMSAL');
        }
        return;
    }
    
    // If already initializing, wait for it
    if (msalInitializing) {
        let attempts = 0;
        while (msalInitializing && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        return;
    }
    
    msalInitializing = true;
    
    try {
        // Check if script failed to load
        if (window.msalLoadError) {
            console.error("❌ MSAL script failed to load from CDN");
            console.error("The CDN might be blocked or inaccessible. Check network tab.");
            msalInitializing = false;
            return;
        }
        
        // Wait for MSAL library to load (check multiple possible global names)
        // Also check if fallback is still loading
        if (window.msalScriptLoaded === false || (window.msalScriptLoaded === undefined && !window.msalLoadError)) {
            console.log("⏳ Waiting for MSAL script to finish loading...");
            // Wait up to 2 seconds for script to load
            for (let i = 0; i < 20; i++) {
                await new Promise(resolve => setTimeout(resolve, 100));
                if (window.msalScriptLoaded === true || window.msalLoadError === true) break;
            }
        }
        
        let msalLib = window.msal || window.Msal || (typeof msal !== 'undefined' ? msal : null) || (typeof Msal !== 'undefined' ? Msal : null);
        
        if (!msalLib) {
            console.warn("⚠️ MSAL library not loaded yet, waiting...");
            console.log("Checking for: window.msal, window.Msal, msal, Msal");
            
            // Wait for MSAL to load (check every 100ms for up to 15 seconds)
            for (let i = 0; i < 150; i++) {
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Check all possible global names
                msalLib = window.msal || window.Msal || (typeof msal !== 'undefined' ? msal : null) || (typeof Msal !== 'undefined' ? Msal : null);
                
                if (msalLib) {
                    console.log("✅ Found MSAL library:", msalLib);
                    break;
                }
                
                // Log what's available for debugging
                if (i % 10 === 0) {
                    console.log(`Still waiting... (${i/10}s) - window.msal: ${typeof window.msal}, window.Msal: ${typeof window.Msal}`);
                    // Also log all window properties that might be MSAL
                    const msalKeys = Object.keys(window).filter(k => k.toLowerCase().includes('msal'));
                    if (msalKeys.length > 0) {
                        console.log("Found window properties with 'msal':", msalKeys);
                    }
                }
            }
            
            if (!msalLib) {
                console.error("❌ MSAL library failed to load after 15 seconds");
                console.error("Available globals with 'msal':", Object.keys(window).filter(k => k.toLowerCase().includes('msal')));
                console.error("All window properties:", Object.keys(window).slice(0, 50)); // First 50 for debugging
                console.error("Check if the MSAL script tag is present and the CDN is accessible");
                console.error("Try checking Network tab to see if the script is loading");
                console.error("If both CDNs are blocked, you may need to download MSAL locally");
                msalInitializing = false;
                return;
            }
        }
        
        if (typeof MSAL_CONFIG !== 'undefined' && MSAL_CONFIG.clientId && 
            MSAL_CONFIG.clientId !== "YOUR_AZURE_AD_CLIENT_ID" && 
            MSAL_CONFIG.clientId !== "YOUR_MSAL_CLIENT_ID_HERE") {
            const msalConfig = {
                auth: {
                    clientId: MSAL_CONFIG.clientId,
                    authority: MSAL_CONFIG.authority,
                    redirectUri: MSAL_CONFIG.redirectUri
                },
                cache: {
                    cacheLocation: "sessionStorage",
                    storeAuthStateInCookie: false
                }
            };

            const MsalLib = window.msal || window.Msal || msal || Msal;
            if (!MsalLib || !MsalLib.PublicClientApplication) {
                throw new Error("MSAL library found but PublicClientApplication is not available");
            }
            msalInstance = new MsalLib.PublicClientApplication(msalConfig);
            
            // Initialize MSAL
            await msalInstance.initialize();
            msalInitialized = true;
            console.log("✅ MSAL initialized");
            
            if (typeof DEBUG !== 'undefined') {
                DEBUG.auth('Microsoft', 'initialized', { clientId: MSAL_CONFIG.clientId });
            }
            
            // Check for existing accounts
            const accounts = msalInstance.getAllAccounts();
            if (accounts.length > 0) {
                microsoftAccount = accounts[0];
                console.log("✅ Microsoft account found:", microsoftAccount.username);
                if (typeof DEBUG !== 'undefined') {
                    DEBUG.auth('Microsoft', 'accountFound', { 
                        username: microsoftAccount.username,
                        accountCount: accounts.length 
                    });
                }
            }
        } else {
            console.warn("⚠️ Microsoft OAuth not configured. Set MSAL_CONFIG in config.js");
            if (typeof DEBUG !== 'undefined') {
                DEBUG.warn('Microsoft OAuth not configured');
            }
        }
    } catch (error) {
        console.error("❌ Failed to initialize MSAL:", error);
        if (typeof DEBUG !== 'undefined') {
            DEBUG.error('MSAL initialization failed', { error: error.message, stack: error.stack });
        }
        // Don't block the app if MSAL fails - user can still use email login
    } finally {
        msalInitializing = false;
        if (typeof DEBUG !== 'undefined') {
            DEBUG.timeEnd('initializeMSAL');
        }
    }
}

// Start initialization after page and scripts are loaded
if (document.readyState === 'loading') {
    window.addEventListener('load', () => {
        // Give MSAL script a moment to initialize
        setTimeout(() => {
            initializeMSAL();
        }, 500);
    });
} else {
    // Page already loaded, wait a bit for MSAL script
    setTimeout(() => {
        initializeMSAL();
    }, 500);
}

// ===========================
// MICROSOFT OAUTH FUNCTIONS
// ===========================

// Sign in with Microsoft
async function signInWithMicrosoft() {
    if (typeof DEBUG !== 'undefined') {
        DEBUG.time('signInWithMicrosoft');
        DEBUG.auth('Microsoft', 'signIn', { start: true });
    }
    
    // Check if MSAL_CONFIG exists
    if (typeof MSAL_CONFIG === 'undefined' || !MSAL_CONFIG.clientId || 
        MSAL_CONFIG.clientId === "YOUR_AZURE_AD_CLIENT_ID" || 
        MSAL_CONFIG.clientId === "YOUR_MSAL_CLIENT_ID_HERE") {
        if (typeof DEBUG !== 'undefined') {
            DEBUG.error('Microsoft OAuth not configured');
        }
        alert("Microsoft OAuth ikke konfigurert. Sjekk config.js");
        return;
    }
    
    // Check if script failed to load
    if (window.msalLoadError) {
        alert("Microsoft OAuth-biblioteket kunne ikke lastes. CDN kan være blokkert. Sjekk nettverk-fanen i utviklerverktøyene.");
        console.error("MSAL script failed to load from CDN");
        return;
    }
    
    // Wait for MSAL library to load (check multiple possible global names)
    let msalLib = window.msal || window.Msal || (typeof msal !== 'undefined' ? msal : null) || (typeof Msal !== 'undefined' ? Msal : null);
    if (!msalLib) {
        // Show loading message and wait
        const loadingMsg = "Microsoft OAuth-biblioteket lastes fortsatt. Vennligst vent...";
        console.log(loadingMsg);
        console.log("Checking for: window.msal, window.Msal, msal, Msal");
        
        // Wait up to 10 seconds for MSAL library
        for (let i = 0; i < 100; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
            msalLib = window.msal || window.Msal || (typeof msal !== 'undefined' ? msal : null) || (typeof Msal !== 'undefined' ? Msal : null);
            if (msalLib) {
                console.log("✅ Found MSAL library in signInWithMicrosoft");
                break;
            }
        }
        if (!msalLib) {
            alert("Kunne ikke laste Microsoft OAuth-biblioteket. Prøv å oppdatere siden eller sjekk internettforbindelsen.");
            console.error("MSAL library not found. Available globals:", Object.keys(window).filter(k => k.toLowerCase().includes('msal')));
            console.error("Check Network tab to see if https://alcdn.msauth.net/browser/2.38.3/js/msal-browser.min.js loaded successfully");
            return;
        }
    }
    
    // Wait for MSAL to initialize if it's still loading
    if (!msalInstance) {
        // If initialization hasn't started, start it now
        if (!msalInitializing && !msalInitialized) {
            console.log("Starting MSAL initialization...");
            await initializeMSAL();
        } else {
            // Wait up to 5 seconds for MSAL to initialize
            let attempts = 0;
            while (!msalInstance && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
        }
        
        if (!msalInstance) {
            alert("Microsoft OAuth initialiserer fortsatt. Prøv igjen om et øyeblikk.");
            return;
        }
    }

    try {
        // Log the actual configuration being used
        console.log("🔍 MSAL Login Configuration:");
        console.log("  - Client ID:", MSAL_CONFIG.clientId);
        console.log("  - Authority:", MSAL_CONFIG.authority);
        console.log("  - Redirect URI:", MSAL_CONFIG.redirectUri);
        console.log("  - Current URL:", window.location.href);
        console.log("  - Origin:", window.location.origin);
        console.log("  - Pathname:", window.location.pathname);
        
        const loginRequest = {
            scopes: MSAL_CONFIG.scopes,
            prompt: "select_account"
        };

        console.log("🔍 Login Request:", loginRequest);
        const loginResponse = await msalInstance.loginPopup(loginRequest);
        microsoftAccount = loginResponse.account;
        microsoftAccessToken = loginResponse.accessToken;
        
        console.log("✅ Microsoft sign-in successful:", microsoftAccount.username);
        
        if (typeof DEBUG !== 'undefined') {
            DEBUG.auth('Microsoft', 'signInSuccess', { 
                username: microsoftAccount.username,
                accountId: microsoftAccount.homeAccountId 
            });
        }
        
        const microsoftEmail = microsoftAccount.username || microsoftAccount.name;
        
        // Check subscription status from GitHub API
        // TODO: Implement GitHub API integration
        // For now, show subscription prompt
        await checkAuthAndSubscription();
        
        if (typeof DEBUG !== 'undefined') {
            DEBUG.timeEnd('signInWithMicrosoft');
        }
        
    } catch (error) {
        console.error("Microsoft sign-in error:", error);
        if (typeof DEBUG !== 'undefined') {
            DEBUG.error('Microsoft sign-in failed', { 
                errorCode: error.errorCode,
                errorMessage: error.message,
                error: error 
            });
            DEBUG.timeEnd('signInWithMicrosoft');
        }
        if (error.errorCode === "user_cancelled") {
            console.log("User cancelled Microsoft login");
            if (typeof DEBUG !== 'undefined') {
                DEBUG.info('User cancelled Microsoft login');
            }
        } else {
            alert("Feil ved innlogging med Microsoft: " + (error.message || error.errorCode));
        }
    }
}

// Sign out from Microsoft
async function signOutMicrosoft() {
    if (msalInstance && microsoftAccount) {
        try {
            await msalInstance.logoutPopup({
                account: microsoftAccount
            });
            microsoftAccount = null;
            microsoftAccessToken = null;
            console.log("✅ Microsoft sign-out successful");
        } catch (error) {
            console.error("Microsoft sign-out error:", error);
        }
    }
}

// Get Microsoft access token (with refresh if needed)
async function getMicrosoftAccessToken() {
    if (!msalInstance || !microsoftAccount) {
        return null;
    }

    try {
        const tokenRequest = {
            scopes: MSAL_CONFIG.scopes,
            account: microsoftAccount
        };

        // Try to get token silently first
        let tokenResponse;
        try {
            tokenResponse = await msalInstance.acquireTokenSilent(tokenRequest);
        } catch (silentError) {
            // If silent fails, use popup
            console.log("Silent token acquisition failed, using popup");
            tokenResponse = await msalInstance.acquireTokenPopup(tokenRequest);
        }

        microsoftAccessToken = tokenResponse.accessToken;
        return microsoftAccessToken;
    } catch (error) {
        console.error("Error getting Microsoft access token:", error);
        return null;
    }
}

// ===========================
// OFFICE 365 API FUNCTIONS (OneDrive Storage)
// ===========================

// User Profile Storage in OneDrive
// Store user profiles in: EB-Okonomi-Data/Users/{email}/profile.json

// Get or create user folder in OneDrive
async function getUserFolder(email) {
    const accessToken = await getMicrosoftAccessToken();
    if (!accessToken) {
        throw new Error("Not authenticated with Microsoft");
    }

    try {
        const dataFolder = await getOrCreateDataFolder();
        const usersFolderName = "Users";
        
        // Check if Users folder exists
        const usersFolderUrl = `${OFFICE365_CONFIG.graphEndpoint}/me/drive/items/${dataFolder.id}/children?$filter=name eq '${usersFolderName}' and folder ne null`;
        const usersFolderResponse = await fetch(usersFolderUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        let usersFolder;
        if (usersFolderResponse.ok) {
            const usersFolderData = await usersFolderResponse.json();
            if (usersFolderData.value && usersFolderData.value.length > 0) {
                usersFolder = usersFolderData.value[0];
            }
        }

        // Create Users folder if it doesn't exist
        if (!usersFolder) {
            const createUsersFolderUrl = `${OFFICE365_CONFIG.graphEndpoint}/me/drive/items/${dataFolder.id}/children`;
            const createResponse = await fetch(createUsersFolderUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: usersFolderName,
                    folder: {},
                    '@microsoft.graph.conflictBehavior': 'rename'
                })
            });

            if (!createResponse.ok) {
                throw new Error(`Failed to create Users folder: ${createResponse.statusText}`);
            }
            usersFolder = await createResponse.json();
        }

        // Get or create user-specific folder
        const userFolderName = email.replace(/[^a-zA-Z0-9@._-]/g, '_'); // Sanitize email for folder name
        const userFolderUrl = `${OFFICE365_CONFIG.graphEndpoint}/me/drive/items/${usersFolder.id}/children?$filter=name eq '${userFolderName}' and folder ne null`;
        const userFolderResponse = await fetch(userFolderUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        let userFolder;
        if (userFolderResponse.ok) {
            const userFolderData = await userFolderResponse.json();
            if (userFolderData.value && userFolderData.value.length > 0) {
                userFolder = userFolderData.value[0];
            }
        }

        // Create user folder if it doesn't exist
        if (!userFolder) {
            const createUserFolderUrl = `${OFFICE365_CONFIG.graphEndpoint}/me/drive/items/${usersFolder.id}/children`;
            const createResponse = await fetch(createUserFolderUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: userFolderName,
                    folder: {},
                    '@microsoft.graph.conflictBehavior': 'rename'
                })
            });

            if (!createResponse.ok) {
                throw new Error(`Failed to create user folder: ${createResponse.statusText}`);
            }
            userFolder = await createResponse.json();
        }

        return userFolder;
    } catch (error) {
        console.error("Error getting user folder:", error);
        throw error;
    }
}

// Get user profile from OneDrive
async function getUserProfileFromOneDrive(email) {
    if (!microsoftAccount) {
        return null;
    }

    try {
        const accessToken = await getMicrosoftAccessToken();
        if (!accessToken) {
            return null;
        }

        const userFolder = await getUserFolder(email);
        const profileUrl = `${OFFICE365_CONFIG.graphEndpoint}/me/drive/items/${userFolder.id}:/profile.json:/content`;
        
        const response = await fetch(profileUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (response.ok) {
            const profile = await response.json();
            return profile;
        } else if (response.status === 404) {
            // Profile doesn't exist yet
            return null;
        } else {
            throw new Error(`Failed to get profile: ${response.statusText}`);
        }
    } catch (error) {
        console.error("Error getting user profile from OneDrive:", error);
        return null;
    }
}

// Save user profile to OneDrive
async function saveUserProfileToOneDrive(email, profileData) {
    if (!microsoftAccount) {
        console.warn("Not using Microsoft, cannot save profile to OneDrive");
        return false;
    }

    try {
        const accessToken = await getMicrosoftAccessToken();
        if (!accessToken) {
            throw new Error("Not authenticated with Microsoft");
        }

        const userFolder = await getUserFolder(email);
        const profileUrl = `${OFFICE365_CONFIG.graphEndpoint}/me/drive/items/${userFolder.id}:/profile.json:/content`;
        
        // Ensure profile has required fields
        const profile = {
            email: email,
            subscription: profileData.subscription || {
                status: 'inactive',
                plan: null,
                startDate: null,
                endDate: null,
                stripeCustomerId: null,
                stripeSubscriptionId: null
            },
            createdAt: profileData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const response = await fetch(profileUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(profile, null, 2)
        });

        if (!response.ok) {
            throw new Error(`Failed to save profile: ${response.statusText}`);
        }

        console.log("✅ User profile saved to OneDrive");
        return true;
    } catch (error) {
        console.error("Error saving user profile to OneDrive:", error);
        return false;
    }
}

// Get or create the app data folder in OneDrive
async function getOrCreateDataFolder() {
    const accessToken = await getMicrosoftAccessToken();
    if (!accessToken) {
        throw new Error("Not authenticated with Microsoft");
    }

    try {
        // First, try to find the folder
        const searchUrl = `${OFFICE365_CONFIG.graphEndpoint}/me/drive/root/children?$filter=name eq '${OFFICE365_CONFIG.dataFolderName}' and folder ne null`;
        const searchResponse = await fetch(searchUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!searchResponse.ok) {
            throw new Error(`Failed to search folder: ${searchResponse.statusText}`);
        }

        const searchData = await searchResponse.json();
        
        if (searchData.value && searchData.value.length > 0) {
            // Folder exists
            return searchData.value[0];
        }

        // Folder doesn't exist, create it
        const createUrl = `${OFFICE365_CONFIG.graphEndpoint}/me/drive/root/children`;
        const createResponse = await fetch(createUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: OFFICE365_CONFIG.dataFolderName,
                folder: {},
                '@microsoft.graph.conflictBehavior': 'rename'
            })
        });

        if (!createResponse.ok) {
            throw new Error(`Failed to create folder: ${createResponse.statusText}`);
        }

        const folderData = await createResponse.json();
        console.log("✅ Created OneDrive folder:", folderData.name);
        return folderData;
    } catch (error) {
        console.error("Error getting/creating data folder:", error);
        throw error;
    }
}

// Save data file to OneDrive
async function saveDataToOneDrive(filename, data) {
    if (typeof DEBUG !== 'undefined') {
        DEBUG.time(`saveDataToOneDrive-${filename}`);
        DEBUG.storage('OneDrive', 'save', { filename, dataSize: JSON.stringify(data).length });
    }
    
    if (!microsoftAccount) {
        // Fallback to localStorage if not using Microsoft
        console.warn("Not using Microsoft, falling back to localStorage");
        if (typeof DEBUG !== 'undefined') {
            DEBUG.warn('Not using Microsoft, falling back to localStorage', { filename });
        }
        return false;
    }

    try {
        const accessToken = await getMicrosoftAccessToken();
        if (!accessToken) {
            throw new Error("Not authenticated with Microsoft");
        }

        const folder = await getOrCreateDataFolder();
        const fileUrl = `${OFFICE365_CONFIG.graphEndpoint}/me/drive/items/${folder.id}:/${filename}:/content`;
        
        if (typeof DEBUG !== 'undefined') {
            DEBUG.network('PUT', fileUrl, { filename, folderId: folder.id });
        }
        
        // Convert data to JSON string for file content
        const fileContent = JSON.stringify(data, null, 2);

        const response = await fetch(fileUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: fileContent
        });

        if (!response.ok) {
            throw new Error(`Failed to save file: ${response.statusText}`);
        }

        console.log(`✅ Saved ${filename} to OneDrive`);
        if (typeof DEBUG !== 'undefined') {
            DEBUG.storage('OneDrive', 'saveSuccess', { filename, size: fileContent.length });
            DEBUG.timeEnd(`saveDataToOneDrive-${filename}`);
        }
        return true;
    } catch (error) {
        console.error("Error saving to OneDrive:", error);
        if (typeof DEBUG !== 'undefined') {
            DEBUG.error('OneDrive save failed', { filename, error: error.message });
            DEBUG.timeEnd(`saveDataToOneDrive-${filename}`);
        }
        // Fallback to localStorage
        return false;
    }
}

// Load data file from OneDrive
async function loadDataFromOneDrive(filename) {
    if (typeof DEBUG !== 'undefined') {
        DEBUG.time(`loadDataFromOneDrive-${filename}`);
        DEBUG.storage('OneDrive', 'load', { filename });
    }
    
    if (!microsoftAccount) {
        // Fallback to localStorage if not using Microsoft
        if (typeof DEBUG !== 'undefined') {
            DEBUG.warn('Not using Microsoft, cannot load from OneDrive', { filename });
        }
        return null;
    }

    try {
        const accessToken = await getMicrosoftAccessToken();
        if (!accessToken) {
            throw new Error("Not authenticated with Microsoft");
        }

        const folder = await getOrCreateDataFolder();
        const fileUrl = `${OFFICE365_CONFIG.graphEndpoint}/me/drive/items/${folder.id}:/${filename}:/content`;

        if (typeof DEBUG !== 'undefined') {
            DEBUG.network('GET', fileUrl, { filename, folderId: folder.id });
        }

        const response = await fetch(fileUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                // File doesn't exist yet
                if (typeof DEBUG !== 'undefined') {
                    DEBUG.info('File not found in OneDrive', { filename });
                    DEBUG.timeEnd(`loadDataFromOneDrive-${filename}`);
                }
                return null;
            }
            throw new Error(`Failed to load file: ${response.statusText}`);
        }

        // Get the file content
        const text = await response.text();
        const data = JSON.parse(text);
        console.log(`✅ Loaded ${filename} from OneDrive`);
        if (typeof DEBUG !== 'undefined') {
            DEBUG.storage('OneDrive', 'loadSuccess', { filename, size: text.length });
            DEBUG.timeEnd(`loadDataFromOneDrive-${filename}`);
        }
        return data;
    } catch (error) {
        console.error("Error loading from OneDrive:", error);
        if (typeof DEBUG !== 'undefined') {
            DEBUG.error('OneDrive load failed', { filename, error: error.message });
            DEBUG.timeEnd(`loadDataFromOneDrive-${filename}`);
        }
        return null;
    }
}

// Save all app data to OneDrive
async function saveAllDataToOneDrive() {
    if (!microsoftAccount) {
        // Fallback to localStorage
        lagreData();
        return;
    }

    try {
        const allData = {
            inntekter,
            utgifter,
            skyldnere,
            skyldBeløp,
            skyldStatus,
            betalingsDatoer,
            egenkapitalHistorikk,
            datoer,
            inntektsDatoer,
            utgiftsDatoer,
            inntektsBeskrivelser,
            utgiftsBeskrivelser,
            andeler,
            andelVerdi,
            oppstartstid,
            avviklingstid
        };

        await saveDataToOneDrive("app-data.json", allData);
        console.log("✅ All data saved to OneDrive");
    } catch (error) {
        console.error("Error saving all data to OneDrive:", error);
        // Fallback to localStorage
        lagreData();
    }
}

// Load all app data from OneDrive
async function loadAllDataFromOneDrive() {
    if (!microsoftAccount) {
        // Fallback to localStorage (already loaded on page load)
        return;
    }

    try {
        const data = await loadDataFromOneDrive("app-data.json");
        if (data) {
            // Restore all data from OneDrive
            inntekter = data.inntekter || [];
            utgifter = data.utgifter || [];
            skyldnere = data.skyldnere || [];
            skyldBeløp = data.skyldBeløp || [];
            skyldStatus = data.skyldStatus || [];
            betalingsDatoer = data.betalingsDatoer || [];
            egenkapitalHistorikk = data.egenkapitalHistorikk || [];
            datoer = data.datoer || [];
            inntektsDatoer = data.inntektsDatoer || [];
            utgiftsDatoer = data.utgiftsDatoer || [];
            inntektsBeskrivelser = data.inntektsBeskrivelser || [];
            utgiftsBeskrivelser = data.utgiftsBeskrivelser || [];
            andeler = data.andeler || 0;
            andelVerdi = data.andelVerdi || 0;
            oppstartstid = data.oppstartstid || "";
            avviklingstid = data.avviklingstid || "";

            // Update UI
            document.getElementById("andeler").value = andeler;
            document.getElementById("andelVerdi").value = andelVerdi;
            document.getElementById("start").value = oppstartstid;
            document.getElementById("end").value = avviklingstid;

            oppdaterListe("inntekter-list", inntekter, inntektsBeskrivelser, "inntekter");
            oppdaterListe("utgifter-list", utgifter, utgiftsBeskrivelser, "utgifter");
            oppdaterListeSkyldnere();

            console.log("✅ All data loaded from OneDrive");
        }
    } catch (error) {
        console.error("Error loading all data from OneDrive:", error);
        // Data already loaded from localStorage on page load
    }
}

// ===========================
// AUTHENTICATION & PAYWALL
// ===========================

// Check authentication and subscription status
// Subscription status is checked from GitHub API
// OneDrive is used for data storage when Microsoft auth is active
async function checkAuthAndSubscription() {
    if (typeof DEBUG !== 'undefined') {
        DEBUG.time('checkAuthAndSubscription');
        DEBUG.auth('System', 'checkAuthAndSubscription', { hasAccount: !!microsoftAccount });
    }
    
    // Check Microsoft authentication
    if (microsoftAccount) {
        try {
            // Verify Microsoft token is still valid
            const token = await getMicrosoftAccessToken();
            if (!token) {
                console.error("Microsoft token verification failed");
                if (typeof DEBUG !== 'undefined') {
                    DEBUG.error('Microsoft token verification failed');
                }
                microsoftAccount = null;
                microsoftAccessToken = null;
                showLoginPrompt();
                return;
            }
            
            console.log("✅ Microsoft user authenticated:", microsoftAccount.username);
            const microsoftEmail = microsoftAccount.username || microsoftAccount.name;
            
            if (typeof DEBUG !== 'undefined') {
                DEBUG.auth('Microsoft', 'authenticated', { email: microsoftEmail });
            }
            
            // TODO: Check subscription status from GitHub API
            // For now, show subscription prompt
            // await checkUserSubscription(microsoftEmail);
            
            userHasAccess = false;
            showSubscriptionPrompt(microsoftEmail);
            
            if (typeof DEBUG !== 'undefined') {
                DEBUG.timeEnd('checkAuthAndSubscription');
            }
            return;
        } catch (error) {
            console.error("Error checking subscription:", error);
            if (typeof DEBUG !== 'undefined') {
                DEBUG.error('Error checking subscription', { error: error.message });
            }
            microsoftAccount = null;
            microsoftAccessToken = null;
            showLoginPrompt();
        }
        if (typeof DEBUG !== 'undefined') {
            DEBUG.timeEnd('checkAuthAndSubscription');
        }
        return;
    }

    // No active authentication - show login prompt
    console.log("No active session");
    if (typeof DEBUG !== 'undefined') {
        DEBUG.info('No active session');
        DEBUG.timeEnd('checkAuthAndSubscription');
    }
    showLoginPrompt();
}

// Show login prompt
function showLoginPrompt() {
    userHasAccess = false; // Clear access flag
    const authStatus = document.getElementById("auth-status");
    const loginButtons = document.getElementById("login-buttons");
    const userInfo = document.getElementById("user-info");
    const subscriptionPrompt = document.getElementById("subscription-prompt");
    const paywall = document.getElementById("paywall");
    
    if (authStatus) authStatus.style.display = "none";
    if (loginButtons) loginButtons.style.display = "block";
    if (userInfo) userInfo.style.display = "none";
    if (subscriptionPrompt) subscriptionPrompt.style.display = "none";
    if (paywall) paywall.classList.remove("hidden");
}

// Show auth error
function showAuthError(message) {
    document.getElementById("auth-message").textContent = message;
    document.getElementById("auth-status").style.display = "block";
    document.getElementById("login-buttons").style.display = "none";
    document.getElementById("user-info").style.display = "none";
    document.getElementById("subscription-prompt").style.display = "none";
}

// Show user info (logged in)
function showUserInfo(email) {
    document.getElementById("user-email").textContent = email;
    document.getElementById("user-info").style.display = "block";
    document.getElementById("login-buttons").style.display = "none";
    document.getElementById("auth-status").style.display = "none";
    document.getElementById("subscription-prompt").style.display = "none";
}

// Show subscription prompt
function showSubscriptionPrompt(email) {
    document.getElementById("user-email").textContent = email;
    document.getElementById("user-info").style.display = "block";
    document.getElementById("subscription-prompt").style.display = "block";
    document.getElementById("login-buttons").style.display = "none";
    document.getElementById("auth-status").style.display = "none";
    document.getElementById("paywall").classList.remove("hidden");
}

// Hide paywall and show app
function hidePaywall() {
    const paywall = document.getElementById("paywall");
    if (paywall) {
        paywall.classList.add("hidden");
    }
}

// Global access state - tracks if user has valid access
let userHasAccess = false;

// Re-check access and enforce paywall
async function enforceAccess() {
    const paywall = document.getElementById("paywall");
    
    // Always verify access with server
    await checkAuthAndSubscription();
    
    // If paywall was removed, restore it if user doesn't have access
    if (!userHasAccess && paywall && paywall.classList.contains("hidden")) {
        paywall.classList.remove("hidden");
        showLoginPrompt();
    }
}

// MutationObserver to detect if paywall is removed from DOM
function setupPaywallProtection() {
    const paywall = document.getElementById("paywall");
    if (!paywall) return;
    
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            // Check if paywall was removed
            if (mutation.type === 'childList') {
                mutation.removedNodes.forEach((node) => {
                    if (node === paywall || (node.nodeType === 1 && node.id === 'paywall')) {
                        console.warn("⚠️ Paywall removed - restoring security check");
                        if (!userHasAccess) {
                            // Recreate paywall if removed
                            setTimeout(() => {
                                enforceAccess();
                            }, 100);
                        }
                    }
                });
            }
            
            // Check if paywall class was changed to hide it without permission
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const target = mutation.target;
                if (target.id === 'paywall' && target.classList.contains('hidden') && !userHasAccess) {
                    console.warn("⚠️ Paywall hidden without access - restoring");
                    setTimeout(() => {
                        enforceAccess();
                    }, 100);
                }
            }
        });
    });
    
    // Observe the paywall element and its parent
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
    });
    
    // Also observe the paywall directly
    observer.observe(paywall, {
        attributes: true,
        attributeFilter: ['class', 'style'],
        childList: true
    });
}

// Periodic access verification (every 30 seconds)
function startPeriodicAccessCheck() {
    setInterval(async () => {
        if (!userHasAccess) {
            await enforceAccess();
        } else {
            // Even if access is granted, verify periodically
            await checkAuthAndSubscription();
        }
    }, 30000); // Check every 30 seconds
}

// ===========================
// AUTHENTICATION FUNCTIONS
// ===========================

// Sign in with Google (TODO: Implement with GitHub API)
async function signInWithGoogle() {
    alert("Google login er ikke implementert ennå. Bruk Microsoft login for nå.");
    // TODO: Implement Google OAuth with GitHub API integration
}

// Sign in with GitHub (TODO: Implement with GitHub API)
async function signInWithGitHub() {
    alert("GitHub login er ikke implementert ennå. Bruk Microsoft login for nå.");
    // TODO: Implement GitHub OAuth with GitHub API integration
}

// Sign in with Email (TODO: Implement with GitHub API)
async function signInWithEmail() {
    alert("E-post login er ikke implementert ennå. Bruk Microsoft login for nå.");
    // TODO: Implement email/password auth with GitHub API integration
}

// Show signup modal
function showSignupModal() {
    const modal = document.getElementById("signup-modal");
    if (modal) {
        modal.classList.remove("hidden");
        // Clear form
        document.getElementById("signup-form").reset();
        document.getElementById("signup-error").style.display = "none";
    }
}

// Hide signup modal
function hideSignupModal() {
    const modal = document.getElementById("signup-modal");
    if (modal) {
        modal.classList.add("hidden");
    }
}

// Handle signup form submission (TODO: Implement with GitHub API)
async function handleSignup(event) {
    event.preventDefault();
    showSignupError("E-post registrering er ikke implementert ennå. Bruk Microsoft login for nå.");
    // TODO: Implement email/password signup with GitHub API integration
}

// Create user profile (REMOVED - Supabase function, will be replaced with GitHub API)
// TODO: Implement createUserInGitHub() function

// Show signup error message
function showSignupError(message) {
    const errorDiv = document.getElementById("signup-error");
    if (errorDiv) {
        if (message) {
            errorDiv.textContent = message;
            errorDiv.style.display = "block";
        } else {
            errorDiv.textContent = "";
            errorDiv.style.display = "none";
        }
    }
}

// Sign out
async function signOut() {
    // Sign out from Microsoft if logged in
    if (microsoftAccount) {
        await signOutMicrosoft();
    }
    
    // Clear local data
    localStorage.removeItem("abonnent");
    userHasAccess = false;
    
    // Show login prompt
    showLoginPrompt();
}

// ===========================
// PRODUCT SELECTION
// ===========================

// Fetch products from Stripe API via Supabase Edge Function
async function fetchStripeProducts() {
    if (typeof DEBUG !== 'undefined') {
        DEBUG.time('fetchStripeProducts');
        DEBUG.api('Stripe', 'fetchProducts', {});
    }
    
    try {
        // Check if Supabase config is available
        if (!SUPABASE_CONFIG || !SUPABASE_CONFIG.url) {
            throw new Error('Supabase configuration not found');
        }

        // Call Supabase Edge Function to fetch Stripe products
        const edgeFunctionUrl = `${SUPABASE_CONFIG.url}/functions/v1/fetch-stripe-products`;
        
        if (typeof DEBUG !== 'undefined') {
            DEBUG.network('GET', edgeFunctionUrl, {});
        }

        const response = await fetch(edgeFunctionUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // Include Supabase anon key if configured (optional for this endpoint)
                ...(SUPABASE_CONFIG.anonKey && SUPABASE_CONFIG.anonKey !== 'YOUR_SUPABASE_ANON_KEY_HERE' 
                    ? { 'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}` }
                    : {})
            }
        });

        if (typeof DEBUG !== 'undefined') {
            DEBUG.network('GET', edgeFunctionUrl, { status: response.status });
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(`Failed to fetch products: ${response.status} ${errorData.error || response.statusText}`);
        }

        const data = await response.json();
        
        // Edge Function returns { products: [...], count: N }
        const products = data.products || [];
        
        if (typeof DEBUG !== 'undefined') {
            DEBUG.api('Stripe', 'fetchProductsSuccess', { 
                count: products.length,
                productIds: products.map(p => p.id)
            });
            DEBUG.timeEnd('fetchStripeProducts');
        }
        
        return products;
    } catch (error) {
        console.error("Error fetching Stripe products:", error);
        if (typeof DEBUG !== 'undefined') {
            DEBUG.error('Error fetching Stripe products', { 
                error: error.message,
                stack: error.stack 
            });
            DEBUG.timeEnd('fetchStripeProducts');
        }
        return [];
    }
}

// Show product selection page
async function showProductSelection() {
    const container = document.getElementById('products-container');
    
    // Show loading state
    container.innerHTML = '<p style="text-align: center; padding: 2rem;">Laster produkter...</p>';
    document.getElementById('product-selection').classList.remove('hidden');
    
    try {
        // Fetch products from API
        const products = await fetchStripeProducts();
        
        if (!products || products.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <p style="color: #dc3545;">Ingen produkter tilgjengelig.</p>
                    <p style="color: #666; margin-top: 1rem;">Vennligst kontakt support.</p>
                </div>
            `;
            return;
        }

        // Clear loading state
        container.innerHTML = '';
        
        // Display products
        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            // Format price for display
            const priceDisplay = formatPrice(product.price);
            
            // Get payment link (from product metadata or construct from price)
            const paymentLink = product.paymentLink || constructPaymentLink(product);
            const productId = product.id || '';
            const hasPaymentLink = paymentLink && paymentLink.trim() !== '';
            
            // Escape payment link for use in onclick
            const escapedPaymentLink = hasPaymentLink ? paymentLink.replace(/'/g, "\\'") : '';
            
            // Create button - disabled if no payment link
            const buttonHTML = hasPaymentLink
                ? `<button class="choose-button" onclick="selectProduct('${escapedPaymentLink}', '${productId}')">Velg</button>`
                : `<button class="choose-button" disabled style="opacity: 0.5; cursor: not-allowed;" title="Betalinglenke ikke konfigurert">Ikke tilgjengelig</button>`;
            
            card.innerHTML = `
                <div class="product-name">${product.name || 'Abonnement'}</div>
                <div class="product-price">${priceDisplay}</div>
                <div class="product-description">${product.description || ''}</div>
                ${!hasPaymentLink ? '<p style="color: #dc3545; font-size: 0.9rem; margin-top: 0.5rem;">⚠️ Betalinglenke mangler</p>' : ''}
                ${buttonHTML}
            `;
            container.appendChild(card);
        });
        
    } catch (error) {
        console.error("Error loading products:", error);
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <p style="color: #dc3545;">Feil ved lasting av produkter.</p>
                <p style="color: #666; margin-top: 1rem;">${error.message}</p>
                <button onclick="showProductSelection()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Prøv igjen
                </button>
            </div>
        `;
    }
}

// Format price for display (convert from cents to currency)
function formatPrice(priceData) {
    if (!priceData) return 'Pris ikke tilgjengelig';
    
    // If priceData is an object with amount and currency
    if (typeof priceData === 'object') {
        const amount = priceData.unit_amount || priceData.amount || 0;
        const currency = priceData.currency || 'nok';
        const formatted = (amount / 100).toLocaleString('no-NO');
        return `${formatted} ${currency.toUpperCase()}`;
    }
    
    // If it's already a string, return as is
    if (typeof priceData === 'string') {
        return priceData;
    }
    
    // If it's a number (in cents), convert
    if (typeof priceData === 'number') {
        return `${(priceData / 100).toLocaleString('no-NO')} NOK`;
    }
    
    return 'Pris ikke tilgjengelig';
}

// Construct payment link from product/price data
// Note: This requires Payment Links to be created in Stripe and stored in product metadata
function constructPaymentLink(product) {
    // If payment link is in metadata, use it
    if (product.metadata && product.metadata.payment_link) {
        return product.metadata.payment_link;
    }
    
    // Otherwise, we need to create Payment Links in Stripe and store them
    // For now, return empty - user needs to set up Payment Links
    console.warn("Payment link not found for product:", product.id);
    return '';
}

// Close product selection
function closeProductSelection() {
    document.getElementById('product-selection').classList.add('hidden');
}

// Select product and redirect to Stripe Payment Link
async function selectProduct(paymentLink) {
    if (typeof DEBUG !== 'undefined') {
        DEBUG.time('selectProduct');
        DEBUG.payment('Stripe', 'selectProduct', { paymentLink: paymentLink ? 'configured' : 'missing' });
    }
    
    if (!paymentLink || paymentLink.includes('...') || paymentLink.includes('XXXXXXXX')) {
        alert("Betalinglenke ikke konfigurert. Vennligst kontakt support.");
        console.error("Payment link not configured:", paymentLink);
        if (typeof DEBUG !== 'undefined') {
            DEBUG.error('Payment link not configured', { paymentLink });
            DEBUG.timeEnd('selectProduct');
        }
        return;
    }
    
    // Get user email from Microsoft account to pass to Stripe
    let userEmail = null;
    
    if (microsoftAccount) {
        userEmail = microsoftAccount.username || microsoftAccount.name;
    }
    
    if (typeof DEBUG !== 'undefined') {
        DEBUG.payment('Stripe', 'prepareCheckout', { userEmail, hasAccount: !!microsoftAccount });
    }
    
    // Add user metadata to payment link (if user is logged in)
    // This helps Stripe identify the customer
    let finalPaymentLink = paymentLink;
    
    if (userEmail) {
        // Add user info as URL parameters (Stripe Payment Links support this)
        const separator = paymentLink.includes('?') ? '&' : '?';
        finalPaymentLink = `${paymentLink}${separator}client_reference_id=${encodeURIComponent(userEmail)}&prefilled_email=${encodeURIComponent(userEmail)}`;
    }
    
    console.log("Redirecting to Stripe Payment Link:", finalPaymentLink);
    
    // Redirect to Stripe Payment Link
    if (typeof DEBUG !== 'undefined') {
        DEBUG.payment('Stripe', 'redirectToCheckout', { 
            paymentLink: finalPaymentLink.substring(0, 50) + '...',
            userEmail 
        });
        DEBUG.timeEnd('selectProduct');
    }
    window.location.href = finalPaymentLink;
}

// Poll for subscription status after payment
// TODO: Implement with GitHub API
async function pollForSubscription(maxAttempts = 12) {
    if (!microsoftAccount) return;
    
    const userEmail = microsoftAccount.username || microsoftAccount.name;
    
    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds between attempts
        
        // TODO: Check subscription status from GitHub API
        // const subscriptionCheck = await checkUserSubscription(userEmail);
        // if (subscriptionCheck.hasAccess) {
        //     console.log("✅ Subscription active!");
        //     showAuthError("Tilgang aktivert! Velkommen!");
        //     setTimeout(() => {
        //         showAuthError("");
        //     }, 3000);
        //     await checkAuthAndSubscription();
        //     return;
        // }
        
        console.log(`Polling attempt ${i + 1}/${maxAttempts}...`);
    }
    
    // If we get here, polling didn't find active subscription
    showAuthError("Betalingen er registrert, men det kan ta noen minutter før tilgangen aktiveres. Prøv å oppdatere siden om litt.");
}

// ===========================
// USER SETTINGS
// ===========================

async function showSettingsModal() {
    if (!microsoftAccount) return;
    
    const userEmail = microsoftAccount.username || microsoftAccount.name;
    
    // TODO: Load subscription info from GitHub API
    // const user = await getUserFromGitHub(userEmail);
    // if (user && user.subscription) {
    //     const endDate = user.subscription.endDate 
    //         ? new Date(user.subscription.endDate).toLocaleDateString('no-NO')
    //         : 'N/A';
    //     document.getElementById('subscription-info').innerHTML = `
    //         <strong>Status:</strong> ${user.subscription.status}<br>
    //         <strong>Slutter:</strong> ${endDate}
    //     `;
    // } else {
    //     document.getElementById('subscription-info').innerHTML = 'Ingen abonnement funnet.';
    // }
    
    document.getElementById('subscription-info').innerHTML = 'Innstillinger kommer snart.';
    document.getElementById('settings-modal').classList.remove('hidden');
}

function closeSettingsModal() {
    document.getElementById('settings-modal').classList.add('hidden');
}


// ===========================
// INITIALIZE AUTH ON PAGE LOAD
// ===========================

document.addEventListener("DOMContentLoaded", async () => {
    // Check for return from Stripe Payment Link
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('payment_success');
    
    if (paymentSuccess === 'true') {
        // Payment completed - trigger subscription check
        console.log("Payment successful, checking subscription...");
        
        // Show message to user
        showAuthError("Betaling mottatt! Vent mens vi oppdaterer din tilgang...");
        
        // TODO: Check subscription from GitHub API
        // For now, poll for subscription status
        if (microsoftAccount) {
            await pollForSubscription(12);
        } else {
            showLoginPrompt();
            showAuthError("Vennligst logg inn for å aktivere din tilgang.");
        }
        
        // Remove query param
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }

    // Check for old Stripe checkout session_id (backward compatibility)
    const sessionId = urlParams.get('session_id');
    if (sessionId) {
        // Payment successful - refresh subscription status
        console.log("Payment successful, refreshing subscription status...");
        // Remove session_id from URL
        window.history.replaceState({}, document.title, window.location.pathname);
        // Check auth and subscription (will show updated status)
        await checkAuthAndSubscription();
        return;
    }

    // Normal page load - check auth immediately
    await checkAuthAndSubscription();
    
    // Data is loaded from localStorage on page load

    // Auth state changes are now handled by Microsoft OAuth directly
    // No Supabase auth state listener needed
    
    // Setup security measures
    setupPaywallProtection();
    startPeriodicAccessCheck();
});

// ---------------------------------------------------------------------
// BACKEND CONFIG (added)
// ---------------------------------------------------------------------
const API_BASE = "http://127.0.0.1:5000"; // change if your server runs elsewhere

// Fetch all inntekter from backend and map into local arrays
async function loadInntekterFromBackend() {
    try {
        const res = await fetch(`${API_BASE}/inntekter`);
        if (!res.ok) throw new Error("Failed fetching inntekter");
        const rows = await res.json();

        // Reset local arrays for inntekter
        inntekter = [];
        inntektsDatoer = [];
        inntektsBeskrivelser = [];

        // Map rows -> your frontend arrays
        rows.forEach(r => {
            // backend uses fields: id, amount, date, description
            inntekter.push(parseFloat(r.amount));
            inntektsDatoer.push(r.date || "");
            inntektsBeskrivelser.push(r.description || "");
        });

        // save locally too, so other code keeps working
        lagreData();
        oppdaterListe("inntekter-list", inntekter, inntektsBeskrivelser, "inntekter");
    } catch (err) {
        console.error("Could not load inntekter from backend:", err);
    }
}

// Add a single inntekt to backend
async function backendLeggTilInntekt(amount, date, description) {
    try {
        const res = await fetch(`${API_BASE}/inntekter`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ amount, date, description })
        });
        if (!res.ok) throw new Error("Failed to add inntekt");
        return await res.json();
    } catch (err) {
        console.error("backend add error:", err);
        throw err;
    }
}

// Bulk sync existing local inntekter -> backend
// expects to be called manually if you want to push older local entries
async function backendSyncLocalInntekter() {
    // prepare array of objects
    const payload = inntekter.map((amt, i) => ({
        amount: amt,
        date: inntektsDatoer[i] || "",
        description: inntektsBeskrivelser[i] || ""
    }));

    try {
        const res = await fetch(`${API_BASE}/inntekter/bulk`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Bulk sync failed");
        return await res.json();
    } catch (err) {
        console.error("bulk sync error:", err);
        throw err;
    }
}

// Delete inntekt by id is not wired to UI in this version, because your frontend uses indexes.
// (If you display ids in the UI later we can wire DELETE.)

// ========================================================================
// Initiering av datastrukturer fra localStorage med fallback
// ========================================================================
let inntekter = JSON.parse(localStorage.getItem("inntekter")) || [];
let utgifter = JSON.parse(localStorage.getItem("utgifter")) || [];
let skyldnere = JSON.parse(localStorage.getItem("skyldnere")) || [];
let skyldBeløp = JSON.parse(localStorage.getItem("skyldBeløp")) || [];
let skyldStatus = JSON.parse(localStorage.getItem("skyldStatus")) || [];
let betalingsDatoer = JSON.parse(localStorage.getItem("betalingsDatoer")) || [];
let egenkapitalHistorikk = JSON.parse(localStorage.getItem("egenkapitalHistorikk")) || [];
let datoer = JSON.parse(localStorage.getItem("datoer")) || [];
let inntektsDatoer = JSON.parse(localStorage.getItem("inntektsDatoer")) || [];
let utgiftsDatoer = JSON.parse(localStorage.getItem("utgiftsDatoer")) || [];
let inntektsBeskrivelser = JSON.parse(localStorage.getItem("inntektsBeskrivelser")) || [];
let utgiftsBeskrivelser = JSON.parse(localStorage.getItem("utgiftsBeskrivelser")) || [];
let andeler = parseInt(localStorage.getItem("andeler")) || 0;
let andelVerdi = parseFloat(localStorage.getItem("andelVerdi")) || 0;
let oppstartstid = localStorage.getItem("oppstartstid") || "";
let avviklingstid = localStorage.getItem("avviklingstid") || "";

// Diagramobjekter
let egenkapitalChart = null;
let budsjettChart = null;

// ========================================================================
// Når siden er ferdig lastet
// ========================================================================
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("andeler").value = andeler;
    document.getElementById("andelVerdi").value = andelVerdi;
    document.getElementById("start").value = oppstartstid;
    document.getElementById("end").value = avviklingstid;

    // Load inntekter from backend first; if backend is unavailable, fallback to local
    loadInntekterFromBackend().catch(() => {
        // If fail, use localStorage-stored inntekter (already in arrays)
        oppdaterListe("inntekter-list", inntekter, inntektsBeskrivelser, "inntekter");
    });

    oppdaterListe("utgifter-list", utgifter, utgiftsBeskrivelser, "utgifter");
    oppdaterListeSkyldnere();
    oppdaterEgenkapitalGraf();
});

// ========================================================================
// Lagre oppstart og avvikling ved endring
// ========================================================================
document.getElementById("start").addEventListener("change", function() {
    oppstartstid = this.value;
    localStorage.setItem("oppstartstid", oppstartstid);
});
document.getElementById("end").addEventListener("change", function() {
    avviklingstid = this.value;
    localStorage.setItem("avviklingstid", avviklingstid);
});

// ========================================================================
// Legg til inntekt
// ========================================================================
async function leggTilInntekt() {
    if (typeof DEBUG !== 'undefined') {
        DEBUG.time('leggTilInntekt');
        DEBUG.log('Adding income entry');
    }
    
    // Security check
    try {
        await requireAccess();
    } catch (error) {
        if (typeof DEBUG !== 'undefined') {
            DEBUG.error('Access denied for leggTilInntekt', { error: error.message });
        }
        alert(error.message);
        return;
    }
    let inntekt = parseFloat(document.getElementById("nyInntekt").value);
    let inntektDato = document.getElementById("inntektDato").value;
    let inntektBeskrivelse = document.getElementById("inntektBeskrivelse").value.trim();

    if (isNaN(inntekt) || inntekt <= 0) { 
        if (typeof DEBUG !== 'undefined') {
            DEBUG.warn('Invalid income amount', { inntekt });
        }
        alert("Vennligst oppgi en gyldig inntekt."); 
        return; 
    }
    if (!inntektDato) { 
        if (typeof DEBUG !== 'undefined') {
            DEBUG.warn('Missing income date');
        }
        alert("Vennligst velg en dato for inntekten."); 
        return; 
    }

    if (typeof DEBUG !== 'undefined') {
        DEBUG.log('Income entry data', { inntekt, inntektDato, inntektBeskrivelse });
    }

    // Try to send to backend first
    try {
        await backendLeggTilInntekt(inntekt, inntektDato, inntektBeskrivelse);

        // After backend insert, reload from backend to get canonical data
        await loadInntekterFromBackend();
        
        if (typeof DEBUG !== 'undefined') {
            DEBUG.log('Income added via backend');
            DEBUG.timeEnd('leggTilInntekt');
        }
    } catch (err) {
        // If backend fails, fallback to localStorage (keeps app usable offline)
        console.warn("Falling back to localStorage for inntekt because backend failed.");
        if (typeof DEBUG !== 'undefined') {
            DEBUG.warn('Backend failed, using localStorage fallback', { error: err.message });
        }
        inntekter.push(inntekt);
        inntektsDatoer.push(inntektDato);
        inntektsBeskrivelser.push(inntektBeskrivelse);

        lagreData();
        oppdaterListe("inntekter-list", inntekter, inntektsBeskrivelser, "inntekter");
        
        if (typeof DEBUG !== 'undefined') {
            DEBUG.timeEnd('leggTilInntekt');
        }
    }

    document.getElementById("nyInntekt").value = "";
    document.getElementById("inntektDato").value = "";
    document.getElementById("inntektBeskrivelse").value = "";
}

// ========================================================================
// Legg til utgift
// (unchanged — still local storage)
// ========================================================================
// Check if user has access before allowing function execution
async function requireAccess() {
    if (!userHasAccess) {
        await enforceAccess();
        throw new Error("Tilgang nødvendig. Vennligst logg inn og abonner.");
    }
    // Verify session is still valid
    if (supabaseClient) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            userHasAccess = false;
            showLoginPrompt();
            throw new Error("Sesjon utløpt. Vennligst logg inn på nytt.");
        }
    }
} 

async function leggTilUtgift() {
    if (typeof DEBUG !== 'undefined') {
        DEBUG.time('leggTilUtgift');
        DEBUG.log('Adding expense entry');
    }
    
    // Security check
    try {
        await requireAccess();
    } catch (error) {
        if (typeof DEBUG !== 'undefined') {
            DEBUG.error('Access denied for leggTilUtgift', { error: error.message });
        }
        alert(error.message);
        return;
    }
    let utgift = parseFloat(document.getElementById("nyUtgift").value);
    let utgiftDato = document.getElementById("utgiftDato").value;
    let utgiftBeskrivelse = document.getElementById("utgiftBeskrivelse").value.trim();

    if (isNaN(utgift) || utgift <= 0) { 
        if (typeof DEBUG !== 'undefined') {
            DEBUG.warn('Invalid expense amount', { utgift });
        }
        alert("Vennligst oppgi en gyldig utgift."); 
        return; 
    }
    if (!utgiftDato) { 
        if (typeof DEBUG !== 'undefined') {
            DEBUG.warn('Missing expense date');
        }
        alert("Vennligst velg en dato for utgiften."); 
        return; 
    }

    if (typeof DEBUG !== 'undefined') {
        DEBUG.log('Expense entry data', { utgift, utgiftDato, utgiftBeskrivelse });
    }

    utgifter.push(utgift);
    utgiftsDatoer.push(utgiftDato);
    utgiftsBeskrivelser.push(utgiftBeskrivelse);

    lagreData();
    oppdaterListe("utgifter-list", utgifter, utgiftsBeskrivelser, "utgifter");

    document.getElementById("nyUtgift").value = "";
    document.getElementById("utgiftDato").value = "";
    document.getElementById("utgiftBeskrivelse").value = "";
    
    if (typeof DEBUG !== 'undefined') {
        DEBUG.log('Expense added successfully');
        DEBUG.timeEnd('leggTilUtgift');
    }
}

// ========================================================================
// Legg til skyldner
// ========================================================================
function leggTilSkyldner() {
    const navn = document.getElementById("skyldnerNavn").value.trim();
    const belop = parseFloat(document.getElementById("skyldnerBeløp").value);

    if (!navn || isNaN(belop) || belop <= 0) { alert("Vennligst oppgi både gyldig navn og beløp."); return; }

    skyldnere.push(navn);
    skyldBeløp.push(belop);
    skyldStatus.push(false);
    betalingsDatoer.push("");

    lagreData();
    oppdaterListeSkyldnere();

    document.getElementById("skyldnerNavn").value = "";
    document.getElementById("skyldnerBeløp").value = "";
}

// ========================================================================
// Oppdater liste over skyldnere
// ========================================================================
function oppdaterListeSkyldnere() {
    const container = document.getElementById("skyldnere-list");
    container.innerHTML = "";

    for (let i = 0; i < skyldnere.length; i++) {
        const div = document.createElement("div");
        div.style.marginBottom = "10px";

        const p = document.createElement("span");
        let tekst = `${skyldnere[i]} skylder deg ${skyldBeløp[i]} kr`;
        if (skyldStatus[i]) tekst += ` (Betalt: ${betalingsDatoer[i]})`;
        p.textContent = tekst;
        p.style.color = skyldStatus[i] ? "green" : "black";
        p.style.marginRight = "10px";

        const slettKnapp = document.createElement("button");
        slettKnapp.textContent = "Slett";
        slettKnapp.style.marginRight = "5px";
        slettKnapp.onclick = () => slettSkyldner(i);

        const betaltKnapp = document.createElement("button");
        betaltKnapp.textContent = skyldStatus[i] ? "Marker som ikke betalt" : "Marker som betalt";
        betaltKnapp.onclick = () => markerSomBetalt(i);

        div.appendChild(p);
        div.appendChild(slettKnapp);
        div.appendChild(betaltKnapp);

        container.appendChild(div);
    }
}

// ========================================================================
// Toggle skyldner status med betalingsdato
// ========================================================================
function markerSomBetalt(index) {
    if (!skyldStatus[index]) {
        let dato = prompt("Skriv inn betalingsdato (YYYY-MM-DD):", new Date().toISOString().slice(0,10));
        if (dato) {
            betalingsDatoer[index] = dato;
            skyldStatus[index] = true;
        }
    } else {
        skyldStatus[index] = false;
        betalingsDatoer[index] = "";
    }
    lagreData();
    oppdaterListeSkyldnere();
}

// ========================================================================
// Slett skyldner
// ========================================================================
function slettSkyldner(index) {
    skyldnere.splice(index, 1);
    skyldBeløp.splice(index, 1);
    skyldStatus.splice(index, 1);
    betalingsDatoer.splice(index, 1);
    lagreData();
    oppdaterListeSkyldnere();
}

// ========================================================================
// Oppdater liste inntekter/utgifter
// ========================================================================
function oppdaterListe(elementId, liste, beskrivelser, type) {
    let container = document.getElementById(elementId);
    container.innerHTML = liste.map((item, index) => {
        let dato = type === "inntekter" ? inntektsDatoer[index] : utgiftsDatoer[index];
        let beskrivelse = type === "inntekter" ? inntektsBeskrivelser[index] : utgiftsBeskrivelser[index];
        return `<p>${item} kr (Beskrivelse: ${beskrivelse}, Dato: ${dato})
                <button onclick="slettElement(${index}, '${type}')">Slett</button></p>`;
    }).join("");
}

// ========================================================================
// Slett element fra inntekter/utgifter
// Note: deleting from backend requires knowing the backend row id.
// Current UI deletes by index and will delete locally; backend deletion not wired.
// ========================================================================
function slettElement(index, type) {
    if (type === "inntekter") {
        inntekter.splice(index,1); inntektsDatoer.splice(index,1); inntektsBeskrivelser.splice(index,1);
    } else {
        utgifter.splice(index,1); utgiftsDatoer.splice(index,1); utgiftsBeskrivelser.splice(index,1);
    }
    lagreData();
    oppdaterListe(type === "inntekter" ? "inntekter-list":"utgifter-list", 
                  type === "inntekter" ? inntekter : utgifter, 
                  type === "inntekter" ? inntektsBeskrivelser : utgiftsBeskrivelser,
                  type);
}

// ========================================================================
// Lagre alt på localStorage og OneDrive (hvis Microsoft auth)
// ========================================================================
async function lagreData() {
    // Always save to localStorage as backup
    localStorage.setItem("inntekter", JSON.stringify(inntekter));
    localStorage.setItem("utgifter", JSON.stringify(utgifter));
    localStorage.setItem("skyldnere", JSON.stringify(skyldnere));
    localStorage.setItem("skyldBeløp", JSON.stringify(skyldBeløp));
    localStorage.setItem("skyldStatus", JSON.stringify(skyldStatus));
    localStorage.setItem("betalingsDatoer", JSON.stringify(betalingsDatoer));
    localStorage.setItem("egenkapitalHistorikk", JSON.stringify(egenkapitalHistorikk));
    localStorage.setItem("datoer", JSON.stringify(datoer));
    localStorage.setItem("inntektsDatoer", JSON.stringify(inntektsDatoer));
    localStorage.setItem("utgiftsDatoer", JSON.stringify(utgiftsDatoer));
    localStorage.setItem("inntektsBeskrivelser", JSON.stringify(inntektsBeskrivelser));
    localStorage.setItem("utgiftsBeskrivelser", JSON.stringify(utgiftsBeskrivelser));
    localStorage.setItem("andeler", andeler);
    localStorage.setItem("andelVerdi", andelVerdi);
    localStorage.setItem("oppstartstid", oppstartstid);
    localStorage.setItem("avviklingstid", avviklingstid);
    
    // Also save to OneDrive if using Microsoft auth (hybrid approach)
    if (microsoftAccount) {
        try {
            await saveAllDataToOneDrive();
        } catch (error) {
            console.warn("Failed to save to OneDrive, using localStorage only:", error);
        }
    }
}

// ========================================================================
// Beregn budsjett, andeler, egenkapital
// ========================================================================
async function beregnBudsjett() {
    if (typeof DEBUG !== 'undefined') {
        DEBUG.time('beregnBudsjett');
        DEBUG.log('Calculating budget');
    }
    
    // Security check
    try {
        await requireAccess();
    } catch (error) {
        if (typeof DEBUG !== 'undefined') {
            DEBUG.error('Access denied for beregnBudsjett', { error: error.message });
        }
        alert(error.message);
        return;
    }
    const totalInntekter = inntekter.reduce((sum,val)=>sum+val,0);
    const totalUtgifter = utgifter.reduce((sum,val)=>sum+val,0);

    andeler = parseInt(document.getElementById("andeler").value) || 0;
    andelVerdi = parseFloat(document.getElementById("andelVerdi").value) || 0;

    const nettoResultat = totalInntekter - totalUtgifter;
    const totalAndelVerdi = andeler * andelVerdi;
    const egenkapital = nettoResultat + totalAndelVerdi;
    
    if (typeof DEBUG !== 'undefined') {
        DEBUG.log('Budget calculation results', {
            totalInntekter,
            totalUtgifter,
            nettoResultat,
            andeler,
            andelVerdi,
            totalAndelVerdi,
            egenkapital
        });
    }

    document.getElementById("resultat").innerHTML = `
        <strong>Netto resultat:</strong> ${nettoResultat} kr <br>
        <strong>Totalt andelverdi:</strong> ${totalAndelVerdi} kr <br>
        <strong>Egenkapital:</strong> ${egenkapital} kr`;
    document.getElementById("resultat").style.color = egenkapital<0 ? "red":"green";

    datoer.push(new Date().toLocaleDateString());
    egenkapitalHistorikk.push(egenkapital);

    lagreData();
    oppdaterDiagram(totalInntekter,totalUtgifter);
    oppdaterEgenkapitalGraf();
}

// ========================================================================
// Diagrammer
// ========================================================================
function oppdaterDiagram(inntekter, utgifter) {
    let ctx = document.getElementById("budsjettChart").getContext("2d");
    if(budsjettChart) budsjettChart.destroy();
    budsjettChart = new Chart(ctx,{
        type:"bar",
        data:{
            labels:["Inntekter","Utgifter"],
            datasets:[{
                label:"Økonomisk utvikling",
                data:[inntekter,utgifter],
                backgroundColor:["#4CAF50","#FF5733"],
                borderColor:["#388E3C","#C62828"],
                borderWidth:1
            }]
        },
        options:{responsive:true, scales:{y:{beginAtZero:true,ticks:{callback:value=>value+" kr"}}}}
    });
}

function oppdaterEgenkapitalGraf() {
    let ctx = document.getElementById("egenkapitalChart").getContext("2d");
    if(egenkapitalChart) egenkapitalChart.destroy();
    egenkapitalChart = new Chart(ctx,{
        type:"line",
        data:{
            labels:datoer,
            datasets:[{label:"Egenkapital over tid",data:egenkapitalHistorikk,borderColor:"#2980B9",fill:false}]
        }
    });
}

// ========================================================================
// Eksporter PDF
// ========================================================================
async function eksporterPDF() {
    // Security check
    try {
        await requireAccess();
    } catch (error) {
        alert(error.message);
        return;
    }
    const { jsPDF } = window.jspdf;
    let doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("EB Økonomi",10,10);
    doc.setFontSize(12);
    doc.text(document.getElementById("resultat").innerText,10,20);
    doc.addImage(document.getElementById("budsjettChart").toDataURL("image/png"),"PNG",10,40,180,80);
    doc.addPage();
    doc.addImage(document.getElementById("egenkapitalChart").toDataURL("image/png"),"PNG",10,20,180,80);
    doc.save("EB_Okonomi.pdf");
}

// ========================================================================
// Eksporter Excel
// ========================================================================
async function eksporterExcel() {
    // Security check
    try {
        await requireAccess();
    } catch (error) {
        alert(error.message);
        return;
    }
    let ws = XLSX.utils.json_to_sheet([{
        "Inntekt": inntekter.join(", "),
        "Utgifter": utgifter.join(", "),
        "Egenkapital": egenkapitalHistorikk.join(", "),
        "Datoer": datoer.join(", "),
        "Inntektsdatoer": inntektsDatoer.join(", "),
        "Utgiftsdatoer": utgiftsDatoer.join(", "),
        "Inntektsbeskrivelser": inntektsBeskrivelser.join(", "),
        "Utgiftsbeskrivelser": utgiftsBeskrivelser.join(", "),
        "Andeler": andeler,
        "Andelverdi": andelVerdi,
        "Oppstartstid": oppstartstid,
        "Avviklingstid": avviklingstid
    }]);
    let wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Økonomi");
    XLSX.writeFile(wb,"EB_Okonomi.xlsx");
}

// ========================================================================
// Nullstill alt
// ========================================================================
function nullstillData() {
    if(!confirm("Er du sikker på at du vil nullstille alle data?")) return;
    localStorage.clear();
    inntekter=[]; utgifter=[]; skyldnere=[]; skyldBeløp=[]; skyldStatus=[]; betalingsDatoer=[];
    egenkapitalHistorikk=[]; datoer=[]; inntektsDatoer=[]; utgiftsDatoer=[]; inntektsBeskrivelser=[]; utgiftsBeskrivelser=[];
    andeler=0; andelVerdi=0; oppstartstid=""; avviklingstid="";

    document.getElementById("andeler").value = "";
    document.getElementById("andelVerdi").value = "";
    document.getElementById("start").value = "";
    document.getElementById("end").value = "";

    oppdaterListe("inntekter-list",inntekter,inntektsBeskrivelser,"inntekter");
    oppdaterListe("utgifter-list",utgifter,utgiftsBeskrivelser,"utgifter");
    oppdaterListeSkyldnere();
    document.getElementById("resultat").innerHTML="";
    document.querySelectorAll("input").forEach(input=>input.value="");
    oppdaterEgenkapitalGraf();
}
