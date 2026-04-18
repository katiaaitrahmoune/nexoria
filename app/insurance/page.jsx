"use client";

import { useState } from "react";
import { Download, RotateCcw, AlertCircle } from "lucide-react";
import AdminLayout from "../components/AdminLayout";

export default function AssuranceReassurance() {
  const [formData, setFormData] = useState({
    capitalAssure: "1800000000",
    primeAnnuelle: "21600000",
    zoneSeismique: "Zone IIb",
    tauxCession: "70",
    typeTraitePrincipal: "Quote-Part",
    prioriteParSinistre: "90000000",
    plafondCouvertureXL: "600000000",
  });

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fmt = (v) => {
    if (!v) return "0";
    return parseInt(v).toLocaleString("en-US");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("https://nexoria-vq48.onrender.com/api/calculer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          capitalAssure: parseInt(formData.capitalAssure),
          primeAnnuelle: parseInt(formData.primeAnnuelle),
          zoneSeismique: formData.zoneSeismique,
          tauxCession: parseInt(formData.tauxCession),
          typeTraitePrincipal: formData.typeTraitePrincipal,
          prioriteParSinistre: parseInt(formData.prioriteParSinistre),
          plafondCouvertureXL: parseInt(formData.plafondCouvertureXL),
        }),
      });

      if (!response.ok) {
        throw new Error("Calculation failed");
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      capitalAssure: "1800000000",
      primeAnnuelle: "21600000",
      zoneSeismique: "Zone IIb",
      tauxCession: "70",
      typeTraitePrincipal: "Quote-Part",
      prioriteParSinistre: "90000000",
      plafondCouvertureXL: "600000000",
    });
    setResults(null);
    setError(null);
  };

  return (
    <AdminLayout>
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-8 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Insurance-Reinsurance Platform
            </h1>
            <p className="text-gray-600 text-sm leading-relaxed max-w-3xl">
              Earthquake risk management dashboard for calculating optimal capital and premium distribution between primary insurers and reinsurers. All calculations update automatically based on seismic zone, treaty type, and retention parameters.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => {}}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium transition-all hover:border-gray-400"
          >
            <Download className="w-4 h-4" />
            Export Structure
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-semibold">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Results Sections */}
        {results && (
          <div className="space-y-6 mb-8">
            {/* Section 2 - Financial Flow */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Financial Flow</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Client → Company → Reinsurer distribution breakdown
                  </p>
                </div>
                <span className="px-4 py-2 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg">
                  SECTION 1
                </span>
              </div>

              <div className="space-y-8">
                {/* Premium Display */}
                <div>
                  <p className="text-sm text-gray-600 mb-2 font-medium">Client Premium</p>
                  <div className="text-5xl font-bold text-gray-900 mb-2">
                    ${fmt(results.fluxFinancier?.client || 0)}
                  </div>
                  <p className="text-sm text-gray-600">Annual premium paid by client</p>
                </div>

                {/* Distribution Split */}
                <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-8 border border-gray-200">
                  <div className="grid grid-cols-3 gap-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-3 font-medium">Retained by Company</p>
                      <div className="text-4xl font-bold text-green-600 mb-2">
                        {results.fluxFinancier?.tauxRetention || 0}%
                      </div>
                      <p className="text-xs text-gray-600">Kept in portfolio</p>
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="text-2xl text-gray-400">→</div>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-3 font-medium">Ceded to Reinsurer</p>
                      <div className="text-4xl font-bold text-green-700 mb-2">
                        {results.fluxFinancier?.tauxCession || 0}%
                      </div>
                      <p className="text-xs text-gray-600">Transferred to market</p>
                    </div>
                  </div>
                </div>

                {/* Commission */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                  <p className="text-sm text-gray-600 mb-2 font-medium">Return Commission</p>
                  <p className="text-3xl font-bold text-gray-900">
                    ${fmt(results.fluxFinancier?.commissionRetour || 0)}
                  </p>
                  <p className="text-xs text-gray-600 mt-2">Commission earned on reinsured portion</p>
                </div>
              </div>
            </div>

            {/* Section 3 - Distribution */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Detailed Distribution</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Capital and premium breakdown between parties
                  </p>
                </div>
                <span className="px-4 py-2 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg">
                  SECTION 2
                </span>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Capital Retained */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <p className="text-xs text-gray-600 font-semibold mb-3 uppercase tracking-wide">Capital Retained</p>
                  <p className="text-3xl font-bold text-gray-900 mb-2">
                    ${fmt(results.repartition?.capitalRetenu || 0)}
                  </p>
                  <p className="text-xs text-gray-600">
                    Amount kept by company in its own retention
                  </p>
                </div>

                {/* Capital Ceded */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                  <p className="text-xs text-gray-600 font-semibold mb-3 uppercase tracking-wide">Capital Ceded</p>
                  <p className="text-3xl font-bold text-gray-900 mb-2">
                    ${fmt(results.repartition?.capitalCede || 0)}
                  </p>
                  <p className="text-xs text-gray-600">
                    Amount transferred to primary reinsurer
                  </p>
                </div>

                {/* Company Premium */}
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                  <p className="text-xs text-gray-600 font-semibold mb-3 uppercase tracking-wide">Company Net Premium</p>
                  <p className="text-3xl font-bold text-gray-900 mb-2">
                    ${fmt(results.repartition?.primeTotaleCompagnie || 0)}
                  </p>
                  <p className="text-xs text-gray-600">
                    Retained premium + return commission
                  </p>
                </div>

                {/* Reinsurer Premium */}
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                  <p className="text-xs text-gray-600 font-semibold mb-3 uppercase tracking-wide">Reinsurer Net Premium</p>
                  <p className="text-3xl font-bold text-gray-900 mb-2">
                    ${fmt(results.repartition?.primeTotaleReassureur || 0)}
                  </p>
                  <p className="text-xs text-gray-600">
                    Ceded premium net of return commission
                  </p>
                </div>
              </div>
            </div>

            {/* Section 4 - Treaties */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Reinsurance Treaties</h2>
                <span className="px-4 py-2 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg">
                  SECTION 3
                </span>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Main Treaty */}
                <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-900">Primary Treaty - {formData.typeTraitePrincipal}</p>
                      <p className="text-xs text-gray-600 mt-2">
                        Proportional sharing of portfolio according to defined cession rate.
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-lg whitespace-nowrap ml-2">
                      RECOMMENDED
                    </span>
                  </div>
                </div>

                {/* XL Treaty */}
                <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-900">Supplementary Treaty - XL Catastrophe</p>
                      <p className="text-xs text-gray-600 mt-2">
                        Non-proportional protection for losses exceeding the retention priority.
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-lg whitespace-nowrap ml-2">
                      MANDATORY
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5 - Strategies */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">30% Retention Management Strategies</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Actions and levers for insurers to optimize retained portfolio management
                  </p>
                </div>
                <span className="px-4 py-2 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg">
                  SECTION 4
                </span>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Strategy 1 */}
                <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow bg-white">
                  <div className="flex items-start justify-between mb-3">
                    <p className="font-bold text-gray-900">Technical Provisioning</p>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded">
                      15% Retained
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Building internal reserves equivalent to $81M for risk management.
                  </p>
                </div>

                {/* Strategy 2 */}
                <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow bg-white">
                  <div className="flex items-start justify-between mb-3">
                    <p className="font-bold text-gray-900">Geographic Diversification</p>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded">
                      Portfolio
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Concentrating portfolio diversity across low-risk zones to reduce exposure.
                  </p>
                </div>

                {/* Strategy 3 */}
                <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow bg-white">
                  <div className="flex items-start justify-between mb-3">
                    <p className="font-bold text-gray-900">Large Risk Facultatives</p>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded">
                      Munich / Swiss Re
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Position facultatives for individual accounts exceeding retention priority.
                  </p>
                </div>

                {/* Strategy 4 */}
                <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow bg-white">
                  <div className="flex items-start justify-between mb-3">
                    <p className="font-bold text-gray-900">CCR Pool Participation</p>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded">
                      Mutualisation
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Share catastrophe risk with Central Reinsurance Fund for diversification.
                  </p>
                </div>

                {/* Strategy 5 */}
                <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow bg-white">
                  <div className="flex items-start justify-between mb-3">
                    <p className="font-bold text-gray-900">Zone-Based Planning</p>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded">
                      Discipline
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Set capital limits per seismic zone to control CAT volatility exposure.
                  </p>
                </div>

                {/* Strategy 6 - Alert (Colored) */}
                <div className="border border-red-300 rounded-xl p-6 hover:shadow-md transition-shadow bg-red-50">
                  <div className="flex items-start justify-between mb-3">
                    <p className="font-bold text-gray-900">Automatic Zone Alert</p>
                    <span className="px-2 py-1 bg-red-200 text-red-800 text-xs font-semibold rounded">
                      CRITICAL
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    High-risk zone detection: strengthen CAT reinsurance and encourage risk transfer.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Section - At Bottom */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Calculation Parameters</h2>
              <p className="text-sm text-gray-600 mt-1">
                Enter earthquake insurance and reinsurance parameters below
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
            {/* Capital Assured */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Insured Capital
              </label>
              <input
                type="number"
                name="capitalAssure"
                value={formData.capitalAssure}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">Total value in dollars</p>
            </div>

            {/* Annual Premium */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Annual Premium
              </label>
              <input
                type="number"
                name="primeAnnuelle"
                value={formData.primeAnnuelle}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">Premium amount</p>
            </div>

            {/* Seismic Zone */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Seismic Zone
              </label>
              <select
                name="zoneSeismique"
                value={formData.zoneSeismique}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition bg-white"
              >
                <option>Zone 0</option>
                <option>Zone I</option>
                <option>Zone IIa</option>
                <option>Zone IIb</option>
                <option>Zone III</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">RPA classification</p>
            </div>

            {/* Cession Rate */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Cession Rate
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  name="tauxCession"
                  value={formData.tauxCession}
                  onChange={handleInputChange}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  placeholder="0"
                />
                <span className="text-gray-500 font-semibold">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">To reinsurer</p>
            </div>

            {/* Main Treaty Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Main Treaty Type
              </label>
              <select
                name="typeTraitePrincipal"
                value={formData.typeTraitePrincipal}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition bg-white"
              >
                <option>Quote-Part</option>
                <option>Excess of Loss</option>
                <option>Combined</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Treaty structure</p>
            </div>

            {/* Loss Priority */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Loss Priority
              </label>
              <input
                type="number"
                name="prioriteParSinistre"
                value={formData.prioriteParSinistre}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">Deductible amount</p>
            </div>

            {/* XL Limit */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                XL Coverage Limit
              </label>
              <input
                type="number"
                name="plafondCouvertureXL"
                value={formData.plafondCouvertureXL}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">Maximum limit</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleReset}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-all hover:border-gray-400"
            >
              Reset Form
            </button>
            <button
              onClick={handleCalculate}
              disabled={loading}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-bold transition-all disabled:opacity-50 shadow-md hover:shadow-lg"
            >
              <RotateCcw className="w-4 h-4" />
              {loading ? "Calculating..." : "Calculate"}
            </button>
          </div>
        </div>

        {/* Empty State */}
        {!results && !loading && (
          <div className="mt-8">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm p-12 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No Calculations Yet</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Fill in the parameters above and click "Calculate" to generate risk distribution analysis and reinsurance strategy recommendations.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
    </AdminLayout>
  );
}