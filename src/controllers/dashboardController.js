const calculate = (req, res) => {
  const {
    capitalAssure,
    primeAnnuelle,
    zoneSeismique,
    tauxCession,
    typeTraitePrincipal,
    prioriteParSinistre,
    plafondCouvertureXL,
  } = req.body;
  const tauxRetention = 100 - tauxCession;
  const capitalRetenu = (capitalAssure * tauxRetention) / 100;
  const capitalCede   = (capitalAssure * tauxCession)   / 100;

  const primeRetenue = (primeAnnuelle * tauxRetention) / 100;
  const primeCedee   = (primeAnnuelle * tauxCession)   / 100;

  const COMMISSION_RATE         = 0.22;
  const commissionRetour        = primeCedee * COMMISSION_RATE;
  const primeTotaleCompagnie    = primeRetenue + commissionRetour;
  const primeTotaleReassureur   = primeCedee   - commissionRetour;
  res.json({
    success: true,
    fluxFinancier: {
      client:                primeAnnuelle,
      tauxRetention,
      tauxCession,
      commissionRetour:      Math.round(commissionRetour),
    },

    repartition: {
      capitalRetenu:          Math.round(capitalRetenu),
      capitalCede:            Math.round(capitalCede),
      primeTotaleCompagnie:   Math.round(primeTotaleCompagnie),
      primeTotaleReassureur:  Math.round(primeTotaleReassureur),
    },
  });
};
export default calculate ;