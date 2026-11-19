import React, { useState } from 'react';

export default function CoolerJobSheet({ onSave }) {
  const [formData, setFormData] = useState({
    jobSheetNo: '',
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    siteAddress: '',
    contactPerson: '',
    workTypes: [],
    specs: [
      { type: [], capacity: '', brand: '', serial: '', qty: '' },
      { type: [], capacity: '', brand: '', serial: '', qty: '' },
    ],
    checklist: {
      fanMotor: [],
      waterPump: [],
      swingBlade: [],
      coolingPadType: [],
      coolingPadStatus: [],
      tankPlumbing: [],
      electricalWiring: [],
      bodyPaint: [],
    },
    parts: [
      { desc: 'कूलर जनरल सर्विस एवं केमिकल/पानी से सफाई', qty: '', rate: '' },
      { desc: '', qty: '', rate: '' },
      { desc: '', qty: '', rate: '' },
      { desc: '', qty: '', rate: '' },
      { desc: '', qty: '', rate: '' },
    ],
    remarks: '',
    technicianName: '',
  });

  const toggleCheckbox = (group, value) => {
    setFormData((prev) => {
      const list = prev.checklist[group];
      const updated = list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value];
      return { ...prev, checklist: { ...prev.checklist, [group]: updated } };
    });
  };

  const toggleWorkType = (value) => {
    setFormData((prev) => {
      const updated = prev.workTypes.includes(value)
        ? prev.workTypes.filter((item) => item !== value)
        : [...prev.workTypes, value];
      return { ...prev, workTypes: updated };
    });
  };

  const handlePartChange = (index, field, value) => {
    const updatedParts = [...formData.parts];
    updatedParts[index][field] = value;
    setFormData({ ...formData, parts: updatedParts });
  };

  const totalAmount = formData.parts.reduce((sum, item) => {
    const q = parseFloat(item.qty) || 0;
    const r = parseFloat(item.rate) || 0;
    return sum + q * r;
  }, 0);

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white text-black border border-gray-300 text-xs print:p-2 print:border-none">
      {/* Header */}
      <div className="text-center border-b-2 border-black pb-2 mb-3">
        <h1 className="text-base font-bold uppercase">
          एयर कूलर सर्विस एवं रिपेयर जॉब शीट (AIR COOLER JOB SHEET)
        </h1>
        <div className="flex justify-between mt-2">
          <div>
            <strong>जॉब शीट नं.:</strong>{' '}
            <input
              type="text"
              className="border-b border-black outline-none px-1 w-32"
              value={formData.jobSheetNo}
              onChange={(e) => setFormData({ ...formData, jobSheetNo: e.target.value })}
            />
          </div>
          <div>
            <strong>दिनांक:</strong>{' '}
            <input
              type="date"
              className="border-b border-black outline-none px-1"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* 1. Customer & Site Details */}
      <div className="mb-3">
        <h2 className="font-bold bg-gray-100 px-2 py-1 border border-gray-400">
          1. ग्राहक एवं साइट का विवरण (Customer & Site Details)
        </h2>
        <div className="grid grid-cols-1 gap-1.5 p-2 border border-t-0 border-gray-400">
          <div className="flex gap-2">
            <span className="font-semibold w-48">ग्राहक / संस्था का नाम:</span>
            <input
              type="text"
              className="flex-1 border-b border-gray-400 outline-none"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <span className="font-semibold w-48">लोकेशन / साइट का पता:</span>
            <input
              type="text"
              className="flex-1 border-b border-gray-400 outline-none"
              value={formData.siteAddress}
              onChange={(e) => setFormData({ ...formData, siteAddress: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <span className="font-semibold w-48">संपर्क व्यक्ति एवं मोबाइल नं.:</span>
            <input
              type="text"
              className="flex-1 border-b border-gray-400 outline-none"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap gap-3 items-center mt-1">
            <span className="font-semibold">कार्य का प्रकार:</span>
            {[
              'AMC (वार्षिक रखरखाव)',
              'ब्रेकडाउन / रिपेयर',
              'Installation (इंस्टॉलेशन)',
              'Un-installation (अन-इंस्टॉलेशन)',
              'बॉडी रिपेयर एवं पेंटिंग',
            ].map((type) => (
              <label key={type} className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.workTypes.includes(type)}
                  onChange={() => toggleWorkType(type)}
                />
                <span>{type}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Cooler Specifications */}
      <div className="mb-3">
        <h2 className="font-bold bg-gray-100 px-2 py-1 border border-gray-400">
          2. कूलर का विवरण (Cooler Specifications)
        </h2>
        <table className="w-full border-collapse border border-gray-400 text-left">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-400 p-1 w-10">क्र. सं.</th>
              <th className="border border-gray-400 p-1">कूलर टाइप (Body Type)</th>
              <th className="border border-gray-400 p-1">क्षमता / साइज़</th>
              <th className="border border-gray-400 p-1">ब्रांड / मॉडल</th>
              <th className="border border-gray-400 p-1">सीरियल / टैग नं.</th>
              <th className="border border-gray-400 p-1 w-16">कुल संख्या</th>
            </tr>
          </thead>
          <tbody>
            {[
              { idx: 0, opts: ['फाइबर / प्लास्टिक', 'जी.आई. / लोहा (Metal)'] },
              { idx: 1, opts: ['डक्ट कूलर', 'डेजर्ट कूलर', 'टावर कूलर'] },
            ].map((row) => (
              <tr key={row.idx}>
                <td className="border border-gray-400 p-1 text-center">{row.idx + 1}.</td>
                <td className="border border-gray-400 p-1">
                  <div className="flex flex-wrap gap-2">
                    {row.opts.map((opt) => (
                      <label key={opt} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={formData.specs[row.idx].type.includes(opt)}
                          onChange={() => {
                            const updated = [...formData.specs];
                            const t = updated[row.idx].type;
                            updated[row.idx].type = t.includes(opt)
                              ? t.filter((x) => x !== opt)
                              : [...t, opt];
                            setFormData({ ...formData, specs: updated });
                          }}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </td>
                {['capacity', 'brand', 'serial', 'qty'].map((field) => (
                  <td key={field} className="border border-gray-400 p-1">
                    <input
                      type="text"
                      className="w-full outline-none"
                      value={formData.specs[row.idx][field]}
                      onChange={(e) => {
                        const updated = [...formData.specs];
                        updated[row.idx][field] = e.target.value;
                        setFormData({ ...formData, specs: updated });
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 3. Inspection Checklist */}
      <div className="mb-3">
        <h2 className="font-bold bg-gray-100 px-2 py-1 border border-gray-400">
          3. चेकलिस्ट एवं निरीक्षण (Inspection & Service Checklist)
        </h2>
        <div className="p-2 border border-t-0 border-gray-400 space-y-1.5">
          {[
            { label: 'फैन मोटर (Fan Motor):', key: 'fanMotor', opts: ['सही', 'जाम / बेयरिंग खराब', 'वाइंडिंग जली हुई', 'कैपेसिटर खराब'] },
            { label: 'वाटर पंप (Submersible Pump):', key: 'waterPump', opts: ['सही', 'पानी नहीं उठा रहा', 'बदलना आवश्यक'] },
            { label: 'स्विंग मोटर एवं ब्लेड:', key: 'swingBlade', opts: ['सही', 'स्विंग खराब', 'फैन ब्लेड टूटा / असंतुलित'] },
            { label: 'वाटर टैंक एवं प्लंबिंग:', key: 'tankPlumbing', opts: ['लीकेज है', 'फ्लोट वाल्व खराब', 'ड्रेन प्लग जाम', 'वाटर डिस्ट्रीब्यूशन पाइप जाम'] },
            { label: 'इलेक्ट्रिकल एवं वायरिंग:', key: 'electricalWiring', opts: ['रोटरी स्विच खराब', 'वायरिंग कटी / जली', 'प्लग टॉप खराब', 'अर्थिंग चेक की गई'] },
            { label: 'बॉडी एवं पेंट (Body & Paint):', key: 'bodyPaint', opts: ['जंग (Rusting) लगी है', 'टैंक में छेद / वेल्डिंग की जरूरत', 'प्राइमर एवं पेंटिंग आवश्यक'] },
          ].map((item) => (
            <div key={item.key} className="flex flex-wrap gap-3 items-center">
              <span className="font-semibold w-48">{item.label}</span>
              {item.opts.map((opt) => (
                <label key={opt} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.checklist[item.key].includes(opt)}
                    onChange={() => toggleCheckbox(item.key, opt)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          ))}
          <div className="flex flex-wrap gap-3 items-center">
            <span className="font-semibold w-48">कूलिंग पैड (Cooling Pads):</span>
            {['हनीकॉम्ब', 'वुड वूल (घास)'].map((opt) => (
              <label key={opt} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={formData.checklist.coolingPadType.includes(opt)}
                  onChange={() => toggleCheckbox('coolingPadType', opt)}
                />
                <span>{opt}</span>
              </label>
            ))}
            <span className="font-semibold ml-2">स्थिति:</span>
            {['साफ', 'बदलने योग्य'].map((opt) => (
              <label key={opt} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={formData.checklist.coolingPadStatus.includes(opt)}
                  onChange={() => toggleCheckbox('coolingPadStatus', opt)}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Work Done & Spare Parts Used */}
      <div className="mb-3">
        <h2 className="font-bold bg-gray-100 px-2 py-1 border border-gray-400">
          4. किए गए कार्य एवं बदले गए पार्ट्स (Work Done & Spare Parts Used)
        </h2>
        <table className="w-full border-collapse border border-gray-400 text-left">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-400 p-1 w-10">क्र. सं.</th>
              <th className="border border-gray-400 p-1">पार्ट / कार्य का विवरण (Description)</th>
              <th className="border border-gray-400 p-1 w-16">मात्रा (Qty)</th>
              <th className="border border-gray-400 p-1 w-20">दर (Rate ₹)</th>
              <th className="border border-gray-400 p-1 w-24">कुल राशि (₹)</th>
            </tr>
          </thead>
          <tbody>
            {formData.parts.map((part, i) => {
              const rowAmt = (parseFloat(part.qty) || 0) * (parseFloat(part.rate) || 0);
              return (
                <tr key={i}>
                  <td className="border border-gray-400 p-1 text-center">{i + 1}.</td>
                  <td className="border border-gray-400 p-1">
                    <input
                      type="text"
                      className="w-full outline-none"
                      value={part.desc}
                      onChange={(e) => handlePartChange(i, 'desc', e.target.value)}
                    />
                  </td>
                  <td className="border border-gray-400 p-1">
                    <input
                      type="number"
                      className="w-full outline-none text-center"
                      value={part.qty}
                      onChange={(e) => handlePartChange(i, 'qty', e.target.value)}
                    />
                  </td>
                  <td className="border border-gray-400 p-1">
                    <input
                      type="number"
                      className="w-full outline-none text-right"
                      value={part.rate}
                      onChange={(e) => handlePartChange(i, 'rate', e.target.value)}
                    />
                  </td>
                  <td className="border border-gray-400 p-1 text-right font-medium">
                    {rowAmt > 0 ? rowAmt.toFixed(2) : ''}
                  </td>
                </tr>
              );
            })}
            <tr className="font-bold bg-gray-50">
              <td colSpan={4} className="border border-gray-400 p-1 text-right">
                कुल राशि (Total Amount):
              </td>
              <td className="border border-gray-400 p-1 text-right">
                ₹ {totalAmount.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 5. Sign-Off & Footer */}
      <div className="border border-gray-400 p-2">
        <div className="flex gap-2 mb-4">
          <span className="font-semibold">ग्राहक की टिप्पणी (Remarks):</span>
          <input
            type="text"
            className="flex-1 border-b border-gray-400 outline-none"
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
          />
        </div>
        <div className="flex justify-between pt-4">
          <div>
            <input
              type="text"
              placeholder="टेक्नीशियन का नाम"
              className="border-b border-gray-400 outline-none block mb-1"
              value={formData.technicianName}
              onChange={(e) => setFormData({ ...formData, technicianName: e.target.value })}
            />
            <span className="font-semibold">टेक्नीशियन का नाम एवं हस्ताक्षर</span>
          </div>
          <div className="text-right">
            <div className="h-5 border-b border-gray-400 w-48 mb-1"></div>
            <span className="font-semibold">ग्राहक / साइट इंचार्ज के हस्ताक्षर एवं मुहर</span>
          </div>
        </div>
        <div className="text-center font-bold mt-3 pt-1 border-t border-gray-300">
          Manqube Private Limited
        </div>
      </div>

      {/* Action Buttons (Hidden on Print) */}
      <div className="flex justify-end gap-3 mt-4 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-1.5 bg-gray-700 text-white rounded"
        >
          Print / Save PDF
        </button>
        <button
          type="button"
          onClick={() => onSave && onSave({ ...formData, totalAmount })}
          className="px-4 py-1.5 bg-blue-600 text-white rounded"
        >
          Save Job Sheet
        </button>
      </div>
    </div>
  );
}