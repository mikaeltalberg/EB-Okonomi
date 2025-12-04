// ===========================
// ABONNEMENTS-BLOKKAJE
// ===========================

function sjekkPassord() {
    const riktigKode = "hemmelig123"; // 🔐 Endre dette til det du vil!
    const skrevet = document.getElementById("passord").value;

    if (skrevet === riktigKode) {
        document.getElementById("paywall").classList.add("hidden");
        localStorage.setItem("abonnent", "true");
    } else {
        alert("Feil kode");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("abonnent") === "true") {
        document.getElementById("paywall").classList.add("hidden");
    }
});

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

    oppdaterListe("inntekter-list", inntekter, inntektsBeskrivelser, "inntekter");
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
function leggTilInntekt() {
    let inntekt = parseFloat(document.getElementById("nyInntekt").value);
    let inntektDato = document.getElementById("inntektDato").value;
    let inntektBeskrivelse = document.getElementById("inntektBeskrivelse").value.trim();

    if (isNaN(inntekt) || inntekt <= 0) { alert("Vennligst oppgi en gyldig inntekt."); return; }
    if (!inntektDato) { alert("Vennligst velg en dato for inntekten."); return; }

    inntekter.push(inntekt);
    inntektsDatoer.push(inntektDato);
    inntektsBeskrivelser.push(inntektBeskrivelse);

    lagreData();
    oppdaterListe("inntekter-list", inntekter, inntektsBeskrivelser, "inntekter");

    document.getElementById("nyInntekt").value = "";
    document.getElementById("inntektDato").value = "";
    document.getElementById("inntektBeskrivelse").value = "";
}

// ========================================================================
// Legg til utgift
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
