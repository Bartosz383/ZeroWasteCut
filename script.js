let historyData = [];
let profiles = [];
let editingIndex = -1;

function initApp() {
    loadProfiles();
    loadHistory();
}

// Nawigacja
function showOptimizer() { 
    document.getElementById("menu-container").style.display = "none"; 
    document.getElementById("optimizer-container").style.display = "block"; 
}

// Główny algorytm rozkroju
function runOptimization() {
    const L = parseFloat(document.getElementById("opt-L").value);
    const S = parseFloat(document.getElementById("opt-S").value);
    const rawInput = document.getElementById("opt-fragments").value;
    
    // Przetwarzanie wejścia (obsługuje przecinki, spacje i nową linię)
    let fragments = rawInput.split(/[\s,]+/).map(x => parseFloat(x)).filter(x => !isNaN(x));

    if (isNaN(L) || fragments.length === 0) { alert("Podaj poprawne dane!"); return; }
    if (fragments.some(f => f > L)) { alert("Jeden z odcinków jest dłuższy niż sztanga!"); return; }

    // Sortowanie malejąco (klucz do algorytmu First Fit Decreasing)
    fragments.sort((a, b) => b - a);

    let stockUnits = []; // Tablica sztang

    fragments.forEach(frag => {
        let placed = false;
        // Szukaj sztangi, w której zmieści się fragment + rzaz
        for (let unit of stockUnits) {
            let usedSpace = unit.reduce((a, b) => a + b, 0) + (unit.length * S);
            if (usedSpace + frag <= L) {
                unit.push(frag);
                placed = true;
                break;
            }
        }
        // Jeśli się nie zmieścił, weź nową sztangę
        if (!placed) {
            stockUnits.push([frag]);
        }
    });

    displayOptResults(stockUnits, L, S);
}

function displayOptResults(units, L, S) {
    const resDiv = document.getElementById("opt-results");
    let html = `<h4>Wynik: Potrzeba ${units.length} sztang</h4>`;
    
    units.forEach((unit, index) => {
        const sum = unit.reduce((a, b) => a + b, 0);
        const cuts = unit.length * S;
        const waste = L - sum - cuts;
        
        html += `
            <div style="border:1px solid #ddd; padding:15px; border-radius:8px; margin-bottom:10px; background:#fdfdfd">
                <strong>Sztanga #${index + 1}</strong>: ${unit.join(" mm, ")} mm 
                <br><small style="color:#666">Suma: ${sum} mm | Odpad: <b>${waste.toFixed(1)} mm</b></small>
                <div style="display:flex; height:20px; background:#eee; margin-top:8px; border-radius:4px; overflow:hidden;">
                    ${unit.map(f => `<div style="width:${(f/L)*100}%; background:#3498db; border-right:1px solid white;"></div>`).join('')}
                    ${waste > 0 ? `<div style="width:${(waste/L)*100}%; background:#e67e22;"></div>` : ''}
                </div>
            </div>
        `;
    });
    
    resDiv.innerHTML = html;
}

// --- LOGIKA BAZY PROFILI ---
function loadProfiles() {
    const saved = localStorage.getItem('woodProfiles');
    profiles = saved ? JSON.parse(saved) : [{name: "Profil 6m", l: 6000, s: 4}];
    renderProfiles();
}

function renderProfiles() {
    const select = document.getElementById("profile-db");
    const tbody = document.getElementById("profiles-body");
    
    select.innerHTML = '<option value="custom">-- Własne wymiary --</option>';
    tbody.innerHTML = '';

    profiles.forEach((p, index) => {
        // Dropdown
        const opt = document.createElement("option");
        opt.value = index;
        opt.textContent = `${p.name} (${p.l}mm)`;
        select.appendChild(opt);

        // Tabela - tryb wyświetlania lub edycji
        const row = tbody.insertRow();
        if (editingIndex === index) {
            row.innerHTML = `
                <td><input type="text" id="edit-name" class="edit-input" value="${p.name}"></td>
                <td><input type="number" id="edit-L" class="edit-input" value="${p.l}"></td>
                <td><input type="number" id="edit-S" class="edit-input" value="${p.s}"></td>
                <td><input type="number" id="edit-M" class="edit-input" value="${p.m || 0}" step="0.01"></td>
                <td>
                    <button class="btn-action save-btn" onclick="saveEdit(${index})">Zapisz</button>
                    <button class="btn-action delete-btn" onclick="cancelEdit()">Anuluj</button>
                </td>
            `;
        } else {
            row.innerHTML = `
                <td>${p.name}</td>
                <td>${p.l}</td>
                <td>${p.s}</td>
                <td>${p.m || 0}</td>
                <td>
                    <button class="btn-action edit-btn" onclick="startEdit(${index})">Edytuj</button>
                    <button class="btn-action delete-btn" onclick="deleteProfile(${index})">Usuń</button>
                </td>
            `;
        }
    });
}

function startEdit(index) {
    editingIndex = index;
    renderProfiles();
}

function cancelEdit() {
    editingIndex = -1;
    renderProfiles();
}

function saveEdit(index) {
    const newName = document.getElementById("edit-name").value;
    const newL = parseFloat(document.getElementById("edit-L").value);
    const newS = parseFloat(document.getElementById("edit-S").value);
    const newM = parseFloat(document.getElementById("edit-M").value);

    if (!newName || isNaN(newL)) { alert("Błędne dane!"); return; }

    profiles[index] = { 
        name: newName, 
        l: newL, 
        s: newS || 0, 
        m: newM || 0
    };
    editingIndex = -1;
    saveAndRefreshProfiles();
}

function addNewProfile() {
    const name = document.getElementById("new-name").value;
    const l = parseFloat(document.getElementById("new-L").value);
    const s = parseFloat(document.getElementById("new-S").value);
    const m = parseFloat(document.getElementById("new-M").value);
    
    if (!name || isNaN(l)) { alert("Uzupełnij dane!"); return; }
    
    // Dodano m: m || 0
    profiles.push({name, l, s: s || 0, m: m || 0}); 
    saveAndRefreshProfiles();
    
    document.getElementById("new-name").value = "";
    document.getElementById("new-L").value = "";
    document.getElementById("new-S").value = "";
    document.getElementById("new-M").value = "";
}

function deleteProfile(index) {
    if(confirm("Usunąć ten profil?")) {
        profiles.splice(index, 1);
        saveAndRefreshProfiles();
    }
}

function saveAndRefreshProfiles() {
    localStorage.setItem('woodProfiles', JSON.stringify(profiles));
    renderProfiles();
}

function applyProfile() {
    const idx = document.getElementById("profile-db").value;
    const inputL = document.getElementById("L");
    const inputS = document.getElementById("S");
    const inputM = document.getElementById("M");

    if (idx !== "custom") {
        const selectedProfile = profiles[idx];
        inputL.value = selectedProfile.l;
        inputS.value = selectedProfile.s;
        inputM.value = selectedProfile.m || 0; // Wstawia masę lub 0 jeśli nie ustawiono
    } else {
        // Opcjonalnie: czyść pola jeśli wybrano "Własne wymiary"
        inputL.value = "";
        inputS.value = "3";
        inputM.value = "0";
    }
}

// --- HISTORIA ---
function loadHistory() {
    const saved = localStorage.getItem('cutHistory');
    historyData = saved ? JSON.parse(saved) : [];
    renderHistory();
}

function renderHistory() {
    const tbody = document.getElementById("history-body");
    tbody.innerHTML = '';
    historyData.forEach((h, index) => {
        const row = tbody.insertRow(0);
        const color = h.status === "WARTOŚCIOWY" ? "#27ae60" : "#e67e22";
        row.innerHTML = `
            <td>${h.L}</td>
            <td><small>${h.fragsRaw}</small></td>
            <td><b>${h.z}</b></td>
            <td><span class="badge" style="background:${color}">${h.status}</span></td>
            <td><button class="delete-btn btn-action" onclick="deleteHistoryItem(${historyData.length - 1 - index})">Usuń</button></td>
        `;
    });
}

function deleteHistoryItem(index) {
    historyData.splice(index, 1);
    localStorage.setItem('cutHistory', JSON.stringify(historyData));
    renderHistory();
}

// --- OBLICZENIA ---
function calculateZ() {
    const L = parseFloat(document.getElementById("L").value);
    const S = parseFloat(document.getElementById("S").value);
    const M = parseFloat(document.getElementById("M").value) || 0; // Masa kg/m
    const fragsRaw = document.getElementById("fragments").value;
    const fragments = fragsRaw.split(",").map(x => parseFloat(x.trim())).filter(x => !isNaN(x));

    if (isNaN(L) || fragments.length === 0) { alert("Błędne dane!"); return; }

    const sumFrags = fragments.reduce((a, b) => a + b, 0);
    const losses = fragments.length * S;
    const z = L - sumFrags - losses;

    if (z < 0) { alert("Błąd: Brakuje " + Math.abs(z).toFixed(1) + " mm!"); return; }

    // OBLICZENIA MAS (zamiana mm na m przez /1000)
    const masaPocietych = (sumFrags / 1000) * M;
    const masaWiorow = (losses / 1000) * M;
    const masaOdpadu = (z / 1000) * M;
    const masaCalkowita = (L / 1000) * M;

    const status = z >= 400 ? "WARTOŚCIOWY" : "ODPAD";
    
    // Zapis do historii (dodajemy info o masie)
    historyData.push({L, fragsRaw, z: z.toFixed(1), status, masaOdpadu: masaOdpadu.toFixed(2)});
    localStorage.setItem('cutHistory', JSON.stringify(historyData));
    
    drawCuts(L, S, fragments, z);
    renderHistory();

    // WYŚWIETLANIE WYNIKÓW
    document.getElementById("result-area").style.display = "block";
    document.getElementById("result-text").innerHTML = `
    <h3 style="margin-top:0">Analiza Cięcia</h3>
    <div class="result-grid">
        <div class="result-card">
            <h4>Odpad końcowy (Z)</h4>
            <div class="result-value">${z.toFixed(1)}<span class="unit">mm</span></div>
            <span class="badge" style="background:${z >= 400 ? '#27ae60' : '#e67e22'}">${status}</span>
        </div>
        <div class="result-card">
            <h4>Masa pociętych profili</h4>
            <div class="result-value">${masaPocietych.toFixed(3)}<span class="unit">kg</span></div>
        </div>
        <div class="result-card">
            <h4>Masa odpadu (Z)</h4>
            <div class="result-value">${masaOdpadu.toFixed(3)}<span class="unit">kg</span></div>
        </div>
        <div class="result-card">
            <h4>Masa wiórów (S)</h4>
            <div class="result-value">${masaWiorow.toFixed(3)}<span class="unit">kg</span></div>
        </div>
    </div>
    <div style="margin-top: 15px; font-size: 12px; color: #7f8c8d; border-top: 1px solid #eee; padding-top: 10px;">
        Suma cięć: ${sumFrags} mm | Całkowita masa materiału: ${masaCalkowita.toFixed(3)} kg
    </div>
    `;
}

function drawCuts(L, S, fragments, Z) {
    const canvas = document.getElementById("cutCanvas");
    const ctx = canvas.getContext("2d");
    const margin = 30;
    const width = canvas.width - (margin * 2);
    const scale = width / L;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    document.getElementById("viz-container").style.display = "block";

    ctx.fillStyle = "#eee";
    ctx.fillRect(margin, 60, width, 50);

    let currentX = margin;
    fragments.forEach((f) => {
        const fragW = f * scale;
        ctx.fillStyle = "#3498db";
        ctx.fillRect(currentX, 60, fragW, 50);
        ctx.fillStyle = "#333";
        ctx.font = "10px Arial";
        ctx.fillText(f, currentX + (fragW/2) - 10, 55);
        currentX += fragW;
        ctx.fillStyle = "#e74c3c";
        ctx.fillRect(currentX, 60, S * scale, 50);
        currentX += S * scale;
    });

    if (Z > 0) {
        ctx.fillStyle = Z >= 400 ? "#2ecc71" : "#f39c12";
        ctx.fillRect(currentX, 60, Z * scale, 50);
    }
    ctx.strokeRect(margin, 60, width, 50);
}

function showCalculator() { document.getElementById("menu-container").style.display = "none"; document.getElementById("calculator-container").style.display = "block"; }
function showMenu() { document.getElementById("menu-container").style.display = "block"; document.getElementById("calculator-container").style.display = "none"; }
function exportToText() {
    let txt = "RAPORT\n";
    historyData.forEach(h => txt += `${h.L}mm | ${h.fragsRaw} | Z: ${h.z} (${h.status})\n`);
    const blob = new Blob([txt], {type: "text/plain"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "historia.txt";
    a.click();
}