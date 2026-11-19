import React, { useState, useRef, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
  onSnapshot
} from "firebase/firestore";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDUUnfmXZSLOS2FrUAnr2eSFYAWnwURRfC",
  authDomain: "mq-fsm-45ee9.firebaseapp.com",
  projectId: "mq-fsm-45ee9",
  storageBucket: "mq-fsm-45ee9.firebasestorage.app",
  messagingSenderId: "527381468184",
  appId: "1:527381468184:web:326741c5e9759c7799a36d",
  measurementId: "G-VTMP9DR7D9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

const TELEGRAM_BOT_TOKEN = "8692296744:AAEsSO0K5x0yv_gnjljcAYvNCaIauNvCSac";
const TELEGRAM_CHAT_ID = "5603316430";

const sendStaffTelegramAlert = async (messageText) => {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: messageText,
        parse_mode: "HTML"
      })
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

        canvas.toBlob((blob) => {
          resolve(blob);
        }, "image/jpeg", 0.6);
      };
    };
  });
};

// प्रिंटेड रसीद जैसा जॉब शीट टेम्पलेट कंपोनेंट
const PrintableJobSheet = ({ job, onClose }) => {
  if (!job) return null;

  return (
    <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '15px' }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-job-card, #printable-job-card * { visibility: visible; }
          #printable-job-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }
          .no-print { display: none !important; }
        }
        .js-table { width: 100%; border-collapse: collapse; font-size: 11px; color: #000; }
        .js-table td, .js-table th { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
        .js-bold { font-weight: bold; }
        .js-sec-hdr { background: #f1f5f9; font-weight: bold; text-align: center; }
        .faint-label { font-size: 8.5px; color: #888888; font-weight: normal; margin-right: 4px; }
      `}</style>

      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
        {onClose && (
          <button onClick={onClose} style={{ padding: '6px 12px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
            ← वापस जाएं
          </button>
        )}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => window.print()} style={{ padding: '6px 12px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
            🖨️ Print Job Sheet
          </button>
          <button
            onClick={() => {
              const msg = `नमस्ते ${job.customerName}, MANQUBE PRIVATE LIMITED की आपकी जॉब शीट (${job.jobSheetNo}) तैयार है। उत्पाद: ${job.productType || job.product}, कार्य: ${job.desc}, स्टेटस: ${job.status}, दिनांक: ${job.date}`;
              window.open(`https://wa.me/91${job.customerPhone}?text=${encodeURIComponent(msg)}`, '_blank');
            }}
            style={{ padding: '6px 12px', background: '#166534', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            💬 WhatsApp करें
          </button>
        </div>
      </div>

      <div id="printable-job-card" style={{ border: '2px solid #000', background: '#fff', overflowX: 'auto' }}>
        <div style={{ textAlign: 'center', padding: '10px 8px', borderBottom: '1px solid #000' }}>
          <div style={{ fontSize: '19px', fontWeight: 'bold', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            MANQUBE PRIVATE LIMITED
          </div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '3px' }}>
            Mobile No: 9415522032, 9335172129
          </div>
        </div>

        <table className="js-table" style={{ borderTop: 'none' }}>
          <tbody>
            <tr>
              <td rowSpan="6" style={{ width: '55%', borderTop: 'none' }}>
                <div className="js-bold">CUSTOMER NAME :-</div>
                <div style={{ marginBottom: '8px', minHeight: '16px' }}>{job.customerName}</div>
                <div className="js-bold">MOBILE :-</div>
                <div style={{ marginBottom: '8px', minHeight: '16px' }}>{job.customerPhone}</div>
                <div className="js-bold">ADDRESS :-</div>
                <div style={{ minHeight: '24px' }}>{job.customerAddress}</div>
              </td>
              <td style={{ width: '18%', borderTop: 'none' }} className="js-bold">JOB NO.</td>
              <td style={{ width: '27%', fontWeight: 'bold', borderTop: 'none' }}>{job.jobSheetNo}</td>
            </tr>
            <tr>
              <td className="js-bold">BILL NO.</td>
              <td>{job.billNo && job.billNo !== '-' ? job.billNo : ''}</td>
            </tr>
            <tr>
              <td className="js-bold">AMC DATE</td>
              <td>{job.amcDate && job.amcDate !== '-' ? job.amcDate : ''}</td>
            </tr>
            <tr>
              <td className="js-bold">DATE IN</td>
              <td>{job.date || ''}</td>
            </tr>
            <tr>
              <td className="js-bold">DATE OUT</td>
              <td>{job.status === 'Completed' ? job.date : ''}</td>
            </tr>
            <tr>
              <td className="js-bold">PRODUCT</td>
              <td>{job.productType || job.product}</td>
            </tr>
          </tbody>
        </table>

        <table className="js-table" style={{ borderTop: 'none' }}>
          <tbody>
            <tr>
              <td style={{ width: '45%', borderTop: 'none', borderBottom: 'none' }}></td>
              <td style={{ width: '18%', verticalAlign: 'middle', textAlign: 'center', borderTop: 'none' }} className="js-bold">INDOOR</td>
              <td style={{ width: '37%', padding: 0, borderTop: 'none' }}>
                <div style={{ borderBottom: '1px solid #000', padding: '3px 5px', textAlign: 'left' }}>
                  <span className="faint-label">Model:</span>
                  <span>{job.indoorModel && job.indoorModel !== '-' ? job.indoorModel : ''}</span>
                </div>
                <div style={{ padding: '3px 5px', textAlign: 'left' }}>
                  <span className="faint-label">Serial:</span>
                  <span>{job.indoorSerial && job.indoorSerial !== '-' ? job.indoorSerial : ''}</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style={{ borderTop: 'none', borderBottom: 'none' }}></td>
              <td style={{ verticalAlign: 'middle', textAlign: 'center' }} className="js-bold">OUT DOOR</td>
              <td style={{ padding: 0 }}>
                <div style={{ borderBottom: '1px solid #000', padding: '3px 5px', textAlign: 'left' }}>
                  <span className="faint-label">Model:</span>
                  <span>{job.outdoorModel && job.outdoorModel !== '-' ? job.outdoorModel : ''}</span>
                </div>
                <div style={{ padding: '3px 5px', textAlign: 'left' }}>
                  <span className="faint-label">Serial:</span>
                  <span>{job.outdoorSerial && job.outdoorSerial !== '-' ? job.outdoorSerial : ''}</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style={{ borderTop: 'none' }}></td>
              <td style={{ verticalAlign: 'middle', textAlign: 'center' }} className="js-bold">COMPRESSOR</td>
              <td style={{ padding: 0 }}>
                <div style={{ borderBottom: '1px solid #000', padding: '3px 5px', textAlign: 'left' }}>
                  <span className="faint-label">Model:</span>
                  <span>{job.compressorModel && job.compressorModel !== '-' ? job.compressorModel : ''}</span>
                </div>
                <div style={{ padding: '3px 5px', textAlign: 'left' }}>
                  <span className="faint-label">Serial:</span>
                  <span>{job.compressorSerial && job.compressorSerial !== '-' ? job.compressorSerial : ''}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <table className="js-table" style={{ borderTop: 'none' }}>
          <tbody>
            <tr className="js-sec-hdr">
              <td style={{ width: '45%', borderTop: 'none' }}>FAULT / PROBLEM DETAILS</td>
              <td style={{ width: '42%', borderTop: 'none' }}>WORK / ACTION TAKEN AND USE PART</td>
              <td style={{ width: '13%', borderTop: 'none' }}>RATE</td>
            </tr>
            <tr>
              <td style={{ minHeight: '45px' }}>1. {job.faultDetails || job.desc || ''}</td>
              <td>
                1. {job.desc || ''}
                {job.sparePartName && job.sparePartName !== '-' && (
                  <div style={{ marginTop: '4px' }}>
                    2. Part ({job.sparePartOption}): {job.sparePartName} {job.sparePartModel !== '-' ? `(${job.sparePartModel})` : ''}
                  </div>
                )}
                {job.materials && job.materials.length > 0 && job.materials.map((m, i) => (
                  <div key={i}>{i + 3}. {m.name} (Qty: {m.qty})</div>
                ))}
              </td>
              <td>
                {job.materials && job.materials.length > 0
                  ? job.materials.map((m, i) => <div key={i}>₹{m.price || '0'}</div>)
                  : ''}
              </td>
            </tr>
          </tbody>
        </table>

        <table className="js-table" style={{ borderTop: 'none' }}>
          <tbody>
            <tr>
              <td style={{ width: '30%', borderTop: 'none' }} className="js-bold">FILTER CLEAN</td>
              <td style={{ width: '15%', borderTop: 'none' }}>{job.filterClean && job.filterClean !== '-' ? job.filterClean : ''}</td>
              <td rowSpan="2" style={{ width: '18%', verticalAlign: 'middle', textAlign: 'center', borderTop: 'none' }} className="js-bold">IN-DOOR<br />MOTOR</td>
              <td rowSpan="2" style={{ width: '37%', padding: 0, borderTop: 'none' }}>
                <div style={{ borderBottom: '1px solid #000', padding: '3px 5px', textAlign: 'left' }}>
                  <span className="faint-label">Model:</span>
                  <span>{job.indoorMotorModel && job.indoorMotorModel !== '-' ? job.indoorMotorModel : ''}</span>
                </div>
                <div style={{ padding: '3px 5px', textAlign: 'left' }}>
                  <span className="faint-label">Serial:</span>
                  <span>{job.indoorMotorSerial && job.indoorMotorSerial !== '-' ? job.indoorMotorSerial : ''}</span>
                </div>
              </td>
            </tr>
            <tr>
              <td className="js-bold">STAND TYPE</td>
              <td>{job.standType && job.standType !== '-' ? job.standType : ''}</td>
            </tr>
            <tr>
              <td className="js-bold">SWING / FLAPPER</td>
              <td>{job.swingFlapper && job.swingFlapper !== '-' ? job.swingFlapper : ''}</td>
              <td rowSpan="2" style={{ verticalAlign: 'middle', textAlign: 'center' }} className="js-bold">OUT-DOOR<br />MOTOR</td>
              <td rowSpan="2" style={{ padding: 0 }}>
                <div style={{ borderBottom: '1px solid #000', padding: '3px 5px', textAlign: 'left' }}>
                  <span className="faint-label">Model:</span>
                  <span>{job.outdoorMotorModel && job.outdoorMotorModel !== '-' ? job.outdoorMotorModel : ''}</span>
                </div>
                <div style={{ padding: '3px 5px', textAlign: 'left' }}>
                  <span className="faint-label">Serial:</span>
                  <span>{job.outdoorMotorSerial && job.outdoorMotorSerial !== '-' ? job.outdoorMotorSerial : ''}</span>
                </div>
              </td>
            </tr>
            <tr>
              <td className="js-bold">STABILIZER</td>
              <td>{job.stabilizer && job.stabilizer !== '-' ? job.stabilizer : ''}</td>
            </tr>
            <tr>
              <td className="js-bold">REMOTE</td>
              <td>{job.remoteStatus && job.remoteStatus !== '-' ? job.remoteStatus : ''}</td>
              <td colSpan="2" style={{ padding: 0 }}>
                <div style={{ display: 'flex' }}>
                  <div style={{ flex: 1, borderRight: '1px solid #000', padding: '3px 5px' }}><strong>R:</strong> {job.phaseR && job.phaseR !== '-' ? job.phaseR : ''}</div>
                  <div style={{ flex: 1, borderRight: '1px solid #000', padding: '3px 5px' }}><strong>Y:</strong> {job.phaseY && job.phaseY !== '-' ? job.phaseY : ''}</div>
                  <div style={{ flex: 1, padding: '3px 5px' }}><strong>B:</strong> {job.phaseB && job.phaseB !== '-' ? job.phaseB : ''}</div>
                </div>
              </td>
            </tr>
            <tr>
              <td className="js-bold">ROOM TEMP.</td>
              <td>{job.roomTemp && job.roomTemp !== '-' ? job.roomTemp : ''}</td>
              <td colSpan="2" style={{ padding: 0 }}>
                <div style={{ display: 'flex' }}>
                  <div style={{ flex: 1, borderRight: '1px solid #000', padding: '3px 5px' }}><strong>R:</strong> {job.ampR && job.ampR !== '-' ? job.ampR : ''}</div>
                  <div style={{ flex: 1, borderRight: '1px solid #000', padding: '3px 5px' }}><strong>Y:</strong> {job.ampY && job.ampY !== '-' ? job.ampY : ''}</div>
                  <div style={{ flex: 1, padding: '3px 5px' }}><strong>B:</strong> {job.ampB && job.ampB !== '-' ? job.ampB : ''}</div>
                </div>
              </td>
            </tr>
            <tr>
              <td className="js-bold">VOLTAGE</td>
              <td>{job.voltage && job.voltage !== '-' ? job.voltage : ''}</td>
              <td colSpan="2" style={{ padding: '3px 5px' }}>
                <strong>TECHNICIAN:</strong> {job.staffName || ''} | <strong>STATUS:</strong> {job.status}
              </td>
            </tr>
            <tr>
              <td className="js-bold">AMPERE</td>
              <td>{job.ampere && job.ampere !== '-' ? job.ampere : ''}</td>
              <td colSpan="2" rowSpan="8" style={{ padding: '6px' }}>
                <div className="js-bold">CUSTOMER SIGN &amp; REMARK</div>
                {job.signatureURL ? (
                  <div style={{ margin: '6px 0', borderBottom: '1px dashed #94a3b8', paddingBottom: '4px' }}>
                    <img src={job.signatureURL} alt="Customer Signature" style={{ maxHeight: '70px', maxWidth: '100%', objectFit: 'contain' }} />
                  </div>
                ) : (
                  <div style={{ height: '45px', borderBottom: '1px dashed #cbd5e1', margin: '6px 0' }}></div>
                )}
                <div style={{ fontSize: '11px', marginTop: '4px' }}><strong>REMARK:</strong> {job.feedback && job.feedback !== '-' ? job.feedback : ''}</div>
                <div style={{ fontSize: '11px', marginTop: '4px' }}><strong>MOBILE:</strong> {job.customerPhone}</div>
                <div style={{ fontSize: '11px', marginTop: '4px' }}><strong>DATE:</strong> {job.date}</div>
              </td>
            </tr>
            <tr><td className="js-bold">COMPRESSOR AMPERE</td><td>{job.compressorAmpere && job.compressorAmpere !== '-' ? job.compressorAmpere : ''}</td></tr>
            <tr><td className="js-bold">DRAIN WITH SIZE</td><td>{job.drainSize && job.drainSize !== '-' ? job.drainSize : ''}</td></tr>
            <tr><td className="js-bold">COPPER PIPE SIZE</td><td>{job.copperPipeSize && job.copperPipeSize !== '-' ? job.copperPipeSize : ''}</td></tr>
            <tr><td className="js-bold">OUTDOOR CLEAN</td><td>{job.outdoorClean && job.outdoorClean !== '-' ? job.outdoorClean : ''}</td></tr>
            <tr><td className="js-bold">SUCTION PRESSURE</td><td>{job.sectionPressure && job.sectionPressure !== '-' ? job.sectionPressure : ''}</td></tr>
            <tr><td className="js-bold">WIRE SIZE &amp; CORE</td><td>{job.wireSizeCore && job.wireSizeCore !== '-' ? job.wireSizeCore : ''}</td></tr>
            <tr><td className="js-bold">INSULATION</td><td>{job.insulation && job.insulation !== '-' ? job.insulation : ''}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [jobSheets, setJobSheets] = useState([]);
  const [loginLogs, setLoginLogs] = useState([]);
  const [spareStock, setSpareStock] = useState([
    { name: 'Compressor 1.5 Ton', qty: '5', desc: 'Rotary Compressor', rate: '6500' },
    { name: 'AC Capacitor 36 MFD', qty: '12', desc: 'Dual Run Capacitor', rate: '450' }
  ]);

  // Customer Portal State
  const [custPhone, setCustPhone] = useState('');
  const [custLoggedIn, setCustLoggedIn] = useState(false);
  const [custNameInput, setCustNameInput] = useState('');
  const [custAddressInput, setCustAddressInput] = useState('');
  const [categoryType, setCategoryType] = useState('HVAC & Refrigeration');
  const [productType, setProductType] = useState('Split / Window AC');
  const [problemDesc, setProblemDesc] = useState('');

  // Staff Portal State
  const [staffPhoneInput, setStaffPhoneInput] = useState('');
  const [otpStep, setOtpStep] = useState(1);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [staffLoggedIn, setStaffLoggedIn] = useState(false);
  const [currentStaffName, setCurrentStaffName] = useState('');
  const [staffGpsLocation, setStaffGpsLocation] = useState('Fetching GPS...');
  const [staffSubTab, setStaffSubTab] = useState('menu');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [wizardStep, setWizardStep] = useState(1);

  // Admin Login State
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [adminMainTab, setAdminMainTab] = useState('jobs');
  const [adminJobSubTab, setAdminJobSubTab] = useState('completed');
  const [adminSpareSubTab, setAdminSpareSubTab] = useState('stock');
  const [selectedStaffFolder, setSelectedStaffFolder] = useState(null);

  // New Stock Form State
  const [newStockName, setNewStockName] = useState('');
  const [newStockQty, setNewStockQty] = useState('');
  const [newStockDesc, setNewStockDesc] = useState('');
  const [newStockRate, setNewStockRate] = useState('');

  // Detailed view states
  const [inspectedJob, setInspectedJob] = useState(null);
  const [lastSubmittedJob, setLastSubmittedJob] = useState(null);

  // Job Form State (Step 1)
  const [jobCustName, setJobCustName] = useState('');
  const [jobCustAddress, setJobCustAddress] = useState('');
  const [jobCustPhone, setJobCustPhone] = useState('');
  const [billNo, setBillNo] = useState('');
  const [amcDate, setAmcDate] = useState('');
  const [faultDetails, setFaultDetails] = useState('');

  // Job Form State (Step 2 - Complete HVAC Technical Checklist)
  const [indoorModel, setIndoorModel] = useState('');
  const [indoorSerial, setIndoorSerial] = useState('');
  const [outdoorModel, setOutdoorModel] = useState('');
  const [outdoorSerial, setOutdoorSerial] = useState('');
  const [compressorModel, setCompressorModel] = useState('');
  const [compressorSerial, setCompressorSerial] = useState('');
  const [indoorMotorModel, setIndoorMotorModel] = useState('');
  const [indoorMotorSerial, setIndoorMotorSerial] = useState('');
  const [outdoorMotorModel, setOutdoorMotorModel] = useState('');
  const [outdoorMotorSerial, setOutdoorMotorSerial] = useState('');

  const [filterClean, setFilterClean] = useState('OK');
  const [standType, setStandType] = useState('Wall Stand');
  const [swingFlapper, setSwingFlapper] = useState('OK');
  const [stabilizer, setStabilizer] = useState('OK');
  const [remoteStatus, setRemoteStatus] = useState('OK');
  const [outdoorClean, setOutdoorClean] = useState('OK');

  const [sectionPressure, setSectionPressure] = useState('');
  const [roomTemp, setRoomTemp] = useState('');
  const [voltage, setVoltage] = useState('230V');
  const [ampere, setAmpere] = useState('');
  const [compressorAmpere, setCompressorAmpere] = useState('');
  const [drainSize, setDrainSize] = useState('');
  const [copperPipeSize, setCopperPipeSize] = useState('');
  const [wireSizeCore, setWireSizeCore] = useState('');
  const [insulation, setInsulation] = useState('OK');
  const [phaseR, setPhaseR] = useState('');
  const [phaseY, setPhaseY] = useState('');
  const [phaseB, setPhaseB] = useState('');
  const [ampR, setAmpR] = useState('');
  const [ampY, setAmpY] = useState('');
  const [ampB, setAmpB] = useState('');

  // Step 3 & 4
  const [workDone, setWorkDone] = useState('');
  const [sparePartOption, setSparePartOption] = useState('Used Part');
  const [sparePartName, setSparePartName] = useState('');
  const [sparePartModel, setSparePartModel] = useState('');
  const [materials, setMaterials] = useState([
    { name: '', qty: '', price: '' },
    { name: '', qty: '', price: '' }
  ]);

  // Step 5 & Full-Screen Signature Modal
  const [jobStatusType, setJobStatusType] = useState('Completed');
  const [pendingSubOption, setPendingSubOption] = useState('Part Pending');
  const [jobNote, setJobNote] = useState('');
  const [customerFeedback, setCustomerFeedback] = useState('');
  const [imageFile, setImageFile] = useState(null);

  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [savedSignatureURL, setSavedSignatureURL] = useState('');
  const fullCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Firestore Real-time Sync
  useEffect(() => {
    const unsubJobs = onSnapshot(collection(db, "jobs"), (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setJobSheets(list);
    }, (err) => console.log("Jobs sync info:", err.message));

    const unsubLogs = onSnapshot(collection(db, "login_logs"), (snapshot) => {
      const logs = [];
      snapshot.forEach((doc) => {
        logs.push(doc.data());
      });
      setLoginLogs(logs);
    }, (err) => console.log("Logs sync info:", err.message));

    return () => {
      unsubJobs();
      unsubLogs();
    };
  }, []);

  useEffect(() => {
    if (isSignatureModalOpen && fullCanvasRef.current) {
      const canvas = fullCanvasRef.current;
      canvas.width = window.innerWidth - 30;
      canvas.height = window.innerHeight - 160;
      const ctx = canvas.getContext('2d');
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#0f172a';
    }
  }, [isSignatureModalOpen]);

  const recordUserLogin = (identifier, userRole, displayName) => {
    const cleanId = identifier.trim();
    if (!cleanId) return;

    setLoginLogs((prev) => {
      const existingIndex = prev.findIndex((item) => item.phone === cleanId && item.role === userRole);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          loginCount: (updated[existingIndex].loginCount || 1) + 1,
          lastLoginText: new Date().toLocaleString()
        };
        return updated;
      } else {
        return [
          {
            phone: cleanId,
            role: userRole,
            name: displayName,
            loginCount: 1,
            lastLoginText: new Date().toLocaleString()
          },
          ...prev
        ];
      }
    });

    const docId = userRole + "_" + cleanId.replace(/[^a-zA-Z0-9]/g, '_');
    const userRef = doc(db, "login_logs", docId);
    getDoc(userRef).then((docSnap) => {
      if (docSnap.exists()) {
        updateDoc(userRef, {
          loginCount: increment(1),
          lastLogin: serverTimestamp(),
          lastLoginText: new Date().toLocaleString()
        });
      } else {
        setDoc(userRef, {
          phone: cleanId,
          role: userRole,
          name: displayName,
          loginCount: 1,
          lastLogin: serverTimestamp(),
          lastLoginText: new Date().toLocaleString()
        });
      }
    }).catch((err) => console.error(err));
  };

  const getCoordinates = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startFullDrawing = (e) => {
    const canvas = fullCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const drawFull = (e) => {
    if (!isDrawing) return;
    const canvas = fullCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
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
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // सिग्नेचर को तुरंत बहुत छोटे साइज (300x110) में कंप्रेस करना
  const saveFullSignature = () => {
    const canvas = fullCanvasRef.current;
    if (canvas) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 300;
      tempCanvas.height = 110;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
      setSavedSignatureURL(tempCanvas.toDataURL('image/png'));
    }
    setIsSignatureModalOpen(false);
  };

  const handleCustomerLogin = (e) => {
    e.preventDefault();
    if (custPhone.length < 10) {
      alert('कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें!');
      return;
    }
    setCustLoggedIn(true);
    recordUserLogin(custPhone, 'customer', 'Customer (' + custPhone + ')');
  };

  const handleCategoryChange = (e) => {
    const cat = e.target.value;
    setCategoryType(cat);
    if (cat === 'HVAC & Refrigeration') setProductType('Split / Window AC');
    else if (cat === 'Electrical Work') setProductType('House Wiring & Panel');
    else if (cat === 'Plumbing Work') setProductType('Pipe Fitting & Leakage Repair');
    else if (cat === 'Civil Work') setProductType('Flooring & Tiling');
  };

  const handleNewComplaint = (e) => {
    e.preventDefault();
    if (!custNameInput.trim() || !custAddressInput.trim()) {
      alert('कृपया कस्टमर का पूरा नाम और पता दर्ज करें!');
      return;
    }

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const jobSheetNo = 'COMP' + custPhone + day + month + hours + minutes;

    const newEntry = {
      jobSheetNo,
      customerName: custNameInput,
      customerPhone: custPhone,
      customerAddress: custAddressInput,
      product: "[" + categoryType + "] " + productType,
      faultDetails: problemDesc,
      desc: problemDesc,
      status: 'Pending',
      pendingSubOption: '-',
      date: day + '/' + month + '/' + now.getFullYear() + ' ' + hours + ':' + minutes,
      staffName: 'Not Assigned Yet',
      staffPhone: '-',
      location: 'Online Booking',
      photoURL: '',
      signatureURL: '',
      categoryType,
      productType,
      materials: [],
      sparePartOption: '-',
      sparePartName: '-',
      sparePartModel: '-'
    };

    setJobSheets([newEntry, ...jobSheets]);
    setDoc(doc(db, "jobs", jobSheetNo), newEntry).catch((err) => console.error(err));

    setProblemDesc('');
    setCustNameInput('');
    setCustAddressInput('');
    alert('शिकायत सफलतापूर्वक दर्ज हो गई!\nआपका कंप्लेंट नंबर है:\n' + jobSheetNo);
  };

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (staffPhoneInput.length < 10) {
      alert('कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें!');
      return;
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(otp);
    setOtpStep(2);
    alert('[Manqube Security] आपके मोबाइल नंबर ' + staffPhoneInput + ' के लिए OTP है: ' + otp);
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (enteredOtp === generatedOtp) {
      const staffLabel = 'Staff (' + staffPhoneInput + ')';
      setCurrentStaffName(staffLabel);
      setStaffLoggedIn(true);
      setStaffSubTab('menu');
      setOtpStep(1);
      setEnteredOtp('');

      recordUserLogin(staffPhoneInput, 'staff', staffLabel);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude.toFixed(4);
            const lng = position.coords.longitude.toFixed(4);
            setStaffGpsLocation(`Lat: ${lat}, Lng: ${lng} (GPS Active)`);
          },
          () => {
            setStaffGpsLocation('Prayagraj (GPS Default)');
          }
        );
      } else {
        setStaffGpsLocation('Prayagraj (No GPS Support)');
      }
    } else {
      alert('गलत OTP! कृपया सही OTP दर्ज करें।');
    }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminUser.toUpperCase() === 'ADMIN' && adminPass === '123456789') {
      setAdminLoggedIn(true);
      recordUserLogin(adminUser.toUpperCase(), 'office', 'Office Admin (' + adminUser.toUpperCase() + ')');
      alert('एडमिन / ऑफिस लॉगिन सफल!');
    } else {
      alert('गलत यूजरनेम या पासवर्ड!');
    }
  };

  const resetJobForm = () => {
    setSelectedComplaint(null);
    setJobCustName('');
    setJobCustPhone('');
    setJobCustAddress('');
    setBillNo('');
    setAmcDate('');
    setFaultDetails('');
    setIndoorModel('');
    setIndoorSerial('');
    setOutdoorModel('');
    setOutdoorSerial('');
    setCompressorModel('');
    setCompressorSerial('');
    setIndoorMotorModel('');
    setIndoorMotorSerial('');
    setOutdoorMotorModel('');
    setOutdoorMotorSerial('');
    setFilterClean('OK');
    setStandType('Wall Stand');
    setSwingFlapper('OK');
    setStabilizer('OK');
    setRemoteStatus('OK');
    setOutdoorClean('OK');
    setSectionPressure('');
    setRoomTemp('');
    setVoltage('230V');
    setAmpere('');
    setCompressorAmpere('');
    setDrainSize('');
    setCopperPipeSize('');
    setWireSizeCore('');
    setInsulation('OK');
    setPhaseR('');
    setPhaseY('');
    setPhaseB('');
    setAmpR('');
    setAmpY('');
    setAmpB('');
    setWorkDone('');
    setSparePartOption('Used Part');
    setSparePartName('');
    setSparePartModel('');
    setJobNote('');
    setCustomerFeedback('');
    setSavedSignatureURL('');
    setImageFile(null);
    setMaterials([{ name: '', qty: '', price: '' }, { name: '', qty: '', price: '' }]);
    setCategoryType('HVAC & Refrigeration');
    setProductType('Split / Window AC');
    setJobStatusType('Completed');
    setPendingSubOption('Part Pending');
    setWizardStep(1);
  };

  const handleOpenBlankNewJob = () => {
    resetJobForm();
    setStaffSubTab('newJobForm');
  };

  const handleFillComplaintToNewJob = (comp) => {
    resetJobForm();
    setSelectedComplaint(comp);
    setJobCustName(comp.customerName || 'Customer');
    setJobCustPhone(comp.customerPhone || '');
    setJobCustAddress(comp.customerAddress || '');
    setCategoryType(comp.categoryType || 'HVAC & Refrigeration');
    setProductType(comp.productType || 'Split / Window AC');
    setFaultDetails(comp.faultDetails || comp.desc || '');
    setWorkDone(comp.desc || '');
    setSparePartOption(comp.sparePartOption && comp.sparePartOption !== '-' ? comp.sparePartOption : 'Used Part');
    setSparePartName(comp.sparePartName && comp.sparePartName !== '-' ? comp.sparePartName : '');
    setSparePartModel(comp.sparePartModel && comp.sparePartModel !== '-' ? comp.sparePartModel : '');
    setStaffSubTab('newJobForm');
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const compressedBlob = await compressImage(selectedFile);
    const compressedFile = new File([compressedBlob], selectedFile.name, {
      type: 'image/jpeg',
    });

    setImageFile(compressedFile);
  };

  const handleMaterialFieldChange = (index, field, value) => {
    const newMaterials = [...materials];
    newMaterials[index][field] = value;
    setMaterials(newMaterials);

    if (index === newMaterials.length - 1 && value.trim() !== '') {
      setMaterials([...newMaterials, { name: '', qty: '', price: '' }]);
    }
  };

  // बिना रुके 0.1 सेकंड में तुरंत सेव होने वाला फ़ंक्शन (Instant Non-Blocking Save + Telegram Alert)
  const handleJobSubmit = () => {
    if (!jobCustName || !jobCustPhone) {
      alert('कृपया कस्टमर का नाम और मोबाइल नंबर भरें!');
      return;
    }

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const jobSheetNo = selectedComplaint
      ? selectedComplaint.jobSheetNo
      : ('JS' + jobCustPhone.slice(-4) + day + month + hours + minutes);

    const filteredMaterials = materials.filter(m => m.name.trim() !== '');
    const finalStatus = jobStatusType === 'Completed'
      ? 'Completed'
      : (pendingSubOption === 'Part Pending' ? 'Part Pending' : 'Pending');

    const updatedRecord = {
      jobSheetNo,
      billNo: billNo || '-',
      amcDate: amcDate || '-',
      customerName: jobCustName,
      customerPhone: jobCustPhone,
      customerAddress: jobCustAddress,
      categoryType,
      productType,
      product: "[" + categoryType + "] " + productType,
      faultDetails: faultDetails || workDone || '-',
      desc: workDone || 'General Service / Repair',
      status: finalStatus,
      pendingSubOption: jobStatusType === 'Pending' ? pendingSubOption : '-',
      date: day + '/' + month + '/' + now.getFullYear() + ' ' + hours + ':' + minutes,
      staffName: currentStaffName || 'Staff (Unknown)',
      staffPhone: staffPhoneInput || '0000000000',
      location: staffGpsLocation,
      photoURL: '',
      signatureURL: savedSignatureURL,
      indoorModel: indoorModel || '-',
      indoorSerial: indoorSerial || '-',
      outdoorModel: outdoorModel || '-',
      outdoorSerial: outdoorSerial || '-',
      compressorModel: compressorModel || '-',
      compressorSerial: compressorSerial || '-',
      indoorMotorModel: indoorMotorModel || '-',
      indoorMotorSerial: indoorMotorSerial || '-',
      outdoorMotorModel: outdoorMotorModel || '-',
      outdoorMotorSerial: outdoorMotorSerial || '-',
      filterClean: categoryType === 'HVAC & Refrigeration' ? filterClean : '-',
      standType: categoryType === 'HVAC & Refrigeration' ? standType : '-',
      swingFlapper: categoryType === 'HVAC & Refrigeration' ? swingFlapper : '-',
      stabilizer: categoryType === 'HVAC & Refrigeration' ? stabilizer : '-',
      remoteStatus: categoryType === 'HVAC & Refrigeration' ? remoteStatus : '-',
      outdoorClean: categoryType === 'HVAC & Refrigeration' ? outdoorClean : '-',
      sectionPressure: categoryType === 'HVAC & Refrigeration' ? (sectionPressure || '-') : '-',
      roomTemp: categoryType === 'HVAC & Refrigeration' ? (roomTemp || '-') : '-',
      voltage: categoryType !== 'Civil Work' ? (voltage || '-') : '-',
      ampere: categoryType !== 'Civil Work' ? (ampere || '-') : '-',
      compressorAmpere: categoryType === 'HVAC & Refrigeration' ? (compressorAmpere || '-') : '-',
      drainSize: categoryType === 'HVAC & Refrigeration' ? (drainSize || '-') : '-',
      copperPipeSize: categoryType === 'HVAC & Refrigeration' ? (copperPipeSize || '-') : '-',
      wireSizeCore: categoryType !== 'Civil Work' ? (wireSizeCore || '-') : '-',
      insulation: categoryType !== 'Civil Work' ? insulation : '-',
      phaseR: phaseR || '-',
      phaseY: phaseY || '-',
      phaseB: phaseB || '-',
      ampR: ampR || '-',
      ampY: ampY || '-',
      ampB: ampB || '-',
      materials: filteredMaterials,
      sparePartOption: sparePartOption,
      sparePartName: sparePartName || '-',
      sparePartModel: sparePartModel || '-',
      note: jobNote || '-',
      feedback: customerFeedback || 'OK'
    };

    const fileToUpload = imageFile;

    // 1. स्क्रीन पर तुरंत अपडेट दिखाएं (0 सेकंड इंतजार)
    const filteredList = jobSheets.filter(j => j.jobSheetNo !== jobSheetNo);
    setJobSheets([updatedRecord, ...filteredList]);
    setLastSubmittedJob(updatedRecord);
    resetJobForm();
    setStaffSubTab('menu');

    // 2. Telegram पर स्टाफ़ अपडेट का नोटिस भेजें
    const statusBadge = finalStatus === 'Completed' ? '✅ COMPLETED' : `⏳ ${finalStatus.toUpperCase()}`;
    const spareInfo = (sparePartName && sparePartName !== '-')
      ? `\n<b>पार्ट (${sparePartOption}):</b> ${sparePartName} (${sparePartModel || '-'})`
      : '';
    const telegramMsg =
      `🛠️ <b>MANQUBE STAFF JOB UPDATE</b>\n` +
      `<b>स्टेटस:</b> ${statusBadge}\n` +
      `<b>जॉब / कंप्लेंट नं.:</b> <code>${updatedRecord.jobSheetNo}</code>\n` +
      `<b>कस्टमर:</b> ${updatedRecord.customerName} (${updatedRecord.customerPhone})\n` +
      `<b>पता:</b> ${updatedRecord.customerAddress || '-'}\n` +
      `<b>उत्पाद:</b> ${updatedRecord.product}\n` +
      `<b>किया गया कार्य:</b> ${updatedRecord.desc}${spareInfo}\n` +
      `<b>रिमार्क:</b> ${updatedRecord.feedback}\n` +
      `<b>स्टाफ:</b> ${updatedRecord.staffName}\n` +
      `<b>लोकेशन:</b> ${updatedRecord.location}\n` +
      `<b>समय:</b> ${updatedRecord.date}`;
    sendStaffTelegramAlert(telegramMsg);

    // 3. बैकग्राउंड में डेटाबेस (Firestore) में सेव करें
    setDoc(doc(db, "jobs", jobSheetNo), updatedRecord)
      .then(() => {
        if (fileToUpload) {
          const storageRef = ref(storage, 'job_photos/' + Date.now() + '_' + fileToUpload.name);
          const uploadTask = uploadBytesResumable(storageRef, fileToUpload);
          uploadTask.on(
            'state_changed',
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
      .catch((error) => {
        console.error("Background Firestore sync error:", error);
      });
  };

  const handleAddStockItem = (e) => {
    e.preventDefault();
    if (!newStockName.trim() || !newStockQty.trim() || !newStockRate.trim()) {
      alert('कृपया पार्ट का नाम, मात्रा और रेट भरें!');
      return;
    }
    const newItem = {
      name: newStockName,
      qty: newStockQty,
      desc: newStockDesc || '-',
      rate: newStockRate
    };
    setSpareStock([newItem, ...spareStock]);
    setNewStockName('');
    setNewStockQty('');
    setNewStockDesc('');
    setNewStockRate('');
    alert('स्पेयर पार्ट स्टॉक में सफलतापूर्वक जोड़ दिया गया!');
  };

  const onlineComplaintsList = jobSheets.filter(j => j.status === 'Pending' && j.location === 'Online Booking');
  const pendingJobsList = jobSheets.filter(j => j.status === 'Pending' || j.status === 'Part Pending');
  const completedJobsList = jobSheets.filter(j => j.status === 'Completed');
  const partPendingJobsList = jobSheets.filter(j => j.status === 'Part Pending' || j.sparePartOption === 'Pending Part' || j.sparePartOption === 'Pending');

  const completedByStaff = completedJobsList.reduce((acc, job) => {
    const sName = job.staffName || 'Unknown Staff';
    if (!acc[sName]) acc[sName] = [];
    acc[sName].push(job);
    return acc;
  }, {});

  const pendingByStaff = pendingJobsList.reduce((acc, job) => {
    const sName = job.staffName || 'Unknown Staff';
    if (!acc[sName]) acc[sName] = [];
    acc[sName].push(job);
    return acc;
  }, {});

  const partsPendingByName = partPendingJobsList.reduce((acc, job) => {
    const pName = job.sparePartName && job.sparePartName !== '-' ? job.sparePartName : 'General Part Pending';
    if (!acc[pName]) acc[pName] = [];
    acc[pName].push(job);
    return acc;
  }, {});

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', padding: '15px', background: '#f4f6f9', minHeight: '100vh' }}>
      
      {/* फुल-स्क्रीन मोबाइल/लैपटॉप सिग्नेचर मॉडल */}
      {isSignatureModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#ffffff',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '15px',
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px' }}>✍️ कस्टमर हस्ताक्षर (Customer Signature)</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>नीचे खाली बॉक्स में हस्ताक्षर करें</p>
            </div>
            <button
              type="button"
              onClick={() => setIsSignatureModalOpen(false)}
              style={{ padding: '6px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}
            >
              ✕ बंद करें
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '10px 0' }}>
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
                border: '2px dashed #2563eb',
                borderRadius: '8px',
                background: '#f8fafc',
                touchAction: 'none',
                cursor: 'crosshair'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={clearFullSignature}
              style={{ flex: 1, padding: '14px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px' }}
            >
              🔄 साफ करें (Clear)
            </button>
            <button
              type="button"
              onClick={saveFullSignature}
              style={{ flex: 2, padding: '14px', background: '#166534', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px' }}
            >
              ✔ हस्ताक्षर सेव करें (Done)
            </button>
          </div>
        </div>
      )}

      {/* हेडर */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '15px 0', background: '#fff', borderRadius: '8px', marginBottom: '15px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
        <img
          src="/1000384854.jpg"
          alt="Manqube Logo"
          style={{ width: '70px', height: '70px', objectFit: 'contain', borderRadius: '50%', marginBottom: '8px' }}
        />
        <h2 style={{ margin: '0', color: '#1e293b', fontSize: '20px' }}>MANQUBE PRIVATE LIMITED</h2>
        <p style={{ margin: '5px 0 0', fontSize: '13px', color: '#64748b' }}>We Build. Your Trust. | 212 Naini, Prayagraj</p>
      </div>

      {activeTab !== 'home' && (
        <div style={{ marginBottom: '15px' }}>
          <button
            onClick={() => { setActiveTab('home'); setInspectedJob(null); setLastSubmittedJob(null); setSelectedStaffFolder(null); }}
            style={{ padding: '8px 14px', backgroundColor: '#475569', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
            ⬅ मुख्य मेनू (Home) पर वापस जाएं
          </button>
        </div>
      )}

      <div style={{ background: '#dcfce7', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '12px', color: '#166534' }}>
        <strong>GPS:</strong> {staffGpsLocation}
      </div>

      {activeTab === 'home' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ textAlign: 'center', marginBottom: '5px' }}>
            <h3 style={{ margin: '0 0 5px 0', color: '#1e293b' }}>पोर्टल चुनें (Select Portal)</h3>
            <p style={{ margin: '0', fontSize: '13px', color: '#64748b' }}>कृपया आगे बढ़ने के लिए अपना संबंधित पोर्टल चुनें:</p>
          </div>

          <div
            onClick={() => setActiveTab('complaint')}
            style={{ background: '#fff', borderLeft: '5px solid #2563eb', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
            <h3 style={{ margin: '0 0 5px 0', color: '#2563eb', fontSize: '18px' }}>👤 कस्टमर पोर्टल (Customer Portal)</h3>
            <p style={{ margin: '0', fontSize: '13px', color: '#475569' }}>अपनी शिकायत दर्ज करें और पुरानी जॉब-शीट्स देखें</p>
          </div>

          <div
            onClick={() => setActiveTab('staff')}
            style={{ background: '#fff', borderLeft: '5px solid #166534', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
            <h3 style={{ margin: '0 0 5px 0', color: '#166534', fontSize: '18px' }}>🛠️ फ़ील्ड स्टाफ पोर्टल (Staff Mobile & GPS Login)</h3>
            <p style={{ margin: '0', fontSize: '13px', color: '#475569' }}>मोबाइल नंबर, OTP और GPS लोकेशन के साथ लॉगिन करें</p>
          </div>

          <div
            onClick={() => setActiveTab('admin')}
            style={{ background: '#fff', borderLeft: '5px solid #d97706', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
            <h3 style={{ margin: '0 0 5px 0', color: '#d97706', fontSize: '18px' }}>📊 एडमिन & ऑफिस स्टाफ पैनल (Office Login)</h3>
            <p style={{ margin: '0', fontSize: '13px', color: '#475569' }}>स्टाफ-वाइज जॉब फोल्डर, स्पेयर पार्ट्स स्टॉक, अटेंडेंस और लॉगिन हिस्ट्री देखें</p>
          </div>
        </div>
      )}

      {/* 1. कस्टमर पोर्टल */}
      {activeTab === 'complaint' && (
        <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <h3>कस्टमर पोर्टल</h3>
          {!custLoggedIn ? (
            <form onSubmit={handleCustomerLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ margin: '0', fontSize: '13px', color: '#64748b' }}>अपनी शिकायतें और पूरी हुई जॉब-शीट देखने के लिए अपना मोबाइल नंबर दर्ज करें:</p>
              <input
                type="tel"
                maxLength="10"
                placeholder="मोबाइल नंबर दर्ज करें"
                value={custPhone}
                onChange={(e) => setCustPhone(e.target.value)}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                required
              />
              <button type="submit" style={{ padding: '12px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
                आगे बढ़ें
              </button>
            </form>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f1f5f9', padding: '8px 12px', borderRadius: '6px', fontSize: '14px', marginBottom: '15px' }}>
                <span>स्वागत है! मोबाइल: <strong>{custPhone}</strong></span>
                <button onClick={() => setCustLoggedIn(false)} style={{ padding: '4px 8px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px' }}>लॉगआउट</button>
              </div>

              <form onSubmit={handleNewComplaint} style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px', marginBottom: '15px' }}>
                <h4 style={{ margin: '0', color: '#007bff' }}>नई शिकायत दर्ज करें (New Complaint)</h4>
                
                <label style={{ fontWeight: 'bold', fontSize: '13px' }}>कस्टमर का पूरा नाम (Customer Name):</label>
                <input
                  type="text"
                  placeholder="अपना पूरा नाम दर्ज करें"
                  value={custNameInput}
                  onChange={(e) => setCustNameInput(e.target.value)}
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  required
                />

                <label style={{ fontWeight: 'bold', fontSize: '13px' }}>कस्टमर का पूरा पता (Full Address):</label>
                <textarea
                  rows="2"
                  placeholder="लोकेशन/पता विस्तार से लिखें..."
                  value={custAddressInput}
                  onChange={(e) => setCustAddressInput(e.target.value)}
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  required
                />

                <label style={{ fontWeight: 'bold', fontSize: '13px' }}>मुख्य श्रेणी (Main Category):</label>
                <select value={categoryType} onChange={handleCategoryChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <option value="HVAC & Refrigeration">HVAC & Refrigeration (एसी, कूलर, फ्रिज, चिलर, VRV)</option>
                  <option value="Electrical Work">Electrical Work (इलेक्ट्रिकल कार्य)</option>
                  <option value="Plumbing Work">Plumbing Work (प्लंबिंग)</option>
                  <option value="Civil Work">Civil Work (सिविल कार्य)</option>
                </select>

                <label style={{ fontWeight: 'bold', fontSize: '13px' }}>संबंधित कार्य / उत्पाद (Sub-Option):</label>
                <select value={productType} onChange={(e) => setProductType(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  {categoryType === 'HVAC & Refrigeration' && (
                    <>
                      <option value="Split / Window AC">Split / Window AC</option>
                      <option value="Inverter AC">Inverter AC</option>
                      <option value="Cassette AC">Cassette AC (कैसेट एसी)</option>
                      <option value="Ductable AC">Ductable AC (डक्टेबल एसी)</option>
                      <option value="VRV / VRF System">VRV / VRF System</option>
                      <option value="AHU Unit (Air Handling Unit)">AHU Unit (Air Handling Unit)</option>
                      <option value="Chiller Unit">Chiller Unit (चिलर यूनिट)</option>
                      <option value="Air Cooler (Honeywool/Iron)">Air Cooler (Honeywool/Iron)</option>
                      <option value="Deep Freezer / Refrigerator">Deep Freezer / Refrigerator</option>
                      <option value="Water Cooler">Water Cooler</option>
                    </>
                  )}
                  {categoryType === 'Electrical Work' && (
                    <>
                      <option value="House Wiring & Panel">House Wiring & Panel</option>
                      <option value="DB / MCB / MCCB Work">DB / MCB / MCCB Work</option>
                      <option value="Earthing & Lightning Arrester">Earthing & Lightning Arrester</option>
                      <option value="Three Phase Industrial Panel">Three Phase Industrial Panel</option>
                      <option value="Inverter / UPS / Battery Setup">Inverter / UPS / Battery Setup</option>
                    </>
                  )}
                  {categoryType === 'Plumbing Work' && (
                    <>
                      <option value="Pipe Fitting & Leakage Repair">Pipe Fitting & Leakage Repair</option>
                      <option value="Sanitary & Bathroom Fitting">Sanitary & Bathroom Fitting</option>
                      <option value="Water Tank Installation">Water Tank Installation</option>
                      <option value="Boring & Submersible Pump Work">Boring & Submersible Pump Work</option>
                      <option value="Drainage & Sewer Line Fitting">Drainage & Sewer Line Fitting</option>
                      <option value="Pressure Pump Installation">Pressure Pump Installation</option>
                    </>
                  )}
                  {categoryType === 'Civil Work' && (
                    <>
                      <option value="Flooring & Tiling">Flooring & Tiling</option>
                      <option value="Brickwork & Plastering">Brickwork & Plastering</option>
                      <option value="RCC Roof & Pillar Casting">RCC Roof & Pillar Casting</option>
                      <option value="Waterproofing & Leakage Solution">Waterproofing & Leakage Solution</option>
                      <option value="Foundation & Excavation">Foundation & Excavation</option>
                      <option value="Wall Putty & Painting">Wall Putty & Painting</option>
                    </>
                  )}
                </select>

                <label style={{ fontWeight: 'bold', fontSize: '13px' }}>समस्या का विवरण:</label>
                <textarea
                  rows="3"
                  placeholder="क्या समस्या आ रही है विस्तार से लिखें..."
                  value={problemDesc}
                  onChange={(e) => setProblemDesc(e.target.value)}
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  required
                />

                <button type="submit" style={{ padding: '12px', backgroundColor: '#166534', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
                  शिकायत सबमिट करें
                </button>
              </form>

              <div>
                <h4 style={{ margin: '0 0 10px 0' }}>आपकी शिकायतें और जॉब हिस्ट्री:</h4>
                {jobSheets.filter(j => j.customerPhone === custPhone).length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '13px' }}>कोई पुरानी शिकायत या जॉब शीट नहीं मिली।</p>
                ) : (
                  jobSheets.filter(j => j.customerPhone === custPhone).map((job) => (
                    <div key={job.jobSheetNo} style={{ border: '1px solid #e2e8f0', padding: '10px', borderRadius: '6px', marginBottom: '10px', background: '#fafafa' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold' }}>
                        <span>{job.jobSheetNo} ({job.customerName})</span>
                        <span style={{ color: job.status === 'Completed' ? 'green' : 'orange' }}>{job.status}</span>
                      </div>
                      <div style={{ fontSize: '13px', marginTop: '4px' }}>{job.product} - {job.desc}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>पता: {job.customerAddress} | तारीख: {job.date}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. फ़ील्ड स्टाफ पोर्टल */}
      {activeTab === 'staff' && (
        <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <h3>फ़ील्ड स्टाफ लॉगिन</h3>
          {!staffLoggedIn ? (
            <div>
              {otpStep === 1 ? (
                <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ margin: '0', fontSize: '13px', color: '#64748b' }}>अपना रजिस्टर्ड मोबाइल नंबर दर्ज करें:</p>
                  <input
                    type="tel"
                    maxLength="10"
                    placeholder="10 अंकों का मोबाइल नंबर"
                    value={staffPhoneInput}
                    onChange={(e) => setStaffPhoneInput(e.target.value)}
                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    required
                  />
                  <button type="submit" style={{ padding: '12px', backgroundColor: '#166534', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
                    OTP भेजें
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '13px', color: '#475569' }}>
                    नंबर <strong>{staffPhoneInput}</strong> पर OTP भेजा गया है।
                  </div>
                  <label style={{ fontWeight: 'bold' }}>OTP दर्ज करें:</label>
                  <input
                    type="text"
                    maxLength="4"
                    placeholder="4 अंकों का OTP"
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value)}
                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    required
                  />
                  <button type="submit" style={{ padding: '12px', backgroundColor: '#166534', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
                    OTP सत्यापित करें और लॉगिन करें
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', background: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                <span style={{ fontSize: '13px' }}>स्टाफ: <strong>{currentStaffName}</strong></span>
                <button onClick={() => setStaffLoggedIn(false)} style={{ padding: '5px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px' }}>लॉग आउट</button>
              </div>

              {lastSubmittedJob && (
                <PrintableJobSheet
                  job={lastSubmittedJob}
                  onClose={() => setLastSubmittedJob(null)}
                />
              )}

              {staffSubTab === 'menu' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button onClick={() => { setLastSubmittedJob(null); handleOpenBlankNewJob(); }} style={{ padding: '12px', backgroundColor: '#166534', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', textAlign: 'left' }}>
                    ➕ नई जॉब शीट भरें (New Job Sheet)
                  </button>
                  <button onClick={() => setStaffSubTab('onlineComplaints')} style={{ padding: '12px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', textAlign: 'left' }}>
                    📋 ऑनलाइन शिकायतें देखें ({onlineComplaintsList.length})
                  </button>
                  <button onClick={() => setStaffSubTab('pending')} style={{ padding: '12px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', textAlign: 'left' }}>
                    ⏳ पेंडिंग जॉब्स ({pendingJobsList.length})
                  </button>
                  <button onClick={() => setStaffSubTab('completed')} style={{ padding: '12px', backgroundColor: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', textAlign: 'left' }}>
                    ✅ कम्पलीट जॉब्स ({completedJobsList.length})
                  </button>
                  <button onClick={() => setStaffSubTab('partPending')} style={{ padding: '12px', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', textAlign: 'left' }}>
                    ⚙️ स्पेयर पार्ट पेंडिंग ({partPendingJobsList.length})
                  </button>
                </div>
              )}

              {staffSubTab === 'onlineComplaints' && (
                <div>
                  <button onClick={() => setStaffSubTab('menu')} style={{ marginBottom: '10px', padding: '6px 12px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '4px' }}>← पीछे जाएं</button>
                  <h4>ऑनलाइन प्राप्त शिकायतें (Online Complaints)</h4>
                  {onlineComplaintsList.length === 0 ? (
                    <p style={{ color: '#64748b' }}>कोई नई ऑनलाइन शिकायत उपलब्ध नहीं है।</p>
                  ) : (
                    onlineComplaintsList.map((job) => (
                      <div key={job.jobSheetNo} style={{ border: '1px solid #e2e8f0', padding: '10px', borderRadius: '6px', marginBottom: '10px', background: '#fafafa' }}>
                        <div><strong>कम्प्लेंट नं:</strong> {job.jobSheetNo}</div>
                        <div><strong>कस्टमर:</strong> {job.customerName} ({job.customerPhone})</div>
                        <div><strong>पता:</strong> {job.customerAddress}</div>
                        <div><strong>उत्पाद:</strong> {job.product}</div>
                        <div><strong>विवरण:</strong> {job.desc}</div>
                        <button onClick={() => handleFillComplaintToNewJob(job)} style={{ marginTop: '8px', padding: '6px 12px', backgroundColor: '#166534', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px' }}>
                          इस शिकायत पर जॉब शीट भरें
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {staffSubTab === 'pending' && (
                <div>
                  <button onClick={() => setStaffSubTab('menu')} style={{ marginBottom: '10px', padding: '6px 12px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '4px' }}>← पीछे जाएं</button>
                  <h4>पेंडिंग जॉब्स (Pending Jobs)</h4>
                  {pendingJobsList.length === 0 ? (
                    <p style={{ color: '#64748b' }}>कोई पेंडिंग जॉब नहीं है।</p>
                  ) : (
                    pendingJobsList.map((job) => (
                      <div key={job.jobSheetNo} style={{ border: '1px solid #fcd34d', padding: '10px', borderRadius: '6px', marginBottom: '10px', background: '#fffbeb' }}>
                        <div><strong>नंबर:</strong> {job.jobSheetNo}</div>
                        <div><strong>कस्टमर:</strong> {job.customerName} ({job.customerPhone})</div>
                        <div><strong>विवरण:</strong> {job.desc}</div>
                        <button onClick={() => handleFillComplaintToNewJob(job)} style={{ marginTop: '8px', padding: '6px 12px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px' }}>
                          जारी रखें / अपडेट करें
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {staffSubTab === 'completed' && (
                <div>
                  <button onClick={() => setStaffSubTab('menu')} style={{ marginBottom: '10px', padding: '6px 12px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '4px' }}>← पीछे जाएं</button>
                  <h4>कम्पलीट जॉब्स (Completed Jobs)</h4>
                  {completedJobsList.length === 0 ? (
                    <p style={{ color: '#64748b' }}>अभी तक कोई जॉब कम्पलीट नहीं हुई है।</p>
                  ) : (
                    completedJobsList.map((job) => (
                      <div key={job.jobSheetNo} style={{ border: '1px solid #86efac', padding: '10px', borderRadius: '6px', marginBottom: '10px', background: '#f0fdf4' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div><strong>जॉब नंबर:</strong> {job.jobSheetNo}</div>
                          <button
                            onClick={() => setLastSubmittedJob(job)}
                            style={{ padding: '4px 8px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}
                          >
                            📄 जॉब शीट खोलें / प्रिंट करें
                          </button>
                        </div>
                        <div><strong>कस्टमर:</strong> {job.customerName} ({job.customerPhone})</div>
                        <div><strong>उत्पाद:</strong> {job.product}</div>
                        <div><strong>कार्य विवरण:</strong> {job.desc}</div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {staffSubTab === 'partPending' && (
                <div>
                  <button onClick={() => setStaffSubTab('menu')} style={{ marginBottom: '10px', padding: '6px 12px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '4px' }}>← पीछे जाएं</button>
                  <h4>स्पेयर पार्ट पेंडिंग</h4>
                  {partPendingJobsList.length === 0 ? (
                    <p style={{ color: '#64748b' }}>कोई स्पेयर पार्ट पेंडिंग जॉब नहीं है।</p>
                  ) : (
                    partPendingJobsList.map((job) => (
                      <div key={job.jobSheetNo} style={{ border: '1px solid #c4b5fd', padding: '10px', borderRadius: '6px', marginBottom: '10px', background: '#f5f3ff' }}>
                        <div><strong>नंबर:</strong> {job.jobSheetNo}</div>
                        <div><strong>कस्टमर:</strong> {job.customerName} ({job.customerPhone})</div>
                        <div><strong>मंगवाना है पार्ट:</strong> {job.sparePartName} (मॉडल: {job.sparePartModel})</div>
                        <button onClick={() => handleFillComplaintToNewJob(job)} style={{ marginTop: '8px', padding: '6px 12px', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px' }}>
                          पार्ट स्टेटस अपडेट करें
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {staffSubTab === 'newJobForm' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <button onClick={() => setStaffSubTab('menu')} style={{ padding: '6px 12px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '4px' }}>← मेनू पर वापस जाएं</button>
                    <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Wizard Step: {wizardStep} / 5</span>
                  </div>

                  {/* स्टेप 1 */}
                  {wizardStep === 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <h4>स्टेप 1: कस्टमर और प्रॉडक्ट विवरण</h4>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '12px', fontWeight: 'bold' }}>बिल नं (Bill No. - वैकल्पिक):</label>
                          <input type="text" placeholder="Bill No." value={billNo} onChange={(e) => setBillNo(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '12px', fontWeight: 'bold' }}>AMC दिनांक (AMC Date):</label>
                          <input type="text" placeholder="DD/MM/YYYY" value={amcDate} onChange={(e) => setAmcDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                        </div>
                      </div>

                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>कस्टमर का नाम:</label>
                      <input type="text" value={jobCustName} onChange={(e) => setJobCustName(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />

                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>कस्टमर मोबाइल नंबर:</label>
                      <input type="tel" maxLength="10" value={jobCustPhone} onChange={(e) => setJobCustPhone(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />

                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>कस्टमर का पूरा पता (Address):</label>
                      <textarea rows="2" value={jobCustAddress} onChange={(e) => setJobCustAddress(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />

                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>श्रेणी (Category):</label>
                      <select value={categoryType} onChange={handleCategoryChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                        <option value="HVAC & Refrigeration">HVAC & Refrigeration</option>
                        <option value="Electrical Work">Electrical Work</option>
                        <option value="Plumbing Work">Plumbing Work</option>
                        <option value="Civil Work">Civil Work</option>
                      </select>

                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>संबंधित कार्य / उत्पाद (Sub-Option):</label>
                      <select value={productType} onChange={(e) => setProductType(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                        {categoryType === 'HVAC & Refrigeration' && (
                          <>
                            <option value="Split / Window AC">Split / Window AC</option>
                            <option value="Inverter AC">Inverter AC</option>
                            <option value="Cassette AC">Cassette AC</option>
                            <option value="Ductable AC">Ductable AC</option>
                            <option value="VRV / VRF System">VRV / VRF System</option>
                            <option value="AHU Unit">AHU Unit</option>
                            <option value="Chiller Unit">Chiller Unit</option>
                            <option value="Air Cooler">Air Cooler</option>
                            <option value="Refrigerator / Deep Freezer">Refrigerator / Deep Freezer</option>
                          </>
                        )}
                        {categoryType === 'Electrical Work' && (
                          <>
                            <option value="House Wiring & Panel">House Wiring & Panel</option>
                            <option value="DB / MCB / MCCB Work">DB / MCB / MCCB Work</option>
                            <option value="Earthing & Lightning Arrester">Earthing & Lightning Arrester</option>
                            <option value="Three Phase Industrial Panel">Three Phase Industrial Panel</option>
                            <option value="Inverter / UPS / Battery Setup">Inverter / UPS / Battery Setup</option>
                          </>
                        )}
                        {categoryType === 'Plumbing Work' && (
                          <>
                            <option value="Pipe Fitting & Leakage Repair">Pipe Fitting & Leakage Repair</option>
                            <option value="Sanitary & Bathroom Fitting">Sanitary & Bathroom Fitting</option>
                            <option value="Water Tank Installation">Water Tank Installation</option>
                            <option value="Boring & Submersible Pump Work">Boring & Submersible Pump Work</option>
                            <option value="Drainage & Sewer Line Fitting">Drainage & Sewer Line Fitting</option>
                            <option value="Pressure Pump Installation">Pressure Pump Installation</option>
                          </>
                        )}
                        {categoryType === 'Civil Work' && (
                          <>
                            <option value="Flooring & Tiling">Flooring & Tiling</option>
                            <option value="Brickwork & Plastering">Brickwork & Plastering</option>
                            <option value="RCC Roof & Pillar Casting">RCC Roof & Pillar Casting</option>
                            <option value="Waterproofing & Leakage Solution">Waterproofing & Leakage Solution</option>
                            <option value="Foundation & Excavation">Foundation & Excavation</option>
                            <option value="Wall Putty & Painting">Wall Putty & Painting</option>
                          </>
                        )}
                      </select>

                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>फॉल्ट / समस्या विवरण (Fault / Problem Details):</label>
                      <input type="text" placeholder="जैसे: No Cooling, Water Leakage..." value={faultDetails} onChange={(e) => setFaultDetails(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />

                      <button onClick={() => setWizardStep(2)} style={{ marginTop: '10px', padding: '10px', backgroundColor: '#166534', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
                        अगला (Next) →
                      </button>
                    </div>
                  )}

                  {/* स्टेप 2 */}
                  {wizardStep === 2 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <h4>स्टेप 2: टेक्निकल पैरामीटर्स एवं चेकलिस्ट</h4>

                      {categoryType === 'HVAC & Refrigeration' && (
                        <>
                          <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <strong style={{ fontSize: '12px', color: '#0f172a' }}>1. यूनिट और कंप्रेसर विवरण:</strong>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <input type="text" placeholder="Indoor Model" value={indoorModel} onChange={(e) => setIndoorModel(e.target.value)} style={{ flex: 1, padding: '7px', fontSize: '12px' }} />
                              <input type="text" placeholder="Indoor Serial" value={indoorSerial} onChange={(e) => setIndoorSerial(e.target.value)} style={{ flex: 1, padding: '7px', fontSize: '12px' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <input type="text" placeholder="Outdoor Model" value={outdoorModel} onChange={(e) => setOutdoorModel(e.target.value)} style={{ flex: 1, padding: '7px', fontSize: '12px' }} />
                              <input type="text" placeholder="Outdoor Serial" value={outdoorSerial} onChange={(e) => setOutdoorSerial(e.target.value)} style={{ flex: 1, padding: '7px', fontSize: '12px' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <input type="text" placeholder="Compressor Model" value={compressorModel} onChange={(e) => setCompressorModel(e.target.value)} style={{ flex: 1, padding: '7px', fontSize: '12px' }} />
                              <input type="text" placeholder="Compressor Serial" value={compressorSerial} onChange={(e) => setCompressorSerial(e.target.value)} style={{ flex: 1, padding: '7px', fontSize: '12px' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <input type="text" placeholder="In-Door Motor Model" value={indoorMotorModel} onChange={(e) => setIndoorMotorModel(e.target.value)} style={{ flex: 1, padding: '7px', fontSize: '12px' }} />
                              <input type="text" placeholder="In-Door Motor Serial" value={indoorMotorSerial} onChange={(e) => setIndoorMotorSerial(e.target.value)} style={{ flex: 1, padding: '7px', fontSize: '12px' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <input type="text" placeholder="Out-Door Motor Model" value={outdoorMotorModel} onChange={(e) => setOutdoorMotorModel(e.target.value)} style={{ flex: 1, padding: '7px', fontSize: '12px' }} />
                              <input type="text" placeholder="Out-Door Motor Serial" value={outdoorMotorSerial} onChange={(e) => setOutdoorMotorSerial(e.target.value)} style={{ flex: 1, padding: '7px', fontSize: '12px' }} />
                            </div>
                          </div>

                          <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div style={{ gridColumn: '1 / -1' }}><strong style={{ fontSize: '12px', color: '#0f172a' }}>2. सर्विस एवं फिजिकल चेकलिस्ट:</strong></div>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 'bold' }}>FILTER CLEAN:</label>
                              <select value={filterClean} onChange={(e) => setFilterClean(e.target.value)} style={{ width: '100%', padding: '6px', fontSize: '12px' }}>
                                <option value="OK">OK (साफ किया)</option>
                                <option value="Not OK">Not OK / Damaged</option>
                                <option value="NA">N/A</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 'bold' }}>STAND TYPE:</label>
                              <select value={standType} onChange={(e) => setStandType(e.target.value)} style={{ width: '100%', padding: '6px', fontSize: '12px' }}>
                                <option value="Wall Stand">Wall Stand</option>
                                <option value="Floor Stand">Floor Stand</option>
                                <option value="Hanging / Ceiling">Hanging / Ceiling</option>
                                <option value="Not Required">Not Required</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 'bold' }}>SWING / FLAPPER:</label>
                              <select value={swingFlapper} onChange={(e) => setSwingFlapper(e.target.value)} style={{ width: '100%', padding: '6px', fontSize: '12px' }}>
                                <option value="OK">OK</option>
                                <option value="Not Working">Not Working</option>
                                <option value="Broken">Broken</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 'bold' }}>STABILIZER:</label>
                              <select value={stabilizer} onChange={(e) => setStabilizer(e.target.value)} style={{ width: '100%', padding: '6px', fontSize: '12px' }}>
                                <option value="OK">OK</option>
                                <option value="Faulty">Faulty</option>
                                <option value="Not Installed">Not Installed</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 'bold' }}>REMOTE:</label>
                              <select value={remoteStatus} onChange={(e) => setRemoteStatus(e.target.value)} style={{ width: '100%', padding: '6px', fontSize: '12px' }}>
                                <option value="OK">OK</option>
                                <option value="Not Working">Not Working</option>
                                <option value="Missing">Missing</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 'bold' }}>OUTDOOR CLEAN:</label>
                              <select value={outdoorClean} onChange={(e) => setOutdoorClean(e.target.value)} style={{ width: '100%', padding: '6px', fontSize: '12px' }}>
                                <option value="OK">OK (सर्विस की गई)</option>
                                <option value="Pending">Pending</option>
                                <option value="NA">N/A</option>
                              </select>
                            </div>
                          </div>

                          <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div style={{ gridColumn: '1 / -1' }}><strong style={{ fontSize: '12px', color: '#0f172a' }}>3. गैस, पाइपिंग एवं इलेक्ट्रिकल माप:</strong></div>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 'bold' }}>ROOM TEMP (°C):</label>
                              <input type="text" placeholder="e.g. 24°C" value={roomTemp} onChange={(e) => setRoomTemp(e.target.value)} style={{ width: '100%', padding: '6px', fontSize: '12px', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 'bold' }}>SUCTION PRESSURE:</label>
                              <input type="text" placeholder="e.g. 120 PSI" value={sectionPressure} onChange={(e) => setSectionPressure(e.target.value)} style={{ width: '100%', padding: '6px', fontSize: '12px', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 'bold' }}>COMPRESSOR AMPERE:</label>
                              <input type="text" placeholder="e.g. 6.5 A" value={compressorAmpere} onChange={(e) => setCompressorAmpere(e.target.value)} style={{ width: '100%', padding: '6px', fontSize: '12px', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 'bold' }}>DRAIN WITH SIZE:</label>
                              <input type="text" placeholder="e.g. 1 inch PVC" value={drainSize} onChange={(e) => setDrainSize(e.target.value)} style={{ width: '100%', padding: '6px', fontSize: '12px', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 'bold' }}>COPPER PIPE SIZE:</label>
                              <input type="text" placeholder="e.g. 1/4 & 1/2" value={copperPipeSize} onChange={(e) => setCopperPipeSize(e.target.value)} style={{ width: '100%', padding: '6px', fontSize: '12px', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 'bold' }}>INSULATION:</label>
                              <select value={insulation} onChange={(e) => setInsulation(e.target.value)} style={{ width: '100%', padding: '6px', fontSize: '12px' }}>
                                <option value="OK">OK</option>
                                <option value="Damaged">Damaged</option>
                                <option value="Replaced">Replaced</option>
                              </select>
                            </div>
                          </div>
                        </>
                      )}

                      {categoryType !== 'Civil Work' && (
                        <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <strong style={{ fontSize: '12px', color: '#0f172a' }}>वोल्टेज, एम्पीयर एवं 3-फ़ेज़ रीडिंग (R / Y / B):</strong>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <input type="text" placeholder="Voltage (230V)" value={voltage} onChange={(e) => setVoltage(e.target.value)} style={{ flex: 1, padding: '7px', fontSize: '12px' }} />
                            <input type="text" placeholder="Total Ampere" value={ampere} onChange={(e) => setAmpere(e.target.value)} style={{ flex: 1, padding: '7px', fontSize: '12px' }} />
                            <input type="text" placeholder="Wire Size & Core" value={wireSizeCore} onChange={(e) => setWireSizeCore(e.target.value)} style={{ flex: 1, padding: '7px', fontSize: '12px' }} />
                          </div>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <input type="text" placeholder="R Voltage" value={phaseR} onChange={(e) => setPhaseR(e.target.value)} style={{ flex: 1, padding: '7px', fontSize: '12px' }} />
                            <input type="text" placeholder="Y Voltage" value={phaseY} onChange={(e) => setPhaseY(e.target.value)} style={{ flex: 1, padding: '7px', fontSize: '12px' }} />
                            <input type="text" placeholder="B Voltage" value={phaseB} onChange={(e) => setPhaseB(e.target.value)} style={{ flex: 1, padding: '7px', fontSize: '12px' }} />
                          </div>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <input type="text" placeholder="R Ampere" value={ampR} onChange={(e) => setAmpR(e.target.value)} style={{ flex: 1, padding: '7px', fontSize: '12px' }} />
                            <input type="text" placeholder="Y Ampere" value={ampY} onChange={(e) => setAmpY(e.target.value)} style={{ flex: 1, padding: '7px', fontSize: '12px' }} />
                            <input type="text" placeholder="B Ampere" value={ampB} onChange={(e) => setAmpB(e.target.value)} style={{ flex: 1, padding: '7px', fontSize: '12px' }} />
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button onClick={() => setWizardStep(1)} style={{ flex: 1, padding: '10px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '6px' }}>← पीछे</button>
                        <button onClick={() => setWizardStep(3)} style={{ flex: 1, padding: '10px', backgroundColor: '#166534', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>अगला →</button>
                      </div>
                    </div>
                  )}

                  {/* स्टेप 3 */}
                  {wizardStep === 3 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <h4>स्टेप 3: किया गया कार्य और स्पेयर पार्ट्स</h4>
                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>किया गया कार्य (Work Done):</label>
                      <textarea rows="3" value={workDone} onChange={(e) => setWorkDone(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />

                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>स्पेयर पार्ट विकल्प:</label>
                      <select value={sparePartOption} onChange={(e) => setSparePartOption(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                        <option value="Used Part">Used Part (इस्तेमाल किया गया)</option>
                        <option value="Pending Part">Pending Part (पार्ट मंगवाना है)</option>
                      </select>

                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>स्पेयर पार्ट का नाम और मॉडल:</label>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <input type="text" placeholder="Part Name" value={sparePartName} onChange={(e) => setSparePartName(e.target.value)} style={{ flex: 1, padding: '8px' }} />
                        <input type="text" placeholder="Model / No." value={sparePartModel} onChange={(e) => setSparePartModel(e.target.value)} style={{ flex: 1, padding: '8px' }} />
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button onClick={() => setWizardStep(2)} style={{ flex: 1, padding: '10px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '6px' }}>← पीछे</button>
                        <button onClick={() => setWizardStep(4)} style={{ flex: 1, padding: '10px', backgroundColor: '#166534', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>अगला →</button>
                      </div>
                    </div>
                  )}

                  {/* स्टेप 4 */}
                  {wizardStep === 4 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <h4>स्टेप 4: मैटेरियल्स / पार्ट्स एवं रेट लिस्ट</h4>
                      {materials.map((mat, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
                          <input
                            type="text"
                            placeholder="Item Name"
                            value={mat.name}
                            onChange={(e) => handleMaterialFieldChange(idx, 'name', e.target.value)}
                            style={{ flex: 2, padding: '6px' }}
                          />
                          <input
                            type="text"
                            placeholder="Qty"
                            value={mat.qty}
                            onChange={(e) => handleMaterialFieldChange(idx, 'qty', e.target.value)}
                            style={{ flex: 1, padding: '6px' }}
                          />
                          <input
                            type="text"
                            placeholder="Rate ₹"
                            value={mat.price}
                            onChange={(e) => handleMaterialFieldChange(idx, 'price', e.target.value)}
                            style={{ flex: 1, padding: '6px' }}
                          />
                        </div>
                      ))}

                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button onClick={() => setWizardStep(3)} style={{ flex: 1, padding: '10px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '6px' }}>← पीछे</button>
                        <button onClick={() => setWizardStep(5)} style={{ flex: 1, padding: '10px', backgroundColor: '#166534', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>अगला →</button>
                      </div>
                    </div>
                  )}

                  {/* स्टेप 5 */}
                  {wizardStep === 5 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <h4>स्टेप 5: स्टेटस, फोटो और कस्टमर हस्ताक्षर</h4>
                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>जॉब स्टेटस:</label>
                      <select value={jobStatusType} onChange={(e) => setJobStatusType(e.target.value)} style={{ padding: '8px' }}>
                        <option value="Completed">Completed (पूर्ण)</option>
                        <option value="Pending">Pending (लंबित)</option>
                      </select>

                      {jobStatusType === 'Pending' && (
                        <>
                          <label style={{ fontSize: '12px', fontWeight: 'bold' }}>पेंडिंग का कारण:</label>
                          <select value={pendingSubOption} onChange={(e) => setPendingSubOption(e.target.value)} style={{ padding: '8px' }}>
                            <option value="Part Pending">Part Pending (पार्ट प्रतीक्षित)</option>
                            <option value="Repeat Complaint">Repeat Complaint</option>
                            <option value="Customer Busy">Customer Busy</option>
                          </select>
                        </>
                      )}

                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>कस्टमर रिमार्क / फीडबैक (Customer Remark):</label>
                      <input type="text" placeholder="जैसे: Working Fine / Good Service" value={customerFeedback} onChange={(e) => setCustomerFeedback(e.target.value)} style={{ padding: '8px' }} />

                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>साइट फोटो अपलोड करें:</label>
                      <input type="file" accept="image/*" onChange={handleFileChange} style={{ padding: '6px' }} />

                      <label style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '4px' }}>कस्टमर हस्ताक्षर (Customer Signature):</label>
                      <button
                        type="button"
                        onClick={() => setIsSignatureModalOpen(true)}
                        style={{
                          padding: '14px',
                          backgroundColor: savedSignatureURL ? '#0284c7' : '#2563eb',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          cursor: 'pointer'
                        }}
                      >
                        {savedSignatureURL ? '✍️ हस्ताक्षर बदलें (Edit Full-Screen Signature)' : '✍️ कस्टमर हस्ताक्षर करें (Open Full Screen)'}
                      </button>

                      {savedSignatureURL && (
                        <div style={{ border: '1px solid #cbd5e1', background: '#f8fafc', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', color: '#166534', marginBottom: '4px', fontWeight: 'bold' }}>✅ कस्टमर का हस्ताक्षर सेव हो चुका है:</div>
                          <img src={savedSignatureURL} alt="Saved Signature Preview" style={{ maxHeight: '80px', border: '1px solid #e2e8f0', background: '#fff' }} />
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                        <button onClick={() => setWizardStep(4)} style={{ flex: 1, padding: '12px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '6px' }}>← पीछे</button>
                        <button
                          type="button"
                          onClick={handleJobSubmit}
                          style={{ flex: 2, padding: '12px', backgroundColor: '#166534', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>
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
      {activeTab === 'admin' && (
        <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <h3>📊 एडमिन कंट्रोल पैनल</h3>
          {!adminLoggedIn ? (
            <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ fontWeight: 'bold' }}>यूजरनेम (Username):</label>
              <input
                type="text"
                placeholder="Admin"
                value={adminUser}
                onChange={(e) => setAdminUser(e.target.value)}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                required
              />
              <label style={{ fontWeight: 'bold' }}>पासवर्ड (Password):</label>
              <input
                type="password"
                placeholder="Password"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                required
              />
              <button type="submit" style={{ padding: '10px', backgroundColor: '#166534', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '15px' }}>
                    <button
                      onClick={() => { setAdminMainTab('jobs'); setSelectedStaffFolder(null); }}
                      style={{ padding: '10px', backgroundColor: adminMainTab === 'jobs' ? '#166534' : '#e2e8f0', color: adminMainTab === 'jobs' ? '#fff' : '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px' }}>
                      📋 जॉब शीट ({jobSheets.length})
                    </button>
                    <button
                      onClick={() => setAdminMainTab('spares')}
                      style={{ padding: '10px', backgroundColor: adminMainTab === 'spares' ? '#166534' : '#e2e8f0', color: adminMainTab === 'spares' ? '#fff' : '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px' }}>
                      ⚙️ स्पेयर पार्ट
                    </button>
                    <button
                      onClick={() => setAdminMainTab('attendance')}
                      style={{ padding: '10px', backgroundColor: adminMainTab === 'attendance' ? '#166534' : '#e2e8f0', color: adminMainTab === 'attendance' ? '#fff' : '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px' }}>
                      📅 अटेंडेंस ({loginLogs.filter(l => l.role === 'staff').length})
                    </button>
                    <button
                      onClick={() => setAdminMainTab('logins')}
                      style={{ padding: '10px', backgroundColor: adminMainTab === 'logins' ? '#166534' : '#e2e8f0', color: adminMainTab === 'logins' ? '#fff' : '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px' }}>
                      🔐 लॉगिन हिस्ट्री ({loginLogs.length})
                    </button>
                  </div>

                  {adminMainTab === 'jobs' && (
                    <div>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <button
                          onClick={() => { setAdminJobSubTab('completed'); setSelectedStaffFolder(null); }}
                          style={{ flex: 1, padding: '6px', backgroundColor: adminJobSubTab === 'completed' ? '#0284c7' : '#f1f5f9', color: adminJobSubTab === 'completed' ? '#fff' : '#334155', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                          कम्पलीट जॉब्स ({completedJobsList.length})
                        </button>
                        <button
                          onClick={() => { setAdminJobSubTab('pending'); setSelectedStaffFolder(null); }}
                          style={{ flex: 1, padding: '6px', backgroundColor: adminJobSubTab === 'pending' ? '#d97706' : '#f1f5f9', color: adminJobSubTab === 'pending' ? '#fff' : '#334155', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                          पेंडिंग जॉब्स ({pendingJobsList.length})
                        </button>
                      </div>

                      {adminJobSubTab === 'completed' && (
                        <div>
                          {selectedStaffFolder === null ? (
                            <div>
                              <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#334155' }}>📁 स्टाफ फोल्डर्स (कम्पलीट जॉब्स):</h4>
                              {Object.keys(completedByStaff).length === 0 ? (
                                <p style={{ color: '#64748b', fontSize: '13px' }}>कोई कम्पलीट जॉब उपलब्ध नहीं है।</p>
                              ) : (
                                Object.keys(completedByStaff).map((staffName) => (
                                  <div key={staffName} onClick={() => setSelectedStaffFolder(staffName)} style={{ border: '1px solid #cbd5e1', padding: '12px', borderRadius: '6px', marginBottom: '8px', background: '#f8fafc', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>📁 <strong>{staffName}</strong></div>
                                    <span style={{ background: '#0284c7', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' }}>
                                      {completedByStaff[staffName].length} जॉब्स
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          ) : (
                            <div>
                              <button onClick={() => setSelectedStaffFolder(null)} style={{ marginBottom: '10px', padding: '6px 12px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '4px' }}>← सभी स्टाफ फोल्डर्स पर वापस जाएं</button>
                              <h4 style={{ margin: '0 0 10px 0', color: '#166534' }}>📁 स्टाफ: {selectedStaffFolder} (कम्पलीट जॉब्स)</h4>
                              {completedByStaff[selectedStaffFolder].map((job) => (
                                <div key={job.jobSheetNo} onClick={() => setInspectedJob(job)} style={{ border: '1px solid #86efac', padding: '10px', borderRadius: '6px', marginBottom: '8px', background: '#f0fdf4', cursor: 'pointer' }}>
                                  <div><strong style={{ color: '#2563eb' }}>{job.jobSheetNo}</strong> - {job.customerName} ({job.customerPhone})</div>
                                  <div style={{ fontSize: '12px', color: '#475569' }}>उत्पाद: {job.product} | तारीख: {job.date}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {adminJobSubTab === 'pending' && (
                        <div>
                          {selectedStaffFolder === null ? (
                            <div>
                              <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#334155' }}>📁 स्टाफ फोल्डर्स (पेंडिंग जॉब्स):</h4>
                              {Object.keys(pendingByStaff).length === 0 ? (
                                <p style={{ color: '#64748b', fontSize: '13px' }}>कोई पेंडिंग जॉब उपलब्ध नहीं है।</p>
                              ) : (
                                Object.keys(pendingByStaff).map((staffName) => (
                                  <div key={staffName} onClick={() => setSelectedStaffFolder(staffName)} style={{ border: '1px solid #cbd5e1', padding: '12px', borderRadius: '6px', marginBottom: '8px', background: '#fffbeb', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>📁 <strong>{staffName}</strong></div>
                                    <span style={{ background: '#d97706', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' }}>
                                      {pendingByStaff[staffName].length} जॉब्स
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          ) : (
                            <div>
                              <button onClick={() => setSelectedStaffFolder(null)} style={{ marginBottom: '10px', padding: '6px 12px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '4px' }}>← सभी स्टाफ फोल्डर्स पर वापस जाएं</button>
                              <h4 style={{ margin: '0 0 10px 0', color: '#d97706' }}>📁 स्टाफ: {selectedStaffFolder} (पेंडिंग जॉब्स)</h4>
                              {pendingByStaff[selectedStaffFolder].map((job) => (
                                <div key={job.jobSheetNo} onClick={() => setInspectedJob(job)} style={{ border: '1px solid #fcd34d', padding: '10px', borderRadius: '6px', marginBottom: '8px', background: '#fffbeb', cursor: 'pointer' }}>
                                  <div><strong style={{ color: '#d97706' }}>{job.jobSheetNo}</strong> - {job.customerName} ({job.customerPhone})</div>
                                  <div style={{ fontSize: '12px', color: '#475569' }}>उत्पाद: {job.product} | विवरण: {job.desc}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {adminMainTab === 'spares' && (
                    <div>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <button
                          onClick={() => setAdminSpareSubTab('stock')}
                          style={{ flex: 1, padding: '6px', backgroundColor: adminSpareSubTab === 'stock' ? '#166534' : '#f1f5f9', color: adminSpareSubTab === 'stock' ? '#fff' : '#334155', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                          📦 स्पेयर पार्ट स्टॉक
                        </button>
                        <button
                          onClick={() => setAdminSpareSubTab('pending')}
                          style={{ flex: 1, padding: '6px', backgroundColor: adminSpareSubTab === 'pending' ? '#8b5cf6' : '#f1f5f9', color: adminSpareSubTab === 'pending' ? '#fff' : '#334155', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                          ⚙️ पेंडिंग पार्ट्स ({partPendingJobsList.length})
                        </button>
                      </div>

                      {adminSpareSubTab === 'stock' && (
                        <div>
                          <form onSubmit={handleAddStockItem} style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <h4 style={{ margin: '0', fontSize: '13px', color: '#166534' }}>➕ नया स्पेयर पार्ट स्टॉक में जोड़ें</h4>
                            <input type="text" placeholder="पार्ट का नाम (Part Name)" value={newStockName} onChange={(e) => setNewStockName(e.target.value)} style={{ padding: '6px', fontSize: '12px' }} required />
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <input type="text" placeholder="क्वांटिटी (Qty)" value={newStockQty} onChange={(e) => setNewStockQty(e.target.value)} style={{ flex: 1, padding: '6px', fontSize: '12px' }} required />
                              <input type="text" placeholder="रेट (Rate ₹)" value={newStockRate} onChange={(e) => setNewStockRate(e.target.value)} style={{ flex: 1, padding: '6px', fontSize: '12px' }} required />
                            </div>
                            <input type="text" placeholder="विवरण / मॉडल (Description)" value={newStockDesc} onChange={(e) => setNewStockDesc(e.target.value)} style={{ padding: '6px', fontSize: '12px' }} />
                            <button type="submit" style={{ padding: '8px', backgroundColor: '#166534', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>स्टॉक में सेव करें</button>
                          </form>

                          <h4 style={{ margin: '0 0 8px 0', fontSize: '13px' }}>मौजूदा स्टॉक लिस्ट:</h4>
                          {spareStock.map((st, idx) => (
                            <div key={idx} style={{ border: '1px solid #cbd5e1', padding: '8px', borderRadius: '4px', marginBottom: '6px', background: '#fff', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                              <div>
                                <strong>{st.name}</strong> ({st.desc})<br/>
                                मात्रा: {st.qty} पीस | रेट: ₹{st.rate}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {adminSpareSubTab === 'pending' && (
                        <div>
                          {Object.keys(partsPendingByName).length === 0 ? (
                            <p style={{ color: '#64748b', fontSize: '13px' }}>कोई स्पेयर पार्ट पेंडिंग नहीं है।</p>
                          ) : (
                            Object.keys(partsPendingByName).map((partName) => (
                              <div key={partName} style={{ border: '1px solid #c4b5fd', padding: '10px', borderRadius: '6px', marginBottom: '10px', background: '#f5f3ff' }}>
                                <h4 style={{ margin: '0 0 8px 0', color: '#7c3aed' }}>⚙️ पार्ट नाम: {partName}</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {partsPendingByName[partName].map((job) => (
                                    <div key={job.jobSheetNo} onClick={() => setInspectedJob(job)} style={{ background: '#fff', padding: '8px', borderRadius: '4px', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div>
                                        <strong style={{ color: '#7c3aed' }}>{job.jobSheetNo}</strong> - {job.customerName} (मॉडल: {job.sparePartModel})
                                      </div>
                                      <span style={{ fontSize: '11px', color: '#64748b' }}>जॉब देखें →</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {adminMainTab === 'attendance' && (
                    <div>
                      <h4>📅 स्टाफ दैनिक अटेंडेंस रिकॉर्ड</h4>
                      {loginLogs.filter(l => l.role === 'staff').length === 0 ? (
                        <p style={{ color: '#64748b', fontSize: '13px' }}>कोई अटेंडेंस रिकॉर्ड नहीं मिला।</p>
                      ) : (
                        loginLogs.filter(l => l.role === 'staff').map((log, idx) => (
                          <div key={idx} style={{ border: '1px solid #cbd5e1', padding: '8px', borderRadius: '6px', marginBottom: '8px', background: '#fff', fontSize: '13px' }}>
                            <div><strong>स्टाफ नाम:</strong> {log.name || log.phone}</div>
                            <div><strong>मोबाइल नंबर:</strong> {log.phone}</div>
                            <div><strong>कुल लॉगिन:</strong> {log.loginCount || 1} बार</div>
                            <div><strong>अंतिम अटेंडेंस/लॉगिन:</strong> {log.lastLoginText || 'Today'}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {adminMainTab === 'logins' && (
                    <div>
                      <h4>🔐 यूजर लॉगिन हिस्ट्री</h4>
                      {loginLogs.length === 0 ? (
                        <p style={{ color: '#64748b', fontSize: '13px' }}>कोई लॉगिन रिकॉर्ड नहीं मिला।</p>
                      ) : (
                        loginLogs.map((log, idx) => (
                          <div key={idx} style={{ border: '1px solid #cbd5e1', padding: '8px', borderRadius: '6px', marginBottom: '8px', background: '#fff', fontSize: '13px' }}>
                            <div><strong>आईडी / नाम:</strong> {log.name || log.phone}</div>
                            <div><strong>रोल:</strong> <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{log.role}</span></div>
                            <div><strong>लॉगिन काउंट:</strong> {log.loginCount || 1} बार</div>
                            <div><strong>समय:</strong> {log.lastLoginText || 'Just now'}</div>
                          </div>
                        ))
                      )}
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