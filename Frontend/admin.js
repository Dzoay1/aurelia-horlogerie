const API_BASE = window.AURELIA_API_BASE || 'http://localhost:5000/api';
let adminKey = sessionStorage.getItem('aurelia_admin_key') || '';

document.addEventListener('DOMContentLoaded', () => {
    if (adminKey) {
        unlockPortal();
    }
});

async function loginAdmin(e) {
    e.preventDefault();
    const passcode = document.getElementById('admin-passcode').value.trim();

    try {
        const res = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: { 'x-admin-key': passcode }
        });

        if (!res.ok) {
            alert('Access Denied: Invalid Geneva Concierge Passcode.');
            return;
        }

        adminKey = passcode;
        sessionStorage.setItem('aurelia_admin_key', adminKey);
        unlockPortal();
    } catch (err) {
        alert('Cannot reach backend server. Ensure node server.js is running.');
    }
}

function unlockPortal() {
    document.getElementById('admin-login-screen').style.display = 'none';
    document.getElementById('admin-dashboard').style.display = 'block';
    document.getElementById('admin-logout-btn').style.display = 'inline-block';
    loadDashboardData();
}

function logoutAdmin() {
    sessionStorage.removeItem('aurelia_admin_key');
    adminKey = '';
    location.reload();
}

async function loadDashboardData() {
    try {
        const res = await fetch(`${API_BASE}/admin/dashboard`, {
            headers: { 'x-admin-key': adminKey }
        });

        if (!res.ok) {
            logoutAdmin();
            return;
        }

        const { orders, appointments, warranties } = await res.json();

        // Update KPI Cards
        const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        document.getElementById('kpi-revenue').innerText = `$${totalRevenue.toLocaleString()}`;
        document.getElementById('kpi-orders').innerText = orders.length;
        document.getElementById('kpi-appointments').innerText = appointments.length;
        document.getElementById('kpi-warranties').innerText = warranties.length;

        renderOrdersTable(orders);
        renderAppointmentsTable(appointments);
    } catch (err) {
        console.error('Error loading dashboard:', err);
    }
}

function renderOrdersTable(orders) {
    const tbody = document.getElementById('orders-table-body');
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No Private Vault orders recorded yet.</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => {
        const dateStr = new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const itemsList = order.items.map(i => `<div><strong>${i.name}</strong> <span style="color:var(--text-muted); font-size:11px;">(${i.configSummary || 'Standard'})</span></div>`).join('');

        return `
            <tr>
                <td>${dateStr}</td>
                <td>${order.clientEmail}</td>
                <td>${itemsList}</td>
                <td style="color:var(--gold); font-weight:600;">$${order.totalAmount.toLocaleString()}</td>
                <td>
                    <select class="status-select" onchange="updateOrderStatus('${order._id}', this.value)">
                        <option ${order.status === 'Pending Concierge Review' ? 'selected' : ''}>Pending Concierge Review</option>
                        <option ${order.status === 'Atelier Assembly' ? 'selected' : ''}>Atelier Assembly</option>
                        <option ${order.status === 'Armored Transit' ? 'selected' : ''}>Armored Transit</option>
                        <option ${order.status === 'Delivered & Certified' ? 'selected' : ''}>Delivered & Certified</option>
                    </select>
                </td>
            </tr>
        `;
    }).join('');
}

function renderAppointmentsTable(appointments) {
    const tbody = document.getElementById('appointments-table-body');
    if (appointments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No salon appointments scheduled yet.</td></tr>';
        return;
    }

    tbody.innerHTML = appointments.map(app => `
        <tr>
            <td><strong>${app.fullName}</strong></td>
            <td>${app.boutique}</td>
            <td>${app.preferredDate}</td>
            <td>
                <select class="status-select" onchange="updateAppointmentStatus('${app._id}', this.value)">
                    <option ${app.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                    <option ${app.status === 'VIP Salon Prepared' ? 'selected' : ''}>VIP Salon Prepared</option>
                    <option ${app.status === 'Completed' ? 'selected' : ''}>Completed</option>
                    <option ${app.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </td>
        </tr>
    `).join('');
}

async function updateOrderStatus(orderId, status) {
    await fetch(`${API_BASE}/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ status })
    });
}

async function updateAppointmentStatus(appId, status) {
    await fetch(`${API_BASE}/admin/appointments/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ status })
    });
}

async function mintCertificate(e) {
    e.preventDefault();
    const randomHash = '0x' + Array.from({ length: 48 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

    const payload = {
        serialNumber: document.getElementById('cert-serial').value.trim().toUpperCase(),
        model: document.getElementById('cert-model').value.trim(),
        ref: document.getElementById('cert-ref').value.trim(),
        caliber: document.getElementById('cert-caliber').value.trim(),
        caseMaterial: document.getElementById('cert-material').value.trim(),
        originSalon: document.getElementById('cert-salon').value,
        warrantyStatus: 'Active • 8-Year International Guarantee',
        ledgerHash: randomHash,
        serviceHistory: [{ date: today, note: 'Original Salon Delivery & Seal Certification' }]
    };

    const res = await fetch(`${API_BASE}/admin/warranties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to register certificate.');
        return;
    }

    alert(`Certificate ${payload.serialNumber} minted to the Geneva Blockchain Registry! Clients can now verify it on the main storefront.`);
    e.target.reset();
    loadDashboardData();
}

async function appendServiceRecord(e) {
    e.preventDefault();
    const serial = document.getElementById('service-serial').value.trim().toUpperCase();
    const date = document.getElementById('service-date').value.trim();
    const note = document.getElementById('service-note').value.trim();

    try {
        const res = await fetch(`${API_BASE}/admin/warranties/${encodeURIComponent(serial)}/service`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': adminKey
            },
            body: JSON.stringify({ date, note })
        });

        const data = await res.json();
        if (!res.ok) {
            alert(data.error || 'Failed to append service entry.');
            return;
        }

        alert(`Service entry added to ${data.serialNumber}.`);
        e.target.reset();
    } catch (err) {
        alert('Unable to connect to the backend server.');
    }
}