from dataclasses import dataclass
from typing import List, Dict


@dataclass(frozen=True)
class CompanyConfig:
    display_name: str
    pdf_filename: str
    sector: str


COMPANIES: List[CompanyConfig] = [
    # --- Retail & Consumer ---
    CompanyConfig("Alimentation Couche-Tard",        "AlimentationCouche-Tard_AuditedAFS_2025.pdf",              "Retail & Consumer"),
    CompanyConfig("Aritzia Inc.",                     "AritziaInc._AuditedAFS_2025.pdf",                         "Retail & Consumer"),
    CompanyConfig("Canadian Tire Corporation",        "CanadianTireCorporation_AuditedAFS_2026.pdf",             "Retail & Consumer"),
    CompanyConfig("Dollarama Inc.",                   "DollaramaInc._AuditedAFS_2025.pdf",                       "Retail & Consumer"),
    CompanyConfig("Empire Company Limited",           "EmpireCompanyLimited_AuditedAFS_2025.pdf",                "Retail & Consumer"),
    CompanyConfig("George Weston Limited",            "GeorgeWestonLimited_AuditedAFS_2024.pdf",                 "Retail & Consumer"),
    CompanyConfig("Leon's Furniture Limited",         "Leon'sFurnitureLimited_AuditedAFS_2024.pdf",              "Retail & Consumer"),
    CompanyConfig("Loblaw Companies Limited",         "LoblawCompaniesLimited_AuditedAFS_2025.pdf",              "Retail & Consumer"),
    CompanyConfig("Maple Leaf Foods Inc.",            "MapleLeafFoodsInc._AuditedAFS_2024.pdf",                  "Retail & Consumer"),
    CompanyConfig("Metro Inc.",                       "MetroInc._AuditedAFS_2025.pdf",                           "Retail & Consumer"),
    CompanyConfig("Pet Valu Holdings Ltd.",           "PetValuHoldingsLtd._AuditedAFS_2024.pdf",                 "Retail & Consumer"),
    CompanyConfig("Reitmans Canada Limited",          "ReitmansCanadaLimited_AuditedAFS_2025.pdf",               "Retail & Consumer"),
    CompanyConfig("Roots Corporation",                "RootsCorporation_AuditedAFS_2025.pdf",                    "Retail & Consumer"),
    CompanyConfig("Saputo Inc.",                      "SaputoInc._AuditedAFS_2025.pdf",                          "Retail & Consumer"),
    CompanyConfig("The North West Company Inc.",      "TheNorthWestCompanyInc._AuditedAFS_2025.pdf",             "Retail & Consumer"),
    CompanyConfig("Andrew Peller Limited",            "AndrewPellerLimited_AuditedAFS_2025.pdf",                 "Retail & Consumer"),
    CompanyConfig("Corby Spirit and Wine Limited",    "CorbySpiritandWineLimited_AuditedAFS_2025.pdf",           "Retail & Consumer"),
    CompanyConfig("Lassonde Industries Inc.",         "LassondeIndustriesInc._AuditedAFS_2025.pdf",              "Retail & Consumer"),
    CompanyConfig("MTY Food Group Inc.",              "MTYFoodGroupInc._AuditedAFS_2025.pdf",                    "Retail & Consumer"),
    CompanyConfig("Restaurant Brands International Inc.", "RestaurantBrandsInternationalInc._AuditedAFS_2025.pdf", "Retail & Consumer"),
    CompanyConfig("Spin Master Corp.",                "SpinMasterCorp._AuditedAFS_2024.pdf",                     "Retail & Consumer"),

    # --- Energy & Resources ---
    CompanyConfig("Agnico Eagle Mines Limited",       "AgnicoEagleMinesLimited_AuditedAFS_2025.pdf",             "Energy & Resources"),
    CompanyConfig("Barrick Mining Corporation",       "BarrickMiningCorporation_AuditedAFS_2025.pdf",            "Energy & Resources"),
    CompanyConfig("Canadian Natural Resources Limited", "CanadianNaturalResourcesLimited_AuditedAFS_2024.pdf",   "Energy & Resources"),
    CompanyConfig("Cenovus Energy Inc.",              "CenovusEnergyInc._AuditedAFS_2025.pdf",                   "Energy & Resources"),
    CompanyConfig("Imperial Oil Limited",             "ImperialOilLimited_AuditedAFS_2024.pdf",                  "Energy & Resources"),
    CompanyConfig("Kinross Gold Corporation",         "KinrossGoldCorporation_AuditedAFS_2025.pdf",              "Energy & Resources"),
    CompanyConfig("Lundin Mining Corporation",        "LundinMiningCorporation_AuditedAFS_2025.pdf",             "Energy & Resources"),
    CompanyConfig("Ovintiv",                          "Ovintiv_AuditedAFS_2025.pdf",                             "Energy & Resources"),
    CompanyConfig("Suncor Energy Inc.",               "SuncorEnergyInc._AuditedAFS_2025.pdf",                    "Energy & Resources"),
    CompanyConfig("Teck Resources Limited",           "TeckResourcesLimited_AuditedAFS_2025.pdf",                "Energy & Resources"),

    # --- Industrials, Transport & Utilities ---
    CompanyConfig("Air Canada",                       "AirCanada_AuditedAFS_2025.pdf",                           "Industrials, Transport & Utilities"),
    CompanyConfig("Algonquin Power & Utilities Corp.", "AlgonquinPower&UtilitiesCorp._AuditedAFS_2024.pdf",      "Industrials, Transport & Utilities"),
    CompanyConfig("ATCO Ltd.",                        "ATCOLtd._AuditedAFS_2025.pdf",                            "Industrials, Transport & Utilities"),
    CompanyConfig("ATS Corporation",                  "ATSCorporation_AuditedAFS_2025.pdf",                      "Industrials, Transport & Utilities"),
    CompanyConfig("Bombardier Inc.",                  "BombardierInc._AuditedAFS_2025.pdf",                      "Industrials, Transport & Utilities"),
    CompanyConfig("Canadian Pacific Kansas City Limited", "CanadianPacificKansasCityLimited_AuditedAFS_2025.pdf", "Industrials, Transport & Utilities"),
    CompanyConfig("Canadian Utilities Limited",       "CanadianUtilitiesLimited_AuditedAFS_2025.pdf",            "Industrials, Transport & Utilities"),
    CompanyConfig("Cargojet Inc.",                    "CargojetInc._AuditedAFS_2025.pdf",                        "Industrials, Transport & Utilities"),
    CompanyConfig("Emera Incorporated",               "EmeraIncorporated_AuditedAFS_2025.pdf",                   "Industrials, Transport & Utilities"),
    CompanyConfig("Fortis Inc.",                      "FortisInc._AuditedAFS_2025.pdf",                          "Industrials, Transport & Utilities"),
    CompanyConfig("Hydro One Limited",                "HydroOneLimited_AuditedAFS_2025.pdf",                     "Industrials, Transport & Utilities"),
    CompanyConfig("Linamar Corporation",              "LinamarCorporation_AuditedAFS_2024.pdf",                  "Industrials, Transport & Utilities"),
    CompanyConfig("Martinrea International Inc.",     "MartinreaInternationalInc._AuditedAFS_2024.pdf",          "Industrials, Transport & Utilities"),
    CompanyConfig("NFI Group Inc.",                   "NFIGroupInc._AuditedAFS_2024.pdf",                        "Industrials, Transport & Utilities"),
    CompanyConfig("Stella-Jones Inc.",                "Stella-JonesInc._AuditedAFS_2025.pdf",                    "Industrials, Transport & Utilities"),
    CompanyConfig("TFI International Inc.",           "TFIInternationalInc._AuditedAFS_2025.pdf",                "Industrials, Transport & Utilities"),
    CompanyConfig("Titanium Transportation Group Inc.", "TitaniumTransportationGroupInc._AuditedAFS_2024.pdf",   "Industrials, Transport & Utilities"),

    # --- Healthcare ---
    CompanyConfig("Bausch Health Companies Inc.",     "BauschHealthCompaniesInc._AuditedAFS_2025.pdf",           "Healthcare"),
    CompanyConfig("dentalcorp Health Services Ltd.",  "dentalcorpHealthServicesLtd._AuditedAFS_2024.pdf",        "Healthcare"),
    CompanyConfig("Jamieson Wellness Inc.",           "JamiesonWellnessInc._AuditedAFS_2025.pdf",               "Healthcare"),
    CompanyConfig("Knight Therapeutics Inc.",         "KnightTherapeuticsInc._AuditedAFS_2024.pdf",             "Healthcare"),
    CompanyConfig("Medical Facilities Corporation",   "MedicalFacilitiesCorporation_AuditedAFS_2024.pdf",       "Healthcare"),

    # --- Telecom & Media ---
    CompanyConfig("Quebecor Inc.",                    "QuebecorInc._AuditedAFS_2025.pdf",                        "Telecom & Media"),
    CompanyConfig("Rogers Communications Inc.",       "RogersCommunicationsInc._AuditedAFS_2024.pdf",           "Telecom & Media"),
]


# Lookup helpers — for use by services once functionality is built
COMPANY_BY_NAME: Dict[str, CompanyConfig] = {c.display_name: c for c in COMPANIES}
COMPANY_BY_FILENAME: Dict[str, CompanyConfig] = {c.pdf_filename: c for c in COMPANIES}
