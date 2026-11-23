import React, { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import JobSheet from "./JobSheet";
import CustomerPortal from "./CustomerPortal";
import StaffFolderPage from "./StaffFolderPage";

// ==========================================
// 1. FIREBASE CONFIGURATION & INITIALIZATION
// ==========================================
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

let app;
try {
  app = initializeApp(firebaseConfig);
} catch (e) {
  console.error("Firebase initialization warning:", e);
}

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// ==========================================
// 2. STATIC DATA, CONSTANTS & HELPERS
// ==========================================
const FIRM_NAME = "Hindustan Refrigeration Service";
const ADMIN_PASSCODE = "1234";

const STAFF_LIST = [
  { name: "Amit Mishra", phone: "8808145020", pin: "1111" },
  { name: "Abhishek Kumar", phone: "7238923500", pin: "2222" },
  { name: "Abhishek Soni", phone: "9696661134", pin: "3333" },
  { name: "Abhishek Vishwakarma", phone: "7275361209", pin: "4444" },
  { name: "Dharmendra Yadav", phone: "8756256414", pin: "5555" },
  { name: "Harish Chandra Gupta", phone: "8318020030", pin: "6666" },
  { name: "Manish Kumar", phone: "9919449438", pin: "7777" },
  { name: "Rahul Soni", phone: "7080455622", pin: "8888" },
  { name: "Rajesh Yadav", phone: "8004194987", pin: "9999" },
  { name: "Ranjeet Maurya", phone: "9919621520", pin: "1212" },
  { name: "Ravi Shanker Soni", phone: "9794257319", pin: "1313" },
  { name: "Santosh Kumar", phone: "8953540328", pin: "1414" },
  { name: "Shailesh Kumar", phone: "9198229771", pin: "1515" },
  { name: "Subhash Kumar", phone: "9506253520", pin: "1616" },
  { name: "Suraj Kumar", phone: "9125695163", pin: "1717" },
  { name: "Vishal Kumar", phone: "9140844835", pin: "1818" },
];

const SPARE_PARTS_CATALOG = [
  {
    category: "AC & Refrigeration",
    name: "Compressor (Split / Window / Inverter)",
    models: ["1 Ton", "1.5 Ton", "2 Ton", "Rotary", "Reciprocating", "Inverter Twin"],
  },
  {
    category: "AC & Refrigeration",
    name: "PCB / Control Board (Indoor / Outdoor)",
    models: ["Universal Indoor PCB", "Brand Specific Indoor", "Inverter Outdoor PCB", "Display Sensor Board"],
  },
  {
    category: "AC & Refrigeration",
    name: "Capacitor (Run / Start / Dual)",
    models: ["35 mfd", "45 mfd", "50 mfd", "60 mfd", "Dual 50+5 mfd", "Start Capacitor"],
  },
  {
    category: "AC & Refrigeration",
    name: "Condenser / Cooling Coil",
    models: ["Copper Condenser Coil", "Cooling Coil (Evaporator)", "Micro-channel Coil"],
  },
  {
    category: "AC & Refrigeration",
    name: "Fan Motor (Blower / Condenser)",
    models: ["Indoor Blower Motor", "Outdoor Fan Motor", "BLDC Motor"],
  },
  {
    category: "AC & Refrigeration",
    name: "Refrigerant Gas (R22 / R32 / R410A / R134a / R600a)",
    models: ["R-32 Refill", "R-410A Refill", "R-22 Refill", "R-134a Refill", "R-600a Refill", "Nitrogen Pressure Test"],
  },
  {
    category: "AC & Refrigeration",
    name: "Copper Pipe / Insulation / Flare Nut",
    models: ["1/4 inch Copper", "3/8 inch Copper", "1/2 inch Copper", "5/8 inch Copper", "Foam Insulation", "Flare Nut Set"],
  },
  {
    category: "AC & Refrigeration",
    name: "Thermistor / Sensor / Valve / Relay",
    models: ["Room Temp Sensor", "Coil Temp Sensor", "4-Way Valve", "Service Valve", "OLP / Relay"],
  },
  {
    category: "Electrical Work",
    name: "MCB / MCCB / Isolator / Changeover",
    models: ["Single Pole MCB", "DP MCB", "TPN MCB", "MCCB", "Isolator", "Changeover Switch"],
  },
  {
    category: "Electrical Work",
    name: "Contactor / Timer / Relay / Starter",
    models: ["Magnetic Contactor", "DOL Starter", "Star-Delta Starter", "Digital Timer"],
  },
  {
    category: "Electrical Work",
    name: "Power Cable / Wire / Lug / Tape",
    models: ["1.5 sq mm", "2.5 sq mm", "4 sq mm", "6 sq mm", "Armoured Cable", "Cable Lug & Tape"],
  },
  {
    category: "Plumbing Work",
    name: "PVC / UPVC / CPVC Pipe & Fitting",
    models: ["1/2 inch", "3/4 inch", "1 inch", "1.5 inch", "Elbow / Tee / Ball Valve"],
  },
  {
    category: "Plumbing Work",
    name: "Tap / Mixer / Float Valve / Pump Part",
    models: ["CP Tap / Valve", "Float Valve", "Submersible Cable / Joint Kit", "Pressure Switch"],
  },
  {
    category: "Civil Work",
    name: "Cement / Putty / Sealant / Fastener",
    models: ["Waterproof Sealant", "Anchor Fastener", "Wall Putty / Plaster", "MS Bracket / Stand"],
  },
];

const DEFAULT_INVENTORY_STOCK = [
  { id: "stk-1", partName: "Capacitor (Run / Start / Dual)", model: "50 mfd", category: "AC & Refrigeration", qty: 18, minQty: 5 },
  { id: "stk-2", partName: "Capacitor (Run / Start / Dual)", model: "35 mfd", category: "AC & Refrigeration", qty: 14, minQty: 5 },
  { id: "stk-3", partName: "Refrigerant Gas (R22 / R32 / R410A / R134a / R600a)", model: "R-32 Refill", category: "AC & Refrigeration", qty: 12, minQty: 4 },
  { id: "stk-4", partName: "Refrigerant Gas (R22 / R32 / R410A / R134a / R600a)", model: "R-410A Refill", category: "AC & Refrigeration", qty: 9, minQty: 4 },
  { id: "stk-5", partName: "PCB / Control Board (Indoor / Outdoor)", model: "Universal Indoor PCB", category: "AC & Refrigeration", qty: 6, minQty: 2 },
  { id: "stk-6", partName: "Thermistor / Sensor / Valve / Relay", model: "Room Temp Sensor", category: "AC & Refrigeration", qty: 20, minQty: 6 },
  { id: "stk-7", partName: "MCB / MCCB / Isolator / Changeover", model: "DP MCB", category: "Electrical Work", qty: 15, minQty: 5 },
  { id: "stk-8", partName: "Copper Pipe / Insulation / Flare Nut", model: "1/4 inch Copper", category: "AC & Refrigeration", qty: 10, minQty: 3 },
];

const SUB_OPTIONS_BY_CATEGORY = {
  "HVAC & Refrigeration": [
    { value: "Split / Window AC", label: "Split / Window AC" },
    { value: "Inverter AC", label: "Inverter AC" },
    { value: "Cassette AC", label: "Cassette AC (कैसेट एसी)" },
    { value: "Ductable AC", label: "Ductable AC (डक्टेबल एसी)" },
    { value: "VRV / VRF System", label: "VRV / VRF System" },
    { value: "AHU Unit", label: "AHU Unit" },
    { value: "Chiller Unit", label: "Chiller Unit (चिलर)" },
    { value: "Refrigerator / Deep Freezer", label: "Refrigerator / Deep Freezer" },
    { value: "Water Cooler", label: "Water Cooler" },
  ],
  "Electrical Work": [
    { value: "Cooler", label: "Cooler (कूलर)" },
    { value: "House Wiring & Panel", label: "House Wiring & Panel" },
    { value: "DB / MCB / MCCB Work", label: "DB / MCB / MCCB Work" },
    { value: "Earthing & Lightning Arrester", label: "Earthing & Lightning Arrester" },
    { value: "Three Phase Industrial Panel", label: "Three Phase Industrial Panel" },
    { value: "Inverter / UPS / Battery Setup", label: "Inverter / UPS / Battery Setup" },
  ],
  "Plumbing Work": [
    { value: "Pipe Fitting & Leakage Repair", label: "Pipe Fitting & Leakage Repair" },
    { value: "Sanitary & Bathroom Fitting", label: "Sanitary & Bathroom Fitting" },
    { value: "Water Tank Installation", label: "Water Tank Installation" },
    { value: "Boring & Submersible Pump Work", label: "Boring & Submersible Pump Work" },
    { value: "Drainage & Sewer Line Fitting", label: "Drainage & Sewer Line Fitting" },
    { value: "Pressure Pump Installation", label: "Pressure Pump Installation" },
  ],
  "Civil Work": [
    { value: "Flooring & Tiling", label: "Flooring & Tiling" },
    { value: "Brickwork & Plastering", label: "Brickwork & Plastering" },
    { value: "RCC Roof & Pillar Casting", label: "RCC Roof & Pillar Casting" },
    { value: "Waterproofing & Leakage Solution", label: "Waterproofing & Leakage Solution" },
    { value: "Foundation & Excavation", label: "Foundation & Excavation" },
    { value: "Wall Putty & Painting", label: "Wall Putty & Painting" },
  ],
};

function getCurrentDateTimeStr() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function getTodayDateStr() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 900;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = img.width > MAX_WIDTH ? MAX_WIDTH : img.width;
        canvas.height =
          img.width > MAX_WIDTH ? img.height * scaleSize : img.height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            resolve(blob || file);
          },
          "image/jpeg",
          0.72
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

// ==========================================
// 3. REUSABLE UI COMPONENTS
// ==========================================
function BrandHeader({ online }) {
  const [logoError, setLogoError] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#ffffff",
        padding: "10px 14px",
        borderRadius: "10px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
        marginBottom: "10px",
        border: "1px solid #e2e8f0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {!logoError ? (
          <img
            src="/logo.png"
            alt={FIRM_NAME}
            onError={() => setLogoError(true)}
            style={{
              height: "42px",
              width: "auto",
              maxWidth: "160px",
              objectFit: "contain",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              background: "#0f172a",
              color: "#f8fafc",
              padding: "6px 10px",
              borderRadius: "6px",
              fontWeight: "bold",
              fontSize: "13px",
            }}
          >
            {FIRM_NAME}
          </div>
        )}
      </div>

      <span
        style={{
          fontSize: "11px",
          fontWeight: "bold",
          padding: "4px 10px",
          borderRadius: "20px",
          background: online ? "#dcfce7" : "#fee2e2",
          color: online ? "#166534" : "#991b1b",
        }}
      >
        {online ? "● Online (Synced)" : "● Offline"}
      </span>
    </div>
  );
}

function StatusBadge({ status, subOption }) {
  let bg = "#fef3c7";
  let color = "#92400e";
  let label = status || "Pending";

  if (status === "Completed") {
    bg = "#dcfce7";
    color = "#166534";
    label = "Completed";
  } else if (status === "Part Pending") {
    bg = "#ffedd5";
    color = "#9a3412";
    label = subOption && subOption !== "-" ? `Part Pending (${subOption})` : "Part Pending";
  } else if (status === "Other Reason Pending") {
    bg = "#fee2e2";
    color = "#991b1b";
    label = subOption && subOption !== "-" ? `Pending (${subOption})` : "Other Reason Pending";
  }

  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 8px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: "bold",
        background: bg,
        color: color,
      }}
    >
      {label}
    </span>
  );
}

function SignaturePad({ onSaveSignature, existingSignature }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL("image/png");
    if (onSaveSignature) onSaveSignature(dataUrl);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (onSaveSignature) onSaveSignature("");
  };

  return (
    <div
      style={{
        border: "1px dashed #94a3b8",
        borderRadius: "8px",
        padding: "10px",
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "6px",
        }}
      >
        <span style={{ fontSize: "12px", fontWeight: "bold", color: "#334155" }}>
          Customer Signature (ग्राहक के हस्ताक्षर)
        </span>
        <button
          type="button"
          onClick={clearCanvas}
          style={{
            padding: "3px 8px",
            fontSize: "11px",
            background: "#e2e8f0",
            color: "#0f172a",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Clear
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={340}
        height={110}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        style={{
          width: "100%",
          height: "110px",
          background: "#ffffff",
          border: "1px solid #cbd5e1",
          borderRadius: "6px",
          touchAction: "none",
          cursor: "crosshair",
        }}
      />

      {existingSignature && (
        <div style={{ marginTop: "6px", fontSize: "11px", color: "#15803d" }}>
          ✓ Signature captured
        </div>
      )}
    </div>
  );
}

// ==========================================
// 4. ATTENDANCE ROUTE & LIVE MAP COMPONENT
// ==========================================
function AttendanceRouteMap({ attendanceLogs }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef([]);

  const validLogs = (attendanceLogs || []).filter(
    (log) => typeof log.lat === "number" && typeof log.lng === "number"
  );

  useEffect(() => {
    if (!mapContainerRef.current || !window.L) return;

    if (!mapInstanceRef.current) {
      const defaultCenter =
        validLogs.length > 0
          ? [validLogs[0].lat, validLogs[0].lng]
          : [25.4358, 81.8463];

      mapInstanceRef.current = window.L.map(mapContainerRef.current).setView(
        defaultCenter,
        12
      );

      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    layersRef.current.forEach((layer) => {
      try {
        map.removeLayer(layer);
      } catch (e) {}
    });
    layersRef.current = [];

    if (validLogs.length > 0) {
      const latLngs = validLogs.map((l) => [l.lat, l.lng]);

      if (latLngs.length > 1) {
        const polyline = window.L.polyline(latLngs, {
          color: "#2563eb",
          weight: 4,
          opacity: 0.8,
        }).addTo(map);
        layersRef.current.push(polyline);
      }

      validLogs.forEach((log, idx) => {
        const isIn = log.type === "IN";
        const marker = window.L.circleMarker([log.lat, log.lng], {
          radius: 8,
          fillColor: isIn ? "#16a34a" : "#dc2626",
          color: "#ffffff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        }).addTo(map);

        marker.bindPopup(
          `<b>${idx + 1}. ${log.staffName} (${log.type})</b><br/>Time: ${log.time}<br/>Loc: ${log.locationText || ""}`
        );
        layersRef.current.push(marker);
      });

      const bounds = window.L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [attendanceLogs]);

  return (
    <div style={{ marginTop: "12px" }}>
      <div
        ref={mapContainerRef}
        style={{
          width: "100%",
          height: "320px",
          borderRadius: "8px",
          border: "1px solid #cbd5e1",
          background: "#e2e8f0",
          zIndex: 1,
        }}
      />
      {!window.L && (
        <div style={{ fontSize: "11px", color: "#b91c1c", marginTop: "4px" }}>
          Map library (Leaflet) loading... यदि मैप न दिखे तो index.html में Leaflet CSS/JS चेक करें।
        </div>
      )}
    </div>
  );
}

// ==========================================
// 5. MAIN APPLICATION COMPONENT
// ==========================================
export default function App() {
  const [online, setOnline] = useState(navigator.onLine);
  const [user, setUser] = useState(null);

  const [activeTab, setActiveTab] = useState("home");

  const [jobSheets, setJobSheets] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [inventoryStock, setInventoryStock] = useState(DEFAULT_INVENTORY_STOCK);
  const [loginHistory, setLoginHistory] = useState([]);

  const [inspectedJob, setInspectedJob] = useState(null);

  const [custPhone, setCustPhone] = useState("");

  const [selectedStaff, setSelectedStaff] = useState(STAFF_LIST[0].name);
  const [staffPinInput, setStaffPinInput] = useState("");
  const [staffLoggedIn, setStaffLoggedIn] = useState(false);

  const [staffGpsLocation, setStaffGpsLocation] = useState("Fetching GPS...");
  const [staffCoords, setStaffCoords] = useState({ lat: null, lng: null });

  const [wizardStep, setWizardStep] = useState(1);
  const [wizardCustomerName, setWizardCustomerName] = useState("");
  const [wizardCustomerPhone, setWizardCustomerPhone] = useState("");
  const [wizardCustomerAddress, setWizardCustomerAddress] = useState("");
  const [wizardCategory, setWizardCategory] = useState("HVAC & Refrigeration");
  const [wizardProduct, setWizardProduct] = useState("Split / Window AC");
  const [wizardStatus, setWizardStatus] = useState("Completed");
  const [wizardPendingSub, setWizardPendingSub] = useState("Part Pending");
  const [wizardFaultDesc, setWizardFaultDesc] = useState("");
  const [wizardRemarks, setWizardRemarks] = useState("");

  const [selectedPartCategory, setSelectedPartCategory] = useState("AC & Refrigeration");
  const [selectedPartName, setSelectedPartName] = useState(SPARE_PARTS_CATALOG[0].name);
  const [selectedPartModel, setSelectedPartModel] = useState(SPARE_PARTS_CATALOG[0].models[0]);
  const [selectedPartQty, setSelectedPartQty] = useState(1);
  const [wizardUsedParts, setWizardUsedParts] = useState([]);

  const [wizardPhotos, setWizardPhotos] = useState([]);
  const [wizardSignature, setWizardSignature] = useState("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [wizardSavedMsg, setWizardSavedMsg] = useState("");

  const [attendanceType, setAttendanceType] = useState("IN");
  const [attendanceNote, setAttendanceNote] = useState("");
  const [attendanceMsg, setAttendanceMsg] = useState("");

  const [adminPassInput, setAdminPassInput] = useState("");
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminMainTab, setAdminMainTab] = useState("jobs");
  const [adminJobFilter, setAdminJobFilter] = useState("ALL");
  const [adminSearchText, setAdminSearchText] = useState("");
  const [adminSelectedStaffFolder, setAdminSelectedStaffFolder] = useState("ALL");

  const [newStockCategory, setNewStockCategory] = useState("AC & Refrigeration");
  const [newStockName, setNewStockName] = useState(SPARE_PARTS_CATALOG[0].name);
  const [newStockModel, setNewStockModel] = useState(SPARE_PARTS_CATALOG[0].models[0]);
  const [newStockQty, setNewStockQty] = useState(5);
  const [newStockMinQty, setNewStockMinQty] = useState(3);

  const [selectedRouteStaff, setSelectedRouteStaff] = useState("ALL");
  const [selectedRouteDate, setSelectedRouteDate] = useState(getTodayDateStr());

  // ==========================================
  // 6. NETWORK, AUTH & GPS EFFECTS
  // ==========================================
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
      } else {
        signInAnonymously(auth).catch((err) => {
          console.error("Anonymous sign-in error:", err);
        });
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setStaffGpsLocation("GPS not supported on this device");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setStaffCoords({ lat, lng });
        setStaffGpsLocation(`Lat: ${lat}, Lng: ${lng} (GPS Live)`);
      },
      (err) => {
        console.warn("GPS error:", err.message);
        setStaffGpsLocation("GPS Permission Denied / Unavailable");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // ==========================================
  // 7. FIRESTORE REAL-TIME LISTENERS
  // ==========================================
  useEffect(() => {
    const qJobs = query(collection(db, "jobs"), limit(200));
    const unsubJobs = onSnapshot(
      qJobs,
      (snapshot) => {
        const list = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        list.sort((a, b) =>
          String(b.jobSheetNo || "").localeCompare(String(a.jobSheetNo || ""))
        );
        setJobSheets(list);
      },
      (err) => console.error("Jobs listener error:", err)
    );

    const qAtt = query(collection(db, "attendance"), limit(300));
    const unsubAtt = onSnapshot(
      qAtt,
      (snapshot) => {
        const list = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setAttendanceLogs(list);
      },
      (err) => console.error("Attendance listener error:", err)
    );

    const qInv = query(collection(db, "inventory"));
    const unsubInv = onSnapshot(
      qInv,
      (snapshot) => {
        if (!snapshot.empty) {
          const list = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() });
          });
          setInventoryStock(list);
        }
      },
      (err) => console.error("Inventory listener error:", err)
    );

    const qLogins = query(
      collection(db, "login_logs"),
      orderBy("timestamp", "desc"),
      limit(100)
    );
    const unsubLogins = onSnapshot(
      qLogins,
      (snapshot) => {
        const list = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setLoginHistory(list);
      },
      (err) => console.error("Login logs listener error:", err)
    );

    return () => {
      unsubJobs();
      unsubAtt();
      unsubInv();
      unsubLogins();
    };
  }, []);

  // ==========================================
  // 8. LOGIN AUDIT & HELPER FUNCTIONS
  // ==========================================
  const recordUserLogin = async (phoneOrId, role, displayName) => {
    try {
      const logId = `LOGIN_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const entry = {
        id: logId,
        phone: phoneOrId || "-",
        role: role || "unknown",
        name: displayName || phoneOrId || "User",
        time: getCurrentDateTimeStr(),
        timestamp: Date.now(),
        gps: staffGpsLocation,
      };
      await setDoc(doc(db, "login_logs", logId), entry);
    } catch (e) {
      console.error("Failed to record login log:", e);
    }
  };

  const handleWizardCategoryChange = (newCat) => {
    setWizardCategory(newCat);
    const subs = SUB_OPTIONS_BY_CATEGORY[newCat] || [];
    if (subs.length > 0) setWizardProduct(subs[0].value);
  };

  const handlePartCategoryChange = (cat) => {
    setSelectedPartCategory(cat);
    const matching = SPARE_PARTS_CATALOG.filter((p) => p.category === cat);
    if (matching.length > 0) {
      setSelectedPartName(matching[0].name);
      setSelectedPartModel(matching[0].models[0] || "Standard");
    }
  };

  const handlePartNameChange = (name) => {
    setSelectedPartName(name);
    const found = SPARE_PARTS_CATALOG.find((p) => p.name === name);
    if (found && found.models.length > 0) {
      setSelectedPartModel(found.models[0]);
    } else {
      setSelectedPartModel("Standard");
    }
  };

  const handleAddPartToWizard = () => {
    const qtyNum = Math.max(1, Number(selectedPartQty || 1));
    const newItem = {
      id: `part-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      category: selectedPartCategory,
      partName: selectedPartName,
      model: selectedPartModel,
      qty: qtyNum,
    };
    setWizardUsedParts((prev) => [...prev, newItem]);
    setSelectedPartQty(1);
  };

  const handleRemovePartFromWizard = (id) => {
    setWizardUsedParts((prev) => prev.filter((item) => item.id !== id));
  };

  const handleWizardPhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploadingMedia(true);
    try {
      for (const file of files) {
        const compressedBlob = await compressImage(file);
        const fileName = `job_photos/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
        const storageRef = ref(storage, fileName);
        const uploadTask = uploadBytesResumable(storageRef, compressedBlob);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            null,
            (error) => reject(error),
            async () => {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              setWizardPhotos((prev) => [...prev, url]);
              resolve();
            }
          );
        });
      }
    } catch (err) {
      console.error("Photo upload error:", err);
      alert("फोटो अपलोड करने में समस्या आई: " + err.message);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleCustomerComplaintSubmit = (payload) => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    const phone = payload.customerPhone || custPhone;
    const jobSheetNo = "COMP" + phone + day + month + hours + minutes;

    const newEntry = {
      jobSheetNo,
      customerName: payload.customerName,
      customerPhone: phone,
      customerAddress: payload.customerAddress,
      product: "[" + payload.categoryType + "] " + payload.productType,
      faultDetails: payload.complaintText,
      desc: payload.complaintText,
      status: "Pending",
      pendingSubOption: "-",
      date: `${day}/${month}/${now.getFullYear()} ${hours}:${minutes}`,
      staffName: "Not Assigned Yet",
      staffPhone: "-",
      location: "Online Booking",
      photoURL: payload.photoURL || "",
      sitePhotoUrls: payload.sitePhotoUrls || [],
      signatureURL: "",
      categoryType: payload.categoryType,
      productType: payload.productType,
      usedParts: [],
      sparePartOption: "-",
      sparePartName: "-",
      sparePartModel: "-",
    };

    setJobSheets((prev) => [newEntry, ...prev]);
    setDoc(doc(db, "jobs", jobSheetNo), newEntry).catch((err) =>
      console.error("Complaint save error:", err)
    );
    return jobSheetNo;
  };

  const handleStaffLogin = (e) => {
    e.preventDefault();
    const found = STAFF_LIST.find(
      (s) => s.name === selectedStaff && s.pin === staffPinInput.trim()
    );
    if (!found) {
      alert("गलत स्टाफ या PIN! कृपया सही PIN दर्ज करें।");
      return;
    }
    setStaffLoggedIn(true);
    setStaffPinInput("");
    recordUserLogin(found.phone, "staff", found.name);
  };

  const handleSaveWizardJobSheet = async (e) => {
    e.preventDefault();
    if (!wizardCustomerName.trim() || !wizardCustomerPhone.trim()) {
      alert("कृपया कस्टमर का नाम और मोबाइल नंबर दर्ज करें!");
      return;
    }

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");

    const jobSheetNo = `JS-${yyyy}${mm}${dd}-${hh}${min}${ss}`;
    const staffObj = STAFF_LIST.find((s) => s.name === selectedStaff) || {
      name: selectedStaff,
      phone: "-",
    };

    const partsSummary =
      wizardUsedParts.length > 0
        ? wizardUsedParts
            .map((p) => `${p.partName} (${p.model}) x${p.qty}`)
            .join(", ")
        : "None";

    const newJob = {
      jobSheetNo,
      customerName: wizardCustomerName.trim(),
      customerPhone: wizardCustomerPhone.trim(),
      customerAddress: wizardCustomerAddress.trim() || "Prayagraj",
      categoryType: wizardCategory,
      productType: wizardProduct,
      product: `[${wizardCategory}] ${wizardProduct}`,
      status: wizardStatus,
      pendingSubOption:
        wizardStatus === "Completed" ? "-" : wizardPendingSub,
      faultDetails: wizardFaultDesc.trim(),
      desc: wizardFaultDesc.trim(),
      remarks: wizardRemarks.trim(),
      date: `${dd}/${mm}/${yyyy} ${hh}:${min}`,
      staffName: staffObj.name,
      staffPhone: staffObj.phone,
      location: staffGpsLocation,
      coords: staffCoords,
      usedParts: wizardUsedParts,
      sparePartsSummary: partsSummary,
      sparePartName:
        wizardUsedParts.length > 0 ? wizardUsedParts[0].partName : "-",
      sparePartModel:
        wizardUsedParts.length > 0 ? wizardUsedParts[0].model : "-",
      photoURL: wizardPhotos[0] || "",
      sitePhotoUrls: wizardPhotos,
      signatureURL: wizardSignature || "",
      createdAt: Date.now(),
    };

    try {
      await setDoc(doc(db, "jobs", jobSheetNo), newJob);

      for (const used of wizardUsedParts) {
        const matchedStock = inventoryStock.find(
          (item) =>
            item.partName === used.partName && item.model === used.model
        );
        if (matchedStock && matchedStock.id) {
          const newQty = Math.max(0, Number(matchedStock.qty || 0) - Number(used.qty || 1));
          await updateDoc(doc(db, "inventory", matchedStock.id), {
            qty: newQty,
          });
        }
      }

      setWizardSavedMsg(`जॉब शीट (${jobSheetNo}) सफलतापूर्वक सेव हो गई!`);
      setWizardCustomerName("");
      setWizardCustomerPhone("");
      setWizardCustomerAddress("");
      setWizardFaultDesc("");
      setWizardRemarks("");
      setWizardUsedParts([]);
      setWizardPhotos([]);
      setWizardSignature("");
      setWizardStep(1);
    } catch (err) {
      console.error("Error saving job sheet:", err);
      alert("जॉब शीट सेव करने में त्रुटि: " + err.message);
    }
  };

  const handleAttendanceSubmit = async (e) => {
    e.preventDefault();
    const staffObj = STAFF_LIST.find((s) => s.name === selectedStaff) || {
      name: selectedStaff,
      phone: "-",
    };

    const todayStr = getTodayDateStr();
    const nowTime = getCurrentDateTimeStr();
    const ts = Date.now();
    const docId = `ATT_${staffObj.name.replace(/\s+/g, "_")}_${ts}`;

    const prevLogsToday = attendanceLogs.filter(
      (l) => l.staffName === staffObj.name && l.dateStr === todayStr
    );
    const lastLog = prevLogsToday[0];
    const distFromLast =
      lastLog && lastLog.lat && staffCoords.lat
        ? getDistanceKm(lastLog.lat, lastLog.lng, staffCoords.lat, staffCoords.lng)
        : 0;

    const record = {
      id: docId,
      staffName: staffObj.name,
      staffPhone: staffObj.phone,
      type: attendanceType,
      time: nowTime,
      dateStr: todayStr,
      timestamp: ts,
      locationText: staffGpsLocation,
      lat: staffCoords.lat,
      lng: staffCoords.lng,
      distanceKm: distFromLast,
      note: attendanceNote.trim() || `${attendanceType} marked via app`,
    };

    try {
      await setDoc(doc(db, "attendance", docId), record);
      setAttendanceMsg(
        `${staffObj.name} की ${attendanceType} अटेंडेंस दर्ज हो गई (${nowTime})`
      );
      setAttendanceNote("");
    } catch (err) {
      console.error("Attendance error:", err);
      alert("अटेंडेंस दर्ज करने में समस्या: " + err.message);
    }
  };

  const handleAdminAuth = (e) => {
    e.preventDefault();
    if (adminPassInput.trim() === ADMIN_PASSCODE) {
      setAdminAuthenticated(true);
      setAdminPassInput("");
      recordUserLogin("ADMIN", "admin", "Office Admin");
    } else {
      alert("गलत ऑफिस पासकोड!");
    }
  };

  const handleUpdateJobStatus = async (jobSheetNo, newStatus) => {
    try {
      await updateDoc(doc(db, "jobs", jobSheetNo), {
        status: newStatus,
        pendingSubOption: newStatus === "Completed" ? "-" : "Updated by Admin",
      });
    } catch (err) {
      console.error("Status update error:", err);
      alert("स्टेटस अपडेट नहीं हो सका: " + err.message);
    }
  };

  const handleDeleteJob = async (jobSheetNo) => {
    if (!window.confirm(`क्या आप वाकई जॉब शीट ${jobSheetNo} हटाना चाहते हैं?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, "jobs", jobSheetNo));
      if (inspectedJob && inspectedJob.jobSheetNo === jobSheetNo) {
        setInspectedJob(null);
      }
    } catch (err) {
      console.error("Delete job error:", err);
      alert("डिलीट करने में समस्या: " + err.message);
    }
  };

  const handleAddOrUpdateStock = async (e) => {
    e.preventDefault();
    const qtyToAdd = Number(newStockQty || 0);
    const minQtyVal = Number(newStockMinQty || 2);
    if (qtyToAdd <= 0) {
      alert("कृपया 1 या उससे अधिक मात्रा दर्ज करें।");
      return;
    }

    try {
      const existing = inventoryStock.find(
        (item) =>
          item.partName === newStockName && item.model === newStockModel
      );

      if (existing && existing.id) {
        await updateDoc(doc(db, "inventory", existing.id), {
          qty: Number(existing.qty || 0) + qtyToAdd,
          minQty: minQtyVal,
        });
      } else {
        const stockId = `stk-${Date.now()}`;
        await setDoc(doc(db, "inventory", stockId), {
          id: stockId,
          category: newStockCategory,
          partName: newStockName,
          model: newStockModel,
          qty: qtyToAdd,
          minQty: minQtyVal,
        });
      }
      alert("स्पेयर पार्ट स्टॉक अपडेट हो गया!");
    } catch (err) {
      console.error("Inventory update error:", err);
      alert("स्टॉक अपडेट करने में समस्या: " + err.message);
    }
  };

  const handleAdjustStockQty = async (item, delta) => {
    if (!item || !item.id) return;
    const nextQty = Math.max(0, Number(item.qty || 0) + delta);
    try {
      await updateDoc(doc(db, "inventory", item.id), { qty: nextQty });
    } catch (err) {
      console.error("Adjust stock error:", err);
    }
  };

  const filteredAdminJobs = jobSheets.filter((job) => {
    if (adminJobFilter !== "ALL" && job.status !== adminJobFilter) {
      return false;
    }
    if (adminSelectedStaffFolder !== "ALL") {
      const sName = job.staffName || "Not Assigned Yet";
      if (sName !== adminSelectedStaffFolder) return false;
    }
    if (adminSearchText.trim() !== "") {
      const q = adminSearchText.trim().toLowerCase();
      const hay = `${job.jobSheetNo || ""} ${job.customerName || ""} ${job.customerPhone || ""} ${job.staffName || ""} ${job.product || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const staffFoldersData = Object.entries(
    jobSheets.reduce((acc, job) => {
      const sName = job.staffName || "Not Assigned Yet";
      if (!acc[sName]) acc[sName] = [];
      acc[sName].push({
        ...job,
        id: job.jobSheetNo,
        dateTime: job.date,
        phone: job.customerPhone,
        address: job.customerAddress,
        workDetails: job.desc || job.faultDetails || "",
        rawJob: job,
      });
      return acc;
    }, {})
  ).map(([staffName, jobs], idx) => ({
    staffId: `staff-${idx}-${staffName}`,
    staffName,
    jobs,
  }));

  const routeFilteredLogs = attendanceLogs.filter((log) => {
    const matchStaff =
      selectedRouteStaff === "ALL" || log.staffName === selectedRouteStaff;
    const matchDate =
      !selectedRouteDate.trim() ||
      (log.dateStr && log.dateStr.includes(selectedRouteDate.trim()));
    return matchStaff && matchDate;
  });

  const totalRouteKm = routeFilteredLogs.reduce(
    (sum, l) => sum + Number(l.distanceKm || 0),
    0
  );

  // ==========================================
  // 9. RENDER UI
  // ==========================================
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f1f5f9",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#0f172a",
        padding: "12px",
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Top Brand Header */}
        <BrandHeader online={online} />

        {/* Live GPS Status Bar */}
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
            padding: "8px 12px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: "600",
            marginBottom: "14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <span>📍 GPS: {staffGpsLocation}</span>
          {activeTab !== "home" && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("home");
                setWizardSavedMsg("");
                setAttendanceMsg("");
              }}
              style={{
                background: "#0f172a",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                padding: "4px 10px",
                fontSize: "12px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              ← Home
            </button>
          )}
        </div>

        {/* ====================================================== */}
        {/* HOME PORTAL SELECTION */}
        {/* ====================================================== */}
        {activeTab === "home" && (
          <div
            style={{
              minHeight: "calc(100vh - 175px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "560px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {/* 1. कस्टमर पोर्टल */}
              <div
                onClick={() => setActiveTab("complaint")}
                style={{
                  background: "#ffffff",
                  borderLeft: "5px solid #2563eb",
                  padding: "20px 16px",
                  borderRadius: "10px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 6px 0",
                    color: "#2563eb",
                    fontSize: "18px",
                    fontWeight: "bold",
                  }}
                >
                  👤 कस्टमर पोर्टल (Customer Portal)
                </h3>
                <p
                  style={{
                    margin: "0",
                    fontSize: "13px",
                    color: "#475569",
                  }}
                >
                  अपनी शिकायत दर्ज करें और पुरानी जॉब-शीट्स देखें
                </p>
              </div>

              {/* 2. फील्ड स्टाफ */}
              <div
                onClick={() => setActiveTab("staff")}
                style={{
                  background: "#ffffff",
                  borderLeft: "5px solid #166534",
                  padding: "20px 16px",
                  borderRadius: "10px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <h3
                  style={{
                    margin: "0",
                    color: "#166534",
                    fontSize: "18px",
                    fontWeight: "bold",
                  }}
                >
                  🛠️ फील्ड स्टाफ
                </h3>
              </div>

              {/* 3. ऑफिस */}
              <div
                onClick={() => setActiveTab("admin")}
                style={{
                  background: "#ffffff",
                  borderLeft: "5px solid #d97706",
                  padding: "20px 16px",
                  borderRadius: "10px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <h3
                  style={{
                    margin: "0",
                    color: "#d97706",
                    fontSize: "18px",
                    fontWeight: "bold",
                  }}
                >
                  📊 ऑफिस
                </h3>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================== */}
        {/* 1. CUSTOMER PORTAL */}
        {/* ====================================================== */}
        {activeTab === "complaint" && (
          <CustomerPortal
            firmName={FIRM_NAME}
            gpsText={staffGpsLocation}
            jobSheets={jobSheets}
            onBackToPortalMenu={() => setActiveTab("home")}
            onSubmitComplaint={handleCustomerComplaintSubmit}
            onRecordLogin={recordUserLogin}
            onSelectMode={(mode) => {
              if (mode === "staff") setActiveTab("staff");
              else if (mode === "admin") setActiveTab("admin");
            }}
          />
        )}

        {/* ====================================================== */}
        {/* 2. FIELD STAFF PORTAL */}
        {/* ====================================================== */}
        {activeTab === "staff" && (
          <div
            style={{
              background: "#ffffff",
              padding: "18px",
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            {!staffLoggedIn ? (
              <form
                onSubmit={handleStaffLogin}
                style={{ maxWidth: "420px", margin: "10px auto" }}
              >
                <h2
                  style={{
                    margin: "0 0 12px 0",
                    color: "#166534",
                    fontSize: "18px",
                  }}
                >
                  🛠️ फील्ड स्टाफ लॉगिन
                </h2>

                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "bold",
                    marginBottom: "4px",
                  }}
                >
                  स्टाफ चुनें (Select Staff)
                </label>
                <select
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    marginBottom: "12px",
                    fontSize: "14px",
                    background: "#ffffff",
                  }}
                >
                  {STAFF_LIST.map((s) => (
                    <option key={s.phone} value={s.name}>
                      {s.name} ({s.phone})
                    </option>
                  ))}
                </select>

                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "bold",
                    marginBottom: "4px",
                  }}
                >
                  4-Digit PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="PIN दर्ज करें (उदा. 1111)"
                  value={staffPinInput}
                  onChange={(e) => setStaffPinInput(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    marginBottom: "14px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />

                <button
                  type="submit"
                  style={{
                    width: "100%",
                    padding: "11px",
                    background: "#166534",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Login to Staff Workspace →
                </button>
              </form>
            ) : (
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px",
                    paddingBottom: "12px",
                    borderBottom: "1px solid #e2e8f0",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: "18px", color: "#0f172a" }}>
                      Welcome, {selectedStaff}
                    </h2>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      {staffGpsLocation}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStaffLoggedIn(false)}
                    style={{
                      padding: "6px 12px",
                      background: "#dc2626",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    Logout
                  </button>
                </div>

                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "14px",
                    marginBottom: "18px",
                  }}
                >
                  <h3 style={{ margin: "0 0 10px 0", fontSize: "15px" }}>
                    🕒 Staff Attendance (IN / OUT with GPS)
                  </h3>
                  <form
                    onSubmit={handleAttendanceSubmit}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "10px",
                      alignItems: "center",
                    }}
                  >
                    <select
                      value={attendanceType}
                      onChange={(e) => setAttendanceType(e.target.value)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontWeight: "bold",
                        background: "#ffffff",
                      }}
                    >
                      <option value="IN">IN (Duty Start)</option>
                      <option value="OUT">OUT (Duty End)</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Remark / Site name (optional)"
                      value={attendanceNote}
                      onChange={(e) => setAttendanceNote(e.target.value)}
                      style={{
                        flex: 1,
                        minWidth: "180px",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                      }}
                    />

                    <button
                      type="submit"
                      style={{
                        padding: "8px 16px",
                        background:
                          attendanceType === "IN" ? "#16a34a" : "#ea580c",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "6px",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      Mark {attendanceType}
                    </button>
                  </form>

                  {attendanceMsg && (
                    <div
                      style={{
                        marginTop: "10px",
                        padding: "8px 12px",
                        background: "#dcfce7",
                        color: "#166534",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: "bold",
                      }}
                    >
                      {attendanceMsg}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: "10px",
                    padding: "16px",
                    background: "#ffffff",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "14px",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: "16px", color: "#1e3a8a" }}>
                      📋 Create Digital Job Sheet — Step {wizardStep} of 4
                    </h3>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {[1, 2, 3, 4].map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setWizardStep(st)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "999px",
                            border: "none",
                            fontSize: "12px",
                            fontWeight: "bold",
                            cursor: "pointer",
                            background: wizardStep === st ? "#2563eb" : "#e2e8f0",
                            color: wizardStep === st ? "#ffffff" : "#334155",
                          }}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {wizardSavedMsg && (
                    <div
                      style={{
                        padding: "10px 12px",
                        background: "#dcfce7",
                        color: "#166534",
                        borderRadius: "6px",
                        fontWeight: "bold",
                        marginBottom: "12px",
                      }}
                    >
                      {wizardSavedMsg}
                    </div>
                  )}

                  <form onSubmit={handleSaveWizardJobSheet}>
                    {wizardStep === 1 && (
                      <div>
                        <h4 style={{ margin: "0 0 10px 0" }}>
                          Step 1: Customer &amp; Equipment Details
                        </h4>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(220px, 1fr))",
                            gap: "10px",
                            marginBottom: "12px",
                          }}
                        >
                          <input
                            type="text"
                            placeholder="Customer Name *"
                            value={wizardCustomerName}
                            onChange={(e) => setWizardCustomerName(e.target.value)}
                            required
                            style={{
                              padding: "9px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                            }}
                          />
                          <input
                            type="tel"
                            placeholder="Customer Mobile *"
                            value={wizardCustomerPhone}
                            onChange={(e) => setWizardCustomerPhone(e.target.value)}
                            required
                            style={{
                              padding: "9px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                            }}
                          />
                        </div>

                        <input
                          type="text"
                          placeholder="Customer Address / Site Location"
                          value={wizardCustomerAddress}
                          onChange={(e) => setWizardCustomerAddress(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "9px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            marginBottom: "12px",
                            boxSizing: "border-box",
                          }}
                        />

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(220px, 1fr))",
                            gap: "10px",
                            marginBottom: "14px",
                          }}
                        >
                          <select
                            value={wizardCategory}
                            onChange={(e) => handleWizardCategoryChange(e.target.value)}
                            style={{
                              padding: "9px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              background: "#ffffff",
                            }}
                          >
                            <option value="HVAC & Refrigeration">
                              HVAC &amp; Refrigeration
                            </option>
                            <option value="Electrical Work">Electrical Work</option>
                            <option value="Plumbing Work">Plumbing Work</option>
                            <option value="Civil Work">Civil Work</option>
                          </select>

                          <select
                            value={wizardProduct}
                            onChange={(e) => setWizardProduct(e.target.value)}
                            style={{
                              padding: "9px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              background: "#ffffff",
                            }}
                          >
                            {(SUB_OPTIONS_BY_CATEGORY[wizardCategory] || []).map(
                              (sub) => (
                                <option key={sub.value} value={sub.value}>
                                  {sub.label}
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => setWizardStep(2)}
                            style={{
                              padding: "9px 18px",
                              background: "#2563eb",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "6px",
                              fontWeight: "bold",
                              cursor: "pointer",
                            }}
                          >
                            Next: Fault &amp; Status →
                          </button>
                        </div>
                      </div>
                    )}

                    {wizardStep === 2 && (
                      <div>
                        <h4 style={{ margin: "0 0 10px 0" }}>
                          Step 2: Fault Description &amp; Job Status
                        </h4>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(220px, 1fr))",
                            gap: "10px",
                            marginBottom: "12px",
                          }}
                        >
                          <div>
                            <label
                              style={{
                                display: "block",
                                fontSize: "12px",
                                fontWeight: "bold",
                                marginBottom: "4px",
                              }}
                            >
                              Job Status
                            </label>
                            <select
                              value={wizardStatus}
                              onChange={(e) => setWizardStatus(e.target.value)}
                              style={{
                                width: "100%",
                                padding: "9px",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                background: "#ffffff",
                              }}
                            >
                              <option value="Completed">Completed</option>
                              <option value="Part Pending">Part Pending</option>
                              <option value="Other Reason Pending">
                                Other Reason Pending
                              </option>
                            </select>
                          </div>

                          {wizardStatus !== "Completed" && (
                            <div>
                              <label
                                style={{
                                  display: "block",
                                  fontSize: "12px",
                                  fontWeight: "bold",
                                  marginBottom: "4px",
                                }}
                              >
                                Pending Reason / Sub-Option
                              </label>
                              <input
                                type="text"
                                value={wizardPendingSub}
                                onChange={(e) =>
                                  setWizardPendingSub(e.target.value)
                                }
                                placeholder="e.g. Compressor / PCB / Approval"
                                style={{
                                  width: "100%",
                                  padding: "9px",
                                  borderRadius: "6px",
                                  border: "1px solid #cbd5e1",
                                  boxSizing: "border-box",
                                }}
                              />
                            </div>
                          )}
                        </div>

                        <textarea
                          rows={3}
                          placeholder="Fault observed / Work carried out details..."
                          value={wizardFaultDesc}
                          onChange={(e) => setWizardFaultDesc(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "9px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            marginBottom: "10px",
                            boxSizing: "border-box",
                          }}
                        />

                        <input
                          type="text"
                          placeholder="Technician Remarks (optional)"
                          value={wizardRemarks}
                          onChange={(e) => setWizardRemarks(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "9px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            marginBottom: "14px",
                            boxSizing: "border-box",
                          }}
                        />

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setWizardStep(1)}
                            style={{
                              padding: "9px 16px",
                              background: "#e2e8f0",
                              color: "#0f172a",
                              border: "none",
                              borderRadius: "6px",
                              fontWeight: "bold",
                              cursor: "pointer",
                            }}
                          >
                            ← Back
                          </button>
                          <button
                            type="button"
                            onClick={() => setWizardStep(3)}
                            style={{
                              padding: "9px 18px",
                              background: "#2563eb",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "6px",
                              fontWeight: "bold",
                              cursor: "pointer",
                            }}
                          >
                            Next: Spare Parts →
                          </button>
                        </div>
                      </div>
                    )}

                    {wizardStep === 3 && (
                      <div>
                        <h4 style={{ margin: "0 0 10px 0" }}>
                          Step 3: Spare Parts Used
                        </h4>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(170px, 1fr))",
                            gap: "8px",
                            marginBottom: "10px",
                          }}
                        >
                          <select
                            value={selectedPartCategory}
                            onChange={(e) =>
                              handlePartCategoryChange(e.target.value)
                            }
                            style={{
                              padding: "8px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              background: "#ffffff",
                            }}
                          >
                            <option value="AC & Refrigeration">
                              AC &amp; Refrigeration
                            </option>
                            <option value="Electrical Work">Electrical Work</option>
                            <option value="Plumbing Work">Plumbing Work</option>
                            <option value="Civil Work">Civil Work</option>
                          </select>

                          <select
                            value={selectedPartName}
                            onChange={(e) => handlePartNameChange(e.target.value)}
                            style={{
                              padding: "8px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              background: "#ffffff",
                            }}
                          >
                            {SPARE_PARTS_CATALOG.filter(
                              (p) => p.category === selectedPartCategory
                            ).map((p) => (
                              <option key={p.name} value={p.name}>
                                {p.name}
                              </option>
                            ))}
                          </select>

                          <select
                            value={selectedPartModel}
                            onChange={(e) =>
                              setSelectedPartModel(e.target.value)
                            }
                            style={{
                              padding: "8px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              background: "#ffffff",
                            }}
                          >
                            {(
                              SPARE_PARTS_CATALOG.find(
                                (p) => p.name === selectedPartName
                              )?.models || ["Standard"]
                            ).map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>

                          <div style={{ display: "flex", gap: "6px" }}>
                            <input
                              type="number"
                              min={1}
                              value={selectedPartQty}
                              onChange={(e) =>
                                setSelectedPartQty(e.target.value)
                              }
                              style={{
                                width: "65px",
                                padding: "8px",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                              }}
                            />
                            <button
                              type="button"
                              onClick={handleAddPartToWizard}
                              style={{
                                flex: 1,
                                padding: "8px",
                                background: "#0f766e",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "6px",
                                fontWeight: "bold",
                                cursor: "pointer",
                              }}
                            >
                              + Add
                            </button>
                          </div>
                        </div>

                        {wizardUsedParts.length > 0 ? (
                          <div style={{ marginBottom: "14px" }}>
                            {wizardUsedParts.map((item) => (
                              <div
                                key={item.id}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "7px 10px",
                                  background: "#f1f5f9",
                                  borderRadius: "6px",
                                  marginBottom: "6px",
                                  fontSize: "13px",
                                }}
                              >
                                <span>
                                  <strong>{item.partName}</strong> — {item.model}{" "}
                                  (Qty: <strong>{item.qty}</strong>)
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemovePartFromWizard(item.id)
                                  }
                                  style={{
                                    background: "#ef4444",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "4px",
                                    padding: "3px 8px",
                                    fontSize: "11px",
                                    cursor: "pointer",
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#64748b",
                              marginBottom: "14px",
                            }}
                          >
                            कोई स्पेयर पार्ट नहीं जोड़ा गया है (यदि कोई पार्ट लगा है तो ऊपर से Add करें)।
                          </div>
                        )}

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setWizardStep(2)}
                            style={{
                              padding: "9px 16px",
                              background: "#e2e8f0",
                              color: "#0f172a",
                              border: "none",
                              borderRadius: "6px",
                              fontWeight: "bold",
                              cursor: "pointer",
                            }}
                          >
                            ← Back
                          </button>
                          <button
                            type="button"
                            onClick={() => setWizardStep(4)}
                            style={{
                              padding: "9px 18px",
                              background: "#2563eb",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "6px",
                              fontWeight: "bold",
                              cursor: "pointer",
                            }}
                          >
                            Next: Photos &amp; Signature →
                          </button>
                        </div>
                      </div>
                    )}

                    {wizardStep === 4 && (
                      <div>
                        <h4 style={{ margin: "0 0 10px 0" }}>
                          Step 4: Site Photos &amp; Customer Signature
                        </h4>

                        <div style={{ marginBottom: "12px" }}>
                          <label
                            style={{
                              display: "block",
                              fontSize: "12px",
                              fontWeight: "bold",
                              marginBottom: "4px",
                            }}
                          >
                            Upload Site / Unit Photos (Auto-compressed)
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleWizardPhotoUpload}
                          />
                          {isUploadingMedia && (
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#0369a1",
                                marginTop: "4px",
                              }}
                            >
                              Uploading compressed photo(s)...
                            </div>
                          )}

                          {wizardPhotos.length > 0 && (
                            <div
                              style={{
                                display: "flex",
                                gap: "8px",
                                flexWrap: "wrap",
                                marginTop: "8px",
                              }}
                            >
                              {wizardPhotos.map((url, i) => (
                                <img
                                  key={i}
                                  src={url}
                                  alt={`Site ${i + 1}`}
                                  style={{
                                    width: "70px",
                                    height: "70px",
                                    objectFit: "cover",
                                    borderRadius: "6px",
                                    border: "1px solid #cbd5e1",
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        <div style={{ marginBottom: "14px" }}>
                          <SignaturePad
                            existingSignature={wizardSignature}
                            onSaveSignature={(sigData) =>
                              setWizardSignature(sigData)
                            }
                          />
                        </div>

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setWizardStep(3)}
                            style={{
                              padding: "9px 16px",
                              background: "#e2e8f0",
                              color: "#0f172a",
                              border: "none",
                              borderRadius: "6px",
                              fontWeight: "bold",
                              cursor: "pointer",
                            }}
                          >
                            ← Back
                          </button>

                          <button
                            type="submit"
                            disabled={isUploadingMedia}
                            style={{
                              padding: "10px 20px",
                              background: "#15803d",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "6px",
                              fontWeight: "bold",
                              fontSize: "14px",
                              cursor: "pointer",
                            }}
                          >
                            ✓ Save Job Sheet
                          </button>
                        </div>
                      </div>
                    )}
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ====================================================== */}
        {/* 3. ADMIN & OFFICE PORTAL */}
        {/* ====================================================== */}
        {activeTab === "admin" && (
          <div
            style={{
              background: "#ffffff",
              padding: "18px",
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            {!adminAuthenticated ? (
              <form
                onSubmit={handleAdminAuth}
                style={{ maxWidth: "380px", margin: "16px auto" }}
              >
                <h2
                  style={{
                    margin: "0 0 12px 0",
                    color: "#b45309",
                    fontSize: "18px",
                  }}
                >
                  📊 Office / Admin Login
                </h2>
                <input
                  type="password"
                  placeholder="Enter Admin Passcode"
                  value={adminPassInput}
                  onChange={(e) => setAdminPassInput(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    marginBottom: "12px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="submit"
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "#d97706",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  Unlock Office Dashboard
                </button>
              </form>
            ) : (
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px",
                    marginBottom: "14px",
                    paddingBottom: "10px",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <h2 style={{ margin: 0, fontSize: "18px" }}>
                    {FIRM_NAME} — Office Control Panel
                  </h2>
                  <button
                    type="button"
                    onClick={() => setAdminAuthenticated(false)}
                    style={{
                      padding: "6px 12px",
                      background: "#334155",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    Lock Admin
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                    marginBottom: "16px",
                  }}
                >
                  {[
                    { id: "jobs", label: "📄 Job Sheets & Staff Folders" },
                    { id: "inventory", label: "📦 Spare Parts Stock" },
                    { id: "attendance", label: "🗺️ Attendance & Route Map" },
                    { id: "logins", label: "🔐 Login Audit" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setAdminMainTab(t.id)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "6px",
                        border: "none",
                        fontWeight: "bold",
                        fontSize: "13px",
                        cursor: "pointer",
                        background: adminMainTab === t.id ? "#0f172a" : "#e2e8f0",
                        color: adminMainTab === t.id ? "#ffffff" : "#1e293b",
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {adminMainTab === "jobs" && (
                  <div className="space-y-4">
                    <StaffFolderPage
                      staffFolders={staffFoldersData}
                      firmName={FIRM_NAME}
                      onOpenPrintableSheet={(job) => setInspectedJob(job)}
                    />

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px",
                        marginBottom: "12px",
                        alignItems: "center",
                      }}
                    >
                      <select
                        value={adminJobFilter}
                        onChange={(e) => setAdminJobFilter(e.target.value)}
                        style={{
                          padding: "7px 10px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          background: "#ffffff",
                        }}
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="Completed">Completed</option>
                        <option value="Part Pending">Part Pending</option>
                        <option value="Other Reason Pending">
                          Other Reason Pending
                        </option>
                      </select>

                      <select
                        value={adminSelectedStaffFolder}
                        onChange={(e) =>
                          setAdminSelectedStaffFolder(e.target.value)
                        }
                        style={{
                          padding: "7px 10px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          background: "#ffffff",
                        }}
                      >
                        <option value="ALL">All Staff Folders</option>
                        <option value="Not Assigned Yet">
                          Not Assigned Yet
                        </option>
                        {STAFF_LIST.map((s) => (
                          <option key={s.phone} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        placeholder="Search job no, customer, phone..."
                        value={adminSearchText}
                        onChange={(e) => setAdminSearchText(e.target.value)}
                        style={{
                          flex: 1,
                          minWidth: "180px",
                          padding: "7px 10px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                        }}
                      />
                    </div>

                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "13px",
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              background: "#f1f5f9",
                              textAlign: "left",
                              borderBottom: "2px solid #cbd5e1",
                            }}
                          >
                            <th style={{ padding: "8px" }}>Job No / Date</th>
                            <th style={{ padding: "8px" }}>Customer</th>
                            <th style={{ padding: "8px" }}>Product &amp; Issue</th>
                            <th style={{ padding: "8px" }}>Staff</th>
                            <th style={{ padding: "8px" }}>Status</th>
                            <th style={{ padding: "8px" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAdminJobs.length === 0 ? (
                            <tr>
                              <td
                                colSpan={6}
                                style={{
                                  padding: "16px",
                                  textAlign: "center",
                                  color: "#64748b",
                                }}
                              >
                                कोई जॉब शीट नहीं मिली।
                              </td>
                            </tr>
                          ) : (
                            filteredAdminJobs.map((job) => (
                              <tr
                                key={job.jobSheetNo}
                                style={{ borderBottom: "1px solid #e2e8f0" }}
                              >
                                <td style={{ padding: "8px" }}>
                                  <strong>{job.jobSheetNo}</strong>
                                  <div
                                    style={{
                                      fontSize: "11px",
                                      color: "#64748b",
                                    }}
                                  >
                                    {job.date}
                                  </div>
                                </td>
                                <td style={{ padding: "8px" }}>
                                  <strong>{job.customerName}</strong>
                                  <div style={{ fontSize: "12px" }}>
                                    {job.customerPhone}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "11px",
                                      color: "#64748b",
                                    }}
                                  >
                                    {job.customerAddress}
                                  </div>
                                </td>
                                <td style={{ padding: "8px" }}>
                                  <div style={{ fontWeight: "600" }}>
                                    {job.product}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "12px",
                                      color: "#334155",
                                    }}
                                  >
                                    {job.desc || job.faultDetails}
                                  </div>
                                  {job.sparePartsSummary &&
                                    job.sparePartsSummary !== "None" && (
                                      <div
                                        style={{
                                          fontSize: "11px",
                                          color: "#0f766e",
                                          marginTop: "2px",
                                        }}
                                      >
                                        Parts: {job.sparePartsSummary}
                                      </div>
                                    )}
                                </td>
                                <td style={{ padding: "8px" }}>
                                  {job.staffName || "Not Assigned Yet"}
                                </td>
                                <td style={{ padding: "8px" }}>
                                  <StatusBadge
                                    status={job.status}
                                    subOption={job.pendingSubOption}
                                  />
                                  <div style={{ marginTop: "4px" }}>
                                    <select
                                      value={job.status || "Pending"}
                                      onChange={(e) =>
                                        handleUpdateJobStatus(
                                          job.jobSheetNo,
                                          e.target.value
                                        )
                                      }
                                      style={{
                                        fontSize: "11px",
                                        padding: "2px 4px",
                                        borderRadius: "4px",
                                        border: "1px solid #cbd5e1",
                                        background: "#ffffff",
                                      }}
                                    >
                                      <option value="Pending">Pending</option>
                                      <option value="Completed">
                                        Completed
                                      </option>
                                      <option value="Part Pending">
                                        Part Pending
                                      </option>
                                      <option value="Other Reason Pending">
                                        Other Reason Pending
                                      </option>
                                    </select>
                                  </div>
                                </td>
                                <td style={{ padding: "8px" }}>
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: "6px",
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => setInspectedJob(job)}
                                      style={{
                                        padding: "4px 8px",
                                        background: "#0284c7",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: "4px",
                                        fontSize: "11px",
                                        fontWeight: "bold",
                                        cursor: "pointer",
                                      }}
                                    >
                                      View / Print
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteJob(job.jobSheetNo)
                                      }
                                      style={{
                                        padding: "4px 8px",
                                        background: "#dc2626",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: "4px",
                                        fontSize: "11px",
                                        fontWeight: "bold",
                                        cursor: "pointer",
                                      }}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {adminMainTab === "inventory" && (
                  <div>
                    <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>
                      📦 Spare Parts Inventory Management
                    </h3>

                    <form
                      onSubmit={handleAddOrUpdateStock}
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(150px, 1fr))",
                        gap: "8px",
                        background: "#f8fafc",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        marginBottom: "14px",
                      }}
                    >
                      <select
                        value={newStockCategory}
                        onChange={(e) => setNewStockCategory(e.target.value)}
                        style={{
                          padding: "8px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          background: "#ffffff",
                        }}
                      >
                        <option value="AC & Refrigeration">
                          AC &amp; Refrigeration
                        </option>
                        <option value="Electrical Work">Electrical Work</option>
                        <option value="Plumbing Work">Plumbing Work</option>
                        <option value="Civil Work">Civil Work</option>
                      </select>

                      <select
                        value={newStockName}
                        onChange={(e) => setNewStockName(e.target.value)}
                        style={{
                          padding: "8px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          background: "#ffffff",
                        }}
                      >
                        {SPARE_PARTS_CATALOG.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        placeholder="Model / Spec (e.g. 50 mfd)"
                        value={newStockModel}
                        onChange={(e) => setNewStockModel(e.target.value)}
                        required
                        style={{
                          padding: "8px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                        }}
                      />

                      <input
                        type="number"
                        min={1}
                        placeholder="Add Qty"
                        value={newStockQty}
                        onChange={(e) => setNewStockQty(e.target.value)}
                        required
                        style={{
                          padding: "8px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                        }}
                      />

                      <input
                        type="number"
                        min={1}
                        placeholder="Min Alert Qty"
                        value={newStockMinQty}
                        onChange={(e) => setNewStockMinQty(e.target.value)}
                        style={{
                          padding: "8px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                        }}
                      />

                      <button
                        type="submit"
                        style={{
                          padding: "8px 12px",
                          background: "#16a34a",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "6px",
                          fontWeight: "bold",
                          cursor: "pointer",
                        }}
                      >
                        + Add Stock
                      </button>
                    </form>

                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "13px",
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              background: "#f1f5f9",
                              textAlign: "left",
                              borderBottom: "2px solid #cbd5e1",
                            }}
                          >
                            <th style={{ padding: "8px" }}>Part Name</th>
                            <th style={{ padding: "8px" }}>Model / Spec</th>
                            <th style={{ padding: "8px" }}>Category</th>
                            <th style={{ padding: "8px" }}>Available Qty</th>
                            <th style={{ padding: "8px" }}>Adjust</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventoryStock.map((item) => {
                            const isLow =
                              Number(item.qty || 0) <= Number(item.minQty || 2);
                            return (
                              <tr
                                key={item.id}
                                style={{
                                  borderBottom: "1px solid #e2e8f0",
                                  background: isLow ? "#fef2f2" : "#ffffff",
                                }}
                              >
                                <td style={{ padding: "8px" }}>
                                  <strong>{item.partName}</strong>
                                </td>
                                <td style={{ padding: "8px" }}>{item.model}</td>
                                <td style={{ padding: "8px" }}>
                                  {item.category}
                                </td>
                                <td style={{ padding: "8px" }}>
                                  <strong
                                    style={{
                                      color: isLow ? "#dc2626" : "#15803d",
                                    }}
                                  >
                                    {item.qty}
                                  </strong>
                                  {isLow && (
                                    <span
                                      style={{
                                        marginLeft: "6px",
                                        fontSize: "11px",
                                        color: "#dc2626",
                                        fontWeight: "bold",
                                      }}
                                    >
                                      (Low Stock)
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: "8px" }}>
                                  <div
                                    style={{ display: "flex", gap: "6px" }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleAdjustStockQty(item, -1)
                                      }
                                      style={{
                                        padding: "2px 8px",
                                        background: "#e2e8f0",
                                        border: "none",
                                        borderRadius: "4px",
                                        fontWeight: "bold",
                                        cursor: "pointer",
                                      }}
                                    >
                                      -
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleAdjustStockQty(item, 1)
                                      }
                                      style={{
                                        padding: "2px 8px",
                                        background: "#e2e8f0",
                                        border: "none",
                                        borderRadius: "4px",
                                        fontWeight: "bold",
                                        cursor: "pointer",
                                      }}
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {adminMainTab === "attendance" && (
                  <div>
                    <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>
                      🗺️ Staff Attendance &amp; GPS Route Tracker
                    </h3>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "10px",
                        marginBottom: "10px",
                        alignItems: "center",
                      }}
                    >
                      <select
                        value={selectedRouteStaff}
                        onChange={(e) => setSelectedRouteStaff(e.target.value)}
                        style={{
                          padding: "7px 10px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          background: "#ffffff",
                        }}
                      >
                        <option value="ALL">All Staff</option>
                        {STAFF_LIST.map((s) => (
                          <option key={s.phone} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        placeholder="DD/MM/YYYY"
                        value={selectedRouteDate}
                        onChange={(e) => setSelectedRouteDate(e.target.value)}
                        style={{
                          padding: "7px 10px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                        }}
                      />

                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: "bold",
                          color: "#1d4ed8",
                        }}
                      >
                        Total Logged Distance: {totalRouteKm.toFixed(2)} km
                      </div>
                    </div>

                    <AttendanceRouteMap attendanceLogs={routeFilteredLogs} />

                    <div style={{ overflowX: "auto", marginTop: "14px" }}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "12px",
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              background: "#f1f5f9",
                              textAlign: "left",
                              borderBottom: "2px solid #cbd5e1",
                            }}
                          >
                            <th style={{ padding: "8px" }}>Time</th>
                            <th style={{ padding: "8px" }}>Staff</th>
                            <th style={{ padding: "8px" }}>Type</th>
                            <th style={{ padding: "8px" }}>GPS Location</th>
                            <th style={{ padding: "8px" }}>Dist (km)</th>
                            <th style={{ padding: "8px" }}>Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {routeFilteredLogs.map((log) => (
                            <tr
                              key={log.id}
                              style={{ borderBottom: "1px solid #e2e8f0" }}
                            >
                              <td style={{ padding: "8px" }}>{log.time}</td>
                              <td style={{ padding: "8px" }}>
                                <strong>{log.staffName}</strong>
                              </td>
                              <td style={{ padding: "8px" }}>
                                <span
                                  style={{
                                    padding: "2px 8px",
                                    borderRadius: "999px",
                                    fontWeight: "bold",
                                    background:
                                      log.type === "IN"
                                        ? "#dcfce7"
                                        : "#fee2e2",
                                    color:
                                      log.type === "IN"
                                        ? "#166534"
                                        : "#991b1b",
                                  }}
                                >
                                  {log.type}
                                </span>
                              </td>
                              <td style={{ padding: "8px" }}>
                                {log.locationText}
                              </td>
                              <td style={{ padding: "8px" }}>
                                {log.distanceKm || 0}
                              </td>
                              <td style={{ padding: "8px" }}>{log.note}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {adminMainTab === "logins" && (
                  <div>
                    <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>
                      🔐 Recent Portal Login History
                    </h3>
                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "12px",
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              background: "#f1f5f9",
                              textAlign: "left",
                              borderBottom: "2px solid #cbd5e1",
                            }}
                          >
                            <th style={{ padding: "8px" }}>Time</th>
                            <th style={{ padding: "8px" }}>Role</th>
                            <th style={{ padding: "8px" }}>User / Name</th>
                            <th style={{ padding: "8px" }}>Phone / ID</th>
                            <th style={{ padding: "8px" }}>GPS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loginHistory.map((item) => (
                            <tr
                              key={item.id}
                              style={{ borderBottom: "1px solid #e2e8f0" }}
                            >
                              <td style={{ padding: "8px" }}>{item.time}</td>
                              <td style={{ padding: "8px" }}>
                                <strong>{item.role}</strong>
                              </td>
                              <td style={{ padding: "8px" }}>{item.name}</td>
                              <td style={{ padding: "8px" }}>{item.phone}</td>
                              <td style={{ padding: "8px" }}>{item.gps}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ====================================================== */}
        {/* PRINTABLE JOB SHEET MODAL */}
        {/* ====================================================== */}
        {inspectedJob && (
          <JobSheet
            job={inspectedJob}
            firmName={FIRM_NAME}
            onClose={() => setInspectedJob(null)}
          />
        )}
      </div>
    </div>
  );
}