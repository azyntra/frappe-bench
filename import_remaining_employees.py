import frappe
from frappe.utils import getdate

COMPANY = "CHAN RICH FRUITS (PVT) LTD"

GROUP_A = [
    {
        "emp_id":             "EMP-00072",
        "fingerprint_id":     "72",
        "first_name":         "GAYASHAN",
        "last_name":          "DULHARA",
        "name_with_initials": "W.A.GAYASHAN DULHARA",
        "gender":             "Male",
        "date_of_birth":      "1977-05-15",
        "date_of_joining":    "2022-12-08",
        "mobile":             "779550657",
        "emergency_phone":    None,
        "current_address":    "LADARU UYANA MAWATH,NONAGAMA,AMBALANTOTA",
        "id_number":          "871731470V",
        "marital_status":     "Married",
    },
    {
        "emp_id":             "EMP-00082",
        "fingerprint_id":     "82",
        "first_name":         "KAVIDU",
        "last_name":          "",
        "name_with_initials": "A.P.KAVIDU",
        "gender":             "Male",
        "date_of_birth":      "2001-04-23",
        "date_of_joining":    "2025-02-01",
        "mobile":             "742435482",
        "emergency_phone":    None,
        "current_address":    "NO.162 KOGGALLA,AMBALANTOTA",
        "id_number":          "200227600993",
        "marital_status":     "Single",
    },
    {
        "emp_id":             "EMP-00014",
        "fingerprint_id":     "14",
        "first_name":         "KUMARA",
        "last_name":          "",
        "name_with_initials": "E.M.KUMARA",
        "gender":             "Male",
        "date_of_birth":      "1988-03-07",
        "date_of_joining":    "2025-10-01",
        "mobile":             "779410758",
        "emergency_phone":    "769372617",
        "current_address":    "NO.435 ROTARIGAMA,THALAVILLA.",
        "id_number":          "751632002V",
        "marital_status":     "Married",
    },
    {
        "emp_id":             "EMP-00143",
        "fingerprint_id":     "143",
        "first_name":         "SAMANTHA",
        "last_name":          "KUMARA",
        "name_with_initials": "H.M.SAMANTHA KUMARA",
        "gender":             "Male",
        "date_of_birth":      "2004-11-04",
        "date_of_joining":    "2025-05-22",
        "mobile":             "723778811",
        "emergency_phone":    None,
        "current_address":    "NO 71,GURUMADA GAGE YAYA,MAHIYANGANAYA",
        "id_number":          "8225045540v",
        "marital_status":     "Married",
    },
    {
        "emp_id":             "EMP-00151",
        "fingerprint_id":     "151",
        "first_name":         "SAMANTHA",
        "last_name":          "",
        "name_with_initials": "M.A.SAMANTHA",
        "gender":             "Male",
        "date_of_birth":      "1986-06-25",
        "date_of_joining":    "2018-06-23",
        "mobile":             "74340634",
        "emergency_phone":    None,
        "current_address":    "NO 77 SINHAGAMMANAYA,ADI 100 ROD,MIRIJJAVILA,AMBALANTOATA.",
        "id_number":          "200001304308",
        "marital_status":     "Married",
    },
]

# Group B: FP ID exists but no full details — use placeholder dates
GROUP_B = [
    {
        "emp_id":             "EMP-00006",
        "fingerprint_id":     "6",
        "first_name":         "M THEJANI",
        "last_name":          "",
        "name_with_initials": "M THEJANI",
        "gender":             "Female",
        "date_of_birth":      "1990-01-01",
        "date_of_joining":    "2020-01-01",
        "mobile":             None,
        "emergency_phone":    None,
        "current_address":    None,
        "id_number":          None,
        "marital_status":     "Single",
    },
    {
        "emp_id":             "EMP-00021",
        "fingerprint_id":     "21",
        "first_name":         "DC HERATH",
        "last_name":          "",
        "name_with_initials": "DC HERATH",
        "gender":             "Male",
        "date_of_birth":      "1990-01-01",
        "date_of_joining":    "2020-01-01",
        "mobile":             None,
        "emergency_phone":    None,
        "current_address":    None,
        "id_number":          None,
        "marital_status":     "Single",
    },
    {
        "emp_id":             "EMP-00028",
        "fingerprint_id":     "28",
        "first_name":         "MANI",
        "last_name":          "",
        "name_with_initials": "MANI",
        "gender":             "Male",
        "date_of_birth":      "1990-01-01",
        "date_of_joining":    "2020-01-01",
        "mobile":             None,
        "emergency_phone":    None,
        "current_address":    None,
        "id_number":          None,
        "marital_status":     "Single",
    },
    {
        "emp_id":             "EMP-00087",
        "fingerprint_id":     "87",
        "first_name":         "DANANJANA",
        "last_name":          "DEWMINI",
        "name_with_initials": "DANANJANA DEWMINI",
        "gender":             "Female",
        "date_of_birth":      "1990-01-01",
        "date_of_joining":    "2020-01-01",
        "mobile":             None,
        "emergency_phone":    None,
        "current_address":    None,
        "id_number":          None,
        "marital_status":     "Single",
    },
    {
        "emp_id":             "EMP-00169",
        "fingerprint_id":     "169",
        "first_name":         "RANJI",
        "last_name":          "SAMARAKKODI",
        "name_with_initials": "RANJI SAMARAKKODI",
        "gender":             "Male",
        "date_of_birth":      "1990-01-01",
        "date_of_joining":    "2020-01-01",
        "mobile":             None,
        "emergency_phone":    None,
        "current_address":    None,
        "id_number":          None,
        "marital_status":     "Single",
    },
    {
        "emp_id":             "EMP-00187",
        "fingerprint_id":     "187",
        "first_name":         "DANANJANA",
        "last_name":          "DEWMINI",
        "name_with_initials": "DANANJANA DEWMINI",
        "gender":             "Female",
        "date_of_birth":      "1990-01-01",
        "date_of_joining":    "2020-01-01",
        "mobile":             None,
        "emergency_phone":    None,
        "current_address":    None,
        "id_number":          None,
        "marital_status":     "Single",
    },
    {
        "emp_id":             "EMP-00192",
        "fingerprint_id":     "192",
        "first_name":         "MG",
        "last_name":          "",
        "name_with_initials": "MG",
        "gender":             "Male",
        "date_of_birth":      "1990-01-01",
        "date_of_joining":    "2020-01-01",
        "mobile":             None,
        "emergency_phone":    None,
        "current_address":    None,
        "id_number":          None,
        "marital_status":     "Single",
    },
]

GROUP_C = [
    {
        "emp_id":             "EMP-00197",
        "fingerprint_id":     None,
        "first_name":         "SANDUN",
        "last_name":          "KUMARA",
        "name_with_initials": "M.SANDUN KUMARA",
        "gender":             "Male",
        "date_of_birth":      "2000-01-15",
        "date_of_joining":    "2019-07-18",
        "mobile":             "743198438",
        "emergency_phone":    None,
        "current_address":    "NO 475 RANDIYAGAMA,GALWEWA,AMBALANTOTA",
        "id_number":          "200312500973",
        "marital_status":     "Married",
    },
    {
        "emp_id":             "EMP-00198",
        "fingerprint_id":     None,
        "first_name":         "RANJITH",
        "last_name":          "",
        "name_with_initials": "S.RANJITH",
        "gender":             "Male",
        "date_of_birth":      "2000-01-13",
        "date_of_joining":    "2024-04-01",
        "mobile":             "702328729",
        "emergency_phone":    None,
        "current_address":    "NO 397 ROHAL PEDESA,UDA BARAGAMA,AMBALANTOTA",
        "id_number":          "1981630053V",
        "marital_status":     "Married",
    },
    {
        "emp_id":             "EMP-00199",
        "fingerprint_id":     None,
        "first_name":         "RANGA",
        "last_name":          "RAVINDRA",
        "name_with_initials": "W.A.RANGA RAVINDRA",
        "gender":             "Male",
        "date_of_birth":      "1981-12-10",
        "date_of_joining":    "2024-01-01",
        "mobile":             "717505587",
        "emergency_phone":    None,
        "current_address":    "NO 558 BALLAGASWEWA,BARAGAMA,AMBALANTOTA",
        "id_number":          None,
        "marital_status":     "Married",
    },
    {
        "emp_id":             "EMP-00200",
        "fingerprint_id":     None,
        "first_name":         "THUSHARA",
        "last_name":          "THUSHARA",
        "name_with_initials": "L.G.CHAMIL THUSHARA",
        "gender":             "Male",
        "date_of_birth":      "1980-05-28",
        "date_of_joining":    "2020-03-02",
        "mobile":             "71977117",
        "emergency_phone":    None,
        "current_address":    "NO 288,MODARAPILIWELA,RUHUNU RIDIYAGAMA,AMBALANTOTA.",
        "id_number":          None,
        "marital_status":     "Single",
    },
    {
        "emp_id":             "EMP-00201",
        "fingerprint_id":     None,
        "first_name":         "SAMEERA",
        "last_name":          "",
        "name_with_initials": "W.SAMEERA",
        "gender":             "Male",
        "date_of_birth":      "1992-06-26",
        "date_of_joining":    "2025-01-01",
        "mobile":             "773441358",
        "emergency_phone":    None,
        "current_address":    "NO 822 BALLAGASWEWA,BARAGAMA,AMBALANTOTA.",
        "id_number":          "882792714V",
        "marital_status":     "Married",
    },
    {
        "emp_id":             "EMP-00202",
        "fingerprint_id":     None,
        "first_name":         "CHARITH",
        "last_name":          "ASANKA",
        "name_with_initials": "S.CHARITH ASANKA",
        "gender":             "Male",
        "date_of_birth":      "1988-05-10",
        "date_of_joining":    "2024-05-02",
        "mobile":             "720801858",
        "emergency_phone":    None,
        "current_address":    "NO12/1 KANDIKONA,KARABAGALAMULLA,RUHUNU RIDIYAGAMA,AMBALANTOTA.",
        "id_number":          "911661934V",
        "marital_status":     "Married",
    },
    {
        "emp_id":             "EMP-00203",
        "fingerprint_id":     None,
        "first_name":         "DILSHAN",
        "last_name":          "DILSHAN",
        "name_with_initials": "V.G.NIMESH DILSHAN",
        "gender":             "Male",
        "date_of_birth":      "1991-06-14",
        "date_of_joining":    "2025-01-01",
        "mobile":             "764718720",
        "emergency_phone":    None,
        "current_address":    "GAWEWA HANDIYA,MAHARA PASALA PARA,BARAGAMA,AMBALANTOTA.",
        "id_number":          "200118200617",
        "marital_status":     "Married",
    },
    {
        "emp_id":             "EMP-00204",
        "fingerprint_id":     None,
        "first_name":         "SANJU",
        "last_name":          "MENUSHKA",
        "name_with_initials": "R.A.SUBATH MENUSHKA",
        "gender":             "Male",
        "date_of_birth":      "2001-06-30",
        "date_of_joining":    "2025-10-24",
        "mobile":             "776172899",
        "emergency_phone":    None,
        "current_address":    "NO 516 BALLAGASWEWA,BARAGAMA,AMBALANTOTA",
        "id_number":          "200408111999",
        "marital_status":     "Single",
    },
    {
        "emp_id":             "EMP-00205",
        "fingerprint_id":     None,
        "first_name":         "SAMPATH",
        "last_name":          "",
        "name_with_initials": "SAMPATH",
        "gender":             "Male",
        "date_of_birth":      "2004-03-21",
        "date_of_joining":    "2025-01-01",
        "mobile":             None,
        "emergency_phone":    None,
        "current_address":    None,
        "id_number":          None,
        "marital_status":     "Single",
    },
    {
        "emp_id":             "EMP-00206",
        "fingerprint_id":     None,
        "first_name":         "DILAN",
        "last_name":          "SARANGA",
        "name_with_initials": "W.K.DILAN SARANGA",
        "gender":             "Male",
        "date_of_birth":      "2005-03-14",
        "date_of_joining":    "2022-11-01",
        "mobile":             "768750841",
        "emergency_phone":    None,
        "current_address":    "NO.556 BALLAGASWEWA,BARAGAMA,AMBALANTOTA",
        "id_number":          "200901902332",
        "marital_status":     "Single",
    },
    {
        "emp_id":             "EMP-00207",
        "fingerprint_id":     None,
        "first_name":         "DANJANA",
        "last_name":          "",
        "name_with_initials": "E.S.D. DEWMINI",
        "gender":             "Female",
        "date_of_birth":      "2009-01-19",
        "date_of_joining":    "2025-01-01",
        "mobile":             "702197681",
        "emergency_phone":    "702931654",
        "current_address":    "NO.131/J/2 ELGARADIYAMULLA,AMBALANTOTA.",
        "id_number":          "200884803710",
        "marital_status":     "Single",
    },
    {
        "emp_id":             "EMP-00208",
        "fingerprint_id":     None,
        "first_name":         "SITHMI",
        "last_name":          "DEVINDI",
        "name_with_initials": "W.A.SITHMI DEVINDI",
        "gender":             "Female",
        "date_of_birth":      "2002-10-22",
        "date_of_joining":    "2022-12-26",
        "mobile":             "704109270",
        "emergency_phone":    None,
        "current_address":    "MADAYA MA LANDA,AMBALANTOTA",
        "id_number":          "200666600449",
        "marital_status":     "Single",
    },
    {
        "emp_id":             "EMP-00209",
        "fingerprint_id":     None,
        "first_name":         "AVISHKA",
        "last_name":          "",
        "name_with_initials": "G.V.P.AVISHKA",
        "gender":             "Male",
        "date_of_birth":      "1974-09-22",
        "date_of_joining":    "2019-02-01",
        "mobile":             "767606551",
        "emergency_phone":    None,
        "current_address":    "NO.74/A KADAWARA SOUTH,KOGGALLA,AMBALANTOTA",
        "id_number":          "200823700744",
        "marital_status":     "Single",
    },
    {
        "emp_id":             "EMP-00210",
        "fingerprint_id":     None,
        "first_name":         "AYESHA",
        "last_name":          "",
        "name_with_initials": "M.F.AYESHA",
        "gender":             "Female",
        "date_of_birth":      "2005-01-06",
        "date_of_joining":    "2024-06-01",
        "mobile":             "7425297449",
        "emergency_phone":    "741014129",
        "current_address":    "NO.170/A WARAGODA,KOGGALLA,AMBALANTOTA.",
        "id_number":          None,
        "marital_status":     "Married",
    },
    {
        "emp_id":             "EMP-00211",
        "fingerprint_id":     None,
        "first_name":         "CHANDRASENA",
        "last_name":          "",
        "name_with_initials": "T.K.CHANDRASENA",
        "gender":             "Male",
        "date_of_birth":      "2003-02-02",
        "date_of_joining":    "2022-01-01",
        "mobile":             "717638650",
        "emergency_phone":    "701116567",
        "current_address":    "NO.122 PASALA ASALA,KOGGALLA,AMBALANTOTA.",
        "id_number":          "653604939V",
        "marital_status":     "Married",
    },
    {
        "emp_id":             "EMP-00212",
        "fingerprint_id":     None,
        "first_name":         "NUWAN",
        "last_name":          "SANJIWA",
        "name_with_initials": "S.G.NUWAN SANJIWA",
        "gender":             "Male",
        "date_of_birth":      "1965-12-25",
        "date_of_joining":    "2021-08-20",
        "mobile":             "703437660",
        "emergency_phone":    "719087532",
        "current_address":    "NO.516 RANDIYAGAMA,GALWEWA,AMBALANTOTA",
        "id_number":          "812172867V",
        "marital_status":     "Married",
    },
    {
        "emp_id":             "EMP-00213",
        "fingerprint_id":     None,
        "first_name":         "CHATHURA",
        "last_name":          "PRESANNA",
        "name_with_initials": "W.CHATHURA PRESANNA",
        "gender":             "Male",
        "date_of_birth":      "1981-04-08",
        "date_of_joining":    "2024-10-21",
        "mobile":             "713997144",
        "emergency_phone":    None,
        "current_address":    "NO.520 BALLAGASWEWA,BARAGAMA,AMBALANTOTA",
        "id_number":          "801024599V",
        "marital_status":     "Married",
    },
    {
        "emp_id":             "EMP-00214",
        "fingerprint_id":     None,
        "first_name":         "RANJITH",
        "last_name":          "",
        "name_with_initials": "RANJITH",
        "gender":             "Male",
        "date_of_birth":      "1980-11-04",
        "date_of_joining":    "2025-01-10",
        "mobile":             None,
        "emergency_phone":    None,
        "current_address":    None,
        "id_number":          None,
        "marital_status":     "Married",
    },
    {
        "emp_id":             "EMP-00215",
        "fingerprint_id":     None,
        "first_name":         "THEJAN",
        "last_name":          "THEJAN",
        "name_with_initials": "N.A.PASINDU THEJAN",
        "gender":             "Male",
        "date_of_birth":      "1980-11-04",
        "date_of_joining":    "2025-01-01",
        "mobile":             "742985101",
        "emergency_phone":    "772870837",
        "current_address":    None,
        "id_number":          None,
        "marital_status":     "Single",
    },
]

ALL_EMPLOYEES = GROUP_A + GROUP_B + GROUP_C


def _insert_employee(emp):
    emp_id = emp["emp_id"]

    if frappe.db.exists("Employee", emp_id):
        print(f"  [SKIP] {emp_id} already exists.")
        return "skip"

    try:
        doc = frappe.new_doc("Employee")

        # Prevent ERPNext auto-naming — set the name explicitly
        doc.name            = emp_id
        doc.employee        = emp_id
        doc.employee_number = emp_id      # <-- this was missing
        doc.naming_series   = "EMP-"

        doc.first_name      = emp["first_name"]
        doc.last_name       = emp.get("last_name") or ""
        doc.employee_name   = emp["name_with_initials"] or emp["first_name"]
        doc.company         = COMPANY
        doc.status          = "Active"
        doc.gender          = emp.get("gender") or "Male"
        doc.marital_status  = emp.get("marital_status") or "Single"
        doc.date_of_birth   = getdate(emp["date_of_birth"])
        doc.date_of_joining = getdate(emp["date_of_joining"])

        doc.cell_number               = emp.get("mobile") or ""
        doc.emergency_phone_number    = emp.get("emergency_phone") or ""
        doc.current_address           = emp.get("current_address") or ""
        doc.national_id_number        = emp.get("id_number") or ""

        if emp.get("fingerprint_id"):
            doc.attendance_device_id  = str(emp["fingerprint_id"])

        doc.insert(ignore_permissions=True, ignore_if_duplicate=True)
        frappe.db.commit()
        return "ok"

    except Exception as e:
        frappe.db.rollback()
        print(f"  [ERR]  {emp_id} – {e}")
        return "error"


def run_import():
    frappe.set_user("Administrator")
    counts = {"ok": 0, "skip": 0, "error": 0}

    groups = [
        ("GROUP A – Has FP ID + full details",      GROUP_A),
        ("GROUP B – Has FP ID, minimal details",     GROUP_B),
        ("GROUP C – No FP registered, seq EMP IDs", GROUP_C),
    ]

    for label, employees in groups:
        print(f"\n{'─'*60}")
        print(f"  {label}")
        print(f"{'─'*60}")
        for emp in employees:
            result = _insert_employee(emp)
            counts[result] += 1
            if result == "ok":
                fp = emp["fingerprint_id"] or "—"
                print(f"  [OK]  {emp['emp_id']} | FP: {str(fp):>4} | "
                      f"{emp['first_name']} {emp.get('last_name') or ''}")

    print(f"\n{'='*60}")
    print(f"  Imported : {counts['ok']}")
    print(f"  Skipped  : {counts['skip']}  (already existed)")
    print(f"  Errors   : {counts['error']}")
    print(f"{'='*60}")
