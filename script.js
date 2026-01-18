let historyData = [];
let profiles = [];
let editingIndex = -1;
let lastOptimizationText = ""; // Globalna zmienna na potrzeby kopiowania

function initApp() {
    loadProfiles();
    loadHistory();
}

// Nawigacja
function showOptimizer() { 
    document.getElementById("menu-container").style.display = "none"; 
    document.getElementById("calculator-container").style.display = "none"; 
    document.getElementById("optimizer-container").style.display = "block"; 
}

function showCalculator() { 
    document.getElementById("menu-container").style.display = "none"; 
    document.getElementById("optimizer-container").style.display = "none"; 
    document.getElementById("calculator-container").style.display = "block"; 
}

function showMenu() { 
    document.getElementById("menu-container").style.display = "block"; 
    document.getElementById("calculator-container").style.display = "none"; 
    document.getElementById("optimizer-container").style.display = "none"; 
}

// Główny algorytm rozkroju
function runOptimization() {
    const L = parseFloat(document.getElementById("opt-L").value);
    const S = parseFloat(document.getElementById("opt-S").value);
    const trim = parseFloat(document.getElementById("opt-trim").value) || 0;
    const pricePerM = parseFloat(document.getElementById("opt-price").value) || 0;
    
    // 1. Parsowanie potrzebnych odcinków
    let fragments = parseInput(document.getElementById("opt-fragments").value);
    
    // 2. Parsowanie zasobów magazynowych (NOWOŚĆ)
    let availableStock = parseInput(document.getElementById("opt-stock").value);
    // Sortujemy magazyn od najkrótszych, by nie marnować długich resztek na małe detale
    availableStock.sort((a, b) => a - b); 

    if (isNaN(L) || fragments.length === 0) { alert("Podaj dane!"); return; }
    
    // Sortowanie potrzebnych elementów malejąco
    fragments.sort((a, b) => b - a);

    let usedStockUnits = []; // Tu trafią wykorzystane resztki z magazynu
    let newFullUnits = [];   // Tu trafią nowe pełne sztangi L

    fragments.forEach(frag => {
        let placed = false;

        // KROK A: Szukaj w już "otwartych" jednostkach (najpierw resztki, potem nowe)
        let allUnits = [...usedStockUnits, ...newFullUnits];
        for (let unit of allUnits) {
            let limit = unit.isFromStock ? unit.initialL : L;
            // Sprawdzamy wolne miejsce uwzględniając trim tylko dla nowych sztang
            let currentTrim = unit.isFromStock ? 0 : trim; 
            let usedSpace = currentTrim + unit.reduce((a, b) => a + b, 0) + (unit.length * S);
            
            if (usedSpace + frag <= limit) {
                unit.push(frag);
                placed = true;
                break;
            }
        }

        // KROK B: Jeśli się nie zmieścił, spróbuj "pobrać" nową końcówkę z magazynu
        if (!placed) {
            for (let i = 0; i < availableStock.length; i++) {
                if (frag <= availableStock[i]) {
                    let newStockUnit = [frag];
                    newStockUnit.isFromStock = true;
                    newStockUnit.initialL = availableStock[i];
                    usedStockUnits.push(newStockUnit);
                    availableStock.splice(i, 1); // Usuwamy z dostępnych
                    placed = true;
                    break;
                }
            }
        }

        // KROK C: Ostatecznie weź nową pełną sztangę L
        if (!placed) {
            let newUnit = [frag];
            newUnit.isFromStock = false;
            newUnit.initialL = L;
            newFullUnits.push(newUnit);
        }
    });

    renderFinalResults(usedStockUnits, newFullUnits, L, S, trim, pricePerM);
}

// Pomocnicza funkcja do parsowania (obsługuje AxB)
function parseInput(text) {
    let result = [];
    text.split(/[\s,\n]+/).forEach(p => {
        if (!p) return;
        if (p.includes('x') || p.includes('*')) {
            const [qty, len] = p.split(/[x*]/).map(Number);
            if (!isNaN(qty) && !isNaN(len)) for(let i=0; i<qty; i++) result.push(len);
        } else {
            const val = parseFloat(p);
            if (!isNaN(val)) result.push(val);
        }
    });
    return result;
}

function copyToClipboard() {
    if (!lastOptimizationText) return;
    navigator.clipboard.writeText(lastOptimizationText).then(() => {
        alert("Lista cięć została skopiowana do schowka!");
    });
}

function renderFinalResults(usedStock, newUnits, L, S, trim, price) {
    const resDiv = document.getElementById("opt-results");
    const totalNewL = newUnits.length * L;
    const cost = (totalNewL / 1000) * price;
    
    let html = `<div style="padding:10px; background:#d4edda; margin-bottom:10px; border-radius:5px;">
                    Wykorzystano <b>${usedStock.length}</b> końcówek z magazynu i <b>${newUnits.length}</b> nowych sztang.
                </div>`;

    // Wyświetlanie najpierw jednostek z magazynu
    [...usedStock, ...newUnits].forEach((unit, i) => {
        const isStock = unit.isFromStock;
        const currentL = isStock ? unit.initialL : L;
        const currentTrim = isStock ? 0 : trim;
        const waste = currentL - unit.reduce((a,b)=>a+b,0) - (unit.length*S) - currentTrim;

        html += `
            <div style="border:1px solid ${isStock ? '#3498db' : '#ccc'}; padding:10px; margin-bottom:5px; border-radius:8px;">
                <small>${isStock ? '📦 MAGAZYN: ' + currentL + 'mm' : '🆕 NOWA SZTANGA: ' + L + 'mm'}</small>
                <div style="display:flex; height:20px; background:#eee; margin-top:5px;">
                    ${!isStock ? `<div style="width:${(trim/L)*100}%; background:#95a5a6;"></div>` : ''}
                    ${unit.map(f => `<div style="width:${(f/currentL)*100}%; background:${isStock ? '#5dade2' : '#3498db'}; border-right:1px solid white;"></div>`).join('')}
                    <div style="flex-grow:1; background:#e67e22;"></div>
                </div>
            </div>
        `;
    });

    document.getElementById("cost-display").innerHTML = `Koszt nowych sztang: <b>${cost.toFixed(2)} PLN</b>`;
    resDiv.innerHTML = html;
}

function displayOptResults(units, L, S, trim) {
    const resDiv = document.getElementById("opt-results");
    let html = `<h4>Wynik: Potrzeba ${units.length} sztang</h4>`;
    
    units.forEach((unit, index) => {
        const sum = unit.reduce((a, b) => a + b, 0);
        const cuts = unit.length * S;
        const waste = L - sum - cuts - trim;
        
        html += `
            <div style="border:1px solid #ddd; padding:15px; border-radius:8px; margin-bottom:10px; background:#fdfdfd">
                <div style="display:flex; justify-content:space-between;">
                    <strong>Sztanga #${index + 1}</strong>
                    <span>Zużycie: ${(((L-waste)/L)*100).toFixed(1)}%</span>
                </div>
                <small style="color:#666">Cięcia: ${unit.join(", ")} mm</small>
                <br><small style="color:#666">Odpad końcowy: <b>${waste.toFixed(1)} mm</b> (w tym ${trim}mm wyrównania)</small>
                
                <div style="display:flex; height:24px; background:#eee; margin-top:8px; border-radius:4px; overflow:hidden; border:1px solid #ccc;">
                    <div style="width:${(trim/L)*100}%; background:#95a5a6; border-right:1px solid #7f8c8d;" title="Wyrównanie"></div>
                    
                    ${unit.map(f => `
                        <div style="width:${(f/L)*100}%; background:#3498db; border-right:2px solid #e74c3c; display:flex; align-items:center; justify-content:center; color:white; font-size:10px; font-weight:bold;">
                            ${f}
                        </div>`).join('')}
                    
                    ${waste > 0 ? `<div style="width:${(waste/L)*100}%; background:#e67e22;"></div>` : ''}
                </div>
            </div>
        `;
    });
    
    resDiv.innerHTML = html;
}

function displayOptResults(units, L, S, trim) {
    const resDiv = document.getElementById("opt-results");
    let html = `<h4>Wynik: Potrzeba ${units.length} sztang</h4>`;
    
    units.forEach((unit, index) => {
        const sumFrags = unit.reduce((a, b) => a + b, 0);
        const cuts = unit.length * S;
        const waste = L - sumFrags - cuts - trim; // Odejmujemy naddatek od wolnego miejsca
        
        html += `
            <div style="border:1px solid #ddd; padding:15px; border-radius:8px; margin-bottom:10px; background:#fdfdfd">
                <strong>Sztanga #${index + 1}</strong> (Wyrównanie: ${trim}mm): ${unit.join(" | ")} mm 
                <br><small style="color:#666">Czysty odpad: <b>${waste.toFixed(1)} mm</b></small>
                <div style="display:flex; height:24px; background:#eee; margin-top:8px; border-radius:4px; overflow:hidden; border:1px solid #ccc;">
                    <div style="width:${(trim/L)*100}%; background:#95a5a6; border-right:1px solid white;" title="Wyrównanie"></div>
                    
                    ${unit.map(f => `
                        <div style="width:${(f/L)*100}%; background:#3498db; border-right:2px solid #e74c3c; display:flex; align-items:center; justify-content:center; color:white; font-size:9px;">
                            ${f}
                        </div>`).join('')}
                    
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

function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDark);
    
    const btn = document.getElementById('dark-mode-toggle');
    btn.textContent = isDark ? '☀️ Tryb Jasny' : '🌙 Tryb Ciemny';
    
    // Odśwież rysunek na canvasie, jeśli istnieje
    if (document.getElementById("viz-container").style.display !== "none") {
        calculateZ(); 
    }
}

// Wywołaj to w funkcji initApp()
function initApp() {
    loadProfiles();
    loadHistory();
    
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        document.getElementById('dark-mode-toggle').textContent = '☀️ Tryb Jasny';
    }
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