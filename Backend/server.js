const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json({ limit: '1mb' }));
// --- SECURITY HEADERS & CORS ALLOWLIST ---
app.disable('x-powered-by');

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (e.g. curl, mobile apps, file:// or local dev)
        if (!origin) return callback(null, true);
        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS policy'));
    }
}));

// --- LIGHTWEIGHT IN-MEMORY RATE LIMITER FOR PUBLIC WRITE/LOOKUP ROUTES ---
const rateLimitStore = new Map();

function createRateLimiter(windowMs, maxRequests) {
    return (req, res, next) => {
        const ip = req.ip || req.socket?.remoteAddress || 'unknown';
        const key = `${req.path}:${ip}`;
        const now = Date.now();

        const entry = rateLimitStore.get(key);
        if (!entry || now - entry.startTime > windowMs) {
            rateLimitStore.set(key, { startTime: now, count: 1 });
            return next();
        }

        if (entry.count >= maxRequests) {
            return res.status(429).json({
                error: 'Too many requests. Please wait a moment before trying again.'
            });
        }

        entry.count += 1;
        return next();
    };
}

// Apply rate limits to public POST / lookup endpoints
app.use('/api/orders', createRateLimiter(60 * 1000, 15));
app.use('/api/appointments', createRateLimiter(60 * 1000, 15));
app.use('/api/client/portal', createRateLimiter(60 * 1000, 30));
app.use(cors());

// --- HELPER: VALIDATE MONGODB OBJECT ID ---
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// --- 1. MONGODB DATABASE SCHEMAS ---
const watchSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    ref: { type: String, required: true, unique: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    img: { type: String, required: true, trim: true },
    specs: { type: Map, of: String }
});
const Watch = mongoose.model('Watch', watchSchema);

const orderSchema = new mongoose.Schema({
    clientEmail: { type: String, required: true, trim: true, lowercase: true },
    items: [
        {
            name: { type: String, required: true, trim: true },
            price: { type: Number, required: true, min: 0 },
            configSummary: { type: String, default: 'Standard Configuration', trim: true }
        }
    ],
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
        type: String,
        enum: ['Pending Concierge Review', 'Atelier Assembly', 'Armored Transit', 'Delivered & Certified'],
        default: 'Pending Concierge Review'
    },
    createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

const appointmentSchema = new mongoose.Schema({
    fullName: { type: String, required: true, trim: true },
    boutique: { type: String, required: true, trim: true },
    preferredDate: { type: String, required: true, trim: true },
    status: {
        type: String,
        enum: ['Confirmed', 'VIP Salon Prepared', 'Completed', 'Cancelled'],
        default: 'Confirmed'
    },
    createdAt: { type: Date, default: Date.now }
});
const Appointment = mongoose.model('Appointment', appointmentSchema);

const warrantySchema = new mongoose.Schema({
    serialNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
    model: { type: String, required: true, trim: true },
    ref: { type: String, required: true, trim: true },
    caliber: { type: String, required: true, trim: true },
    caseMaterial: { type: String, required: true, trim: true },
    originSalon: { type: String, required: true, trim: true },
    warrantyStatus: { type: String, required: true, trim: true },
    ledgerHash: { type: String, required: true, trim: true },
    serviceHistory: [{ date: String, note: String }]
});
const Warranty = mongoose.model('Warranty', warrantySchema);

// --- ADMIN AUTH MIDDLEWARE ---
const verifyAdmin = (req, res, next) => {
    const providedKey = req.headers['x-admin-key'];
    const validKey = process.env.ADMIN_KEY;

    if (!validKey) {
        return res.status(500).json({ error: 'Server admin key is not configured.' });
    }
    if (!providedKey || providedKey !== validKey) {
        return res.status(401).json({ error: 'Unauthorized: Invalid Concierge Passcode' });
    }
    next();
};

// --- 2. PUBLIC REST API ENDPOINTS ---
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

app.get('/api/watches', async (req, res) => {
    try {
        const { category } = req.query;
        const query = category && category !== 'all' ? { category } : {};
        const watches = await Watch.find(query);
        res.json(watches);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch watches' });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const { clientEmail, items, totalAmount } = req.body;
        const cleanEmail = (clientEmail || '').trim().toLowerCase();

        if (!cleanEmail || !cleanEmail.includes('@')) {
            return res.status(400).json({ error: 'A valid client email address is required.' });
        }
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'At least one timepiece is required for allocation.' });
        }
        if (typeof totalAmount !== 'number' || Number.isNaN(totalAmount) || totalAmount <= 0) {
            return res.status(400).json({ error: 'Invalid order total amount.' });
        }

        const newOrder = new Order({
            clientEmail: cleanEmail,
            items,
            totalAmount
        });
        await newOrder.save();

        res.status(201).json({
            message: 'Order registered successfully',
            orderId: newOrder._id
        });
    } catch (err) {
        res.status(400).json({ error: 'Failed to process order' });
    }
});

app.post('/api/appointments', async (req, res) => {
    try {
        const fullName = (req.body.fullName || '').trim();
        const boutique = (req.body.boutique || '').trim();
        const preferredDate = (req.body.preferredDate || '').trim();

        if (!fullName || !boutique || !preferredDate) {
            return res.status(400).json({ error: 'Full name, boutique, and preferred date are required.' });
        }

        const newAppointment = new Appointment({ fullName, boutique, preferredDate });
        await newAppointment.save();

        res.status(201).json({
            message: 'Private viewing scheduled',
            appointmentId: newAppointment._id
        });
    } catch (err) {
        res.status(400).json({ error: 'Failed to schedule private viewing' });
    }
});

app.get('/api/warranty/:serial', async (req, res) => {
    try {
        const serial = (req.params.serial || '').trim().toUpperCase();
        if (!serial) {
            return res.status(400).json({ error: 'Serial number is required.' });
        }

        const record = await Warranty.findOne({ serialNumber: serial });
        if (!record) {
            return res.status(404).json({ error: 'Serial number not found in registry' });
        }
        res.json(record);
    } catch (err) {
        res.status(500).json({ error: 'Server error during verification' });
    }
});

app.post('/api/client/portal', async (req, res) => {
    try {
        const email = (req.body.email || '').trim().toLowerCase();
        const lookup = (req.body.lookup || '').trim().toUpperCase();

        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Please provide a valid client email.' });
        }

        const orders = await Order.find({ clientEmail: email }).sort({ createdAt: -1 });
        const warranties = lookup ? await Warranty.find({ serialNumber: lookup }) : [];

        res.json({
            clientEmail: email,
            orders,
            warranties
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve client records.' });
    }
});

// --- 3. PROTECTED CONCIERGE ADMIN ENDPOINTS ---
app.post('/api/admin/login', verifyAdmin, (req, res) => {
    res.json({ success: true, message: 'Geneva Concierge Access Granted' });
});

app.get('/api/admin/dashboard', verifyAdmin, async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        const appointments = await Appointment.find().sort({ createdAt: -1 });
        const warranties = await Warranty.find().sort({ _id: -1 });
        res.json({ orders, appointments, warranties });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load concierge dashboard data' });
    }
});

app.patch('/api/admin/orders/:id', verifyAdmin, async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ error: 'Invalid order ID format.' });
        }

        const updated = await Order.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: 'Failed to update order status' });
    }
});

app.patch('/api/admin/appointments/:id', verifyAdmin, async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ error: 'Invalid appointment ID format.' });
        }

        const updated = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({ error: 'Appointment not found.' });
        }

        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: 'Failed to update appointment status' });
    }
});

app.post('/api/admin/warranties', verifyAdmin, async (req, res) => {
    try {
        const payload = {
            ...req.body,
            serialNumber: (req.body.serialNumber || '').trim().toUpperCase()
        };
        const newCert = new Warranty(payload);
        await newCert.save();
        res.status(201).json(newCert);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: 'A certificate with this serial number already exists.' });
        }
        res.status(400).json({ error: 'Invalid warranty certificate data.' });
    }
});

app.post('/api/admin/warranties/:serial/service', verifyAdmin, async (req, res) => {
    try {
        const serial = (req.params.serial || '').trim().toUpperCase();
        const date = (req.body.date || '').trim();
        const note = (req.body.note || '').trim();

        if (!date || !note) {
            return res.status(400).json({ error: 'Service date and note are required.' });
        }

        const updated = await Warranty.findOneAndUpdate(
            { serialNumber: serial },
            { $push: { serviceHistory: { date, note } } },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ error: 'Warranty serial number not found.' });
        }

        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: 'Failed to append service entry.' });
    }
});

// --- 4. GLOBAL ERROR HANDLER & DATABASE CONNECTION ---
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ error: 'Malformed JSON payload.' });
    }
    res.status(500).json({ error: 'Internal server error.' });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aurelia_horlogerie';

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB database');
        app.listen(PORT, () => console.log(`Aurelia backend running on port ${PORT}`));
    })
    .catch(err => console.error('Database connection error:', err));

 app.post('/api/client/portal', async (req, res) => {
    try {
        const email = (req.body.email || '').trim().toLowerCase();
        const lookup = (req.body.lookup || '').trim();

        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Please provide a valid client email.' });
        }

        const orders = await Order.find({ clientEmail: email }).sort({ createdAt: -1 });
        const warranties = lookup
            ? await Warranty.find({ serialNumber: lookup.toUpperCase() })
            : [];
        const appointments = lookup
            ? await Appointment.find({ fullName: new RegExp(lookup, 'i') }).sort({ createdAt: -1 })
            : [];

        res.json({
            clientEmail: email,
            orders,
            warranties,
            appointments
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve client records.' });
    }
});   