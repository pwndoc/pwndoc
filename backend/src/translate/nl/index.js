
var CVSS = {
    "Attack Vector": "Aanvalsvector",
    "Attack Complexity": "Aanvalscomplexiteit",
    "Privileges Required": "Rechten nodig",
    "User Interaction": "Gebruikers interactie",
    "Scope": "Scope",
    "Confidentiality": "Vertrouwelijkheid",
    "Integrity": "Integriteit",
    "Availability": "Beschikbaarheid",
    "Network": "Netwerk",
    "Adjacent Network": "Lokaal netwerk",
    "Physical": "Fysiek",
    "Low": "Laag",
    "High": "Hoog",
    "Medium": "Midden",
    "Critical": "Kritiek",
    "None": "Geen",
    "Required": "Verplicht",
    "Unchanged": "Ongewijzigd",
    "Changed": "Verandert"
}

var Categories = {
    "No Category": "Geen category"
}

module.exports = {
    ...CVSS,
    ...Categories
}
