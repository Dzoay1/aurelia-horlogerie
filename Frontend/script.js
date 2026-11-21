const API_BASE = window.AURELIA_API_BASE || 'http://localhost:5000/api';

const defaultWatches = [
    {
        name: "Aurelia Royal Grand",
        ref: "Ref. AR-8821-YG",
        price: 38500,
        category: "Limited Edition",
        img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
        specs: {
            "Movement": "Caliber AUR-01 Automatic",
            "Case Material": "18k Yellow Gold (40mm)",
            "Power Reserve": "72 Hours",
            "Crystal": "Domed Sapphire Anti-Reflective",
            "Water Resistance": "100 Meters / 10 ATM"
        }
    },
    {
        name: "Chronos Noir Skeleton",
        ref: "Ref. CN-904-BK",
        price: 54200,
        category: "Tourbillon",
        img: "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&w=800&q=80",
        specs: {
            "Movement": "Openworked Flying Tourbillon",
            "Case Material": "Brushed Grade 5 Titanium & DLC",
            "Power Reserve": "80 Hours",
            "Crystal": "Sapphire Exhibition Caseback",
            "Water Resistance": "50 Meters / 5 ATM"
        }
    },
    {
        name: "Imperial Heritage",
        ref: "Ref. IH-410-RG",
        price: 29900,
        category: "Automatic",
        img: "https://images.unsplash.com/photo-1533139502658-0198f920d8e8?auto=format&fit=crop&w=800&q=80",
        specs: {
            "Movement": "Caliber AUR-04 Ultra-Thin",
            "Case Material": "18k Rose Gold (39mm)",
            "Power Reserve": "65 Hours",
            "Strap": "Hand-Stitched Alligator Leather",
            "Water Resistance": "50 Meters / 5 ATM"
        }
    }
];

let watches = [...defaultWatches];
let vaultCart = [];
let activeWatchIndex = 0;

let customState = {
    metal: { name: '18k Yellow Gold', code: 'YG', price: 0, filter: 'sepia(0.25) saturate(1.2)' },
    dial: { name: 'Obsidian Sunburst', price: 0, bg: 'radial-gradient(circle, #242424 0%, #090909 100%)' },
    strap: { name: 'Hand-Stitched Alligator', price: 0 }
};

// --- 1. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadWatches();
    startClocks();
    setupFilterBar();
    setupCustomizerControls();
    setupNavbarScroll();
});

async function loadWatches() {
    renderWatchGrid('all');

    try {
        const res = await fetch(`${API_BASE}/watches`);
        if (res.ok) {
            const dbWatches = await res.json();
            if (Array.isArray(dbWatches) && dbWatches.length > 0) {
                watches = dbWatches;
                renderWatchGrid('all');
            }
        }
    } catch (err) {
        console.warn('Backend offline — displaying local watch catalog.');
    }
}

function setupFilterBar() {
    document.querySelectorAll('#collection-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('#collection-filters .filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            renderWatchGrid(this.dataset.filter);
        });
    });
}

function renderWatchGrid(filterCategory = 'all') {
    const grid = document.getElementById('watch-grid-container');
    if (!grid) return;

    const filtered = watches
        .map((watch, idx) => ({ watch, idx }))
        .filter(({ watch }) => filterCategory === 'all' || watch.category === filterCategory);

    if (filtered.length === 0) {
        grid.innerHTML = `<p style="color: var(--text-muted); grid-column: 1 / -1; text-align: center;">No timepieces found in this category.</p>`;
        return;
    }

    grid.innerHTML = filtered.map(({ watch, idx }) => `
        <div class="watch-card" data-category="${watch.category}">
            <div class="watch-img-container">
                <span class="badge-tag">${watch.category}</span>
                <img src="${watch.img}" alt="${watch.name}">
            </div>
            <div class="watch-info">
                <h3 class="watch-name">${watch.name}</h3>
                <p class="watch-ref">${watch.ref}</p>
                <div class="watch-footer">
                    <span class="watch-price">$${Number(watch.price).toLocaleString()}</span>
                    <a href="javascript:void(0)" onclick="openWatchModal(${idx})" class="details-link">
                        Discover <i class="fa-solid fa-arrow-right"></i>
                    </a>
                </div>
            </div>
        </div>
    `).join('');
}

// --- 2. LIVE ANALOG & DIGITAL CLOCKS ---
function startClocks() {
    function tick() {
        const now = new Date();
        const sec = now.getSeconds();
        const min = now.getMinutes();
        const hr = now.getHours() % 12;

        const hHand = document.getElementById('hour-hand');
        const mHand = document.getElementById('minute-hand');
        const sHand = document.getElementById('second-hand');
        const dialDate = document.getElementById('dial-date');
        const realTimeEl = document.getElementById('real-time-display');

        if (hHand) hHand.style.transform = `rotate(${hr * 30 + min * 0.5}deg)`;
        if (mHand) mHand.style.transform = `rotate(${min * 6 + sec * 0.1}deg)`;
        if (sHand) sHand.style.transform = `rotate(${sec * 6}deg)`;
        if (dialDate) dialDate.textContent = now.getDate();
        if (realTimeEl) {
            realTimeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
    }
    tick();
    setInterval(tick, 1000);
}

// --- 3. WATCH MODAL & BESPOKE CUSTOMIZER ---
function openWatchModal(index) {
    activeWatchIndex = index;
    const watch = watches[index];
    if (!watch) return;

    resetCustomizer();

    const imgEl = document.getElementById('modal-watch-img');
    if (imgEl) imgEl.src = watch.img;
    document.getElementById('modal-watch-ref').textContent = watch.ref;
    document.getElementById('modal-watch-name').textContent = watch.name;

    const specsList = document.getElementById('modal-watch-specs');
    if (specsList) {
        specsList.innerHTML = '';
        if (watch.specs) {
            const entries = watch.specs instanceof Map ? Array.from(watch.specs.entries()) : Object.entries(watch.specs);
            entries.forEach(([key, val]) => {
                specsList.innerHTML += `<li><span>${key}</span><span>${val}</span></li>`;
            });
        }
    }

    const addBtn = document.getElementById('modal-add-btn');
    if (addBtn) {
        addBtn.onclick = addCurrentWatchToVault;
    }

    updateCustomizerUI();
    document.getElementById('watch-modal').classList.add('active');
}

function closeWatchModal() {
    const modal = document.getElementById('watch-modal');
    if (modal) modal.classList.remove('active');
}

function resetCustomizer() {
    customState = {
        metal: { name: '18k Yellow Gold', code: 'YG', price: 0, filter: 'sepia(0.25) saturate(1.2)' },
        dial: { name: 'Obsidian Sunburst', price: 0, bg: 'radial-gradient(circle, #242424 0%, #090909 100%)' },
        strap: { name: 'Hand-Stitched Alligator', price: 0 }
    };

    document.querySelectorAll('#metal-swatches .swatch-btn').forEach((btn, i) => btn.classList.toggle('active', i === 0));
    document.querySelectorAll('#dial-swatches .swatch-btn').forEach((btn, i) => btn.classList.toggle('active', i === 0));
    document.querySelectorAll('#strap-options .strap-pill').forEach((pill, i) => pill.classList.toggle('active', i === 0));
}

function setupCustomizerControls() {
    document.querySelectorAll('#metal-swatches .swatch-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#metal-swatches .swatch-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            customState.metal = {
                name: btn.dataset.metal,
                code: btn.dataset.code || 'YG',
                price: Number(btn.dataset.price || 0),
                filter: btn.dataset.filter || 'none'
            };
            updateCustomizerUI();
        });
    });

    document.querySelectorAll('#dial-swatches .swatch-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#dial-swatches .swatch-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            customState.dial = {
                name: btn.dataset.dial,
                price: Number(btn.dataset.price || 0),
                bg: btn.dataset.bg || ''
            };
            updateCustomizerUI();
        });
    });

    document.querySelectorAll('#strap-options .strap-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('#strap-options .strap-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            customState.strap = {
                name: pill.dataset.strap,
                price: Number(pill.dataset.price || 0)
            };
            updateCustomizerUI();
        });
    });
}

function updateCustomizerUI() {
    const watch = watches[activeWatchIndex];
    if (!watch) return;

    const totalPrice = Number(watch.price) + customState.metal.price + customState.dial.price + customState.strap.price;
    document.getElementById('modal-watch-price').textContent = `$${totalPrice.toLocaleString()}`;

    const metalLabel = document.getElementById('selected-metal-name');
    const dialLabel = document.getElementById('selected-dial-name');
    const strapTag = document.getElementById('customizer-strap-tag');
    const summaryEl = document.getElementById('customizer-summary');
    const imgEl = document.getElementById('modal-watch-img');
    const stageEl = document.getElementById('watch-preview-stage');

    if (metalLabel) metalLabel.textContent = customState.metal.name;
    if (dialLabel) dialLabel.textContent = customState.dial.name;
    if (strapTag) strapTag.textContent = customState.strap.name;
    if (summaryEl) {
        summaryEl.textContent = `${customState.metal.name} • ${customState.dial.name} • ${customState.strap.name}`;
    }
    if (imgEl) {
        imgEl.style.filter = customState.metal.filter;
    }
    if (stageEl && customState.dial.bg) {
        stageEl.style.background = customState.dial.bg;
    }
}

// --- 4. PRIVATE VAULT (CART) & CHECKOUT ---
function addCurrentWatchToVault() {
    const watch = watches[activeWatchIndex];
    if (!watch) return;

    const totalPrice = Number(watch.price) + customState.metal.price + customState.dial.price + customState.strap.price;
    const configSummary = `${customState.metal.name}, ${customState.dial.name}, ${customState.strap.name}`;

    vaultCart.push({
        name: watch.name,
        price: totalPrice,
        configSummary
    });

    renderCart();
    closeWatchModal();
    toggleCart(true);
}

function renderCart() {
    const container = document.getElementById('cart-items');
    const badge = document.getElementById('cart-count');
    const totalEl = document.getElementById('cart-total-price');

    if (badge) badge.textContent = vaultCart.length;

    if (!container) return;

    if (vaultCart.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); text-align: center; margin-top: 40px;">Your vault is currently empty.</p>`;
        if (totalEl) totalEl.textContent = '$0';
        return;
    }

    let sum = 0;
    container.innerHTML = vaultCart.map((item, idx) => {
        sum += item.price;
        return `
            <div class="cart-item">
                <div>
                    <h4 style="font-size: 15px;">${item.name}</h4>
                    <p style="font-size: 11px; color: var(--text-muted);">${item.configSummary}</p>
                    <span style="color: var(--gold); font-size: 13px;">$${item.price.toLocaleString()}</span>
                </div>
                <button type="button" onclick="removeFromVault(${idx})" style="background:none; border:none; color:#ff6b6b; cursor:pointer; font-size:15px;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
    }).join('');

    if (totalEl) totalEl.textContent = `$${sum.toLocaleString()}`;
}

function removeFromVault(idx) {
    vaultCart.splice(idx, 1);
    renderCart();
}

function toggleCart(forceOpen = null) {
    const drawer = document.getElementById('cart-drawer');
    if (!drawer) return;
    if (forceOpen === true) drawer.classList.add('open');
    else drawer.classList.toggle('open');
}

async function checkoutVault() {
    if (vaultCart.length === 0) {
        alert('Please select a timepiece first.');
        return;
    }

    const emailInput = document.getElementById('vault-client-email');
    const clientEmail = emailInput ? emailInput.value.trim() : '';

    if (!clientEmail || !clientEmail.includes('@')) {
        alert('Please enter a valid client email address.');
        if (emailInput) emailInput.focus();
        return;
    }

    const totalAmount = vaultCart.reduce((acc, item) => acc + item.price, 0);

    try {
        const res = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientEmail, items: vaultCart, totalAmount })
        });
        const data = await res.json();

        if (!res.ok) {
            alert(data.error || 'Unable to process order.');
            return;
        }

        alert(`Bespoke allocation registered.\nOrder Reference ID: ${data.orderId}`);
        vaultCart = [];
        emailInput.value = '';
        renderCart();
        toggleCart();
    } catch (err) {
        alert('Unable to connect to the Aurelia server. Please ensure node server.js is running.');
    }
}

// --- 5. PRIVATE VIEWING APPOINTMENTS ---
function openViewingModal() {
    document.getElementById('viewing-modal').classList.add('active');
}

function closeViewingModal() {
    document.getElementById('viewing-modal').classList.remove('active');
}

function openViewingWithCity(boutiqueName) {
    const select = document.getElementById('viewing-boutique');
    if (select) {
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].text.includes(boutiqueName.split(' ')[0])) {
                select.selectedIndex = i;
                break;
            }
        }
    }
    openViewingModal();
}

async function submitViewingForm(e) {
    e.preventDefault();
    const fullName = document.getElementById('viewing-name').value.trim();
    const boutique = document.getElementById('viewing-boutique').value;
    const preferredDate = document.getElementById('viewing-date').value;

    try {
        const res = await fetch(`${API_BASE}/appointments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, boutique, preferredDate })
        });
        const data = await res.json();

        if (!res.ok) {
            alert(data.error || 'Unable to schedule viewing.');
            return;
        }

        e.target.reset();
        closeViewingModal();
        alert(`Private salon viewing confirmed at ${boutique} on ${preferredDate}.\nReference ID: ${data.appointmentId}`);
    } catch (err) {
        alert('Unable to reach the Geneva Concierge server.');
    }
}

// --- 6. SEARCH & CLIENT PORTAL MODALS ---
function toggleSearchModal() {
    const modal = document.getElementById('search-modal');
    modal.classList.toggle('active');
    if (modal.classList.contains('active')) {
        const input = document.getElementById('search-input');
        if (input) {
            input.value = '';
            input.focus();
        }
        filterWatches();
    }
}

function filterWatches() {
    const query = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) return;

    const matches = watches
        .map((w, idx) => ({ w, idx }))
        .filter(({ w }) => {
            const specText = w.specs ? JSON.stringify(w.specs).toLowerCase() : '';
            return (
                w.name.toLowerCase().includes(query) ||
                w.ref.toLowerCase().includes(query) ||
                w.category.toLowerCase().includes(query) ||
                specText.includes(query)
            );
        });

    if (matches.length === 0) {
        resultsContainer.innerHTML = `<p style="color: var(--text-muted); padding: 12px 0;">No matching timepieces found.</p>`;
        return;
    }

    resultsContainer.innerHTML = matches.map(({ w, idx }) => `
        <div class="cart-item" style="cursor:pointer;" onclick="toggleSearchModal(); openWatchModal(${idx});">
            <div style="display:flex; align-items:center; gap:14px;">
                <img src="${w.img}" alt="${w.name}" style="width:54px; height:54px; object-fit:cover;">
                <div>
                    <h4 style="font-size:16px;">${w.name}</h4>
                    <p style="font-size:11px; color:var(--text-muted);">${w.ref} &bull; ${w.category}</p>
                </div>
            </div>
            <span style="color:var(--gold); font-weight:600;">$${Number(w.price).toLocaleString()}</span>
        </div>
    `).join('');
}

function toggleAccountModal() {
    document.getElementById('account-modal').classList.toggle('active');
}

async function handleClientLogin(e) {
    if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
    }

    const form = e?.target || document.querySelector('#account-modal form');
    if (!form) return;

    const emailInput = form.querySelector('input[type="email"]');
    const lookupInput = form.querySelector('input[type="password"], input[type="text"]');

    const email = emailInput ? emailInput.value.trim() : '';
    const lookup = lookupInput ? lookupInput.value.trim() : '';

    let outputBox = document.getElementById('client-portal-records');
    if (!outputBox) {
        outputBox = document.createElement('div');
        outputBox.id = 'client-portal-records';
        outputBox.style.marginTop = '20px';
        outputBox.style.borderTop = '1px solid rgba(212, 175, 55, 0.25)';
        outputBox.style.paddingTop = '16px';
        form.insertAdjacentElement('afterend', outputBox);
    }

    if (!email) {
        outputBox.innerHTML = `<div class="cert-error-box">Please enter your client email address.</div>`;
        return;
    }

    outputBox.innerHTML = `<p style="color: var(--text-muted); font-size: 12px;">Retrieving Geneva client ledger...</p>`;

    const baseUrl = (typeof API_BASE !== 'undefined' && API_BASE)
        ? API_BASE
        : (window.AURELIA_API_BASE || 'http://localhost:5000/api');

    try {
        const res = await fetch(`${baseUrl}/client/portal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, lookup })
        });

        const data = await res.json();

        if (!res.ok) {
            outputBox.innerHTML = `<div class="cert-error-box">${data.error || 'Unable to load client records.'}</div>`;
            return;
        }

        const orders = Array.isArray(data.orders) ? data.orders : [];
        const warranties = Array.isArray(data.warranties) ? data.warranties : [];
        const appointments = Array.isArray(data.appointments) ? data.appointments : [];

        const ordersHTML = orders.length
            ? orders.map(o => `
                <div style="padding: 10px; background: #161616; border: 1px solid rgba(212,175,55,0.2); margin-bottom: 10px; font-size: 12px;">
                    <div style="display:flex; justify-content:space-between; color:var(--gold); font-weight:600;">
                        <span>$${Number(o.totalAmount || 0).toLocaleString()}</span>
                        <span>${o.status || 'Pending Concierge Review'}</span>
                    </div>
                    <div style="color:var(--text-muted); margin-top:4px;">
                        ${(o.items || []).map(i => `${i.name} (${i.configSummary || 'Standard'})`).join(', ')}
                    </div>
                </div>
            `).join('')
            : `<p style="color:var(--text-muted); font-size:12px;">No allocations found for ${email}.</p>`;

        const certHTML = warranties.length
            ? warranties.map(w => `
                <div style="padding: 10px; background: #161616; border: 1px solid rgba(86,211,100,0.35); margin-top: 10px; font-size: 12px;">
                    <strong style="color:#56d364;">${w.serialNumber}</strong> — ${w.model} (${w.warrantyStatus})
                </div>
            `).join('')
            : '';

        const apptHTML = appointments.length
            ? appointments.map(a => `
                <div style="padding: 10px; background: #161616; border: 1px solid rgba(212,175,55,0.25); margin-top: 10px; font-size: 12px;">
                    <strong style="color:var(--gold);">${a.fullName}</strong> — ${a.boutique} (${a.preferredDate}) • <em>${a.status}</em>
                </div>
            `).join('')
            : '';

        outputBox.innerHTML = `
            <h4 style="font-size:12px; letter-spacing:2px; text-transform:uppercase; color:var(--gold); margin-bottom:10px;">Your Allocations</h4>
            ${ordersHTML}
            ${certHTML}
            ${apptHTML}
        `;
    } catch (err) {
        console.error('Client portal fetch error:', err);
        outputBox.innerHTML = `
            <div class="cert-error-box">
                Could not reach <code>${baseUrl}/client/portal</code>.<br>
                Make sure <code>node server.js</code> is running in your backend folder.
            </div>
        `;
    }
}

// Guaranteed form submit binding for the Client Portal modal
document.addEventListener('DOMContentLoaded', () => {
    const portalForm = document.querySelector('#account-modal form');
    if (portalForm) {
        portalForm.addEventListener('submit', handleClientLogin);
    }
});

// --- 7. WARRANTY & BLOCKCHAIN PROVENANCE ---
function openWarrantyModal() {
    const input = document.getElementById('serial-input');
    const container = document.getElementById('warranty-result-container');
    if (input) input.value = '';
    if (container) container.innerHTML = '';
    document.getElementById('warranty-modal').classList.add('active');
}

function closeWarrantyModal() {
    document.getElementById('warranty-modal').classList.remove('active');
}

function fillAndVerify(serial) {
    const input = document.getElementById('serial-input');
    if (input) input.value = serial;
    fetchWarrantyRecord(serial);
}

function verifySerialNumber(e) {
    e.preventDefault();
    const rawSerial = (document.getElementById('serial-input')?.value || '').trim().toUpperCase();
    if (rawSerial) fetchWarrantyRecord(rawSerial);
}

async function fetchWarrantyRecord(serial) {
    const container = document.getElementById('warranty-result-container');
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE}/warranty/${serial}`);
        if (!res.ok) {
            container.innerHTML = `
                <div class="cert-error-box">
                    <strong>Serial Number "${serial}" Not Found</strong><br>
                    No matching record exists in the Geneva Registry.
                </div>
            `;
            return;
        }
        const record = await res.json();
        const historyHTML = (record.serviceHistory || []).map(entry => `
            <div class="service-entry"><span>${entry.date}</span><span>${entry.note}</span></div>
        `).join('');

        container.innerHTML = `
            <div class="certificate-card">
                <div class="cert-header">
                    <div>
                        <span style="font-size: 11px; color: var(--gold); letter-spacing: 2px;">SERIAL ${record.serialNumber}</span>
                        <h3 style="font-size: 22px; margin-top: 2px;">${record.model}</h3>
                    </div>
                    <div class="cert-verified-badge"><i class="fa-solid fa-shield-halved"></i> Verified Authentic</div>
                </div>
                <div class="cert-grid">
                    <div class="cert-field"><span>Reference & Caliber</span><strong>${record.ref} &bull; ${record.caliber}</strong></div>
                    <div class="cert-field"><span>Case Material</span><strong>${record.caseMaterial}</strong></div>
                    <div class="cert-field"><span>Originating Salon</span><strong>${record.originSalon}</strong></div>
                    <div class="cert-field"><span>International Warranty</span><strong style="color: #56d364;">${record.warrantyStatus}</strong></div>
                </div>
                <div class="blockchain-hash-box">
                    <span style="color:var(--gold); display:block; margin-bottom:4px;">AURELIA LEDGER PROVENANCE HASH</span>
                    <code>${record.ledgerHash}</code>
                </div>
                <div>
                    <h4 style="font-size:12px; letter-spacing:2px; text-transform:uppercase; color:var(--gold); margin-bottom:10px;">Atelier Service Log</h4>
                    ${historyHTML}
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="cert-error-box">Error connecting to verification ledger.</div>`;
    }
}

// --- 8. NAVIGATION & UNIVERSAL MODAL CLOSING ---
function toggleMobileMenu() {
    document.getElementById('mobile-nav').classList.toggle('active');
}

function setupNavbarScroll() {
    window.addEventListener('scroll', () => {
        const nav = document.getElementById('navbar');
        if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
    });
}

document.addEventListener('click', function (e) {
    const closeBtn = e.target.closest('.modal-close');
    if (closeBtn) {
        const parentModal = closeBtn.closest('.modal-backdrop');
        if (parentModal) {
            parentModal.classList.remove('active');
        }
    }
    if (e.target.classList.contains('modal-backdrop')) {
        e.target.classList.remove('active');
    }
});

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});