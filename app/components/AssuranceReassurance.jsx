"use client";

import { useState } from "react";
import { Download, RotateCcw, AlertCircle, CheckCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from "recharts";

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
    return parseInt(v).toLocaleString("fr-DZ");
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

  const chartData = results
    ? [
        {
          name: "Compagnie",
          value: results.fluxFinancier?.tauxRetention || 0,
          fill: "#65a30d",
        },
        {
          name: "Réassureur",
          value: results.fluxFinancier?.tauxCession || 0,
          fill: "#bef264",
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Plateforme Assurance–Réassurance Sismique
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Page de pilotage de la structure du partage entre la compagnie cédante et le réassureur pour les risques sismiques en Algérie. Tous les calculs se mettent à jour automatiquement selon la zone RPA, le traité principal et les paramètres de rétention.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => {}}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter la structure
          </button>
          <button
            onClick={handleCalculate}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            {loading ? "Calcul en cours..." : "Recalculer"}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 py-6">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-semibold">Erreur</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Parameters */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Paramétrage</h2>
              <p className="text-sm text-gray-600 mb-6">
                Capital, prime, zone sismique, taux de cession et traité principal utilisés dans le partage assurance-réassurance.
              </p>

              <div className="space-y-4">
                {/* Capital assuré */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Capital assuré total (DA)
                  </label>
                  <input
                    type="number"
                    name="capitalAssure"
                    value={formData.capitalAssure}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Prime annuelle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prime annuelle (DA)
                  </label>
                  <input
                    type="number"
                    name="primeAnnuelle"
                    value={formData.primeAnnuelle}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Zone sismique */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zone sismique RPA
                  </label>
                  <select
                    name="zoneSeismique"
                    value={formData.zoneSeismique}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option>Zone 0</option>
                    <option>Zone I</option>
                    <option>Zone IIa</option>
                    <option>Zone IIb</option>
                    <option>Zone III</option>
                  </select>
                </div>

                {/* Taux de cession */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Taux de cession (%)
                  </label>
                  <input
                    type="number"
                    name="tauxCession"
                    value={formData.tauxCession}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Type de traité */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type de traité principal
                  </label>
                  <select
                    name="typeTraitePrincipal"
                    value={formData.typeTraitePrincipal}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option>Quote-Part</option>
                    <option>Excédent de Sinistre</option>
                    <option>Combiné</option>
                  </select>
                </div>

                {/* Priorité par sinistre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priorité de rétention par sinistre (DA)
                  </label>
                  <input
                    type="number"
                    name="prioriteParSinistre"
                    value={formData.prioriteParSinistre}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Plafond XL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plafond de couverture XL (DA)
                  </label>
                  <input
                    type="number"
                    name="plafondCouvertureXL"
                    value={formData.plafondCouvertureXL}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Reset Button */}
                <button
                  onClick={handleReset}
                  className="w-full mt-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors"
                >
                  Réinitialiser
                </button>
              </div>

              {/* Info Box */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> La structure par défaut convient à une réserve interne équivalents à 81 000 000 DA.
                </p>
              </div>
              <div className="mt-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <strong>Zone 10:</strong> protection particulière requise.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Results */}
          {results && (
            <div className="lg:col-span-2 space-y-6">
              {/* Section 2 - Flux Financier */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Flux financier visuel</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Client → Compagnie → Réassureur → Conversion de retour compagnie
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                    Section 2
                  </span>
                </div>

                {/* Flow Diagram */}
                <div className="space-y-6">
                  {/* Flow Item */}
                  <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                      <p className="text-sm text-gray-600 font-medium">Client</p>
                    </div>
                    <div className="text-center flex-1">
                      <p className="text-3xl font-bold text-gray-900">
                        {fmt(results.fluxFinancier?.client || 0)}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">Prime annuelle versée</p>
                    </div>
                    <div className="flex-1"></div>
                  </div>

                  {/* Distribution */}
                  <div className="grid grid-cols-3 gap-4 py-4 bg-gray-50 rounded-lg p-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-2">Rétention</p>
                      <p className="text-2xl font-bold text-green-600">
                        {results.fluxFinancier?.tauxRetention || 0}%
                      </p>
                      <p className="text-xs text-gray-600 mt-1">Part détenue en propre</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-2">→ Compagnie →</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-2">Cession</p>
                      <p className="text-2xl font-bold text-green-700">
                        {results.fluxFinancier?.tauxCession || 0}%
                      </p>
                      <p className="text-xs text-gray-600 mt-1">Part cédée</p>
                    </div>
                  </div>

                  {/* Commission */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Commission retour compagnie</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {fmt(results.fluxFinancier?.commissionRetour || 0)} DA
                    </p>
                  </div>

                  {/* Bar Chart */}
                  <div className="mt-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => `${value}%`} />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Section 3 - Répartition */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Répartition détaillée</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Capital retenu, capital cédé, prime nette compagnie et prime nette réassureur.
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                    Section 3
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Capital Retenu */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-600 font-medium mb-2">Capital retenu</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {fmt(results.repartition?.capitalRetenu || 0)} DA
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Part conservée par la compagnie dans sa rétention propre.
                    </p>
                  </div>

                  {/* Capital Cédé */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-600 font-medium mb-2">Capital cédé</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {fmt(results.repartition?.capitalCede || 0)} DA
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Exposition transférée au réassureur principal.
                    </p>
                  </div>

                  {/* Prime Nette Compagnie */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-600 font-medium mb-2">Prime nette compagnie</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {fmt(results.repartition?.primeTotaleCompagnie || 0)} DA
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Rétention de prime + commission de retour.
                    </p>
                  </div>

                  {/* Prime Nette Réassureur */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-600 font-medium mb-2">Prime nette réassureur</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {fmt(results.repartition?.primeTotaleReassureur || 0)} DA
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Prime cédée nette après commission retour.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 4 - Traités */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Traités de réassurance</h2>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                    Section 4
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Traité Principal */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">Traité principal – {formData.typeTraitePrincipal}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Partage proportionnel de la portefeuille selon le taux de cession défini.
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                        Recommandé
                      </span>
                    </div>
                  </div>

                  {/* Traité Complémentaire */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">Traité complémentaire – XL Catastrophe</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Protection non proportionnelle sur les chocs dépassant la priorité de rétention.
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">
                        Obligatoire
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 5 - Stratégies */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Stratégies de gestion de la rétention 30%
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Actions internes et leviers pour l'assureur pour ajuster la part conservée par la compagnie.
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                    Section 5
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Strategy 1 */}
                  <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-gray-900">Provisionnement technique</p>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                        15% retenu
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Constitution d'une réserve interne équivalents à 81 000 000 DA.
                    </p>
                  </div>

                  {/* Strategy 2 */}
                  <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-gray-900">Diversification géographique</p>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                        Portefeuille
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Concentrer la diversité des souscriptions sur les zones 0 et I éloignée à faible assurée les zones III.
                    </p>
                  </div>

                  {/* Strategy 3 */}
                  <div className="border border-purple-200 bg-purple-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-gray-900">Traités facultatifs grands risques</p>
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded">
                        Munich / Swiss Re
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Positionner des facultatifs pour les affaires individuelles dépassant la priorité de rétention.
                    </p>
                  </div>

                  {/* Strategy 4 */}
                  <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-gray-900">Participation au pool CCR</p>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                        Mutualisation
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Partager une partie de risque catastrophe avec la Caisse Centrale de Réassurance.
                    </p>
                  </div>

                  {/* Strategy 5 */}
                  <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-gray-900">Planonnement par zone</p>
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded">
                        Discipline
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Définir des plafonds de capital engagés par zone RPA et par enfant pour maîtriser la volatilité CAT.
                    </p>
                  </div>

                  {/* Strategy 6 */}
                  <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-gray-900">Alerte automatique zone</p>
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">
                        Critique
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Zone de détectée : renforcer la réassurance CAT et inciter les engagements unitaires.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!results && !loading && (
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
                <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun calcul effectué</h3>
                <p className="text-gray-600 mb-6">
                  Cliquez sur le bouton "Recalculer" pour générer les résultats basés sur les paramètres saisis.
                </p>
                <button
                  onClick={handleCalculate}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  Recalculer maintenant
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}