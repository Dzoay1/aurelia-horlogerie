const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aurelia_horlogerie';

// Define matching schemas
const watchSchema = new mongoose.Schema({
    name: { type: String, required: true },
    ref: { type: String, required: true, unique: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    img: { type: String, required: true },
    specs: { type: Map, of: String }
});
const Watch = mongoose.model('Watch', watchSchema);

const warrantySchema = new mongoose.Schema({
    serialNumber: { type: String, required: true, unique: true },
    model: String,
    ref: String,
    caliber: String,
    caseMaterial: String,
    originSalon: String,
    warrantyStatus: String,
    ledgerHash: String,
    serviceHistory: [{ date: String, note: String }]
});
const Warranty = mongoose.model('Warranty', warrantySchema);

// Initial Inventory & Registry Data
const initialWatches = [
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

const initialWarranties = [
    {
        serialNumber: "AUR-8821-01",
        model: "Aurelia Royal Grand",
        ref: "Ref. AR-8821-YG",
        caliber: "Caliber AUR-01 (No. 014/100)",
        caseMaterial: "18k Solid Yellow Gold",
        originSalon: "Geneva Flagship Salon",
        warrantyStatus: "Active • Valid through Nov 2034",
        ledgerHash: "0x9f84c2e19a7b304d8812f6e3c1b04a77d9e2051b8c4f12a9",
        serviceHistory: [
            { date: "Oct 14, 2026", note: "Geneva Atelier Complete Overhaul & Timing Regulation" },
            { date: "Nov 02, 2024", note: "Original Salon Delivery & Seal Certification" }
        ]
    },
    {
        serialNumber: "AUR-9040-07",
        model: "Chronos Noir Skeleton",
        ref: "Ref. CN-904-BK",
        caliber: "Flying Tourbillon AUR-T9 (No. 007/050)",
        caseMaterial: "Grade 5 Titanium & Black DLC",
        originSalon: "Paris • Place Vendôme",
        warrantyStatus: "Active • Valid through Aug 2035",
        ledgerHash: "0x4b71e90d3c82a115f092c4e7a6d38b21c5f9084e1a2b7c63",
        serviceHistory: [
            { date: "Aug 19, 2025", note: "Original Salon Delivery & Tourbillon Isochronism Pass" }
        ]
    },
    {
        serialNumber: "AUR-4102-19",
        model: "Imperial Heritage",
        ref: "Ref. IH-410-RG",
        caliber: "Caliber AUR-04 Ultra-Thin (No. 019/250)",
        caseMaterial: "18k Rose Gold",
        originSalon: "Tokyo • Ginza",
        warrantyStatus: "Active • Valid through Mar 2033",
        ledgerHash: "0x7c20a5d81e94f302b678d1c4a9e35f82b0d4716c9e8a3f15",
        serviceHistory: [
            { date: "May 22, 2026", note: "Gasket Replacement & 5-ATM Pressure Verification" },
            { date: "Mar 11, 2023", note: "Original Salon Delivery & Digital Twin Minting" }
        ]
    }
];

async function seedDatabase() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB for seeding...');

        // Clear existing data to prevent duplicates if run multiple times
        await Watch.deleteMany({});
        await Warranty.deleteMany({});

        // Insert fresh inventory and warranty certificates
        await Watch.insertMany(initialWatches);
        await Warranty.insertMany(initialWarranties);

        console.log('Successfully seeded 3 watches and 3 warranty records!');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding database:', err);
        process.exit(1);
    }
}

seedDatabase();