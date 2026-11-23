import React, { useEffect, useMemo, useRef, useState } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
} from "firebase/storage";
import CustomerPortal from "./CustomerPortal";
import StaffFolderPage from "./StaffFolderPage";

// ============================================================================
// 1. FIREBASE & TELEGRAM CONFIGURATION
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyD-mq-fsm-45ee9-demo-key",
  authDomain: "mq-fsm-45ee9.firebaseapp.com",
  projectId: "mq-fsm-45ee9",
  storageBucket: "mq-fsm-45ee9.appspot.com",
  messagingSenderId: "102938475610",
  appId: "1:102938475610:web:a1b2c3d4e5f6",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

const TELEGRAM_BOT_TOKEN = "";
const TELEGRAM_CHAT_ID = "";

const COMPANY_NAME = "Hindustan Refrigeration Service";
const COMPANY_TAGLINE = "AC, Refrigeration & Commercial Cooling Service";
const OFFICE_PIN = "1234";

// ============================================================================
// 2. IMAGE COMPRESSION, OFFLINE SYNC QUEUE & HELPERS
// ============================================================================
export async function compressImage(
  fileOrDataUrl,
  maxWidth = 1024,
  quality = 0.72
) {
  const loadSource = () =>
    new Promise((resolve, reject) => {
      if (typeof fileOrDataUrl === "string") {
        resolve(fileOrDataUrl);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(fileOrDataUrl);
    });

  const dataUrl = await loadSource();

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

const OFFLINE_QUEUE_KEY = "mq_offline_sync_queue_v1";

function loadOfflineQueue() {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOfflineQueue(queue) {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignore storage quota errors
  }
}

function enqueueOfflineAction(action) {
  const queue = loadOfflineQueue();
  queue.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...action,
  });
  saveOfflineQueue(queue);
  return queue.length;
}

async function sendTelegramAlert(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "HTML",
        }),
      }
    );
  } catch {
    // ignore network errors in alert sender
  }
}

function formatDateTime(ts) {
  if (!ts) return "-";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(ts) {
  if (!ts) return "-";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function uploadDataUrlIfNeeded(dataUrl, pathPrefix) {
  if (!dataUrl) return "";
  if (dataUrl.startsWith("http://") || dataUrl.startsWith("https://")) {
    return dataUrl;
  }
  if (!navigator.onLine) {
    return dataUrl;
  }
  try {
    const fileRef = ref(storage, `${pathPrefix}/${Date.now()}.png`);
    await uploadString(fileRef, dataUrl, "data_url");
    return await getDownloadURL(fileRef);
  } catch {
    return dataUrl;
  }
}

// ============================================================================
// 3. A4 PRINTABLE JOB SHEET HTML BUILDER
// ============================================================================
function buildPrintableJobSheetHtml(job) {
  const isAirCooler =
    String(job.equipmentType || "")
      .toLowerCase()
      .includes("cooler") &&
    !String(job.equipmentType || "")
      .toLowerCase()
      .includes("water");

  const parts = Array.isArray(job.spareParts) ? job.spareParts : [];
  const partsRows =
    parts.length > 0
      ? parts
          .map(
            (p, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${p.name || "-"}</td>
            <td>${p.qty || 1}</td>
            <td>₹${p.rate || 0}</td>
            <td>${p.status || "use"}</td>
          </tr>`
          )
          .join("")
      : `<tr><td colspan="5" style="text-align:center;">कोई स्पेयर पार्ट दर्ज नहीं</td></tr>`;

  const coolerChecklist = `
    <div class="box">
      <h3>Air Cooler Inspection Checklist</h3>
      <p><strong>Motor / Pump Status:</strong> ${job.coolerMotorStatus || "Checked"}</p>
      <p><strong>Water Level / Float / Pads:</strong> ${job.coolerWaterStatus || "Checked"}</p>
      <p><strong>Louvers / Body / Wiring:</strong> ${job.coolerBodyStatus || "Checked"}</p>
    </div>`;

  const acFridgeChecklist = `
    <div class="box">
      <h3>Cooling & Electrical Parameters</h3>
      <p><strong>Temperature / Pressure:</strong> ${job.tempOrPressure || "Normal"}</p>
      <p><strong>Compressor / Ampere / Gas:</strong> ${job.electricalNotes || "Checked"}</p>
      <p><strong>Indoor / Outdoor / Coil:</strong> ${job.unitCondition || "Checked"}</p>
    </div>`;

  return `<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8" />
<title>Job Sheet - ${job.jobSheetNo || job.id || ""}</title>
<style>
  @page { size: A4; margin: 12mm; }
  body { font-family: Arial, sans-serif; color: #111827; font-size: 12px; line-height: 1.45; }
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
  .brand { font-size: 18px; font-weight: bold; color: #0f172a; }
  .sub { font-size: 11px; color: #475569; }
  .meta { text-align: right; font-size: 11px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
  .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; background: #f8fafc; margin-bottom: 10px; }
  .box h3 { margin: 0 0 6px; font-size: 13px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-size: 11px; }
  th { background: #e2e8f0; }
  .sign-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 18px; }
  .sign-box { border-top: 1px dashed #475569; padding-top: 6px; text-align: center; font-size: 11px; }
  .sign-img { max-height: 54px; display: block; margin: 0 auto 4px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">${COMPANY_NAME}</div>
      <div class="sub">${COMPANY_TAGLINE}</div>
    </div>
    <div class="meta">
      <div><strong>Job Sheet No:</strong> ${job.jobSheetNo || job.id || "-"}</div>
      <div><strong>Date:</strong> ${formatDateTime(job.createdAt)}</div>
      <div><strong>Status:</strong> ${job.status || "पेंडिंग"}</div>
    </div>
  </div>

  <div class="grid">
    <div class="box">
      <h3>Customer Details</h3>
      <p><strong>Name:</strong> ${job.customerName || "-"}</p>
      <p><strong>Phone:</strong> ${job.customerPhone || "-"}</p>
      <p><strong>Address:</strong> ${job.customerAddress || "-"}</p>
    </div>
    <div class="box">
      <h3>Service & Staff Details</h3>
      <p><strong>Equipment:</strong> ${job.equipmentType || "-"}</p>
      <p><strong>Technician:</strong> ${job.staffName || "-"}</p>
      <p><strong>Complaint:</strong> ${job.complaint || "-"}</p>
    </div>
  </div>

  ${isAirCooler ? coolerChecklist : acFridgeChecklist}

  <div class="box">
    <h3>किया गया कार्य (Work Done)</h3>
    <p>${job.workDone || "-"}</p>
  </div>

  <div class="box">
    <h3>स्पेयर पार्ट (Spare Parts)</h3>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Part Name</th>
          <th>Qty</th>
          <th>Rate</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${partsRows}</tbody>
    </table>
  </div>

  <div class="sign-row">
    <div class="sign-box">
      ${job.staffSignature ? `<img src="${job.staffSignature}" class="sign-img" />` : "<div style='height:54px'></div>"}
      <div>Technician Signature (${job.staffName || "Staff"})</div>
    </div>
    <div class="sign-box">
      ${job.customerSignature ? `<img src="${job.customerSignature}" class="sign-img" />` : "<div style='height:54px'></div>"}
      <div>Customer Signature (${job.customerName || "Customer"})</div>
    </div>
  </div>
</body>
</html>`;
}

function openPrintJobSheet(job) {
  const html = buildPrintableJobSheetHtml(job);
  const win = window.open("", "_blank", "width=850,height=1050");
  if (!win) {
    alert("कृपया पॉप-अप (Pop-up) अनुमति दें ताकि जॉब शीट प्रिंट हो सके।");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 300);
}

// ============================================================================
// 4. FULL-SCREEN DIGITAL SIGNATURE PAD COMPONENT
// ============================================================================
function FullScreenSignaturePad({
  title = "डिजिटल सिग्नेचर",
  initialValue = "",
  onSave,
  onClose,
}) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const tempData = canvas.toDataURL();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const srcImg = initialValue || tempData;
      if (srcImg && srcImg.startsWith("data:image")) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
        };
        img.src = srcImg;
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [initialValue]);

  const getCoords = (e) => {
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
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawingRef.current = true;
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.closePath();
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  };

  return (
    <div style={styles.signOverlay}>
      <div style={styles.signHeader}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={handleClear} style={styles.btnSecondary}>
            साफ करें
          </button>
          <button type="button" onClick={handleSave} style={styles.btnPrimary}>
            सेव करें
          </button>
          <button type="button" onClick={onClose} style={styles.btnDanger}>
            बंद करें
          </button>
        </div>
      </div>
      <div style={styles.signCanvasWrap}>
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={styles.signCanvas}
        />
      </div>
    </div>
  );
}

// ============================================================================
// 5. SLIDE-BY-SLIDE JOB FORM WIZARD BUILDER
// ============================================================================
function buildAllSlides({
  formData,
  setFormData,
  sparePartDraft,
  setSparePartDraft,
  addSparePart,
  removeSparePart,
  openSignatureFor,
}) {
  return [
    {
      key: "customer",
      title: "ग्राहक विवरण (Customer Details)",
      content: (
        <div style={styles.slideBody}>
          <label style={styles.label}>ग्राहक का नाम *</label>
          <input
            type="text"
            value={formData.customerName || ""}
            onChange={(e) =>
              setFormData((p) => ({ ...p, customerName: e.target.value }))
            }
            placeholder="ग्राहक का पूरा नाम"
            style={styles.input}
          />
          <label style={styles.label}>मोबाइल नंबर *</label>
          <input
            type="tel"
            value={formData.customerPhone || ""}
            onChange={(e) =>
              setFormData((p) => ({ ...p, customerPhone: e.target.value }))
            }
            placeholder="10 अंकों का मोबाइल नंबर"
            style={styles.input}
          />
          <label style={styles.label}>पता (Address)</label>
          <textarea
            rows={3}
            value={formData.customerAddress || ""}
            onChange={(e) =>
              setFormData((p) => ({ ...p, customerAddress: e.target.value }))
            }
            placeholder="ग्राहक का पता"
            style={styles.textarea}
          />
        </div>
      ),
    },
    {
      key: "equipment",
      title: "उपकरण व शिकायत (Equipment & Complaint)",
      content: (
        <div style={styles.slideBody}>
          <label style={styles.label}>उपकरण प्रकार (Equipment)</label>
          <select
            value={formData.equipmentType || "Split AC"}
            onChange={(e) =>
              setFormData((p) => ({ ...p, equipmentType: e.target.value }))
            }
            style={styles.input}
          >
            <option value="Split AC">Split AC</option>
            <option value="Window AC">Window AC</option>
            <option value="Refrigerator / Fridge">Refrigerator / Fridge</option>
            <option value="Water Cooler">Water Cooler</option>
            <option value="Air Cooler">Air Cooler</option>
            <option value="Deep Freezer / Commercial">
              Deep Freezer / Commercial
            </option>
          </select>

          <label style={styles.label}>शिकायत / समस्या</label>
          <textarea
            rows={3}
            value={formData.complaint || ""}
            onChange={(e) =>
              setFormData((p) => ({ ...p, complaint: e.target.value }))
            }
            placeholder="क्या समस्या आ रही है..."
            style={styles.textarea}
          />

          <label style={styles.label}>स्थिति (Status)</label>
          <select
            value={formData.status || "पेंडिंग"}
            onChange={(e) =>
              setFormData((p) => ({ ...p, status: e.target.value }))
            }
            style={styles.input}
          >
            <option value="पेंडिंग">पेंडिंग</option>
            <option value="कंप्लीट">कंप्लीट</option>
            <option value="part pending">part pending</option>
            <option value="other resan pending">other resan pending</option>
          </select>
        </div>
      ),
    },
    {
      key: "workDone",
      title: "किया गया कार्य (Work Done)",
      content: (
        <div style={styles.slideBody}>
          <label style={styles.label}>किया गया कार्य (विवरण)</label>
          <textarea
            rows={4}
            value={formData.workDone || ""}
            onChange={(e) =>
              setFormData((p) => ({ ...p, workDone: e.target.value }))
            }
            placeholder="जो कार्य किया गया है उसका विवरण लिखें..."
            style={styles.textarea}
          />
          <label style={styles.label}>टेक्निकल नोट / रीडिंग</label>
          <input
            type="text"
            value={formData.electricalNotes || ""}
            onChange={(e) =>
              setFormData((p) => ({ ...p, electricalNotes: e.target.value }))
            }
            placeholder="Ampere / Gas / Temp / Cooler Motor आदि"
            style={styles.input}
          />
        </div>
      ),
    },
    {
      key: "spareParts",
      title: "स्पेयर पार्ट (Spare Parts)",
      content: (
        <div style={styles.slideBody}>
          <div style={styles.partGrid}>
            <input
              type="text"
              value={sparePartDraft.name}
              onChange={(e) =>
                setSparePartDraft((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="पार्ट का नाम"
              style={styles.input}
            />
            <input
              type="number"
              min="1"
              value={sparePartDraft.qty}
              onChange={(e) =>
                setSparePartDraft((p) => ({
                  ...p,
                  qty: Number(e.target.value) || 1,
                }))
              }
              placeholder="Qty"
              style={styles.input}
            />
            <input
              type="number"
              min="0"
              value={sparePartDraft.rate}
              onChange={(e) =>
                setSparePartDraft((p) => ({
                  ...p,
                  rate: Number(e.target.value) || 0,
                }))
              }
              placeholder="Rate (₹)"
              style={styles.input}
            />
            <select
              value={sparePartDraft.status}
              onChange={(e) =>
                setSparePartDraft((p) => ({ ...p, status: e.target.value }))
              }
              style={styles.input}
            >
              <option value="use">use</option>
              <option value="पेंडिंग">पेंडिंग</option>
              <option value="repair">repair</option>
            </select>
          </div>

          <button type="button" onClick={addSparePart} style={styles.btnSecondary}>
            + पार्ट जोड़ें
          </button>

          <div style={{ marginTop: 10 }}>
            {(formData.spareParts || []).map((pt, i) => (
              <div key={i} style={styles.partRow}>
                <span>
                  <strong>{pt.name}</strong> | Qty: {pt.qty} | ₹{pt.rate} |{" "}
                  <em>{pt.status}</em>
                </span>
                <button
                  type="button"
                  onClick={() => removeSparePart(i)}
                  style={styles.btnMiniDanger}
                >
                  हटाएं
                </button>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      key: "signatures",
      title: "हस्ताक्षर (Signatures)",
      content: (
        <div style={styles.slideBody}>
          <div style={styles.signPreviewCard}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                ग्राहक हस्ताक्षर (Customer Signature)
              </div>
              {formData.customerSignature ? (
                <img
                  src={formData.customerSignature}
                  alt="Customer Sign"
                  style={styles.thumbSign}
                />
              ) : (
                <div style={styles.muted}>हस्ताक्षर बाकी है</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => openSignatureFor("customerSignature")}
              style={styles.btnPrimary}
            >
              हस्ताक्षर लें
            </button>
          </div>

          <div style={styles.signPreviewCard}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                स्टाफ हस्ताक्षर (Staff Signature)
              </div>
              {formData.staffSignature ? (
                <img
                  src={formData.staffSignature}
                  alt="Staff Sign"
                  style={styles.thumbSign}
                />
              ) : (
                <div style={styles.muted}>हस्ताक्षर बाकी है</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => openSignatureFor("staffSignature")}
              style={styles.btnSecondary}
            >
              स्टाफ हस्ताक्षर
            </button>
          </div>
        </div>
      ),
    },
  ];
}

// ============================================================================
// 6. MAIN APP COMPONENT
// ============================================================================
export default function App() {
  const [activeView, setActiveView] = useState("home");

  const [jobs, setJobs] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingQueueCount, setPendingQueueCount] = useState(
    () => loadOfflineQueue().length
  );

  const [staffPhoneInput, setStaffPhoneInput] = useState("");
  const [staffOtpInput, setStaffOtpInput] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loggedInStaff, setLoggedInStaff] = useState(null);
  const [staffTab, setStaffTab] = useState("jobs");

  const [officeUnlocked, setOfficeUnlocked] = useState(false);
  const [officePinInput, setOfficePinInput] = useState("");
  const [officeTab, setOfficeTab] = useState("jobs");

  const [slideIndex, setSlideIndex] = useState(0);
  const [editingJobId, setEditingJobId] = useState(null);
  const [signatureTargetField, setSignatureTargetField] = useState(null);
  const [sparePartDraft, setSparePartDraft] = useState({
    name: "",
    qty: 1,
    rate: 0,
    status: "use",
  });
  const [formData, setFormData] = useState({
    jobSheetNo: "",
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    equipmentType: "Split AC",
    complaint: "",
    status: "पेंडिंग",
    workDone: "",
    electricalNotes: "",
    spareParts: [],
    customerSignature: "",
    staffSignature: "",
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      flushOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    if (navigator.onLine) {
      flushOfflineQueue();
    }
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  async function flushOfflineQueue() {
    const queue = loadOfflineQueue();
    if (!queue.length || !navigator.onLine) return;

    const remaining = [];
    for (const item of queue) {
      try {
        if (item.type === "setDoc") {
          await setDoc(doc(db, item.collectionName, item.docId), item.payload, {
            merge: true,
          });
        } else if (item.type === "addDoc") {
          await addDoc(collection(db, item.collectionName), item.payload);
        } else if (item.type === "updateDoc") {
          await updateDoc(
            doc(db, item.collectionName, item.docId),
            item.payload
          );
        }
      } catch {
        remaining.push(item);
      }
    }
    saveOfflineQueue(remaining);
    setPendingQueueCount(remaining.length);
  }

  useEffect(() => {
    const unsubJobs = onSnapshot(
      query(collection(db, "jobSheets"), orderBy("createdAt", "desc")),
      (snap) => {
        setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      () => {}
    );

    const unsubComplaints = onSnapshot(
      query(collection(db, "complaints"), orderBy("createdAt", "desc")),
      (snap) => {
        setComplaints(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      () => {}
    );

    const unsubStaff = onSnapshot(
      collection(db, "staff"),
      (snap) => {
        setStaffList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      () => {}
    );

    const unsubAttendance = onSnapshot(
      query(collection(db, "staff_attendance"), orderBy("checkInAt", "desc")),
      (snap) => {
        setAttendanceLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      () => {}
    );

    return () => {
      unsubJobs();
      unsubComplaints();
      unsubStaff();
      unsubAttendance();
    };
  }, []);

  function getCurrentCoords() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 6000 }
      );
    });
  }

  const handleSendOtp = (e) => {
    e.preventDefault();
    const cleanPhone = staffPhoneInput.replace(/\D/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      alert("कृपया सही 10 अंकों का मोबाइल नंबर डालें।");
      return;
    }
    const code = String(Math.floor(1000 + Math.random() * 9000));
    setGeneratedOtp(code);
    setOtpSent(true);
    alert(`OTP भेजा गया है: ${code}`);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!staffOtpInput.trim() || staffOtpInput.trim() !== generatedOtp) {
      alert("गलत OTP। कृपया सही OTP डालें।");
      return;
    }

    const cleanPhone = staffPhoneInput.replace(/\D/g, "").slice(-10);
    const matched = staffList.find(
      (s) => String(s.phone || "").replace(/\D/g, "").slice(-10) === cleanPhone
    );

    const staffMember = matched || {
      id: `staff_${cleanPhone}`,
      name: `Staff (${cleanPhone})`,
      phone: cleanPhone,
    };

    setLoggedInStaff(staffMember);
    setStaffTab("jobs");

    const coords = await getCurrentCoords();
    const todayKey = getTodayKey();
    const attDocId = `${staffMember.id}_${todayKey}`;
    const attPayload = {
      staffId: staffMember.id,
      staffName: staffMember.name,
      staffPhone: cleanPhone,
      dateKey: todayKey,
      status: "checked_in",
      checkInAt: new Date().toISOString(),
      checkInLocation: coords,
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, "staff_attendance", attDocId), attPayload, {
        merge: true,
      });
    } catch {
      const count = enqueueOfflineAction({
        type: "setDoc",
        collectionName: "staff_attendance",
        docId: attDocId,
        payload: attPayload,
      });
      setPendingQueueCount(count);
    }

    await sendTelegramAlert(
      `🟢 <b>Staff Check-In</b>\nName: ${staffMember.name}\nPhone: ${cleanPhone}\nDate: ${todayKey}`
    );
  };

  const handleStaffLogout = async () => {
    if (loggedInStaff) {
      const todayKey = getTodayKey();
      const attDocId = `${loggedInStaff.id}_${todayKey}`;
      const payload = {
        status: "checked_out",
        checkOutAt: new Date().toISOString(),
        logoutMode: "self",
      };
      try {
        await updateDoc(doc(db, "staff_attendance", attDocId), payload);
      } catch {
        enqueueOfflineAction({
          type: "updateDoc",
          collectionName: "staff_attendance",
          docId: attDocId,
          payload,
        });
      }
    }
    setLoggedInStaff(null);
    setOtpSent(false);
    setStaffOtpInput("");
    setGeneratedOtp("");
  };

  const handleAdminForceLogout = async (logItem) => {
    const targetId =
      logItem.id || `${logItem.staffId}_${logItem.dateKey || getTodayKey()}`;
    const payload = {
      status: "checked_out",
      checkOutAt: new Date().toISOString(),
      logoutMode: "admin_manual",
      loggedOutByAdmin: true,
    };
    try {
      await updateDoc(doc(db, "staff_attendance", targetId), payload);
    } catch {
      const count = enqueueOfflineAction({
        type: "updateDoc",
        collectionName: "staff_attendance",
        docId: targetId,
        payload,
      });
      setPendingQueueCount(count);
    }
  };

  const resetJobForm = () => {
    setEditingJobId(null);
    setSlideIndex(0);
    setSparePartDraft({ name: "", qty: 1, rate: 0, status: "use" });
    setFormData({
      jobSheetNo: `JS-${String(Date.now()).slice(-6)}`,
      customerName: "",
      customerPhone: "",
      customerAddress: "",
      equipmentType: "Split AC",
      complaint: "",
      status: "पेंडिंग",
      workDone: "",
      electricalNotes: "",
      spareParts: [],
      customerSignature: "",
      staffSignature: "",
    });
  };

  const startNewJob = () => {
    resetJobForm();
    setStaffTab("newJob");
  };

  const startEditJob = (job) => {
    setEditingJobId(job.id);
    setSlideIndex(0);
    setFormData({
      jobSheetNo: job.jobSheetNo || job.id,
      customerName: job.customerName || "",
      customerPhone: job.customerPhone || "",
      customerAddress: job.customerAddress || "",
      equipmentType: job.equipmentType || "Split AC",
      complaint: job.complaint || "",
      status: job.status || "पेंडिंग",
      workDone: job.workDone || "",
      electricalNotes: job.electricalNotes || "",
      spareParts: Array.isArray(job.spareParts) ? job.spareParts : [],
      customerSignature: job.customerSignature || "",
      staffSignature: job.staffSignature || "",
    });
    setStaffTab("newJob");
  };

  const addSparePart = () => {
    if (!sparePartDraft.name.trim()) {
      alert("कृपया पार्ट का नाम लिखें।");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      spareParts: [...(prev.spareParts || []), { ...sparePartDraft }],
    }));
    setSparePartDraft({ name: "", qty: 1, rate: 0, status: "use" });
  };

  const removeSparePart = (index) => {
    setFormData((prev) => ({
      ...prev,
      spareParts: (prev.spareParts || []).filter((_, i) => i !== index),
    }));
  };

  const handleSaveJobSheet = async () => {
    if (!formData.customerName.trim() || !formData.customerPhone.trim()) {
      alert("ग्राहक का नाम और मोबाइल नंबर आवश्यक है।");
      return;
    }

    const custSignUrl = await uploadDataUrlIfNeeded(
      formData.customerSignature,
      "signatures/customer"
    );
    const staffSignUrl = await uploadDataUrlIfNeeded(
      formData.staffSignature,
      "signatures/staff"
    );

    const jobPayload = {
      ...formData,
      jobSheetNo: formData.jobSheetNo || `JS-${String(Date.now()).slice(-6)}`,
      customerSignature: custSignUrl,
      staffSignature: staffSignUrl,
      staffId: loggedInStaff?.id || "office",
      staffName: loggedInStaff?.name || "Office",
      updatedAt: new Date().toISOString(),
    };

    if (editingJobId) {
      try {
        await updateDoc(doc(db, "jobSheets", editingJobId), jobPayload);
      } catch {
        const count = enqueueOfflineAction({
          type: "updateDoc",
          collectionName: "jobSheets",
          docId: editingJobId,
          payload: jobPayload,
        });
        setPendingQueueCount(count);
      }
    } else {
      const fullNewJob = {
        ...jobPayload,
        createdAt: new Date().toISOString(),
      };
      try {
        await addDoc(collection(db, "jobSheets"), fullNewJob);
      } catch {
        const count = enqueueOfflineAction({
          type: "addDoc",
          collectionName: "jobSheets",
          payload: fullNewJob,
        });
        setPendingQueueCount(count);
      }
      await sendTelegramAlert(
        `📋 <b>New Job Sheet</b>\nNo: ${fullNewJob.jobSheetNo}\nCustomer: ${fullNewJob.customerName}\nStatus: ${fullNewJob.status}`
      );
    }

    alert("जॉब शीट सेव हो गई है।");
    setStaffTab("jobs");
  };

  const slides = useMemo(
    () =>
      buildAllSlides({
        formData,
        setFormData,
        sparePartDraft,
        setSparePartDraft,
        addSparePart,
        removeSparePart,
        openSignatureFor: (field) => setSignatureTargetField(field),
      }),
    [formData, sparePartDraft]
  );

  if (activeView === "home") {
    return (
      <div style={styles.frontPage}>
        <div style={styles.frontContainer}>
          <div style={styles.logoWrap}>
            <div style={styles.logoCircle}>HRS</div>
            <div style={styles.logoTitle}>{COMPANY_NAME}</div>
          </div>

          <div style={styles.frontButtonStack}>
            <button
              type="button"
              onClick={() => setActiveView("customer")}
              style={styles.frontPortalBtn}
            >
              Customer Portal
            </button>

            <button
              type="button"
              onClick={() => setActiveView("staff")}
              style={styles.frontPortalBtn}
            >
              फील्ड स्टाफ
            </button>

            <button
              type="button"
              onClick={() => setActiveView("office")}
              style={styles.frontPortalBtn}
            >
              ऑफिस
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeView === "customer") {
    return (
      <div style={styles.pageShell}>
        <div style={styles.topBar}>
          <button
            type="button"
            onClick={() => setActiveView("home")}
            style={styles.btnSecondary}
          >
            ← मुख्य पेज
          </button>
          <strong>Customer Portal</strong>
          <span style={styles.badge}>
            {isOnline ? "Online" : `Offline (${pendingQueueCount})`}
          </span>
        </div>
        <CustomerPortal
          db={db}
          storage={storage}
          jobs={jobs}
          onBack={() => setActiveView("home")}
        />
      </div>
    );
  }

  if (activeView === "staff") {
    return (
      <div style={styles.pageShell}>
        <div style={styles.topBar}>
          <button
            type="button"
            onClick={() => setActiveView("home")}
            style={styles.btnSecondary}
          >
            ← मुख्य पेज
          </button>
          <strong>फील्ड स्टाफ पोर्टल</strong>
          {loggedInStaff ? (
            <button
              type="button"
              onClick={handleStaffLogout}
              style={styles.btnDanger}
            >
              लॉगआउट
            </button>
          ) : (
            <span style={styles.badge}>
              {isOnline ? "Online" : `Offline (${pendingQueueCount})`}
            </span>
          )}
        </div>

        {!loggedInStaff ? (
          <div style={styles.cardCenter}>
            <h3 style={{ marginTop: 0 }}>स्टाफ लॉगिन (OTP)</h3>
            {!otpSent ? (
              <form onSubmit={handleSendOtp}>
                <label style={styles.label}>मोबाइल नंबर</label>
                <input
                  type="tel"
                  value={staffPhoneInput}
                  onChange={(e) => setStaffPhoneInput(e.target.value)}
                  placeholder="10 अंकों का नंबर"
                  style={styles.input}
                />
                <button
                  type="submit"
                  style={{ ...styles.btnPrimary, width: "100%", marginTop: 10 }}
                >
                  OTP भेजें
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <label style={styles.label}>OTP दर्ज करें</label>
                <input
                  type="text"
                  value={staffOtpInput}
                  onChange={(e) => setStaffOtpInput(e.target.value)}
                  placeholder="4 अंकों का OTP"
                  style={styles.input}
                />
                <button
                  type="submit"
                  style={{ ...styles.btnPrimary, width: "100%", marginTop: 10 }}
                >
                  लॉगिन करें
                </button>
              </form>
            )}
          </div>
        ) : (
          <div style={styles.contentWrap}>
            <div style={styles.subNav}>
              <button
                type="button"
                onClick={() => setStaffTab("jobs")}
                style={
                  staffTab === "jobs" ? styles.btnPrimary : styles.btnSecondary
                }
              >
                जॉब शीट ({jobs.length})
              </button>
              <button
                type="button"
                onClick={startNewJob}
                style={
                  staffTab === "newJob" ? styles.btnPrimary : styles.btnSecondary
                }
              >
                + नई जॉब शीट
              </button>
              <button
                type="button"
                onClick={() => setStaffTab("folder")}
                style={
                  staffTab === "folder"
                    ? styles.btnPrimary
                    : styles.btnSecondary
                }
              >
                स्टाफ फ़ोल्डर
              </button>
            </div>

            {staffTab === "jobs" && (
              <div style={styles.listStack}>
                {jobs.map((job) => (
                  <div key={job.id} style={styles.singleLineRow}>
                    <span style={styles.rowText}>
                      <strong>{job.jobSheetNo || job.id}</strong> |{" "}
                      {job.customerName} | {formatDateTime(job.createdAt)} |{" "}
                      <strong>[{job.status || "पेंडिंग"}]</strong>
                    </span>
                    <div style={styles.rowActions}>
                      <button
                        type="button"
                        onClick={() => startEditJob(job)}
                        style={styles.btnMini}
                      >
                        खोलें / एडिट
                      </button>
                      <button
                        type="button"
                        onClick={() => openPrintJobSheet(job)}
                        style={styles.btnMini}
                      >
                        प्रिंट
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {staffTab === "newJob" && (
              <div style={styles.wizardCard}>
                <div style={styles.wizardHeader}>
                  <strong>
                    {slides[slideIndex]?.title} ({slideIndex + 1}/{slides.length})
                  </strong>
                  <span>{formData.jobSheetNo}</span>
                </div>

                {slides[slideIndex]?.content}

                <div style={styles.wizardFooter}>
                  <button
                    type="button"
                    disabled={slideIndex === 0}
                    onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
                    style={styles.btnSecondary}
                  >
                    ← पिछला
                  </button>

                  {slideIndex < slides.length - 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setSlideIndex((i) =>
                          Math.min(slides.length - 1, i + 1)
                        )
                      }
                      style={styles.btnPrimary}
                    >
                      अगला →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSaveJobSheet}
                      style={styles.btnPrimary}
                    >
                      सेव करें
                    </button>
                  )}
                </div>
              </div>
            )}

            {staffTab === "folder" && (
              <StaffFolderPage
                db={db}
                storage={storage}
                staff={loggedInStaff}
                jobs={jobs}
              />
            )}
          </div>
        )}

        {signatureTargetField && (
          <FullScreenSignaturePad
            title={
              signatureTargetField === "customerSignature"
                ? "ग्राहक हस्ताक्षर"
                : "स्टाफ हस्ताक्षर"
            }
            initialValue={formData[signatureTargetField] || ""}
            onSave={(imgUrl) => {
              setFormData((prev) => ({
                ...prev,
                [signatureTargetField]: imgUrl,
              }));
              setSignatureTargetField(null);
            }}
            onClose={() => setSignatureTargetField(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div style={styles.pageShell}>
      <div style={styles.topBar}>
        <button
          type="button"
          onClick={() => setActiveView("home")}
          style={styles.btnSecondary}
        >
          ← मुख्य पेज
        </button>
        <strong>ऑफिस पोर्टल</strong>
        {officeUnlocked ? (
          <button
            type="button"
            onClick={() => {
              setOfficeUnlocked(false);
              setOfficePinInput("");
            }}
            style={styles.btnDanger}
          >
            लॉक करें
          </button>
        ) : (
          <span style={styles.badge}>Admin</span>
        )}
      </div>

      {!officeUnlocked ? (
        <div style={styles.cardCenter}>
          <h3 style={{ marginTop: 0 }}>ऑफिस पिन</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (officePinInput === OFFICE_PIN) {
                setOfficeUnlocked(true);
              } else {
                alert("गलत पिन।");
              }
            }}
          >
            <input
              type="password"
              value={officePinInput}
              onChange={(e) => setOfficePinInput(e.target.value)}
              placeholder="PIN दर्ज करें"
              style={styles.input}
            />
            <button
              type="submit"
              style={{ ...styles.btnPrimary, width: "100%", marginTop: 10 }}
            >
              अनलॉक करें
            </button>
          </form>
        </div>
      ) : (
        <div style={styles.contentWrap}>
          <div style={styles.subNav}>
            <button
              type="button"
              onClick={() => setOfficeTab("jobs")}
              style={
                officeTab === "jobs" ? styles.btnPrimary : styles.btnSecondary
              }
            >
              सभी जॉब शीट ({jobs.length})
            </button>
            <button
              type="button"
              onClick={() => setOfficeTab("complaints")}
              style={
                officeTab === "complaints"
                  ? styles.btnPrimary
                  : styles.btnSecondary
              }
            >
              शिकायतें ({complaints.length})
            </button>
            <button
              type="button"
              onClick={() => setOfficeTab("attendance")}
              style={
                officeTab === "attendance"
                  ? styles.btnPrimary
                  : styles.btnSecondary
              }
            >
              स्टाफ अटेंडेंस ({attendanceLogs.length})
            </button>
          </div>

          {officeTab === "jobs" && (
            <div style={styles.listStack}>
              {jobs.map((job) => (
                <div key={job.id} style={styles.singleLineRow}>
                  <span style={styles.rowText}>
                    <strong>{job.jobSheetNo || job.id}</strong> |{" "}
                    {job.customerName} | {job.staffName || "-"} |{" "}
                    <strong>[{job.status || "पेंडिंग"}]</strong>
                  </span>
                  <div style={styles.rowActions}>
                    <button
                      type="button"
                      onClick={() => openPrintJobSheet(job)}
                      style={styles.btnMini}
                    >
                      प्रिंट
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm("क्या आप यह जॉब शीट हटाना चाहते हैं?")) {
                          await deleteDoc(doc(db, "jobSheets", job.id));
                        }
                      }}
                      style={styles.btnMiniDanger}
                    >
                      हटाएं
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {officeTab === "complaints" && (
            <div style={styles.listStack}>
              {complaints.map((c) => (
                <div key={c.id} style={styles.singleLineRow}>
                  <span style={styles.rowText}>
                    <strong>{c.customerName || "-"}</strong> |{" "}
                    {c.customerPhone || "-"} | {c.complaint || "-"} |{" "}
                    <strong>[{c.status || "new"}]</strong>
                  </span>
                </div>
              ))}
            </div>
          )}

          {officeTab === "attendance" && (
            <div style={styles.listStack}>
              {attendanceLogs.map((log) => {
                const isCheckedIn = log.status === "checked_in";
                return (
                  <div key={log.id} style={styles.singleLineRow}>
                    <span style={styles.rowText}>
                      <strong>{log.staffName || log.staffPhone}</strong> |{" "}
                      {formatDateOnly(log.checkInAt || log.dateKey)} |{" "}
                      <strong>[{isCheckedIn ? "IN" : "OUT"}]</strong>
                    </span>
                    <div style={styles.rowActions}>
                      {isCheckedIn && (
                        <button
                          type="button"
                          onClick={() => handleAdminForceLogout(log)}
                          style={styles.btnMiniDanger}
                        >
                          मैनुअल लॉगआउट
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 7. STYLES
// ============================================================================
const styles = {
  frontPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    padding: 20,
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  frontContainer: {
    width: "100%",
    maxWidth: 380,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 28,
  },
  logoWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: 10,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    backgroundColor: "#0f172a",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 22,
    letterSpacing: 1,
  },
  logoTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#0f172a",
  },
  frontButtonStack: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  frontPortalBtn: {
    width: "100%",
    padding: "16px 20px",
    fontSize: 17,
    fontWeight: 700,
    color: "#ffffff",
    backgroundColor: "#0f172a",
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
  },
  pageShell: {
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e2e8f0",
  },
  contentWrap: {
    maxWidth: 900,
    margin: "0 auto",
    padding: 16,
  },
  cardCenter: {
    maxWidth: 380,
    margin: "40px auto",
    padding: 20,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
  },
  subNav: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  listStack: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  singleLineRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "10px 12px",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    fontSize: 13,
  },
  rowText: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  rowActions: {
    display: "flex",
    gap: 6,
    flexShrink: 0,
  },
  wizardCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 16,
  },
  wizardHeader: {
    display: "flex",
    justifyContent: "space-between",
    paddingBottom: 10,
    marginBottom: 12,
    borderBottom: "1px solid #e2e8f0",
  },
  wizardFooter: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 12,
    borderTop: "1px solid #e2e8f0",
  },
  slideBody: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "#334155",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    fontSize: 14,
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    fontSize: 14,
    boxSizing: "border-box",
    resize: "vertical",
  },
  partGrid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr",
    gap: 8,
  },
  partRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 10px",
    backgroundColor: "#f1f5f9",
    borderRadius: 6,
    marginBottom: 6,
    fontSize: 13,
  },
  signPreviewCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    backgroundColor: "#f8fafc",
  },
  thumbSign: {
    height: 48,
    backgroundColor: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: 4,
  },
  muted: {
    fontSize: 12,
    color: "#64748b",
  },
  badge: {
    fontSize: 12,
    padding: "4px 10px",
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
    color: "#0f172a",
    fontWeight: 600,
  },
  btnPrimary: {
    padding: "9px 14px",
    backgroundColor: "#0f172a",
    color: "#ffffff",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
  },
  btnSecondary: {
    padding: "9px 14px",
    backgroundColor: "#e2e8f0",
    color: "#0f172a",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
  },
  btnDanger: {
    padding: "9px 14px",
    backgroundColor: "#dc2626",
    color: "#ffffff",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
  },
  btnMini: {
    padding: "5px 10px",
    backgroundColor: "#e2e8f0",
    color: "#0f172a",
    border: "none",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnMiniDanger: {
    padding: "5px 10px",
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    border: "none",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  signOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "#0f172a",
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
  },
  signHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 16px",
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #cbd5e1",
  },
  signCanvasWrap: {
    flex: 1,
    padding: 12,
    display: "flex",
  },
  signCanvas: {
    width: "100%",
    height: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    touchAction: "none",
  },
};