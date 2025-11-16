import React, { useState } from "react";

export default function SymptomChecklist() {
  const [responses, setResponses] = useState({
    cough_2weeks: "",
    cough_blood: "",
    chest_pain: "",
    night_sweats: "",
    fever: "",
    weight_loss: "",
    fatigue: "",
    loss_appetite: "",
    tb_exposure: "",
    high_risk_group: "",
  });

  const [result, setResult] = useState(null);

  // handle response change
  function handleChange(e) {
    const { name, value } = e.target;
    setResponses((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  // calculate risk score
  function handleSubmit(e) {
    e.preventDefault();
    let score = 0;

    if (responses.cough_2weeks === "yes") score += 3;
    if (responses.cough_blood === "yes") score += 3;
    if (responses.chest_pain === "yes") score += 2;
    if (responses.night_sweats === "yes") score += 2;
    if (responses.fever === "yes") score += 2;
    if (responses.weight_loss === "yes") score += 2;
    if (responses.fatigue === "yes") score += 1;
    if (responses.loss_appetite === "yes") score += 1;
    if (responses.tb_exposure === "yes") score += 3;
    if (responses.high_risk_group === "yes") score += 2;

    if (score >= 8) {
      setResult("High Risk: Please seek urgent medical attention and TB testing.");
    } else if (score >= 5) {
      setResult("Moderate Risk: Further screening (sputum test / chest X-ray) recommended.");
    } else {
      setResult("Low Risk: Monitor your symptoms.");
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 py-4 md:py-8 px-4">
      <div className="w-full max-w-2xl p-4 md:p-6 bg-white rounded-2xl shadow-md">
        <h2 className="text-xl md:text-2xl font-semibold text-center text-green-600 mb-4 md:mb-6">
          Tuberculosis Symptom Checklist
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
          {Object.keys(responses).map((symptom) => (
            <div key={symptom} className="space-y-1 md:space-y-2">
              <label className="block text-xs md:text-sm text-green-600 font-medium capitalize">
                {symptom.replace(/_/g, " ")}
              </label>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <label className="flex items-center text-sm md:text-base">
                  <input
                    type="radio"
                    name={symptom}
                    value="yes"
                    checked={responses[symptom] === "yes"}
                    onChange={handleChange}
                  />
                  <span className="ml-2">Yes</span>
                </label>
                <label className="flex items-center text-sm md:text-base">
                  <input
                    type="radio"
                    name={symptom}
                    value="no"
                    checked={responses[symptom] === "no"}
                    onChange={handleChange}
                  />
                  <span className="ml-2">No</span>
                </label>
              </div>
            </div>
          ))}

          <button
            type="submit"
            className="w-full bg-green-600 text-white py-2 md:py-3 rounded-lg hover:bg-green-700 transition-colors text-sm md:text-base font-medium"
          >
            Check Risk
          </button>
        </form>

        {result && (
          <div className="mt-4 md:mt-6 p-3 md:p-4 text-center border rounded-lg bg-gray-100 text-green-700 font-medium text-xs md:text-sm">
            {result}
          </div>
        )}
      </div>
    </div>
  );
}
