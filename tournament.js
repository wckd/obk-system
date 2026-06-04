// tournament.js - Turneringkalkulator for OBK
// Beregner fordeling av turneringsavgift med variable satser
// Støtter sponsede spillere (klubben betaler)

let satsCounter = 1; // Starter med 1 sats
let turneringLagringIProsess = false;

// Hovedfunksjon - kalles når modulen vises
async function initTurnering() {
    const container = document.getElementById('turnering-container');
    if (!container) return;
    if (!window.sb) {
        setTimeout(initTurnering, 100);
        return;
    }
    await hentMedlemmerForSøk();
    renderTurneringSkjema();
    
    // Etter rendering, sett opp auto-lagring og gjenopprett hvis data finnes
    setupAutoLagring();
    const lagretData = hentLagretTurneringData();
    if (lagretData) {
        gjenopprettTurneringSkjema(lagretData);
    }
}

async function hentMedlemmerForSøk() {
    const { data, error } = await window.sb
        .from('medlemmer')
        .select('id, fornavn, etternavn')
        .eq('er_aktiv', true);
    if (!error && data) window.turneringMedlemmer = data;
}

function renderTurneringSkjema() {
    const container = document.getElementById('turnering-container');
    const html = `
        <div class="turnering-grid">
            <!-- Venstre: Skjema -->
            <div class="turnering-skjema">
                <div class="form-gruppe">
                    <label>📅 Dato</label>
                    <input type="date" id="tur-dato" value="${getTodayLocal()}">
                </div>
                
                <div class="form-gruppe">
                    <label>👤 Turneringsleder</label>
                    <div class="sok-container">
                        <input type="text" id="tur-leder-sok" placeholder="Søk etter medlem..." autocomplete="off">
                        <div id="tur-leder-boble" class="search-bubble hidden"></div>
                        <input type="hidden" id="tur-leder-id">
                        <input type="text" id="tur-leder-navn" readonly placeholder="Valgt leder vises her" class="readonly-felt">
                    </div>
                </div>
                
                <div class="form-gruppe">
                    <label>💰 Prosentfordeling (fast)</label>
                    <div class="prosent-visning">
                        <div class="prosent-boks">
                            <span class="prosent-tall">40%</span>
                            <span class="prosent-label">Klubb</span>
                        </div>
                        <div class="prosent-boks">
                            <span class="prosent-tall">60%</span>
                            <span class="prosent-label">Spillere</span>
                        </div>
                    </div>
                    <input type="hidden" id="tur-klubb-prosent" value="40">
                    <input type="hidden" id="tur-spiller-prosent" value="60">
                </div>
                
                <div class="form-gruppe">
                    <label>🏆 Avsetning til finale (kr per spiller)</label>
                    <input type="number" id="tur-avsetning" value="0" step="1">
                </div>
                
                <div class="form-gruppe">
                    <label>📊 Satser (legg til antall spillere og avgift)</label>
                    <div id="satser-container"></div>
                    <button type="button" class="btn btn-small" onclick="leggTilSats()">+ Legg til sats</button>
                </div>
                
                <!-- Avstemming og utbetalingsplan -->
                <div class="avstemming-container" style="margin-top: 30px;">
                    <h3>📊 Avstemming & Utbetaling</h3>
                    <div class="avstemming-grid">
                        <!-- Venstre kolonne - Avstemming -->
                        <div class="avstemming-input">
                            <h4>Avstemming</h4>
                            <div class="avstemming-rad">
                                <span>Sum innbetalt (forventet):</span>
                                <span id="avstem-sum-innbetalt">0 kr</span>
                            </div>
                            <div class="avstemming-rad">
                                <label>💳 Vipps mottatt:</label>
                                <input type="number" id="avstem-vipps" value="0" step="100" class="avstem-input">
                            </div>
                            <div class="avstemming-rad">
                                <label>💳 Kort mottatt:</label>
                                <input type="number" id="avstem-kort" value="0" step="100" class="avstem-input">
                            </div>
                            <div class="avstemming-rad">
                                <label>💰 Kontant mottatt:</label>
                                <input type="number" id="avstem-kontant" value="0" step="100" class="avstem-input">
                            </div>

                             <!-- Sponsede seksjon -->
                            <div class="avstemming-rad" style="flex-direction: column; align-items: stretch; gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
                                <label>🎁 Sponsede (klubben betaler)</label>
                                <div style="display: flex; gap: 10px; align-items: center;">
                                    <label style="font-size: 13px; min-width: 50px;">Antall</label>
                                    <input type="number" id="avstem-sponsede-antall" value="0" step="1" min="0" class="avstem-input" style="flex: 1;" placeholder="0">
                                </div>
                                <div style="display: flex; gap: 10px; align-items: center;">
                                    <label style="font-size: 13px; min-width: 50px;">Beløp</label>
                                    <input type="number" id="avstem-sponsede-belop" value="0" step="100" class="avstem-input" style="flex: 1;" placeholder="0">
                                </div>
                                <div style="display: flex; gap: 10px; align-items: center;">
                                    <label style="font-size: 13px; min-width: 50px;">Navn</label>
                                    <input type="text" id="avstem-sponsede-navn" class="input-field" style="flex: 1;" placeholder="For eks.Stig, Bjørn">
                                </div>
                            </div>
                            
                            <div class="avstemming-rad avvik">
                                <span>Avvik:</span>
                                <span id="avstem-avvik">0 kr</span>
                            </div>
                        </div>
                        
                        <!-- Høyre kolonne - Utbetalingsplan (oppdateres live) -->
                        <div class="utbetalingsplan-input">
                            <h4>Utbetalingsplan</h4>
                            <div id="utbetalingsplan-innhold">
                                <div class="utbetalingsrad">
                                    <span>Premier utbetales via Vipps:</span>
                                    <span id="plan-vipps-premier">0 kr</span>
                                </div>
                                <div class="utbetalingsrad">
                                    <span>Rest Vipps til kassen:</span>
                                    <span id="plan-vipps-kasse">0 kr</span>
                                </div>
                                <div class="utbetalingsrad">
                                    <span>Kontant til kassen:</span>
                                    <span id="plan-kontant-kasse">0 kr</span>
                                </div>
                                <div class="utbetalingsrad">
                                    <span>Kort til kassen:</span>
                                    <span id="plan-kort-kasse">0 kr</span>
                                </div>
                                <div class="utbetalingsrad sum">
                                    <span>Sum:</span>
                                    <span id="plan-sum">0 kr</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Høyre: Resultat -->
            <div class="turnering-resultat">
                <h3>📊 Resultat</h3>
                <div class="premie-modell">
                    <label>🏆 Premiefordeling:</label>
                    <div class="radiogruppe">
                        <label class="radio-label"><input type="radio" name="premiemodell" value="1" checked> Modell 1: 1.=50%, 2.=25%, 3.=12,5% + 12,5%</label>
                        <label class="radio-label"><input type="radio" name="premiemodell" value="2"> Modell 2: 1.=66%, 2.=34%</label>
                        <label class="radio-label"><input type="radio" name="premiemodell" value="3"> Modell 3: 1.=36%, 2.=18%, 3.=12%+12%, 5.=5,5%×4</label>
                    </div>
                </div>
                <div id="beregning-visning"><p>Fyll inn data for å se beregning</p></div>
                <button class="btn btn-lagre" onclick="lagreTurnering()" style="margin-top:20px; width:100%;">💾 Lagre turnering</button>
            </div>
        </div>
    `;
    container.innerHTML = html;
    renderSatser();
    setupBeregningsListenere();
    setupLederSok();
    setupAvstemmingListenere();
    oppdaterAvstemming();
}

// --- Satser (uendret) ---
function renderSatser() {
    const container = document.getElementById('satser-container');
    if (!container) return;
    let html = '';
    for (let i = 1; i <= satsCounter; i++) {
        html += `
            <div class="sats-rad" id="sats-${i}">
                <div class="sats-navn"><input type="text" value="Sats ${i}" placeholder="Navn" class="sats-navn-input"></div>
                <div class="sats-antall"><label>Antall spillere</label><input type="number" value="0" min="0" class="sats-antall-input" data-sats="${i}"></div>
                <div class="sats-avgift"><label>Avgift</label><input type="number" value="0" min="0" step="10" class="sats-avgift-input" data-sats="${i}"></div>
                <button class="btn-slett" onclick="fjernSats(${i})" title="Fjern">✖</button>
            </div>
        `;
    }
    container.innerHTML = html;
    document.querySelectorAll('.sats-antall-input, .sats-avgift-input').forEach(input => {
        input.addEventListener('input', () => { beregnTurnering(); oppdaterAvstemming(); });
    });
    document.querySelectorAll('.sats-navn-input').forEach(input => input.addEventListener('input', () => beregnTurnering()));
    beregnTurnering();
}

function leggTilSats() { satsCounter++; renderSatser(); }
function fjernSats(satsNr) {
    if (satsCounter <= 1) { visBeskjed('Feil', 'Du må ha minst én sats', 'error'); return; }
    const element = document.getElementById(`sats-${satsNr}`);
    if (element) element.remove();
    oppdaterSatsIndekser();
    satsCounter--;
    beregnTurnering();
}
function oppdaterSatsIndekser() {
    const rader = document.querySelectorAll('.sats-rad');
    rader.forEach((rad, idx) => {
        const nyIndeks = idx + 1;
        rad.id = `sats-${nyIndeks}`;
        const antallInput = rad.querySelector('.sats-antall-input');
        const avgiftInput = rad.querySelector('.sats-avgift-input');
        if (antallInput) antallInput.dataset.sats = nyIndeks;
        if (avgiftInput) avgiftInput.dataset.sats = nyIndeks;
    });
    satsCounter = rader.length;
}

function setupBeregningsListenere() {
    const avsetning = document.getElementById('tur-avsetning');
    if (avsetning) avsetning.addEventListener('input', () => { beregnTurnering(); oppdaterAvstemming(); });
    setupPremieLytter();
}
function setupPremieLytter() {
    const radioer = document.querySelectorAll('input[name="premiemodell"]');
    radioer.forEach(radio => radio.addEventListener('change', () => beregnTurnering()));
}

function beregnPremieFordeling(premiepott, modell) {
    const fordeling = [];
    if (modell === '1') {
        fordeling.push({ plass: '1. plass', prosent: 50, belop: (premiepott * 50) / 100 });
        fordeling.push({ plass: '2. plass', prosent: 25, belop: (premiepott * 25) / 100 });
        fordeling.push({ plass: '3. plass (A)', prosent: 12.5, belop: (premiepott * 12.5) / 100 });
        fordeling.push({ plass: '3. plass (B)', prosent: 12.5, belop: (premiepott * 12.5) / 100 });
    } else if (modell === '2') {
        fordeling.push({ plass: '1. plass', prosent: 66, belop: (premiepott * 66) / 100 });
        fordeling.push({ plass: '2. plass', prosent: 34, belop: (premiepott * 34) / 100 });
    } else if (modell === '3') {
        fordeling.push({ plass: '1. plass', prosent: 36, belop: (premiepott * 36) / 100 });
        fordeling.push({ plass: '2. plass', prosent: 18, belop: (premiepott * 18) / 100 });
        fordeling.push({ plass: '3. plass (A)', prosent: 12, belop: (premiepott * 12) / 100 });
        fordeling.push({ plass: '3. plass (B)', prosent: 12, belop: (premiepott * 12) / 100 });
        fordeling.push({ plass: '5. plass (A)', prosent: 5.5, belop: (premiepott * 5.5) / 100 });
        fordeling.push({ plass: '5. plass (B)', prosent: 5.5, belop: (premiepott * 5.5) / 100 });
        fordeling.push({ plass: '5. plass (C)', prosent: 5.5, belop: (premiepott * 5.5) / 100 });
        fordeling.push({ plass: '5. plass (D)', prosent: 5.5, belop: (premiepott * 5.5) / 100 });
    }
    return fordeling;
}

function beregnTurnering() {
    const klubbProsent = 40;
    const spillerProsent = 60;
    const avsetningPerSpiller = parseInt(document.getElementById('tur-avsetning')?.value || 0);
    let totalSpillere = 0;
    let totalAvgiftInn = 0;
    let satsDetaljer = [];
    document.querySelectorAll('.sats-rad').forEach(rad => {
        const navn = rad.querySelector('.sats-navn-input')?.value || 'Ukjent';
        const antall = parseInt(rad.querySelector('.sats-antall-input')?.value || 0);
        const avgift = parseInt(rad.querySelector('.sats-avgift-input')?.value || 0);
        if (antall > 0 && avgift > 0) {
            totalSpillere += antall;
            totalAvgiftInn += antall * avgift;
            satsDetaljer.push({ navn, antall, avgift, sum: antall * avgift });
        }
    });
    if (totalSpillere === 0) {
        document.getElementById('beregning-visning').innerHTML = '<p>Legg til minst én spiller for å se beregning</p>';
        return;
    }
    const klubbAndel = (totalAvgiftInn * klubbProsent) / 100;
    const spillerPottForPremier = (totalAvgiftInn * spillerProsent) / 100;
    const totalAvsetning = totalSpillere * avsetningPerSpiller;
    const utbetalesNå = spillerPottForPremier - totalAvsetning;
    const tilKlubbenTotalt = klubbAndel + totalAvsetning;
    const valgtModell = document.querySelector('input[name="premiemodell"]:checked')?.value || '1';
    const premieFordeling = beregnPremieFordeling(utbetalesNå, valgtModell);
    let premieHtml = '<div class="resultat-seksjon"><h4>🏆 Premiefordeling (Modell ' + valgtModell + ')</h4>';
    premieFordeling.forEach(p => {
        premieHtml += `<div class="resultat-rad"><span>${p.plass} (${p.prosent}%):</span><strong>${p.belop.toLocaleString('no-NO')} kr</strong></div>`;
    });
    premieHtml += '</div>';
    const html = `
        <div class="resultat-oppsummering">
            <div class="resultat-rad"><span>👥 Totalt antall spillere:</span><strong>${totalSpillere}</strong></div>
            <div class="resultat-rad"><span>💰 Sum innbetalt:</span><strong>${totalAvgiftInn.toLocaleString('no-NO')} kr</strong></div>
            <div class="resultat-seksjon"><h4>🏢 Klubbens andel (${klubbProsent}%)</h4><div class="resultat-rad"><span>Grunnandel:</span><strong>${klubbAndel.toLocaleString('no-NO')} kr</strong></div></div>
            <div class="resultat-seksjon"><h4>🎯 Spillernes pott (${spillerProsent}%)</h4>
                <div class="resultat-rad"><span>Premiepott:</span><strong>${spillerPottForPremier.toLocaleString('no-NO')} kr</strong></div>
                <div class="resultat-rad"><span>Avsetning til finale (${avsetningPerSpiller} kr/spiller):</span><strong class="avsetning">- ${totalAvsetning.toLocaleString('no-NO')} kr</strong></div>
                <div class="resultat-rad utbetalt"><span>💰 Utbetales til spillere nå:</span><strong>${utbetalesNå.toLocaleString('no-NO')} kr</strong></div>
            </div>
            ${premieHtml}
            <div class="resultat-seksjon total-klubb"><h4>🏦 Til klubben totalt (nå)</h4><div class="resultat-rad"><span>Klubbandel + Avsetning:</span><strong>${tilKlubbenTotalt.toLocaleString('no-NO')} kr</strong></div></div>
        </div>
    `;
    document.getElementById('beregning-visning').innerHTML = html;
}

// --- Turneringsleder-søk (uendret) ---
function setupLederSok() {
    const søkInput = document.getElementById('tur-leder-sok');
    const boble = document.getElementById('tur-leder-boble');
    if (!søkInput) return;
    søkInput.addEventListener('input', async (e) => {
        const søkeord = e.target.value.toLowerCase();
        if (søkeord.length < 2) { boble.classList.add('hidden'); return; }
        const medlemmer = window.turneringMedlemmer || [];
        const treff = medlemmer.filter(m => m.fornavn.toLowerCase().includes(søkeord) || m.etternavn.toLowerCase().includes(søkeord)).slice(0, 8);
        if (treff.length === 0) {
            boble.innerHTML = '<div class="boble-item">Ingen treff</div>';
            boble.classList.remove('hidden');
            return;
        }
        boble.innerHTML = treff.map(m => `<div class="boble-item" data-leder-id="${escapeHtml(String(m.id))}" data-leder-navn="${escapeHtml((m.fornavn || '') + ' ' + (m.etternavn || ''))}"><strong>${escapeHtml(m.fornavn)} ${escapeHtml(m.etternavn)}</strong></div>`).join('');
        boble.querySelectorAll('.boble-item').forEach(item => {
            if (!item.dataset.lederId) return;
            item.addEventListener('click', () => velgTurneringsleder(item.dataset.lederId, item.dataset.lederNavn));
        });
        boble.classList.remove('hidden');
    });
    document.addEventListener('click', (e) => {
        if (!søkInput.contains(e.target) && !boble.contains(e.target)) boble.classList.add('hidden');
    });
}
function velgTurneringsleder(id, navn) {
    document.getElementById('tur-leder-id').value = id;
    document.getElementById('tur-leder-navn').value = navn;
    document.getElementById('tur-leder-sok').value = '';
    document.getElementById('tur-leder-boble').classList.add('hidden');
}

// --- Avstemming og utbetalingsplan med sponsede ---
function getTurneringBeregninger() {
    let totalSpillere = 0;
    let totalAvgiftInn = 0;
    document.querySelectorAll('.sats-rad').forEach(rad => {
        const antall = parseInt(rad.querySelector('.sats-antall-input')?.value || 0);
        const avgift = parseInt(rad.querySelector('.sats-avgift-input')?.value || 0);
        if (antall > 0 && avgift > 0) {
            totalSpillere += antall;
            totalAvgiftInn += antall * avgift;
        }
    });
    const avsetningPerSpiller = parseInt(document.getElementById('tur-avsetning')?.value || 0);
    const spillerPott = (totalAvgiftInn * 60) / 100;
    const premier = spillerPott - (totalSpillere * avsetningPerSpiller);
    const sponsedeAntall = parseInt(document.getElementById('avstem-sponsede-antall')?.value || 0);
    const sponsedeNavn = document.getElementById('avstem-sponsede-navn')?.value || '';
    const sponsedeBelop = parseInt(document.getElementById('avstem-sponsede-belop')?.value || 0);
    return { totalAvgiftInn, premier: premier > 0 ? premier : 0, sponsedeAntall, sponsedeNavn, sponsedeBelop };
}

function setupAvstemmingListenere() {
    const ids = ['avstem-vipps', 'avstem-kort', 'avstem-kontant', 'avstem-sponsede-belop', 'avstem-sponsede-antall', 'avstem-sponsede-navn'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => oppdaterAvstemming());
    });
}

function oppdaterAvstemming() {
    const vipps = parseInt(document.getElementById('avstem-vipps')?.value) || 0;
    const kort = parseInt(document.getElementById('avstem-kort')?.value) || 0;
    const kontant = parseInt(document.getElementById('avstem-kontant')?.value) || 0;
    const sponsedeBelop = parseInt(document.getElementById('avstem-sponsede-belop')?.value) || 0;
    const { totalAvgiftInn, premier, sponsedeAntall, sponsedeNavn } = getTurneringBeregninger();
    const sumMottatt = vipps + kort + kontant + sponsedeBelop;
    const avvik = totalAvgiftInn - sumMottatt;
    document.getElementById('avstem-sum-innbetalt').innerText = totalAvgiftInn.toLocaleString('no-NO') + ' kr';
    const avvikEl = document.getElementById('avstem-avvik');
    avvikEl.innerText = avvik.toLocaleString('no-NO') + ' kr';
    avvikEl.style.color = avvik === 0 ? 'green' : 'var(--advarsel)';
    
    // Utbetalingsplan
    let vippsPremier = 0, vippsKasse = 0, kontantKasse = 0, kortKasse = 0, bankMangel = 0;
    if (vipps >= premier) {
        vippsPremier = premier;
        vippsKasse = vipps - premier;
        kontantKasse = kontant;
        kortKasse = kort;
    } else if (vipps + kontant >= premier) {
        vippsPremier = vipps;
        const restKontant = premier - vipps;
        vippsKasse = 0;
        kontantKasse = kontant - restKontant;
        kortKasse = kort;
    } else {
        vippsPremier = vipps;
        kontantKasse = 0;
        kortKasse = kort;
        bankMangel = premier - (vipps + kontant);
    }
    const vippsPremierTekst = bankMangel > 0
        ? `<span style="color:red;">${vippsPremier.toLocaleString('no-NO')} kr (mangler ${bankMangel.toLocaleString('no-NO')} kr via bank)</span>`
        : `<span id="plan-vipps-premier">${vippsPremier.toLocaleString('no-NO')} kr</span>`;
    let planHtml = `
        <div class="utbetalingsrad"><span>Premier utbetales via Vipps:</span>${vippsPremierTekst}</div>
        <div class="utbetalingsrad"><span>Rest Vipps til kassen:</span><span id="plan-vipps-kasse">${vippsKasse.toLocaleString('no-NO')} kr</span></div>
        <div class="utbetalingsrad"><span>Kontant til kassen:</span><span id="plan-kontant-kasse">${kontantKasse.toLocaleString('no-NO')} kr</span></div>
        <div class="utbetalingsrad"><span>Kort til kassen:</span><span id="plan-kort-kasse">${kortKasse.toLocaleString('no-NO')} kr</span></div>
    `;
    if (sponsedeAntall > 0 || sponsedeBelop > 0) {
        planHtml += `
            <div style="margin-top:10px; padding-top:10px; border-top:2px solid #c9a84c;">
                <div class="utbetalingsrad"><span>🎁 Sponsede (klubben betaler):</span><span>${sponsedeBelop.toLocaleString('no-NO')} kr</span></div>
                <div class="utbetalingsrad"><span>Antall sponsede:</span><span>${sponsedeAntall}</span></div>
                <div class="utbetalingsrad"><span>Navn:</span><span>${escapeHtml(sponsedeNavn) || '—'}</span></div>
            </div>
        `;
    }
    planHtml += `<div class="utbetalingsrad sum"><span>Sum:</span><span id="plan-sum">${(vippsPremier + vippsKasse + kontantKasse + kortKasse).toLocaleString('no-NO')} kr</span></div>`;
    document.getElementById('utbetalingsplan-innhold').innerHTML = planHtml;
}

// --- Lagring (med sponsede_belop) ---
async function lagreTurnering() {
    const lederId = document.getElementById('tur-leder-id')?.value;
    if (!lederId) { visBeskjed('Mangler', 'Velg en turneringsleder', 'error'); return; }
    const { totalAvgiftInn, premier, harSatser, avvik } = getTurneringValidering();
    if (!harSatser) { visBeskjed('Mangler', 'Legg til minst én sats med spillere og avgift', 'error'); return; }
    if (avvik !== 0) { visBeskjed('Avvik', `Avvik: ${avvik.toLocaleString('no-NO')} kr. Kan ikke lagre.`, 'error'); return; }
    if (premier <= 0) { visBeskjed('Ingen premier', 'Premiepotten er 0 – kan ikke lagre', 'error'); return; }
    visBekreftelse('Lagre turnering?', `Sum turneringsavgift: ${totalAvgiftInn.toLocaleString('no-NO')} kr\nPremier: ${premier.toLocaleString('no-NO')} kr`, '💾', async () => await utførLagring(), () => {});
}

function getTurneringValidering() {
    let totalSpillere = 0, totalAvgiftInn = 0, harSatser = false;
    document.querySelectorAll('.sats-rad').forEach(rad => {
        const antall = parseInt(rad.querySelector('.sats-antall-input')?.value || 0);
        const avgift = parseInt(rad.querySelector('.sats-avgift-input')?.value || 0);
        if (antall > 0 && avgift > 0) {
            harSatser = true;
            totalSpillere += antall;
            totalAvgiftInn += antall * avgift;
        }
    });
    const avsetning = parseInt(document.getElementById('tur-avsetning')?.value || 0);
    const spillerPott = (totalAvgiftInn * 60) / 100;
    const premier = spillerPott - (totalSpillere * avsetning);
    const vipps = parseInt(document.getElementById('avstem-vipps')?.value || 0);
    const kort = parseInt(document.getElementById('avstem-kort')?.value || 0);
    const kontant = parseInt(document.getElementById('avstem-kontant')?.value || 0);
    const sponsedeBelop = parseInt(document.getElementById('avstem-sponsede-belop')?.value || 0);
    const sumMottatt = vipps + kort + kontant + sponsedeBelop;
    const avvik = totalAvgiftInn - sumMottatt;
    return { totalAvgiftInn, premier, harSatser, avvik };
}

async function utførLagring() {
    if (turneringLagringIProsess) return;
    turneringLagringIProsess = true;
    let suksess = false;
    try {
        const dato = document.getElementById('tur-dato')?.value;
        const lederId = document.getElementById('tur-leder-id')?.value;
        const avsetning = parseInt(document.getElementById('tur-avsetning')?.value) || 0;
        const premiemodell = parseInt(document.querySelector('input[name="premiemodell"]:checked')?.value || '1');
        const satser = [];
        let totalAvgiftInn = 0, totalSpillere = 0;
        document.querySelectorAll('.sats-rad').forEach(rad => {
            const navn = rad.querySelector('.sats-navn-input')?.value;
            const antall = parseInt(rad.querySelector('.sats-antall-input')?.value || 0);
            const avgift = parseInt(rad.querySelector('.sats-avgift-input')?.value || 0);
            if (antall > 0 && avgift > 0) {
                satser.push({ navn, antall, avgift });
                totalSpillere += antall;
                totalAvgiftInn += antall * avgift;
            }
        });
        const vipps = parseInt(document.getElementById('avstem-vipps')?.value || 0);
        const kort = parseInt(document.getElementById('avstem-kort')?.value || 0);
        const kontant = parseInt(document.getElementById('avstem-kontant')?.value || 0);
        const sponsedeAntall = parseInt(document.getElementById('avstem-sponsede-antall')?.value || 0);
        const sponsedeNavn = document.getElementById('avstem-sponsede-navn')?.value || '';
        const sponsedeBelop = parseInt(document.getElementById('avstem-sponsede-belop')?.value || 0);
        
        const spillerPott = (totalAvgiftInn * 60) / 100;
        const premier = spillerPott - (totalSpillere * avsetning);
        const turneringData = {
            dato, turneringsleder_id: lederId, avsetning_per_spiller: avsetning, premiemodell,
            satser, total_avgift_inn: totalAvgiftInn, premier: premier > 0 ? premier : 0,
            mottatt_vipps: vipps, mottatt_kort: kort, mottatt_kontant: kontant,
            sponsede_antall: sponsedeAntall, sponsede_navn: sponsedeNavn || null,
            sponsede_belop: sponsedeBelop
        };
        const { data, error } = await window.sb.from('turneringer').insert([turneringData]).select();
        if (error) throw error;
        suksess = true;
        visBeskjed('✅ Turnering lagret!', `ID: ${data[0].id}`, 'success');
        setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
        console.error(err);
        visBeskjed('Feil', err.message, 'error');
    } finally {
        // Tøm utkastet kun ved suksess — ellers beholdes det som sikkerhetsnett.
        // Ved feil slippes lagring-flagget så bruker kan prøve på nytt.
        if (suksess) {
            tømLagretTurneringData();
        } else {
            turneringLagringIProsess = false;
        }
    }
}
// --- AUTOMATISK LAGRING AV SKJEMADATA (sessionStorage) ---
const STORAGE_KEY = 'turnering_skjema_data';

// Lagrer alle relevante felt til sessionStorage
function lagreTurneringSkjema() {
    try {
        const data = {
            // Dato
            dato: document.getElementById('tur-dato')?.value,
            // Turneringsleder
            lederId: document.getElementById('tur-leder-id')?.value,
            lederNavn: document.getElementById('tur-leder-navn')?.value,
            // Avsetning
            avsetning: document.getElementById('tur-avsetning')?.value,
            // Premietype
            premiemodell: document.querySelector('input[name="premiemodell"]:checked')?.value,
            // Satser
            satser: [],
            // Avstemming
            vipps: document.getElementById('avstem-vipps')?.value,
            kort: document.getElementById('avstem-kort')?.value,
            kontant: document.getElementById('avstem-kontant')?.value,
            sponsedeAntall: document.getElementById('avstem-sponsede-antall')?.value,
            sponsedeBelop: document.getElementById('avstem-sponsede-belop')?.value,
            sponsedeNavn: document.getElementById('avstem-sponsede-navn')?.value
        };
        
        // Hent satser
        const rader = document.querySelectorAll('.sats-rad');
        rader.forEach(rad => {
            const navn = rad.querySelector('.sats-navn-input')?.value;
            const antall = rad.querySelector('.sats-antall-input')?.value;
            const avgift = rad.querySelector('.sats-avgift-input')?.value;
            data.satser.push({ navn, antall, avgift });
        });
        
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch(e) { console.warn('Lagring feilet:', e); }
}

// Henter lagrede data
function hentLagretTurneringData() {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch(e) { return null; }
}

// Fyller skjemaet med lagrede data
function gjenopprettTurneringSkjema(data) {
    if (!data) return;
    
    // Dato
    if (data.dato) document.getElementById('tur-dato').value = data.dato;
    // Turneringsleder
    if (data.lederId) {
        document.getElementById('tur-leder-id').value = data.lederId;
        document.getElementById('tur-leder-navn').value = data.lederNavn || '';
    }
    // Avsetning
    if (data.avsetning) document.getElementById('tur-avsetning').value = data.avsetning;
    // Premietype
    if (data.premiemodell) {
        const radio = document.querySelector(`input[name="premiemodell"][value="${data.premiemodell}"]`);
        if (radio) radio.checked = true;
    }
    // Satser – må vente til satser er rendret
    const satserContainer = document.getElementById('satser-container');
    if (satserContainer && data.satser && data.satser.length) {
        // Juster antall satser
        if (data.satser.length !== satsCounter) {
            // Endre satsCounter til riktig antall
            satsCounter = data.satser.length;
            renderSatser(); // re-render med riktig antall
        }
        // renderSatser() er synkron, så radene finnes allerede — fyll inn direkte
        const rader = document.querySelectorAll('.sats-rad');
        rader.forEach((rad, idx) => {
            if (idx < data.satser.length) {
                const s = data.satser[idx];
                if (s.navn) rad.querySelector('.sats-navn-input').value = s.navn;
                if (s.antall) rad.querySelector('.sats-antall-input').value = s.antall;
                if (s.avgift) rad.querySelector('.sats-avgift-input').value = s.avgift;
            }
        });
    }
    // Avstemmingsfelter
    if (data.vipps) document.getElementById('avstem-vipps').value = data.vipps;
    if (data.kort) document.getElementById('avstem-kort').value = data.kort;
    if (data.kontant) document.getElementById('avstem-kontant').value = data.kontant;
    if (data.sponsedeAntall) document.getElementById('avstem-sponsede-antall').value = data.sponsedeAntall;
    if (data.sponsedeBelop) document.getElementById('avstem-sponsede-belop').value = data.sponsedeBelop;
    if (data.sponsedeNavn) document.getElementById('avstem-sponsede-navn').value = data.sponsedeNavn;
    
    // Trigger oppdateringer
    beregnTurnering();
    oppdaterAvstemming();
}

// Sett opp event listeners for automatisk lagring (etter at skjema er rendret)
function setupAutoLagring() {
    const felter = [
        'tur-dato', 'tur-avsetning',
        'avstem-vipps', 'avstem-kort', 'avstem-kontant',
        'avstem-sponsede-antall', 'avstem-sponsede-belop', 'avstem-sponsede-navn'
    ];
    felter.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => lagreTurneringSkjema());
    });
    // Turneringsleder endring (velges via boble)
    const lederSok = document.getElementById('tur-leder-sok');
    if (lederSok) lederSok.addEventListener('input', () => lagreTurneringSkjema());
    // Radioknapper
    document.querySelectorAll('input[name="premiemodell"]').forEach(radio => {
        radio.addEventListener('change', () => lagreTurneringSkjema());
    });
    // Satser – delegert på container
    const satsContainer = document.getElementById('satser-container');
    if (satsContainer) {
        satsContainer.addEventListener('input', () => lagreTurneringSkjema());
    }
}

// Tøm lagret data etter vellykket lagring
function tømLagretTurneringData() {
    sessionStorage.removeItem(STORAGE_KEY);
}