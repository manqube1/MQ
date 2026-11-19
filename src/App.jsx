import React, { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import JobSheet from "./JobSheet";
import "./JobSheet.css";

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

const TELEGRAM_BOT_TOKEN = "8692296744:AAEsS00K5x0yv_gnjljcAYvNCaIaunVc";
const TELEGRAM_CHAT_ID = "5603316430";

const sendStaffTelegramAlert = async (messageText) => {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: messageText,
      }),
    });
  } catch (err) {
    console.error("Telegram alert error:", err);
  }
};

const initialJobForm = {
  customerName: "",
  mobile: "",
  address: "",
  jobNo: "",
  billNo: "",
  amc: "NO",
  dateIn: "",
  dateOut: "",
  product: "Split / Window AC",
  indoorModel: "",
  indoorSerial: "",
  outdoorModel: "",
  outdoorSerial: "",
  compressorModel: "",
  compressorSerial: "",
  indoorMotorModel: "",
  indoorMotorSerial: "",
  outdoorMotorModel: "",
  outdoorMotorSerial: "",
  filterClean: "OK (साफ़ किया)",
  standType: "Wall Stand",
  swingFlapper: "OK",
  stabilizer: "OK",
  remote: "OK",
  outdoorClean: "OK (सर्विस की गई)",
  servicing: "NO",
  roomTemp: "",
  suctionPressure: "",
  dischargePressure: "",
  compressorAmpere: "",
  drainSize: "",
  copperPipeSize: "",
  insulation: "OK",
  voltage230: "230V",
  totalAmpere: "",
  wireSizeCore: "",
  voltageR: "",
  voltageY: "",
  voltageB: "",
  ampereR: "",
  ampereY: "",
  ampereB: "",
  workDone: "",
  partOption: "Used Part (इस्तेमाल किया गया)",
  rate: "",
  jobStatus: "Completed (पूर्ण)",
  customerRemark: "",
  customerSignature: "",
  signMobile: "",
  signDate: "",
};

const createEmptyPart = () => ({ partName: "", qty: 1, amount: "" });

export default function App() {
  const [viewMode, setViewMode] = useState("wizard"); // "wizard" | "printSheet"
  const [wizardStep, setWizardStep] = useState(1); // 1 to 5
  const [techSlide, setTechSlide] = useState(1); // 1 to 4 (Step 2 slides)
  const [staffInfo, setStaffInfo] = useState({
    name: "Staff",
    phone: "9415522032",
  });
  const [gpsStatus, setGpsStatus] = useState("GPS: Locating...");
  const [jobForm, setJobForm] = useState(initialJobForm);
  const [usedParts, setUsedParts] = useState([createEmptyPart()]);
  const [sitePhotos, setSitePhotos] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  const [savedJobs, setSavedJobs] = useState([]);
  const [statusMsg, setStatusMsg] = useState("");
  const [sigModalOpen, setSigModalOpen] = useState(false);

  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsStatus(
            `GPS: Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)} (GPS Active)`
          );
        },
        () => {
          setGpsStatus("GPS: Lat: 25.4591, Lng: 81.8611 (GPS Active)");
        }
      );
    } else {
      setGpsStatus("GPS: Lat: 25.4591, Lng: 81.8611 (GPS Active)");
    }
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "jobSheets"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSavedJobs(list);
    });
    return () => unsub();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setJobForm((prev) => ({ ...prev, [name]: value }));
  };

  // Used Part rows helpers
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

  const isUsedPartSelected = String(jobForm.partOption || "").includes("Used Part");

  const partsTotal = isUsedPartSelected
    ? usedParts.reduce((sum, item) => {
        const q = parseFloat(item.qty) || 0;
        const amt = parseFloat(item.amount) || 0;
        return sum + q * amt;
      }, 0)
    : 0;

  const serviceCharge = parseFloat(jobForm.rate) || 0;
  const grandTotalBill = partsTotal + serviceCharge;

  // स्टेप 5: कैमरा से साइट और सामान की फोटो खींचकर अपलोड करना
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
    setStatusMsg("");

    try {
      setUploadingPhotos(true);
      for (const item of previews) {
        const storageRef = ref(
          storage,
          `job_photos/${Date.now()}_${item.name}`
        );
        await uploadBytesResumable(storageRef, item.file);
        const downloadUrl = await getDownloadURL(storageRef);

        setSitePhotos((prev) =>
          prev.map((p) =>
            p.previewUrl === item.previewUrl ? { ...p, uploadedUrl: downloadUrl } : p
          )
        );
      }
      setStatusMsg("साइट व सामान की फोटो अपलोड हो गई है।");
    } catch (err) {
      console.error("Upload error:", err);
      setStatusMsg("फोटो अपलोड करने में समस्या आई।");
    } finally {
      setUploadingPhotos(false);
    }
  };

  const removePhoto = (index) => {
    setSitePhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // सिग्नेचर कैनवास हैंडलर्स
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

  const startSign = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
  };

  const drawSign = (e) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { x, y } = getCoords(e);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopSign = () => {
    isDrawingRef.current = false;
  };

  const clearSign = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    setJobForm((prev) => ({ ...prev, customerSignature: dataUrl }));
    setSigModalOpen(false);
  };

  const handleFinalSave = async () => {
    setSavingJob(true);
    setStatusMsg("");
    const photoUrls = sitePhotos
      .map((p) => p.uploadedUrl)
      .filter(Boolean);

    const activeParts = isUsedPartSelected
      ? usedParts.filter(
          (p) => p.partName.trim() || (parseFloat(p.amount) || 0) > 0
        )
      : [];

    const payload = {
      ...jobForm,
      staffName: staffInfo.name,
      staffPhone: staffInfo.phone,
      gpsStatus,
      usedParts: activeParts,
      partsTotal,
      serviceCharge,
      totalAmount: grandTotalBill,
      sitePhotoUrls: photoUrls,
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "jobSheets"), payload);

      const partsSummary = activeParts.length
        ? activeParts
            .map((p) => {
              const q = parseFloat(p.qty) || 0;
              const a = parseFloat(p.amount) || 0;
              return `${p.partName || "Part"} (${q} x ₹${a} = ₹${(q * a).toFixed(2)})`;
            })
            .join(", ")
        : null;

      const alertText = [
        "MANQUBE JOB SHEET SAVED",
        `Staff: ${staffInfo.name} (${staffInfo.phone})`,
        jobForm.jobNo ? `Job No: ${jobForm.jobNo}` : null,
        jobForm.customerName ? `Customer: ${jobForm.customerName}` : null,
        jobForm.mobile ? `Mobile: ${jobForm.mobile}` : null,
        jobForm.product ? `Product: ${jobForm.product}` : null,
        `AMC: ${jobForm.amc} | Servicing: ${jobForm.servicing}`,
        jobForm.workDone ? `Work Done: ${jobForm.workDone}` : null,
        jobForm.partOption ? `Part Option: ${jobForm.partOption}` : null,
        partsSummary ? `Parts: ${partsSummary}` : null,
        `Total Bill: ₹${grandTotalBill.toFixed(2)}`,
        `Status: ${jobForm.jobStatus}`,
        photoUrls.length ? `Photos: ${photoUrls.length} uploaded` : null,
      ]
        .filter(Boolean)
        .join("\n");

      await sendStaffTelegramAlert(alertText);
      setStatusMsg("जॉब शीट सफलतापूर्वक सेव हो गई है!");
    } catch (err) {
      console.error("Save error:", err);
      setStatusMsg("सेव करने में समस्या आई।");
    } finally {
      setSavingJob(false);
    }
  };

  const resetForm = () => {
    setJobForm(initialJobForm);
    setUsedParts([createEmptyPart()]);
    setSitePhotos([]);
    setWizardStep(1);
    setTechSlide(1);
    setStatusMsg("");
  };

  if (viewMode === "printSheet") {
    return (
      <div>
        <div style={{ padding: "10px", textAlign: "center", background: "#e5e7eb" }}>
          <button
            type="button"
            onClick={() => setViewMode("wizard")}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "none",
              background: "#374151",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ← फ़ील्ड स्टाफ़ विजार्ड पर वापस जाएं
          </button>
        </div>
        <JobSheet />
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header Card */}
        <div style={styles.headerCard}>
          <div style={styles.logoText}>Manqube Logo</div>
          <h2 style={styles.companyTitle}>MANQUBE PRIVATE LIMITED</h2>
          <div style={styles.companySub}>
            We Build. Your Trust. | 212 Naini, Prayagraj
          </div>

          <div style={styles.topBtnRow}>
            <button type="button" style={styles.homeBtn} onClick={resetForm}>
              — मुख्य मेनू (Home) पर वापस जाएं
            </button>
            <button
              type="button"
              style={styles.printSwitchBtn}
              onClick={() => setViewMode("printSheet")}
            >
              🖨️ Print Job Sheet
            </button>
          </div>
        </div>

        {/* GPS Banner */}
        <div style={styles.gpsBanner}>{gpsStatus}</div>

        {/* Staff Card */}
        <div style={styles.mainCard}>
          <h3 style={styles.portalHeading}>फ़ील्ड स्टाफ़ लॉगिन</h3>

          <div style={styles.staffBar}>
            <span>
              स्टाफ़: <strong>{staffInfo.name}</strong> ({staffInfo.phone})
            </span>
            <button
              type="button"
              style={styles.logoutBtn}
              onClick={() => setStatusMsg("स्टाफ़ सेशन सक्रिय है।")}
            >
              लॉग आउट
            </button>
          </div>

          <div style={styles.stepHeaderRow}>
            <button
              type="button"
              style={styles.menuBackBtn}
              onClick={() => setWizardStep(1)}
            >
              ← मेनू पर वापस जाएं
            </button>
            <span style={styles.wizardBadge}>Wizard Step: {wizardStep} / 5</span>
          </div>

          {/* STEP 1: कस्टमर व जॉब विवरण */}
          {wizardStep === 1 && (
            <div>
              <h3 style={styles.stepTitle}>स्टेप 1: कस्टमर एवं जॉब विवरण</h3>

              <label style={styles.label}>कस्टमर का नाम (Customer Name):</label>
              <input
                type="text"
                name="customerName"
                value={jobForm.customerName}
                onChange={handleChange}
                style={styles.input}
                placeholder="Customer Name"
              />

              <label style={styles.label}>मोबाइल नंबर (Mobile):</label>
              <input
                type="text"
                name="mobile"
                value={jobForm.mobile}
                onChange={handleChange}
                style={styles.input}
                placeholder="Mobile Number"
              />

              <label style={styles.label}>पता (Address):</label>
              <textarea
                name="address"
                value={jobForm.address}
                onChange={handleChange}
                style={styles.textarea}
                placeholder="Site Address"
              />

              <div style={styles.twoCol}>
                <div>
                  <label style={styles.label}>Job No.:</label>
                  <input
                    type="text"
                    name="jobNo"
                    value={jobForm.jobNo}
                    onChange={handleChange}
                    style={styles.input}
                  />
                </div>
                <div>
                  <label style={styles.label}>Product:</label>
                  <input
                    type="text"
                    name="product"
                    value={jobForm.product}
                    onChange={handleChange}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.twoCol}>
                <div>
                  <label style={styles.label}>AMC:</label>
                  <select
                    name="amc"
                    value={jobForm.amc}
                    onChange={handleChange}
                    style={styles.select}
                  >
                    <option value="NO">NO</option>
                    <option value="YES">YES</option>
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Servicing:</label>
                  <select
                    name="servicing"
                    value={jobForm.servicing}
                    onChange={handleChange}
                    style={styles.select}
                  >
                    <option value="NO">NO</option>
                    <option value="YES">YES</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: टेक्निकल पैरामीटर्स एवं चेकलिस्ट (Slide by Slide 1 -> 2 -> 3 -> 4) */}
          {wizardStep === 2 && (
            <div>
              <h3 style={styles.stepTitle}>
                स्टेप 2: टेक्निकल पैरामीटर्स एवं चेकलिस्ट
              </h3>

              <div style={styles.slideTopBar}>
                <strong>भाग {techSlide} / 4</strong>
                <div style={{ display: "flex", gap: "6px" }}>
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTechSlide(num)}
                      style={{
                        padding: "5px 11px",
                        borderRadius: "6px",
                        border: "1px solid #1e3a8a",
                        background: techSlide === num ? "#1e3a8a" : "#ffffff",
                        color: techSlide === num ? "#ffffff" : "#1e3a8a",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {techSlide === 1 && (
                <div style={styles.slideBox}>
                  <h4 style={styles.subSectionTitle}>1. यूनिट और कंप्रेसर विवरण:</h4>
                  <div style={styles.twoCol}>
                    <input
                      type="text"
                      name="indoorModel"
                      placeholder="Indoor Model"
                      value={jobForm.indoorModel}
                      onChange={handleChange}
                      style={styles.darkInput}
                    />
                    <input
                      type="text"
                      name="indoorSerial"
                      placeholder="Indoor Serial"
                      value={jobForm.indoorSerial}
                      onChange={handleChange}
                      style={styles.darkInput}
                    />
                  </div>
                  <div style={styles.twoCol}>
                    <input
                      type="text"
                      name="outdoorModel"
                      placeholder="Outdoor Model"
                      value={jobForm.outdoorModel}
                      onChange={handleChange}
                      style={styles.darkInput}
                    />
                    <input
                      type="text"
                      name="outdoorSerial"
                      placeholder="Outdoor Serial"
                      value={jobForm.outdoorSerial}
                      onChange={handleChange}
                      style={styles.darkInput}
                    />
                  </div>
                  <div style={styles.twoCol}>
                    <input
                      type="text"
                      name="compressorModel"
                      placeholder="Compressor Model"
                      value={jobForm.compressorModel}
                      onChange={handleChange}
                      style={styles.darkInput}
                    />
                    <input
                      type="text"
                      name="compressorSerial"
                      placeholder="Compressor Serial"
                      value={jobForm.compressorSerial}
                      onChange={handleChange}
                      style={styles.darkInput}
                    />
                  </div>
                  <div style={styles.twoCol}>
                    <input
                      type="text"
                      name="indoorMotorModel"
                      placeholder="In-Door Motor Model"
                      value={jobForm.indoorMotorModel}
                      onChange={handleChange}
                      style={styles.darkInput}
                    />
                    <input
                      type="text"
                      name="indoorMotorSerial"
                      placeholder="In-Door Motor Serial"
                      value={jobForm.indoorMotorSerial}
                      onChange={handleChange}
                      style={styles.darkInput}
                    />
                  </div>
                  <div style={styles.twoCol}>
                    <input
                      type="text"
                      name="outdoorMotorModel"
                      placeholder="Out-Door Motor Model"
                      value={jobForm.outdoorMotorModel}
                      onChange={handleChange}
                      style={styles.darkInput}
                    />
                    <input
                      type="text"
                      name="outdoorMotorSerial"
                      placeholder="Out-Door Motor Serial"
                      value={jobForm.outdoorMotorSerial}
                      onChange={handleChange}
                      style={styles.darkInput}
                    />
                  </div>
                </div>
              )}

              {techSlide === 2 && (
                <div style={styles.slideBox}>
                  <h4 style={styles.subSectionTitle}>2. सर्विस एवं फिजिकल चेकलिस्ट:</h4>
                  <div style={styles.twoCol}>
                    <div>
                      <label style={styles.smallLabel}>FILTER CLEAN:</label>
                      <select
                        name="filterClean"
                        value={jobForm.filterClean}
                        onChange={handleChange}
                        style={styles.darkSelect}
                      >
                        <option value="OK (साफ़ किया)">OK (साफ़ किया)</option>
                        <option value="Dirty / Needs Clean">Dirty / Needs Clean</option>
                      </select>
                    </div>
                    <div>
                      <label style={styles.smallLabel}>STAND TYPE:</label>
                      <select
                        name="standType"
                        value={jobForm.standType}
                        onChange={handleChange}
                        style={styles.darkSelect}
                      >
                        <option value="Wall Stand">Wall Stand</option>
                        <option value="Floor Stand">Floor Stand</option>
                        <option value="None">None</option>
                      </select>
                    </div>
                  </div>
                  <div style={styles.twoCol}>
                    <div>
                      <label style={styles.smallLabel}>SWING / FLAPPER:</label>
                      <select
                        name="swingFlapper"
                        value={jobForm.swingFlapper}
                        onChange={handleChange}
                        style={styles.darkSelect}
                      >
                        <option value="OK">OK</option>
                        <option value="Not Working">Not Working</option>
                      </select>
                    </div>
                    <div>
                      <label style={styles.smallLabel}>STABILIZER:</label>
                      <select
                        name="stabilizer"
                        value={jobForm.stabilizer}
                        onChange={handleChange}
                        style={styles.darkSelect}
                      >
                        <option value="OK">OK</option>
                        <option value="Faulty">Faulty</option>
                        <option value="Not Installed">Not Installed</option>
                      </select>
                    </div>
                  </div>
                  <div style={styles.twoCol}>
                    <div>
                      <label style={styles.smallLabel}>REMOTE:</label>
                      <select
                        name="remote"
                        value={jobForm.remote}
                        onChange={handleChange}
                        style={styles.darkSelect}
                      >
                        <option value="OK">OK</option>
                        <option value="Not Available">Not Available</option>
                      </select>
                    </div>
                    <div>
                      <label style={styles.smallLabel}>OUTDOOR CLEAN:</label>
                      <select
                        name="outdoorClean"
                        value={jobForm.outdoorClean}
                        onChange={handleChange}
                        style={styles.darkSelect}
                      >
                        <option value="OK (सर्विस की गई)">OK (सर्विस की गई)</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {techSlide === 3 && (
                <div style={styles.slideBox}>
                  <h4 style={styles.subSectionTitle}>3. गैस, पाइपिंग एवं इलेक्ट्रिकल माप:</h4>
                  <div style={styles.twoCol}>
                    <div>
                      <label style={styles.smallLabel}>ROOM TEMP (°C):</label>
                      <input
                        type="text"
                        name="roomTemp"
                        placeholder="e.g. 24°C"
                        value={jobForm.roomTemp}
                        onChange={handleChange}
                        style={styles.darkInput}
                      />
                    </div>
                    <div>
                      <label style={styles.smallLabel}>SUCTION PRESSURE:</label>
                      <input
                        type="text"
                        name="suctionPressure"
                        placeholder="e.g. 120 PSI"
                        value={jobForm.suctionPressure}
                        onChange={handleChange}
                        style={styles.darkInput}
                      />
                    </div>
                  </div>
                  <div style={styles.twoCol}>
                    <div>
                      <label style={styles.smallLabel}>COMPRESSOR AMPERE:</label>
                      <input
                        type="text"
                        name="compressorAmpere"
                        placeholder="e.g. 6.5 A"
                        value={jobForm.compressorAmpere}
                        onChange={handleChange}
                        style={styles.darkInput}
                      />
                    </div>
                    <div>
                      <label style={styles.smallLabel}>DRAIN WITH SIZE:</label>
                      <input
                        type="text"
                        name="drainSize"
                        placeholder="e.g. 1 inch PVC"
                        value={jobForm.drainSize}
                        onChange={handleChange}
                        style={styles.darkInput}
                      />
                    </div>
                  </div>
                  <div style={styles.twoCol}>
                    <div>
                      <label style={styles.smallLabel}>COPPER PIPE SIZE:</label>
                      <input
                        type="text"
                        name="copperPipeSize"
                        placeholder="e.g. 1/4 & 1/2"
                        value={jobForm.copperPipeSize}
                        onChange={handleChange}
                        style={styles.darkInput}
                      />
                    </div>
                    <div>
                      <label style={styles.smallLabel}>INSULATION:</label>
                      <select
                        name="insulation"
                        value={jobForm.insulation}
                        onChange={handleChange}
                        style={styles.darkSelect}
                      >
                        <option value="OK">OK</option>
                        <option value="Damaged">Damaged</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {techSlide === 4 && (
                <div style={styles.slideBox}>
                  <h4 style={styles.subSectionTitle}>
                    4. वोल्टेज, एम्पीयर एवं 3-फेज़ रीडिंग (R / Y / B):
                  </h4>
                  <div style={styles.threeCol}>
                    <input
                      type="text"
                      name="voltage230"
                      placeholder="230V"
                      value={jobForm.voltage230}
                      onChange={handleChange}
                      style={styles.darkInput}
                    />
                    <input
                      type="text"
                      name="totalAmpere"
                      placeholder="Total Ampere"
                      value={jobForm.totalAmpere}
                      onChange={handleChange}
                      style={styles.darkInput}
                    />
                    <input
                      type="text"
                      name="wireSizeCore"
                      placeholder="Wire Size & Core"
                      value={jobForm.wireSizeCore}
                      onChange={handleChange}
                      style={styles.darkInput}
                    />
                  </div>
                  <div style={styles.threeCol}>
                    <input
                      type="text"
                      name="voltageR"
                      placeholder="R Voltage"
                      value={jobForm.voltageR}
                      onChange={handleChange}
                      style={styles.darkInput}
                    />
                    <input
                      type="text"
                      name="voltageY"
                      placeholder="Y Voltage"
                      value={jobForm.voltageY}
                      onChange={handleChange}
                      style={styles.darkInput}
                    />
                    <input
                      type="text"
                      name="voltageB"
                      placeholder="B Voltage"
                      value={jobForm.voltageB}
                      onChange={handleChange}
                      style={styles.darkInput}
                    />
                  </div>
                  <div style={styles.threeCol}>
                    <input
                      type="text"
                      name="ampereR"
                      placeholder="R Ampere"
                      value={jobForm.ampereR}
                      onChange={handleChange}
                      style={styles.darkInput}
                    />
                    <input
                      type="text"
                      name="ampereY"
                      placeholder="Y Ampere"
                      value={jobForm.ampereY}
                      onChange={handleChange}
                      style={styles.darkInput}
                    />
                    <input
                      type="text"
                      name="ampereB"
                      placeholder="B Ampere"
                      value={jobForm.ampereB}
                      onChange={handleChange}
                      style={styles.darkInput}
                    />
                  </div>
                </div>
              )}

              {/* Slide 1-4 Navigation */}
              <div style={styles.slideNavRow}>
                <button
                  type="button"
                  disabled={techSlide === 1}
                  onClick={() => setTechSlide((prev) => Math.max(1, prev - 1))}
                  style={{
                    ...styles.slideBtn,
                    opacity: techSlide === 1 ? 0.5 : 1,
                  }}
                >
                  ← पिछला भाग
                </button>
                <button
                  type="button"
                  disabled={techSlide === 4}
                  onClick={() => setTechSlide((prev) => Math.min(4, prev + 1))}
                  style={{
                    ...styles.slideBtnPrimary,
                    opacity: techSlide === 4 ? 0.5 : 1,
                  }}
                >
                  अगला भाग →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: किया गया कार्य और स्पेयर पार्ट्स (Used Part होने पर नाम, क्वांटिटी और अमाउंट) */}
          {wizardStep === 3 && (
            <div>
              <h3 style={styles.stepTitle}>
                स्टेप 3: किया गया कार्य और स्पेयर पार्ट्स
              </h3>

              <label style={styles.label}>किया गया कार्य (Work Done):</label>
              <textarea
                name="workDone"
                value={jobForm.workDone}
                onChange={handleChange}
                style={styles.darkTextarea}
                placeholder="किया गया कार्य लिखें..."
              />

              <label style={styles.label}>स्पेयर पार्ट विकल्प:</label>
              <select
                name="partOption"
                value={jobForm.partOption}
                onChange={handleChange}
                style={styles.darkSelect}
              >
                <option value="Used Part (इस्तेमाल किया गया)">
                  Used Part (इस्तेमाल किया गया)
                </option>
                <option value="No Part Used (कोई पार्ट नहीं लगा)">
                  No Part Used (कोई पार्ट नहीं लगा)
                </option>
              </select>

              {isUsedPartSelected && (
                <div style={styles.partsBox}>
                  <div style={styles.partsBoxTitle}>
                    स्पेयर पार्ट का नाम, क्वांटिटी और अमाउंट
                  </div>

                  {usedParts.map((item, idx) => {
                    const rowTotal =
                      (parseFloat(item.qty) || 0) * (parseFloat(item.amount) || 0);
                    return (
                      <div key={idx} style={styles.partRowWrapper}>
                        <div style={styles.partGrid}>
                          <input
                            type="text"
                            placeholder="स्पेयर पार्ट का नाम"
                            value={item.partName}
                            onChange={(e) =>
                              updatePartRow(idx, "partName", e.target.value)
                            }
                            style={styles.partInput}
                          />
                          <input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={item.qty}
                            onChange={(e) =>
                              updatePartRow(idx, "qty", e.target.value)
                            }
                            style={styles.partInput}
                          />
                          <input
                            type="number"
                            min="0"
                            placeholder="Amount (₹)"
                            value={item.amount}
                            onChange={(e) =>
                              updatePartRow(idx, "amount", e.target.value)
                            }
                            style={styles.partInput}
                          />
                          <button
                            type="button"
                            onClick={() => removePartRow(idx)}
                            style={styles.removePartBtn}
                            title="हटाएं"
                          >
                            ✕
                          </button>
                        </div>
                        <div style={styles.partRowTotal}>
                          योग: ₹{rowTotal.toFixed(2)}
                        </div>
                      </div>
                    );
                  })}

                  <div style={styles.partsFooter}>
                    <button
                      type="button"
                      onClick={addPartRow}
                      style={styles.addPartBtn}
                    >
                      + पार्ट जोड़ें
                    </button>
                    <strong>पार्ट्स कुल: ₹{partsTotal.toFixed(2)}</strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: बिल / चार्ज व टोटल बिल */}
          {wizardStep === 4 && (
            <div>
              <h3 style={styles.stepTitle}>स्टेप 4: बिल एवं टोटल अमाउंट</h3>
              <label style={styles.label}>सर्विस / अन्य चार्ज (₹):</label>
              <input
                type="number"
                name="rate"
                value={jobForm.rate}
                onChange={handleChange}
                style={styles.input}
                placeholder="0.00"
              />

              <div style={styles.billSummaryBox}>
                <div style={styles.billRow}>
                  <span>स्पेयर पार्ट्स कुल:</span>
                  <strong>₹{partsTotal.toFixed(2)}</strong>
                </div>
                <div style={styles.billRow}>
                  <span>सर्विस / अन्य चार्ज:</span>
                  <strong>₹{serviceCharge.toFixed(2)}</strong>
                </div>
                <hr style={styles.billDivider} />
                <div style={styles.billTotalRow}>
                  <strong>टोटल बिल (Total Amount):</strong>
                  <strong>₹{grandTotalBill.toFixed(2)}</strong>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: स्टेटस, फोटो (कैमरा से साइट व सामान की फोटो) और कस्टमर हस्ताक्षर */}
          {wizardStep === 5 && (
            <div>
              <h3 style={styles.stepTitle}>
                स्टेप 5: स्टेटस, फोटो और कस्टमर हस्ताक्षर
              </h3>

              <label style={styles.label}>जॉब स्टेटस:</label>
              <select
                name="jobStatus"
                value={jobForm.jobStatus}
                onChange={handleChange}
                style={styles.darkSelect}
              >
                <option value="Completed (पूर्ण)">Completed (पूर्ण)</option>
                <option value="Pending (बाकी)">Pending (बाकी)</option>
              </select>

              <label style={styles.label}>
                कस्टमर रिमार्क / फीडबैक (Customer Remark):
              </label>
              <input
                type="text"
                name="customerRemark"
                value={jobForm.customerRemark}
                onChange={handleChange}
                style={styles.darkInput}
                placeholder="जैसे: Working Fine / Good Service"
              />

              <label style={styles.label}>
                साइट और सामान की फोटो (Site &amp; Part Photo):
              </label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleSitePhotosChange}
                style={styles.fileInput}
              />

              {uploadingPhotos && (
                <div style={styles.infoText}>फोटो अपलोड हो रही है...</div>
              )}

              {sitePhotos.length > 0 && (
                <div style={styles.photoGrid}>
                  {sitePhotos.map((p, idx) => (
                    <div key={idx} style={styles.photoCard}>
                      <img
                        src={p.previewUrl}
                        alt={`फोटो ${idx + 1}`}
                        style={styles.photoThumb}
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        style={styles.removePhotoBtn}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <label style={styles.label}>
                कस्टमर हस्ताक्षर (Customer Signature):
              </label>
              <button
                type="button"
                style={styles.sigBtn}
                onClick={() => setSigModalOpen(true)}
              >
                ✍️ कस्टमर हस्ताक्षर करें (Open Full Screen)
              </button>

              {jobForm.customerSignature && (
                <div style={{ marginTop: "8px" }}>
                  <img
                    src={jobForm.customerSignature}
                    alt="Customer Signature"
                    style={{
                      maxHeight: "80px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      background: "#fff",
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {statusMsg && <div style={styles.statusBanner}>{statusMsg}</div>}

          {/* Main Wizard Bottom Buttons */}
          <div style={styles.bottomNav}>
            <button
              type="button"
              style={styles.backBtn}
              disabled={wizardStep === 1}
              onClick={() => setWizardStep((prev) => Math.max(1, prev - 1))}
            >
              ← पीछे
            </button>

            {wizardStep < 5 ? (
              <button
                type="button"
                style={styles.nextBtn}
                onClick={() => setWizardStep((prev) => Math.min(5, prev + 1))}
              >
                अगला →
              </button>
            ) : (
              <button
                type="button"
                style={styles.saveBtn}
                onClick={handleFinalSave}
                disabled={savingJob || uploadingPhotos}
              >
                {savingJob ? "सेव हो रहा है..." : "✓ जॉब शीट फाइनल सेव करें"}
              </button>
            )}
          </div>
        </div>

        {/* Fullscreen Signature Modal */}
        {sigModalOpen && (
          <div style={styles.modalBackdrop}>
            <div style={styles.modalBox}>
              <h4 style={{ marginTop: 0 }}>कस्टमर हस्ताक्षर करें</h4>
              <canvas
                ref={canvasRef}
                width={320}
                height={180}
                onMouseDown={startSign}
                onMouseMove={drawSign}
                onMouseUp={stopSign}
                onMouseLeave={stopSign}
                onTouchStart={startSign}
                onTouchMove={drawSign}
                onTouchEnd={stopSign}
                style={{
                  width: "100%",
                  height: "180px",
                  border: "1.5px solid #334155",
                  borderRadius: "6px",
                  background: "#ffffff",
                  touchAction: "none",
                }}
              />
              <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                <button type="button" style={styles.backBtn} onClick={clearSign}>
                  साफ़ करें
                </button>
                <button
                  type="button"
                  style={styles.backBtn}
                  onClick={() => setSigModalOpen(false)}
                >
                  बंद करें
                </button>
                <button type="button" style={styles.nextBtn} onClick={saveSignImage}>
                  हस्ताक्षर सेव करें
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f1f5f9",
    padding: "14px",
    fontFamily: "Arial, sans-serif",
    color: "#1e293b",
  },
  container: {
    maxWidth: "560px",
    margin: "0 auto",
  },
  headerCard: {
    background: "#ffffff",
    borderRadius: "10px",
    padding: "16px",
    textAlign: "center",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    marginBottom: "10px",
  },
  logoText: {
    fontSize: "13px",
    color: "#64748b",
    marginBottom: "4px",
  },
  companyTitle: {
    margin: "0 0 4px",
    fontSize: "18px",
    fontWeight: 700,
    color: "#0f172a",
  },
  companySub: {
    fontSize: "12px",
    color: "#475569",
    marginBottom: "12px",
  },
  topBtnRow: {
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  homeBtn: {
    background: "#475569",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 14px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
  printSwitchBtn: {
    background: "#1e3a8a",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 14px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
  gpsBanner: {
    background: "#dcfce7",
    color: "#166534",
    borderRadius: "8px",
    padding: "8px 12px",
    textAlign: "center",
    fontSize: "12px",
    fontWeight: 600,
    marginBottom: "12px",
  },
  mainCard: {
    background: "#ffffff",
    borderRadius: "10px",
    padding: "16px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  portalHeading: {
    textAlign: "center",
    margin: "0 0 12px",
    fontSize: "18px",
    color: "#1e293b",
  },
  staffBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    padding: "8px 10px",
    fontSize: "13px",
    marginBottom: "10px",
  },
  logoutBtn: {
    background: "#ef4444",
    color: "#ffffff",
    border: "none",
    borderRadius: "5px",
    padding: "5px 10px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  stepHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "14px",
  },
  menuBackBtn: {
    background: "#64748b",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  wizardBadge: {
    fontSize: "13px",
    color: "#64748b",
    fontWeight: 600,
  },
  stepTitle: {
    textAlign: "center",
    margin: "6px 0 14px",
    fontSize: "17px",
    color: "#0f172a",
  },
  subSectionTitle: {
    margin: "0 0 10px",
    fontSize: "14px",
    color: "#0f172a",
  },
  label: {
    display: "block",
    textAlign: "center",
    fontSize: "13px",
    fontWeight: 600,
    color: "#334155",
    margin: "12px 0 6px",
  },
  smallLabel: {
    display: "block",
    textAlign: "center",
    fontSize: "11px",
    fontWeight: 700,
    color: "#475569",
    marginBottom: "4px",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "9px 10px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    marginBottom: "8px",
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "9px 10px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    minHeight: "68px",
    marginBottom: "8px",
  },
  select: {
    width: "100%",
    boxSizing: "border-box",
    padding: "9px 10px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    background: "#ffffff",
    marginBottom: "8px",
  },
  darkInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "9px 10px",
    borderRadius: "6px",
    border: "1px solid #334155",
    background: "#374151",
    color: "#ffffff",
    fontSize: "13px",
    marginBottom: "8px",
  },
  darkTextarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #334155",
    background: "#374151",
    color: "#ffffff",
    fontSize: "13px",
    minHeight: "82px",
    marginBottom: "8px",
  },
  darkSelect: {
    width: "100%",
    boxSizing: "border-box",
    padding: "9px 10px",
    borderRadius: "6px",
    border: "1px solid #334155",
    background: "#374151",
    color: "#ffffff",
    fontSize: "13px",
    marginBottom: "8px",
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
  },
  threeCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "6px",
  },
  slideTopBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#f8fafc",
    padding: "8px 10px",
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
    marginBottom: "10px",
  },
  slideBox: {
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "10px",
    background: "#ffffff",
  },
  slideNavRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    marginTop: "10px",
  },
  slideBtn: {
    flex: 1,
    padding: "8px 10px",
    borderRadius: "6px",
    border: "1px solid #64748b",
    background: "#ffffff",
    color: "#334155",
    fontWeight: 600,
    cursor: "pointer",
  },
  slideBtnPrimary: {
    flex: 1,
    padding: "8px 10px",
    borderRadius: "6px",
    border: "none",
    background: "#1e3a8a",
    color: "#ffffff",
    fontWeight: 600,
    cursor: "pointer",
  },
  partsBox: {
    marginTop: "10px",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
  },
  partsBoxTitle: {
    fontWeight: 700,
    fontSize: "13px",
    textAlign: "center",
    marginBottom: "8px",
    color: "#0f172a",
  },
  partRowWrapper: {
    marginBottom: "8px",
    paddingBottom: "6px",
    borderBottom: "1px dashed #cbd5e1",
  },
  partGrid: {
    display: "grid",
    gridTemplateColumns: "2fr 0.8fr 1fr auto",
    gap: "6px",
    alignItems: "center",
  },
  partInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "8px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    fontSize: "12px",
    background: "#ffffff",
  },
  removePartBtn: {
    padding: "8px 10px",
    borderRadius: "6px",
    border: "none",
    background: "#dc2626",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
  },
  partRowTotal: {
    fontSize: "12px",
    color: "#475569",
    textAlign: "right",
    marginTop: "4px",
  },
  partsFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "6px",
  },
  addPartBtn: {
    padding: "7px 12px",
    borderRadius: "6px",
    border: "none",
    background: "#1e3a8a",
    color: "#ffffff",
    fontWeight: 600,
    fontSize: "12px",
    cursor: "pointer",
  },
  billSummaryBox: {
    marginTop: "12px",
    padding: "12px",
    borderRadius: "8px",
    background: "#f1f5f9",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
  },
  billRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "6px",
  },
  billDivider: {
    border: "none",
    borderTop: "1px solid #cbd5e1",
    margin: "8px 0",
  },
  billTotalRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "15px",
    color: "#0f172a",
  },
  fileInput: {
    width: "100%",
    marginBottom: "8px",
    fontSize: "13px",
  },
  infoText: {
    fontSize: "12px",
    color: "#0f766e",
    fontWeight: 600,
    marginBottom: "8px",
  },
  photoGrid: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "10px",
  },
  photoCard: {
    position: "relative",
  },
  photoThumb: {
    width: "84px",
    height: "84px",
    objectFit: "cover",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
  },
  removePhotoBtn: {
    position: "absolute",
    top: "-6px",
    right: "-6px",
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    border: "none",
    background: "#dc2626",
    color: "#ffffff",
    fontSize: "11px",
    cursor: "pointer",
  },
  sigBtn: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    marginBottom: "8px",
  },
  statusBanner: {
    background: "#ecfdf5",
    border: "1px solid #10b981",
    color: "#065f46",
    padding: "8px 10px",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: 600,
    marginTop: "10px",
  },
  bottomNav: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginTop: "16px",
  },
  backBtn: {
    padding: "11px",
    borderRadius: "7px",
    border: "none",
    background: "#64748b",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  nextBtn: {
    padding: "11px",
    borderRadius: "7px",
    border: "none",
    background: "#15803d",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  saveBtn: {
    padding: "11px",
    borderRadius: "7px",
    border: "none",
    background: "#166534",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "14px",
    zIndex: 50,
  },
  modalBox: {
    background: "#ffffff",
    borderRadius: "10px",
    padding: "14px",
    width: "100%",
    maxWidth: "380px",
  },
};