// ===========================
// SUPABASE CLIENT INITIALIZATION
// ===========================

// Initialize Supabase client
let supabaseClient = null;

try {
    if (typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) {
        supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        console.log("✅ Supabase client initialized");
    } else {
        console.error("❌ Supabase config not found. Make sure config.js is loaded.");
    }
} catch (error) {
    console.error("❌ Failed to initialize Supabase client:", error);
}

// ===========================
// AUTHENTICATION & PAYWALL
// ===========================

// Check authentication and subscription status
async function checkAuthAndSubscription() {
    if (!supabaseClient) {
        showAuthError("Supabase ikke konfigurert. Sjekk config.js");
        return;
    }

    try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        
        if (sessionError) {
            console.error("Session error:", sessionError);
            showLoginPrompt();
            return;
        }

        if (!session) {
            // No session - show login
            showLoginPrompt();
            return;
        }

        // User is authenticated - check subscription
        const user = session.user;
        console.log("✅ User authenticated:", user.email);

        // Check subscription status from user profile
        const { data: profile, error: profileError } = await supabaseClient
            .from('user_profiles')
            .select('subscription_status, subscription_end_date')
            .eq('id', user.id)
            .single();

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error("Profile error:", profileError);
        }

        const isSubscribed = profile && 
            profile.subscription_status === 'active' && 
            (!profile.subscription_end_date || new Date(profile.subscription_end_date) > new Date());

        if (isSubscribed) {
            // User has active subscription - hide paywall
            hidePaywall();
            showUserInfo(user.email);
        } else {
            // User authenticated but no subscription
            showSubscriptionPrompt(user.email);
        }

    } catch (error) {
        console.error("Auth check error:", error);
        showAuthError("Feil ved autentisering. Prøv igjen.");
    }
}

// Show login prompt
function showLoginPrompt() {
    document.getElementById("auth-status").style.display = "none";
    document.getElementById("login-buttons").style.display = "block";
    document.getElementById("user-info").style.display = "none";
    document.getElementById("subscription-prompt").style.display = "none";
    document.getElementById("paywall").classList.remove("hidden");
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
    document.getElementById("paywall").classList.add("hidden");
}

// ===========================
// AUTHENTICATION FUNCTIONS
// ===========================

// Sign in with Google
async function signInWithGoogle() {
    if (!supabaseClient) {
        alert("Supabase ikke konfigurert");
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + window.location.pathname
            }
        });

        if (error) throw error;
        // User will be redirected to Google, then back to this page
    } catch (error) {
        console.error("Google sign-in error:", error);
        alert("Feil ved innlogging med Google: " + error.message);
    }
}

// Sign in with GitHub
async function signInWithGitHub() {
    if (!supabaseClient) {
        alert("Supabase ikke konfigurert");
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: window.location.origin + window.location.pathname
            }
        });

        if (error) throw error;
        // User will be redirected to GitHub, then back to this page
    } catch (error) {
        console.error("GitHub sign-in error:", error);
        alert("Feil ved innlogging med GitHub: " + error.message);
    }
}

// Sign in with Email (magic link)
async function signInWithEmail() {
    if (!supabaseClient) {
        alert("Supabase ikke konfigurert");
        return;
    }

    const email = prompt("Skriv inn din e-postadresse:");
    if (!email) return;

    try {
        const { data, error } = await supabaseClient.auth.signInWithOtp({
            email: email,
            options: {
                emailRedirectTo: window.location.origin + window.location.pathname
            }
        });

        if (error) throw error;
        alert("Sjekk din e-post for innloggingslenken!");
    } catch (error) {
        console.error("Email sign-in error:", error);
        alert("Feil ved innlogging: " + error.message);
    }
}

// Sign out
async function signOut() {
    if (!supabaseClient) {
        alert("Supabase ikke konfigurert");
        return;
    }

    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        
        // Clear local data
        localStorage.removeItem("abonnent");
        
        // Show login prompt
        showLoginPrompt();
    } catch (error) {
        console.error("Sign out error:", error);
        alert("Feil ved utlogging: " + error.message);
    }
}

// Go to subscription page (placeholder - will be implemented with Stripe)
function goToSubscription() {
    alert("Abonnementsside kommer snart! Dette vil integreres med Stripe/Vipps.");
    // TODO: Redirect to Stripe Checkout or subscription page
}

// ===========================
// INITIALIZE AUTH ON PAGE LOAD
// ===========================

document.addEventListener("DOMContentLoaded", async () => {
    // Check for OAuth callback (handle redirect after OAuth)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.get('access_token')) {
        // OAuth redirect - Supabase will handle this automatically
        // Just check auth status after a short delay
        setTimeout(() => {
            checkAuthAndSubscription();
        }, 500);
    } else {
        // Normal page load - check auth immediately
        await checkAuthAndSubscription();
    }

    // Listen for auth state changes
    if (supabaseClient) {
        supabaseClient.auth.onAuthStateChange((event, session) => {
            console.log("Auth state changed:", event, session?.user?.email);
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                checkAuthAndSubscription();
            } else if (event === 'SIGNED_OUT') {
                showLoginPrompt();
            }
        });
    }
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
    let inntekt = parseFloat(document.getElementById("nyInntekt").value);
    let inntektDato = document.getElementById("inntektDato").value;
    let inntektBeskrivelse = document.getElementById("inntektBeskrivelse").value.trim();

    if (isNaN(inntekt) || inntekt <= 0) { alert("Vennligst oppgi en gyldig inntekt."); return; }
    if (!inntektDato) { alert("Vennligst velg en dato for inntekten."); return; }

    // Try to send to backend first
    try {
        await backendLeggTilInntekt(inntekt, inntektDato, inntektBeskrivelse);

        // After backend insert, reload from backend to get canonical data
        await loadInntekterFromBackend();
    } catch (err) {
        // If backend fails, fallback to localStorage (keeps app usable offline)
        console.warn("Falling back to localStorage for inntekt because backend failed.");
        inntekter.push(inntekt);
        inntektsDatoer.push(inntektDato);
        inntektsBeskrivelser.push(inntektBeskrivelse);

        lagreData();
        oppdaterListe("inntekter-list", inntekter, inntektsBeskrivelser, "inntekter");
    }

    document.getElementById("nyInntekt").value = "";
    document.getElementById("inntektDato").value = "";
    document.getElementById("inntektBeskrivelse").value = "";
}

// ========================================================================
// Legg til utgift
// (unchanged — still local storage)
// ========================================================================
function leggTilUtgift() {
    let utgift = parseFloat(document.getElementById("nyUtgift").value);
    let utgiftDato = document.getElementById("utgiftDato").value;
    let utgiftBeskrivelse = document.getElementById("utgiftBeskrivelse").value.trim();

    if (isNaN(utgift) || utgift <= 0) { alert("Vennligst oppgi en gyldig utgift."); return; }
    if (!utgiftDato) { alert("Vennligst velg en dato for utgiften."); return; }

    utgifter.push(utgift);
    utgiftsDatoer.push(utgiftDato);
    utgiftsBeskrivelser.push(utgiftBeskrivelse);

    lagreData();
    oppdaterListe("utgifter-list", utgifter, utgiftsBeskrivelser, "utgifter");

    document.getElementById("nyUtgift").value = "";
    document.getElementById("utgiftDato").value = "";
    document.getElementById("utgiftBeskrivelse").value = "";
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
// Lagre alt på localStorage
// ========================================================================
function lagreData() {
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
}

// ========================================================================
// Beregn budsjett, andeler, egenkapital
// ========================================================================
function beregnBudsjett() {
    const totalInntekter = inntekter.reduce((sum,val)=>sum+val,0);
    const totalUtgifter = utgifter.reduce((sum,val)=>sum+val,0);

    andeler = parseInt(document.getElementById("andeler").value) || 0;
    andelVerdi = parseFloat(document.getElementById("andelVerdi").value) || 0;

    const nettoResultat = totalInntekter - totalUtgifter;
    const totalAndelVerdi = andeler * andelVerdi;
    const egenkapital = nettoResultat + totalAndelVerdi;

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
function eksporterPDF() {
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
function eksporterExcel() {
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
