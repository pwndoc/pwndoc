
var CVSS = {
    "Attack Vector": "Vecteur d'attaque",
    "Attack Complexity": "Complexité d'attaque",
    "Privileges Required": "Privilèges requis",
    "User Interaction": "Interaction utilisateur",
    "Scope": "Portée",
    "Confidentiality": "Confidentialité",
    "Integrity": "Intégrité",
    "Availability": "Disponibilité",
    "Network": "Réseau",
    "Adjacent Network": "Réseau Local",
    "Physical": "Physique",
    "Low": "Faible",
    "High": "Haut",
    "None": "Aucun",
    "Required": "Requis",
    "Unchanged": "Inchangé",
    "Changed": "Changé"
}

var Categories = {
    "No Category": "Non Catégorisé"
}

module.exports = {
    ...CVSS,
    ...Categories
}