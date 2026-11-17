import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  serverTimestamp, 
  onSnapshot, 
  addDoc
} from 'firebase/firestore';

// --- (यहाँ अपनी Firebase कॉन्फिग डालें) ---
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function ManqubeFSMApp() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('staff'); // 'admin', 'staff', 'customer'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [activeTab, setActiveTab] = useState('form');

  // लॉगिन स्टेट चेक और ट्रैकिंग
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await trackUserLogin(currentUser.phoneNumber || phone || currentUser.email, name || "Manqube User", role);
      }
    });
    return () => unsubscribe();
  }, []);

  const trackUserLogin = async (userPhoneId, userName, userRole) => {
    try {
      const userRef = doc(db, "login_logs", userPhoneId);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        await updateDoc(userRef, {
          loginCount: increment(1),
          lastLogin: serverTimestamp()
        });
      } else {
        await setDoc(userRef, {
          phone: userPhoneId,
          name: userName,
          role: userRole,
          loginCount: 1,
          lastLogin: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Login tracking error:", err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("लॉगिन सफल रहा!");
    } catch (error) {
      alert("लॉगिन फेल: " + error.message);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-6 rounded-xl shadow-md w-full max-w-sm space-y-4">
          <div className="text-center flex flex-col items-center">
            {/* कंपनी लोगो */}
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-2 shadow-inner border border-blue-200 overflow-hidden">
              <span className="text-blue-700 font-extrabold text-lg">MQ</span>
            </div>
            <h2 className="text-2xl font-bold text-blue-700">MANQUBE</h2>
            <p className="text-xs text-gray-500">We Build. Your Trust.</p>
          </div>
          <input
            type="email"
            placeholder="ईमेल आईडी"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border rounded-lg text-sm"
            required
          />
          <input
            type="password"
            placeholder="पासवर्ड"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border rounded-lg text-sm"
            required
          />
          <input
            type="text"
            placeholder="आपका नाम"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 border rounded-lg text-sm"
            required
          />
          <input
            type="tel"
            placeholder="मोबाइल नंबर"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full p-3 border rounded-lg text-sm"
            required
          />
          <select 
            value={role} 
            onChange={(e) => setRole(e.target.value)}
            className="w-full p-3 border rounded-lg text-sm bg-white"
          >
            <option value="staff">स्टाफ (Staff)</option>
            <option value="admin">एडमिन (Admin)</option>
            <option value="customer">कस्टमर (Customer)</option>
          </select>
          <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold text-sm hover:bg-blue-700">
            लॉगिन करें
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* हेडर विथ लोगो एंड टैगलाइन */}
      <header className="bg-blue-700 text-white p-3 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-white w-10 h-10 rounded-full flex items-center justify-center p-1 shadow overflow-hidden border border-blue-300">
            <span className="text-blue-700 font-extrabold text-xs">MQ</span>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-wide leading-tight">MANQUBE</h1>
            <p className="text-[10px] text-blue-200 tracking-wider">We Build. Your Trust.</p>
          </div>
        </div>

        <div className="flex gap-1.5 items-center">
          <button 
            onClick={() => setActiveTab('form')} 
            className="px-2.5 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-800"
          >
            नया जॉब
          </button>
          
          {role === 'admin' && (
            <button 
              onClick={() => setActiveTab('admin')} 
              className="px-2.5 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-800"
            >
              एडमिन पैनल
            </button>
          )}

          <button 
            onClick={handleLogout} 
            className="bg-red-500 hover:bg-red-600 text-white px-2.5 py-1 rounded text-xs font-medium"
          >
            लॉग आउट
          </button>
        </div>
      </header>

      <main className="p-4 max-w-xl mx-auto mt-2">
        {activeTab === 'form' ? <JobSheetSlideForm /> : <AdminLoginAnalytics />}
      </main>
    </div>
  );
}

// --- 1. स्टेप-बाय-स्टेप स्लाइड फॉर्म (Wizard UI with Spare Parts) ---
function JobSheetSlideForm() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    address: '',
    problemDescription: '',
    sparePartType: 'Used Part', // 'Pending Part' या 'Used Part'
    partName: '',
    modelNumber: '',
    jobStatus: 'Complete',
    customerSignature: ''
  });

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmitJob = async () => {
    try {
      await addDoc(collection(getFirestore(), "jobs"), {
        ...formData,
        createdAt: serverTimestamp()
      });
      alert("जॉब शीट सफलतापूर्वक सबमिट हो गई है!");
      setStep(1);
      setFormData({
        customerName: '',
        customerPhone: '',
        address: '',
        problemDescription: '',
        sparePartType: 'Used Part',
        partName: '',
        modelNumber: '',
        jobStatus: 'Complete',
        customerSignature: ''
      });
    } catch (error) {
      alert("त्रुटि: " + error.message);
    }
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-md space-y-4">
      <div className="w-full bg-gray-200 h-2 rounded-full mb-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
          style={{ width: step === 1 ? '14%' : step === 2 ? '28%' : step === 3 ? '42%' : step === 4 ? '57%' : step === 5 ? '71%' : step === 6 ? '85%' : '100%' }}
        ></div>
      </div>
      <h2 className="text-sm font-bold text-gray-700">स्टेप {step} / 7</h2>

      {/* स्टेप 1: कस्टमर का नाम */}
      {step === 1 && (
        <div className="space-y-3">
          <label className="text-xs font-semibold text-gray-600 block">कस्टमर का नाम:</label>
          <input type="text" name="customerName" placeholder="नाम दर्ज करें" value={formData.customerName} onChange={handleChange} className="w-full p-3 border rounded-lg text-sm" />
          <button onClick={nextStep} className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold text-sm">आगे बढ़ें →</button>
        </div>
      )}

      {/* स्टेप 2: मोबाइल नंबर */}
      {step === 2 && (
        <div className="space-y-3">
          <label className="text-xs font-semibold text-gray-600 block">मोबाइल नंबर:</label>
          <input type="tel" name="customerPhone" placeholder="मोबाइल नंबर दर्ज करें" value={formData.customerPhone} onChange={handleChange} className="w-full p-3 border rounded-lg text-sm" />
          <div className="flex gap-2">
            <button onClick={prevStep} className="w-1/2 bg-gray-200 p-3 rounded-lg text-sm">← पीछे</button>
            <button onClick={nextStep} className="w-1/2 bg-blue-600 text-white p-3 rounded-lg text-sm font-bold">आगे →</button>
          </div>
        </div>
      )}

      {/* स्टेप 3: पता (Address) */}
      {step === 3 && (
        <div className="space-y-3">
          <label className="text-xs font-semibold text-gray-600 block">पता (Address):</label>
          <input type="text" name="address" placeholder="साइट का पूरा पता" value={formData.address} onChange={handleChange} className="w-full p-3 border rounded-lg text-sm" />
          <div className="flex gap-2">
            <button onClick={prevStep} className="w-1/2 bg-gray-200 p-3 rounded-lg text-sm">← पीछे</button>
            <button onClick={nextStep} className="w-1/2 bg-blue-600 text-white p-3 rounded-lg text-sm font-bold">आगे →</button>
          </div>
        </div>
      )}

      {/* स्टेप 4: प्रॉब्लम क्या थी */}
      {step === 4 && (
        <div className="space-y-3">
          <label className="text-xs font-semibold text-gray-600 block">प्रॉब्लम क्या थी (Problem Description):</label>
          <textarea name="problemDescription" placeholder="समस्या का विवरण दर्ज करें..." rows="3" value={formData.problemDescription} onChange={handleChange} className="w-full p-3 border rounded-lg text-sm" />
          <div className="flex gap-2">
            <button onClick={prevStep} className="w-1/2 bg-gray-200 p-3 rounded-lg text-sm">← पीछे</button>
            <button onClick={nextStep} className="w-1/2 bg-blue-600 text-white p-3 rounded-lg text-sm font-bold">आगे →</button>
          </div>
        </div>
      )}

      {/* स्टेप 5: स्पेयर पार्ट ऑप्शन (Pending Part या Used Part) */}
      {step === 5 && (
        <div className="space-y-3">
          <label className="text-xs font-semibold text-gray-600 block">स्पेयर पार्ट का चयन करें:</label>
          <select 
            name="sparePartType" 
            value={formData.sparePartType} 
            onChange={handleChange} 
            className="w-full p-3 border rounded-lg text-sm bg-white"
          >
            <option value="Used Part">Used Part (इस्तेमाल किया गया पार्ट)</option>
            <option value="Pending Part">Pending Part (पेंडिंग पार्ट)</option>
          </select>

          <input 
            type="text" 
            name="partName" 
            placeholder="पार्ट का नाम (Part Name)" 
            value={formData.partName} 
            onChange={handleChange} 
            className="w-full p-3 border rounded-lg text-sm" 
          />
          <input 
            type="text" 
            name="modelNumber" 
            placeholder="मॉडल नंबर (Model Number)" 
            value={formData.modelNumber} 
            onChange={handleChange} 
            className="w-full p-3 border rounded-lg text-sm" 
          />

          <div className="flex gap-2">
            <button onClick={prevStep} className="w-1/2 bg-gray-200 p-3 rounded-lg text-sm">← पीछे</button>
            <button onClick={nextStep} className="w-1/2 bg-blue-600 text-white p-3 rounded-lg text-sm font-bold">आगे →</button>
          </div>
        </div>
      )}

      {/* स्टेप 6: जॉब स्टेटस (Complete, Pending, Repeat Complaint, OK) */}
      {step === 6 && (
        <div className="space-y-3">
          <label className="text-xs font-semibold text-gray-600 block">जॉब स्टेटस चुनें:</label>
          <select 
            name="jobStatus" 
            value={formData.jobStatus} 
            onChange={handleChange} 
            className="w-full p-3 border rounded-lg text-sm bg-white"
          >
            <option value="Complete">Complete (काम पूरा हो गया)</option>
            <option value="Pending">Pending (पेंडिंग)</option>
            <option value="Repeat Complaint">Repeat Complaint (रिपीट कंप्लेंट)</option>
            <option value="OK">OK (ओके)</option>
          </select>

          <div className="flex gap-2">
            <button onClick={prevStep} className="w-1/2 bg-gray-200 p-3 rounded-lg text-sm">← पीछे</button>
            <button onClick={nextStep} className="w-1/2 bg-blue-600 text-white p-3 rounded-lg text-sm font-bold">आगे →</button>
          </div>
        </div>
      )}

      {/* स्टेप 7: कस्टमर सिग्नेचर और जॉब शीट सबमिट */}
      {step === 7 && (
        <div className="space-y-3">
          <label className="text-xs font-semibold text-gray-600 block">कस्टमर सिग्नेचर / नाम:</label>
          <input type="text" name="customerSignature" placeholder="कस्टमर का डिजिटल हस्ताक्षर (नाम)" value={formData.customerSignature} onChange={handleChange} className="w-full p-3 border rounded-lg text-sm" />
          <div className="flex gap-2">
            <button onClick={prevStep} className="w-1/2 bg-gray-200 p-3 rounded-lg text-sm">← पीछे</button>
            <button onClick={handleSubmitJob} className="w-1/2 bg-green-600 text-white p-3 rounded-lg font-bold text-sm hover:bg-green-700">जॉब शीट सबमिट करें ✔️</button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- 2. एडमिन पैनल विथ 'लॉगिन' एनालिटिक्स ---
function AdminLoginAnalytics() {
  const [subTab, setSubTab] = useState('all'); // 'all', 'customer', 'office', 'staff'
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const db = getFirestore();
    const unsubscribe = onSnapshot(collection(db, "login_logs"), (snapshot) => {
      const allLogs = [];
      snapshot.forEach((doc) => {
        allLogs.push(doc.data());
      });
      setLogs(allLogs);
    });
    return () => unsubscribe();
  }, []);

  // फ़िल्टरिंग रोल के आधार पर
  const filteredLogs = logs.filter(item => {
    if (subTab === 'customer') return item.role === 'customer';
    if (subTab === 'office' || item.role === 'admin') return item.role === 'admin' || subTab === 'office';
    if (subTab === 'staff') return item.role === 'staff';
    return true;
  });

  return (
    <div className="space-y-4 bg-white p-4 rounded-xl shadow-md">
      <h2 className="text-lg font-bold text-blue-800 border-b pb-2">एडमिन पैनल - लॉगिन एनालिटिक्स</h2>
      
     {/* लॉगिन कैटेगरी टैब्स */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button onClick={() => setSubTab('all')} className="px-3 py-1.5 rounded text-xs font-medium bg-blue-900 text-white">सभी</button>
        <button onClick={() => setSubTab('customer')} className="px-3 py-1.5 rounded text-xs font-medium bg-gray-200">कस्टमर (Customer)</button>
        <button onClick={() => setSubTab('office')} className="px-3 py-1.5 rounded text-xs font-medium bg-gray-200">ऑफिस (Office)</button>
        <button onClick={() => setSubTab('staff')} className="px-3 py-1.5 rounded text-xs font-medium bg-gray-200">स्टाफ (Staff)</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 text-xs text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">नाम</th>
              <th className="border p-2">रोल (Role)</th>
              <th className="border p-2">मोबाइल नंबर / आईडी</th>
              <th className="border p-2 text-center">कितनी बार लॉगिन किया</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((item, idx) => (
              <tr key={idx}>
                <td className="border p-2">{item.name || 'N/A'}</td>
                <td className="border p-2 capitalize font-semibold text-blue-600">{item.role}</td>
                <td className="border p-2 font-mono">{item.phone}</td>
                <td className="border p-2 text-center font-bold text-green-700">{item.loginCount} बार</td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center p-4 text-gray-500">कोई लॉगिन रिकॉर्ड नहीं मिला।</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}