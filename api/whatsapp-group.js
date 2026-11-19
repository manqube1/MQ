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
    const formattedDate = `${day}/${month}/${now.getFullYear()} ${hours}:${minutes}`;

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/mq-fsm-45ee9/databases/(default)/documents/jobs?documentId=${jobSheetNo}`;

    const firestorePayload = {
      fields: {
        jobSheetNo: { stringValue: jobSheetNo },
        customerName: { stringValue: customerName },
        customerPhone: { stringValue: extractedPhone },
        customerAddress: { stringValue: customerAddress },
        product: { stringValue: "[HVAC & Refrigeration] " + productType },
        faultDetails: { stringValue: messageText },
        desc: { stringValue: `[${groupName}] ${messageText}` },
        status: { stringValue: "Pending" },
        pendingSubOption: { stringValue: "-" },
        date: { stringValue: formattedDate },
        staffName: { stringValue: "Not Assigned Yet" },
        staffPhone: { stringValue: "-" },
        location: { stringValue: "Online Booking" },
        photoURL: { stringValue: "" },
        signatureURL: { stringValue: "" },
        categoryType: { stringValue: "HVAC & Refrigeration" },
        productType: { stringValue: productType },
        materials: { arrayValue: { values: [] } },
        sparePartOption: { stringValue: "-" },
        sparePartName: { stringValue: "-" },
        sparePartModel: { stringValue: "-" }
      }
    };

    const fbRes = await fetch(firestoreUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firestorePayload)
    });

    if (!fbRes.ok) {
      const errText = await fbRes.text();
      throw new Error("Firestore API Error: " + errText);
    }

    return res.status(200).json({ replies: [] });
  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
