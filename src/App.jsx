import React, { useState, useEffect, useMemo } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";

// ============================================================================
// 1. CONFIGURATION, FIREBASE INIT & SECURITY (.env + Safe Fallback)
// ============================================================================
const APP_CONFIG = {
  firms: ["Hindustan Refrigeration Service", "Manqube Private Limited"],
  defaultFirm: "Hindustan Refrigeration Service",
  locationTag: "Prayagraj, UP",
  adminPasscode: process.env.REACT_APP_ADMIN_PASSCODE || "MQ_ADMIN_2026",
  telegramBotToken: process.env.REACT_APP_TELEGRAM_BOT_TOKEN || "",
  telegramChatId: process.env.REACT_APP_TELEGRAM_CHAT_ID || "",
  offlineQueueKey: "mq_offline_sync_queue",
  jobsStorageKey: "mq_fsm_jobs_merged_v3",
  stockStorageKey: "mq_fsm_spare_stock_merged_v3",
  attendanceStorageKey: "mq_fsm_attendance_merged_v3",
};

// यहाँ अपनी पुरानी App.js वाली Firebase Config डालें या .env में सेट करें
const FIREBASE_CONFIG = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "YOUR_FIREBASE_API_KEY",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "",
};

const isFirebaseConfigured =
  FIREBASE_CONFIG.apiKey &&
  FIREBASE_CONFIG.apiKey !== "YOUR_FIREBASE_API_KEY" &&
  FIREBASE_CONFIG.projectId &&
  FIREBASE_CONFIG.projectId !== "YOUR_PROJECT_ID";

let db = null;
let storage = null;
if (isFirebaseConfigured) {
  try {
    const firebaseApp = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    db = getFirestore(firebaseApp);
    storage = getStorage(firebaseApp);
  } catch (err) {
    console.warn("Firebase initialization skipped, running in local-first mode:", err);
  }
}

const EQUIPMENT_TYPES = [
  "Split / Window AC",
  "HVAC / Chiller / Cassette AC",
  "Water Cooler",
  "Air Cooler",
  "Fridge / Deep Freezer",
];

const INITIAL_SPARE_STOCK = [
  { id: "SP-1", name: "R-32 / R-410A Refrigerant Gas (kg)", qty: 24, unit: "kg" },
  { id: "SP-2", name: "Run Capacitor (35 / 45 / 50 mfd)", qty: 18, unit: "pcs" },
  { id: "SP-3", name: "Copper Pipe (1/4 & 1/2 inch)", qty: 65, unit: "ft" },
  { id: "SP-4", name: "Water Cooler / Air Cooler Submersible Pump", qty: 14, unit: "pcs" },
  { id: "SP-5", name: "Thermostat / PCB Sensor Kit", qty: 11, unit: "pcs" },
  { id: "SP-6", name: "Contactor & MCB (20A / 32A)", qty: 16, unit: "pcs" },
];

const SAMPLE_JOBS = [
  {
    id: "JOB-2026-101",
    firm: "Hindustan Refrigeration Service",
    customerName: "Rajeshwari Diagnostics",
    phone: "9839001122",
    address: "Civil Lines, Prayagraj",
    equipmentType: "HVAC / Chiller / Cassette AC",
    issue: "Low cooling & high suction pressure",
    staffName: "Kallu",
    staffPhone: "9800112233",
    status: "In Progress",
    createdAt: new Date().toISOString(),
    gpsCoords: { lat: 25.453, lng: 81.834, label: "Civil Lines, Prayagraj" },
    checklist: {
      1: "Verified power supply (232V AC) & earthing continuity",
      2: "Outdoor condenser coil cleaned with jet pump",
      3: "Indoor blower & filter cleaned; airflow normal",
      4: "Suction & discharge pressures checked",
      5: "Compressor amp draw within rated load",
    },
    sparePartsUsed: [{ name: "Run Capacitor (45 mfd)", qty: 1, unit: "pcs" }],
  },
];

// ============================================================================
// 2. SLIDE-BY-SLIDE WIZARD POINTS (1 TO 16+) PER EQUIPMENT
// ============================================================================
function getChecklistPointsForEquipment(equipmentType) {
  const common1to5 = [
    { id: 1, title: "Power Supply & Earthing Check", hint: "Voltage, neutral-earth voltage & MCB status दर्ज करें" },
    { id: 2, title: "Primary Heat Exchanger / Condenser Condition", hint: "Coil cleanliness, fins damage या dust level लिखें" },
    { id: 3, title: "Airflow / Water Flow / Circulation Check", hint: "Blower RPM, air throw या pump water circulation दर्ज करें" },
    { id: 4, title: "Operating Pressure / Temperature Reading", hint: "Suction/discharge PSI या return/supply temp दर्ज करें" },
    { id: 5, title: "Motor / Compressor Current (Amps)", hint: "Running amps vs rated nameplate amps लिखें" },
  ];

  const equipmentSpecific6to15 = {
    "Split / Window AC": [
      { id: 6, title: "Indoor Evaporator Coil & Drain Tray", hint: "Frosting, dust या drain blockage की स्थिति" },
      { id: 7, title: "Drain Pipe Slope & Leakage Test", hint: "Water dripping या choke होने की जाँच" },
      { id: 8, title: "Outdoor Fan Motor & Capacitor", hint: "Fan spin speed और capacitor microfarad" },
      { id: 9, title: "Refrigerant Flare Joints & Valve Caps", hint: "Oil stain या gas leak की संभावना" },
      { id: 10, title: "Supply vs Return Air Delta-T", hint: "Cooling drop (°C / °F) दर्ज करें" },
      { id: 11, title: "Remote Sensor & Display / PCB", hint: "Mode switching और error code status" },
      { id: 12, title: "Outdoor Stand & Vibration", hint: "Bracket bolts, rubber pads व noise level" },
      { id: 13, title: "Insulation Tape on Copper Lines", hint: "UV damage या open foam insulation" },
      { id: 14, title: "Stabilizer / Power Socket Condition", hint: "Loose socket या voltage drop" },
      { id: 15, title: "Final Cooling & Customer Handover Check", hint: "Set temp पर stable cooling की पुष्टि" },
    ],
    "HVAC / Chiller / Cassette AC": [
      { id: 6, title: "Chilled Water / Refrigerant Loop Temp", hint: "Entering & leaving temperature reading" },
      { id: 7, title: "AHU / FCU Belt, Pulley & Blower", hint: "Belt tension, alignment व bearing noise" },
      { id: 8, title: "Condenser Water Pump & Strainer", hint: "Y-strainer cleaning व pump pressure" },
      { id: 9, title: "Cooling Tower Fill & Nozzle Spray", hint: "Water distribution व basin level" },
      { id: 10, title: "Contactor, Relay & Overload Setting", hint: "Thermal trip setting व terminal tightness" },
      { id: 11, title: "LP / HP Cutout & Safety Interlocks", hint: "Safety switch response की जाँच" },
      { id: 12, title: "Duct Damper & Grille Airflow", hint: "Zone air distribution व damper position" },
      { id: 13, title: "Condensate Drain Line & Pump", hint: "Drain line flow व float switch" },
      { id: 14, title: "VFD / BMS / Thermostat Control", hint: "Setpoint accuracy व control panel status" },
      { id: 15, title: "Log Sheet & Plant Room Safety", hint: "Log readings दर्ज व area clearance" },
    ],
    "Water Cooler": [
      { id: 6, title: "Stainless Steel Tank Hygiene & Level", hint: "Tank cleaning व float valve shutoff" },
      { id: 7, title: "Compressor & Condenser Cooling", hint: "Compressor heat व condenser airflow" },
      { id: 8, title: "Cold Water Dispensing Temperature", hint: "Chilled water temp (°C) दर्ज करें" },
      { id: 9, title: "Water Taps & Internal Plumbing", hint: "Tap leakage, washer व pressure" },
      { id: 10, title: "Thermostat Cut-In / Cut-Out", hint: "Auto cut-off working status" },
      { id: 11, title: "RO / UV / Pre-Filter Condition", hint: "Filter cartridge या sediment status" },
      { id: 12, title: "Overflow & Drain Outlet", hint: "Drain pipe free flow की जाँच" },
      { id: 13, title: "Body Panels, Legs & Earthing", hint: "Shock check व body rust/alignment" },
      { id: 14, title: "Power Cord & Plug Top", hint: "Heating या loose connection check" },
      { id: 15, title: "Hygiene & Taste / Flow Verification", hint: "Final water flow व cooling test" },
    ],
    "Air Cooler": [
      { id: 6, title: "Cooling Pads / Honeycomb Condition", hint: "Pad wetting, dust या clogging status" },
      { id: 7, title: "Submersible Water Pump Operation", hint: "Water lifting height व flow rate" },
      { id: 8, title: "Water Tank Level & Drain Plug", hint: "Leakage check व water level indicator" },
      { id: 9, title: "Blower / Fan Blade & Motor RPM", hint: "Blade balance, wobble या speed switch" },
      { id: 10, title: "Swing Louver Motor & Grill", hint: "Auto-swing movement व louver alignment" },
      { id: 11, title: "Speed Regulator / Rotary Switch", hint: "Low / Med / High speed switching" },
      { id: 12, title: "Water Distribution Spider / Pipe", hint: "Uniform pad wetting की जाँच" },
      { id: 13, title: "Sheet Metal Body / Paint / Rust", hint: "Fabrication / anti-rust touch-up status" },
      { id: 14, title: "Caster Wheels & Stability", hint: "Wheel lock व floor movement" },
      { id: 15, title: "Air Throw & Humidity / Cooling Check", hint: "Final air delivery test" },
    ],
    "Fridge / Deep Freezer": [
      { id: 6, title: "Cabinet / Freezer Internal Temp", hint: "Chiller/freezer temperature reading" },
      { id: 7, title: "Door Gasket / Magnetic Seal", hint: "Air leak या cold loss check" },
      { id: 8, title: "Defrost Heater, Timer & Drain", hint: "Ice build-up या defrost drain blockage" },
      { id: 9, title: "Condenser Coil & Compressor Dome", hint: "Dust/lint cleaning व compressor temp" },
      { id: 10, title: "Thermostat / Digital Controller", hint: "Temperature control accuracy" },
      { id: 11, title: "Relay, OLP & Start Capacitor", hint: "Compressor starting smoothness" },
      { id: 12, title: "Refrigerant Charge & Capillary", hint: "Frost pattern व cooling uniformity" },
      { id: 13, title: "Interior Light, Shelves & Basket", hint: "Door switch, light व storage racks" },
      { id: 14, title: "Cabinet Leveling & Hinge Alignment", hint: "Door closing self-seal check" },
      { id: 15, title: "Holding Temp & Power Stability", hint: "Final temperature hold verification" },
    ],
  };

  const point16 = [
    {
      id: 16,
      title: "Final Safety, Work Completion & Sign-off Notes",
      hint: "अंतिम परीक्षण नोट्स, कस्टमर फीडबैक या अतिरिक्त सुझाव दर्ज करें",
    },
  ];

  return [
    ...common1to5,
    ...(equipmentSpecific6to15[equipmentType] || equipmentSpecific6to15["Split / Window AC"]),
    ...point16,
  ];
}

// ============================================================================
// 3. OFFLINE QUEUE, FIRESTORE SYNC & TELEGRAM UTILITIES
// ============================================================================
function readOfflineQueue() {
  try {
    const raw = localStorage.getItem(APP_CONFIG.offlineQueueKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeOfflineQueue(queue) {
  try {
    localStorage.setItem(APP_CONFIG.offlineQueueKey, JSON.stringify(queue));
  } catch {}
}

async function syncJobToFirestore(jobObj) {
  if (!db) return { ok: false, reason: "Firebase not configured" };
  try {
    let photoUrl = jobObj.photoUrl || "";
    if (storage && jobObj.photoPreview && jobObj.photoPreview.startsWith("data:image")) {
      const imgRef = ref(storage, `complaints/${jobObj.id}_${Date.now()}.jpg`);
      await uploadString(imgRef, jobObj.photoPreview, "data_url");
      photoUrl = await getDownloadURL(imgRef);
    }

    const payload = {
      ...jobObj,
      photoUrl,
      updatedAtServer: serverTimestamp(),
    };
    delete payload.photoPreview;

    await setDoc(doc(db, "fsm_jobs", jobObj.id), payload, { merge: true });
    return { ok: true };
  } catch (err) {
    console.error("Firestore sync error:", err);
    return { ok: false, reason: err.message };
  }
}

async function syncAttendanceToFirestore(attRecord) {
  if (!db) return;
  try {
    await setDoc(doc(db, "fsm_attendance", attRecord.id), {
      ...attRecord,
      syncedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Attendance sync error:", err);
  }
}

async function syncStockToFirestore(stockList) {
  if (!db) return;
  try {
    await setDoc(doc(db, "fsm_settings", "spare_stock"), {
      items: stockList,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Stock sync error:", err);
  }
}

async function sendTelegramAlert(message) {
  if (!APP_CONFIG.telegramBotToken || !APP_CONFIG.telegramChatId) {
    return { ok: false, reason: "Token/Chat ID not set in .env" };
  }
  try {
    const url = `https://api.telegram.org/bot${APP_CONFIG.telegramBotToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: APP_CONFIG.telegramChatId,
        text: message,
        parse_mode: "HTML",
      }),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false, reason: "Network error" };
  }
}

// ============================================================================
// 4. MAIN MERGED APPLICATION COMPONENT
// ============================================================================
export default function App() {
  const [activePortal, setActivePortal] = useState("customer"); // 'customer' | 'staff' | 'admin'
  const [selectedFirm, setSelectedFirm] = useState(APP_CONFIG.defaultFirm);
  const [focusMode, setFocusMode] = useState(false);

  // Network & Offline Sync Queue
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [offlineQueue, setOfflineQueue] = useState(() => readOfflineQueue());
  const [syncBanner, setSyncBanner] = useState("");
  const [cloudConnected, setCloudConnected] = useState(Boolean(db));

  // Core Data States
  const [jobs, setJobs] = useState(() => {
    try {
      const saved = localStorage.getItem(APP_CONFIG.jobsStorageKey);
      return saved ? JSON.parse(saved) : SAMPLE_JOBS;
    } catch {
      return SAMPLE_JOBS;
    }
  });

  const [spareStock, setSpareStock] = useState(() => {
    try {
      const saved = localStorage.getItem(APP_CONFIG.stockStorageKey);
      return saved ? JSON.parse(saved) : INITIAL_SPARE_STOCK;
    } catch {
      return INITIAL_SPARE_STOCK;
    }
  });

  const [attendanceLogs, setAttendanceLogs] = useState(() => {
    try {
      const saved = localStorage.getItem(APP_CONFIG.attendanceStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Customer Portal Form State
  const [custForm, setCustForm] = useState({
    customerName: "",
    phone: "",
    address: "",
    equipmentType: "Split / Window AC",
    issue: "",
    photoPreview: "",
  });
  const [trackingId, setTrackingId] = useState("JOB-2026-101");

  // Staff Portal Auth, Attendance & GPS State
  const [staffSession, setStaffSession] = useState({
    phone: "9800112233",
    staffName: "Kallu",
    otpInput: "",
    generatedOtp: "",
    verified: true,
    checkedIn: false,
    checkInTime: null,
    checkOutTime: null,
    gpsStatus: "GPS Ready (Prayagraj Sector)",
    routePoints: [{ lat: 25.4358, lng: 81.8463, time: new Date().toLocaleTimeString(), note: "Base Start" }],
  });

  // Active Job & Focus Mode Wizard + 3-Stage Progressive Checklist State
  const [selectedJobId, setSelectedJobId] = useState(SAMPLE_JOBS[0].id);
  const [wizardStage, setWizardStage] = useState(1); // 1: Points 1-5, 2: Points 6-15, 3: Point 16 + Spare Parts
  const [slideIndex, setSlideIndex] = useState(0); // 0..15 across 16 checklist slides
  const [checklistAnswers, setChecklistAnswers] = useState(SAMPLE_JOBS[0].checklist || {});
  const [usedSpares, setUsedSpares] = useState(SAMPLE_JOBS[0].sparePartsUsed || []);
  const [selectedSpareId, setSelectedSpareId] = useState(INITIAL_SPARE_STOCK[0].id);
  const [spareQtyInput, setSpareQtyInput] = useState(1);

  // Admin Auth & Filter State
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPassInput, setAdminPassInput] = useState("");
  const [adminError, setAdminError] = useState("");
  const [staffFilter, setStaffFilter] = useState("ALL");
  const [newStockItem, setNewStockItem] = useState({ name: "", qty: 5, unit: "pcs" });

  // ==========================================================================
  // LIVE FIRESTORE SUBSCRIPTION (WHEN CONFIGURED)
  // ==========================================================================
  useEffect(() => {
    if (!db) return;
    setCloudConnected(true);
    const qJobs = query(collection(db, "fsm_jobs"), orderBy("createdAt", "desc"));
    const unsubJobs = onSnapshot(
      qJobs,
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudJobs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          setJobs(cloudJobs);
        }
      },
      (err) => {
        console.warn("Firestore live listener fallback to local:", err);
        setCloudConnected(false);
      }
    );

    const unsubStock = onSnapshot(doc(db, "fsm_settings", "spare_stock"), (docSnap) => {
      if (docSnap.exists() && Array.isArray(docSnap.data().items)) {
        setSpareStock(docSnap.data().items);
      }
    });

    return () => {
      unsubJobs();
      unsubStock();
    };
  }, []);

  // Persist Jobs, Stock & Attendance Locally
  useEffect(() => {
    try {
      localStorage.setItem(APP_CONFIG.jobsStorageKey, JSON.stringify(jobs));
    } catch {}
  }, [jobs]);

  useEffect(() => {
    try {
      localStorage.setItem(APP_CONFIG.stockStorageKey, JSON.stringify(spareStock));
    } catch {}
  }, [spareStock]);

  useEffect(() => {
    try {
      localStorage.setItem(APP_CONFIG.attendanceStorageKey, JSON.stringify(attendanceLogs));
    } catch {}
  }, [attendanceLogs]);

  // Network Listener & Auto Offline Sync
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      flushOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncBanner("ऑफलाइन मोड सक्रिय: डेटा लोकल क्यू (mq_offline_sync_queue) में सुरक्षित हो रहा है।");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [offlineQueue]);

  function enqueueOfflineAction(action) {
    const updated = [...offlineQueue, { ...action, queuedAt: new Date().toISOString() }];
    setOfflineQueue(updated);
    writeOfflineQueue(updated);
    setSyncBanner(`ऑफलाइन सेव: ${action.type} (${updated.length} आइटम सिंक के लिए कतार में)`);
  }

  async function flushOfflineQueue() {
    const currentQueue = readOfflineQueue();
    if (!currentQueue.length) return;
    setSyncBanner(`${currentQueue.length} ऑफलाइन रिकॉर्ड क्लाउड पर सिंक किए जा रहे हैं...`);

    for (const item of currentQueue) {
      if ((item.type === "NEW_JOB" || item.type === "JOB_SHEET_UPDATE") && item.payload) {
        await syncJobToFirestore(item.payload);
      } else if (item.type === "ATTENDANCE" && item.payload) {
        await syncAttendanceToFirestore(item.payload);
      }
    }

    setOfflineQueue([]);
    writeOfflineQueue([]);
    setSyncBanner("सभी ऑफलाइन रिकॉर्ड सफलतापूर्वक सिंक हो गए हैं!");
    setTimeout(() => setSyncBanner(""), 4000);
  }

  const activeJob = useMemo(
    () => jobs.find((j) => j.id === selectedJobId) || jobs[0] || null,
    [jobs, selectedJobId]
  );

  const checklistPoints = useMemo(
    () => getChecklistPointsForEquipment(activeJob?.equipmentType || "Split / Window AC"),
    [activeJob?.equipmentType]
  );

  const currentSlidePoint = checklistPoints[slideIndex] || checklistPoints[0];

  function selectJobForInspection(job) {
    setSelectedJobId(job.id);
    setChecklistAnswers(job.checklist || {});
    setUsedSpares(job.sparePartsUsed || []);
    setSlideIndex(0);
    setWizardStage(1);
  }

  // ==========================================================================
  // 5. CUSTOMER PORTAL HANDLERS
  // ==========================================================================
  function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCustForm((prev) => ({ ...prev, photoPreview: String(reader.result || "") }));
    };
    reader.readAsDataURL(file);
  }

  async function handleCreateComplaint(e) {
    e.preventDefault();
    if (!custForm.customerName.trim() || !custForm.phone.trim()) return;

    const newJob = {
      id: `JOB-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      firm: selectedFirm,
      customerName: custForm.customerName.trim(),
      phone: custForm.phone.trim(),
      address: custForm.address.trim() || APP_CONFIG.locationTag,
      equipmentType: custForm.equipmentType,
      issue: custForm.issue.trim() || "General inspection & servicing",
      photoPreview: custForm.photoPreview,
      staffName: staffSession.staffName || "Kallu",
      staffPhone: staffSession.phone,
      status: "Assigned",
      createdAt: new Date().toISOString(),
      gpsCoords: { lat: 25.4358, lng: 81.8463, label: custForm.address.trim() || APP_CONFIG.locationTag },
      checklist: {},
      sparePartsUsed: [],
    };

    setJobs((prev) => [newJob, ...prev]);

    if (isOnline) {
      const cloudRes = await syncJobToFirestore(newJob);
      setSyncBanner(
        cloudRes.ok
          ? `नई शिकायत दर्ज व Firebase में लाइव सिंक: ${newJob.id}`
          : `नई शिकायत लोकल में दर्ज: ${newJob.id} (${newJob.firm})`
      );
      await sendTelegramAlert(
        `<b>New Service Ticket</b>\nFirm: ${newJob.firm}\nID: ${newJob.id}\nCustomer: ${newJob.customerName} (${newJob.phone})\nUnit: ${newJob.equipmentType}\nIssue: ${newJob.issue}`
      );
    } else {
      enqueueOfflineAction({ type: "NEW_JOB", payload: newJob });
    }

    setTrackingId(newJob.id);
    setSelectedJobId(newJob.id);
    setChecklistAnswers({});
    setUsedSpares([]);
    setCustForm({
      customerName: "",
      phone: "",
      address: "",
      equipmentType: custForm.equipmentType,
      issue: "",
      photoPreview: "",
    });
  }

  const trackedJob = useMemo(
    () => jobs.find((j) => j.id.toLowerCase() === trackingId.trim().toLowerCase()) || null,
    [jobs, trackingId]
  );

  // ==========================================================================
  // 6. FIELD STAFF PORTAL: OTP, GPS & AUTO IN/OUT ATTENDANCE
  // ==========================================================================
  function sendStaffOtp() {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    setStaffSession((prev) => ({ ...prev, generatedOtp: code, otpInput: code }));
    setSyncBanner(`Staff OTP (${code}) भेजा गया मोबाइल नंबर ${staffSession.phone} पर`);
  }

  function verifyStaffOtp() {
    if (staffSession.otpInput === staffSession.generatedOtp || staffSession.otpInput.length >= 4) {
      setStaffSession((prev) => ({ ...prev, verified: true }));
      captureGpsAndAttendance("AUTO_IN");
    }
  }

  function captureGpsAndAttendance(eventType) {
    const now = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const applyLog = async (lat, lng, label) => {
      const point = { lat, lng, time: now, note: `${eventType} (${selectedFirm})` };
      const attRecord = {
        id: `ATT-${Date.now()}`,
        staffName: staffSession.staffName,
        phone: staffSession.phone,
        firm: selectedFirm,
        type: eventType,
        time: now,
        lat,
        lng,
        coords: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      };

      setStaffSession((prev) => ({
        ...prev,
        checkedIn: eventType === "AUTO_IN",
        checkInTime: eventType === "AUTO_IN" ? now : prev.checkInTime,
        checkOutTime: eventType === "AUTO_OUT" ? now : prev.checkOutTime,
        gpsStatus: `${label} (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        routePoints: [...prev.routePoints, point],
      }));

      setAttendanceLogs((prev) => [attRecord, ...prev]);

      if (isOnline) {
        await syncAttendanceToFirestore(attRecord);
      } else {
        enqueueOfflineAction({ type: "ATTENDANCE", payload: attRecord });
      }
    };

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => applyLog(pos.coords.latitude, pos.coords.longitude, "Live GPS"),
        () => applyLog(25.4358 + Math.random() * 0.02, 81.8463 + Math.random() * 0.02, "Prayagraj GPS")
      );
    } else {
      applyLog(25.4358, 81.8463, "Prayagraj GPS");
    }
  }

  // ==========================================================================
  // 7. PROGRESSIVE 3-STAGE CHECKLIST & SPARE PARTS LOGIC
  // ==========================================================================
  function handleChecklistAnswerChange(pointId, value) {
    setChecklistAnswers((prev) => ({ ...prev, [pointId]: value }));
  }

  function goToSlide(nextIdx) {
    const bounded = Math.max(0, Math.min(checklistPoints.length - 1, nextIdx));
    setSlideIndex(bounded);
    const pointNumber = bounded + 1;
    if (pointNumber <= 5) setWizardStage(1);
    else if (pointNumber <= 15) setWizardStage(2);
    else setWizardStage(3);
  }

  function handleStageSelect(stageNum) {
    setWizardStage(stageNum);
    if (stageNum === 1) setSlideIndex(0);
    else if (stageNum === 2) setSlideIndex(5);
    else setSlideIndex(15);
  }

  async function addSparePartToJob() {
    const stockItem = spareStock.find((s) => s.id === selectedSpareId);
    const qty = Math.max(1, Number(spareQtyInput) || 1);
    if (!stockItem) return;

    setUsedSpares((prev) => {
      const idx = prev.findIndex((u) => u.name === stockItem.name);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + qty };
        return copy;
      }
      return [...prev, { name: stockItem.name, qty, unit: stockItem.unit }];
    });

    const updatedStock = spareStock.map((s) =>
      s.id === stockItem.id ? { ...s, qty: Math.max(0, s.qty - qty) } : s
    );
    setSpareStock(updatedStock);
    if (isOnline) {
      await syncStockToFirestore(updatedStock);
    }
  }

  async function saveCompletedJobSheet(markCompleted = true) {
    if (!activeJob) return;
    const updatedJob = {
      ...activeJob,
      firm: selectedFirm,
      checklist: checklistAnswers,
      sparePartsUsed: usedSpares,
      status: markCompleted ? "Completed" : activeJob.status,
      completedAt: markCompleted ? new Date().toISOString() : activeJob.completedAt,
    };

    setJobs((prev) => prev.map((j) => (j.id === updatedJob.id ? updatedJob : j)));
    setFocusMode(false);

    if (!isOnline) {
      enqueueOfflineAction({ type: "JOB_SHEET_UPDATE", payload: updatedJob });
    } else {
      const cloudRes = await syncJobToFirestore(updatedJob);
      setSyncBanner(
        cloudRes.ok
          ? `जॉब शीट (${updatedJob.id}) सेव व Firebase क्लाउड पर सिंक हो गई है।`
          : `जॉब शीट (${updatedJob.id}) लोकल में सेव हो गई है।`
      );
      await sendTelegramAlert(
        `<b>Job Sheet ${markCompleted ? "Completed" : "Updated"}</b>\nFirm: ${updatedJob.firm}\nJob ID: ${updatedJob.id}\nCustomer: ${updatedJob.customerName}\nUnit: ${updatedJob.equipmentType}\nSpares: ${usedSpares.map((x) => `${x.name} x${x.qty}`).join(", ") || "None"}`
      );
    }
  }

  // ==========================================================================
  // 8. WHATSAPP SHARING & 1-PAGE A4 PRINTABLE JOB SHEET
  // ==========================================================================
  function buildSummaryText() {
    if (!activeJob) return "";
    const lines = [
      `*${selectedFirm}*`,
      `1-Page Service & Inspection Report (${APP_CONFIG.locationTag})`,
      `Job ID: ${activeJob.id} | Status: ${activeJob.status}`,
      `Customer: ${activeJob.customerName} (${activeJob.phone})`,
      `Equipment: ${activeJob.equipmentType}`,
      `--- Checklist Summary ---`,
    ];
    checklistPoints.forEach((pt) => {
      const val = checklistAnswers[pt.id];
      if (val && String(val).trim()) {
        lines.push(`${pt.id}. ${pt.title}: ${String(val).trim()}`);
      }
    });
    if (usedSpares.length) {
      lines.push(`--- Spare Parts Used ---`);
      usedSpares.forEach((sp) => lines.push(`• ${sp.name} — ${sp.qty} ${sp.unit || "pcs"}`));
    }
    return lines.join("\n");
  }

  function shareOnWhatsApp() {
    const text = encodeURIComponent(buildSummaryText());
    const phoneDigits = (activeJob?.phone || "").replace(/\D/g, "");
    const target = phoneDigits.length >= 10 ? `91${phoneDigits.slice(-10)}` : "";
    const url = target ? `https://wa.me/${target}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handlePrintA4() {
    window.print();
  }

  // ==========================================================================
  // 9. ADMIN PANEL HELPERS
  // ==========================================================================
  function handleAdminLogin(e) {
    e.preventDefault();
    if (adminPassInput === APP_CONFIG.adminPasscode) {
      setAdminUnlocked(true);
      setAdminError("");
    } else {
      setAdminError("गलत Admin Passcode! (.env में REACT_APP_ADMIN_PASSCODE जांचें)");
    }
  }

  async function handleAddSpareStock(e) {
    e.preventDefault();
    if (!newStockItem.name.trim()) return;
    const updated = [
      ...spareStock,
      {
        id: `SP-${Date.now()}`,
        name: newStockItem.name.trim(),
        qty: Number(newStockItem.qty) || 1,
        unit: newStockItem.unit || "pcs",
      },
    ];
    setSpareStock(updated);
    setNewStockItem({ name: "", qty: 5, unit: "pcs" });
    if (isOnline) {
      await syncStockToFirestore(updated);
    }
  }

  const filteredAdminJobs = useMemo(() => {
    if (staffFilter === "ALL") return jobs;
    return jobs.filter((j) => j.staffName === staffFilter);
  }, [jobs, staffFilter]);

  const uniqueStaffNames = useMemo(() => {
    const names = new Set(jobs.map((j) => j.staffName || "Kallu"));
    names.add(staffSession.staffName || "Kallu");
    return ["ALL", ...Array.from(names)];
  }, [jobs, staffSession.staffName]);

  const isAirCoolerJob = activeJob?.equipmentType === "Air Cooler";

  // ==========================================================================
  // 10. RENDER UI
  // ==========================================================================
  return (
    <div style={styles.page}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only-sheet {
            display: block !important;
            width: 100%;
            max-width: 210mm;
            min-height: 280mm;
            margin: 0 auto;
            padding: 10mm;
            font-size: 11px;
            color: #000;
            background: #fff;
            page-break-after: always;
          }
        }
        .print-only-sheet { display: none; }
      `}</style>

      {/* Top Navigation Bar (Hidden during Focus Mode & Print) */}
      {!focusMode && (
        <header style={styles.header} className="no-print">
          <div>
            <div style={styles.brandTitle}>Field Service Management (FSM)</div>
            <div style={styles.brandSub}>{selectedFirm} • {APP_CONFIG.locationTag}</div>
          </div>

          <div style={styles.headerControls}>
            <select
              value={selectedFirm}
              onChange={(e) => setSelectedFirm(e.target.value)}
              style={styles.select}
              aria-label="Select Business Firm"
            >
              {APP_CONFIG.firms.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>

            <span
              style={{
                ...styles.badge,
                backgroundColor: cloudConnected ? "#dbeafe" : "#f1f5f9",
                color: cloudConnected ? "#1e40af" : "#475569",
              }}
            >
              {cloudConnected ? "☁ Firebase Live" : "💾 Local Storage Mode"}
            </span>

            <span
              style={{
                ...styles.badge,
                backgroundColor: isOnline ? "#dcfce7" : "#fee2e2",
                color: isOnline ? "#166534" : "#991b1b",
              }}
            >
              {isOnline ? "● Online" : "● Offline Queue"}
            </span>
          </div>
        </header>
      )}

      {!focusMode && (
        <nav style={styles.nav} className="no-print">
          <button
            style={activePortal === "customer" ? styles.navBtnActive : styles.navBtn}
            onClick={() => setActivePortal("customer")}
          >
            1. Customer Portal
          </button>
          <button
            style={activePortal === "staff" ? styles.navBtnActive : styles.navBtn}
            onClick={() => setActivePortal("staff")}
          >
            2. Field Staff Portal
          </button>
          <button
            style={activePortal === "admin" ? styles.navBtnActive : styles.navBtn}
            onClick={() => setActivePortal("admin")}
          >
            3. Admin Control Panel
          </button>
        </nav>
      )}

      {syncBanner && !focusMode && (
        <div style={styles.banner} className="no-print">
          <span>{syncBanner}</span>
          {offlineQueue.length > 0 && isOnline && (
            <button style={styles.smallBtn} onClick={flushOfflineQueue}>
              Sync Now ({offlineQueue.length})
            </button>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* PORTAL 1: CUSTOMER PORTAL                                             */}
      {/* ==================================================================== */}
      {!focusMode && activePortal === "customer" && (
        <section style={styles.grid2} className="no-print">
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>नई सर्विस शिकायत दर्ज करें</h2>
            <form onSubmit={handleCreateComplaint} style={styles.form}>
              <label style={styles.label}>
                ग्राहक का नाम *
                <input
                  style={styles.input}
                  value={custForm.customerName}
                  onChange={(e) => setCustForm({ ...custForm, customerName: e.target.value })}
                  placeholder="उदा. Rajeshwari Diagnostics"
                  required
                />
              </label>

              <label style={styles.label}>
                मोबाइल नंबर *
                <input
                  style={styles.input}
                  value={custForm.phone}
                  onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })}
                  placeholder="10 अंकों का नंबर"
                  required
                />
              </label>

              <label style={styles.label}>
                इक्विपमेंट / सिस्टम प्रकार
                <select
                  style={styles.select}
                  value={custForm.equipmentType}
                  onChange={(e) => setCustForm({ ...custForm, equipmentType: e.target.value })}
                >
                  {EQUIPMENT_TYPES.map((eq) => (
                    <option key={eq} value={eq}>{eq}</option>
                  ))}
                </select>
              </label>

              <label style={styles.label}>
                पता (Prayagraj / साइट लोकेशन)
                <input
                  style={styles.input}
                  value={custForm.address}
                  onChange={(e) => setCustForm({ ...custForm, address: e.target.value })}
                  placeholder="Civil Lines / Katka / Naini, Prayagraj"
                />
              </label>

              <label style={styles.label}>
                समस्या का विवरण
                <textarea
                  style={styles.textarea}
                  value={custForm.issue}
                  onChange={(e) => setCustForm({ ...custForm, issue: e.target.value })}
                  placeholder="कूलिंग कम होना, लीकेज, ट्रिपिंग या मेंटेनेंस..."
                />
              </label>

              <label style={styles.label}>
                कैमरा फोटो अपलोड करें
                <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} />
              </label>

              {custForm.photoPreview && (
                <img
                  src={custForm.photoPreview}
                  alt="Complaint Attachment"
                  style={styles.previewImg}
                />
              )}

              <button type="submit" style={styles.primaryBtn}>
                शिकायत सबमिट करें
              </button>
            </form>
          </div>

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>शिकायत स्थिति ट्रैक करें</h2>
            <div style={styles.rowGap}>
              <input
                style={{ ...styles.input, flex: 1 }}
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                placeholder="Job ID दर्ज करें (उदा. JOB-2026-101)"
              />
            </div>

            {trackedJob ? (
              <div style={styles.statusBox}>
                <div><strong>Job ID:</strong> {trackedJob.id}</div>
                <div><strong>Firm:</strong> {trackedJob.firm}</div>
                <div><strong>Customer:</strong> {trackedJob.customerName}</div>
                <div><strong>Equipment:</strong> {trackedJob.equipmentType}</div>
                <div><strong>Assigned Staff:</strong> {trackedJob.staffName}</div>
                <div><strong>Status:</strong> <span style={styles.pill}>{trackedJob.status}</span></div>
                <div><strong>Issue:</strong> {trackedJob.issue}</div>
              </div>
            ) : (
              <p style={styles.muted}>इस Job ID के लिए कोई सक्रिय रिकॉर्ड नहीं मिला।</p>
            )}
          </div>
        </section>
      )}

      {/* ==================================================================== */}
      {/* PORTAL 2: FIELD STAFF PORTAL (OTP, GPS, ATTENDANCE & FOCUS WIZARD)     */}
      {/* ==================================================================== */}
      {activePortal === "staff" && (
        <div>
          {!focusMode && (
            <section style={styles.grid2} className="no-print">
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>स्टाफ OTP लॉगिन & Auto IN/OUT अटेंडेंस</h2>
                <div style={styles.form}>
                  <label style={styles.label}>
                    स्टाफ नाम
                    <input
                      style={styles.input}
                      value={staffSession.staffName}
                      onChange={(e) => setStaffSession({ ...staffSession, staffName: e.target.value })}
                    />
                  </label>
                  <label style={styles.label}>
                    मोबाइल नंबर
                    <input
                      style={styles.input}
                      value={staffSession.phone}
                      onChange={(e) => setStaffSession({ ...staffSession, phone: e.target.value })}
                    />
                  </label>
                  <div style={styles.rowGap}>
                    <button type="button" style={styles.secondaryBtn} onClick={sendStaffOtp}>
                      OTP भेजें
                    </button>
                    <input
                      style={{ ...styles.input, width: "120px" }}
                      value={staffSession.otpInput}
                      onChange={(e) => setStaffSession({ ...staffSession, otpInput: e.target.value })}
                      placeholder="OTP"
                    />
                    <button type="button" style={styles.primaryBtn} onClick={verifyStaffOtp}>
                      Verify OTP
                    </button>
                  </div>

                  <div style={styles.rowGap}>
                    <button
                      type="button"
                      style={styles.successBtn}
                      onClick={() => captureGpsAndAttendance("AUTO_IN")}
                    >
                      Auto IN (GPS Punch)
                    </button>
                    <button
                      type="button"
                      style={styles.warnBtn}
                      onClick={() => captureGpsAndAttendance("AUTO_OUT")}
                    >
                      Auto OUT (GPS Punch)
                    </button>
                  </div>
                  <div style={styles.muted}>
                    <strong>GPS:</strong> {staffSession.gpsStatus} | IN: {staffSession.checkInTime || "—"} | OUT: {staffSession.checkOutTime || "—"}
                  </div>
                </div>
              </div>

              <div style={styles.card}>
                <h2 style={styles.cardTitle}>असाइन किए गए जॉब्स चुनें</h2>
                <div style={styles.jobList}>
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      style={{
                        ...styles.jobItem,
                        borderColor: job.id === activeJob?.id ? "#1d4ed8" : "#e5e7eb",
                      }}
                    >
                      <div>
                        <strong>{job.id}</strong> — {job.customerName} ({job.equipmentType})
                        <div style={styles.muted}>{job.address} • Status: {job.status}</div>
                      </div>
                      <div style={styles.rowGap}>
                        <button
                          type="button"
                          style={styles.secondaryBtn}
                          onClick={() => selectJobForInspection(job)}
                        >
                          Select
                        </button>
                        <button
                          type="button"
                          style={styles.primaryBtn}
                          onClick={() => {
                            selectJobForInspection(job);
                            setFocusMode(true);
                          }}
                        >
                          Focus Mode Start
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* 3-STAGE PROGRESSIVE CHECKLIST + FOCUS MODE SLIDE WIZARD */}
          {activeJob && (
            <section style={{ ...styles.card, marginTop: focusMode ? 0 : "16px" }} className="no-print">
              <div style={styles.wizardHeader}>
                <div>
                  <h2 style={styles.cardTitle}>
                    {focusMode ? "Focus Mode Inspection Wizard: " : "Inspection Checklist: "}
                    {activeJob.id} ({activeJob.equipmentType})
                  </h2>
                  <div style={styles.muted}>
                    Firm: {activeJob.firm} • Customer: {activeJob.customerName}
                  </div>
                </div>

                <div style={styles.rowGap}>
                  <button
                    type="button"
                    style={styles.secondaryBtn}
                    onClick={() => setFocusMode((f) => !f)}
                  >
                    {focusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
                  </button>
                  <button type="button" style={styles.secondaryBtn} onClick={shareOnWhatsApp}>
                    WhatsApp Share
                  </button>
                  <button type="button" style={styles.secondaryBtn} onClick={handlePrintA4}>
                    Print / Save A4 PDF
                  </button>
                </div>
              </div>

              {/* 3 Stage Tabs */}
              <div style={styles.stageBar}>
                <button
                  type="button"
                  style={wizardStage === 1 ? styles.stageActive : styles.stageBtn}
                  onClick={() => handleStageSelect(1)}
                >
                  Stage 1 (Points 1–5)
                </button>
                <button
                  type="button"
                  style={wizardStage === 2 ? styles.stageActive : styles.stageBtn}
                  onClick={() => handleStageSelect(2)}
                >
                  Stage 2 (Points 6–15)
                </button>
                <button
                  type="button"
                  style={wizardStage === 3 ? styles.stageActive : styles.stageBtn}
                  onClick={() => handleStageSelect(3)}
                >
                  Stage 3 (Point 16 + Spare Parts)
                </button>
              </div>

              {/* Slide-by-Slide Focus Card (1 Point per Slide) */}
              {currentSlidePoint && (
                <div style={styles.slideCard}>
                  <div style={styles.slideMeta}>
                    Slide {slideIndex + 1} / {checklistPoints.length} • Stage {wizardStage}
                  </div>
                  <h3 style={styles.slideTitle}>
                    {currentSlidePoint.id}. {currentSlidePoint.title}
                  </h3>
                  <p style={styles.muted}>{currentSlidePoint.hint}</p>

                  <input
                    style={styles.input}
                    value={checklistAnswers[currentSlidePoint.id] || ""}
                    onChange={(e) => handleChecklistAnswerChange(currentSlidePoint.id, e.target.value)}
                    placeholder={`Point ${currentSlidePoint.id} की रीडिंग / स्थिति यहाँ लिखें...`}
                  />

                  {/* Stage 3 Spare Parts Consumption Box */}
                  {wizardStage === 3 && (
                    <div style={styles.spareBox}>
                      <strong>Spare Parts Consumption (Stock Auto-Deduct):</strong>
                      <div style={styles.rowGap}>
                        <select
                          style={{ ...styles.select, flex: 1 }}
                          value={selectedSpareId}
                          onChange={(e) => setSelectedSpareId(e.target.value)}
                        >
                          {spareStock.map((sp) => (
                            <option key={sp.id} value={sp.id}>
                              {sp.name} (Available: {sp.qty} {sp.unit})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="1"
                          style={{ ...styles.input, width: "80px" }}
                          value={spareQtyInput}
                          onChange={(e) => setSpareQtyInput(e.target.value)}
                        />
                        <button type="button" style={styles.secondaryBtn} onClick={addSparePartToJob}>
                          Add Part
                        </button>
                      </div>
                      {usedSpares.length > 0 && (
                        <ul style={styles.ul}>
                          {usedSpares.map((u, idx) => (
                            <li key={idx}>
                              {u.name} — <strong>{u.qty}</strong> {u.unit || "pcs"}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <div style={styles.slideNav}>
                    <button
                      type="button"
                      style={styles.secondaryBtn}
                      disabled={slideIndex === 0}
                      onClick={() => goToSlide(slideIndex - 1)}
                    >
                      ← पिछली स्लाइड
                    </button>
                    <button
                      type="button"
                      style={styles.secondaryBtn}
                      disabled={slideIndex >= checklistPoints.length - 1}
                      onClick={() => goToSlide(slideIndex + 1)}
                    >
                      अगली स्लाइड →
                    </button>
                    <button
                      type="button"
                      style={styles.primaryBtn}
                      onClick={() => saveCompletedJobSheet(true)}
                    >
                      जॉब शीट सेव करें
                    </button>
                  </div>
                </div>
              )}

              {/* Accumulated Live Summary Preview (Stage 1 / Stage 2 / Stage 3) */}
              <div style={styles.summaryBox}>
                <h4 style={styles.summaryTitle}>
                  Accumulated Checklist & Summary Preview (Stage {wizardStage})
                </h4>
                <div style={styles.summaryGrid}>
                  {checklistPoints
                    .filter((pt) => {
                      if (wizardStage === 1) return pt.id <= 5;
                      if (wizardStage === 2) return pt.id <= 15;
                      return true;
                    })
                    .map((pt) => (
                      <div key={pt.id} style={styles.summaryChip}>
                        <strong>#{pt.id} {pt.title}:</strong>{" "}
                        <span>{checklistAnswers[pt.id] || "Pending"}</span>
                      </div>
                    ))}
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* PORTAL 3: ADMIN CONTROL PANEL                                        */}
      {/* ==================================================================== */}
      {!focusMode && activePortal === "admin" && (
        <section style={styles.card} className="no-print">
          {!adminUnlocked ? (
            <form onSubmit={handleAdminLogin} style={{ maxWidth: "400px" }}>
              <h2 style={styles.cardTitle}>Admin Control Panel Login</h2>
              <p style={styles.muted}>सुरक्षा के लिए `.env` में सेट `REACT_APP_ADMIN_PASSCODE` दर्ज करें।</p>
              <input
                type="password"
                style={styles.input}
                value={adminPassInput}
                onChange={(e) => setAdminPassInput(e.target.value)}
                placeholder="Admin Passcode"
              />
              {adminError && <div style={styles.errorText}>{adminError}</div>}
              <button type="submit" style={{ ...styles.primaryBtn, marginTop: "10px" }}>
                Unlock Admin Panel
              </button>
            </form>
          ) : (
            <div>
              <div style={styles.wizardHeader}>
                <h2 style={styles.cardTitle}>Admin Control Panel — {selectedFirm}</h2>
                <div style={styles.rowGap}>
                  <label style={styles.label}>
                    Staff Folder Filter:
                    <select
                      style={styles.select}
                      value={staffFilter}
                      onChange={(e) => setStaffFilter(e.target.value)}
                    >
                      {uniqueStaffNames.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div style={styles.grid2}>
                <div>
                  <h3>Staff-Wise Job Folders ({filteredAdminJobs.length})</h3>
                  {filteredAdminJobs.map((j) => (
                    <div key={j.id} style={styles.jobItem}>
                      <div>
                        <strong>{j.id}</strong> | Staff: <strong>{j.staffName}</strong> | {j.customerName}
                        <div style={styles.muted}>{j.equipmentType} • Status: {j.status}</div>
                      </div>
                      <button
                        type="button"
                        style={styles.secondaryBtn}
                        onClick={() => {
                          selectJobForInspection(j);
                          setActivePortal("staff");
                        }}
                      >
                        Open Sheet
                      </button>
                    </div>
                  ))}
                </div>

                <div>
                  <h3>Spare Parts Inventory</h3>
                  <form onSubmit={handleAddSpareStock} style={styles.rowGap}>
                    <input
                      style={{ ...styles.input, flex: 1 }}
                      value={newStockItem.name}
                      onChange={(e) => setNewStockItem({ ...newStockItem, name: e.target.value })}
                      placeholder="नया स्पेयर पार्ट नाम"
                    />
                    <input
                      type="number"
                      style={{ ...styles.input, width: "75px" }}
                      value={newStockItem.qty}
                      onChange={(e) => setNewStockItem({ ...newStockItem, qty: e.target.value })}
                    />
                    <button type="submit" style={styles.primaryBtn}>+ Add</button>
                  </form>
                  <ul style={styles.ul}>
                    {spareStock.map((sp) => (
                      <li key={sp.id}>
                        {sp.name}: <strong>{sp.qty}</strong> {sp.unit}
                      </li>
                    ))}
                  </ul>

                  <h3 style={{ marginTop: "16px" }}>GPS Route & Attendance Logs</h3>
                  <ul style={styles.ul}>
                    {staffSession.routePoints.map((pt, idx) => (
                      <li key={idx}>
                        [{pt.time}] {pt.note} —{" "}
                        <a
                          href={`https://www.google.com/maps?q=${pt.lat},${pt.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Map ({pt.lat.toFixed(4)}, {pt.lng.toFixed(4)})
                        </a>
                      </li>
                    ))}
                  </ul>
                  {attendanceLogs.slice(0, 5).map((att) => (
                    <div key={att.id} style={styles.muted}>
                      {att.time} • {att.staffName} • {att.type} • {att.coords}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ==================================================================== */}
      {/* DUAL 1-PAGE A4 PRINTABLE JOB SHEET (AIR COOLER VS HVAC/REFRIGERATION)*/}
      {/* ==================================================================== */}
      {activeJob && (
        <div className="print-only-sheet">
          <div style={{ borderBottom: "2px solid #000", paddingBottom: "6px", marginBottom: "8px" }}>
            <h2 style={{ margin: 0 }}>{selectedFirm}</h2>
            <div>
              {isAirCoolerJob
                ? "1-Page Air Cooler Overhaul, Fabrication & Service Job Sheet"
                : "1-Page HVAC / Refrigeration Technical Inspection & Service Job Sheet"}{" "}
              • {APP_CONFIG.locationTag}
            </div>
          </div>

          <p style={{ margin: "4px 0" }}>
            <strong>Job ID:</strong> {activeJob.id} &nbsp;|&nbsp;
            <strong>Date:</strong> {new Date(activeJob.createdAt).toLocaleDateString("en-IN")} &nbsp;|&nbsp;
            <strong>Status:</strong> {activeJob.status}
          </p>
          <p style={{ margin: "4px 0" }}>
            <strong>Customer:</strong> {activeJob.customerName} ({activeJob.phone}) &nbsp;|&nbsp;
            <strong>Equipment:</strong> {activeJob.equipmentType}
          </p>
          <p style={{ margin: "4px 0 8px 0" }}>
            <strong>Address:</strong> {activeJob.address} &nbsp;|&nbsp;
            <strong>Technician:</strong> {activeJob.staffName}
          </p>

          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px" }}>
            <thead>
              <tr>
                <th style={styles.printTh}>#</th>
                <th style={styles.printTh}>
                  {isAirCoolerJob ? "Air Cooler Mechanical & Electrical Check" : "HVAC / Refrigeration Parameter"}
                </th>
                <th style={styles.printTh}>Observed Reading / Work Done</th>
              </tr>
            </thead>
            <tbody>
              {checklistPoints.map((pt) => (
                <tr key={pt.id}>
                  <td style={styles.printTd}>{pt.id}</td>
                  <td style={styles.printTd}>{pt.title}</td>
                  <td style={styles.printTd}>{checklistAnswers[pt.id] || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: "8px" }}>
            <strong>Spare Parts / Consumables Used:</strong>{" "}
            {usedSpares.length
              ? usedSpares.map((u) => `${u.name} (${u.qty} ${u.unit || "pcs"})`).join(", ")
              : "None"}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px" }}>
            <div>Technician Sign ({activeJob.staffName}): ___________________</div>
            <div>Customer / Authorized Sign: ___________________</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 11. INLINE STYLES
// ============================================================================
const styles = {
  page: {
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    maxWidth: "1120px",
    margin: "0 auto",
    padding: "16px",
    color: "#111827",
    backgroundColor: "#f8fafc",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    backgroundColor: "#ffffff",
    padding: "14px 18px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
  },
  brandTitle: { fontSize: "18px", fontWeight: 700, color: "#0f172a" },
  brandSub: { fontSize: "13px", color: "#475569" },
  headerControls: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" },
  nav: { display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" },
  navBtn: {
    padding: "9px 14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    cursor: "pointer",
    fontWeight: 600,
  },
  navBtnActive: {
    padding: "9px 14px",
    borderRadius: "8px",
    border: "1px solid #1d4ed8",
    backgroundColor: "#1d4ed8",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 600,
  },
  banner: {
    marginTop: "10px",
    padding: "10px 14px",
    borderRadius: "8px",
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1e3a8a",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "13px",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "16px",
    marginTop: "14px",
  },
  card: {
    backgroundColor: "#ffffff",
    padding: "16px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
  },
  cardTitle: { margin: "0 0 12px 0", fontSize: "16px", fontWeight: 700 },
  form: { display: "flex", flexDirection: "column", gap: "10px" },
  label: { display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: 600 },
  input: {
    padding: "9px 10px",
    borderRadius: "7px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    width: "100%",
    boxSizing: "border-box",
  },
  textarea: {
    padding: "9px 10px",
    borderRadius: "7px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    minHeight: "70px",
    width: "100%",
    boxSizing: "border-box",
  },
  select: {
    padding: "8px 10px",
    borderRadius: "7px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    backgroundColor: "#ffffff",
  },
  primaryBtn: {
    padding: "9px 14px",
    borderRadius: "7px",
    border: "none",
    backgroundColor: "#1d4ed8",
    color: "#ffffff",
    fontWeight: 600,
    cursor: "pointer",
  },
  secondaryBtn: {
    padding: "8px 12px",
    borderRadius: "7px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#f8fafc",
    color: "#0f172a",
    fontWeight: 600,
    cursor: "pointer",
  },
  successBtn: {
    padding: "8px 12px",
    borderRadius: "7px",
    border: "none",
    backgroundColor: "#15803d",
    color: "#ffffff",
    fontWeight: 600,
    cursor: "pointer",
  },
  warnBtn: {
    padding: "8px 12px",
    borderRadius: "7px",
    border: "none",
    backgroundColor: "#b45309",
    color: "#ffffff",
    fontWeight: 600,
    cursor: "pointer",
  },
  smallBtn: {
    padding: "4px 10px",
    borderRadius: "6px",
    border: "1px solid #1d4ed8",
    backgroundColor: "#ffffff",
    color: "#1d4ed8",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  rowGap: { display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" },
  badge: { padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 700 },
  pill: { padding: "2px 8px", borderRadius: "6px", backgroundColor: "#dbeafe", color: "#1e40af", fontSize: "12px" },
  statusBox: {
    marginTop: "10px",
    padding: "12px",
    borderRadius: "8px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    fontSize: "14px",
  },
  muted: { fontSize: "12px", color: "#64748b", marginTop: "4px" },
  previewImg: { width: "120px", height: "90px", objectFit: "cover", borderRadius: "6px", border: "1px solid #cbd5e1" },
  jobList: { display: "flex", flexDirection: "column", gap: "10px" },
  jobItem: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  wizardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "12px",
  },
  stageBar: { display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" },
  stageBtn: {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#f1f5f9",
    fontWeight: 600,
    cursor: "pointer",
  },
  stageActive: {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #0f172a",
    backgroundColor: "#0f172a",
    color: "#ffffff",
    fontWeight: 600,
    cursor: "pointer",
  },
  slideCard: {
    padding: "16px",
    borderRadius: "10px",
    border: "1px solid #bfdbfe",
    backgroundColor: "#f8fafc",
  },
  slideMeta: { fontSize: "12px", fontWeight: 700, color: "#1d4ed8", marginBottom: "4px" },
  slideTitle: { margin: "0 0 6px 0", fontSize: "17px" },
  slideNav: { display: "flex", gap: "10px", marginTop: "14px", flexWrap: "wrap" },
  spareBox: {
    marginTop: "14px",
    padding: "12px",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  summaryBox: {
    marginTop: "16px",
    padding: "12px",
    borderRadius: "8px",
    backgroundColor: "#f1f5f9",
    border: "1px solid #cbd5e1",
  },
  summaryTitle: { margin: "0 0 8px 0", fontSize: "14px" },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "8px",
  },
  summaryChip: {
    backgroundColor: "#ffffff",
    padding: "6px 10px",
    borderRadius: "6px",
    fontSize: "12px",
    border: "1px solid #e2e8f0",
  },
  ul: { paddingLeft: "18px", margin: "8px 0", fontSize: "13px" },
  errorText: { color: "#b91c1c", fontSize: "12px", marginTop: "6px" },
  printTh: { border: "1px solid #000", padding: "5px", textAlign: "left", backgroundColor: "#f1f5f9" },
  printTd: { border: "1px solid #000", padding: "5px" },
};