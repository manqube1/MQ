import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDUUnfmXZSLOS2FrUAnr2eSFYAWnwURRfC",
  authDomain: "mq-fsm-45ee9.firebaseapp.com",
  projectId: "mq-fsm-45ee9",
  storageBucket: "mq-fsm-45ee9.firebasestorage.app",
  messagingSenderId: "527381468184",
  appId: "1:527381468184:web:326741c5e9759c7799a36d"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).send("Webhook Ready for Manqube Groups");
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    const groupName = (body.query?.sender || body.sender || "WhatsApp Group").trim();
    const messageText = (body.query?.message || body.message || "").trim();

    if (!messageText || messageText.length < 6) {
      return res.status(200).json({ status: "ignored" });
    }

    let productType = "Split / Window AC";
    let customerName = groupName;
    let customerAddress = "Site Location";

    const lowerGroup = groupName.toLowerCase();
    if (lowerGroup.includes("cooler") || lowerGroup.includes("hri")) {
      productType = "Air Cooler (Honeywool/Iron)";
      customerName = "HRI Cooler (" + groupName + ")";
    } else if (lowerGroup.includes("knmh")) {
      productType = "Split / Window AC";
      customerName = "KNMH Hospital";
      customerAddress = "KNMH Campus, Prayagraj";
    } else if (lowerGroup.includes("work")) {
      productType = "Split / Window AC";
      customerName = "Work Details Group";
    }

    const phoneMatch = messageText.match(/[6-9]\d{9}/);
    const extractedPhone = phoneMatch ? phoneMatch[0] : "9415522032";

    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const jobSheetNo = 'WA' + day + month + hours + minutes + seconds;

    const newComplaint = {
      jobSheetNo,
      customerName,
      customerPhone: extractedPhone,
      customerAddress,
      product: "[HVAC & Refrigeration] " + productType,
      faultDetails: messageText,
      desc: `[${groupName}] ${messageText}`,
      status: 'Pending',
      pendingSubOption: '-',
      date: `${day}/${month}/${now.getFullYear()} ${hours}:${minutes}`,
      staffName: 'Not Assigned Yet',
      staffPhone: '-',
      location: 'Online Booking',
      photoURL: '',
      signatureURL: '',
      categoryType: 'HVAC & Refrigeration',
      productType,
      materials: [],
      sparePartOption: '-',
      sparePartName: '-',
      sparePartModel: '-'
    };

    await setDoc(doc(db, "jobs", jobSheetNo), newComplaint);

    return res.status(200).json({ replies: [] });
  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
