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
          <div className="text-center">
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
            className="w-full p-3 border rounded-lg text-sm"
          >
            <option value="staff">स्टाफ (Staff)</option>
            <option value="admin">एडमिन (Admin)</option>
            <option value="customer">कस्टमर (Customer)</option>
          </select>
          <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold text-sm">
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
          <div className="bg-white w-10 h-10 rounded-full flex items-center justify-center p-1 shadow">
            <span className="text-blue-700 font-bold text-xs">MQ</span>
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

// --- 1. स्टेप-बाय-स्टेप स्लाइड फॉर्म (Wizard UI with Plumbing) ---
function JobSheetSlideForm() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    serviceCategory: 'AC Repair',
    problemDescription: '',
    address: ''
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
      alert("जॉब शीट सफलतापूर्वक सेव हो गई है!");
      setStep(1);
      setFormData({ customerName: '', customerPhone: '', serviceCategory: 'AC Repair', problemDescription: '', address: '' });
    } catch (error) {
      alert("त्रुटि: " + error.message);
    }
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-md space-y-4">
      <div className="w-full bg-gray-200 h-2 rounded-full mb-2">
        <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: step === 1 ? '25%' : step === 2 ? '50%' : step === 3 ? '75%' : '100%' }}></div>
      </div>
      <h2 className="text-sm font-bold text-gray-700">स्टेप {step} / 4</h2>

      {step === 1 && (
        <div className="space-y-3">
          <input type="text" name="customerName" placeholder="कस्टमर का नाम" value={formData.customerName} onChange={handleChange} className="w-full p-3 border rounded-lg text-sm" />
          <input type="tel" name="customerPhone" placeholder="कस्टमर मोबाइल नंबर" value={formData.customerPhone} onChange={handleChange} className="w-full p-3 border rounded-lg text-sm" />
          <button onClick={nextStep} className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold text-sm">आगे बढ़ें →</button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <label className="text-xs font-semibold text-gray-600 block">सर्विस कैटेगरी चुनें:</label>
          <select name="serviceCategory" value={formData.serviceCategory} onChange={handleChange} className="w-full p-3 border rounded-lg text-sm">
            <option value="AC Repair">AC सर्विस / रिपेयर</option>
            <option value="Electrical">इलेक्ट्रिकल वर्क</option>
            <option value="Plumbing">प्लंबिंग वर्क (Plumbing Work)</option>
            <option value="Civil">सिविल मेंटेनेंस</option>
          </select>
          <div className="flex gap-2">
            <button onClick={prevStep} className="w-1/2 bg-gray-200 p-3 rounded-lg text-sm">← पीछे</button>
            <button onClick={nextStep} className="w-1/2 bg-blue-600 text-white p-3 rounded-lg text-sm font-bold">आगे →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <textarea name="problemDescription" placeholder="समस्या का विवरण (क्या खराबी है?)" rows="3" value={formData.problemDescription} onChange={handleChange} className="w-full p-3 border rounded-lg text-sm" />
          <div className="flex gap-2">
            <button onClick={prevStep} className="w-1/2 bg-gray-200 p-3 rounded-lg text-sm">← पीछे</button>
            <button onClick={nextStep} className="w-1/2 bg-blue-600 text-white p-3 rounded-lg text-sm font-bold">आगे →</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <input type="text" name="address" placeholder="साइट का पूरा पता (Address)" value={formData.address} onChange={handleChange} className="w-full p-3 border rounded-lg text-sm" />
          <div className="flex gap-2">
            <button onClick={prevStep} className="w-1/2 bg-gray-200 p-3 rounded-lg text-sm">← पीछे</button>
            <button onClick={handleSubmitJob} className="w-1/2 bg-green-600 text-white p-3 rounded-lg font-bold text-sm">सबमिट करें ✔️</button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- 2. एडमिन पैनल लॉगिन एनालिटिक्स ---
function AdminLoginAnalytics() {
  const [staffLogs, setStaffLogs] = useState([]);
  const [customerLogs, setCustomerLogs] = useState([]);

  useEffect(() => {
    const db = getFirestore();
    const unsubscribe = onSnapshot(collection(db, "login_logs"), (snapshot) => {
      const staff = [];
      const customers = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.role === "staff" || data.role === "admin") {
          staff.push(data);
        } else {
          customers.push(data);
        }
      });
      setStaffLogs(staff);
      setCustomerLogs(customers);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6 bg-white p-4 rounded-xl shadow-md">
      <h2 className="text-lg font-bold text-blue-800 border-b pb-2">एडमिन लॉगिन एनालिटिक्स पैनल</h2>
      
      <div>
        <h3 className="font-bold text-sm text-gray-700 mb-2">स्टाफ और एडमिन लॉगिन रिकॉर्ड</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 text-xs text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">नाम</th>
                <th className="border p-2">मोबाइल / आईडी</th>
                <th className="border p-2 text-center">लॉगिन बार</th>
              </tr>
            </thead>
            <tbody>
              {staffLogs.map((s, idx) => (
                <tr key={idx}>
                  <td className="border p-2">{s.name}</td>
                  <td className="border p-2 font-mono">{s.phone}</td>
                  <td className="border p-2 text-center font-bold text-blue-600">{s.loginCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="font-bold text-sm text-gray-700 mb-2">कस्टमर लॉगिन रिकॉर्ड</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 text-xs text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">नाम</th>
                <th className="border p-2">मोबाइल नंबर</th>
                <th className="border p-2 text-center">लॉगिन बार</th>
              </tr>
            </thead>
            <tbody>
              {customerLogs.map((c, idx) => (
                <tr key={idx}>
                  <td className="border p-2">{c.name}</td>
                  <td className="border p-2 font-mono">{c.phone}</td>
                  <td className="border p-2 text-center font-bold text-green-600">{c.loginCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}