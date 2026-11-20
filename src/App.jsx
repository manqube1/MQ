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
  padding: "8px 10px",
  borderRadius: "6px",
  border: "1px solid #cbd5e1",
  backgroundColor: "#ffffff",
  color: "#0f172a",
  fontSize: "13px",
  boxSizing: "border-box",
};

const chkBox = (checked) => (checked ? "☑" : "☐");

// हेल्पर: समय और काम की अवधि निकालना
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

// Reverse Geocoding (OpenStreetMap / Nominatim से लोकेशन का नाम टेक्स्ट में लाना)
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
    // Fallback to lat, lng
  }
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
};

// हेल्पर: Water Cooler चेक करने के लिए
const checkIsWaterCooler = (prodType = "", prodFull = "") => {
  const combined = `${prodType} ${prodFull}`.toLowerCase();
  return combined.includes("water cooler");
};

// हेल्पर: Deep Freezer / Refrigerator / Water Cooler चेक करने के लिए
const checkIsFridgeOrWaterCooler = (prodType = "", prodFull = "") => {
  const combined = `${prodType} ${prodFull}`.toLowerCase();
  return (
    combined.includes("refrigerator") ||
    combined.includes("deep freezer") ||
    combined.includes("water cooler")
  );
};

// हेल्पर: सिंगल-फ़ेज़ आइटम चेक करने के लिए
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

      {/* 1. ग्राहक एवं साइट का विवरण */}
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

      {/* 2. कूलर का विवरण */}
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

      {/* 3. चेकलिस्ट एवं निरीक्षण */}
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

      {/* 4. किए गए कार्य एवं बदले गए पार्ट्स */}
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

      {/* 5. टेक्नीशियन एवं ग्राहक हस्ताक्षर */}
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
const PrintableJobSheet = ({ job, onClose }) => {
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
        <div style={{ display: "flex", gap: "8px" }}>
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
          {/* केवल लोगो ऊपर लेफ्ट साइड में */}
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

          {/* Customer & Job Meta Table */}
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

          {/* DEEP FREEZER / REFRIGERATOR / WATER COOLER का विशिष्ट सेक्शन */}
          {isFridgeOrWCJob ? (
            <>
              <table className="js-table" style={{ borderTop: "none" }}>
                <tbody>
                  {/* Customer वाले के ठीक नीचे Fault / Problem Details */}
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

              {/* Work / Action Taken को अब पूरी चौड़ाई मिल रही है */}
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

              {/* Sign-Off Table */}
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
            /* बाक़ी AC यूनिट्स का सेक्शन: Customer वाले के ठीक नीचे खाली जगह में Fault / Problem Details */
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

              {/* Work / Action Taken को अब पूरी चौड़ाई मिल रही है */}
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

      {Array.isArray(job.sitePhotoUrls) && job.sitePhotoUrls.length > 0 && (
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
            SITE &amp; PART PHOTOS:
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {job.sitePhotoUrls.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`Site ${idx + 1}`}
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

  // Persistent Staff Session (जब तक Logout न करे, In रहेगा और लोकेशन सेव होगी)
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
  const [wizardStep, setWizardStep] = useState(1);
  const [techSlide, setTechSlide] = useState(1);

  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [adminMainTab, setAdminMainTab] = useState("jobs");
  const [adminJobSubTab, setAdminJobSubTab] = useState("completed");
  const [adminSpareSubTab, setAdminSpareSubTab] = useState("stock");
  const [selectedStaffFolder, setSelectedStaffFolder] = useState(null);

  // Admin Attendance Drill-Down States (Year -> Month -> Staff -> Daily Logs)
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

  // Deep Freezer / Refrigerator / Water Cooler Common Fields
  const [unitModel, setUnitModel] = useState("");
  const [unitSerial, setUnitSerial] = useState("");
  const [unitCapacity, setUnitCapacity] = useState("");
  const [condenserInOut, setCondenserInOut] = useState("OK");

  // Water Cooler Additional 4 Fields
  const [wcTankSize, setWcTankSize] = useState("40");
  const [wcTapCount, setWcTapCount] = useState("2");
  const [wcOverflowType, setWcOverflowType] = useState("Float Ball");
  const [wcCondensingCoilSize, setWcCondensingCoilSize] = useState("");

  // AC / HVAC Fields
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

  // Air Cooler Specific States
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

  // Work & Billing
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

  const isWaterCoolerSelected = checkIsWaterCooler(productType);
  const isAirCoolerSelected = productType === "Cooler";
  const isFridgeOrWCSelected = checkIsFridgeOrWaterCooler(productType);
  const isSinglePhaseSelected = checkIsSinglePhase(productType);

  // =========================================================
  // OFFLINE QUEUE & SERVER SYNC ENGINE (इंटरनेट मिलते ही सिंक)
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

    // Local State तुरंत अपडेट करें
    setAttendanceRecords((prev) => {
      const idx = prev.findIndex((r) => r.docId === docId);
      if (idx > -1) {
        const updated = [...prev];
        const cur = updated[idx];
        updated[idx] = {
          ...cur,
          inTime: cur.inTime || ts,
          outTime: eventType === "OUT" ? ts : cur.outTime,
          routePoints: point ? [...(cur.routePoints || []), point] : cur.routePoints || [],
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

  // ऐप खुलते ही अगर स्टाफ पहले से लॉगिन है (Logout नहीं किया है) तो ऑटो IN और लगातार रूट ट्रैकिंग
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

    // पहली बार ऐप खुलते ही IN दर्ज करें
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
      // हर 3 मिनट में लोकेशन पॉइंट चेक करें
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
        setJobSheets(list);
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
    recordUserLogin(custPhone, "customer", "Customer (" + custPhone + ")");
  };

  const handleCategoryChange = (e) => {
    const cat = e.target.value;
    setCategoryType(cat);
    if (cat === "HVAC & Refrigeration") setProductType("Split / Window AC");
    else if (cat === "Electrical Work") {
      setProductType("Cooler");
      setWorkDone("कूलर जनरल सर्विस एवं केमिकल/पानी से सफाई");
    } else if (cat === "Plumbing Work")
      setProductType("Pipe Fitting & Leakage Repair");
    else if (cat === "Civil Work") setProductType("Flooring & Tiling");
  };

  const handleProductChange = (e) => {
    const prod = e.target.value;
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

    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    const jobSheetNo = "COMP" + custPhone + day + month + hours + minutes;

    const newEntry = {
      jobSheetNo,
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
      photoURL: "",
      sitePhotoUrls: [],
      signatureURL: "",
      categoryType,
      productType,
      usedParts: [],
      sparePartOption: "-",
      sparePartName: "-",
      sparePartModel: "-",
    };

    setJobSheets([newEntry, ...jobSheets]);
    setDoc(doc(db, "jobs", jobSheetNo), newEntry).catch((err) =>
      console.error(err)
    );

    setProblemDesc("");
    setCustNameInput("");
    setCustAddressInput("");
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

      // लॉगिन सेशन सेव करें ताकि ऐप बंद होने या दोबारा खुलने पर भी IN बना रहे
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

  // जब स्टाफ खुद Log Out पर क्लिक करेगा तभी उसका OUT टाइम सेव होगा
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
    setWizardStep(1);
    setTechSlide(1);
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
    setJobSheets([updatedRecord, ...filteredList]);
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

  const onlineComplaintsList = jobSheets.filter(
    (j) => j.status === "Pending" && j.location === "Online Booking"
  );
  const pendingJobsList = jobSheets.filter(
    (j) => j.status === "Pending" || j.status === "Part Pending"
  );
  const completedJobsList = jobSheets.filter((j) => j.status === "Completed");
  const partPendingJobsList = jobSheets.filter(
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

  // अटेंडेंस के लिए उपलब्ध वर्ष (Years) निकालना
  const availableYears = Array.from(
    new Set([
      String(new Date().getFullYear()),
      ...attendanceRecords.map((r) => r.year).filter(Boolean),
    ])
  ).sort((a, b) => b.localeCompare(a));

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

      {/* हेडर (केवल लोगो लेफ्ट साइड में + Network Sync स्टेटस) */}
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
            <div style={{ marginTop: "4px", color: "#b45309", fontWeight: "bold" }}>
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
              अपनी शिकायत दर्ज करें और पुरानी जॉब-शीट्स देखें
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
          <h3>कस्टमर पोर्टल</h3>
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
                  onClick={() => setCustLoggedIn(false)}
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
                  {categoryType === "HVAC & Refrigeration" && (
                    <>
                      <option value="Split / Window AC">Split / Window AC</option>
                      <option value="Inverter AC">Inverter AC</option>
                      <option value="Cassette AC">Cassette AC (कैसेट एसी)</option>
                      <option value="Ductable AC">Ductable AC (डक्टेबल एसी)</option>
                      <option value="VRV / VRF System">VRV / VRF System</option>
                      <option value="AHU Unit (Air Handling Unit)">
                        AHU Unit (Air Handling Unit)
                      </option>
                      <option value="Chiller Unit">Chiller Unit (चिलर यूनिट)</option>
                      <option value="Refrigerator / Deep Freezer">
                        Refrigerator / Deep Freezer
                      </option>
                      <option value="Water Cooler">Water Cooler</option>
                    </>
                  )}
                  {categoryType === "Electrical Work" && (
                    <>
                      <option value="Cooler">Cooler (कूलर)</option>
                      <option value="House Wiring & Panel">
                        House Wiring &amp; Panel
                      </option>
                      <option value="DB / MCB / MCCB Work">
                        DB / MCB / MCCB Work
                      </option>
                      <option value="Earthing & Lightning Arrester">
                        Earthing &amp; Lightning Arrester
                      </option>
                      <option value="Three Phase Industrial Panel">
                        Three Phase Industrial Panel
                      </option>
                      <option value="Inverter / UPS / Battery Setup">
                        Inverter / UPS / Battery Setup
                      </option>
                    </>
                  )}
                  {categoryType === "Plumbing Work" && (
                    <>
                      <option value="Pipe Fitting & Leakage Repair">
                        Pipe Fitting &amp; Leakage Repair
                      </option>
                      <option value="Sanitary & Bathroom Fitting">
                        Sanitary &amp; Bathroom Fitting
                      </option>
                      <option value="Water Tank Installation">
                        Water Tank Installation
                      </option>
                      <option value="Boring & Submersible Pump Work">
                        Boring &amp; Submersible Pump Work
                      </option>
                      <option value="Drainage & Sewer Line Fitting">
                        Drainage &amp; Sewer Line Fitting
                      </option>
                      <option value="Pressure Pump Installation">
                        Pressure Pump Installation
                      </option>
                    </>
                  )}
                  {categoryType === "Civil Work" && (
                    <>
                      <option value="Flooring & Tiling">
                        Flooring &amp; Tiling
                      </option>
                      <option value="Brickwork & Plastering">
                        Brickwork &amp; Plastering
                      </option>
                      <option value="RCC Roof & Pillar Casting">
                        RCC Roof &amp; Pillar Casting
                      </option>
                      <option value="Waterproofing & Leakage Solution">
                        Waterproofing &amp; Leakage Solution
                      </option>
                      <option value="Foundation & Excavation">
                        Foundation &amp; Excavation
                      </option>
                      <option value="Wall Putty & Painting">
                        Wall Putty &amp; Painting
                      </option>
                    </>
                  )}
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
                <h4 style={{ margin: "0 0 10px 0" }}>
                  आपकी शिकायतें और जॉब हिस्ट्री:
                </h4>
                {jobSheets.filter((j) => j.customerPhone === custPhone).length ===
                0 ? (
                  <p style={{ color: "#64748b", fontSize: "13px" }}>
                    कोई पुरानी शिकायत या जॉब शीट नहीं मिली।
                  </p>
                ) : (
                  jobSheets
                    .filter((j) => j.customerPhone === custPhone)
                    .map((job) => (
                      <div
                        key={job.jobSheetNo}
                        style={{
                          border: "1px solid #e2e8f0",
                          padding: "10px",
                          borderRadius: "6px",
                          marginBottom: "10px",
                          background: "#fafafa",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "13px",
                            fontWeight: "bold",
                          }}
                        >
                          <span>
                            {job.jobSheetNo} ({job.customerName})
                          </span>
                          <span
                            style={{
                              color:
                                job.status === "Completed" ? "green" : "orange",
                            }}
                          >
                            {job.status}
                          </span>
                        </div>
                        <div style={{ fontSize: "13px", marginTop: "4px" }}>
                          {job.product} - {job.desc}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#64748b",
                            marginTop: "4px",
                          }}
                        >
                          पता: {job.customerAddress} | तारीख: {job.date}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. फ़ील्ड स्टाफ पोर्टल */}
      {activeTab === "staff" && (
        <div
          style={{
            background: "#fff",
            padding: "15px",
            borderRadius: "8px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
          }}
        >
          <h3 className="no-print">फ़ील्ड स्टाफ लॉगिन</h3>
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
                  <div style={{ fontSize: "11px", color: "#166534", fontWeight: "bold" }}>
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

              {lastSubmittedJob && (
                <PrintableJobSheet
                  job={lastSubmittedJob}
                  onClose={() => setLastSubmittedJob(null)}
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
                    onClick={() => setStaffSubTab("onlineComplaints")}
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
                    onClick={() => setStaffSubTab("pending")}
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
                    onClick={() => setStaffSubTab("completed")}
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
                    onClick={() => setStaffSubTab("partPending")}
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
                    onClick={() => setStaffSubTab("menu")}
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
                  <h4>ऑनलाइन प्राप्त शिकायतें (Online Complaints)</h4>
                  {onlineComplaintsList.length === 0 ? (
                    <p style={{ color: "#64748b" }}>
                      कोई नई ऑनलाइन शिकायत उपलब्ध नहीं है।
                    </p>
                  ) : (
                    onlineComplaintsList.map((job) => (
                      <div
                        key={job.jobSheetNo}
                        style={{
                          border: "1px solid #e2e8f0",
                          padding: "10px",
                          borderRadius: "6px",
                          marginBottom: "10px",
                          background: "#fafafa",
                        }}
                      >
                        <div>
                          <strong>कम्प्लेंट नं:</strong> {job.jobSheetNo}
                        </div>
                        <div>
                          <strong>कस्टमर:</strong> {job.customerName} (
                          {job.customerPhone})
                        </div>
                        <div>
                          <strong>पता:</strong> {job.customerAddress}
                        </div>
                        <div>
                          <strong>उत्पाद:</strong> {job.product}
                        </div>
                        <div>
                          <strong>विवरण:</strong> {job.desc}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleFillComplaintToNewJob(job)}
                          style={{
                            marginTop: "8px",
                            padding: "6px 12px",
                            backgroundColor: "#166534",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                        >
                          इस शिकायत पर जॉब शीट भरें
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {staffSubTab === "pending" && (
                <div>
                  <button
                    type="button"
                    onClick={() => setStaffSubTab("menu")}
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
                  <h4>पेंडिंग जॉब्स (Pending Jobs)</h4>
                  {pendingJobsList.length === 0 ? (
                    <p style={{ color: "#64748b" }}>कोई पेंडिंग जॉब नहीं है।</p>
                  ) : (
                    pendingJobsList.map((job) => (
                      <div
                        key={job.jobSheetNo}
                        style={{
                          border: "1px solid #fcd34d",
                          padding: "10px",
                          borderRadius: "6px",
                          marginBottom: "10px",
                          background: "#fffbeb",
                        }}
                      >
                        <div>
                          <strong>नंबर:</strong> {job.jobSheetNo}
                        </div>
                        <div>
                          <strong>कस्टमर:</strong> {job.customerName} (
                          {job.customerPhone})
                        </div>
                        <div>
                          <strong>विवरण:</strong> {job.desc}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleFillComplaintToNewJob(job)}
                          style={{
                            marginTop: "8px",
                            padding: "6px 12px",
                            backgroundColor: "#f59e0b",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                        >
                          जारी रखें / अपडेट करें
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {staffSubTab === "completed" && (
                <div>
                  <button
                    type="button"
                    className="no-print"
                    onClick={() => setStaffSubTab("menu")}
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
                  <h4 className="no-print">कम्पलीट जॉब्स (Completed Jobs)</h4>
                  {completedJobsList.length === 0 ? (
                    <p style={{ color: "#64748b" }}>
                      अभी तक कोई जॉब कम्पलीट नहीं हुई है।
                    </p>
                  ) : (
                    completedJobsList.map((job) => (
                      <div
                        key={job.jobSheetNo}
                        className="no-print"
                        style={{
                          border: "1px solid #86efac",
                          padding: "10px",
                          borderRadius: "6px",
                          marginBottom: "10px",
                          background: "#f0fdf4",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <strong>जॉब नंबर:</strong> {job.jobSheetNo}
                          </div>
                          <button
                            type="button"
                            onClick={() => setLastSubmittedJob(job)}
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
                            📄 जॉब शीट खोलें / प्रिंट करें
                          </button>
                        </div>
                        <div>
                          <strong>कस्टमर:</strong> {job.customerName} (
                          {job.customerPhone})
                        </div>
                        <div>
                          <strong>उत्पाद:</strong> {job.product}
                        </div>
                        <div>
                          <strong>कार्य विवरण:</strong> {job.desc}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {staffSubTab === "partPending" && (
                <div>
                  <button
                    type="button"
                    onClick={() => setStaffSubTab("menu")}
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
                  <h4>स्पेयर पार्ट पेंडिंग</h4>
                  {partPendingJobsList.length === 0 ? (
                    <p style={{ color: "#64748b" }}>
                      कोई स्पेयर पार्ट पेंडिंग जॉब नहीं है।
                    </p>
                  ) : (
                    partPendingJobsList.map((job) => (
                      <div
                        key={job.jobSheetNo}
                        style={{
                          border: "1px solid #c4b5fd",
                          padding: "10px",
                          borderRadius: "6px",
                          marginBottom: "10px",
                          background: "#f5f3ff",
                        }}
                      >
                        <div>
                          <strong>नंबर:</strong> {job.jobSheetNo}
                        </div>
                        <div>
                          <strong>कस्टमर:</strong> {job.customerName} (
                          {job.customerPhone})
                        </div>
                        <div>
                          <strong>मंगवाना है पार्ट:</strong> {job.sparePartName}{" "}
                          (मॉडल: {job.sparePartModel})
                        </div>
                        <button
                          type="button"
                          onClick={() => handleFillComplaintToNewJob(job)}
                          style={{
                            marginTop: "8px",
                            padding: "6px 12px",
                            backgroundColor: "#8b5cf6",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                        >
                          पार्ट स्टेटस अपडेट करें
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {staffSubTab === "newJobForm" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "10px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setStaffSubTab("menu")}
                      style={{
                        padding: "6px 12px",
                        background: "#64748b",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      ← मेनू पर वापस जाएं
                    </button>
                    <span style={{ fontSize: "13px", fontWeight: "bold" }}>
                      Wizard Step: {wizardStep} / 4
                    </span>
                  </div>

                  {/* स्टेप 1 */}
                  {wizardStep === 1 && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <h4>स्टेप 1: कस्टमर और प्रॉडक्ट विवरण</h4>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: "12px", fontWeight: "bold" }}>
                            बिल नं (Bill No. - वैकल्पिक):
                          </label>
                          <input
                            type="text"
                            placeholder="Bill No."
                            value={billNo}
                            onChange={(e) => setBillNo(e.target.value)}
                            style={{ ...inputStyle, width: "100%" }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: "12px", fontWeight: "bold" }}>
                            AMC दिनांक (AMC Date):
                          </label>
                          <input
                            type="text"
                            placeholder="DD/MM/YYYY"
                            value={amcDate}
                            onChange={(e) => setAmcDate(e.target.value)}
                            style={{ ...inputStyle, width: "100%" }}
                          />
                        </div>
                      </div>

                      <label style={{ fontSize: "12px", fontWeight: "bold" }}>
                        ग्राहक / संस्था का नाम (Customer Name):
                      </label>
                      <input
                        type="text"
                        value={jobCustName}
                        onChange={(e) => setJobCustName(e.target.value)}
                        style={inputStyle}
                      />

                      <label style={{ fontSize: "12px", fontWeight: "bold" }}>
                        संपर्क एवं मोबाइल नंबर (Mobile No.):
                      </label>
                      <input
                        type="tel"
                        maxLength="10"
                        value={jobCustPhone}
                        onChange={(e) => setJobCustPhone(e.target.value)}
                        style={inputStyle}
                      />

                      <label style={{ fontSize: "12px", fontWeight: "bold" }}>
                        लोकेशन / साइट का पता (Address):
                      </label>
                      <textarea
                        rows="2"
                        value={jobCustAddress}
                        onChange={(e) => setJobCustAddress(e.target.value)}
                        style={inputStyle}
                      />

                      <label style={{ fontSize: "12px", fontWeight: "bold" }}>
                        श्रेणी (Category):
                      </label>
                      <select
                        value={categoryType}
                        onChange={handleCategoryChange}
                        style={inputStyle}
                      >
                        <option value="HVAC & Refrigeration">
                          HVAC &amp; Refrigeration
                        </option>
                        <option value="Electrical Work">Electrical Work</option>
                        <option value="Plumbing Work">Plumbing Work</option>
                        <option value="Civil Work">Civil Work</option>
                      </select>

                      <label style={{ fontSize: "12px", fontWeight: "bold" }}>
                        संबंधित कार्य / उत्पाद (Sub-Option):
                      </label>
                      <select
                        value={productType}
                        onChange={handleProductChange}
                        style={inputStyle}
                      >
                        {categoryType === "HVAC & Refrigeration" && (
                          <>
                            <option value="Split / Window AC">
                              Split / Window AC
                            </option>
                            <option value="Inverter AC">Inverter AC</option>
                            <option value="Cassette AC">Cassette AC</option>
                            <option value="Ductable AC">Ductable AC</option>
                            <option value="VRV / VRF System">VRV / VRF System</option>
                            <option value="AHU Unit">AHU Unit</option>
                            <option value="Chiller Unit">Chiller Unit</option>
                            <option value="Refrigerator / Deep Freezer">
                              Refrigerator / Deep Freezer
                            </option>
                            <option value="Water Cooler">Water Cooler</option>
                          </>
                        )}
                        {categoryType === "Electrical Work" && (
                          <>
                            <option value="Cooler">Cooler (कूलर)</option>
                            <option value="House Wiring & Panel">
                              House Wiring &amp; Panel
                            </option>
                            <option value="DB / MCB / MCCB Work">
                              DB / MCB / MCCB Work
                            </option>
                            <option value="Earthing & Lightning Arrester">
                              Earthing &amp; Lightning Arrester
                            </option>
                            <option value="Three Phase Industrial Panel">
                              Three Phase Industrial Panel
                            </option>
                            <option value="Inverter / UPS / Battery Setup">
                              Inverter / UPS / Battery Setup
                            </option>
                          </>
                        )}
                        {categoryType === "Plumbing Work" && (
                          <>
                            <option value="Pipe Fitting & Leakage Repair">
                              Pipe Fitting &amp; Leakage Repair
                            </option>
                            <option value="Sanitary & Bathroom Fitting">
                              Sanitary &amp; Bathroom Fitting
                            </option>
                            <option value="Water Tank Installation">
                              Water Tank Installation
                            </option>
                            <option value="Boring & Submersible Pump Work">
                              Boring &amp; Submersible Pump Work
                            </option>
                            <option value="Drainage & Sewer Line Fitting">
                              Drainage &amp; Sewer Line Fitting
                            </option>
                            <option value="Pressure Pump Installation">
                              Pressure Pump Installation
                            </option>
                          </>
                        )}
                        {categoryType === "Civil Work" && (
                          <>
                            <option value="Flooring & Tiling">
                              Flooring &amp; Tiling
                            </option>
                            <option value="Brickwork & Plastering">
                              Brickwork &amp; Plastering
                            </option>
                            <option value="RCC Roof & Pillar Casting">
                              RCC Roof &amp; Pillar Casting
                            </option>
                            <option value="Waterproofing & Leakage Solution">
                              Waterproofing &amp; Leakage Solution
                            </option>
                            <option value="Foundation & Excavation">
                              Foundation &amp; Excavation
                            </option>
                            <option value="Wall Putty & Painting">
                              Wall Putty &amp; Painting
                            </option>
                          </>
                        )}
                      </select>

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
                                  onChange={() => toggleCoolerWorkType(opt.id)}
                                />
                                {opt.label}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      <label style={{ fontSize: "12px", fontWeight: "bold" }}>
                        फॉल्ट / समस्या विवरण (Fault / Problem Details):
                      </label>
                      <input
                        type="text"
                        placeholder={
                          isAirCoolerSelected
                            ? "जैसे: Motor Jam, Pump Not Working, General Service..."
                            : isFridgeOrWCSelected
                            ? "जैसे: Cooling Not Proper, Gas Leakage, Overflow / Tap Fault..."
                            : "जैसे: No Cooling, Water Leakage..."
                        }
                        value={faultDetails}
                        onChange={(e) => setFaultDetails(e.target.value)}
                        style={inputStyle}
                      />

                      <button
                        type="button"
                        onClick={() => setWizardStep(2)}
                        style={{
                          marginTop: "10px",
                          padding: "10px",
                          backgroundColor: "#166534",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          fontWeight: "bold",
                          cursor: "pointer",
                        }}
                      >
                        अगला (Next) →
                      </button>
                    </div>
                  )}

                  {/* स्टेप 2 (A): DEEP FREEZER / REFRIGERATOR / WATER COOLER */}
                  {wizardStep === 2 && isFridgeOrWCSelected && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <h4>
                        {isWaterCoolerSelected
                          ? "स्टेप 2: Water Cooler तकनीकी विवरण"
                          : "स्टेप 2: Deep Freezer / Refrigerator तकनीकी विवरण"}
                      </h4>

                      <div
                        style={{
                          background: "#f8fafc",
                          padding: "12px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "10px",
                        }}
                      >
                        <div>
                          <label
                            style={{
                              fontSize: "11px",
                              fontWeight: "bold",
                              display: "block",
                              marginBottom: "3px",
                            }}
                          >
                            1. यूनिट मॉडल नंबर (Unit Model No.):
                          </label>
                          <input
                            type="text"
                            placeholder="Unit Model No."
                            value={unitModel}
                            onChange={(e) => setUnitModel(e.target.value)}
                            style={{ ...inputStyle, width: "100%", fontSize: "12px" }}
                          />
                        </div>

                        <div>
                          <label
                            style={{
                              fontSize: "11px",
                              fontWeight: "bold",
                              display: "block",
                              marginBottom: "3px",
                            }}
                          >
                            2. यूनिट सीरियल नंबर (Unit Serial No.):
                          </label>
                          <input
                            type="text"
                            placeholder="Unit Serial No."
                            value={unitSerial}
                            onChange={(e) => setUnitSerial(e.target.value)}
                            style={{ ...inputStyle, width: "100%", fontSize: "12px" }}
                          />
                        </div>

                        <div>
                          <label
                            style={{
                              fontSize: "11px",
                              fontWeight: "bold",
                              display: "block",
                              marginBottom: "3px",
                            }}
                          >
                            3. यूनिट कैपेसिटी (in Litres):
                          </label>
                          <input
                            type="text"
                            placeholder="जैसे: 300 Ltr / 500 Ltr"
                            value={unitCapacity}
                            onChange={(e) => setUnitCapacity(e.target.value)}
                            style={{ ...inputStyle, width: "100%", fontSize: "12px" }}
                          />
                        </div>

                        <div>
                          <label
                            style={{
                              fontSize: "11px",
                              fontWeight: "bold",
                              display: "block",
                              marginBottom: "3px",
                            }}
                          >
                            4. कंडेंसर In / Out (Condenser In/Out):
                          </label>
                          <select
                            value={condenserInOut}
                            onChange={(e) => setCondenserInOut(e.target.value)}
                            style={{ ...inputStyle, width: "100%", fontSize: "12px" }}
                          >
                            <option value="OK">OK</option>
                            <option value="In">In (इन)</option>
                            <option value="Out">Out (आउट)</option>
                            <option value="Clean / Serviced">
                              Clean / Serviced
                            </option>
                            <option value="Choked / Damaged">
                              Choked / Damaged
                            </option>
                          </select>
                        </div>

                        <div>
                          <label
                            style={{
                              fontSize: "11px",
                              fontWeight: "bold",
                              display: "block",
                              marginBottom: "3px",
                            }}
                          >
                            5. कंप्रेसर मॉडल नंबर (Compressor Model):
                          </label>
                          <input
                            type="text"
                            placeholder="Compressor Model No."
                            value={compressorModel}
                            onChange={(e) => setCompressorModel(e.target.value)}
                            style={{ ...inputStyle, width: "100%", fontSize: "12px" }}
                          />
                        </div>

                        <div>
                          <label
                            style={{
                              fontSize: "11px",
                              fontWeight: "bold",
                              display: "block",
                              marginBottom: "3px",
                            }}
                          >
                            6. कंप्रेसर सीरियल नंबर (Compressor Serial):
                          </label>
                          <input
                            type="text"
                            placeholder="Compressor Serial No."
                            value={compressorSerial}
                            onChange={(e) =>
                              setCompressorSerial(e.target.value)
                            }
                            style={{ ...inputStyle, width: "100%", fontSize: "12px" }}
                          />
                        </div>

                        <div>
                          <label
                            style={{
                              fontSize: "11px",
                              fontWeight: "bold",
                              display: "block",
                              marginBottom: "3px",
                            }}
                          >
                            7. कंप्रेसर Ampere:
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 2.4 A"
                            value={compressorAmpere}
                            onChange={(e) =>
                              setCompressorAmpere(e.target.value)
                            }
                            style={{ ...inputStyle, width: "100%", fontSize: "12px" }}
                          />
                        </div>

                        <div>
                          <label
                            style={{
                              fontSize: "11px",
                              fontWeight: "bold",
                              display: "block",
                              marginBottom: "3px",
                            }}
                          >
                            8. यूनिट Ampere (Unit Ampere):
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 2.8 A"
                            value={ampere}
                            onChange={(e) => setAmpere(e.target.value)}
                            style={{ ...inputStyle, width: "100%", fontSize: "12px" }}
                          />
                        </div>

                        {isWaterCoolerSelected && (
                          <>
                            <div>
                              <label
                                style={{
                                  fontSize: "11px",
                                  fontWeight: "bold",
                                  display: "block",
                                  marginBottom: "3px",
                                  color: "#0369a1",
                                }}
                              >
                                9. टंकी साइज (Tank Size in Litres):
                              </label>
                              <select
                                value={wcTankSize}
                                onChange={(e) => setWcTankSize(e.target.value)}
                                style={{
                                  ...inputStyle,
                                  width: "100%",
                                  fontSize: "12px",
                                }}
                              >
                                <option value="20">20 Litres</option>
                                <option value="40">40 Litres</option>
                                <option value="60">60 Litres</option>
                                <option value="80">80 Litres</option>
                                <option value="120">120 Litres</option>
                                <option value="150">150 Litres</option>
                              </select>
                            </div>

                            <div>
                              <label
                                style={{
                                  fontSize: "11px",
                                  fontWeight: "bold",
                                  display: "block",
                                  marginBottom: "3px",
                                  color: "#0369a1",
                                }}
                              >
                                10. टोटी कितनी है (Number of Taps):
                              </label>
                              <select
                                value={wcTapCount}
                                onChange={(e) => setWcTapCount(e.target.value)}
                                style={{
                                  ...inputStyle,
                                  width: "100%",
                                  fontSize: "12px",
                                }}
                              >
                                <option value="1">1 टोटी</option>
                                <option value="2">2 टोटी</option>
                                <option value="3">3 टोटी</option>
                              </select>
                            </div>

                            <div>
                              <label
                                style={{
                                  fontSize: "11px",
                                  fontWeight: "bold",
                                  display: "block",
                                  marginBottom: "3px",
                                  color: "#0369a1",
                                }}
                              >
                                11. Water Overflow के लिए क्या लगा है:
                              </label>
                              <select
                                value={wcOverflowType}
                                onChange={(e) =>
                                  setWcOverflowType(e.target.value)
                                }
                                style={{
                                  ...inputStyle,
                                  width: "100%",
                                  fontSize: "12px",
                                }}
                              >
                                <option value="Switch">Switch (स्विच)</option>
                                <option value="Float Ball">
                                  Float Ball (फ्लोट बॉल)
                                </option>
                                <option value="Electric Unit">
                                  Electric Unit (इलेक्ट्रिक यूनिट)
                                </option>
                              </select>
                            </div>

                            <div>
                              <label
                                style={{
                                  fontSize: "11px",
                                  fontWeight: "bold",
                                  display: "block",
                                  marginBottom: "3px",
                                  color: "#0369a1",
                                }}
                              >
                                12. कंडेंसिंग कॉइल साइज (Condensing Coil Size):
                              </label>
                              <input
                                type="text"
                                placeholder="जैसे: 12×14×2 Row"
                                value={wcCondensingCoilSize}
                                onChange={(e) =>
                                  setWcCondensingCoilSize(e.target.value)
                                }
                                style={{
                                  ...inputStyle,
                                  width: "100%",
                                  fontSize: "12px",
                                }}
                              />
                            </div>
                          </>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          marginTop: "8px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setWizardStep(1)}
                          style={{
                            flex: 1,
                            padding: "10px",
                            backgroundColor: "#64748b",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                          }}
                        >
                          ← पीछे
                        </button>
                        <button
                          type="button"
                          onClick={() => setWizardStep(3)}
                          style={{
                            flex: 1,
                            padding: "10px",
                            backgroundColor: "#166534",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            fontWeight: "bold",
                            cursor: "pointer",
                          }}
                        >
                          अगला →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* स्टेप 2 (B): AIR COOLER CHECKLIST */}
                  {wizardStep === 2 && isAirCoolerSelected && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <h4>स्टेप 2: कूलर विवरण एवं निरीक्षण चेकलिस्ट</h4>

                      <div
                        style={{
                          background: "#f8fafc",
                          padding: "10px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        <strong style={{ fontSize: "12px", color: "#0f172a" }}>
                          2. कूलर का विवरण (Cooler Specifications):
                        </strong>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: "11px", fontWeight: "bold" }}>
                              बॉडी टाइप (Body Material):
                            </label>
                            <select
                              value={coolerBodyMaterial}
                              onChange={(e) =>
                                setCoolerBodyMaterial(e.target.value)
                              }
                              style={{ ...inputStyle, width: "100%", fontSize: "12px" }}
                            >
                              <option value="Fiber / Plastic">
                                फाइबर / प्लास्टिक
                              </option>
                              <option value="GI / Metal">
                                जी. आई. / लोहा (Metal)
                              </option>
                            </select>
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: "11px", fontWeight: "bold" }}>
                              कूलर टाइप (Cooler Type):
                            </label>
                            <select
                              value={coolerSubType}
                              onChange={(e) => setCoolerSubType(e.target.value)}
                              style={{ ...inputStyle, width: "100%", fontSize: "12px" }}
                            >
                              <option value="Duct Cooler">डक्ट कूलर</option>
                              <option value="Desert Cooler">डेजर्ट कूलर</option>
                              <option value="Tower Cooler">टावर कूलर</option>
                              <option value="Room / Personal Cooler">
                                रूम कूलर
                              </option>
                            </select>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "6px" }}>
                          <input
                            type="text"
                            placeholder="क्षमता / साइज़ (जैसे 70 Ltr)"
                            value={coolerCapacity}
                            onChange={(e) => setCoolerCapacity(e.target.value)}
                            style={{ ...inputStyle, flex: 1, fontSize: "12px" }}
                          />
                          <input
                            type="text"
                            placeholder="ब्रांड / मॉडल"
                            value={coolerBrandModel}
                            onChange={(e) => setCoolerBrandModel(e.target.value)}
                            style={{ ...inputStyle, flex: 1, fontSize: "12px" }}
                          />
                        </div>

                        <div style={{ display: "flex", gap: "6px" }}>
                          <input
                            type="text"
                            placeholder="सीरियल / टैग नं."
                            value={coolerSerialNo}
                            onChange={(e) => setCoolerSerialNo(e.target.value)}
                            style={{ ...inputStyle, flex: 2, fontSize: "12px" }}
                          />
                          <input
                            type="number"
                            min="1"
                            placeholder="कुल संख्या"
                            value={coolerTotalQty}
                            onChange={(e) => setCoolerTotalQty(e.target.value)}
                            style={{ ...inputStyle, flex: 1, fontSize: "12px" }}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          background: "#f8fafc",
                          padding: "10px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "8px",
                        }}
                      >
                        <div style={{ gridColumn: "1 / -1" }}>
                          <strong style={{ fontSize: "12px", color: "#0f172a" }}>
                            3. चेकलिस्ट एवं निरीक्षण (Inspection Checklist):
                          </strong>
                        </div>

                        <div>
                          <label style={{ fontSize: "11px", fontWeight: "bold" }}>
                            फैन मोटर (Fan Motor):
                          </label>
                          <select
                            value={coolerFanMotor}
                            onChange={(e) => setCoolerFanMotor(e.target.value)}
                            style={{ ...inputStyle, width: "100%", fontSize: "12px" }}
                          >
                            <option value="OK">सही</option>
                            <option value="Jam / Bearing Bad">
                              जाम / बेयरिंग खराब
                            </option>
                            <option value="Winding Burnt">
                              वाइंडिंग जली हुई
                            </option>
                            <option value="Capacitor Bad">कैपेसिटर खराब</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: "11px", fontWeight: "bold" }}>
                            वाटर पंप (Submersible Pump):
                          </label>
                          <select
                            value={coolerWaterPump}
                            onChange={(e) => setCoolerWaterPump(e.target.value)}
                            style={{ ...inputStyle, width: "100%", fontSize: "12px" }}
                          >
                            <option value="OK">सही</option>
                            <option value="Not Pumping">
                              पानी नहीं उठा रहा
                            </option>
                            <option value="Replace Required">
                              बदलना आवश्यक
                            </option>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: "11px", fontWeight: "bold" }}>
                            स्विंग मोटर एवं ब्लेड:
                          </label>
                          <select
                            value={coolerSwingBlade}
                            onChange={(e) => setCoolerSwingBlade(e.target.value)}
                            style={{ ...inputStyle, width: "100%", fontSize: "12px" }}
                          >
                            <option value="OK">सही</option>
                            <option value="Swing Bad">स्विंग खराब</option>
                            <option value="Blade Broken">
                              फैन ब्लेड टूटा / असंतुलित
                            </option>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: "11px", fontWeight: "bold" }}>
                            कूलिंग पैड प्रकार:
                          </label>
                          <select
                            value={coolerPadType}
                            onChange={(e) => setCoolerPadType(e.target.value)}
                            style={{ ...inputStyle, width: "100%", fontSize: "12px" }}
                          >
                            <option value="Honeycomb">हनीकॉम्ब</option>
                            <option value="Wood Wool">वुड वूल (घास)</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: "11px", fontWeight: "bold" }}>
                            कूलिंग पैड स्थिति:
                          </label>
                          <select
                            value={coolerPadStatus}
                            onChange={(e) => setCoolerPadStatus(e.target.value)}
                            style={{ ...inputStyle, width: "100%", fontSize: "12px" }}
                          >
                            <option value="Clean">साफ</option>
                            <option value="Replaceable">बदलने योग्य</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: "11px", fontWeight: "bold" }}>
                            वाटर टैंक एवं प्लंबिंग:
                          </label>
                          <select
                            value={coolerTankPlumbing}
                            onChange={(e) =>
                              setCoolerTankPlumbing(e.target.value)
                            }
                            style={{ ...inputStyle, width: "100%", fontSize: "12px" }}
                          >
                            <option value="OK">सही</option>
                            <option value="Leakage">लीकेज है</option>
                            <option value="Float Valve Bad">
                              फ्लोट वाल्व खराब
                            </option>
                            <option value="Drain / Pipe Jam">
                              ड्रेन / डिस्ट्रीब्यूशन पाइप जाम
                            </option>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: "11px", fontWeight: "bold" }}>
                            इलेक्ट्रिकल एवं वायरिंग:
                          </label>
                          <select
                            value={coolerElectrical}
                            onChange={(e) => setCoolerElectrical(e.target.value)}
                            style={{ ...inputStyle, width: "100%", fontSize: "12px" }}
                          >
                            <option value="OK">सही</option>
                            <option value="Rotary Switch Bad">
                              रोटरी स्विच खराब
                            </option>
                            <option value="Wiring Burnt">
                              वायरिंग कटी / जली
                            </option>
                            <option value="Plug / Earthing Checked">
                              प्लग टॉप खराब / अर्थिंग चेक
                            </option>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: "11px", fontWeight: "bold" }}>
                            बॉडी एवं पेंट (Body &amp; Paint):
                          </label>
                          <select
                            value={coolerBodyPaint}
                            onChange={(e) => setCoolerBodyPaint(e.target.value)}
                            style={{ ...inputStyle, width: "100%", fontSize: "12px" }}
                          >
                            <option value="OK">सही</option>
                            <option value="Rusting">जंग (Rusting) लगी है</option>
                            <option value="Welding Required">
                              टैंक में छेद / वेल्डिंग जरूरत
                            </option>
                            <option value="Painting Required">
                              प्राइमर एवं पेंटिंग आवश्यक
                            </option>
                          </select>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          marginTop: "8px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setWizardStep(1)}
                          style={{
                            flex: 1,
                            padding: "10px",
                            backgroundColor: "#64748b",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                          }}
                        >
                          ← पीछे
                        </button>
                        <button
                          type="button"
                          onClick={() => setWizardStep(3)}
                          style={{
                            flex: 1,
                            padding: "10px",
                            backgroundColor: "#166534",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            fontWeight: "bold",
                            cursor: "pointer",
                          }}
                        >
                          अगला →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* स्टेप 2 (C): AC / HVAC (Slide 1 to 4) */}
                  {wizardStep === 2 &&
                    !isAirCoolerSelected &&
                    !isFridgeOrWCSelected && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        <h4>स्टेप 2: टेक्निकल पैरामीटर्स एवं चेकलिस्ट</h4>

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            background: "#f1f5f9",
                            padding: "8px 10px",
                            borderRadius: "6px",
                          }}
                        >
                          <strong style={{ fontSize: "12px" }}>
                            भाग {techSlide} / 4
                          </strong>
                          <div style={{ display: "flex", gap: "6px" }}>
                            {[1, 2, 3, 4].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setTechSlide(num)}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: "4px",
                                  border: "1px solid #1e3a8a",
                                  background:
                                    techSlide === num ? "#1e3a8a" : "#ffffff",
                                  color:
                                    techSlide === num ? "#ffffff" : "#1e3a8a",
                                  fontWeight: "bold",
                                  fontSize: "12px",
                                  cursor: "pointer",
                                }}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                        </div>

                        {techSlide === 1 && (
                          <div
                            style={{
                              background: "#f8fafc",
                              padding: "10px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                            }}
                          >
                            <strong
                              style={{ fontSize: "12px", color: "#0f172a" }}
                            >
                              1. यूनिट और कंप्रेसर विवरण
                            </strong>
                            <div style={{ display: "flex", gap: "5px" }}>
                              <input
                                type="text"
                                placeholder="Indoor Model"
                                value={indoorModel}
                                onChange={(e) => setIndoorModel(e.target.value)}
                                style={{
                                  ...inputStyle,
                                  flex: 1,
                                  fontSize: "12px",
                                }}
                              />
                              <input
                                type="text"
                                placeholder="Indoor Serial"
                                value={indoorSerial}
                                onChange={(e) =>
                                  setIndoorSerial(e.target.value)
                                }
                                style={{
                                  ...inputStyle,
                                  flex: 1,
                                  fontSize: "12px",
                                }}
                              />
                            </div>
                            <div style={{ display: "flex", gap: "5px" }}>
                              <input
                                type="text"
                                placeholder="Outdoor Model"
                                value={outdoorModel}
                                onChange={(e) =>
                                  setOutdoorModel(e.target.value)
                                }
                                style={{
                                  ...inputStyle,
                                  flex: 1,
                                  fontSize: "12px",
                                }}
                              />
                              <input
                                type="text"
                                placeholder="Outdoor Serial"
                                value={outdoorSerial}
                                onChange={(e) =>
                                  setOutdoorSerial(e.target.value)
                                }
                                style={{
                                  ...inputStyle,
                                  flex: 1,
                                  fontSize: "12px",
                                }}
                              />
                            </div>
                            <div style={{ display: "flex", gap: "5px" }}>
                              <input
                                type="text"
                                placeholder="Compressor Model"
                                value={compressorModel}
                                onChange={(e) =>
                                  setCompressorModel(e.target.value)
                                }
                                style={{
                                  ...inputStyle,
                                  flex: 1,
                                  fontSize: "12px",
                                }}
                              />
                              <input
                                type="text"
                                placeholder="Compressor Serial"
                                value={compressorSerial}
                                onChange={(e) =>
                                  setCompressorSerial(e.target.value)
                                }
                                style={{
                                  ...inputStyle,
                                  flex: 1,
                                  fontSize: "12px",
                                }}
                              />
                            </div>
                            <div style={{ display: "flex", gap: "5px" }}>
                              <input
                                type="text"
                                placeholder="In-Door Motor Model"
                                value={indoorMotorModel}
                                onChange={(e) =>
                                  setIndoorMotorModel(e.target.value)
                                }
                                style={{
                                  ...inputStyle,
                                  flex: 1,
                                  fontSize: "12px",
                                }}
                              />
                              <input
                                type="text"
                                placeholder="In-Door Motor Serial"
                                value={indoorMotorSerial}
                                onChange={(e) =>
                                  setIndoorMotorSerial(e.target.value)
                                }
                                style={{
                                  ...inputStyle,
                                  flex: 1,
                                  fontSize: "12px",
                                }}
                              />
                            </div>
                            <div style={{ display: "flex", gap: "5px" }}>
                              <input
                                type="text"
                                placeholder="Out-Door Motor Model"
                                value={outdoorMotorModel}
                                onChange={(e) =>
                                  setOutdoorMotorModel(e.target.value)
                                }
                                style={{
                                  ...inputStyle,
                                  flex: 1,
                                  fontSize: "12px",
                                }}
                              />
                              <input
                                type="text"
                                placeholder="Out-Door Motor Serial"
                                value={outdoorMotorSerial}
                                onChange={(e) =>
                                  setOutdoorMotorSerial(e.target.value)
                                }
                                style={{
                                  ...inputStyle,
                                  flex: 1,
                                  fontSize: "12px",
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {techSlide === 2 && (
                          <div
                            style={{
                              background: "#f8fafc",
                              padding: "10px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: "8px",
                            }}
                          >
                            <div style={{ gridColumn: "1 / -1" }}>
                              <strong
                                style={{ fontSize: "12px", color: "#0f172a" }}
                              >
                                2. सर्विस एवं फिजिकल चेकलिस्ट:
                              </strong>
                            </div>
                            <div>
                              <label
                                style={{ fontSize: "11px", fontWeight: "bold" }}
                              >
                                FILTER CLEAN:
                              </label>
                              <select
                                value={filterClean}
                                onChange={(e) => setFilterClean(e.target.value)}
                                style={{
                                  ...inputStyle,
                                  width: "100%",
                                  fontSize: "12px",
                                }}
                              >
                                <option value="OK">OK (साफ किया)</option>
                                <option value="Not OK">Not OK / Damaged</option>
                                <option value="NA">N/A</option>
                              </select>
                            </div>
                            <div>
                              <label
                                style={{ fontSize: "11px", fontWeight: "bold" }}
                              >
                                STAND TYPE:
                              </label>
                              <select
                                value={standType}
                                onChange={(e) => setStandType(e.target.value)}
                                style={{
                                  ...inputStyle,
                                  width: "100%",
                                  fontSize: "12px",
                                }}
                              >
                                <option value="Wall Stand">Wall Stand</option>
                                <option value="Floor Stand">Floor Stand</option>
                                <option value="Hanging / Ceiling">
                                  Hanging / Ceiling
                                </option>
                                <option value="Not Required">Not Required</option>
                              </select>
                            </div>
                            <div>
                              <label
                                style={{ fontSize: "11px", fontWeight: "bold" }}
                              >
                                SWING / FLAPPER:
                              </label>
                              <select
                                value={swingFlapper}
                                onChange={(e) =>
                                  setSwingFlapper(e.target.value)
                                }
                                style={{
                                  ...inputStyle,
                                  width: "100%",
                                  fontSize: "12px",
                                }}
                              >
                                <option value="OK">OK</option>
                                <option value="Not Working">Not Working</option>
                                <option value="Broken">Broken</option>
                              </select>
                            </div>
                            <div>
                              <label
                                style={{ fontSize: "11px", fontWeight: "bold" }}
                              >
                                STABILIZER:
                              </label>
                              <select
                                value={stabilizer}
                                onChange={(e) => setStabilizer(e.target.value)}
                                style={{
                                  ...inputStyle,
                                  width: "100%",
                                  fontSize: "12px",
                                }}
                              >
                                <option value="OK">OK</option>
                                <option value="Faulty">Faulty</option>
                                <option value="Not Installed">
                                  Not Installed
                                </option>
                              </select>
                            </div>
                            <div>
                              <label
                                style={{ fontSize: "11px", fontWeight: "bold" }}
                              >
                                REMOTE:
                              </label>
                              <select
                                value={remoteStatus}
                                onChange={(e) =>
                                  setRemoteStatus(e.target.value)
                                }
                                style={{
                                  ...inputStyle,
                                  width: "100%",
                                  fontSize: "12px",
                                }}
                              >
                                <option value="OK">OK</option>
                                <option value="Not Working">Not Working</option>
                                <option value="Missing">Missing</option>
                              </select>
                            </div>
                            <div>
                              <label
                                style={{ fontSize: "11px", fontWeight: "bold" }}
                              >
                                OUTDOOR CLEAN:
                              </label>
                              <select
                                value={outdoorClean}
                                onChange={(e) =>
                                  setOutdoorClean(e.target.value)
                                }
                                style={{
                                  ...inputStyle,
                                  width: "100%",
                                  fontSize: "12px",
                                }}
                              >
                                <option value="OK">OK (सर्विस की गई)</option>
                                <option value="Pending">Pending</option>
                                <option value="NA">N/A</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {techSlide === 3 && (
                          <div
                            style={{
                              background: "#f8fafc",
                              padding: "10px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: "8px",
                            }}
                          >
                            <div style={{ gridColumn: "1 / -1" }}>
                              <strong
                                style={{ fontSize: "12px", color: "#0f172a" }}
                              >
                                3. गैस, पाइपिंग एवं तापमान माप:
                              </strong>
                            </div>
                            <div>
                              <label
                                style={{ fontSize: "11px", fontWeight: "bold" }}
                              >
                                ROOM TEMP (°C):
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. 24°C"
                                value={roomTemp}
                                onChange={(e) => setRoomTemp(e.target.value)}
                                style={{
                                  ...inputStyle,
                                  width: "100%",
                                  fontSize: "12px",
                                }}
                              />
                            </div>
                            <div>
                              <label
                                style={{ fontSize: "11px", fontWeight: "bold" }}
                              >
                                SUCTION PRESSURE:
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. 120 PSI"
                                value={sectionPressure}
                                onChange={(e) =>
                                  setSectionPressure(e.target.value)
                                }
                                style={{
                                  ...inputStyle,
                                  width: "100%",
                                  fontSize: "12px",
                                }}
                              />
                            </div>
                            <div>
                              <label
                                style={{ fontSize: "11px", fontWeight: "bold" }}
                              >
                                DRAIN WITH SIZE:
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. 1 inch PVC"
                                value={drainSize}
                                onChange={(e) => setDrainSize(e.target.value)}
                                style={{
                                  ...inputStyle,
                                  width: "100%",
                                  fontSize: "12px",
                                }}
                              />
                            </div>
                            <div>
                              <label
                                style={{ fontSize: "11px", fontWeight: "bold" }}
                              >
                                COPPER PIPE SIZE:
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. 1/4 & 1/2"
                                value={copperPipeSize}
                                onChange={(e) =>
                                  setCopperPipeSize(e.target.value)
                                }
                                style={{
                                  ...inputStyle,
                                  width: "100%",
                                  fontSize: "12px",
                                }}
                              />
                            </div>
                            <div>
                              <label
                                style={{ fontSize: "11px", fontWeight: "bold" }}
                              >
                                WIRE SIZE &amp; CORE:
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. 2.5 sqmm 3 Core"
                                value={wireSizeCore}
                                onChange={(e) =>
                                  setWireSizeCore(e.target.value)
                                }
                                style={{
                                  ...inputStyle,
                                  width: "100%",
                                  fontSize: "12px",
                                }}
                              />
                            </div>
                            <div>
                              <label
                                style={{ fontSize: "11px", fontWeight: "bold" }}
                              >
                                INSULATION:
                              </label>
                              <select
                                value={insulation}
                                onChange={(e) => setInsulation(e.target.value)}
                                style={{
                                  ...inputStyle,
                                  width: "100%",
                                  fontSize: "12px",
                                }}
                              >
                                <option value="OK">OK</option>
                                <option value="Damaged">Damaged</option>
                                <option value="Replaced">Replaced</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {techSlide === 4 && (
                          <div
                            style={{
                              background: "#f8fafc",
                              padding: "10px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                            }}
                          >
                            <strong
                              style={{ fontSize: "12px", color: "#0f172a" }}
                            >
                              {isSinglePhaseSelected
                                ? "4. वोल्टेज एवं एम्पीयर रीडिंग (Single Phase):"
                                : "4. वोल्टेज, एम्पीयर एवं 3-फ़ेज़ रीडिंग (R / Y / B):"}
                            </strong>

                            {isSinglePhaseSelected ? (
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "1fr 1fr 1fr",
                                  gap: "8px",
                                }}
                              >
                                <div>
                                  <label
                                    style={{
                                      fontSize: "11px",
                                      fontWeight: "bold",
                                      display: "block",
                                      marginBottom: "3px",
                                    }}
                                  >
                                    वोल्टेज (Voltage):
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. 230V"
                                    value={voltage}
                                    onChange={(e) => setVoltage(e.target.value)}
                                    style={{
                                      ...inputStyle,
                                      width: "100%",
                                      fontSize: "12px",
                                    }}
                                  />
                                </div>
                                <div>
                                  <label
                                    style={{
                                      fontSize: "11px",
                                      fontWeight: "bold",
                                      display: "block",
                                      marginBottom: "3px",
                                    }}
                                  >
                                    कंप्रेसर Ampere:
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. 6.5 A"
                                    value={compressorAmpere}
                                    onChange={(e) =>
                                      setCompressorAmpere(e.target.value)
                                    }
                                    style={{
                                      ...inputStyle,
                                      width: "100%",
                                      fontSize: "12px",
                                    }}
                                  />
                                </div>
                                <div>
                                  <label
                                    style={{
                                      fontSize: "11px",
                                      fontWeight: "bold",
                                      display: "block",
                                      marginBottom: "3px",
                                    }}
                                  >
                                    यूनिट Ampere:
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. 7.2 A"
                                    value={ampere}
                                    onChange={(e) => setAmpere(e.target.value)}
                                    style={{
                                      ...inputStyle,
                                      width: "100%",
                                      fontSize: "12px",
                                    }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <>
                                <div style={{ display: "flex", gap: "5px" }}>
                                  <input
                                    type="text"
                                    placeholder="Voltage (415V / 230V)"
                                    value={voltage}
                                    onChange={(e) => setVoltage(e.target.value)}
                                    style={{
                                      ...inputStyle,
                                      flex: 1,
                                      fontSize: "12px",
                                    }}
                                  />
                                  <input
                                    type="text"
                                    placeholder="Compressor Ampere"
                                    value={compressorAmpere}
                                    onChange={(e) =>
                                      setCompressorAmpere(e.target.value)
                                    }
                                    style={{
                                      ...inputStyle,
                                      flex: 1,
                                      fontSize: "12px",
                                    }}
                                  />
                                  <input
                                    type="text"
                                    placeholder="Unit Ampere"
                                    value={ampere}
                                    onChange={(e) => setAmpere(e.target.value)}
                                    style={{
                                      ...inputStyle,
                                      flex: 1,
                                      fontSize: "12px",
                                    }}
                                  />
                                </div>
                                <div style={{ display: "flex", gap: "5px" }}>
                                  <input
                                    type="text"
                                    placeholder="R Voltage"
                                    value={phaseR}
                                    onChange={(e) => setPhaseR(e.target.value)}
                                    style={{
                                      ...inputStyle,
                                      flex: 1,
                                      fontSize: "12px",
                                    }}
                                  />
                                  <input
                                    type="text"
                                    placeholder="Y Voltage"
                                    value={phaseY}
                                    onChange={(e) => setPhaseY(e.target.value)}
                                    style={{
                                      ...inputStyle,
                                      flex: 1,
                                      fontSize: "12px",
                                    }}
                                  />
                                  <input
                                    type="text"
                                    placeholder="B Voltage"
                                    value={phaseB}
                                    onChange={(e) => setPhaseB(e.target.value)}
                                    style={{
                                      ...inputStyle,
                                      flex: 1,
                                      fontSize: "12px",
                                    }}
                                  />
                                </div>
                                <div style={{ display: "flex", gap: "5px" }}>
                                  <input
                                    type="text"
                                    placeholder="R Ampere"
                                    value={ampR}
                                    onChange={(e) => setAmpR(e.target.value)}
                                    style={{
                                      ...inputStyle,
                                      flex: 1,
                                      fontSize: "12px",
                                    }}
                                  />
                                  <input
                                    type="text"
                                    placeholder="Y Ampere"
                                    value={ampY}
                                    onChange={(e) => setAmpY(e.target.value)}
                                    style={{
                                      ...inputStyle,
                                      flex: 1,
                                      fontSize: "12px",
                                    }}
                                  />
                                  <input
                                    type="text"
                                    placeholder="B Ampere"
                                    value={ampB}
                                    onChange={(e) => setAmpB(e.target.value)}
                                    style={{
                                      ...inputStyle,
                                      flex: 1,
                                      fontSize: "12px",
                                    }}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            disabled={techSlide === 1}
                            onClick={() =>
                              setTechSlide((prev) => Math.max(1, prev - 1))
                            }
                            style={{
                              flex: 1,
                              padding: "8px",
                              background: "#e2e8f0",
                              color: "#1e293b",
                              border: "none",
                              borderRadius: "4px",
                              fontWeight: "bold",
                              opacity: techSlide === 1 ? 0.5 : 1,
                              cursor: "pointer",
                            }}
                          >
                            ← पिछला भाग
                          </button>
                          <button
                            type="button"
                            disabled={techSlide === 4}
                            onClick={() =>
                              setTechSlide((prev) => Math.min(4, prev + 1))
                            }
                            style={{
                              flex: 1,
                              padding: "8px",
                              background: "#1e3a8a",
                              color: "#fff",
                              border: "none",
                              borderRadius: "4px",
                              fontWeight: "bold",
                              opacity: techSlide === 4 ? 0.5 : 1,
                              cursor: "pointer",
                            }}
                          >
                            अगला भाग →
                          </button>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            marginTop: "8px",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setWizardStep(1)}
                            style={{
                              flex: 1,
                              padding: "10px",
                              backgroundColor: "#64748b",
                              color: "#fff",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                            }}
                          >
                            ← पीछे
                          </button>
                          <button
                            type="button"
                            onClick={() => setWizardStep(3)}
                            style={{
                              flex: 1,
                              padding: "10px",
                              backgroundColor: "#166534",
                              color: "#fff",
                              border: "none",
                              borderRadius: "6px",
                              fontWeight: "bold",
                              cursor: "pointer",
                            }}
                          >
                            अगला →
                          </button>
                        </div>
                      </div>
                    )}

                  {/* स्टेप 3: किया गया कार्य + स्पेयर पार्ट्स + सर्विस चार्ज एवं टोटल बिल */}
                  {wizardStep === 3 && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      <h4 style={{ margin: "4px 0", color: "#0f172a" }}>
                        स्टेप 3: किया गया कार्य, स्पेयर पार्ट्स एवं टोटल बिल
                      </h4>

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
                          1. किया गया कार्य (Work Done):
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
                          2. स्पेयर पार्ट विकल्प:
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
                                      style={{ ...inputStyle, flex: 2, minWidth: 0 }}
                                    />
                                    <input
                                      type="number"
                                      min="1"
                                      placeholder="Qty"
                                      value={item.qty}
                                      onChange={(e) =>
                                        updatePartRow(idx, "qty", e.target.value)
                                      }
                                      style={{ ...inputStyle, flex: 0.7, minWidth: 0 }}
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
                                      style={{ ...inputStyle, flex: 1, minWidth: 0 }}
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
                                onChange={(e) => setSparePartName(e.target.value)}
                                style={{ ...inputStyle, flex: 1 }}
                              />
                              <input
                                type="text"
                                placeholder="Model / No."
                                value={sparePartModel}
                                onChange={(e) => setSparePartModel(e.target.value)}
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
                          3. सर्विस / अन्य चार्ज (₹):
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0.00"
                          value={serviceChargeInput}
                          onChange={(e) => setServiceChargeInput(e.target.value)}
                          style={{ ...inputStyle, width: "100%", fontWeight: "bold" }}
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

                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          marginTop: "6px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setWizardStep(2)}
                          style={{
                            flex: 1,
                            padding: "10px",
                            backgroundColor: "#64748b",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                          }}
                        >
                          ← पीछे
                        </button>
                        <button
                          type="button"
                          onClick={() => setWizardStep(4)}
                          style={{
                            flex: 1,
                            padding: "10px",
                            backgroundColor: "#166534",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            fontWeight: "bold",
                            cursor: "pointer",
                          }}
                        >
                          अगला →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* स्टेप 4: स्टेटस, फोटो और कस्टमर हस्ताक्षर */}
                  {wizardStep === 4 && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <h4>स्टेप 4: स्टेटस, फोटो और कस्टमर हस्ताक्षर</h4>
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
                          <label style={{ fontSize: "12px", fontWeight: "bold" }}>
                            पेंडिंग का कारण:
                          </label>
                          <select
                            value={pendingSubOption}
                            onChange={(e) => setPendingSubOption(e.target.value)}
                            style={inputStyle}
                          >
                            <option value="Part Pending">
                              Part Pending (पार्ट प्रतीक्षित)
                            </option>
                            <option value="Repeat Complaint">
                              Repeat Complaint
                            </option>
                            <option value="Customer Busy">Customer Busy</option>
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

                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          marginTop: "12px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setWizardStep(3)}
                          style={{
                            flex: 1,
                            padding: "12px",
                            backgroundColor: "#64748b",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                          }}
                        >
                          ← पीछे
                        </button>
                        <button
                          type="button"
                          onClick={handleJobSubmit}
                          style={{
                            flex: 2,
                            padding: "12px",
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
                    </div>
                  )}
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
                                  margin: "0 0 10px 0",
                                  color: "#166534",
                                }}
                              >
                                📁 स्टाफ: {selectedStaffFolder} (कम्पलीट जॉब्स)
                              </h4>
                              {completedByStaff[selectedStaffFolder].map(
                                (job) => (
                                  <div
                                    key={job.jobSheetNo}
                                    onClick={() => setInspectedJob(job)}
                                    style={{
                                      border: "1px solid #86efac",
                                      padding: "10px",
                                      borderRadius: "6px",
                                      marginBottom: "8px",
                                      background: "#f0fdf4",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <div>
                                      <strong style={{ color: "#2563eb" }}>
                                        {job.jobSheetNo}
                                      </strong>{" "}
                                      - {job.customerName} ({job.customerPhone})
                                    </div>
                                    <div
                                      style={{
                                        fontSize: "12px",
                                        color: "#475569",
                                      }}
                                    >
                                      उत्पाद: {job.product} | तारीख: {job.date}
                                    </div>
                                  </div>
                                )
                              )}
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
                                  margin: "0 0 10px 0",
                                  color: "#d97706",
                                }}
                              >
                                📁 स्टाफ: {selectedStaffFolder} (पेंडिंग जॉब्स)
                              </h4>
                              {pendingByStaff[selectedStaffFolder].map(
                                (job) => (
                                  <div
                                    key={job.jobSheetNo}
                                    onClick={() => setInspectedJob(job)}
                                    style={{
                                      border: "1px solid #fcd34d",
                                      padding: "10px",
                                      borderRadius: "6px",
                                      marginBottom: "8px",
                                      background: "#fffbeb",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <div>
                                      <strong style={{ color: "#d97706" }}>
                                        {job.jobSheetNo}
                                      </strong>{" "}
                                      - {job.customerName} ({job.customerPhone})
                                    </div>
                                    <div
                                      style={{
                                        fontSize: "12px",
                                        color: "#475569",
                                      }}
                                    >
                                      उत्पाद: {job.product} | विवरण: {job.desc}
                                    </div>
                                  </div>
                                )
                              )}
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

                  {/* ==========================================================
                      ATTENDANCE DRILL-DOWN: YEAR -> MONTH -> STAFF -> DAILY LOGS
                      ========================================================== */}
                  {adminMainTab === "attendance" && (
                    <div>
                      {/* STEP 1: YEAR SELECTION */}
                      {!attSelectedYear && (
                        <div>
                          <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#0f172a" }}>
                            📅 वर्ष चुनें (Select Year):
                          </h4>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
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

                      {/* STEP 2: MONTH SELECTION */}
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
                          <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#0f172a" }}>
                            📆 महीना चुनें (वर्ष {attSelectedYear}):
                          </h4>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                            {HINDI_MONTHS.map((mLabel, index) => {
                              const mCode = String(index + 1).padStart(2, "0");
                              const countInMonth = attendanceRecords.filter(
                                (r) => r.year === attSelectedYear && r.month === mCode
                              ).length;
                              return (
                                <button
                                  key={mCode}
                                  type="button"
                                  onClick={() => setAttSelectedMonth(mCode)}
                                  style={{
                                    padding: "10px",
                                    background: countInMonth > 0 ? "#f0fdf4" : "#f8fafc",
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
                                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                                    रिकॉर्ड्स: {countInMonth}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* STEP 3: STAFF LIST FOR SELECTED YEAR & MONTH */}
                      {attSelectedYear && attSelectedMonth && !attSelectedStaffPhone && (
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
                          <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#0f172a" }}>
                            👷 स्टाफ चुनें ({HINDI_MONTHS[parseInt(attSelectedMonth, 10) - 1]} {attSelectedYear}):
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
                                  name: r.staffName || `Staff (${r.staffPhone})`,
                                  days: 0,
                                };
                              }
                              staffMap[r.staffPhone].days += 1;
                            });
                            const staffList = Object.values(staffMap);

                            if (staffList.length === 0) {
                              return (
                                <p style={{ color: "#64748b", fontSize: "13px" }}>
                                  इस महीने में किसी स्टाफ की अटेंडेंस दर्ज नहीं है।
                                </p>
                              );
                            }

                            return staffList.map((st) => (
                              <div
                                key={st.phone}
                                onClick={() => setAttSelectedStaffPhone(st.phone)}
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
                                  <div style={{ fontSize: "11px", color: "#64748b" }}>
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

                      {/* STEP 4: FULL MONTH DAILY IN/OUT, DURATION, TEXT ROUTE & GOOGLE MAP */}
                      {attSelectedYear && attSelectedMonth && attSelectedStaffPhone && (
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
                                String(b.dateKey).localeCompare(String(a.dateKey))
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
                                  📋 {staffTitle} — {HINDI_MONTHS[parseInt(attSelectedMonth, 10) - 1]}{" "}
                                  {attSelectedYear}
                                </h4>

                                {dailyLogs.map((rec) => {
                                  const pts = Array.isArray(rec.routePoints)
                                    ? rec.routePoints
                                    : [];

                                  // पूरे दिन का टेक्स्ट रूट
                                  const textRoute =
                                    pts.length > 0
                                      ? pts
                                          .map(
                                            (p) =>
                                              `${p.timeText} (${p.address})`
                                          )
                                          .join(" ➔ ")
                                      : "लोकेशन डेटा उपलब्ध नहीं";

                                  // Google Maps पूरा रूट लिंक
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
                                    },${validCoords[validCoords.length - 1].lng}`;
                                    const mid = validCoords
                                      .slice(1, -1)
                                      .slice(0, 8)
                                      .map((c) => `${c.lat},${c.lng}`)
                                      .join("|");
                                    googleMapUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${
                                      mid ? `&waypoints=${encodeURIComponent(mid)}` : ""
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
                                        <strong style={{ fontSize: "13px", color: "#0f172a" }}>
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
                                          कुल समय: {calcWorkDuration(rec.inTime, rec.outTime)}
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
                                        <strong>📍 पूरे दिन का रूट (Text Route):</strong>
                                        <div style={{ color: "#334155", marginTop: "3px" }}>
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
                                          🗺️ Google Map पर पूरा रूट देखें ({validCoords.length} Points)
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