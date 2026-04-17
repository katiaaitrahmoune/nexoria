def verifier_vulnerabilite_maconnerie(donnees):
    """
    Vérifie la conformité d'une construction en maçonnerie porteuse chaînée 
    selon le RPA 99 v2003 (Chapitre IX).
    """
    resultats = {"conforme": True, "alertes": []}

    # 1. Vérification de la Zone Sismique et Hauteur (Tableau 9.1)
    # [cite: 237, 239]
    limites_zone = {
        "I":   {"h_max": 17, "n_etages": 5},
        "IIa": {"h_max": 14, "n_etages": 4},
        "IIb": {"h_max": 14, "n_etages": 4},
        "III": {"h_max": 11, "n_etages": 3}
    }
    
    zone = donnees['zone_sismique']
    if zone in limites_zone:
        if donnees['hauteur'] > limites_zone[zone]['h_max']:
            resultats["conforme"] = False
            resultats["alertes"].append(f"Hauteur excessive pour zone {zone} (> {limites_zone[zone]['h_max']}m)")
        if donnees['nb_niveaux'] > limites_zone[zone]['n_etages']:
            resultats["conforme"] = False
            resultats["alertes"].append(f"Nombre d'étages excessif pour zone {zone} (> {limites_zone[zone]['n_etages']})")

    # 2. Dimensions en plan (Rapport L/l)
    # 
    if donnees['longueur'] / donnees['largeur'] > 3.5:
        resultats["conforme"] = False
        resultats["alertes"].append("Rapport longueur/largeur > 3.5")

    # 3. Densité des murs (Aire totale)
    # 
    ratio_murs = donnees['aire_murs'] / donnees['surface_plancher']
    if ratio_murs < 0.04:
        resultats["conforme"] = False
        resultats["alertes"].append(f"Densité de murs insuffisante ({ratio_murs:.1%} < 4%)")

    # 4. Épaisseur minimale des murs porteurs
    # 
    if donnees['epaisseur_mur'] < 20:
        resultats["conforme"] = False
        resultats["alertes"].append("Épaisseur minimale des murs (20 cm) non respectée")

    # 5. Résistance des matériaux (Mortier et Béton)
    # 
    if donnees['resistance_mortier'] < 5:
        resultats["conforme"] = False
        resultats["alertes"].append("Résistance mortier < 5 MPa")
    
    if donnees['resistance_beton'] < 15:
        resultats["conforme"] = False
        resultats["alertes"].append("Résistance béton < 15 MPa")

    # 6. Distances maximales entre murs porteurs (Tableau 9.2)
    # [cite: 251, 252]
    distances_max = {"I": 10, "IIa": 8, "IIb": 8, "III": 6}
    if zone in distances_max:
        if donnees['distance_entre_murs'] > distances_max[zone]:
            resultats["conforme"] = False
            resultats["alertes"].append(f"Distance entre murs trop grande pour zone {zone} (> {distances_max[zone]}m)")

    return resultats

# # --- EXEMPLE D'UTILISATION ---
# projet = {
#     "zone_sismique": "III",      # Zone III (Alger, Chlef, etc.) [cite: 422, 424]
#     "hauteur": 10,               # mètres
#     "nb_niveaux": 3,
#     "longueur": 20,
#     "largeur": 10,
#     "aire_murs": 12,             # m2 au sol
#     "surface_plancher": 200,     # m2
#     "epaisseur_mur": 20,         # cm
#     "resistance_mortier": 6,     # MPa
#     "resistance_beton": 20,      # MPa
#     "distance_entre_murs": 5     # mètres
# }

# analyse = verifier_vulnerabilite_maconnerie(projet)

# if analyse["conforme"]:
#     print("La construction respecte les critères de non-vulnérabilité du RPA 99.")
# else:
#     print("Critères de vulnérabilité détectés :")
#     for msg in analyse["alertes"]:
#         print(f"   - {msg}")