import React, { useState } from "react";
import "./JobSheet.css";

const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID || "5603316430";

const initialRows = Array.from({ length: 5 }, () => ({
  fault: "",
  workAndPart: "",
  rate: "",
}));

const initialFormData = {
  staffName: "",
  customerName: "",
  mobile: "",
  address: "",
  jobNo: "",
  billNo: "",
  amc: "NO",
  dateIn: "",
  dateOut: "",
  product: "",
  indoorModel: "",
  indoorSerial: "",
  outdoorModel: "",
  outdoorSerial: "",
  compressorModel: "",
  compressorSerial: "",
  filterClean: "",
  standType: "",
  swingFlapper: "",
  stabilizer: "",
  remote: "",
  servicing: "NO",
  suctionPressure: "",
  dischargePressure: "",
  indoorMotorModel: "",
  indoorMotorSerial: "",
  outdoorMotorModel: "",
  outdoorMotorSerial: "",
  voltageR: "",
  voltageY: "",
  voltageB: "",
  ampereR: "",
  ampereY: "",
  ampereB: "",
  roomTemp: "",
  compressorAmpere: "",
  drainSize: "",
  copperPipeSize: "",
  outdoorClean: "",
  wireSizeCore: "",
  customerSignRemark: "",
  signMobile: "",
  signDate: "",
};

export default function JobSheet() {
  const [formData, setFormData] = useState(initialFormData);
  const [rows, setRows] = useState(initialRows);
  const [sendingAlert, setSendingAlert] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRowChange = (index, field, value) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const totalAmount = rows.reduce((sum, row) => {
    const num = parseFloat(row.rate);
    return sum + (Number.isNaN(num) ? 0 : num);
  }, 0);

  const handlePrint = () => {
    window.print();
  };

  const handleSaveAndAlert = async () => {
    setStatusMessage("");
    if (!TELEGRAM_BOT_TOKEN) {
      setStatusMessage(
        "नोट: VITE_TELEGRAM_BOT_TOKEN सेट नहीं है। प्रिंट के लिए 'Print Job Sheet' दबाएं।"
      );
      return;
    }

    setSendingAlert(true);
    const workSummary = rows
      .map((r, i) => {
        const parts = [];
        if (r.fault.trim()) parts.push(`Fault: ${r.fault.trim()}`);
        if (r.workAndPart.trim()) parts.push(`Work/Part: ${r.workAndPart.trim()}`);
        if (r.rate !== "" && !Number.isNaN(parseFloat(r.rate))) {
          parts.push(`₹${parseFloat(r.rate).toFixed(2)}`);
        }
        return parts.length ? `${i + 1}. ${parts.join(" | ")}` : null;
      })
      .filter(Boolean)
      .join("\n");

    const messageText = [
      "MANQUBE STAFF JOB UPDATE",
      formData.staffName ? `Staff: ${formData.staffName}` : null,
      formData.jobNo ? `Job No: ${formData.jobNo}` : null,
      formData.customerName ? `Customer: ${formData.customerName}` : null,
      formData.mobile ? `Mobile: ${formData.mobile}` : null,
      formData.address ? `Address: ${formData.address}` : null,
      formData.product ? `Product: ${formData.product}` : null,
      `AMC: ${formData.amc} | Servicing: ${formData.servicing}`,
      formData.suctionPressure || formData.dischargePressure
        ? `Pressure: Suction ${formData.suctionPressure || "-"} / Discharge ${
            formData.dischargePressure || "-"
          }`
        : null,
      workSummary ? `Details:\n${workSummary}` : null,
      `Total Amount: ₹${totalAmount.toFixed(2)}`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: messageText,
          }),
        }
      );

      if (response.ok) {
        setStatusMessage("Telegram अलर्ट सफलतापूर्वक भेज दिया गया।");
      } else {
        setStatusMessage("Telegram अलर्ट भेजने में समस्या आई।");
      }
    } catch {
      setStatusMessage("नेटवर्क एरर: Telegram अलर्ट नहीं भेजा जा सका।");
    } finally {
      setSendingAlert(false);
    }
  };

  return (
    <div className="js-page-wrap">
      <div className="js-toolbar no-print">
        <div className="js-staff-bar">
          <label>STAFF NAME:</label>
          <input
            type="text"
            name="staffName"
            placeholder="Technicians / Staff Name"
            value={formData.staffName}
            onChange={handleFieldChange}
          />
        </div>
        <div className="js-actions">
          <button
            type="button"
            className="js-alert-btn"
            onClick={handleSaveAndAlert}
            disabled={sendingAlert}
          >
            {sendingAlert ? "Sending..." : "Send Telegram Alert"}
          </button>
          <button type="button" className="js-print-btn" onClick={handlePrint}>
            Print Job Sheet
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="js-status-banner no-print">{statusMessage}</div>
      )}

      <div className="js-sheet">
        {/* Top Title Badge */}
        <div className="js-top-banner">
          <span>JOB SHEET</span>
        </div>

        {/* Top Section: Customer Details (Left) + Meta Info (Right) */}
        <div className="js-top-grid">
          <div className="js-customer-box">
            <div className="js-field-row">
              <label>CUSTOMER NAME :-</label>
              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleFieldChange}
              />
            </div>
            <div className="js-field-row">
              <label>MOBILE :-</label>
              <input
                type="text"
                name="mobile"
                value={formData.mobile}
                onChange={handleFieldChange}
              />
            </div>
            <div className="js-field-row js-address-row">
              <label>ADDRESS :-</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleFieldChange}
              />
            </div>
          </div>

          <div className="js-meta-box">
            <div className="js-meta-row">
              <span>JOB NO.</span>
              <input
                type="text"
                name="jobNo"
                value={formData.jobNo}
                onChange={handleFieldChange}
              />
            </div>
            <div className="js-meta-row">
              <span>BILL NO.</span>
              <input
                type="text"
                name="billNo"
                value={formData.billNo}
                onChange={handleFieldChange}
              />
            </div>
            <div className="js-meta-row">
              <span>AMC</span>
              <select
                name="amc"
                value={formData.amc}
                onChange={handleFieldChange}
                className="js-select"
              >
                <option value="YES">YES</option>
                <option value="NO">NO</option>
              </select>
            </div>
            <div className="js-meta-row">
              <span>DATE IN</span>
              <input
                type="date"
                name="dateIn"
                value={formData.dateIn}
                onChange={handleFieldChange}
              />
            </div>
            <div className="js-meta-row">
              <span>DATE OUT</span>
              <input
                type="date"
                name="dateOut"
                value={formData.dateOut}
                onChange={handleFieldChange}
              />
            </div>
            <div className="js-meta-row">
              <span>PRODUCT</span>
              <input
                type="text"
                name="product"
                value={formData.product}
                onChange={handleFieldChange}
              />
            </div>
          </div>
        </div>

        {/* Unit Grid: Indoor / Outdoor / Compressor */}
        <div className="js-three-col">
          <div className="js-cell-block">
            <div className="js-line">
              <span>Model:</span>
              <input
                type="text"
                name="indoorModel"
                value={formData.indoorModel}
                onChange={handleFieldChange}
              />
            </div>
            <div className="js-block-title">INDOOR</div>
            <div className="js-line">
              <span>Serial:</span>
              <input
                type="text"
                name="indoorSerial"
                value={formData.indoorSerial}
                onChange={handleFieldChange}
              />
            </div>
          </div>

          <div className="js-cell-block">
            <div className="js-line">
              <span>Model:</span>
              <input
                type="text"
                name="outdoorModel"
                value={formData.outdoorModel}
                onChange={handleFieldChange}
              />
            </div>
            <div className="js-block-title">OUT DOOR</div>
            <div className="js-line">
              <span>Serial:</span>
              <input
                type="text"
                name="outdoorSerial"
                value={formData.outdoorSerial}
                onChange={handleFieldChange}
              />
            </div>
          </div>

          <div className="js-cell-block">
            <div className="js-line">
              <span>Model:</span>
              <input
                type="text"
                name="compressorModel"
                value={formData.compressorModel}
                onChange={handleFieldChange}
              />
            </div>
            <div className="js-block-title">COMPRESSOR</div>
            <div className="js-line">
              <span>Serial:</span>
              <input
                type="text"
                name="compressorSerial"
                value={formData.compressorSerial}
                onChange={handleFieldChange}
              />
            </div>
          </div>
        </div>

        {/* Fault / Work & Part / Rate + Total Amount */}
        <table className="js-table">
          <thead>
            <tr>
              <th className="col-fault">FAULT/PROBLEM DETAILS</th>
              <th className="col-work">WORK/ACTION TAKEN AND USE PART</th>
              <th className="col-rate">RATE (₹)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td>
                  <div className="js-num-input">
                    <span>{idx + 1}.</span>
                    <input
                      type="text"
                      value={row.fault}
                      onChange={(e) =>
                        handleRowChange(idx, "fault", e.target.value)
                      }
                    />
                  </div>
                </td>
                <td>
                  <div className="js-num-input">
                    <span>{idx + 1}.</span>
                    <input
                      type="text"
                      value={row.workAndPart}
                      onChange={(e) =>
                        handleRowChange(idx, "workAndPart", e.target.value)
                      }
                    />
                  </div>
                </td>
                <td className="js-rate-cell">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={row.rate}
                    onChange={(e) =>
                      handleRowChange(idx, "rate", e.target.value)
                    }
                  />
                </td>
              </tr>
            ))}
            <tr className="js-total-row">
              <td colSpan={2} className="js-total-label">
                TOTAL AMOUNT
              </td>
              <td className="js-total-value">₹ {totalAmount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        {/* Technical Specs & Readings */}
        <div className="js-tech-grid">
          {/* Row 1 */}
          <div className="js-tech-cell">
            <div className="js-sub-line">
              <span>FILTER CLEAN</span>
              <input
                type="text"
                name="filterClean"
                value={formData.filterClean}
                onChange={handleFieldChange}
              />
            </div>
          </div>
          <div className="js-tech-cell">
            <div className="js-sub-line">
              <span>Model:</span>
              <input
                type="text"
                name="indoorMotorModel"
                value={formData.indoorMotorModel}
                onChange={handleFieldChange}
              />
            </div>
            <div className="js-center-label">IN-DOOR MOTOR</div>
            <div className="js-sub-line">
              <span>Serial:</span>
              <input
                type="text"
                name="indoorMotorSerial"
                value={formData.indoorMotorSerial}
                onChange={handleFieldChange}
              />
            </div>
          </div>
          <div className="js-tech-cell">
            <div className="js-sub-line">
              <span>STAND TYPE</span>
              <input
                type="text"
                name="standType"
                value={formData.standType}
                onChange={handleFieldChange}
              />
            </div>
          </div>

          {/* Row 2 */}
          <div className="js-tech-cell">
            <div className="js-sub-line">
              <span>SWING/FLAPPER</span>
              <input
                type="text"
                name="swingFlapper"
                value={formData.swingFlapper}
                onChange={handleFieldChange}
              />
            </div>
          </div>
          <div className="js-tech-cell">
            <div className="js-sub-line">
              <span>Model:</span>
              <input
                type="text"
                name="outdoorMotorModel"
                value={formData.outdoorMotorModel}
                onChange={handleFieldChange}
              />
            </div>
            <div className="js-center-label">OUT-DOOR MOTOR</div>
            <div className="js-sub-line">
              <span>Serial:</span>
              <input
                type="text"
                name="outdoorMotorSerial"
                value={formData.outdoorMotorSerial}
                onChange={handleFieldChange}
              />
            </div>
          </div>
          <div className="js-tech-cell">
            <div className="js-sub-line">
              <span>STABILIZER</span>
              <input
                type="text"
                name="stabilizer"
                value={formData.stabilizer}
                onChange={handleFieldChange}
              />
            </div>
          </div>

          {/* Row 3: REMOTE + SERVICING (YES/NO) + SUCTION / DISCHARGE PRESSURE + VOLTAGE */}
          <div className="js-tech-cell js-remote-servicing">
            <div className="js-sub-line">
              <span>REMOTE:</span>
              <input
                type="text"
                name="remote"
                value={formData.remote}
                onChange={handleFieldChange}
              />
            </div>
            <div className="js-sub-line js-servicing-box">
              <span>SERVICING:</span>
              <select
                name="servicing"
                value={formData.servicing}
                onChange={handleFieldChange}
                className="js-select"
              >
                <option value="YES">YES</option>
                <option value="NO">NO</option>
              </select>
            </div>
          </div>

          <div className="js-tech-cell js-pressure-cell">
            <div className="js-sub-line">
              <span>SUCTION PRESSURE:</span>
              <input
                type="text"
                name="suctionPressure"
                value={formData.suctionPressure}
                onChange={handleFieldChange}
              />
            </div>
            <div className="js-sub-line">
              <span>DISCHARGE PRESSURE:</span>
              <input
                type="text"
                name="dischargePressure"
                value={formData.dischargePressure}
                onChange={handleFieldChange}
              />
            </div>
          </div>

          <div className="js-tech-cell">
            <div className="js-ryb-row">
              <span>R:</span>
              <input
                type="text"
                name="voltageR"
                value={formData.voltageR}
                onChange={handleFieldChange}
              />
              <span>Y:</span>
              <input
                type="text"
                name="voltageY"
                value={formData.voltageY}
                onChange={handleFieldChange}
              />
              <span>B:</span>
              <input
                type="text"
                name="voltageB"
                value={formData.voltageB}
                onChange={handleFieldChange}
              />
            </div>
            <div className="js-center-label">VOLTAGE</div>
          </div>

          {/* Row 4: AMPERE + ROOM TEMP + COMPRESSOR AMPERE */}
          <div className="js-tech-cell">
            <div className="js-ryb-row">
              <span>R:</span>
              <input
                type="text"
                name="ampereR"
                value={formData.ampereR}
                onChange={handleFieldChange}
              />
              <span>Y:</span>
              <input
                type="text"
                name="ampereY"
                value={formData.ampereY}
                onChange={handleFieldChange}
              />
              <span>B:</span>
              <input
                type="text"
                name="ampereB"
                value={formData.ampereB}
                onChange={handleFieldChange}
              />
            </div>
            <div className="js-center-label">AMPERE</div>
          </div>

          <div className="js-tech-cell">
            <div className="js-sub-line">
              <span>ROOM TEMP.:</span>
              <input
                type="text"
                name="roomTemp"
                value={formData.roomTemp}
                onChange={handleFieldChange}
              />
            </div>
          </div>

          <div className="js-tech-cell">
            <div className="js-sub-line">
              <span>COMPRESSOR AMPERE:</span>
              <input
                type="text"
                name="compressorAmpere"
                value={formData.compressorAmpere}
                onChange={handleFieldChange}
              />
            </div>
          </div>

          {/* Row 5: DRAIN + COPPER PIPE + OUTDOOR CLEAN */}
          <div className="js-tech-cell">
            <div className="js-sub-line">
              <span>DRAIN WITH SIZE:</span>
              <input
                type="text"
                name="drainSize"
                value={formData.drainSize}
                onChange={handleFieldChange}
              />
            </div>
          </div>

          <div className="js-tech-cell">
            <div className="js-sub-line">
              <span>COPPER PIPE SIZE:</span>
              <input
                type="text"
                name="copperPipeSize"
                value={formData.copperPipeSize}
                onChange={handleFieldChange}
              />
            </div>
          </div>

          <div className="js-tech-cell">
            <div className="js-sub-line">
              <span>OUTDOOR CLEAN:</span>
              <input
                type="text"
                name="outdoorClean"
                value={formData.outdoorClean}
                onChange={handleFieldChange}
              />
            </div>
          </div>

          {/* Row 6: WIRE SIZE & CORE + CUSTOMER SIGN & REMARK */}
          <div className="js-tech-cell">
            <div className="js-sub-line">
              <span>WIRE SIZE &amp; CORE:</span>
              <input
                type="text"
                name="wireSizeCore"
                value={formData.wireSizeCore}
                onChange={handleFieldChange}
              />
            </div>
          </div>

          <div className="js-tech-cell js-sign-cell">
            <div className="js-sign-title">CUSTOMER SIGN &amp; REMARK</div>
            <textarea
              name="customerSignRemark"
              value={formData.customerSignRemark}
              onChange={handleFieldChange}
              className="js-sign-remark"
            />
            <div className="js-sign-footer">
              <div>
                <span>MOBILE:</span>
                <input
                  type="text"
                  name="signMobile"
                  value={formData.signMobile}
                  onChange={handleFieldChange}
                />
              </div>
              <div>
                <span>DATE:</span>
                <input
                  type="date"
                  name="signDate"
                  value={formData.signDate}
                  onChange={handleFieldChange}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Small Company Footer at the Very Bottom */}
        <div className="js-company-footer-small">
          MANQUBE PRIVATE LIMITED &nbsp;|&nbsp; Address: 212 Naini, Prayagraj
          &nbsp;|&nbsp; Mobile No.: 9415522032, 9335172129
        </div>
      </div>
    </div>
  );
}
