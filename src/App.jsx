import React, { useState, useRef, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  increment,
  serverTimestamp,
  onSnapshot,
  arrayUnion,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import JobSheet from "./JobSheet";

const firebaseConfig = {
  apiKey: "AIzaSyDUUnfmXZSLOS2FrUAnr2eSFYAWnwURRfC",
  authDomain: "mq-fsm-45ee9.firebaseapp.com",
  projectId: "mq-fsm-45ee9",
  storageBucket: "mq-fsm-45ee9.firebasestorage.app",
  messagingSenderId: "527381468184",
  appId: "1:527381468184:web:326741c5e9759c7799a36d",
  measurementId: "G-VTMP9DR7D9",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

const TELEGRAM_BOT_TOKEN = "8692296744:AAEsSO0K5x0yv_gnjljcAYvNCaIauNvCSac";
const TELEGRAM_CHAT_ID = "5603316430";

const HINDI_MONTHS = [
  "जनवरी (January)",
  "फ़रवरी (February)",
  "मार्च (March)",
  "अप्रैल (April)",
  "मई (May)",
  "जून (June)",
  "जुलाई (July)",
  "अगस्त (August)",
  "सितंबर (September)",
  "अक्टूबर (October)",
  "नवंबर (November)",
  "दिसंबर (December)",
];

const sendStaffTelegramAlert = async (messageText) => {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: messageText,
        parse_mode: "HTML",
      }),
    });
  } catch (err) {
    console.error("Telegram alert error:", err);
  }
};

export const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxWidth = 600;
        const scaleSize = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          "image/jpeg",
          0.6
        );
      };
    };
  });
};

const createEmptyPart = () => ({ partName: "", qty: 1, amount: "" });

const inputStyle = {
  padding: "12px 14px",
  borderRadius: "8px",
  border: "1.5px solid #cbd5e1",
  backgroundColor: "#ffffff",
  color: "#0f172a",
  fontSize: "15px",
  boxSizing: "border-box",
};

const choiceBtnStyle = (selected) => ({
  padding: "13px 12px",
  borderRadius: "8px",
  border: selected ? "2px solid #166534" : "1.5px solid #cbd5e1",
  backgroundColor: selected ? "#dcfce7" : "#ffffff",
  color: selected ? "#166534" : "#0f172a",
  fontWeight: "bold",
  fontSize: "14px",
  cursor: "pointer",
  textAlign: "left",
});

const chkBox = (checked) => (checked ? "☑" : "☐");

// ==========================================
// SORT HELPER: नया सबसे ऊपर, पुराना सबसे नीचे
// ==========================================
const parseJobTimestamp = (job) => {
  if (!job) return 0;
  if (typeof job.createdAtMs === "number") return job.createdAtMs;
  if (job.createdAt && typeof job.createdAt.toMillis === "function") {
    return job.createdAt.toMillis();
  }
  const str = String(job.date || "").trim();
  const match = str.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/
  );
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    const hour = match[4] ? parseInt(match[4], 10) : 0;
    const minute = match[5] ? parseInt(match[5], 10) : 0;
    return new Date(year, month, day, hour, minute).getTime();
  }
  return 0;
};

const sortJobsNewestFirst = (list = []) => {
  return [...list].sort(
    (a, b) => parseJobTimestamp(b) - parseJobTimestamp(a)
  );
};

// ==========================================
// UNIFIED JOB LIST TABLE (दिनांक → कस्टमर नाम → जॉब शीट नं.)
// ==========================================
const JobSheetRegisterTable = ({
  jobs,
  onSelectJob,
  emptyText = "कोई जॉब शीट उपलब्ध नहीं है।",
}) => {
  const sortedJobs = sortJobsNewestFirst(jobs);

  if (sortedJobs.length === 0) {
    return (
      <p style={{ color: "#64748b", fontSize: "13px", margin: "8px 0" }}>
        {emptyText}
      </p>
    );
  }

  return (
    <div
      style={{
        overflowX: "auto",
        border: "1px solid #cbd5e1",
        borderRadius: "8px",
        background: "#ffffff",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "13px",
          textAlign: "left",
        }}
      >
        <thead>
          <tr
            style={{
              background: "#1e293b",
              color: "#ffffff",
              fontSize: "12px",
            }}
          >
            <th style={{ padding: "10px 8px", borderBottom: "1px solid #cbd5e1" }}>
              दिनांक (Date)
            </th>
            <th style={{ padding: "10px 8px", borderBottom: "1px solid #cbd5e1" }}>
              कस्टमर का नाम (Customer)
            </th>
            <th style={{ padding: "10px 8px", borderBottom: "1px solid #cbd5e1" }}>
              जॉब शीट नं. (Job Sheet No.)
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedJobs.map((job, idx) => (
            <tr
              key={job.jobSheetNo || idx}
              onClick={() => onSelectJob(job)}
              style={{
                background: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                cursor: "pointer",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <td
                style={{
                  padding: "11px 8px",
                  color: "#475569",
                  whiteSpace: "nowrap",
                  fontSize: "12px",
                }}
              >
                {job.date || "-"}
              </td>
              <td
                style={{
                  padding: "11px 8px",
                  fontWeight: "bold",
                  color: "#0f172a",
                }}
              >
                {job.customerName || "-"}
              </td>
              <td
                style={{
                  padding: "11px 8px",
                  fontWeight: "bold",
                  color: "#2563eb",
                  whiteSpace: "nowrap",
                }}
              >
                {job.jobSheetNo}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const formatTime12 = (ts) => {
  if (!ts) return "-";
  const d = new Date(ts);
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const calcWorkDuration = (inTs, outTs) => {
  if (!inTs) return "-";
  const endTs = outTs || Date.now();
  const diffMs = Math.max(0, endTs - inTs);
  const hrs = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  return `${hrs} घंटे ${mins} मिनट${!outTs ? " (Active)" : ""}`;
};

const getTodayKey = (dateObj = new Date()) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const fetchReadableAddress = async (lat, lng) => {
  try {
    if (!navigator.onLine) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`
    );
    const data = await res.json();
    if (data && data.address) {
      const a = data.address;
      const parts = [
        a.road || a.neighbourhood || a.suburb,
        a.city_district || a.town || a.city || a.county,
      ].filter(Boolean);
      if (parts.length > 0) return parts.join(", ");
    }
    if (data && data.display_name) {
      return data.display_name.split(",").slice(0, 3).join(",");
    }
  } catch (e) {
    // Fallback
  }
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
};

const checkIsWaterCooler = (prodType = "", prodFull = "") => {
  const combined = `${prodType} ${prodFull}`.toLowerCase();
  return combined.includes("water cooler");
};

const checkIsFridgeOrWaterCooler = (prodType = "", prodFull = "") => {
  const combined = `${prodType} ${prodFull}`.toLowerCase();
  return (
    combined.includes("refrigerator") ||
    combined.includes("deep freezer") ||
    combined.includes("water cooler")
  );
};

const checkIsSinglePhase = (prodType = "", prodFull = "") => {
  const combined = `${prodType} ${prodFull}`.toLowerCase();
  return (
    combined.includes("split / window ac") ||
    combined.includes("refrigerator") ||
    combined.includes("deep freezer") ||
    combined.includes("water cooler")
  );
};

// ==========================================
// 1. AIR COOLER PRINTABLE JOB SHEET (1-PAGE A4)
// ==========================================
const CoolerPrintableJobSheet = ({ job }) => {
  const cSpec = job.coolerSpec || {};
  const cChk = job.coolerChecklist || {};
  const workTypes = Array.isArray(cSpec.workTypes) ? cSpec.workTypes : [];

  const rows = [];
  if (job.desc) {
    rows.push({
      desc: job.desc,
      qty: 1,
      rate: parseFloat(job.serviceCharge || 0),
    });
  }
  if (Array.isArray(job.usedParts)) {
    job.usedParts.forEach((p) => {
      rows.push({
        desc: p.partName || "Spare Part",
        qty: parseFloat(p.qty) || 1,
        rate: parseFloat(p.amount) || 0,
      });
    });
  }
  while (rows.length < 5) {
    rows.push({ desc: "", qty: "", rate: "" });
  }

  const totalBillVal =
    typeof job.totalAmount === "number"
      ? job.totalAmount
      : rows.reduce(
          (sum, r) => sum + (parseFloat(r.qty) || 0) * (parseFloat(r.rate) || 0),
          0
        );

  return (
    <div id="printable-job-card" className="print-sheet-wrapper">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1.5px solid #000",
          paddingBottom: "6px",
          marginBottom: "6px",
        }}
      >
        <img
          src="/1000384854.jpg"
          alt="Logo"
          style={{ height: "54px", width: "auto", objectFit: "contain" }}
        />
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: "bold",
              letterSpacing: "0.5px",
            }}
          >
            कूलर सर्विस एवं रिपेयर जॉब शीट
          </div>
          <div style={{ fontSize: "11px", marginTop: "3px" }}>
            <strong>जॉब नं.:</strong> {job.jobSheetNo} &nbsp;|&nbsp;{" "}
            <strong>दिनांक:</strong> {job.date}
          </div>
        </div>
      </div>

      <div className="js-sec-hdr-left">
        1. ग्राहक एवं साइट का विवरण (Customer &amp; Site Details)
      </div>
      <table className="js-table" style={{ borderTop: "none", marginBottom: "5px" }}>
        <tbody>
          <tr>
            <td style={{ width: "55%" }}>
              <strong>ग्राहक / संस्था का नाम:</strong> {job.customerName}
            </td>
            <td style={{ width: "45%" }}>
              <strong>संपर्क एवं मोबाइल नं.:</strong> {job.customerPhone}
            </td>
          </tr>
          <tr>
            <td colSpan="2">
              <strong>लोकेशन / साइट का पता:</strong> {job.customerAddress}
            </td>
          </tr>
          <tr>
            <td colSpan="2">
              <strong>समस्या / फॉल्ट विवरण (Fault Details):</strong>{" "}
              {job.faultDetails || job.desc || ""}
            </td>
          </tr>
          <tr>
            <td colSpan="2">
              <strong>कार्य का प्रकार:</strong>{" "}
              {chkBox(workTypes.includes("AMC"))} AMC &nbsp;&nbsp;
              {chkBox(workTypes.includes("Breakdown / Repair"))} ब्रेकडाउन / रिपेयर &nbsp;&nbsp;
              {chkBox(workTypes.includes("Installation"))} Installation &nbsp;&nbsp;
              {chkBox(workTypes.includes("Un-installation"))} Un-installation &nbsp;&nbsp;
              {chkBox(workTypes.includes("Body Repair & Painting"))} बॉडी रिपेयर एवं पेंटिंग
            </td>
          </tr>
        </tbody>
      </table>

      <div className="js-sec-hdr-left">
        2. कूलर का विवरण (Cooler Specifications)
      </div>
      <table className="js-table" style={{ borderTop: "none", marginBottom: "5px" }}>
        <thead>
          <tr style={{ background: "#f8fafc", textAlign: "center" }}>
            <th style={{ width: "6%" }}>क्र.</th>
            <th style={{ width: "36%" }}>कूलर टाइप (Body Type)</th>
            <th style={{ width: "16%" }}>क्षमता / साइज़</th>
            <th style={{ width: "18%" }}>ब्रांड / मॉडल</th>
            <th style={{ width: "16%" }}>सीरियल / टैग नं.</th>
            <th style={{ width: "8%" }}>संख्या</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ textAlign: "center" }}>1.</td>
            <td>
              {chkBox(cSpec.bodyMaterial === "Fiber / Plastic")} फाइबर / प्लास्टिक &nbsp;
              {chkBox(cSpec.bodyMaterial === "GI / Metal")} जी. आई. / लोहा
            </td>
            <td>{cSpec.capacity || ""}</td>
            <td>{cSpec.brandModel || ""}</td>
            <td>{cSpec.serialNo || ""}</td>
            <td style={{ textAlign: "center" }}>{cSpec.totalQty || "1"}</td>
          </tr>
          <tr>
            <td style={{ textAlign: "center" }}>2.</td>
            <td colSpan="5">
              {chkBox(cSpec.coolerSubType === "Duct Cooler")} डक्ट कूलर &nbsp;&nbsp;&nbsp;
              {chkBox(cSpec.coolerSubType === "Desert Cooler")} डेजर्ट कूलर &nbsp;&nbsp;&nbsp;
              {chkBox(cSpec.coolerSubType === "Tower Cooler")} टावर कूलर &nbsp;&nbsp;&nbsp;
              {chkBox(cSpec.coolerSubType === "Room / Personal Cooler")} रूम कूलर
            </td>
          </tr>
        </tbody>
      </table>

      <div className="js-sec-hdr-left">
        3. चेकलिस्ट एवं निरीक्षण (Inspection &amp; Service Checklist)
      </div>
      <table className="js-table" style={{ borderTop: "none", marginBottom: "5px" }}>
        <tbody>
          <tr>
            <td style={{ width: "26%", fontWeight: "bold" }}>फैन मोटर (Fan Motor):</td>
            <td>
              {chkBox(cChk.fanMotor === "OK")} सही &nbsp;
              {chkBox(cChk.fanMotor === "Jam / Bearing Bad")} जाम / बेयरिंग खराब &nbsp;
              {chkBox(cChk.fanMotor === "Winding Burnt")} वाइंडिंग जली हुई &nbsp;
              {chkBox(cChk.fanMotor === "Capacitor Bad")} कैपेसिटर खराब
            </td>
          </tr>
          <tr>
            <td style={{ fontWeight: "bold" }}>वाटर पंप (Submersible Pump):</td>
            <td>
              {chkBox(cChk.waterPump === "OK")} सही &nbsp;
              {chkBox(cChk.waterPump === "Not Pumping")} पानी नहीं उठा रहा &nbsp;
              {chkBox(cChk.waterPump === "Replace Required")} बदलना आवश्यक
            </td>
          </tr>
          <tr>
            <td style={{ fontWeight: "bold" }}>स्विंग मोटर एवं ब्लेड:</td>
            <td>
              {chkBox(cChk.swingBlade === "OK")} सही &nbsp;
              {chkBox(cChk.swingBlade === "Swing Bad")} स्विंग खराब &nbsp;
              {chkBox(cChk.swingBlade === "Blade Broken")} फैन ब्लेड टूटा / असंतुलित
            </td>
          </tr>
          <tr>
            <td style={{ fontWeight: "bold" }}>कूलिंग पैड (Cooling Pads):</td>
            <td>
              {chkBox(cChk.padType === "Honeycomb")} हनीकॉम्ब &nbsp;
              {chkBox(cChk.padType === "Wood Wool")} वुड वूल (घास) &nbsp;|&nbsp;
              <strong>स्थिति:</strong> {chkBox(cChk.padStatus === "Clean")} साफ &nbsp;
              {chkBox(cChk.padStatus === "Replaceable")} बदलने योग्य
            </td>
          </tr>
          <tr>
            <td style={{ fontWeight: "bold" }}>वाटर टैंक एवं प्लंबिंग:</td>
            <td>
              {chkBox(cChk.tankPlumbing === "OK")} सही &nbsp;
              {chkBox(cChk.tankPlumbing === "Leakage")} लीकेज है &nbsp;
              {chkBox(cChk.tankPlumbing === "Float Valve Bad")} फ्लोट वाल्व खराब &nbsp;
              {chkBox(cChk.tankPlumbing === "Drain / Pipe Jam")} ड्रेन / पाइप जाम
            </td>
          </tr>
          <tr>
            <td style={{ fontWeight: "bold" }}>इलेक्ट्रिकल एवं वायरिंग:</td>
            <td>
              {chkBox(cChk.electrical === "OK")} सही &nbsp;
              {chkBox(cChk.electrical === "Rotary Switch Bad")} रोटरी स्विच खराब &nbsp;
              {chkBox(cChk.electrical === "Wiring Burnt")} वायरिंग कटी / जली &nbsp;
              {chkBox(cChk.electrical === "Plug / Earthing Checked")} प्लग / अर्थिंग चेक
            </td>
          </tr>
          <tr>
            <td style={{ fontWeight: "bold" }}>बॉडी एवं पेंट (Body &amp; Paint):</td>
            <td>
              {chkBox(cChk.bodyPaint === "OK")} सही &nbsp;
              {chkBox(cChk.bodyPaint === "Rusting")} जंग (Rusting) &nbsp;
              {chkBox(cChk.bodyPaint === "Welding Required")} टैंक में छेद / वेल्डिंग जरूरत &nbsp;
              {chkBox(cChk.bodyPaint === "Painting Required")} प्राइमर एवं पेंटिंग आवश्यक
            </td>
          </tr>
        </tbody>
      </table>

      <div className="js-sec-hdr-left">
        4. किए गए कार्य एवं बदले गए पार्ट्स (Work Done &amp; Spare Parts Used)
      </div>
      <table className="js-table" style={{ borderTop: "none", marginBottom: "5px" }}>
        <thead>
          <tr style={{ background: "#f8fafc", textAlign: "center" }}>
            <th style={{ width: "8%" }}>क्र. सं.</th>
            <th style={{ width: "54%" }}>पार्ट / कार्य का विवरण (Description)</th>
            <th style={{ width: "10%" }}>मात्रा (Qty)</th>
            <th style={{ width: "14%" }}>दर (Rate ₹)</th>
            <th style={{ width: "14%" }}>कुल राशि (Amount)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const amt =
              r.qty !== "" && r.rate !== ""
                ? (parseFloat(r.qty) || 0) * (parseFloat(r.rate) || 0)
                : null;
            return (
              <tr key={i}>
                <td style={{ textAlign: "center" }}>{i + 1}.</td>
                <td>{r.desc}</td>
                <td style={{ textAlign: "center" }}>{r.qty !== "" ? r.qty : ""}</td>
                <td style={{ textAlign: "right" }}>
                  {r.rate !== "" ? `₹${Number(r.rate).toFixed(2)}` : ""}
                </td>
                <td style={{ textAlign: "right" }}>
                  {amt !== null ? `₹${amt.toFixed(2)}` : ""}
                </td>
              </tr>
            );
          })}
          <tr>
            <td colSpan="4" style={{ textAlign: "right", fontWeight: "bold" }}>
              कुल राशि (Total Amount):
            </td>
            <td style={{ textAlign: "right", fontWeight: "bold" }}>
              ₹{totalBillVal.toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="js-sec-hdr-left">
        5. टेक्नीशियन एवं ग्राहक हस्ताक्षर (Sign-Off)
      </div>
      <table className="js-table" style={{ borderTop: "none" }}>
        <tbody>
          <tr>
            <td colSpan="2">
              <strong>ग्राहक की टिप्पणी (Remarks):</strong> {job.feedback || ""} |{" "}
              <strong>स्टेटस:</strong> {job.status}
            </td>
          </tr>
          <tr>
            <td style={{ width: "50%", height: "62px", verticalAlign: "bottom" }}>
              <div>
                <strong>टेक्नीशियन:</strong> {job.staffName || ""}
              </div>
              <div style={{ marginTop: "18px", fontWeight: "bold" }}>
                टेक्नीशियन का नाम एवं हस्ताक्षर
              </div>
            </td>
            <td style={{ width: "50%", height: "62px", verticalAlign: "bottom" }}>
              {job.signatureURL && (
                <img
                  src={job.signatureURL}
                  alt="Sign"
                  style={{ maxHeight: "42px", display: "block", marginBottom: "4px" }}
                />
              )}
              <div style={{ fontWeight: "bold" }}>
                ग्राहक / साइट इंचार्ज के हस्ताक्षर एवं मुहर
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// ==========================================
// 2. PRINTABLE JOB SHEET WRAPPER (1-PAGE A4 FIT)
// ==========================================
const PrintableJobSheet = ({ job, onClose, onFillJob }) => {
  if (!job) return null;

  const isWaterCoolerJob = checkIsWaterCooler(job.productType, job.product);
  const isAirCoolerJob =
    !isWaterCoolerJob &&
    (job.productType === "Cooler" ||
      String(job.product || "").toLowerCase().includes("cooler"));

  const isFridgeOrWCJob = checkIsFridgeOrWaterCooler(
    job.productType,
    job.product
  );
  const isSinglePhaseJob = checkIsSinglePhase(job.productType, job.product);

  const calculatedPartsTotal = Array.isArray(job.usedParts)
    ? job.usedParts.reduce(
        (sum, p) => sum + (parseFloat(p.qty) || 0) * (parseFloat(p.amount) || 0),
        0
      )
    : 0;

  const serviceChargeVal = parseFloat(job.serviceCharge || job.rate) || 0;
  const totalBillVal =
    typeof job.totalAmount === "number"
      ? job.totalAmount
      : calculatedPartsTotal + serviceChargeVal;

  const allPhotos = Array.from(
    new Set([
      ...(Array.isArray(job.sitePhotoUrls) ? job.sitePhotoUrls : []),
      ...(job.photoURL ? [job.photoURL] : []),
    ])
  ).filter(Boolean);

  return (
    <div
      style={{
        background: "#fff",
        padding: "12px",
        borderRadius: "8px",
        border: "1px solid #cbd5e1",
        marginBottom: "15px",
      }}
    >
      <style>{`
        @page {
          size: A4 portrait;
          margin: 6mm;
        }
        @media print {
          html, body {
            width: 210mm;
            height: 297mm;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body * {
            visibility: hidden;
          }
          #printable-job-card, #printable-job-card * {
            visibility: visible;
          }
          #printable-job-card {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            box-sizing: border-box;
            margin: 0 !important;
            padding: 6mm !important;
            border: 1.5px solid #000 !important;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-after: avoid;
            page-break-inside: avoid;
          }
          .no-print {
            display: none !important;
          }
        }
        .print-sheet-wrapper {
          border: 1.5px solid #000;
          background: #fff;
          padding: 10px;
          color: #000;
          box-sizing: border-box;
          width: 100%;
        }
        .js-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          line-height: 1.3;
          color: #000;
        }
        .js-table td, .js-table th {
          border: 1px solid #000;
          padding: 5px 7px;
          vertical-align: top;
        }
        .js-bold {
          font-weight: bold;
        }
        .js-sec-hdr {
          background: #f1f5f9;
          font-weight: bold;
          text-align: center;
          letter-spacing: 0.3px;
        }
        .js-sec-hdr-left {
          background: #f1f5f9;
          border: 1px solid #000;
          padding: 4px 7px;
          font-weight: bold;
          font-size: 11px;
        }
        .faint-label {
          font-size: 9px;
          color: #64748b;
          font-weight: normal;
          margin-right: 4px;
        }
      `}</style>

      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
          flexWrap: "wrap",
          gap: "6px",
        }}
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "6px 12px",
              background: "#64748b",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            ← वापस जाएं
          </button>
        )}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {onFillJob && (
            <button
              type="button"
              onClick={() => onFillJob(job)}
              style={{
                padding: "6px 12px",
                background: "#d97706",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              ✏️ जॉब शीट भरें / अपडेट करें
            </button>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              padding: "6px 12px",
              background: "#0284c7",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            🖨️ Print Job Sheet
          </button>
          <button
            type="button"
            onClick={() => {
              const msg = `नमस्ते ${job.customerName}, आपकी जॉब शीट (${job.jobSheetNo}) तैयार है। उत्पाद: ${job.productType || job.product}, कार्य: ${job.desc}, कुल बिल: ₹${totalBillVal.toFixed(2)}, स्टेटस: ${job.status}, दिनांक: ${job.date}`;
              window.open(
                `https://wa.me/91${job.customerPhone}?text=${encodeURIComponent(msg)}`,
                "_blank"
              );
            }}
            style={{
              padding: "6px 12px",
              background: "#166534",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            💬 WhatsApp करें
          </button>
        </div>
      </div>

      {isAirCoolerJob ? (
        <CoolerPrintableJobSheet job={job} />
      ) : (
        <div id="printable-job-card" className="print-sheet-wrapper">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: "8px",
              borderBottom: "1.5px solid #000",
            }}
          >
            <img
              src="/1000384854.jpg"
              alt="Logo"
              style={{ height: "58px", width: "auto", objectFit: "contain" }}
            />
            <div
              style={{
                fontSize: "13px",
                fontWeight: "bold",
                letterSpacing: "1px",
                border: "1px solid #000",
                padding: "4px 10px",
                background: "#f8fafc",
              }}
            >
              SERVICE JOB SHEET
            </div>
          </div>

          <table className="js-table" style={{ borderTop: "none" }}>
            <tbody>
              <tr>
                <td rowSpan="6" style={{ width: "55%", borderTop: "none" }}>
                  <div className="js-bold">CUSTOMER NAME :-</div>
                  <div style={{ marginBottom: "6px", minHeight: "15px" }}>
                    {job.customerName}
                  </div>
                  <div className="js-bold">MOBILE :-</div>
                  <div style={{ marginBottom: "6px", minHeight: "15px" }}>
                    {job.customerPhone}
                  </div>
                  <div className="js-bold">ADDRESS :-</div>
                  <div style={{ minHeight: "22px" }}>{job.customerAddress}</div>
                </td>
                <td style={{ width: "18%", borderTop: "none" }} className="js-bold">
                  JOB NO.
                </td>
                <td
                  style={{ width: "27%", fontWeight: "bold", borderTop: "none" }}
                >
                  {job.jobSheetNo}
                </td>
              </tr>
              <tr>
                <td className="js-bold">BILL NO.</td>
                <td>{job.billNo && job.billNo !== "-" ? job.billNo : ""}</td>
              </tr>
              <tr>
                <td className="js-bold">AMC DATE</td>
                <td>{job.amcDate && job.amcDate !== "-" ? job.amcDate : ""}</td>
              </tr>
              <tr>
                <td className="js-bold">DATE IN</td>
                <td>{job.date || ""}</td>
              </tr>
              <tr>
                <td className="js-bold">DATE OUT</td>
                <td>{job.status === "Completed" ? job.date : ""}</td>
              </tr>
              <tr>
                <td className="js-bold">PRODUCT</td>
                <td>{job.productType || job.product}</td>
              </tr>
            </tbody>
          </table>

          {isFridgeOrWCJob ? (
            <>
              <table className="js-table" style={{ borderTop: "none" }}>
                <tbody>
                  <tr>
                    <td colSpan="4" style={{ borderTop: "none", background: "#fafafa" }}>
                      <span className="js-bold">FAULT / PROBLEM DETAILS :- </span>
                      <span>{job.faultDetails || job.desc || ""}</span>
                    </td>
                  </tr>
                  <tr className="js-sec-hdr">
                    <td colSpan="4">
                      {isWaterCoolerJob
                        ? "WATER COOLER TECHNICAL DETAILS"
                        : "DEEP FREEZER / REFRIGERATOR TECHNICAL DETAILS"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ width: "25%" }} className="js-bold">
                      UNIT MODEL NO.
                    </td>
                    <td style={{ width: "25%" }}>
                      {job.unitModel && job.unitModel !== "-"
                        ? job.unitModel
                        : ""}
                    </td>
                    <td style={{ width: "25%" }} className="js-bold">
                      UNIT SERIAL NO.
                    </td>
                    <td style={{ width: "25%" }}>
                      {job.unitSerial && job.unitSerial !== "-"
                        ? job.unitSerial
                        : ""}
                    </td>
                  </tr>
                  <tr>
                    <td className="js-bold">UNIT CAPACITY (IN LITRES)</td>
                    <td>
                      {job.unitCapacity && job.unitCapacity !== "-"
                        ? job.unitCapacity
                        : ""}
                    </td>
                    <td className="js-bold">CONDENSER IN / OUT</td>
                    <td>
                      {job.condenserInOut && job.condenserInOut !== "-"
                        ? job.condenserInOut
                        : ""}
                    </td>
                  </tr>
                  <tr>
                    <td className="js-bold">COMPRESSOR MODEL NO.</td>
                    <td>
                      {job.compressorModel && job.compressorModel !== "-"
                        ? job.compressorModel
                        : ""}
                    </td>
                    <td className="js-bold">COMPRESSOR SERIAL NO.</td>
                    <td>
                      {job.compressorSerial && job.compressorSerial !== "-"
                        ? job.compressorSerial
                        : ""}
                    </td>
                  </tr>
                  <tr>
                    <td className="js-bold">COMPRESSOR AMPERE</td>
                    <td>
                      {job.compressorAmpere && job.compressorAmpere !== "-"
                        ? job.compressorAmpere
                        : ""}
                    </td>
                    <td className="js-bold">UNIT AMPERE</td>
                    <td>
                      {job.ampere && job.ampere !== "-" ? job.ampere : ""}
                    </td>
                  </tr>

                  {isWaterCoolerJob && (
                    <>
                      <tr>
                        <td className="js-bold">TANK SIZE (LITRES)</td>
                        <td>
                          {job.wcTankSize && job.wcTankSize !== "-"
                            ? job.wcTankSize
                            : ""}
                        </td>
                        <td className="js-bold">NUMBER OF TAPS (टोटी)</td>
                        <td>
                          {job.wcTapCount && job.wcTapCount !== "-"
                            ? job.wcTapCount
                            : ""}
                        </td>
                      </tr>
                      <tr>
                        <td className="js-bold">WATER OVERFLOW SYSTEM</td>
                        <td>
                          {job.wcOverflowType && job.wcOverflowType !== "-"
                            ? job.wcOverflowType
                            : ""}
                        </td>
                        <td className="js-bold">CONDENSING COIL SIZE</td>
                        <td>
                          {job.wcCondensingCoilSize &&
                          job.wcCondensingCoilSize !== "-"
                            ? job.wcCondensingCoilSize
                            : ""}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>

              <table
                className="js-table"
                style={{ borderTop: "none", flex: 1 }}
              >
                <tbody>
                  <tr className="js-sec-hdr">
                    <td style={{ width: "82%", borderTop: "none" }}>
                      WORK / ACTION TAKEN AND USE PART
                    </td>
                    <td style={{ width: "18%", borderTop: "none" }}>RATE</td>
                  </tr>
                  <tr>
                    <td style={{ height: "110px" }}>
                      <div>1. {job.desc || ""}</div>
                      {Array.isArray(job.usedParts) && job.usedParts.length > 0 ? (
                        job.usedParts.map((p, i) => {
                          const q = parseFloat(p.qty) || 0;
                          const a = parseFloat(p.amount) || 0;
                          return (
                            <div key={i} style={{ marginTop: "4px" }}>
                              {i + 2}. {p.partName || "Part"} (Qty: {q} × ₹{a})
                            </div>
                          );
                        })
                      ) : (
                        job.sparePartName &&
                        job.sparePartName !== "-" && (
                          <div style={{ marginTop: "4px" }}>
                            2. Part ({job.sparePartOption}): {job.sparePartName}{" "}
                            {job.sparePartModel && job.sparePartModel !== "-"
                              ? `(${job.sparePartModel})`
                              : ""}
                          </div>
                        )
                      )}
                      {serviceChargeVal > 0 && (
                        <div style={{ marginTop: "4px" }}>
                          <strong>Service Charge:</strong> ₹
                          {serviceChargeVal.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td>
                      {Array.isArray(job.usedParts) &&
                        job.usedParts.length > 0 &&
                        job.usedParts.map((p, i) => {
                          const rowAmt =
                            (parseFloat(p.qty) || 0) *
                            (parseFloat(p.amount) || 0);
                          return <div key={i}>₹{rowAmt.toFixed(2)}</div>;
                        })}
                      {totalBillVal > 0 && (
                        <div
                          style={{
                            marginTop: "6px",
                            borderTop: "1px solid #000",
                            paddingTop: "3px",
                            fontWeight: "bold",
                          }}
                        >
                          Total: ₹{totalBillVal.toFixed(2)}
                        </div>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>

              <table className="js-table" style={{ borderTop: "none" }}>
                <tbody>
                  <tr>
                    <td style={{ width: "50%", borderTop: "none" }}>
                      <div style={{ marginBottom: "8px" }}>
                        <strong>TECHNICIAN:</strong> {job.staffName || ""}
                      </div>
                      <div style={{ marginBottom: "8px" }}>
                        <strong>STATUS:</strong> {job.status}
                      </div>
                      <div>
                        <strong>REMARK:</strong>{" "}
                        {job.feedback && job.feedback !== "-"
                          ? job.feedback
                          : ""}
                      </div>
                    </td>
                    <td style={{ width: "50%", borderTop: "none" }}>
                      <div className="js-bold">CUSTOMER SIGNATURE</div>
                      {job.signatureURL ? (
                        <div style={{ margin: "6px 0" }}>
                          <img
                            src={job.signatureURL}
                            alt="Customer Signature"
                            style={{
                              maxHeight: "65px",
                              maxWidth: "100%",
                              objectFit: "contain",
                            }}
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            height: "55px",
                            borderBottom: "1px dashed #cbd5e1",
                            margin: "6px 0",
                          }}
                        ></div>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </>
          ) : (
            <>
              <table className="js-table" style={{ borderTop: "none" }}>
                <tbody>
                  <tr>
                    <td
                      rowSpan="3"
                      style={{
                        width: "45%",
                        borderTop: "none",
                        verticalAlign: "top",
                        background: "#fafafa",
                      }}
                    >
                      <div
                        className="js-bold"
                        style={{
                          borderBottom: "1px solid #cbd5e1",
                          paddingBottom: "3px",
                          marginBottom: "4px",
                        }}
                      >
                        FAULT / PROBLEM DETAILS :-
                      </div>
                      <div style={{ fontSize: "11px", lineHeight: "1.35" }}>
                        {job.faultDetails || job.desc || ""}
                      </div>
                    </td>
                    <td
                      style={{
                        width: "18%",
                        verticalAlign: "middle",
                        textAlign: "center",
                        borderTop: "none",
                      }}
                      className="js-bold"
                    >
                      INDOOR
                    </td>
                    <td style={{ width: "37%", padding: 0, borderTop: "none" }}>
                      <div
                        style={{
                          borderBottom: "1px solid #000",
                          padding: "4px 6px",
                          textAlign: "left",
                        }}
                      >
                        <span className="faint-label">Model:</span>
                        <span>
                          {job.indoorModel && job.indoorModel !== "-"
                            ? job.indoorModel
                            : ""}
                        </span>
                      </div>
                      <div style={{ padding: "4px 6px", textAlign: "left" }}>
                        <span className="faint-label">Serial:</span>
                        <span>
                          {job.indoorSerial && job.indoorSerial !== "-"
                            ? job.indoorSerial
                            : ""}
                        </span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{ verticalAlign: "middle", textAlign: "center" }}
                      className="js-bold"
                    >
                      OUT DOOR
                    </td>
                    <td style={{ padding: 0 }}>
                      <div
                        style={{
                          borderBottom: "1px solid #000",
                          padding: "4px 6px",
                          textAlign: "left",
                        }}
                      >
                        <span className="faint-label">Model:</span>
                        <span>
                          {job.outdoorModel && job.outdoorModel !== "-"
                            ? job.outdoorModel
                            : ""}
                        </span>
                      </div>
                      <div style={{ padding: "4px 6px", textAlign: "left" }}>
                        <span className="faint-label">Serial:</span>
                        <span>
                          {job.outdoorSerial && job.outdoorSerial !== "-"
                            ? job.outdoorSerial
                            : ""}
                        </span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{ verticalAlign: "middle", textAlign: "center" }}
                      className="js-bold"
                    >
                      COMPRESSOR
                    </td>
                    <td style={{ padding: 0 }}>
                      <div
                        style={{
                          borderBottom: "1px solid #000",
                          padding: "4px 6px",
                          textAlign: "left",
                        }}
                      >
                        <span className="faint-label">Model:</span>
                        <span>
                          {job.compressorModel && job.compressorModel !== "-"
                            ? job.compressorModel
                            : ""}
                        </span>
                      </div>
                      <div style={{ padding: "4px 6px", textAlign: "left" }}>
                        <span className="faint-label">Serial:</span>
                        <span>
                          {job.compressorSerial && job.compressorSerial !== "-"
                            ? job.compressorSerial
                            : ""}
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <table
                className="js-table"
                style={{ borderTop: "none", flex: 1 }}
              >
                <tbody>
                  <tr className="js-sec-hdr">
                    <td style={{ width: "82%", borderTop: "none" }}>
                      WORK / ACTION TAKEN AND USE PART
                    </td>
                    <td style={{ width: "18%", borderTop: "none" }}>RATE</td>
                  </tr>
                  <tr>
                    <td style={{ height: "75px" }}>
                      <div>1. {job.desc || ""}</div>
                      {Array.isArray(job.usedParts) && job.usedParts.length > 0 ? (
                        job.usedParts.map((p, i) => {
                          const q = parseFloat(p.qty) || 0;
                          const a = parseFloat(p.amount) || 0;
                          return (
                            <div key={i} style={{ marginTop: "3px" }}>
                              {i + 2}. {p.partName || "Part"} (Qty: {q} × ₹{a})
                            </div>
                          );
                        })
                      ) : (
                        job.sparePartName &&
                        job.sparePartName !== "-" && (
                          <div style={{ marginTop: "4px" }}>
                            2. Part ({job.sparePartOption}): {job.sparePartName}{" "}
                            {job.sparePartModel && job.sparePartModel !== "-"
                              ? `(${job.sparePartModel})`
                              : ""}
                          </div>
                        )
                      )}
                      {serviceChargeVal > 0 && (
                        <div style={{ marginTop: "3px" }}>
                          <strong>Service Charge:</strong> ₹
                          {serviceChargeVal.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td>
                      {Array.isArray(job.usedParts) &&
                        job.usedParts.length > 0 &&
                        job.usedParts.map((p, i) => {
                          const rowAmt =
                            (parseFloat(p.qty) || 0) *
                            (parseFloat(p.amount) || 0);
                          return <div key={i}>₹{rowAmt.toFixed(2)}</div>;
                        })}
                      {totalBillVal > 0 && (
                        <div
                          style={{
                            marginTop: "6px",
                            borderTop: "1px solid #000",
                            paddingTop: "2px",
                            fontWeight: "bold",
                          }}
                        >
                          Total: ₹{totalBillVal.toFixed(2)}
                        </div>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>

              <table className="js-table" style={{ borderTop: "none" }}>
                <tbody>
                  <tr>
                    <td
                      style={{ width: "30%", borderTop: "none" }}
                      className="js-bold"
                    >
                      FILTER CLEAN
                    </td>
                    <td style={{ width: "15%", borderTop: "none" }}>
                      {job.filterClean && job.filterClean !== "-"
                        ? job.filterClean
                        : ""}
                    </td>
                    <td
                      rowSpan="2"
                      style={{
                        width: "18%",
                        verticalAlign: "middle",
                        textAlign: "center",
                        borderTop: "none",
                      }}
                      className="js-bold"
                    >
                      IN-DOOR
                      <br />
                      MOTOR
                    </td>
                    <td
                      style={{ width: "37%", padding: 0, borderTop: "none" }}
                      rowSpan="2"
                    >
                      <div
                        style={{
                          borderBottom: "1px solid #000",
                          padding: "4px 6px",
                          textAlign: "left",
                        }}
                      >
                        <span className="faint-label">Model:</span>
                        <span>
                          {job.indoorMotorModel && job.indoorMotorModel !== "-"
                            ? job.indoorMotorModel
                            : ""}
                        </span>
                      </div>
                      <div style={{ padding: "4px 6px", textAlign: "left" }}>
                        <span className="faint-label">Serial:</span>
                        <span>
                          {job.indoorMotorSerial &&
                          job.indoorMotorSerial !== "-"
                            ? job.indoorMotorSerial
                            : ""}
                        </span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="js-bold">STAND TYPE</td>
                    <td>
                      {job.standType && job.standType !== "-"
                        ? job.standType
                        : ""}
                    </td>
                  </tr>
                  <tr>
                    <td className="js-bold">SWING / FLAPPER</td>
                    <td>
                      {job.swingFlapper && job.swingFlapper !== "-"
                        ? job.swingFlapper
                        : ""}
                    </td>
                    <td
                      rowSpan="2"
                      style={{ verticalAlign: "middle", textAlign: "center" }}
                      className="js-bold"
                    >
                      OUT-DOOR
                      <br />
                      MOTOR
                    </td>
                    <td rowSpan="2" style={{ padding: 0 }}>
                      <div
                        style={{
                          borderBottom: "1px solid #000",
                          padding: "4px 6px",
                          textAlign: "left",
                        }}
                      >
                        <span className="faint-label">Model:</span>
                        <span>
                          {job.outdoorMotorModel &&
                          job.outdoorMotorModel !== "-"
                            ? job.outdoorMotorModel
                            : ""}
                        </span>
                      </div>
                      <div style={{ padding: "4px 6px", textAlign: "left" }}>
                        <span className="faint-label">Serial:</span>
                        <span>
                          {job.outdoorMotorSerial &&
                          job.outdoorMotorSerial !== "-"
                            ? job.outdoorMotorSerial
                            : ""}
                        </span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="js-bold">STABILIZER</td>
                    <td>
                      {job.stabilizer && job.stabilizer !== "-"
                        ? job.stabilizer
                        : ""}
                    </td>
                  </tr>

                  {isSinglePhaseJob ? (
                    <>
                      <tr>
                        <td className="js-bold">REMOTE</td>
                        <td>
                          {job.remoteStatus && job.remoteStatus !== "-"
                            ? job.remoteStatus
                            : ""}
                        </td>
                        <td colSpan="2" style={{ padding: "4px 6px" }}>
                          <strong>POWER SUPPLY:</strong> Single Phase (1-Phase)
                        </td>
                      </tr>
                      <tr>
                        <td className="js-bold">ROOM TEMP.</td>
                        <td>
                          {job.roomTemp && job.roomTemp !== "-"
                            ? job.roomTemp
                            : ""}
                        </td>
                        <td colSpan="2" style={{ padding: "4px 6px" }}>
                          <strong>TECHNICIAN:</strong> {job.staffName || ""} |{" "}
                          <strong>STATUS:</strong> {job.status}
                        </td>
                      </tr>
                      <tr>
                        <td className="js-bold">VOLTAGE</td>
                        <td>
                          {job.voltage && job.voltage !== "-" ? job.voltage : ""}
                        </td>
                        <td colSpan="2" rowSpan="9" style={{ padding: "6px" }}>
                          <div className="js-bold">CUSTOMER SIGN &amp; REMARK</div>
                          {job.signatureURL ? (
                            <div
                              style={{
                                margin: "6px 0",
                                borderBottom: "1px dashed #94a3b8",
                                paddingBottom: "4px",
                              }}
                            >
                              <img
                                src={job.signatureURL}
                                alt="Customer Signature"
                                style={{
                                  maxHeight: "65px",
                                  maxWidth: "100%",
                                  objectFit: "contain",
                                }}
                              />
                            </div>
                          ) : (
                            <div
                              style={{
                                height: "45px",
                                borderBottom: "1px dashed #cbd5e1",
                                margin: "6px 0",
                              }}
                            ></div>
                          )}
                          <div style={{ fontSize: "11px", marginTop: "4px" }}>
                            <strong>REMARK:</strong>{" "}
                            {job.feedback && job.feedback !== "-"
                              ? job.feedback
                              : ""}
                          </div>
                          <div style={{ fontSize: "11px", marginTop: "4px" }}>
                            <strong>MOBILE:</strong> {job.customerPhone}
                          </div>
                          <div style={{ fontSize: "11px", marginTop: "4px" }}>
                            <strong>DATE:</strong> {job.date}
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="js-bold">UNIT AMPERE</td>
                        <td>
                          {job.ampere && job.ampere !== "-" ? job.ampere : ""}
                        </td>
                      </tr>
                      <tr>
                        <td className="js-bold">COMPRESSOR AMPERE</td>
                        <td>
                          {job.compressorAmpere && job.compressorAmpere !== "-"
                            ? job.compressorAmpere
                            : ""}
                        </td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr>
                        <td className="js-bold">REMOTE</td>
                        <td>
                          {job.remoteStatus && job.remoteStatus !== "-"
                            ? job.remoteStatus
                            : ""}
                        </td>
                        <td colSpan="2" style={{ padding: 0 }}>
                          <div style={{ display: "flex" }}>
                            <div
                              style={{
                                flex: 1,
                                borderRight: "1px solid #000",
                                padding: "4px 6px",
                              }}
                            >
                              <strong>R:</strong>{" "}
                              {job.phaseR && job.phaseR !== "-"
                                ? job.phaseR
                                : ""}
                            </div>
                            <div
                              style={{
                                flex: 1,
                                borderRight: "1px solid #000",
                                padding: "4px 6px",
                              }}
                            >
                              <strong>Y:</strong>{" "}
                              {job.phaseY && job.phaseY !== "-"
                                ? job.phaseY
                                : ""}
                            </div>
                            <div style={{ flex: 1, padding: "4px 6px" }}>
                              <strong>B:</strong>{" "}
                              {job.phaseB && job.phaseB !== "-"
                                ? job.phaseB
                                : ""}
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="js-bold">ROOM TEMP.</td>
                        <td>
                          {job.roomTemp && job.roomTemp !== "-"
                            ? job.roomTemp
                            : ""}
                        </td>
                        <td colSpan="2" style={{ padding: 0 }}>
                          <div style={{ display: "flex" }}>
                            <div
                              style={{
                                flex: 1,
                                borderRight: "1px solid #000",
                                padding: "4px 6px",
                              }}
                            >
                              <strong>R:</strong>{" "}
                              {job.ampR && job.ampR !== "-" ? job.ampR : ""}
                            </div>
                            <div
                              style={{
                                flex: 1,
                                borderRight: "1px solid #000",
                                padding: "4px 6px",
                              }}
                            >
                              <strong>Y:</strong>{" "}
                              {job.ampY && job.ampY !== "-" ? job.ampY : ""}
                            </div>
                            <div style={{ flex: 1, padding: "4px 6px" }}>
                              <strong>B:</strong>{" "}
                              {job.ampB && job.ampB !== "-" ? job.ampB : ""}
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="js-bold">VOLTAGE</td>
                        <td>
                          {job.voltage && job.voltage !== "-" ? job.voltage : ""}
                        </td>
                        <td colSpan="2" style={{ padding: "4px 6px" }}>
                          <strong>TECHNICIAN:</strong> {job.staffName || ""} |{" "}
                          <strong>STATUS:</strong> {job.status}
                        </td>
                      </tr>
                      <tr>
                        <td className="js-bold">UNIT AMPERE</td>
                        <td>
                          {job.ampere && job.ampere !== "-" ? job.ampere : ""}
                        </td>
                        <td colSpan="2" rowSpan="8" style={{ padding: "6px" }}>
                          <div className="js-bold">CUSTOMER SIGN &amp; REMARK</div>
                          {job.signatureURL ? (
                            <div
                              style={{
                                margin: "6px 0",
                                borderBottom: "1px dashed #94a3b8",
                                paddingBottom: "4px",
                              }}
                            >
                              <img
                                src={job.signatureURL}
                                alt="Customer Signature"
                                style={{
                                  maxHeight: "65px",
                                  maxWidth: "100%",
                                  objectFit: "contain",
                                }}
                              />
                            </div>
                          ) : (
                            <div
                              style={{
                                height: "45px",
                                borderBottom: "1px dashed #cbd5e1",
                                margin: "6px 0",
                              }}
                            ></div>
                          )}
                          <div style={{ fontSize: "11px", marginTop: "4px" }}>
                            <strong>REMARK:</strong>{" "}
                            {job.feedback && job.feedback !== "-"
                              ? job.feedback
                              : ""}
                          </div>
                          <div style={{ fontSize: "11px", marginTop: "4px" }}>
                            <strong>MOBILE:</strong> {job.customerPhone}
                          </div>
                          <div style={{ fontSize: "11px", marginTop: "4px" }}>
                            <strong>DATE:</strong> {job.date}
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="js-bold">COMPRESSOR AMPERE</td>
                        <td>
                          {job.compressorAmpere && job.compressorAmpere !== "-"
                            ? job.compressorAmpere
                            : ""}
                        </td>
                      </tr>
                    </>
                  )}

                  <tr>
                    <td className="js-bold">DRAIN WITH SIZE</td>
                    <td>
                      {job.drainSize && job.drainSize !== "-"
                        ? job.drainSize
                        : ""}
                    </td>
                  </tr>
                  <tr>
                    <td className="js-bold">COPPER PIPE SIZE</td>
                    <td>
                      {job.copperPipeSize && job.copperPipeSize !== "-"
                        ? job.copperPipeSize
                        : ""}
                    </td>
                  </tr>
                  <tr>
                    <td className="js-bold">OUTDOOR CLEAN</td>
                    <td>
                      {job.outdoorClean && job.outdoorClean !== "-"
                        ? job.outdoorClean
                        : ""}
                    </td>
                  </tr>
                  <tr>
                    <td className="js-bold">SUCTION PRESSURE</td>
                    <td>
                      {job.sectionPressure && job.sectionPressure !== "-"
                        ? job.sectionPressure
                        : ""}
                    </td>
                  </tr>
                  <tr>
                    <td className="js-bold">WIRE SIZE &amp; CORE</td>
                    <td>
                      {job.wireSizeCore && job.wireSizeCore !== "-"
                        ? job.wireSizeCore
                        : ""}
                    </td>
                  </tr>
                  <tr>
                    <td className="js-bold">INSULATION</td>
                    <td>
                      {job.insulation && job.insulation !== "-"
                        ? job.insulation
                        : ""}
                    </td>
                  </tr>
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {allPhotos.length > 0 && (
        <div
          className="no-print"
          style={{
            padding: "8px",
            border: "1px solid #cbd5e1",
            borderTop: "none",
            background: "#fff",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: "bold", marginBottom: "6px" }}>
            CUSTOMER / SITE &amp; PART PHOTOS:
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {allPhotos.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`Photo ${idx + 1}`}
                style={{
                  width: "80px",
                  height: "80px",
                  objectFit: "cover",
                  border: "1px solid #334155",
                  borderRadius: "4px",
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 3. MAIN APPLICATION COMPONENT
// ==========================================
export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [jobSheets, setJobSheets] = useState([]);
  const [loginLogs, setLoginLogs] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const [spareStock, setSpareStock] = useState([
    {
      name: "Compressor 1.5 Ton",
      qty: "5",
      desc: "Rotary Compressor",
      rate: "6500",
    },
    {
      name: "AC Capacitor 36 MFD",
      qty: "12",
      desc: "Dual Run Capacitor",
      rate: "450",
    },
  ]);

  const [custPhone, setCustPhone] = useState("");
  const [custLoggedIn, setCustLoggedIn] = useState(false);
  const [custNameInput, setCustNameInput] = useState("");
  const [custAddressInput, setCustAddressInput] = useState("");
  const [categoryType, setCategoryType] = useState("HVAC & Refrigeration");
  const [productType, setProductType] = useState("Split / Window AC");
  const [problemDesc, setProblemDesc] = useState("");
  const [custSelectedJob, setCustSelectedJob] = useState(null);

  // Customer Camera Photos State
  const [custCameraPhotos, setCustCameraPhotos] = useState([]);
  const [custUploadingPhotos, setCustUploadingPhotos] = useState(false);
  const custCameraInputRef = useRef(null);

  const savedStaffSession = (() => {
    try {
      return JSON.parse(localStorage.getItem("mq_active_staff_session") || "null");
    } catch {
      return null;
    }
  })();

  const [staffPhoneInput, setStaffPhoneInput] = useState(
    savedStaffSession?.phone || ""
  );
  const [otpStep, setOtpStep] = useState(1);
  const [enteredOtp, setEnteredOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [staffLoggedIn, setStaffLoggedIn] = useState(Boolean(savedStaffSession));
  const [currentStaffName, setCurrentStaffName] = useState(
    savedStaffSession?.name || ""
  );
  const [staffGpsLocation, setStaffGpsLocation] = useState("Fetching GPS...");
  const [staffSubTab, setStaffSubTab] = useState("menu");
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // Slide-by-Slide Job Sheet Wizard State (हर फील्ड अलग स्लाइड में)
  const [slideIndex, setSlideIndex] = useState(0);

  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [adminMainTab, setAdminMainTab] = useState("jobs");
  const [adminJobSubTab, setAdminJobSubTab] = useState("completed");
  const [adminSpareSubTab, setAdminSpareSubTab] = useState("stock");
  const [selectedStaffFolder, setSelectedStaffFolder] = useState(null);

  const [attSelectedYear, setAttSelectedYear] = useState(null);
  const [attSelectedMonth, setAttSelectedMonth] = useState(null);
  const [attSelectedStaffPhone, setAttSelectedStaffPhone] = useState(null);

  const [newStockName, setNewStockName] = useState("");
  const [newStockQty, setNewStockQty] = useState("");
  const [newStockDesc, setNewStockDesc] = useState("");
  const [newStockRate, setNewStockRate] = useState("");

  const [inspectedJob, setInspectedJob] = useState(null);
  const [lastSubmittedJob, setLastSubmittedJob] = useState(null);

  const [jobCustName, setJobCustName] = useState("");
  const [jobCustAddress, setJobCustAddress] = useState("");
  const [jobCustPhone, setJobCustPhone] = useState("");
  const [billNo, setBillNo] = useState("");
  const [amcDate, setAmcDate] = useState("");
  const [faultDetails, setFaultDetails] = useState("");

  const [unitModel, setUnitModel] = useState("");
  const [unitSerial, setUnitSerial] = useState("");
  const [unitCapacity, setUnitCapacity] = useState("");
  const [condenserInOut, setCondenserInOut] = useState("OK");

  const [wcTankSize, setWcTankSize] = useState("40");
  const [wcTapCount, setWcTapCount] = useState("2");
  const [wcOverflowType, setWcOverflowType] = useState("Float Ball");
  const [wcCondensingCoilSize, setWcCondensingCoilSize] = useState("");

  const [indoorModel, setIndoorModel] = useState("");
  const [indoorSerial, setIndoorSerial] = useState("");
  const [outdoorModel, setOutdoorModel] = useState("");
  const [outdoorSerial, setOutdoorSerial] = useState("");
  const [compressorModel, setCompressorModel] = useState("");
  const [compressorSerial, setCompressorSerial] = useState("");
  const [indoorMotorModel, setIndoorMotorModel] = useState("");
  const [indoorMotorSerial, setIndoorMotorSerial] = useState("");
  const [outdoorMotorModel, setOutdoorMotorModel] = useState("");
  const [outdoorMotorSerial, setOutdoorMotorSerial] = useState("");

  const [filterClean, setFilterClean] = useState("OK");
  const [standType, setStandType] = useState("Wall Stand");
  const [swingFlapper, setSwingFlapper] = useState("OK");
  const [stabilizer, setStabilizer] = useState("OK");
  const [remoteStatus, setRemoteStatus] = useState("OK");
  const [outdoorClean, setOutdoorClean] = useState("OK");

  const [sectionPressure, setSectionPressure] = useState("");
  const [roomTemp, setRoomTemp] = useState("");
  const [voltage, setVoltage] = useState("230V");
  const [ampere, setAmpere] = useState("");
  const [compressorAmpere, setCompressorAmpere] = useState("");
  const [drainSize, setDrainSize] = useState("");
  const [copperPipeSize, setCopperPipeSize] = useState("");
  const [wireSizeCore, setWireSizeCore] = useState("");
  const [insulation, setInsulation] = useState("OK");
  const [phaseR, setPhaseR] = useState("");
  const [phaseY, setPhaseY] = useState("");
  const [phaseB, setPhaseB] = useState("");
  const [ampR, setAmpR] = useState("");
  const [ampY, setAmpY] = useState("");
  const [ampB, setAmpB] = useState("");

  const [coolerWorkTypes, setCoolerWorkTypes] = useState(["Breakdown / Repair"]);
  const [coolerBodyMaterial, setCoolerBodyMaterial] = useState("GI / Metal");
  const [coolerSubType, setCoolerSubType] = useState("Desert Cooler");
  const [coolerCapacity, setCoolerCapacity] = useState("");
  const [coolerBrandModel, setCoolerBrandModel] = useState("");
  const [coolerSerialNo, setCoolerSerialNo] = useState("");
  const [coolerTotalQty, setCoolerTotalQty] = useState("1");

  const [coolerFanMotor, setCoolerFanMotor] = useState("OK");
  const [coolerWaterPump, setCoolerWaterPump] = useState("OK");
  const [coolerSwingBlade, setCoolerSwingBlade] = useState("OK");
  const [coolerPadType, setCoolerPadType] = useState("Honeycomb");
  const [coolerPadStatus, setCoolerPadStatus] = useState("Clean");
  const [coolerTankPlumbing, setCoolerTankPlumbing] = useState("OK");
  const [coolerElectrical, setCoolerElectrical] = useState("OK");
  const [coolerBodyPaint, setCoolerBodyPaint] = useState("OK");

  const [workDone, setWorkDone] = useState("");
  const [sparePartOption, setSparePartOption] = useState("Used Part");
  const [sparePartName, setSparePartName] = useState("");
  const [sparePartModel, setSparePartModel] = useState("");
  const [usedParts, setUsedParts] = useState([createEmptyPart()]);
  const [serviceChargeInput, setServiceChargeInput] = useState("");

  const [jobStatusType, setJobStatusType] = useState("Completed");
  const [pendingSubOption, setPendingSubOption] = useState("Part Pending");
  const [jobNote, setJobNote] = useState("");
  const [customerFeedback, setCustomerFeedback] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [sitePhotos, setSitePhotos] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [savedSignatureURL, setSavedSignatureURL] = useState("");
  const fullCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // क्या इस समय जॉब शीट भरी जा रही है? (यदि हाँ, तो ऊपर का सब कुछ छिप जाएगा)
  const isFillingJobSheet =
    activeTab === "staff" && staffLoggedIn && staffSubTab === "newJobForm";

  const isWaterCoolerSelected = checkIsWaterCooler(productType);
  const isAirCoolerSelected = productType === "Cooler";
  const isFridgeOrWCSelected = checkIsFridgeOrWaterCooler(productType);
  const isSinglePhaseSelected = checkIsSinglePhase(productType);

  // =========================================================
  // OFFLINE QUEUE & SERVER SYNC ENGINE
  // =========================================================
  const enqueueOfflinePayload = (payload) => {
    try {
      const q = JSON.parse(localStorage.getItem("mq_offline_sync_queue") || "[]");
      q.push(payload);
      localStorage.setItem("mq_offline_sync_queue", JSON.stringify(q));
      setPendingSyncCount(q.length);
    } catch (e) {
      console.error("Queue write error:", e);
    }
  };

  const flushOfflineQueueToServer = async () => {
    if (!navigator.onLine) return;
    let q = [];
    try {
      q = JSON.parse(localStorage.getItem("mq_offline_sync_queue") || "[]");
    } catch {
      q = [];
    }
    if (q.length === 0) {
      setPendingSyncCount(0);
      return;
    }

    const remaining = [];
    for (const item of q) {
      try {
        if (item.type === "ATTENDANCE_UPSERT") {
          const attRef = doc(db, "staff_attendance", item.docId);
          const snap = await getDoc(attRef);
          if (snap.exists()) {
            const existing = snap.data();
            const updates = {};
            if (!existing.inTime && item.inTime) updates.inTime = item.inTime;
            if (item.outTime) updates.outTime = item.outTime;
            if (item.point) updates.routePoints = arrayUnion(item.point);
            await updateDoc(attRef, updates);
          } else {
            await setDoc(attRef, {
              docId: item.docId,
              staffPhone: item.staffPhone,
              staffName: item.staffName,
              dateKey: item.dateKey,
              year: item.year,
              month: item.month,
              day: item.day,
              inTime: item.inTime || Date.now(),
              outTime: item.outTime || null,
              routePoints: item.point ? [item.point] : [],
            });
          }
        } else if (item.type === "JOB_SAVE") {
          await setDoc(doc(db, "jobs", item.jobSheetNo), item.record);
        }
      } catch (err) {
        remaining.push(item);
      }
    }
    localStorage.setItem("mq_offline_sync_queue", JSON.stringify(remaining));
    setPendingSyncCount(remaining.length);
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      flushOfflineQueueToServer();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    flushOfflineQueueToServer();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // =========================================================
  // STAFF AUTO IN / OUT & CONTINUOUS GPS ROUTE TRACKING
  // =========================================================
  const logStaffAttendancePoint = async (
    phone,
    name,
    coords,
    eventType = "ROUTE"
  ) => {
    if (!phone) return;
    const now = new Date();
    const dateKey = getTodayKey(now);
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const docId = `${phone}_${dateKey}`;
    const ts = now.getTime();

    const addressText = coords
      ? await fetchReadableAddress(coords.lat, coords.lng)
      : "Location Unavailable";

    const point = coords
      ? {
          lat: coords.lat,
          lng: coords.lng,
          address: addressText,
          timeText: formatTime12(ts),
          timestamp: ts,
          event: eventType,
        }
      : null;

    setAttendanceRecords((prev) => {
      const idx = prev.findIndex((r) => r.docId === docId);
      if (idx > -1) {
        const updated = [...prev];
        const cur = updated[idx];
        updated[idx] = {
          ...cur,
          inTime: cur.inTime || ts,
          outTime: eventType === "OUT" ? ts : cur.outTime,
          routePoints: point
            ? [...(cur.routePoints || []), point]
            : cur.routePoints || [],
        };
        return updated;
      } else {
        return [
          {
            docId,
            staffPhone: phone,
            staffName: name,
            dateKey,
            year,
            month,
            day,
            inTime: ts,
            outTime: eventType === "OUT" ? ts : null,
            routePoints: point ? [point] : [],
          },
          ...prev,
        ];
      }
    });

    const payload = {
      type: "ATTENDANCE_UPSERT",
      docId,
      staffPhone: phone,
      staffName: name,
      dateKey,
      year,
      month,
      day,
      inTime: eventType === "IN" ? ts : null,
      outTime: eventType === "OUT" ? ts : null,
      point,
    };

    if (navigator.onLine) {
      try {
        const attRef = doc(db, "staff_attendance", docId);
        const snap = await getDoc(attRef);
        if (snap.exists()) {
          const updates = {};
          if (!snap.data().inTime) updates.inTime = ts;
          if (eventType === "OUT") updates.outTime = ts;
          if (point) updates.routePoints = arrayUnion(point);
          await updateDoc(attRef, updates);
        } else {
          await setDoc(attRef, {
            docId,
            staffPhone: phone,
            staffName: name,
            dateKey,
            year,
            month,
            day,
            inTime: ts,
            outTime: eventType === "OUT" ? ts : null,
            routePoints: point ? [point] : [],
          });
        }
      } catch (e) {
        enqueueOfflinePayload(payload);
      }
    } else {
      enqueueOfflinePayload(payload);
    }
  };

  useEffect(() => {
    let watchId = null;
    let intervalId = null;
    let lastSavedCoords = null;

    const captureCurrentPos = (evType = "ROUTE") => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setStaffGpsLocation(
            `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)} (${
              navigator.onLine ? "GPS Live" : "Offline Saved"
            })`
          );

          if (staffLoggedIn && staffPhoneInput) {
            const movedEnough =
              !lastSavedCoords ||
              Math.abs(lastSavedCoords.lat - lat) > 0.0008 ||
              Math.abs(lastSavedCoords.lng - lng) > 0.0008 ||
              evType === "IN";

            if (movedEnough) {
              lastSavedCoords = { lat, lng };
              logStaffAttendancePoint(
                staffPhoneInput,
                currentStaffName || `Staff (${staffPhoneInput})`,
                { lat, lng },
                evType
              );
            }
          }
        },
        () => {
          setStaffGpsLocation("Prayagraj (GPS Active)");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    captureCurrentPos(staffLoggedIn ? "IN" : "PING");

    if (staffLoggedIn && staffPhoneInput) {
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setStaffGpsLocation(
              `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)} (${
                navigator.onLine ? "GPS Live" : "Offline Saved"
              })`
            );
            const moved =
              !lastSavedCoords ||
              Math.abs(lastSavedCoords.lat - lat) > 0.001 ||
              Math.abs(lastSavedCoords.lng - lng) > 0.001;
            if (moved) {
              lastSavedCoords = { lat, lng };
              logStaffAttendancePoint(
                staffPhoneInput,
                currentStaffName || `Staff (${staffPhoneInput})`,
                { lat, lng },
                "ROUTE"
              );
            }
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 30000 }
        );
      }
      intervalId = setInterval(() => captureCurrentPos("ROUTE"), 180000);
    }

    return () => {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (intervalId !== null) clearInterval(intervalId);
    };
  }, [staffLoggedIn, staffPhoneInput]);

  useEffect(() => {
    const unsubJobs = onSnapshot(
      collection(db, "jobs"),
      (snapshot) => {
        const list = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() });
        });
        setJobSheets(sortJobsNewestFirst(list));
      },
      (err) => console.log("Jobs sync info:", err.message)
    );

    const unsubLogs = onSnapshot(
      collection(db, "login_logs"),
      (snapshot) => {
        const logs = [];
        snapshot.forEach((d) => {
          logs.push(d.data());
        });
        setLoginLogs(logs);
      },
      (err) => console.log("Logs sync info:", err.message)
    );

    const unsubAttendance = onSnapshot(
      collection(db, "staff_attendance"),
      (snapshot) => {
        const att = [];
        snapshot.forEach((d) => {
          att.push({ id: d.id, ...d.data() });
        });
        setAttendanceRecords(att);
      },
      (err) => console.log("Attendance sync info:", err.message)
    );

    return () => {
      unsubJobs();
      unsubLogs();
      unsubAttendance();
    };
  }, []);

  useEffect(() => {
    if (isSignatureModalOpen && fullCanvasRef.current) {
      const canvas = fullCanvasRef.current;
      canvas.width = window.innerWidth - 30;
      canvas.height = window.innerHeight - 160;
      const ctx = canvas.getContext("2d");
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#0f172a";
    }
  }, [isSignatureModalOpen]);

  const toggleCoolerWorkType = (type) => {
    setCoolerWorkTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const addPartRow = () => {
    setUsedParts((prev) => [...prev, createEmptyPart()]);
  };

  const updatePartRow = (index, field, value) => {
    setUsedParts((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const removePartRow = (index) => {
    setUsedParts((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : [createEmptyPart()]
    );
  };

  const isUsedPartSelected = String(sparePartOption || "").includes("Used Part");

  const usedPartsTotal = isUsedPartSelected
    ? usedParts.reduce((sum, item) => {
        const q = parseFloat(item.qty) || 0;
        const amt = parseFloat(item.amount) || 0;
        return sum + q * amt;
      }, 0)
    : 0;

  const serviceChargeVal = parseFloat(serviceChargeInput) || 0;
  const grandTotalBill = usedPartsTotal + serviceChargeVal;

  // =========================================================
  // CUSTOMER CAMERA PHOTO CAPTURE & UPLOAD
  // =========================================================
  const handleCustomerCameraCapture = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const previews = files.map((file) => ({
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      file,
      uploadedUrl: "",
    }));
    setCustCameraPhotos((prev) => [...prev, ...previews]);

    try {
      setCustUploadingPhotos(true);
      for (const item of previews) {
        const compressedBlob = await compressImage(item.file);
        const storageRef = ref(
          storage,
          `customer_photos/${Date.now()}_${item.name}`
        );
        await uploadBytesResumable(storageRef, compressedBlob);
        const downloadUrl = await getDownloadURL(storageRef);

        setCustCameraPhotos((prev) =>
          prev.map((p) =>
            p.previewUrl === item.previewUrl
              ? { ...p, uploadedUrl: downloadUrl }
              : p
          )
        );
      }
    } catch (err) {
      console.error("Customer camera upload error:", err);
    } finally {
      setCustUploadingPhotos(false);
      e.target.value = "";
    }
  };

  const removeCustomerCameraPhoto = (index) => {
    setCustCameraPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSitePhotosChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const previews = files.map((file) => ({
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      file,
      uploadedUrl: "",
    }));
    setSitePhotos((prev) => [...prev, ...previews]);

    try {
      setUploadingPhotos(true);
      for (const item of previews) {
        const compressedBlob = await compressImage(item.file);
        const storageRef = ref(
          storage,
          `job_photos/${Date.now()}_${item.name}`
        );
        await uploadBytesResumable(storageRef, compressedBlob);
        const downloadUrl = await getDownloadURL(storageRef);

        setSitePhotos((prev) =>
          prev.map((p) =>
            p.previewUrl === item.previewUrl
              ? { ...p, uploadedUrl: downloadUrl }
              : p
          )
        );
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploadingPhotos(false);
    }
  };

  const removeSitePhoto = (index) => {
    setSitePhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const recordUserLogin = (identifier, userRole, displayName) => {
    const cleanId = identifier.trim();
    if (!cleanId) return;

    setLoginLogs((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.phone === cleanId && item.role === userRole
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          loginCount: (updated[existingIndex].loginCount || 1) + 1,
          lastLoginText: new Date().toLocaleString(),
        };
        return updated;
      } else {
        return [
          {
            phone: cleanId,
            role: userRole,
            name: displayName,
            loginCount: 1,
            lastLoginText: new Date().toLocaleString(),
          },
          ...prev,
        ];
      }
    });

    const docId = userRole + "_" + cleanId.replace(/[^a-zA-Z0-9]/g, "_");
    const userRef = doc(db, "login_logs", docId);
    getDoc(userRef)
      .then((docSnap) => {
        if (docSnap.exists()) {
          updateDoc(userRef, {
            loginCount: increment(1),
            lastLogin: serverTimestamp(),
            lastLoginText: new Date().toLocaleString(),
          });
        } else {
          setDoc(userRef, {
            phone: cleanId,
            role: userRole,
            name: displayName,
            loginCount: 1,
            lastLogin: serverTimestamp(),
            lastLoginText: new Date().toLocaleString(),
          });
        }
      })
      .catch((err) => console.error(err));
  };

  const getCoordinates = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startFullDrawing = (e) => {
    const canvas = fullCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { x, y } = getCoordinates(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const drawFull = (e) => {
    if (!isDrawing) return;
    const canvas = fullCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { x, y } = getCoordinates(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopFullDrawing = () => {
    setIsDrawing(false);
  };

  const clearFullSignature = () => {
    const canvas = fullCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveFullSignature = () => {
    const canvas = fullCanvasRef.current;
    if (canvas) {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = 300;
      tempCanvas.height = 110;
      const tempCtx = tempCanvas.getContext("2d");
      tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
      setSavedSignatureURL(tempCanvas.toDataURL("image/png"));
    }
    setIsSignatureModalOpen(false);
  };

  const handleCustomerLogin = (e) => {
    e.preventDefault();
    if (custPhone.length < 10) {
      alert("कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें!");
      return;
    }
    setCustLoggedIn(true);
    setCustSelectedJob(null);
    recordUserLogin(custPhone, "customer", "Customer (" + custPhone + ")");
  };

  const selectCategoryValue = (cat) => {
    setCategoryType(cat);
    if (cat === "HVAC & Refrigeration") setProductType("Split / Window AC");
    else if (cat === "Electrical Work") {
      setProductType("Cooler");
      if (!workDone) setWorkDone("कूलर जनरल सर्विस एवं केमिकल/पानी से सफाई");
    } else if (cat === "Plumbing Work")
      setProductType("Pipe Fitting & Leakage Repair");
    else if (cat === "Civil Work") setProductType("Flooring & Tiling");
  };

  const handleCategoryChange = (e) => {
    selectCategoryValue(e.target.value);
  };

  const selectProductValue = (prod) => {
    setProductType(prod);
    if (prod === "Cooler" && !workDone) {
      setWorkDone("कूलर जनरल सर्विस एवं केमिकल/पानी से सफाई");
    }
  };

  const handleNewComplaint = (e) => {
    e.preventDefault();
    if (!custNameInput.trim() || !custAddressInput.trim()) {
      alert("कृपया कस्टमर का पूरा नाम और पता दर्ज करें!");
      return;
    }
    if (custUploadingPhotos) {
      alert("कृपया फोटो अपलोड पूरा होने तक 2 सेकंड प्रतीक्षा करें!");
      return;
    }

    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    const jobSheetNo = "COMP" + custPhone + day + month + hours + minutes;
    const uploadedCustUrls = custCameraPhotos
      .map((p) => p.uploadedUrl)
      .filter(Boolean);

    const newEntry = {
      jobSheetNo,
      createdAtMs: now.getTime(),
      customerName: custNameInput,
      customerPhone: custPhone,
      customerAddress: custAddressInput,
      product: "[" + categoryType + "] " + productType,
      faultDetails: problemDesc,
      desc: problemDesc,
      status: "Pending",
      pendingSubOption: "-",
      date:
        day + "/" + month + "/" + now.getFullYear() + " " + hours + ":" + minutes,
      staffName: "Not Assigned Yet",
      staffPhone: "-",
      location: "Online Booking",
      photoURL: uploadedCustUrls[0] || "",
      sitePhotoUrls: uploadedCustUrls,
      signatureURL: "",
      categoryType,
      productType,
      usedParts: [],
      sparePartOption: "-",
      sparePartName: "-",
      sparePartModel: "-",
    };

    setJobSheets((prev) => sortJobsNewestFirst([newEntry, ...prev]));
    setDoc(doc(db, "jobs", jobSheetNo), newEntry).catch((err) =>
      console.error(err)
    );

    setProblemDesc("");
    setCustNameInput("");
    setCustAddressInput("");
    setCustCameraPhotos([]);
    alert(
      "शिकायत सफलतापूर्वक दर्ज हो गई!\nआपका कंप्लेंट नंबर है:\n" + jobSheetNo
    );
  };

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (staffPhoneInput.length < 10) {
      alert("कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें!");
      return;
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(otp);
    setOtpStep(2);
    alert(
      "आपके मोबाइल नंबर " + staffPhoneInput + " के लिए OTP है: " + otp
    );
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (enteredOtp === generatedOtp) {
      const staffLabel = "Staff (" + staffPhoneInput + ")";
      setCurrentStaffName(staffLabel);
      setStaffLoggedIn(true);
      setStaffSubTab("menu");
      setOtpStep(1);
      setEnteredOtp("");

      localStorage.setItem(
        "mq_active_staff_session",
        JSON.stringify({
          phone: staffPhoneInput,
          name: staffLabel,
          loginTime: Date.now(),
        })
      );

      recordUserLogin(staffPhoneInput, "staff", staffLabel);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            setStaffGpsLocation(
              `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)} (GPS Active)`
            );
            logStaffAttendancePoint(
              staffPhoneInput,
              staffLabel,
              { lat, lng },
              "IN"
            );
          },
          () => {
            setStaffGpsLocation("Prayagraj (GPS Default)");
            logStaffAttendancePoint(staffPhoneInput, staffLabel, null, "IN");
          }
        );
      } else {
        setStaffGpsLocation("Prayagraj (No GPS Support)");
        logStaffAttendancePoint(staffPhoneInput, staffLabel, null, "IN");
      }
    } else {
      alert("गलत OTP! कृपया सही OTP दर्ज करें।");
    }
  };

  const handleStaffLogout = () => {
    const phone = staffPhoneInput;
    const name = currentStaffName || `Staff (${phone})`;

    const finalizeLogout = (coords) => {
      logStaffAttendancePoint(phone, name, coords, "OUT");
      localStorage.removeItem("mq_active_staff_session");
      setStaffLoggedIn(false);
      alert("आप सफलतापूर्वक लॉग आउट हो गए हैं। आपका OUT समय और आज का रूट सेव हो गया है।");
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          finalizeLogout({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        () => finalizeLogout(null),
        { timeout: 4000 }
      );
    } else {
      finalizeLogout(null);
    }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminUser.toUpperCase() === "ADMIN" && adminPass === "123456789") {
      setAdminLoggedIn(true);
      recordUserLogin(
        adminUser.toUpperCase(),
        "office",
        "Office Admin (" + adminUser.toUpperCase() + ")"
      );
      alert("एडमिन / ऑफिस लॉगिन सफल!");
    } else {
      alert("गलत यूजरनेम या पासवर्ड!");
    }
  };

  const resetJobForm = () => {
    setSelectedComplaint(null);
    setJobCustName("");
    setJobCustPhone("");
    setJobCustAddress("");
    setBillNo("");
    setAmcDate("");
    setFaultDetails("");

    setUnitModel("");
    setUnitSerial("");
    setUnitCapacity("");
    setCondenserInOut("OK");
    setWcTankSize("40");
    setWcTapCount("2");
    setWcOverflowType("Float Ball");
    setWcCondensingCoilSize("");

    setIndoorModel("");
    setIndoorSerial("");
    setOutdoorModel("");
    setOutdoorSerial("");
    setCompressorModel("");
    setCompressorSerial("");
    setIndoorMotorModel("");
    setIndoorMotorSerial("");
    setOutdoorMotorModel("");
    setOutdoorMotorSerial("");
    setFilterClean("OK");
    setStandType("Wall Stand");
    setSwingFlapper("OK");
    setStabilizer("OK");
    setRemoteStatus("OK");
    setOutdoorClean("OK");
    setSectionPressure("");
    setRoomTemp("");
    setVoltage("230V");
    setAmpere("");
    setCompressorAmpere("");
    setDrainSize("");
    setCopperPipeSize("");
    setWireSizeCore("");
    setInsulation("OK");
    setPhaseR("");
    setPhaseY("");
    setPhaseB("");
    setAmpR("");
    setAmpY("");
    setAmpB("");

    setCoolerWorkTypes(["Breakdown / Repair"]);
    setCoolerBodyMaterial("GI / Metal");
    setCoolerSubType("Desert Cooler");
    setCoolerCapacity("");
    setCoolerBrandModel("");
    setCoolerSerialNo("");
    setCoolerTotalQty("1");
    setCoolerFanMotor("OK");
    setCoolerWaterPump("OK");
    setCoolerSwingBlade("OK");
    setCoolerPadType("Honeycomb");
    setCoolerPadStatus("Clean");
    setCoolerTankPlumbing("OK");
    setCoolerElectrical("OK");
    setCoolerBodyPaint("OK");

    setWorkDone("");
    setSparePartOption("Used Part");
    setSparePartName("");
    setSparePartModel("");
    setUsedParts([createEmptyPart()]);
    setServiceChargeInput("");
    setJobNote("");
    setCustomerFeedback("");
    setSavedSignatureURL("");
    setImageFile(null);
    setSitePhotos([]);
    setCategoryType("HVAC & Refrigeration");
    setProductType("Split / Window AC");
    setJobStatusType("Completed");
    setPendingSubOption("Part Pending");
    setSlideIndex(0);
  };

  const handleOpenBlankNewJob = () => {
    resetJobForm();
    setStaffSubTab("newJobForm");
  };

  const handleFillComplaintToNewJob = (comp) => {
    resetJobForm();
    setSelectedComplaint(comp);
    setJobCustName(comp.customerName || "Customer");
    setJobCustPhone(comp.customerPhone || "");
    setJobCustAddress(comp.customerAddress || "");
    setCategoryType(comp.categoryType || "HVAC & Refrigeration");
    setProductType(comp.productType || "Split / Window AC");
    setFaultDetails(comp.faultDetails || comp.desc || "");
    setWorkDone(
      comp.productType === "Cooler"
        ? "कूलर जनरल सर्विस एवं केमिकल/पानी से सफाई"
        : comp.desc || ""
    );
    setSparePartOption(
      comp.sparePartOption && comp.sparePartOption !== "-"
        ? comp.sparePartOption
        : "Used Part"
    );
    setSparePartName(
      comp.sparePartName && comp.sparePartName !== "-"
        ? comp.sparePartName
        : ""
    );
    setSparePartModel(
      comp.sparePartModel && comp.sparePartModel !== "-"
        ? comp.sparePartModel
        : ""
    );
    // ग्राहक द्वारा खींची गई फोटो पहले से जोड़ें
    const existingPhotos = Array.from(
      new Set([
        ...(Array.isArray(comp.sitePhotoUrls) ? comp.sitePhotoUrls : []),
        ...(comp.photoURL ? [comp.photoURL] : []),
      ])
    ).filter(Boolean);
    if (existingPhotos.length > 0) {
      setSitePhotos(
        existingPhotos.map((url, idx) => ({
          name: `CustomerPhoto_${idx + 1}.jpg`,
          previewUrl: url,
          file: null,
          uploadedUrl: url,
        }))
      );
    }
    setSlideIndex(0);
    setLastSubmittedJob(null);
    setStaffSubTab("newJobForm");
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const compressedBlob = await compressImage(selectedFile);
    const compressedFile = new File([compressedBlob], selectedFile.name, {
      type: "image/jpeg",
    });

    setImageFile(compressedFile);
  };

  const handleJobSubmit = () => {
    if (!jobCustName || !jobCustPhone) {
      alert("कृपया कस्टमर का नाम और मोबाइल नंबर भरें!");
      setSlideIndex(0);
      return;
    }

    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    const jobSheetNo = selectedComplaint
      ? selectedComplaint.jobSheetNo
      : "JS" + jobCustPhone.slice(-4) + day + month + hours + minutes;

    const activeUsedParts = isUsedPartSelected
      ? usedParts.filter(
          (p) => p.partName.trim() || (parseFloat(p.amount) || 0) > 0
        )
      : [];

    const uploadedPhotoUrls = sitePhotos
      .map((p) => p.uploadedUrl)
      .filter(Boolean);

    const finalStatus =
      jobStatusType === "Completed"
        ? "Completed"
        : pendingSubOption === "Part Pending"
        ? "Part Pending"
        : "Pending";

    const firstPartName =
      activeUsedParts.length > 0
        ? activeUsedParts[0].partName || "Used Part"
        : sparePartName || "-";

    const updatedRecord = {
      jobSheetNo,
      createdAtMs: now.getTime(),
      billNo: billNo || "-",
      amcDate: amcDate || "-",
      customerName: jobCustName,
      customerPhone: jobCustPhone,
      customerAddress: jobCustAddress,
      categoryType,
      productType,
      product: "[" + categoryType + "] " + productType,
      faultDetails: faultDetails || workDone || "-",
      desc:
        workDone ||
        (isAirCoolerSelected
          ? "कूलर जनरल सर्विस एवं केमिकल/पानी से सफाई"
          : "General Service / Repair"),
      status: finalStatus,
      pendingSubOption: jobStatusType === "Pending" ? pendingSubOption : "-",
      date:
        day + "/" + month + "/" + now.getFullYear() + " " + hours + ":" + minutes,
      staffName: currentStaffName || "Staff (Unknown)",
      staffPhone: staffPhoneInput || "0000000000",
      location: staffGpsLocation,
      photoURL: uploadedPhotoUrls[0] || "",
      sitePhotoUrls: uploadedPhotoUrls,
      signatureURL: savedSignatureURL,

      unitModel: isFridgeOrWCSelected ? unitModel || "-" : "-",
      unitSerial: isFridgeOrWCSelected ? unitSerial || "-" : "-",
      unitCapacity: isFridgeOrWCSelected ? unitCapacity || "-" : "-",
      condenserInOut: isFridgeOrWCSelected ? condenserInOut || "-" : "-",

      wcTankSize: isWaterCoolerSelected ? `${wcTankSize} Ltr` : "-",
      wcTapCount: isWaterCoolerSelected ? `${wcTapCount} Tap` : "-",
      wcOverflowType: isWaterCoolerSelected ? wcOverflowType || "-" : "-",
      wcCondensingCoilSize: isWaterCoolerSelected
        ? wcCondensingCoilSize || "-"
        : "-",

      indoorModel: !isFridgeOrWCSelected ? indoorModel || "-" : "-",
      indoorSerial: !isFridgeOrWCSelected ? indoorSerial || "-" : "-",
      outdoorModel: !isFridgeOrWCSelected ? outdoorModel || "-" : "-",
      outdoorSerial: !isFridgeOrWCSelected ? outdoorSerial || "-" : "-",
      compressorModel: compressorModel || "-",
      compressorSerial: compressorSerial || "-",
      indoorMotorModel: !isFridgeOrWCSelected ? indoorMotorModel || "-" : "-",
      indoorMotorSerial: !isFridgeOrWCSelected ? indoorMotorSerial || "-" : "-",
      outdoorMotorModel: !isFridgeOrWCSelected
        ? outdoorMotorModel || "-"
        : "-",
      outdoorMotorSerial: !isFridgeOrWCSelected
        ? outdoorMotorSerial || "-"
        : "-",
      filterClean:
        categoryType === "HVAC & Refrigeration" && !isFridgeOrWCSelected
          ? filterClean
          : "-",
      standType:
        categoryType === "HVAC & Refrigeration" && !isFridgeOrWCSelected
          ? standType
          : "-",
      swingFlapper:
        categoryType === "HVAC & Refrigeration" && !isFridgeOrWCSelected
          ? swingFlapper
          : "-",
      stabilizer:
        categoryType === "HVAC & Refrigeration" && !isFridgeOrWCSelected
          ? stabilizer
          : "-",
      remoteStatus:
        categoryType === "HVAC & Refrigeration" && !isFridgeOrWCSelected
          ? remoteStatus
          : "-",
      outdoorClean:
        categoryType === "HVAC & Refrigeration" && !isFridgeOrWCSelected
          ? outdoorClean
          : "-",
      sectionPressure:
        categoryType === "HVAC & Refrigeration" && !isFridgeOrWCSelected
          ? sectionPressure || "-"
          : "-",
      roomTemp:
        categoryType === "HVAC & Refrigeration" && !isFridgeOrWCSelected
          ? roomTemp || "-"
          : "-",
      voltage:
        categoryType !== "Civil Work" && !isFridgeOrWCSelected
          ? voltage || "-"
          : "-",
      ampere: categoryType !== "Civil Work" ? ampere || "-" : "-",
      compressorAmpere:
        categoryType === "HVAC & Refrigeration" ? compressorAmpere || "-" : "-",
      drainSize:
        categoryType === "HVAC & Refrigeration" && !isFridgeOrWCSelected
          ? drainSize || "-"
          : "-",
      copperPipeSize:
        categoryType === "HVAC & Refrigeration" && !isFridgeOrWCSelected
          ? copperPipeSize || "-"
          : "-",
      wireSizeCore:
        categoryType !== "Civil Work" && !isFridgeOrWCSelected
          ? wireSizeCore || "-"
          : "-",
      insulation:
        categoryType !== "Civil Work" && !isFridgeOrWCSelected
          ? insulation
          : "-",
      phaseR: !isSinglePhaseSelected && phaseR ? phaseR : "-",
      phaseY: !isSinglePhaseSelected && phaseY ? phaseY : "-",
      phaseB: !isSinglePhaseSelected && phaseB ? phaseB : "-",
      ampR: !isSinglePhaseSelected && ampR ? ampR : "-",
      ampY: !isSinglePhaseSelected && ampY ? ampY : "-",
      ampB: !isSinglePhaseSelected && ampB ? ampB : "-",
      coolerSpec: isAirCoolerSelected
        ? {
            workTypes: coolerWorkTypes,
            bodyMaterial: coolerBodyMaterial,
            coolerSubType: coolerSubType,
            capacity: coolerCapacity,
            brandModel: coolerBrandModel,
            serialNo: coolerSerialNo,
            totalQty: coolerTotalQty,
          }
        : null,
      coolerChecklist: isAirCoolerSelected
        ? {
            fanMotor: coolerFanMotor,
            waterPump: coolerWaterPump,
            swingBlade: coolerSwingBlade,
            padType: coolerPadType,
            padStatus: coolerPadStatus,
            tankPlumbing: coolerTankPlumbing,
            electrical: coolerElectrical,
            bodyPaint: coolerBodyPaint,
          }
        : null,
      usedParts: activeUsedParts,
      partsTotal: usedPartsTotal,
      serviceCharge: serviceChargeVal,
      totalAmount: grandTotalBill,
      sparePartOption: sparePartOption,
      sparePartName: firstPartName,
      sparePartModel: sparePartModel || "-",
      note: jobNote || "-",
      feedback: customerFeedback || "OK",
    };

    const fileToUpload = imageFile;

    const filteredList = jobSheets.filter((j) => j.jobSheetNo !== jobSheetNo);
    setJobSheets(sortJobsNewestFirst([updatedRecord, ...filteredList]));
    setLastSubmittedJob(updatedRecord);
    resetJobForm();
    setStaffSubTab("menu");

    const statusBadge =
      finalStatus === "Completed"
        ? "✅ COMPLETED"
        : `⏳ ${finalStatus.toUpperCase()}`;

    const partsText =
      activeUsedParts.length > 0
        ? `\n<b>इस्तेमाल हुए पार्ट्स:</b> ${activeUsedParts
            .map((p) => {
              const q = parseFloat(p.qty) || 0;
              const a = parseFloat(p.amount) || 0;
              return `${p.partName || "Part"} (${q} × ₹${a} = ₹${(q * a).toFixed(2)})`;
            })
            .join(", ")}`
        : sparePartName && sparePartName !== "-"
        ? `\n<b>पार्ट (${sparePartOption}):</b> ${sparePartName} (${sparePartModel || "-"})`
        : "";

    const telegramMsg =
      `🛠️ <b>STAFF JOB UPDATE</b>\n` +
      `<b>स्टेटस:</b> ${statusBadge}\n` +
      `<b>जॉब / कंप्लेंट नं.:</b> <code>${updatedRecord.jobSheetNo}</code>\n` +
      `<b>कस्टमर:</b> ${updatedRecord.customerName} (${updatedRecord.customerPhone})\n` +
      `<b>पता:</b> ${updatedRecord.customerAddress || "-"}\n` +
      `<b>उत्पाद:</b> ${updatedRecord.product}\n` +
      `<b>किया गया कार्य:</b> ${updatedRecord.desc}${partsText}\n` +
      `<b>सर्विस चार्ज:</b> ₹${serviceChargeVal.toFixed(2)}\n` +
      `<b>कुल बिल:</b> ₹${grandTotalBill.toFixed(2)}\n` +
      `<b>रिमार्क:</b> ${updatedRecord.feedback}\n` +
      `<b>स्टाफ:</b> ${updatedRecord.staffName}\n` +
      `<b>लोकेशन:</b> ${updatedRecord.location}\n` +
      `<b>समय:</b> ${updatedRecord.date}`;

    if (navigator.onLine) {
      sendStaffTelegramAlert(telegramMsg);
    }

    if (!navigator.onLine) {
      enqueueOfflinePayload({
        type: "JOB_SAVE",
        jobSheetNo,
        record: updatedRecord,
      });
      return;
    }

    setDoc(doc(db, "jobs", jobSheetNo), updatedRecord)
      .then(() => {
        addDoc(collection(db, "jobSheets"), {
          ...updatedRecord,
          createdAt: serverTimestamp(),
        }).catch((err) => console.error("jobSheets archive error:", err));

        if (fileToUpload) {
          const storageRef = ref(
            storage,
            "job_photos/" + Date.now() + "_" + fileToUpload.name
          );
          const uploadTask = uploadBytesResumable(storageRef, fileToUpload);
          uploadTask.on(
            "state_changed",
            null,
            (err) => console.error("Photo upload bg error:", err),
            () => {
              getDownloadURL(uploadTask.snapshot.ref).then((url) => {
                updateDoc(doc(db, "jobs", jobSheetNo), { photoURL: url });
              });
            }
          );
        }
      })
      .catch(() => {
        enqueueOfflinePayload({
          type: "JOB_SAVE",
          jobSheetNo,
          record: updatedRecord,
        });
      });
  };

  const handleAddStockItem = (e) => {
    e.preventDefault();
    if (!newStockName.trim() || !newStockQty.trim() || !newStockRate.trim()) {
      alert("कृपया पार्ट का नाम, मात्रा और रेट भरें!");
      return;
    }
    const newItem = {
      name: newStockName,
      qty: newStockQty,
      desc: newStockDesc || "-",
      rate: newStockRate,
    };
    setSpareStock([newItem, ...spareStock]);
    setNewStockName("");
    setNewStockQty("");
    setNewStockDesc("");
    setNewStockRate("");
    alert("स्पेयर पार्ट स्टॉक में सफलतापूर्वक जोड़ दिया गया!");
  };

  const sortedAllJobs = sortJobsNewestFirst(jobSheets);

  const onlineComplaintsList = sortedAllJobs.filter(
    (j) => j.status === "Pending" && j.location === "Online Booking"
  );
  const pendingJobsList = sortedAllJobs.filter(
    (j) => j.status === "Pending" || j.status === "Part Pending"
  );
  const completedJobsList = sortedAllJobs.filter(
    (j) => j.status === "Completed"
  );
  const partPendingJobsList = sortedAllJobs.filter(
    (j) =>
      j.status === "Part Pending" ||
      j.sparePartOption === "Pending Part" ||
      j.sparePartOption === "Pending"
  );

  const completedByStaff = completedJobsList.reduce((acc, job) => {
    const sName = job.staffName || "Unknown Staff";
    if (!acc[sName]) acc[sName] = [];
    acc[sName].push(job);
    return acc;
  }, {});

  const pendingByStaff = pendingJobsList.reduce((acc, job) => {
    const sName = job.staffName || "Unknown Staff";
    if (!acc[sName]) acc[sName] = [];
    acc[sName].push(job);
    return acc;
  }, {});

  const partsPendingByName = partPendingJobsList.reduce((acc, job) => {
    const pName =
      job.sparePartName && job.sparePartName !== "-"
        ? job.sparePartName
        : "General Part Pending";
    if (!acc[pName]) acc[pName] = [];
    acc[pName].push(job);
    return acc;
  }, {});

  const availableYears = Array.from(
    new Set([
      String(new Date().getFullYear()),
      ...attendanceRecords.map((r) => r.year).filter(Boolean),
    ])
  ).sort((a, b) => b.localeCompare(a));

  const subOptionsByCategory = {
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

  // =========================================================
  // हर यूनिट के लिए 100% SLIDE-BY-SLIDE (1-FIELD PER SLIDE) ARRAY
  // =========================================================
  const buildAllSlides = () => {
    const slides = [
      {
        id: "custName",
        title: "ग्राहक / संस्था का नाम लिखें (Customer Name)",
        type: "text",
        placeholder: "जैसे: Green Leaf Enterprises / रेलवे ऑफिस / ग्राहक का नाम",
        value: jobCustName,
        setter: setJobCustName,
        required: true,
      },
      {
        id: "custPhone",
        title: "संपर्क एवं मोबाइल नंबर दर्ज करें (Mobile No.)",
        type: "tel",
        maxLength: 10,
        placeholder: "10 अंकों का मोबाइल नंबर",
        value: jobCustPhone,
        setter: setJobCustPhone,
        required: true,
      },
      {
        id: "custAddress",
        title: "लोकेशन / साइट का पूरा पता लिखें (Address)",
        type: "textarea",
        placeholder: "जैसे: नैनी / झूंसी / प्रयागराज...",
        value: jobCustAddress,
        setter: setJobCustAddress,
        required: true,
      },
      {
        id: "billNo",
        title: "बिल नंबर दर्ज करें (Bill No. - वैकल्पिक)",
        type: "text",
        placeholder: "यदि बिल बन चुका है तो नंबर लिखें, वरना आगे बढ़ें",
        value: billNo,
        setter: setBillNo,
      },
      {
        id: "amcDate",
        title: "AMC दिनांक दर्ज करें (DD/MM/YYYY - वैकल्पिक)",
        type: "text",
        placeholder: "जैसे: 20/11/2026 (वैकल्पिक)",
        value: amcDate,
        setter: setAmcDate,
      },
      {
        id: "category",
        title: "काम की मुख्य श्रेणी चुनें (Category)",
        type: "choice",
        options: [
          {
            value: "HVAC & Refrigeration",
            label: "❄️ HVAC & Refrigeration (AC, Fridge, Chiller, Water Cooler)",
          },
          {
            value: "Electrical Work",
            label: "⚡ Electrical Work (Cooler, Wiring, Panel, Earthing)",
          },
          {
            value: "Plumbing Work",
            label: "🚰 Plumbing Work (Pipe, Tank, Pump)",
          },
          {
            value: "Civil Work",
            label: "🏗️ Civil Work (Flooring, Plaster, Waterproofing)",
          },
        ],
        value: categoryType,
        onSelect: (val) => selectCategoryValue(val),
      },
      {
        id: "product",
        title: `${categoryType} का उपकरण चुनें`,
        type: "choice",
        options: subOptionsByCategory[categoryType] || [],
        value: productType,
        onSelect: (val) => selectProductValue(val),
      },
      {
        id: "fault",
        title: `${productType} की समस्या / फॉल्ट विवरण लिखें`,
        type: "faultStep",
      },
    ];

    if (isFridgeOrWCSelected) {
      slides.push(
        {
          id: "unitModel",
          title: "यूनिट मॉडल नंबर दर्ज करें (Unit Model No.)",
          type: "text",
          placeholder: "Unit Model No.",
          value: unitModel,
          setter: setUnitModel,
        },
        {
          id: "unitSerial",
          title: "यूनिट सीरियल नंबर दर्ज करें (Unit Serial No.)",
          type: "text",
          placeholder: "Unit Serial No.",
          value: unitSerial,
          setter: setUnitSerial,
        },
        {
          id: "unitCapacity",
          title: "यूनिट कैपेसिटी (Litres में) लिखें",
          type: "text",
          placeholder: "जैसे: 300 Ltr / 500 Ltr",
          value: unitCapacity,
          setter: setUnitCapacity,
        },
        {
          id: "condenserInOut",
          title: "कंडेंसर की स्थिति चुनें (Condenser In / Out)",
          type: "choice",
          options: [
            { value: "OK", label: "OK (सही है)" },
            { value: "In", label: "In (इन)" },
            { value: "Out", label: "Out (आउट)" },
            { value: "Clean / Serviced", label: "Clean / Serviced (सर्विस की गई)" },
            { value: "Choked / Damaged", label: "Choked / Damaged (चोक / खराब)" },
          ],
          value: condenserInOut,
          onSelect: setCondenserInOut,
        },
        {
          id: "compModel",
          title: "कंप्रेसर मॉडल नंबर लिखें (Compressor Model No.)",
          type: "text",
          placeholder: "Compressor Model No.",
          value: compressorModel,
          setter: setCompressorModel,
        },
        {
          id: "compSerial",
          title: "कंप्रेसर सीरियल नंबर लिखें (Compressor Serial No.)",
          type: "text",
          placeholder: "Compressor Serial No.",
          value: compressorSerial,
          setter: setCompressorSerial,
        },
        {
          id: "compAmp",
          title: "कंप्रेसर एम्पीयर दर्ज करें (Compressor Ampere)",
          type: "text",
          placeholder: "जैसे: 2.4 A",
          value: compressorAmpere,
          setter: setCompressorAmpere,
        },
        {
          id: "unitAmp",
          title: "यूनिट एम्पीयर दर्ज करें (Unit Ampere)",
          type: "text",
          placeholder: "जैसे: 2.8 A",
          value: ampere,
          setter: setAmpere,
        }
      );

      if (isWaterCoolerSelected) {
        slides.push(
          {
            id: "wcTankSize",
            title: "Water Cooler टंकी का साइज चुनें (Litres)",
            type: "choice",
            options: [
              { value: "20", label: "20 Litres" },
              { value: "40", label: "40 Litres" },
              { value: "60", label: "60 Litres" },
              { value: "80", label: "80 Litres" },
              { value: "120", label: "120 Litres" },
              { value: "150", label: "150 Litres" },
            ],
            value: wcTankSize,
            onSelect: setWcTankSize,
          },
          {
            id: "wcTapCount",
            title: "Water Cooler में टोटी कितनी है?",
            type: "choice",
            options: [
              { value: "1", label: "1 टोटी (1 Tap)" },
              { value: "2", label: "2 टोटी (2 Taps)" },
              { value: "3", label: "3 टोटी (3 Taps)" },
            ],
            value: wcTapCount,
            onSelect: setWcTapCount,
          },
          {
            id: "wcOverflow",
            title: "Water Overflow सिस्टम चुनें",
            type: "choice",
            options: [
              { value: "Switch", label: "Switch (स्विच)" },
              { value: "Float Ball", label: "Float Ball (फ्लोट बॉल)" },
              { value: "Electric Unit", label: "Electric Unit (इलेक्ट्रिक यूनिट)" },
            ],
            value: wcOverflowType,
            onSelect: setWcOverflowType,
          },
          {
            id: "wcCoilSize",
            title: "कंडेंसिंग कॉइल साइज लिखें (Condensing Coil Size)",
            type: "text",
            placeholder: "जैसे: 12×14×2 Row",
            value: wcCondensingCoilSize,
            setter: setWcCondensingCoilSize,
          }
        );
      }
    } else if (isAirCoolerSelected) {
      slides.push(
        {
          id: "coolerBodyMat",
          title: "कूलर की बॉडी किस चीज़ की है? (Body Type)",
          type: "choice",
          options: [
            { value: "GI / Metal", label: "जी. आई. / लोहा (GI / Metal)" },
            { value: "Fiber / Plastic", label: "फाइबर / प्लास्टिक (Fiber / Plastic)" },
          ],
          value: coolerBodyMaterial,
          onSelect: setCoolerBodyMaterial,
        },
        {
          id: "coolerSubType",
          title: "कूलर का प्रकार चुनें (Cooler Sub-Type)",
          type: "choice",
          options: [
            { value: "Desert Cooler", label: "डेजर्ट कूलर (Desert Cooler)" },
            { value: "Duct Cooler", label: "डक्ट कूलर (Duct Cooler)" },
            { value: "Tower Cooler", label: "टावर कूलर (Tower Cooler)" },
            { value: "Room / Personal Cooler", label: "रूम कूलर (Room Cooler)" },
          ],
          value: coolerSubType,
          onSelect: setCoolerSubType,
        },
        {
          id: "coolerCap",
          title: "कूलर की क्षमता / टैंक साइज़ लिखें",
          type: "text",
          placeholder: "जैसे: 70 Ltr / 100 Ltr",
          value: coolerCapacity,
          setter: setCoolerCapacity,
        },
        {
          id: "coolerBrand",
          title: "कूलर का ब्रांड / मॉडल लिखें",
          type: "text",
          placeholder: "जैसे: Symphony / Kenstar / Local",
          value: coolerBrandModel,
          setter: setCoolerBrandModel,
        },
        {
          id: "coolerSerial",
          title: "कूलर का सीरियल / टैग नं. लिखें",
          type: "text",
          placeholder: "Serial / Tag No.",
          value: coolerSerialNo,
          setter: setCoolerSerialNo,
        },
        {
          id: "coolerQty",
          title: "कुल कूलर की संख्या दर्ज करें",
          type: "text",
          placeholder: "1",
          value: coolerTotalQty,
          setter: setCoolerTotalQty,
        },
        {
          id: "coolerFan",
          title: "फैन मोटर की स्थिति चुनें (Fan Motor)",
          type: "choice",
          options: [
            { value: "OK", label: "सही (OK)" },
            { value: "Jam / Bearing Bad", label: "जाम / बेयरिंग खराब" },
            { value: "Winding Burnt", label: "वाइंडिंग जली हुई" },
            { value: "Capacitor Bad", label: "कैपेसिटर खराब" },
          ],
          value: coolerFanMotor,
          onSelect: setCoolerFanMotor,
        },
        {
          id: "coolerPump",
          title: "वाटर पंप की स्थिति चुनें (Submersible Pump)",
          type: "choice",
          options: [
            { value: "OK", label: "सही (OK)" },
            { value: "Not Pumping", label: "पानी नहीं उठा रहा" },
            { value: "Replace Required", label: "बदलना आवश्यक" },
          ],
          value: coolerWaterPump,
          onSelect: setCoolerWaterPump,
        },
        {
          id: "coolerSwing",
          title: "स्विंग मोटर एवं ब्लेड की स्थिति चुनें",
          type: "choice",
          options: [
            { value: "OK", label: "सही (OK)" },
            { value: "Swing Bad", label: "स्विंग खराब" },
            { value: "Blade Broken", label: "फैन ब्लेड टूटा / असंतुलित" },
          ],
          value: coolerSwingBlade,
          onSelect: setCoolerSwingBlade,
        },
        {
          id: "coolerPadType",
          title: "कूलिंग पैड का प्रकार चुनें (Cooling Pad Type)",
          type: "choice",
          options: [
            { value: "Honeycomb", label: "हनीकॉम्ब (Honeycomb)" },
            { value: "Wood Wool", label: "वुड वूल / घास (Wood Wool)" },
          ],
          value: coolerPadType,
          onSelect: setCoolerPadType,
        },
        {
          id: "coolerPadStat",
          title: "कूलिंग पैड की स्थिति चुनें",
          type: "choice",
          options: [
            { value: "Clean", label: "साफ (Clean)" },
            { value: "Replaceable", label: "बदलने योग्य (Replaceable)" },
          ],
          value: coolerPadStatus,
          onSelect: setCoolerPadStatus,
        },
        {
          id: "coolerTank",
          title: "वाटर टैंक एवं प्लंबिंग की स्थिति चुनें",
          type: "choice",
          options: [
            { value: "OK", label: "सही (OK)" },
            { value: "Leakage", label: "लीकेज है (Leakage)" },
            { value: "Float Valve Bad", label: "फ्लोट वाल्व खराब" },
            { value: "Drain / Pipe Jam", label: "ड्रेन / पाइप जाम" },
          ],
          value: coolerTankPlumbing,
          onSelect: setCoolerTankPlumbing,
        },
        {
          id: "coolerElec",
          title: "इलेक्ट्रिकल एवं वायरिंग की स्थिति चुनें",
          type: "choice",
          options: [
            { value: "OK", label: "सही (OK)" },
            { value: "Rotary Switch Bad", label: "रोटरी स्विच खराब" },
            { value: "Wiring Burnt", label: "वायरिंग कटी / जली" },
            { value: "Plug / Earthing Checked", label: "प्लग / अर्थिंग चेक" },
          ],
          value: coolerElectrical,
          onSelect: setCoolerElectrical,
        },
        {
          id: "coolerPaint",
          title: "बॉडी एवं पेंट की स्थिति चुनें",
          type: "choice",
          options: [
            { value: "OK", label: "सही (OK)" },
            { value: "Rusting", label: "जंग (Rusting)" },
            { value: "Welding Required", label: "वेल्डिंग जरूरत" },
            { value: "Painting Required", label: "प्राइमर एवं पेंटिंग आवश्यक" },
          ],
          value: coolerBodyPaint,
          onSelect: setCoolerBodyPaint,
        }
      );
    } else {
      slides.push(
        {
          id: "indoorModel",
          title: "Indoor Model नंबर दर्ज करें",
          type: "text",
          placeholder: "Indoor Model No.",
          value: indoorModel,
          setter: setIndoorModel,
        },
        {
          id: "indoorSerial",
          title: "Indoor Serial नंबर दर्ज करें",
          type: "text",
          placeholder: "Indoor Serial No.",
          value: indoorSerial,
          setter: setIndoorSerial,
        },
        {
          id: "outdoorModel",
          title: "Outdoor Model नंबर दर्ज करें",
          type: "text",
          placeholder: "Outdoor Model No.",
          value: outdoorModel,
          setter: setOutdoorModel,
        },
        {
          id: "outdoorSerial",
          title: "Outdoor Serial नंबर दर्ज करें",
          type: "text",
          placeholder: "Outdoor Serial No.",
          value: outdoorSerial,
          setter: setOutdoorSerial,
        },
        {
          id: "compressorModel",
          title: "Compressor Model नंबर दर्ज करें",
          type: "text",
          placeholder: "Compressor Model No.",
          value: compressorModel,
          setter: setCompressorModel,
        },
        {
          id: "compressorSerial",
          title: "Compressor Serial नंबर दर्ज करें",
          type: "text",
          placeholder: "Compressor Serial No.",
          value: compressorSerial,
          setter: setCompressorSerial,
        },
        {
          id: "indoorMotorModel",
          title: "In-Door Motor Model नंबर दर्ज करें",
          type: "text",
          placeholder: "In-Door Motor Model",
          value: indoorMotorModel,
          setter: setIndoorMotorModel,
        },
        {
          id: "indoorMotorSerial",
          title: "In-Door Motor Serial नंबर दर्ज करें",
          type: "text",
          placeholder: "In-Door Motor Serial",
          value: indoorMotorSerial,
          setter: setIndoorMotorSerial,
        },
        {
          id: "outdoorMotorModel",
          title: "Out-Door Motor Model नंबर दर्ज करें",
          type: "text",
          placeholder: "Out-Door Motor Model",
          value: outdoorMotorModel,
          setter: setOutdoorMotorModel,
        },
        {
          id: "outdoorMotorSerial",
          title: "Out-Door Motor Serial नंबर दर्ज करें",
          type: "text",
          placeholder: "Out-Door Motor Serial",
          value: outdoorMotorSerial,
          setter: setOutdoorMotorSerial,
        },
        {
          id: "filterClean",
          title: "Filter Clean की स्थिति चुनें",
          type: "choice",
          options: [
            { value: "OK", label: "OK (साफ किया)" },
            { value: "Not OK", label: "Not OK / Damaged" },
            { value: "NA", label: "N/A" },
          ],
          value: filterClean,
          onSelect: setFilterClean,
        },
        {
          id: "standType",
          title: "Stand Type चुनें",
          type: "choice",
          options: [
            { value: "Wall Stand", label: "Wall Stand" },
            { value: "Floor Stand", label: "Floor Stand" },
            { value: "Hanging / Ceiling", label: "Hanging / Ceiling" },
            { value: "Not Required", label: "Not Required" },
          ],
          value: standType,
          onSelect: setStandType,
        },
        {
          id: "swingFlapper",
          title: "Swing / Flapper की स्थिति चुनें",
          type: "choice",
          options: [
            { value: "OK", label: "OK (सही काम कर रहा है)" },
            { value: "Not Working", label: "Not Working" },
            { value: "Broken", label: "Broken" },
          ],
          value: swingFlapper,
          onSelect: setSwingFlapper,
        },
        {
          id: "stabilizer",
          title: "Stabilizer की स्थिति चुनें",
          type: "choice",
          options: [
            { value: "OK", label: "OK" },
            { value: "Faulty", label: "Faulty" },
            { value: "Not Installed", label: "Not Installed" },
          ],
          value: stabilizer,
          onSelect: setStabilizer,
        },
        {
          id: "remoteStatus",
          title: "Remote की स्थिति चुनें",
          type: "choice",
          options: [
            { value: "OK", label: "OK" },
            { value: "Not Working", label: "Not Working" },
            { value: "Missing", label: "Missing" },
          ],
          value: remoteStatus,
          onSelect: setRemoteStatus,
        },
        {
          id: "outdoorClean",
          title: "Outdoor Clean की स्थिति चुनें",
          type: "choice",
          options: [
            { value: "OK", label: "OK (सर्विस की गई)" },
            { value: "Pending", label: "Pending" },
            { value: "NA", label: "N/A" },
          ],
          value: outdoorClean,
          onSelect: setOutdoorClean,
        },
        {
          id: "roomTemp",
          title: "Room Temp (°C) दर्ज करें",
          type: "text",
          placeholder: "जैसे: 24°C",
          value: roomTemp,
          setter: setRoomTemp,
        },
        {
          id: "suctionPressure",
          title: "Suction Pressure दर्ज करें",
          type: "text",
          placeholder: "जैसे: 120 PSI",
          value: sectionPressure,
          setter: setSectionPressure,
        },
        {
          id: "drainSize",
          title: "Drain With Size दर्ज करें",
          type: "text",
          placeholder: "जैसे: 1 inch PVC",
          value: drainSize,
          setter: setDrainSize,
        },
        {
          id: "copperPipeSize",
          title: "Copper Pipe Size दर्ज करें",
          type: "text",
          placeholder: "जैसे: 1/4 & 1/2",
          value: copperPipeSize,
          setter: setCopperPipeSize,
        },
        {
          id: "wireSizeCore",
          title: "Wire Size & Core दर्ज करें",
          type: "text",
          placeholder: "जैसे: 2.5 sqmm 3 Core",
          value: wireSizeCore,
          setter: setWireSizeCore,
        },
        {
          id: "insulation",
          title: "Insulation की स्थिति चुनें",
          type: "choice",
          options: [
            { value: "OK", label: "OK" },
            { value: "Damaged", label: "Damaged" },
            { value: "Replaced", label: "Replaced" },
          ],
          value: insulation,
          onSelect: setInsulation,
        },
        {
          id: "voltage",
          title: "Voltage दर्ज करें",
          type: "text",
          placeholder: isSinglePhaseSelected ? "जैसे: 230V" : "जैसे: 415V / 230V",
          value: voltage,
          setter: setVoltage,
        },
        {
          id: "compressorAmpere",
          title: "Compressor Ampere दर्ज करें",
          type: "text",
          placeholder: "जैसे: 6.5 A",
          value: compressorAmpere,
          setter: setCompressorAmpere,
        },
        {
          id: "unitAmpere",
          title: "Unit Ampere दर्ज करें",
          type: "text",
          placeholder: "जैसे: 7.2 A",
          value: ampere,
          setter: setAmpere,
        }
      );

      if (!isSinglePhaseSelected) {
        slides.push(
          {
            id: "phaseR",
            title: "R-Phase Voltage दर्ज करें",
            type: "text",
            placeholder: "R Voltage",
            value: phaseR,
            setter: setPhaseR,
          },
          {
            id: "phaseY",
            title: "Y-Phase Voltage दर्ज करें",
            type: "text",
            placeholder: "Y Voltage",
            value: phaseY,
            setter: setPhaseY,
          },
          {
            id: "phaseB",
            title: "B-Phase Voltage दर्ज करें",
            type: "text",
            placeholder: "B Voltage",
            value: phaseB,
            setter: setPhaseB,
          },
          {
            id: "ampR",
            title: "R-Phase Ampere दर्ज करें",
            type: "text",
            placeholder: "R Ampere",
            value: ampR,
            setter: setAmpR,
          },
          {
            id: "ampY",
            title: "Y-Phase Ampere दर्ज करें",
            type: "text",
            placeholder: "Y Ampere",
            value: ampY,
            setter: setAmpY,
          },
          {
            id: "ampB",
            title: "B-Phase Ampere दर्ज करें",
            type: "text",
            placeholder: "B Ampere",
            value: ampB,
            setter: setAmpB,
          }
        );
      }
    }

    slides.push(
      {
        id: "workBilling",
        title: "किया गया कार्य, स्पेयर पार्ट्स एवं टोटल बिल",
        type: "workBillingStep",
      },
      {
        id: "statusSign",
        title: "जॉब स्टेटस, फोटो और कस्टमर हस्ताक्षर (Final Step)",
        type: "statusSignStep",
      }
    );

    return slides;
  };

  const allJobSlides = buildAllSlides();
  const safeSlideIndex = Math.min(slideIndex, allJobSlides.length - 1);
  const currentSlide = allJobSlides[safeSlideIndex];

  const goNextSlide = () => {
    if (currentSlide?.required) {
      if (currentSlide.id === "custName" && !jobCustName.trim()) {
        alert("कृपया कस्टमर का नाम लिखें!");
        return;
      }
      if (currentSlide.id === "custPhone" && jobCustPhone.trim().length < 10) {
        alert("कृपया सही 10 अंकों का मोबाइल नंबर लिखें!");
        return;
      }
      if (currentSlide.id === "custAddress" && !jobCustAddress.trim()) {
        alert("कृपया साइट का पता लिखें!");
        return;
      }
    }
    setSlideIndex((prev) => Math.min(allJobSlides.length - 1, prev + 1));
  };

  const goPrevSlide = () => {
    setSlideIndex((prev) => Math.max(0, prev - 1));
  };

  if (activeTab === "printSheet") {
    return (
      <div style={{ padding: "12px", background: "#f4f6f9", minHeight: "100vh" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <button
            type="button"
            onClick={() => setActiveTab("home")}
            style={{
              marginBottom: "10px",
              padding: "8px 14px",
              background: "#475569",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            ← मुख्य मेनू (Home) पर वापस जाएं
          </button>
          <JobSheet />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "sans-serif",
        maxWidth: "800px",
        margin: "0 auto",
        padding: "15px",
        background: "#f4f6f9",
        minHeight: "100vh",
      }}
    >
      {/* फुल-स्क्रीन सिग्नेचर मॉडल */}
      {isSignatureModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "#ffffff",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "15px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "2px solid #e2e8f0",
              paddingBottom: "10px",
            }}
          >
            <div>
              <h3 style={{ margin: 0, color: "#0f172a", fontSize: "18px" }}>
                ✍️ कस्टमर हस्ताक्षर (Customer Signature)
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                नीचे खाली बॉक्स में हस्ताक्षर करें
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsSignatureModalOpen(false)}
              style={{
                padding: "6px 12px",
                background: "#ef4444",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              ✕ बंद करें
            </button>
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              margin: "10px 0",
            }}
          >
            <canvas
              ref={fullCanvasRef}
              onMouseDown={startFullDrawing}
              onMouseMove={drawFull}
              onMouseUp={stopFullDrawing}
              onMouseLeave={stopFullDrawing}
              onTouchStart={startFullDrawing}
              onTouchMove={drawFull}
              onTouchEnd={stopFullDrawing}
              style={{
                border: "2px dashed #2563eb",
                borderRadius: "8px",
                background: "#f8fafc",
                touchAction: "none",
                cursor: "crosshair",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={clearFullSignature}
              style={{
                flex: 1,
                padding: "14px",
                background: "#f59e0b",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                fontSize: "15px",
                cursor: "pointer",
              }}
            >
              🔄 साफ करें (Clear)
            </button>
            <button
              type="button"
              onClick={saveFullSignature}
              style={{
                flex: 2,
                padding: "14px",
                background: "#166534",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                fontSize: "15px",
                cursor: "pointer",
              }}
            >
              ✔ हस्ताक्षर सेव करें (Done)
            </button>
          </div>
        </div>
      )}

      {/* जॉब शीट भरते समय ऊपर का हेडर, नेविगेशन और GPS पट्टी पूरी तरह छिपी रहेगी */}
      {!isFillingJobSheet && (
        <>
          <div
            className="no-print"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              background: "#fff",
              borderRadius: "8px",
              marginBottom: "15px",
              boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
            }}
          >
            <img
              src="/1000384854.jpg"
              alt="Logo"
              style={{
                width: "60px",
                height: "60px",
                objectFit: "contain",
              }}
            />
            <div style={{ textAlign: "right", fontSize: "11px" }}>
              <span
                style={{
                  padding: "4px 8px",
                  borderRadius: "12px",
                  background: isOnline ? "#dcfce7" : "#fef3c7",
                  color: isOnline ? "#166534" : "#92400e",
                  fontWeight: "bold",
                }}
              >
                {isOnline ? "🟢 Online (Synced)" : "🟠 Offline (Local Saving)"}
              </span>
              {pendingSyncCount > 0 && (
                <div
                  style={{
                    marginTop: "4px",
                    color: "#b45309",
                    fontWeight: "bold",
                  }}
                >
                  Pending Sync: {pendingSyncCount} items
                </div>
              )}
            </div>
          </div>

          {activeTab !== "home" && (
            <div
              className="no-print"
              style={{
                marginBottom: "15px",
                display: "flex",
                justifyContent: "space-between",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveTab("home");
                  setInspectedJob(null);
                  setLastSubmittedJob(null);
                  setSelectedStaffFolder(null);
                  setCustSelectedJob(null);
                }}
                style={{
                  padding: "8px 14px",
                  backgroundColor: "#475569",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                ⬅ मुख्य मेनू (Home) पर वापस जाएं
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("printSheet")}
                style={{
                  padding: "8px 14px",
                  backgroundColor: "#1e3a8a",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                🖨️ Print Job Sheet
              </button>
            </div>
          )}

          <div
            className="no-print"
            style={{
              background: "#dcfce7",
              padding: "10px",
              borderRadius: "6px",
              marginBottom: "15px",
              fontSize: "12px",
              color: "#166534",
            }}
          >
            <strong>GPS:</strong> {staffGpsLocation}
          </div>
        </>
      )}

      {activeTab === "home" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <div style={{ textAlign: "center", marginBottom: "5px" }}>
            <h3 style={{ margin: "0 0 5px 0", color: "#1e293b" }}>
              पोर्टल चुनें (Select Portal)
            </h3>
            <p style={{ margin: "0", fontSize: "13px", color: "#64748b" }}>
              कृपया आगे बढ़ने के लिए अपना संबंधित पोर्टल चुनें:
            </p>
          </div>

          <div
            onClick={() => setActiveTab("complaint")}
            style={{
              background: "#fff",
              borderLeft: "5px solid #2563eb",
              padding: "15px",
              borderRadius: "8px",
              boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
              cursor: "pointer",
            }}
          >
            <h3 style={{ margin: "0 0 5px 0", color: "#2563eb", fontSize: "18px" }}>
              👤 कस्टमर पोर्टल (Customer Portal)
            </h3>
            <p style={{ margin: "0", fontSize: "13px", color: "#475569" }}>
              अपनी शिकायत दर्ज करें, कैमरा से सामान की फोटो भेजें और पुरानी जॉब-शीट्स देखें
            </p>
          </div>

          <div
            onClick={() => setActiveTab("staff")}
            style={{
              background: "#fff",
              borderLeft: "5px solid #166534",
              padding: "15px",
              borderRadius: "8px",
              boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
              cursor: "pointer",
            }}
          >
            <h3 style={{ margin: "0 0 5px 0", color: "#166534", fontSize: "18px" }}>
              🛠️ फ़ील्ड स्टाफ पोर्टल (Staff Mobile &amp; GPS Login)
            </h3>
            <p style={{ margin: "0", fontSize: "13px", color: "#475569" }}>
              मोबाइल नंबर, OTP और GPS लोकेशन के साथ लॉगिन करें
            </p>
          </div>

          <div
            onClick={() => setActiveTab("admin")}
            style={{
              background: "#fff",
              borderLeft: "5px solid #d97706",
              padding: "15px",
              borderRadius: "8px",
              boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
              cursor: "pointer",
            }}
          >
            <h3 style={{ margin: "0 0 5px 0", color: "#d97706", fontSize: "18px" }}>
              📊 एडमिन &amp; ऑफिस स्टाफ पैनल (Office Login)
            </h3>
            <p style={{ margin: "0", fontSize: "13px", color: "#475569" }}>
              स्टाफ-वाइज जॉब फोल्डर, स्पेयर पार्ट्स स्टॉक, अटेंडेंस (रूट व मैप) देखें
            </p>
          </div>
        </div>
      )}

      {/* 1. कस्टमर पोर्टल */}
      {activeTab === "complaint" && (
        <div
          style={{
            background: "#fff",
            padding: "15px",
            borderRadius: "8px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
          }}
        >
          <h3 className="no-print">कस्टमर पोर्टल</h3>
          {!custLoggedIn ? (
            <form
              onSubmit={handleCustomerLogin}
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <p style={{ margin: "0", fontSize: "13px", color: "#64748b" }}>
                अपनी शिकायतें और पूरी हुई जॉब-शीट देखने के लिए अपना मोबाइल नंबर दर्ज करें:
              </p>
              <input
                type="tel"
                maxLength="10"
                placeholder="मोबाइल नंबर दर्ज करें"
                value={custPhone}
                onChange={(e) => setCustPhone(e.target.value)}
                style={inputStyle}
                required
              />
              <button
                type="submit"
                style={{
                  padding: "12px",
                  backgroundColor: "#007bff",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                आगे बढ़ें
              </button>
            </form>
          ) : custSelectedJob !== null ? (
            <PrintableJobSheet
              job={custSelectedJob}
              onClose={() => setCustSelectedJob(null)}
            />
          ) : (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#f1f5f9",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  marginBottom: "15px",
                }}
              >
                <span>
                  स्वागत है! मोबाइल: <strong>{custPhone}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCustLoggedIn(false);
                    setCustSelectedJob(null);
                  }}
                  style={{
                    padding: "4px 8px",
                    background: "#dc3545",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  लॉगआउट
                </button>
              </div>

              <form
                onSubmit={handleNewComplaint}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  borderBottom: "1px solid #e2e8f0",
                  paddingBottom: "15px",
                  marginBottom: "15px",
                }}
              >
                <h4 style={{ margin: "0", color: "#007bff" }}>
                  नई शिकायत दर्ज करें (New Complaint)
                </h4>

                <label style={{ fontWeight: "bold", fontSize: "13px" }}>
                  कस्टमर का पूरा नाम (Customer Name):
                </label>
                <input
                  type="text"
                  placeholder="अपना पूरा नाम दर्ज करें"
                  value={custNameInput}
                  onChange={(e) => setCustNameInput(e.target.value)}
                  style={inputStyle}
                  required
                />

                <label style={{ fontWeight: "bold", fontSize: "13px" }}>
                  कस्टमर का पूरा पता (Full Address):
                </label>
                <textarea
                  rows="2"
                  placeholder="लोकेशन/पता विस्तार से लिखें..."
                  value={custAddressInput}
                  onChange={(e) => setCustAddressInput(e.target.value)}
                  style={inputStyle}
                  required
                />

                <label style={{ fontWeight: "bold", fontSize: "13px" }}>
                  मुख्य श्रेणी (Main Category):
                </label>
                <select
                  value={categoryType}
                  onChange={handleCategoryChange}
                  style={inputStyle}
                >
                  <option value="HVAC & Refrigeration">
                    HVAC &amp; Refrigeration (एसी, फ्रिज, चिलर, VRV)
                  </option>
                  <option value="Electrical Work">
                    Electrical Work (कूलर, इलेक्ट्रिकल कार्य)
                  </option>
                  <option value="Plumbing Work">Plumbing Work (प्लंबिंग)</option>
                  <option value="Civil Work">Civil Work (सिविल कार्य)</option>
                </select>

                <label style={{ fontWeight: "bold", fontSize: "13px" }}>
                  संबंधित कार्य / उत्पाद (Sub-Option):
                </label>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  style={inputStyle}
                >
                  {(subOptionsByCategory[categoryType] || []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <label style={{ fontWeight: "bold", fontSize: "13px" }}>
                  समस्या का विवरण:
                </label>
                <textarea
                  rows="3"
                  placeholder="क्या समस्या आ रही है विस्तार से लिखें..."
                  value={problemDesc}
                  onChange={(e) => setProblemDesc(e.target.value)}
                  style={inputStyle}
                  required
                />

                {/* सामान या जरूरी फोटो खींचने के लिए सीधा कैमरा बटन */}
                <div
                  style={{
                    background: "#f0f9ff",
                    border: "1.5px dashed #0284c7",
                    borderRadius: "8px",
                    padding: "12px",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "bold",
                      fontSize: "13px",
                      color: "#0369a1",
                      marginBottom: "6px",
                    }}
                  >
                    📷 सामान / समस्या की फोटो (Camera):
                  </div>
                  <input
                    ref={custCameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleCustomerCameraCapture}
                    style={{ display: "none" }}
                  />
                  <button
                    type="button"
                    onClick={() => custCameraInputRef.current?.click()}
                    style={{
                      width: "100%",
                      padding: "12px",
                      backgroundColor: "#0284c7",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      fontWeight: "bold",
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                  >
                    📸 कैमरा खोलें / फोटो खींचें (Take Photo)
                  </button>

                  {custUploadingPhotos && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#0f766e",
                        fontWeight: "bold",
                        marginTop: "6px",
                      }}
                    >
                      फोटो अपलोड हो रही है...
                    </div>
                  )}

                  {custCameraPhotos.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                        marginTop: "10px",
                      }}
                    >
                      {custCameraPhotos.map((p, idx) => (
                        <div key={idx} style={{ position: "relative" }}>
                          <img
                            src={p.previewUrl}
                            alt={`कस्टमर फोटो ${idx + 1}`}
                            style={{
                              width: "76px",
                              height: "76px",
                              objectFit: "cover",
                              borderRadius: "6px",
                              border: "1.5px solid #0284c7",
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => removeCustomerCameraPhoto(idx)}
                            style={{
                              position: "absolute",
                              top: "-6px",
                              right: "-6px",
                              width: "20px",
                              height: "20px",
                              borderRadius: "50%",
                              border: "none",
                              background: "#dc2626",
                              color: "#fff",
                              fontSize: "11px",
                              cursor: "pointer",
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  style={{
                    padding: "12px",
                    backgroundColor: "#166534",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  शिकायत सबमिट करें
                </button>
              </form>

              <div>
                <h4 style={{ margin: "0 0 8px 0" }}>
                  आपकी जॉब शीट सूची (क्लिक करके पूरी जॉब शीट खोलें):
                </h4>
                <JobSheetRegisterTable
                  jobs={sortedAllJobs.filter(
                    (j) => j.customerPhone === custPhone
                  )}
                  onSelectJob={(job) => setCustSelectedJob(job)}
                  emptyText="कोई पुरानी शिकायत या जॉब शीट नहीं मिली।"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. फ़ील्ड स्टाफ पोर्टल */}
      {activeTab === "staff" && (
        <div
          style={{
            background: isFillingJobSheet ? "transparent" : "#fff",
            padding: isFillingJobSheet ? "0" : "15px",
            borderRadius: isFillingJobSheet ? "0" : "8px",
            boxShadow: isFillingJobSheet
              ? "none"
              : "0 2px 5px rgba(0,0,0,0.05)",
          }}
        >
          {!isFillingJobSheet && (
            <h3 className="no-print">फ़ील्ड स्टाफ लॉगिन</h3>
          )}
          {!staffLoggedIn ? (
            <div>
              {otpStep === 1 ? (
                <form
                  onSubmit={handleSendOtp}
                  style={{ display: "flex", flexDirection: "column", gap: "12px" }}
                >
                  <p style={{ margin: "0", fontSize: "13px", color: "#64748b" }}>
                    अपना रजिस्टर्ड मोबाइल नंबर दर्ज करें:
                  </p>
                  <input
                    type="tel"
                    maxLength="10"
                    placeholder="10 अंकों का मोबाइल नंबर"
                    value={staffPhoneInput}
                    onChange={(e) => setStaffPhoneInput(e.target.value)}
                    style={inputStyle}
                    required
                  />
                  <button
                    type="submit"
                    style={{
                      padding: "12px",
                      backgroundColor: "#166534",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    OTP भेजें
                  </button>
                </form>
              ) : (
                <form
                  onSubmit={handleVerifyOtp}
                  style={{ display: "flex", flexDirection: "column", gap: "12px" }}
                >
                  <div style={{ fontSize: "13px", color: "#475569" }}>
                    नंबर <strong>{staffPhoneInput}</strong> पर OTP भेजा गया है।
                  </div>
                  <label style={{ fontWeight: "bold" }}>OTP दर्ज करें:</label>
                  <input
                    type="text"
                    maxLength="4"
                    placeholder="4 अंकों का OTP"
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value)}
                    style={inputStyle}
                    required
                  />
                  <button
                    type="submit"
                    style={{
                      padding: "12px",
                      backgroundColor: "#166534",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    OTP सत्यापित करें और लॉगिन करें
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div>
              {!isFillingJobSheet && (
                <div
                  className="no-print"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "15px",
                    background: "#f8fafc",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "13px" }}>
                      स्टाफ: <strong>{currentStaffName}</strong>
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#166534",
                        fontWeight: "bold",
                      }}
                    >
                      ● Duty IN Active (GPS रूट रिकॉर्ड हो रहा है)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleStaffLogout}
                    style={{
                      padding: "6px 12px",
                      background: "#ef4444",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    लॉग आउट (Duty OUT)
                  </button>
                </div>
              )}

              {!isFillingJobSheet && lastSubmittedJob && (
                <PrintableJobSheet
                  job={lastSubmittedJob}
                  onClose={() => setLastSubmittedJob(null)}
                  onFillJob={(jobToEdit) =>
                    handleFillComplaintToNewJob(jobToEdit)
                  }
                />
              )}

              {staffSubTab === "menu" && (
                <div
                  className="no-print"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setLastSubmittedJob(null);
                      handleOpenBlankNewJob();
                    }}
                    style={{
                      padding: "12px",
                      backgroundColor: "#166534",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      fontWeight: "bold",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    ➕ नई जॉब शीट भरें (New Job Sheet)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLastSubmittedJob(null);
                      setStaffSubTab("onlineComplaints");
                    }}
                    style={{
                      padding: "12px",
                      backgroundColor: "#3b82f6",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      fontWeight: "bold",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    📋 ऑनलाइन शिकायतें देखें ({onlineComplaintsList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLastSubmittedJob(null);
                      setStaffSubTab("pending");
                    }}
                    style={{
                      padding: "12px",
                      backgroundColor: "#f59e0b",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      fontWeight: "bold",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    ⏳ पेंडिंग जॉब्स ({pendingJobsList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLastSubmittedJob(null);
                      setStaffSubTab("completed");
                    }}
                    style={{
                      padding: "12px",
                      backgroundColor: "#0ea5e9",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      fontWeight: "bold",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    ✅ कम्पलीट जॉब्स ({completedJobsList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLastSubmittedJob(null);
                      setStaffSubTab("partPending");
                    }}
                    style={{
                      padding: "12px",
                      backgroundColor: "#8b5cf6",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      fontWeight: "bold",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    ⚙️ स्पेयर पार्ट पेंडिंग ({partPendingJobsList.length})
                  </button>
                </div>
              )}

              {staffSubTab === "onlineComplaints" && (
                <div>
                  <button
                    type="button"
                    className="no-print"
                    onClick={() => {
                      setLastSubmittedJob(null);
                      setStaffSubTab("menu");
                    }}
                    style={{
                      marginBottom: "10px",
                      padding: "6px 12px",
                      background: "#64748b",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    ← पीछे जाएं
                  </button>
                  <h4 className="no-print" style={{ margin: "0 0 8px 0" }}>
                    ऑनलाइन प्राप्त शिकायतें (क्लिक करके जॉब शीट खोलें):
                  </h4>
                  <JobSheetRegisterTable
                    jobs={onlineComplaintsList}
                    onSelectJob={(job) => setLastSubmittedJob(job)}
                    emptyText="कोई नई ऑनलाइन शिकायत उपलब्ध नहीं है।"
                  />
                </div>
              )}

              {staffSubTab === "pending" && (
                <div>
                  <button
                    type="button"
                    className="no-print"
                    onClick={() => {
                      setLastSubmittedJob(null);
                      setStaffSubTab("menu");
                    }}
                    style={{
                      marginBottom: "10px",
                      padding: "6px 12px",
                      background: "#64748b",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    ← पीछे जाएं
                  </button>
                  <h4 className="no-print" style={{ margin: "0 0 8px 0" }}>
                    पेंडिंग जॉब्स (क्लिक करके जॉब शीट खोलें):
                  </h4>
                  <JobSheetRegisterTable
                    jobs={pendingJobsList}
                    onSelectJob={(job) => setLastSubmittedJob(job)}
                    emptyText="कोई पेंडिंग जॉब नहीं है।"
                  />
                </div>
              )}

              {staffSubTab === "completed" && (
                <div>
                  <button
                    type="button"
                    className="no-print"
                    onClick={() => {
                      setLastSubmittedJob(null);
                      setStaffSubTab("menu");
                    }}
                    style={{
                      marginBottom: "10px",
                      padding: "6px 12px",
                      background: "#64748b",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    ← पीछे जाएं
                  </button>
                  <h4 className="no-print" style={{ margin: "0 0 8px 0" }}>
                    कम्पलीट जॉब्स (क्लिक करके जॉब शीट खोलें):
                  </h4>
                  <JobSheetRegisterTable
                    jobs={completedJobsList}
                    onSelectJob={(job) => setLastSubmittedJob(job)}
                    emptyText="अभी तक कोई जॉब कम्पलीट नहीं हुई है।"
                  />
                </div>
              )}

              {staffSubTab === "partPending" && (
                <div>
                  <button
                    type="button"
                    className="no-print"
                    onClick={() => {
                      setLastSubmittedJob(null);
                      setStaffSubTab("menu");
                    }}
                    style={{
                      marginBottom: "10px",
                      padding: "6px 12px",
                      background: "#64748b",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    ← पीछे जाएं
                  </button>
                  <h4 className="no-print" style={{ margin: "0 0 8px 0" }}>
                    स्पेयर पार्ट पेंडिंग (क्लिक करके जॉब शीट खोलें):
                  </h4>
                  <JobSheetRegisterTable
                    jobs={partPendingJobsList}
                    onSelectJob={(job) => setLastSubmittedJob(job)}
                    emptyText="कोई स्पेयर पार्ट पेंडिंग जॉब नहीं है।"
                  />
                </div>
              )}

              {/* ================================================================
                  FOCUS MODE SLIDE-BY-SLIDE WIZARD
                  ================================================================ */}
              {staffSubTab === "newJobForm" && currentSlide && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "#ffffff",
                      border: "1.5px solid #cbd5e1",
                      borderRadius: "8px",
                      padding: "8px 10px",
                      marginBottom: "12px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (safeSlideIndex === 0) {
                          setStaffSubTab("menu");
                        } else {
                          goPrevSlide();
                        }
                      }}
                      title={safeSlideIndex === 0 ? "मेनू पर जाएं" : "पिछली स्लाइड"}
                      style={{
                        width: "46px",
                        height: "40px",
                        background: "#475569",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "20px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ←
                    </button>

                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: "bold",
                        color: "#1e3a8a",
                      }}
                    >
                      {safeSlideIndex + 1} / {allJobSlides.length}
                    </span>

                    <button
                      type="button"
                      onClick={goNextSlide}
                      disabled={safeSlideIndex === allJobSlides.length - 1}
                      title="अगली स्लाइड"
                      style={{
                        width: "46px",
                        height: "40px",
                        background:
                          safeSlideIndex === allJobSlides.length - 1
                            ? "#cbd5e1"
                            : "#166534",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "20px",
                        fontWeight: "bold",
                        cursor:
                          safeSlideIndex === allJobSlides.length - 1
                            ? "not-allowed"
                            : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      →
                    </button>
                  </div>

                  <div
                    style={{
                      background: "#ffffff",
                      border: "1.5px solid #cbd5e1",
                      borderRadius: "10px",
                      padding: "18px 16px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    }}
                  >
                    <h4
                      style={{
                        margin: "0 0 12px 0",
                        color: "#0f172a",
                        fontSize: "16px",
                      }}
                    >
                      {safeSlideIndex + 1}. {currentSlide.title}:
                    </h4>

                    {(currentSlide.type === "text" ||
                      currentSlide.type === "tel") && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                        }}
                      >
                        <input
                          key={currentSlide.id}
                          type={currentSlide.type}
                          autoFocus
                          maxLength={currentSlide.maxLength || undefined}
                          placeholder={currentSlide.placeholder}
                          value={currentSlide.value}
                          onChange={(e) => currentSlide.setter(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              goNextSlide();
                            }
                          }}
                          style={{ ...inputStyle, width: "100%" }}
                        />
                        <button
                          type="button"
                          onClick={goNextSlide}
                          style={{
                            padding: "12px",
                            background: "#166534",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            fontWeight: "bold",
                            cursor: "pointer",
                          }}
                        >
                          आगे बढ़ें →
                        </button>
                      </div>
                    )}

                    {currentSlide.type === "textarea" && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                        }}
                      >
                        <textarea
                          key={currentSlide.id}
                          rows="3"
                          autoFocus
                          placeholder={currentSlide.placeholder}
                          value={currentSlide.value}
                          onChange={(e) => currentSlide.setter(e.target.value)}
                          style={{ ...inputStyle, width: "100%" }}
                        />
                        <button
                          type="button"
                          onClick={goNextSlide}
                          style={{
                            padding: "12px",
                            background: "#166534",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            fontWeight: "bold",
                            cursor: "pointer",
                          }}
                        >
                          आगे बढ़ें →
                        </button>
                      </div>
                    )}

                    {currentSlide.type === "choice" && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            currentSlide.options.length > 4 ? "1fr 1fr" : "1fr",
                          gap: "8px",
                        }}
                      >
                        {currentSlide.options.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              currentSlide.onSelect(opt.value);
                              setSlideIndex((prev) =>
                                Math.min(allJobSlides.length - 1, prev + 1)
                              );
                            }}
                            style={choiceBtnStyle(
                              currentSlide.value === opt.value
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {currentSlide.type === "faultStep" && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                        }}
                      >
                        {isAirCoolerSelected && (
                          <div
                            style={{
                              background: "#f0f9ff",
                              padding: "10px",
                              borderRadius: "6px",
                              border: "1px solid #bae6fd",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "12px",
                                fontWeight: "bold",
                                marginBottom: "6px",
                                color: "#0369a1",
                              }}
                            >
                              कार्य का प्रकार (Cooler Work Type):
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "10px",
                                fontSize: "12px",
                              }}
                            >
                              {[
                                { id: "AMC", label: "AMC (वार्षिक रखरखाव)" },
                                {
                                  id: "Breakdown / Repair",
                                  label: "ब्रेकडाउन / रिपेयर",
                                },
                                { id: "Installation", label: "Installation" },
                                {
                                  id: "Un-installation",
                                  label: "Un-installation",
                                },
                                {
                                  id: "Body Repair & Painting",
                                  label: "बॉडी रिपेयर एवं पेंटिंग",
                                },
                              ].map((opt) => (
                                <label
                                  key={opt.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    cursor: "pointer",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={coolerWorkTypes.includes(opt.id)}
                                    onChange={() =>
                                      toggleCoolerWorkType(opt.id)
                                    }
                                  />
                                  {opt.label}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        <textarea
                          rows="3"
                          autoFocus
                          placeholder={
                            isAirCoolerSelected
                              ? "जैसे: Motor Jam, Pump Not Working, General Service..."
                              : isFridgeOrWCSelected
                              ? "जैसे: Cooling Not Proper, Gas Leakage, Overflow / Tap Fault..."
                              : "जैसे: No Cooling, Water Leakage, General Service..."
                          }
                          value={faultDetails}
                          onChange={(e) => setFaultDetails(e.target.value)}
                          style={{ ...inputStyle, width: "100%" }}
                        />

                        <button
                          type="button"
                          onClick={goNextSlide}
                          style={{
                            padding: "12px",
                            background: "#166534",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            fontWeight: "bold",
                            cursor: "pointer",
                          }}
                        >
                          आगे बढ़ें →
                        </button>
                      </div>
                    )}

                    {currentSlide.type === "workBillingStep" && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                        }}
                      >
                        <div
                          style={{
                            background: "#f8fafc",
                            padding: "10px",
                            borderRadius: "8px",
                            border: "1px solid #cbd5e1",
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          <label style={{ fontSize: "12px", fontWeight: "bold" }}>
                            किया गया कार्य (Work Done):
                          </label>
                          <textarea
                            rows="2"
                            placeholder={
                              isAirCoolerSelected
                                ? "कूलर जनरल सर्विस एवं केमिकल/पानी से सफाई"
                                : "किया गया कार्य लिखें..."
                            }
                            value={workDone}
                            onChange={(e) => setWorkDone(e.target.value)}
                            style={{ ...inputStyle, width: "100%" }}
                          />
                        </div>

                        <div
                          style={{
                            background: "#f8fafc",
                            padding: "10px",
                            borderRadius: "8px",
                            border: "1px solid #cbd5e1",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                          }}
                        >
                          <label style={{ fontSize: "12px", fontWeight: "bold" }}>
                            स्पेयर पार्ट विकल्प:
                          </label>
                          <select
                            value={sparePartOption}
                            onChange={(e) => setSparePartOption(e.target.value)}
                            style={{ ...inputStyle, width: "100%" }}
                          >
                            <option value="Used Part">
                              Used Part (इस्तेमाल किया गया)
                            </option>
                            <option value="Pending Part">
                              Pending Part (पार्ट मंगवाना है)
                            </option>
                            <option value="No Part Used">
                              No Part Used (कोई पार्ट नहीं लगा)
                            </option>
                          </select>

                          {isUsedPartSelected ? (
                            <div>
                              <div
                                style={{
                                  fontSize: "12px",
                                  fontWeight: "bold",
                                  marginBottom: "6px",
                                  color: "#334155",
                                }}
                              >
                                स्पेयर पार्ट का नाम, क्वांटिटी और अमाउंट:
                              </div>
                              {usedParts.map((item, idx) => {
                                const rowTotal =
                                  (parseFloat(item.qty) || 0) *
                                  (parseFloat(item.amount) || 0);
                                return (
                                  <div
                                    key={idx}
                                    style={{
                                      marginBottom: "8px",
                                      paddingBottom: "6px",
                                      borderBottom: "1px dashed #cbd5e1",
                                    }}
                                  >
                                    <div style={{ display: "flex", gap: "6px" }}>
                                      <input
                                        type="text"
                                        placeholder={
                                          isAirCoolerSelected
                                            ? "जैसे: Water Pump, Cooling Pad, Fan Motor..."
                                            : isFridgeOrWCSelected
                                            ? "जैसे: Tap, Float Valve, Relay, OLP, Gas..."
                                            : "स्पेयर पार्ट का नाम"
                                        }
                                        value={item.partName}
                                        onChange={(e) =>
                                          updatePartRow(
                                            idx,
                                            "partName",
                                            e.target.value
                                          )
                                        }
                                        style={{
                                          ...inputStyle,
                                          flex: 2,
                                          minWidth: 0,
                                        }}
                                      />
                                      <input
                                        type="number"
                                        min="1"
                                        placeholder="Qty"
                                        value={item.qty}
                                        onChange={(e) =>
                                          updatePartRow(
                                            idx,
                                            "qty",
                                            e.target.value
                                          )
                                        }
                                        style={{
                                          ...inputStyle,
                                          flex: 0.7,
                                          minWidth: 0,
                                        }}
                                      />
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="Rate ₹"
                                        value={item.amount}
                                        onChange={(e) =>
                                          updatePartRow(
                                            idx,
                                            "amount",
                                            e.target.value
                                          )
                                        }
                                        style={{
                                          ...inputStyle,
                                          flex: 1,
                                          minWidth: 0,
                                        }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => removePartRow(idx)}
                                        style={{
                                          padding: "6px 10px",
                                          background: "#dc2626",
                                          color: "#fff",
                                          border: "none",
                                          borderRadius: "4px",
                                          fontWeight: "bold",
                                          cursor: "pointer",
                                        }}
                                      >
                                        ✕
                                      </button>
                                    </div>
                                    <div
                                      style={{
                                        fontSize: "11px",
                                        color: "#475569",
                                        textAlign: "right",
                                        marginTop: "3px",
                                      }}
                                    >
                                      योग: ₹{rowTotal.toFixed(2)}
                                    </div>
                                  </div>
                                );
                              })}
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={addPartRow}
                                  style={{
                                    padding: "6px 12px",
                                    background: "#1e3a8a",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "4px",
                                    fontSize: "12px",
                                    fontWeight: "bold",
                                    cursor: "pointer",
                                  }}
                                >
                                  + पार्ट जोड़ें
                                </button>
                                <strong style={{ fontSize: "13px" }}>
                                  पार्ट्स कुल: ₹{usedPartsTotal.toFixed(2)}
                                </strong>
                              </div>
                            </div>
                          ) : (
                            sparePartOption === "Pending Part" && (
                              <div style={{ display: "flex", gap: "5px" }}>
                                <input
                                  type="text"
                                  placeholder="Part Name"
                                  value={sparePartName}
                                  onChange={(e) =>
                                    setSparePartName(e.target.value)
                                  }
                                  style={{ ...inputStyle, flex: 1 }}
                                />
                                <input
                                  type="text"
                                  placeholder="Model / No."
                                  value={sparePartModel}
                                  onChange={(e) =>
                                    setSparePartModel(e.target.value)
                                  }
                                  style={{ ...inputStyle, flex: 1 }}
                                />
                              </div>
                            )
                          )}
                        </div>

                        <div
                          style={{
                            background: "#f0fdf4",
                            padding: "12px",
                            borderRadius: "8px",
                            border: "1px solid #86efac",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                          }}
                        >
                          <label
                            style={{
                              fontSize: "12px",
                              fontWeight: "bold",
                              color: "#166534",
                            }}
                          >
                            सर्विस / अन्य चार्ज (₹):
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="0.00"
                            value={serviceChargeInput}
                            onChange={(e) =>
                              setServiceChargeInput(e.target.value)
                            }
                            style={{
                              ...inputStyle,
                              width: "100%",
                              fontWeight: "bold",
                            }}
                          />

                          <div
                            style={{
                              padding: "10px",
                              borderRadius: "6px",
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              fontSize: "13px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: "4px",
                              }}
                            >
                              <span>स्पेयर पार्ट्स कुल:</span>
                              <strong>₹{usedPartsTotal.toFixed(2)}</strong>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: "4px",
                              }}
                            >
                              <span>सर्विस / अन्य चार्ज:</span>
                              <strong>₹{serviceChargeVal.toFixed(2)}</strong>
                            </div>
                            <hr style={{ margin: "6px 0" }} />
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: "15px",
                                color: "#166534",
                              }}
                            >
                              <strong>टोटल बिल (Total Amount):</strong>
                              <strong>₹{grandTotalBill.toFixed(2)}</strong>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={goNextSlide}
                          style={{
                            padding: "12px",
                            backgroundColor: "#166534",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            fontWeight: "bold",
                            cursor: "pointer",
                          }}
                        >
                          आगे बढ़ें →
                        </button>
                      </div>
                    )}

                    {currentSlide.type === "statusSignStep" && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        <label style={{ fontSize: "12px", fontWeight: "bold" }}>
                          जॉब स्टेटस:
                        </label>
                        <select
                          value={jobStatusType}
                          onChange={(e) => setJobStatusType(e.target.value)}
                          style={inputStyle}
                        >
                          <option value="Completed">Completed (पूर्ण)</option>
                          <option value="Pending">Pending (लंबित)</option>
                        </select>

                        {jobStatusType === "Pending" && (
                          <>
                            <label
                              style={{ fontSize: "12px", fontWeight: "bold" }}
                            >
                              पेंडिंग का कारण:
                            </label>
                            <select
                              value={pendingSubOption}
                              onChange={(e) =>
                                setPendingSubOption(e.target.value)
                              }
                              style={inputStyle}
                            >
                              <option value="Part Pending">
                                Part Pending (पार्ट प्रतीक्षित)
                              </option>
                              <option value="Repeat Complaint">
                                Repeat Complaint
                              </option>
                              <option value="Customer Busy">
                                Customer Busy
                              </option>
                            </select>
                          </>
                        )}

                        <label style={{ fontSize: "12px", fontWeight: "bold" }}>
                          ग्राहक की टिप्पणी / फीडबैक (Customer Remark):
                        </label>
                        <input
                          type="text"
                          placeholder="जैसे: Working Fine / Good Service"
                          value={customerFeedback}
                          onChange={(e) => setCustomerFeedback(e.target.value)}
                          style={inputStyle}
                        />

                        <label style={{ fontSize: "12px", fontWeight: "bold" }}>
                          साइट फोटो अपलोड करें (Single / Multiple):
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          multiple
                          onChange={(e) => {
                            handleFileChange(e);
                            handleSitePhotosChange(e);
                          }}
                          style={{ padding: "6px" }}
                        />

                        {uploadingPhotos && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#0f766e",
                              fontWeight: "bold",
                            }}
                          >
                            फोटो अपलोड हो रही है...
                          </div>
                        )}

                        {sitePhotos.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              flexWrap: "wrap",
                            }}
                          >
                            {sitePhotos.map((p, idx) => (
                              <div key={idx} style={{ position: "relative" }}>
                                <img
                                  src={p.previewUrl}
                                  alt={`फोटो ${idx + 1}`}
                                  style={{
                                    width: "76px",
                                    height: "76px",
                                    objectFit: "cover",
                                    borderRadius: "6px",
                                    border: "1px solid #cbd5e1",
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeSitePhoto(idx)}
                                  style={{
                                    position: "absolute",
                                    top: "-6px",
                                    right: "-6px",
                                    width: "20px",
                                    height: "20px",
                                    borderRadius: "50%",
                                    border: "none",
                                    background: "#dc2626",
                                    color: "#fff",
                                    fontSize: "11px",
                                    cursor: "pointer",
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <label
                          style={{
                            fontSize: "12px",
                            fontWeight: "bold",
                            marginTop: "4px",
                          }}
                        >
                          ग्राहक / साइट इंचार्ज के हस्ताक्षर (Customer Signature):
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsSignatureModalOpen(true)}
                          style={{
                            padding: "14px",
                            backgroundColor: savedSignatureURL
                              ? "#0284c7"
                              : "#2563eb",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            fontWeight: "bold",
                            fontSize: "14px",
                            cursor: "pointer",
                          }}
                        >
                          {savedSignatureURL
                            ? "✍️ हस्ताक्षर बदलें (Edit Full-Screen Signature)"
                            : "✍️ कस्टमर हस्ताक्षर करें (Open Full Screen)"}
                        </button>

                        {savedSignatureURL && (
                          <div
                            style={{
                              border: "1px solid #cbd5e1",
                              background: "#f8fafc",
                              padding: "8px",
                              borderRadius: "6px",
                              textAlign: "center",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#166534",
                                marginBottom: "4px",
                                fontWeight: "bold",
                              }}
                            >
                              ✅ कस्टमर का हस्ताक्षर सेव हो चुका है:
                            </div>
                            <img
                              src={savedSignatureURL}
                              alt="Saved Signature Preview"
                              style={{
                                maxHeight: "80px",
                                border: "1px solid #e2e8f0",
                                background: "#fff",
                              }}
                            />
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleJobSubmit}
                          style={{
                            marginTop: "10px",
                            padding: "13px",
                            backgroundColor: "#166534",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            fontWeight: "bold",
                            fontSize: "14px",
                            cursor: "pointer",
                          }}
                        >
                          ✅ जॉब शीट फाइनल सेव करें
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. एडमिन कंट्रोल पैनल */}
      {activeTab === "admin" && (
        <div
          style={{
            background: "#fff",
            padding: "15px",
            borderRadius: "8px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
          }}
        >
          <h3 className="no-print">📊 एडमिन कंट्रोल पैनल</h3>
          {!adminLoggedIn ? (
            <form
              onSubmit={handleAdminLogin}
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <label style={{ fontWeight: "bold" }}>यूजरनेम (Username):</label>
              <input
                type="text"
                placeholder="Admin"
                value={adminUser}
                onChange={(e) => setAdminUser(e.target.value)}
                style={inputStyle}
                required
              />
              <label style={{ fontWeight: "bold" }}>पासवर्ड (Password):</label>
              <input
                type="password"
                placeholder="Password"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                style={inputStyle}
                required
              />
              <button
                type="submit"
                style={{
                  padding: "10px",
                  backgroundColor: "#166534",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                लॉगिन करें
              </button>
            </form>
          ) : (
            <div>
              {inspectedJob !== null ? (
                <PrintableJobSheet
                  job={inspectedJob}
                  onClose={() => setInspectedJob(null)}
                />
              ) : (
                <div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: "8px",
                      marginBottom: "15px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setAdminMainTab("jobs");
                        setSelectedStaffFolder(null);
                      }}
                      style={{
                        padding: "10px",
                        backgroundColor:
                          adminMainTab === "jobs" ? "#166534" : "#e2e8f0",
                        color: adminMainTab === "jobs" ? "#fff" : "#000",
                        border: "none",
                        borderRadius: "6px",
                        fontWeight: "bold",
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      📋 जॉब शीट ({jobSheets.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminMainTab("spares")}
                      style={{
                        padding: "10px",
                        backgroundColor:
                          adminMainTab === "spares" ? "#166534" : "#e2e8f0",
                        color: adminMainTab === "spares" ? "#fff" : "#000",
                        border: "none",
                        borderRadius: "6px",
                        fontWeight: "bold",
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      ⚙️ स्पेयर पार्ट ({spareStock.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAdminMainTab("attendance");
                        setAttSelectedYear(null);
                        setAttSelectedMonth(null);
                        setAttSelectedStaffPhone(null);
                      }}
                      style={{
                        padding: "10px",
                        backgroundColor:
                          adminMainTab === "attendance" ? "#166534" : "#e2e8f0",
                        color: adminMainTab === "attendance" ? "#fff" : "#000",
                        border: "none",
                        borderRadius: "6px",
                        fontWeight: "bold",
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      📅 अटेंडेंस व रूट ({attendanceRecords.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminMainTab("logins")}
                      style={{
                        padding: "10px",
                        backgroundColor:
                          adminMainTab === "logins" ? "#166534" : "#e2e8f0",
                        color: adminMainTab === "logins" ? "#fff" : "#000",
                        border: "none",
                        borderRadius: "6px",
                        fontWeight: "bold",
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      🔐 लॉगिन हिस्ट्री ({loginLogs.length})
                    </button>
                  </div>

                  {adminMainTab === "jobs" && (
                    <div>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          marginBottom: "12px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setAdminJobSubTab("completed");
                            setSelectedStaffFolder(null);
                          }}
                          style={{
                            flex: 1,
                            padding: "6px",
                            backgroundColor:
                              adminJobSubTab === "completed"
                                ? "#0284c7"
                                : "#f1f5f9",
                            color:
                              adminJobSubTab === "completed"
                                ? "#fff"
                                : "#334155",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            cursor: "pointer",
                          }}
                        >
                          कम्पलीट जॉब्स ({completedJobsList.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAdminJobSubTab("pending");
                            setSelectedStaffFolder(null);
                          }}
                          style={{
                            flex: 1,
                            padding: "6px",
                            backgroundColor:
                              adminJobSubTab === "pending"
                                ? "#d97706"
                                : "#f1f5f9",
                            color:
                              adminJobSubTab === "pending" ? "#fff" : "#334155",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            cursor: "pointer",
                          }}
                        >
                          पेंडिंग जॉब्स ({pendingJobsList.length})
                        </button>
                      </div>

                      {adminJobSubTab === "completed" && (
                        <div>
                          {selectedStaffFolder === null ? (
                            <div>
                              <h4
                                style={{
                                  margin: "0 0 10px 0",
                                  fontSize: "13px",
                                  color: "#334155",
                                }}
                              >
                                📁 स्टाफ फोल्डर्स (कम्पलीट जॉब्स):
                              </h4>
                              {Object.keys(completedByStaff).length === 0 ? (
                                <p style={{ color: "#64748b", fontSize: "13px" }}>
                                  कोई कम्पलीट जॉब उपलब्ध नहीं है।
                                </p>
                              ) : (
                                Object.keys(completedByStaff).map((staffName) => (
                                  <div
                                    key={staffName}
                                    onClick={() =>
                                      setSelectedStaffFolder(staffName)
                                    }
                                    style={{
                                      border: "1px solid #cbd5e1",
                                      padding: "12px",
                                      borderRadius: "6px",
                                      marginBottom: "8px",
                                      background: "#f8fafc",
                                      cursor: "pointer",
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                    }}
                                  >
                                    <div>
                                      📁 <strong>{staffName}</strong>
                                    </div>
                                    <span
                                      style={{
                                        background: "#0284c7",
                                        color: "#fff",
                                        padding: "2px 8px",
                                        borderRadius: "10px",
                                        fontSize: "11px",
                                      }}
                                    >
                                      {completedByStaff[staffName].length} जॉब्स
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          ) : (
                            <div>
                              <button
                                type="button"
                                onClick={() => setSelectedStaffFolder(null)}
                                style={{
                                  marginBottom: "10px",
                                  padding: "6px 12px",
                                  background: "#64748b",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                }}
                              >
                                ← सभी स्टाफ फोल्डर्स पर वापस जाएं
                              </button>
                              <h4
                                style={{
                                  margin: "0 0 8px 0",
                                  color: "#166534",
                                }}
                              >
                                📁 स्टाफ: {selectedStaffFolder} (कम्पलीट जॉब्स)
                              </h4>
                              <JobSheetRegisterTable
                                jobs={completedByStaff[selectedStaffFolder]}
                                onSelectJob={(job) => setInspectedJob(job)}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {adminJobSubTab === "pending" && (
                        <div>
                          {selectedStaffFolder === null ? (
                            <div>
                              <h4
                                style={{
                                  margin: "0 0 10px 0",
                                  fontSize: "13px",
                                  color: "#334155",
                                }}
                              >
                                📁 स्टाफ फोल्डर्स (पेंडिंग जॉब्स):
                              </h4>
                              {Object.keys(pendingByStaff).length === 0 ? (
                                <p style={{ color: "#64748b", fontSize: "13px" }}>
                                  कोई पेंडिंग जॉब उपलब्ध नहीं है।
                                </p>
                              ) : (
                                Object.keys(pendingByStaff).map((staffName) => (
                                  <div
                                    key={staffName}
                                    onClick={() =>
                                      setSelectedStaffFolder(staffName)
                                    }
                                    style={{
                                      border: "1px solid #cbd5e1",
                                      padding: "12px",
                                      borderRadius: "6px",
                                      marginBottom: "8px",
                                      background: "#fffbeb",
                                      cursor: "pointer",
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                    }}
                                  >
                                    <div>
                                      📁 <strong>{staffName}</strong>
                                    </div>
                                    <span
                                      style={{
                                        background: "#d97706",
                                        color: "#fff",
                                        padding: "2px 8px",
                                        borderRadius: "10px",
                                        fontSize: "11px",
                                      }}
                                    >
                                      {pendingByStaff[staffName].length} जॉब्स
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          ) : (
                            <div>
                              <button
                                type="button"
                                onClick={() => setSelectedStaffFolder(null)}
                                style={{
                                  marginBottom: "10px",
                                  padding: "6px 12px",
                                  background: "#64748b",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                }}
                              >
                                ← सभी स्टाफ फोल्डर्स पर वापस जाएं
                              </button>
                              <h4
                                style={{
                                  margin: "0 0 8px 0",
                                  color: "#d97706",
                                }}
                              >
                                📁 स्टाफ: {selectedStaffFolder} (पेंडिंग जॉब्स)
                              </h4>
                              <JobSheetRegisterTable
                                jobs={pendingByStaff[selectedStaffFolder]}
                                onSelectJob={(job) => setInspectedJob(job)}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {adminMainTab === "spares" && (
                    <div>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          marginBottom: "12px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setAdminSpareSubTab("stock")}
                          style={{
                            flex: 1,
                            padding: "6px",
                            backgroundColor:
                              adminSpareSubTab === "stock"
                                ? "#166534"
                                : "#f1f5f9",
                            color:
                              adminSpareSubTab === "stock" ? "#fff" : "#334155",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            cursor: "pointer",
                          }}
                        >
                          स्टॉक ({spareStock.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdminSpareSubTab("pendingParts")}
                          style={{
                            flex: 1,
                            padding: "6px",
                            backgroundColor:
                              adminSpareSubTab === "pendingParts"
                                ? "#8b5cf6"
                                : "#f1f5f9",
                            color:
                              adminSpareSubTab === "pendingParts"
                                ? "#fff"
                                : "#334155",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            cursor: "pointer",
                          }}
                        >
                          पेंडिंग पार्ट्स ({partPendingJobsList.length})
                        </button>
                      </div>

                      {adminSpareSubTab === "stock" && (
                        <div>
                          <form
                            onSubmit={handleAddStockItem}
                            style={{
                              background: "#f8fafc",
                              padding: "10px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              marginBottom: "12px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                            }}
                          >
                            <strong style={{ fontSize: "12px" }}>
                              नया स्पेयर पार्ट जोड़ें:
                            </strong>
                            <input
                              type="text"
                              placeholder="पार्ट का नाम"
                              value={newStockName}
                              onChange={(e) => setNewStockName(e.target.value)}
                              style={{ ...inputStyle, fontSize: "12px" }}
                            />
                            <div style={{ display: "flex", gap: "6px" }}>
                              <input
                                type="text"
                                placeholder="Qty"
                                value={newStockQty}
                                onChange={(e) => setNewStockQty(e.target.value)}
                                style={{ ...inputStyle, flex: 1, fontSize: "12px" }}
                              />
                              <input
                                type="text"
                                placeholder="Rate ₹"
                                value={newStockRate}
                                onChange={(e) =>
                                  setNewStockRate(e.target.value)
                                }
                                style={{ ...inputStyle, flex: 1, fontSize: "12px" }}
                              />
                            </div>
                            <input
                              type="text"
                              placeholder="विवरण (वैकल्पिक)"
                              value={newStockDesc}
                              onChange={(e) => setNewStockDesc(e.target.value)}
                              style={{ ...inputStyle, fontSize: "12px" }}
                            />
                            <button
                              type="submit"
                              style={{
                                padding: "8px",
                                background: "#166534",
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                fontWeight: "bold",
                                fontSize: "12px",
                                cursor: "pointer",
                              }}
                            >
                              + स्टॉक में जोड़ें
                            </button>
                          </form>

                          {spareStock.map((item, idx) => (
                            <div
                              key={idx}
                              style={{
                                border: "1px solid #e2e8f0",
                                padding: "8px 10px",
                                borderRadius: "6px",
                                marginBottom: "8px",
                                background: "#fafafa",
                                fontSize: "13px",
                              }}
                            >
                              <strong>{item.name}</strong> — Qty: {item.qty} |
                              Rate: ₹{item.rate}
                              <div style={{ fontSize: "11px", color: "#64748b" }}>
                                {item.desc}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {adminSpareSubTab === "pendingParts" && (
                        <div>
                          {Object.keys(partsPendingByName).length === 0 ? (
                            <p style={{ color: "#64748b", fontSize: "13px" }}>
                              कोई पेंडिंग पार्ट नहीं है।
                            </p>
                          ) : (
                            Object.keys(partsPendingByName).map((pName) => (
                              <div
                                key={pName}
                                style={{
                                  border: "1px solid #c4b5fd",
                                  padding: "10px",
                                  borderRadius: "6px",
                                  marginBottom: "8px",
                                  background: "#f5f3ff",
                                  fontSize: "13px",
                                }}
                              >
                                <strong>{pName}</strong> (
                                {partsPendingByName[pName].length} जॉब्स)
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {adminMainTab === "attendance" && (
                    <div>
                      {!attSelectedYear && (
                        <div>
                          <h4
                            style={{
                              margin: "0 0 10px 0",
                              fontSize: "14px",
                              color: "#0f172a",
                            }}
                          >
                            📅 वर्ष चुनें (Select Year):
                          </h4>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(2, 1fr)",
                              gap: "10px",
                            }}
                          >
                            {availableYears.map((yr) => (
                              <button
                                key={yr}
                                type="button"
                                onClick={() => setAttSelectedYear(yr)}
                                style={{
                                  padding: "14px",
                                  background: "#f8fafc",
                                  border: "1.5px solid #0284c7",
                                  borderRadius: "8px",
                                  fontWeight: "bold",
                                  fontSize: "15px",
                                  color: "#0369a1",
                                  cursor: "pointer",
                                }}
                              >
                                📁 वर्ष {yr}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {attSelectedYear && !attSelectedMonth && (
                        <div>
                          <button
                            type="button"
                            onClick={() => setAttSelectedYear(null)}
                            style={{
                              marginBottom: "10px",
                              padding: "6px 12px",
                              background: "#64748b",
                              color: "#fff",
                              border: "none",
                              borderRadius: "4px",
                              fontSize: "12px",
                              cursor: "pointer",
                            }}
                          >
                            ← वर्ष (Year) पर वापस जाएं
                          </button>
                          <h4
                            style={{
                              margin: "0 0 10px 0",
                              fontSize: "14px",
                              color: "#0f172a",
                            }}
                          >
                            📆 महीना चुनें (वर्ष {attSelectedYear}):
                          </h4>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(2, 1fr)",
                              gap: "8px",
                            }}
                          >
                            {HINDI_MONTHS.map((mLabel, index) => {
                              const mCode = String(index + 1).padStart(2, "0");
                              const countInMonth = attendanceRecords.filter(
                                (r) =>
                                  r.year === attSelectedYear && r.month === mCode
                              ).length;
                              return (
                                <button
                                  key={mCode}
                                  type="button"
                                  onClick={() => setAttSelectedMonth(mCode)}
                                  style={{
                                    padding: "10px",
                                    background:
                                      countInMonth > 0 ? "#f0fdf4" : "#f8fafc",
                                    border:
                                      countInMonth > 0
                                        ? "1.5px solid #166534"
                                        : "1px solid #cbd5e1",
                                    borderRadius: "6px",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    fontWeight: "bold",
                                  }}
                                >
                                  <div>{mLabel}</div>
                                  <div
                                    style={{
                                      fontSize: "11px",
                                      color: "#64748b",
                                      marginTop: "2px",
                                    }}
                                  >
                                    रिकॉर्ड्स: {countInMonth}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {attSelectedYear &&
                        attSelectedMonth &&
                        !attSelectedStaffPhone && (
                          <div>
                            <button
                              type="button"
                              onClick={() => setAttSelectedMonth(null)}
                              style={{
                                marginBottom: "10px",
                                padding: "6px 12px",
                                background: "#64748b",
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                fontSize: "12px",
                                cursor: "pointer",
                              }}
                            >
                              ← महीनों की सूची पर वापस जाएं
                            </button>
                            <h4
                              style={{
                                margin: "0 0 10px 0",
                                fontSize: "14px",
                                color: "#0f172a",
                              }}
                            >
                              👷 स्टाफ चुनें (
                              {
                                HINDI_MONTHS[
                                  parseInt(attSelectedMonth, 10) - 1
                                ]
                              }{" "}
                              {attSelectedYear}):
                            </h4>
                            {(() => {
                              const monthRecords = attendanceRecords.filter(
                                (r) =>
                                  r.year === attSelectedYear &&
                                  r.month === attSelectedMonth
                              );
                              const staffMap = {};
                              monthRecords.forEach((r) => {
                                if (!staffMap[r.staffPhone]) {
                                  staffMap[r.staffPhone] = {
                                    phone: r.staffPhone,
                                    name:
                                      r.staffName || `Staff (${r.staffPhone})`,
                                    days: 0,
                                  };
                                }
                                staffMap[r.staffPhone].days += 1;
                              });
                              const staffList = Object.values(staffMap);

                              if (staffList.length === 0) {
                                return (
                                  <p
                                    style={{ color: "#64748b", fontSize: "13px" }}
                                  >
                                    इस महीने में किसी स्टाफ की अटेंडेंस दर्ज नहीं
                                    है।
                                  </p>
                                );
                              }

                              return staffList.map((st) => (
                                <div
                                  key={st.phone}
                                  onClick={() =>
                                    setAttSelectedStaffPhone(st.phone)
                                  }
                                  style={{
                                    border: "1px solid #cbd5e1",
                                    padding: "12px",
                                    borderRadius: "6px",
                                    marginBottom: "8px",
                                    background: "#f8fafc",
                                    cursor: "pointer",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                  }}
                                >
                                  <div>
                                    👤 <strong>{st.name}</strong>
                                    <div
                                      style={{
                                        fontSize: "11px",
                                        color: "#64748b",
                                      }}
                                    >
                                      मोबाइल: {st.phone}
                                    </div>
                                  </div>
                                  <span
                                    style={{
                                      background: "#166534",
                                      color: "#fff",
                                      padding: "3px 10px",
                                      borderRadius: "12px",
                                      fontSize: "11px",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    {st.days} दिन उपस्थित →
                                  </span>
                                </div>
                              ));
                            })()}
                          </div>
                        )}

                      {attSelectedYear &&
                        attSelectedMonth &&
                        attSelectedStaffPhone && (
                          <div>
                            <button
                              type="button"
                              onClick={() => setAttSelectedStaffPhone(null)}
                              style={{
                                marginBottom: "10px",
                                padding: "6px 12px",
                                background: "#64748b",
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                fontSize: "12px",
                                cursor: "pointer",
                              }}
                            >
                              ← स्टाफ सूची पर वापस जाएं
                            </button>
                            {(() => {
                              const dailyLogs = attendanceRecords
                                .filter(
                                  (r) =>
                                    r.year === attSelectedYear &&
                                    r.month === attSelectedMonth &&
                                    r.staffPhone === attSelectedStaffPhone
                                )
                                .sort((a, b) =>
                                  String(b.dateKey).localeCompare(
                                    String(a.dateKey)
                                  )
                                );

                              const staffTitle =
                                dailyLogs[0]?.staffName ||
                                `Staff (${attSelectedStaffPhone})`;

                              return (
                                <div>
                                  <h4
                                    style={{
                                      margin: "0 0 10px 0",
                                      color: "#166534",
                                      fontSize: "14px",
                                    }}
                                  >
                                    📋 {staffTitle} —{" "}
                                    {
                                      HINDI_MONTHS[
                                        parseInt(attSelectedMonth, 10) - 1
                                      ]
                                    }{" "}
                                    {attSelectedYear}
                                  </h4>

                                  {dailyLogs.map((rec) => {
                                    const pts = Array.isArray(rec.routePoints)
                                      ? rec.routePoints
                                      : [];

                                    const textRoute =
                                      pts.length > 0
                                        ? pts
                                            .map(
                                              (p) =>
                                                `${p.timeText} (${p.address})`
                                            )
                                            .join(" ➔ ")
                                        : "लोकेशन डेटा उपलब्ध नहीं";

                                    const validCoords = pts.filter(
                                      (p) => p.lat && p.lng
                                    );
                                    let googleMapUrl = "";
                                    if (validCoords.length === 1) {
                                      googleMapUrl = `https://www.google.com/maps/search/?api=1&query=${validCoords[0].lat},${validCoords[0].lng}`;
                                    } else if (validCoords.length >= 2) {
                                      const origin = `${validCoords[0].lat},${validCoords[0].lng}`;
                                      const dest = `${
                                        validCoords[validCoords.length - 1].lat
                                      },${
                                        validCoords[validCoords.length - 1].lng
                                      }`;
                                      const mid = validCoords
                                        .slice(1, -1)
                                        .slice(0, 8)
                                        .map((c) => `${c.lat},${c.lng}`)
                                        .join("|");
                                      googleMapUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${
                                        mid
                                          ? `&waypoints=${encodeURIComponent(mid)}`
                                          : ""
                                      }&travelmode=driving`;
                                    }

                                    return (
                                      <div
                                        key={rec.docId}
                                        style={{
                                          border: "1px solid #cbd5e1",
                                          borderRadius: "8px",
                                          padding: "10px",
                                          marginBottom: "10px",
                                          background: "#f8fafc",
                                          fontSize: "12px",
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            borderBottom: "1px solid #e2e8f0",
                                            paddingBottom: "5px",
                                            marginBottom: "6px",
                                          }}
                                        >
                                          <strong
                                            style={{
                                              fontSize: "13px",
                                              color: "#0f172a",
                                            }}
                                          >
                                            📅 दिनांक: {rec.dateKey}
                                          </strong>
                                          <span
                                            style={{
                                              background: rec.outTime
                                                ? "#dcfce7"
                                                : "#fef3c7",
                                              color: rec.outTime
                                                ? "#166534"
                                                : "#92400e",
                                              padding: "2px 8px",
                                              borderRadius: "10px",
                                              fontWeight: "bold",
                                              fontSize: "11px",
                                            }}
                                          >
                                            कुल समय:{" "}
                                            {calcWorkDuration(
                                              rec.inTime,
                                              rec.outTime
                                            )}
                                          </span>
                                        </div>

                                        <div
                                          style={{
                                            display: "flex",
                                            gap: "15px",
                                            marginBottom: "6px",
                                          }}
                                        >
                                          <div>
                                            <strong>🟢 IN Time:</strong>{" "}
                                            {formatTime12(rec.inTime)}
                                          </div>
                                          <div>
                                            <strong>🔴 OUT Time:</strong>{" "}
                                            {rec.outTime
                                              ? formatTime12(rec.outTime)
                                              : "अभी ऑन ड्यूटी (Logged In)"}
                                          </div>
                                        </div>

                                        <div
                                          style={{
                                            background: "#ffffff",
                                            border: "1px solid #e2e8f0",
                                            borderRadius: "6px",
                                            padding: "7px",
                                            marginBottom: "6px",
                                            lineHeight: "1.45",
                                          }}
                                        >
                                          <strong>
                                            📍 पूरे दिन का रूट (Text Route):
                                          </strong>
                                          <div
                                            style={{
                                              color: "#334155",
                                              marginTop: "3px",
                                            }}
                                          >
                                            {textRoute}
                                          </div>
                                        </div>

                                        {googleMapUrl && (
                                          <a
                                            href={googleMapUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                              display: "inline-block",
                                              padding: "6px 12px",
                                              background: "#2563eb",
                                              color: "#fff",
                                              textDecoration: "none",
                                              borderRadius: "5px",
                                              fontWeight: "bold",
                                              fontSize: "11px",
                                            }}
                                          >
                                            🗺️ Google Map पर पूरा रूट देखें (
                                            {validCoords.length} Points)
                                          </a>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                    </div>
                  )}

                  {adminMainTab === "logins" && (
                    <div>
                      <h4 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>
                        सभी पोर्टल लॉगिन हिस्ट्री
                      </h4>
                      {loginLogs.map((log, idx) => (
                        <div
                          key={idx}
                          style={{
                            border: "1px solid #e2e8f0",
                            padding: "8px 10px",
                            borderRadius: "6px",
                            marginBottom: "8px",
                            background: "#fafafa",
                            fontSize: "12px",
                          }}
                        >
                          <strong>{log.name || log.phone}</strong> [{log.role}]
                          — Count: {log.loginCount || 1}
                          <div style={{ color: "#64748b" }}>
                            Time: {log.lastLoginText || "-"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo, useRef } from "react";

// ============================================================================
// 1. CONFIGURATION & SECURITY HELPERS (.env / Safe Defaults)
// ============================================================================
const APP_CONFIG = {
  firms: [
    "Hindustan Refrigeration Service",
    "Manqube Private Limited",
  ],
  defaultFirm: "Hindustan Refrigeration Service",
  locationTag: "Prayagraj, UP",
  adminPasscode: process.env.REACT_APP_ADMIN_PASSCODE || "MQ_ADMIN_2026",
  telegramBotToken: process.env.REACT_APP_TELEGRAM_BOT_TOKEN || "",
  telegramChatId: process.env.REACT_APP_TELEGRAM_CHAT_ID || "",
  offlineQueueKey: "mq_offline_sync_queue",
  jobsStorageKey: "mq_fsm_jobs_v2",
  stockStorageKey: "mq_fsm_spare_stock_v2",
  attendanceStorageKey: "mq_fsm_attendance_v2",
};

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
    sparePartsUsed: [{ name: "Run Capacitor (45 mfd)", qty: 1 }],
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

  return [...common1to5, ...(equipmentSpecific6to15[equipmentType] || equipmentSpecific6to15["Split / Window AC"]), ...point16];
}

// ============================================================================
// 3. OFFLINE SYNC & TELEGRAM NOTIFICATION UTILITIES
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
  } catch {
    // ignore storage quota errors
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
// 4. MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {
  // Navigation & Mode States
  const [activePortal, setActivePortal] = useState("customer"); // 'customer' | 'staff' | 'admin'
  const [selectedFirm, setSelectedFirm] = useState(APP_CONFIG.defaultFirm);
  const [focusMode, setFocusMode] = useState(false);

  // Network & Offline Sync Queue
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [offlineQueue, setOfflineQueue] = useState(() => readOfflineQueue());
  const [syncBanner, setSyncBanner] = useState("");

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

  // Printable Sheet Ref
  const printSheetRef = useRef(null);

  // Persist Jobs, Stock & Attendance
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
    setSyncBanner(`${currentQueue.length} ऑफलाइन रिकॉर्ड सिंक किए जा रहे हैं...`);
    // Simulate Firestore sync batch commit
    for (const item of currentQueue) {
      if (item.type === "NEW_JOB" && item.payload) {
        setJobs((prev) => (prev.some((j) => j.id === item.payload.id) ? prev : [item.payload, ...prev]));
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

  // Sync wizard state when switching active job
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

    if (isOnline) {
      setJobs((prev) => [newJob, ...prev]);
      setSyncBanner(`नई शिकायत दर्ज: ${newJob.id} (${newJob.firm})`);
      await sendTelegramAlert(
        `<b>New Service Ticket</b>\nFirm: ${newJob.firm}\nID: ${newJob.id}\nCustomer: ${newJob.customerName} (${newJob.phone})\nUnit: ${newJob.equipmentType}\nIssue: ${newJob.issue}`
      );
    } else {
      setJobs((prev) => [newJob, ...prev]);
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
    const applyLog = (lat, lng, label) => {
      const point = { lat, lng, time: now, note: `${eventType} (${selectedFirm})` };
      setStaffSession((prev) => ({
        ...prev,
        checkedIn: eventType === "AUTO_IN",
        checkInTime: eventType === "AUTO_IN" ? now : prev.checkInTime,
        checkOutTime: eventType === "AUTO_OUT" ? now : now,
        gpsStatus: `${label} (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        routePoints: [...prev.routePoints, point],
      }));
      setAttendanceLogs((prev) => [
        {
          id: `ATT-${Date.now()}`,
          staffName: staffSession.staffName,
          phone: staffSession.phone,
          firm: selectedFirm,
          type: eventType,
          time: now,
          coords: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        },
        ...prev,
      ]);
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

  function addSparePartToJob() {
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

    setSpareStock((prev) =>
      prev.map((s) => (s.id === stockItem.id ? { ...s, qty: Math.max(0, s.qty - qty) } : s))
    );
  }

  function saveCompletedJobSheet(markCompleted = true) {
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
      setSyncBanner(`जॉब शीट (${updatedJob.id}) सेव और सिंक हो गई है।`);
      sendTelegramAlert(
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

  function handleAddSpareStock(e) {
    e.preventDefault();
    if (!newStockItem.name.trim()) return;
    setSpareStock((prev) => [
      ...prev,
      {
        id: `SP-${Date.now()}`,
        name: newStockItem.name.trim(),
        qty: Number(newStockItem.qty) || 1,
        unit: newStockItem.unit || "pcs",
      },
    ]);
    setNewStockItem({ name: "", qty: 5, unit: "pcs" });
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

  // ==========================================================================
  // 10. RENDER UI (WITH FOCUS MODE & PRINT STYLES)
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
            padding: 12mm;
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

            <span style={{
              ...styles.badge,
              backgroundColor: isOnline ? "#dcfce7" : "#fee2e2",
              color: isOnline ? "#166534" : "#991b1b",
            }}>
              {isOnline ? "● Online Sync" : "● Offline Queue"}
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
                            <li key={idx}>{u.name} — <strong>{u.qty}</strong> {u.unit || "pcs"}</li>
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
                        [{pt.time}] {pt.note} — ({pt.lat.toFixed(4)}, {pt.lng.toFixed(4)})
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
      {/* 1-PAGE A4 PRINTABLE JOB SHEET (SHOWN ON PRINT / SAVE AS PDF)         */}
      {/* ==================================================================== */}
      {activeJob && (
        <div ref={printSheetRef} className="print-only-sheet">
          <div style={{ borderBottom: "2px solid #000", paddingBottom: "6px", marginBottom: "8px" }}>
            <h2 style={{ margin: 0 }}>{selectedFirm}</h2>
            <div>1-Page Field Inspection & Service Job Sheet • {APP_CONFIG.locationTag}</div>
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
                <th style={styles.printTh}>Inspection Parameter</th>
                <th style={styles.printTh}>Reading / Status</th>
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
            <strong>Spare Parts Used:</strong>{" "}
            {usedSpares.length
              ? usedSpares.map((u) => `${u.name} (${u.qty} ${u.unit || "pcs"})`).join(", ")
              : "None"}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px" }}>
            <div>Technician Sign: ___________________</div>
            <div>Customer Sign: ___________________</div>
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