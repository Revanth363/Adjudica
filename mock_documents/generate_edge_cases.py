
"""
ClaimGuard Mock Document Generator — Edge Cases TC011 to TC020
Prescriptions: 3 templates, rotation on 3, blur on 2, shadow on 2, partial crop on 1.
Bills: proper handwritten signatures for doctor + authorised signatory.
"""

import os, random, io
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, HRFlowable, Image as RLImage
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT

OUT_PRES = "prescriptions"
OUT_BILLS = "bills"

# ── Case data ──────────────────────────────────────────────────────────────
CASES = [
    {
        "id": "TC011", "template": 2, "post": "rotate", "rotate_deg": 3.2,
        "edge": "POLICY_INACTIVE",
        "style": "printed",
        "patient": "Arjun Mehta", "age": 29, "sex": "Male",
        "date": "15/12/2023", "join_date": "01/01/2024",
        "doctor": "Dr. Rakesh Verma", "reg": "DL/23456/2017",
        "clinic": "Verma Family Clinic",
        "address": "Plot 12, Rohini Sector 7, New Delhi - 110085",
        "phone": "011-27654321",
        "diagnosis": "Acute Sinusitis",
        "complaints": ["Facial pain and pressure", "Nasal congestion", "Headache for 4 days"],
        "medicines": [
            ("Tab. Amoxicillin-Clavulanate 625mg", "1-0-1 after food", "7 days"),
            ("Tab. Levocetirizine 5mg", "0-0-1", "5 days"),
            ("Nasal Saline Drops", "2 drops each nostril TDS", "7 days"),
        ],
        "tests": ["X-Ray PNS (Paranasal Sinuses)"],
        "followup": "22/12/2023",
        "hospital": "Verma Family Clinic & Diagnostics",
        "gst": "07ABCDE1234F1Z5", "bill_no": "VFC/2023/1215",
        "bill_items": [
            ("Consultation Fee", 1, 463, 463),
            ("X-Ray PNS View", 1, 387, 387),
            ("Tab. Amoxicillin-Clavulanate 625mg x14", 1, 312, 312),
            ("Tab. Levocetirizine 5mg x5", 1, 68, 68),
            ("Nasal Saline Drops 10ml", 1, 94, 94),
        ],
        "gst_rate": 0, "sig_name": "Dr. Rakesh Verma", "auth_name": "Kavya Nair",
    },
    {
        "id": "TC012", "template": 1, "post": "shadow",
        "edge": "MEMBER_NOT_COVERED",
        "style": "handwritten",
        "patient": "Pooja Iyer", "age": 24, "sex": "Female",
        "date": "10/11/2024",
        "doctor": "Dr. Shweta Pillai", "reg": "KL/34567/2019",
        "clinic": "Pillai Women's Health Centre",
        "address": "MG Road, Trivandrum - 695001",
        "phone": "0471-2345678",
        "diagnosis": "Urinary Tract Infection (UTI)",
        "complaints": ["Burning micturition", "Frequent urination", "Lower abdominal pain"],
        "medicines": [
            ("Tab. Nitrofurantoin 100mg", "1-0-1 after food", "5 days"),
            ("Tab. Phenazopyridine 200mg", "1-1-1 for 2 days", "2 days"),
            ("Tab. Cranberry Extract", "0-0-1", "10 days"),
        ],
        "tests": ["Urine Routine & Microscopy", "Urine Culture & Sensitivity"],
        "followup": "17/11/2024",
        "hospital": "Pillai Women's Health Centre",
        "gst": "32FGHIJ5678K2L6", "bill_no": "PWHC/2024/1110",
        "bill_items": [
            ("Consultation Fee", 1, 524, 524),
            ("Urine Routine & Microscopy", 1, 178, 178),
            ("Urine Culture & Sensitivity", 1, 643, 643),
            ("Tab. Nitrofurantoin 100mg x10", 1, 213, 213),
            ("Tab. Phenazopyridine 200mg x6", 1, 87, 87),
        ],
        "gst_rate": 0, "sig_name": "Dr. Shweta Pillai", "auth_name": "Rajan Thomas",
    },
    {
        "id": "TC013", "template": 3, "post": "rotate", "rotate_deg": 4.1,
        "edge": "DOCTOR_REG_INVALID",
        "style": "printed",
        "patient": "Sanjay Kulkarni", "age": 47, "sex": "Male",
        "date": "12/11/2024",
        "doctor": "Dr. Manoj Deshpande", "reg": "MH-4567-2020",
        "clinic": "Deshpande General Hospital",
        "address": "FC Road, Pune - 411004",
        "phone": "020-25436789",
        "diagnosis": "Lower Respiratory Tract Infection",
        "complaints": ["Productive cough with yellow sputum", "Fever 101°F", "Chest heaviness"],
        "medicines": [
            ("Tab. Azithromycin 500mg", "1-0-0 before food", "5 days"),
            ("Tab. Doxycycline 100mg", "1-0-1 after food", "7 days"),
            ("Syp. Ambrodil-S 10ml", "1 tsp TDS", "5 days"),
        ],
        "tests": ["Sputum Culture", "Chest X-Ray PA"],
        "followup": "19/11/2024",
        "hospital": "Deshpande General Hospital",
        "gst": "27KLMNO9012P3Q7", "bill_no": "DGH/2024/1112",
        "bill_items": [
            ("Consultation Fee", 1, 712, 712),
            ("Chest X-Ray PA View", 1, 423, 423),
            ("Sputum Culture & Sensitivity", 1, 587, 587),
            ("Tab. Azithromycin 500mg x5", 1, 173, 173),
            ("Tab. Doxycycline 100mg x14", 1, 218, 218),
            ("Syp. Ambrodil-S 100ml", 1, 134, 134),
        ],
        "gst_rate": 0, "sig_name": "Dr. Manoj Deshpande", "auth_name": "Sunita Bhosale",
    },
    {
        "id": "TC014", "template": 2, "post": "blur",
        "edge": "PATIENT_MISMATCH",
        "style": "handwritten",
        "patient": "Rahul Sharma", "age": 35, "sex": "Male",
        "date": "14/11/2024",
        "doctor": "Dr. Amit Saxena", "reg": "UP/56789/2016",
        "clinic": "Saxena Eye & ENT Centre",
        "address": "Hazratganj, Lucknow - 226001",
        "phone": "0522-2345671",
        "diagnosis": "Allergic Rhinitis with Conjunctivitis",
        "complaints": ["Itchy watery eyes", "Sneezing fits", "Runny nose since 1 week"],
        "medicines": [
            ("Tab. Fexofenadine 180mg", "1-0-0", "10 days"),
            ("Eye Drops Olopatadine 0.1%", "1 drop each eye BD", "7 days"),
            ("Nasal Spray Fluticasone", "2 puffs each nostril OD", "14 days"),
        ],
        "tests": [],
        "followup": "21/11/2024",
        "hospital": "Saxena Eye & ENT Centre",
        "gst": "09PQRST3456U4V8", "bill_no": "SEEC/2024/1114",
        "bill_items": [
            ("Consultation Fee (ENT Specialist)", 1, 843, 843),
            ("Tab. Fexofenadine 180mg x10", 1, 234, 234),
            ("Eye Drops Olopatadine 0.1% 5ml", 1, 187, 187),
            ("Nasal Spray Fluticasone 150 doses", 1, 376, 376),
        ],
        "gst_rate": 0, "sig_name": "Dr. Amit Saxena", "auth_name": "Priya Mishra",
    },
    {
        "id": "TC015", "template": 3, "post": "crop",
        "edge": "BELOW_MIN_AMOUNT",
        "style": "printed",
        "patient": "Geeta Patel", "age": 31, "sex": "Female",
        "date": "16/11/2024",
        "doctor": "Dr. Hina Shah", "reg": "GJ/67890/2018",
        "clinic": "Shah Wellness Clinic",
        "address": "C.G. Road, Ahmedabad - 380009",
        "phone": "079-26789012",
        "diagnosis": "Mild Headache — Tension Type",
        "complaints": ["Dull headache since morning", "No fever", "Stress at work"],
        "medicines": [
            ("Tab. Paracetamol 500mg", "SOS for pain", "3 days"),
            ("Tab. Multivitamin", "0-1-0 after food", "7 days"),
        ],
        "tests": [],
        "followup": "None required",
        "hospital": "Shah Wellness Clinic",
        "gst": "24UVWXY7890Z5A9", "bill_no": "SWC/2024/1116",
        "bill_items": [
            ("Consultation Fee", 1, 199, 199),
            ("Tab. Paracetamol 500mg x6", 1, 48, 48),
            ("Tab. Multivitamin x7", 1, 100, 100),
        ],
        "gst_rate": 0, "sig_name": "Dr. Hina Shah", "auth_name": "Meera Joshi",
    },
    {
        "id": "TC016", "template": 1, "post": "shadow",
        "edge": "ANNUAL_LIMIT_EXCEEDED",
        "style": "printed",
        "patient": "Vikram Nair", "age": 44, "sex": "Male",
        "date": "18/11/2024",
        "doctor": "Dr. Sunil Menon", "reg": "KL/89012/2014",
        "clinic": "Menon Orthopaedic Clinic",
        "address": "Marine Drive, Kochi - 682031",
        "phone": "0484-2678901",
        "diagnosis": "Knee Osteoarthritis — Right",
        "complaints": ["Right knee pain since 3 months", "Difficulty climbing stairs", "Morning stiffness"],
        "medicines": [
            ("Tab. Etoricoxib 90mg", "0-1-0 after food", "10 days"),
            ("Tab. Calcium + Vit D3", "0-0-1", "30 days"),
            ("Gel Voltaren 50g", "Apply locally TDS", "10 days"),
        ],
        "tests": ["X-Ray Right Knee AP & Lateral"],
        "followup": "02/12/2024",
        "hospital": "Menon Orthopaedic & Joint Care",
        "gst": "32BCDEF2345G6H0", "bill_no": "MOJC/2024/1118",
        "bill_items": [
            ("Consultation Fee (Orthopaedic)", 1, 1124, 1124),
            ("X-Ray Right Knee (2 views)", 1, 876, 876),
            ("Tab. Etoricoxib 90mg x10", 1, 487, 487),
            ("Tab. Calcium + Vit D3 x30", 1, 213, 213),
            ("Gel Voltaren 50g", 1, 147, 147),
        ],
        "gst_rate": 0, "sig_name": "Dr. Sunil Menon", "auth_name": "Anitha George",
    },
    {
        "id": "TC017", "template": 2, "post": "rotate", "rotate_deg": 2.3,
        "edge": "SUB_LIMIT_EXCEEDED",
        "style": "handwritten",
        "patient": "Nalini Krishnan", "age": 58, "sex": "Female",
        "date": "20/11/2024",
        "doctor": "Dr. Padma Venkatesh", "reg": "TN/90123/2011",
        "clinic": "Venkatesh Rheumatology Centre",
        "address": "Anna Nagar, Chennai - 600040",
        "phone": "044-26543219",
        "diagnosis": "Rheumatoid Arthritis — Active Disease",
        "complaints": ["Swollen painful joints bilaterally", "Morning stiffness > 1 hour", "Elevated ESR and CRP"],
        "medicines": [
            ("Tab. Methotrexate 15mg", "Once weekly on Sunday", "4 weeks"),
            ("Tab. Hydroxychloroquine 400mg", "1-0-0", "30 days"),
            ("Tab. Folic Acid 5mg", "Once daily except Sunday", "30 days"),
            ("Inj. Etanercept 25mg", "Subcutaneous twice weekly", "4 weeks"),
            ("Tab. Prednisolone 10mg", "1-0-0 taper", "14 days"),
        ],
        "tests": ["ESR", "CRP", "RA Factor", "Anti-CCP Antibody"],
        "followup": "20/12/2024",
        "hospital": "Venkatesh Rheumatology Centre",
        "gst": "33GHIJK6789L7M1", "bill_no": "VRC/2024/1120",
        "bill_items": [
            ("Consultation Fee (Rheumatologist)", 1, 1876, 1876),
            ("ESR + CRP + RA Factor + Anti-CCP", 1, 1643, 1643),
            ("Tab. Methotrexate 15mg x4", 1, 284, 284),
            ("Tab. Hydroxychloroquine 400mg x30", 1, 876, 876),
            ("Tab. Folic Acid 5mg x30", 1, 143, 143),
            ("Inj. Etanercept 25mg x8", 1, 14328, 14328),
            ("Tab. Prednisolone 10mg x14", 1, 98, 98),
        ],
        "gst_rate": 18, "sig_name": "Dr. Padma Venkatesh", "auth_name": "Lavanya Srinivasan",
    },
    {
        "id": "TC018", "template": 3, "post": "blur",
        "edge": "MANUAL_REVIEW — fraud pattern",
        "style": "printed",
        "patient": "Ravi Shankar", "age": 39, "sex": "Male",
        "date": "22/11/2024",
        "doctor": "Dr. Ashok Tiwari", "reg": "MP/12345/2015",
        "clinic": "Tiwari Multi-Speciality Clinic",
        "address": "New Market, Bhopal - 462001",
        "phone": "0755-2345678",
        "diagnosis": "Acute Gastritis",
        "complaints": ["Burning epigastric pain", "Nausea after meals", "Acidity"],
        "medicines": [
            ("Tab. Pantoprazole 40mg", "1-0-0 before food", "14 days"),
            ("Tab. Domperidone 10mg", "1-1-1 before food", "5 days"),
            ("Syp. Mucaine Gel 15ml", "1 tbsp TDS after food", "5 days"),
        ],
        "tests": ["H. Pylori Antigen (Stool)"],
        "followup": "29/11/2024",
        "hospital": "Tiwari Multi-Speciality Clinic",
        "gst": "23MNOPQ4567R8S2", "bill_no": "TMC/2024/1122",
        "bill_items": [
            ("Consultation Fee", 1, 634, 634),
            ("H. Pylori Antigen Stool Test", 1, 487, 487),
            ("Tab. Pantoprazole 40mg x14", 1, 213, 213),
            ("Tab. Domperidone 10mg x15", 1, 124, 124),
            ("Syp. Mucaine Gel 170ml", 1, 178, 178),
        ],
        "gst_rate": 0, "sig_name": "Dr. Ashok Tiwari", "auth_name": "Reena Tiwari",
    },
    {
        "id": "TC019", "template": 1, "post": "none",
        "edge": "WAITING_PERIOD — Hypertension",
        "style": "handwritten",
        "patient": "Mohan Das", "age": 56, "sex": "Male",
        "date": "28/11/2024", "join_date": "01/10/2024",
        "doctor": "Dr. Rajendra Prasad", "reg": "BR/23456/2013",
        "clinic": "Prasad Heart & Hypertension Clinic",
        "address": "Boring Road, Patna - 800001",
        "phone": "0612-2345670",
        "diagnosis": "Hypertension — Newly Diagnosed (BP 160/100)",
        "complaints": ["Persistent headache", "Dizziness", "BP recorded 160/100 at home"],
        "medicines": [
            ("Tab. Amlodipine 5mg", "1-0-0", "30 days"),
            ("Tab. Losartan 50mg", "0-0-1", "30 days"),
            ("Tab. Aspirin 75mg", "0-1-0 after food", "30 days"),
        ],
        "tests": ["ECG", "Renal Function Test", "Urine Routine"],
        "followup": "28/12/2024",
        "hospital": "Prasad Heart & Hypertension Clinic",
        "gst": "10STUVW8901X9Y3", "bill_no": "PHHC/2024/1128",
        "bill_items": [
            ("Consultation Fee (Cardiologist)", 1, 987, 987),
            ("ECG 12-lead", 1, 276, 276),
            ("Renal Function Test", 1, 463, 463),
            ("Urine Routine", 1, 134, 134),
            ("Tab. Amlodipine 5mg x30", 1, 167, 167),
            ("Tab. Losartan 50mg x30", 1, 348, 348),
            ("Tab. Aspirin 75mg x30", 1, 54, 54),
        ],
        "gst_rate": 0, "sig_name": "Dr. Rajendra Prasad", "auth_name": "Sunita Kumari",
    },
    {
        "id": "TC020", "template": 1, "post": "none",
        "edge": "EXPERIMENTAL_TREATMENT",
        "style": "printed",
        "patient": "Nisha Agarwal", "age": 42, "sex": "Female",
        "date": "30/11/2024",
        "doctor": "Dr. Priya Kapoor", "reg": "RJ/34567/2017",
        "clinic": "Kapoor Cancer Research & Oncology Centre",
        "address": "Malviya Nagar, Jaipur - 302017",
        "phone": "0141-2678903",
        "diagnosis": "Stage II Breast Cancer — Post Chemotherapy Monitoring",
        "complaints": ["Fatigue", "Joint pain post chemo", "Follow-up visit"],
        "medicines": [
            ("Tab. Tamoxifen 20mg", "1-0-0", "30 days"),
            ("Tab. Letrozole 2.5mg", "0-0-1", "30 days"),
            ("Inj. Pembrolizumab 200mg (Clinical Trial)", "IV infusion Day 1", "Cycle 1"),
            ("Tab. Ondansetron 8mg", "SOS for nausea", "5 days"),
        ],
        "tests": ["CA 125 Tumour Marker", "CBC", "Liver Function Test"],
        "followup": "21/12/2024",
        "hospital": "Kapoor Cancer Research & Oncology Centre",
        "gst": "08YZABC2345D0E4", "bill_no": "KCROC/2024/1130",
        "bill_items": [
            ("Oncology Consultation Fee", 1, 2134, 2134),
            ("CA 125 Tumour Marker", 1, 876, 876),
            ("CBC - Complete Blood Count", 1, 312, 312),
            ("Liver Function Test", 1, 574, 574),
            ("Tab. Tamoxifen 20mg x30", 1, 243, 243),
            ("Tab. Letrozole 2.5mg x30", 1, 1876, 1876),
            ("Inj. Pembrolizumab 200mg (Phase III Trial)", 1, 18400, 18400),
            ("Tab. Ondansetron 8mg x10", 1, 143, 143),
        ],
        "gst_rate": 18, "sig_name": "Dr. Priya Kapoor", "auth_name": "Renu Sharma",
    },
]

# ── Template colour palettes ────────────────────────────────────────────────
TEMPLATES = {
    1: {"header_bg": (13, 71, 161),   "header_text": (255,255,255), "accent": (13, 71, 161),
        "subtext": (200,220,255), "label": "Blue — Government / Corporate"},
    2: {"header_bg": (27, 94, 32),    "header_text": (255,255,255), "accent": (27, 94, 32),
        "subtext": (200,230,200), "label": "Green — Clinic / Wellness"},
    3: {"header_bg": (136, 14, 14),   "header_text": (255,255,255), "accent": (136, 14, 14),
        "subtext": (255,205,205), "label": "Dark Red — Specialist / Hospital"},
}

# ── Font loader ─────────────────────────────────────────────────────────────
def load_fonts():
    base = "/usr/share/fonts/truetype/dejavu/"
    try:
        return {
            "lg":     ImageFont.truetype(base + "DejaVuSans-Bold.ttf", 22),
            "md":     ImageFont.truetype(base + "DejaVuSans-Bold.ttf", 16),
            "sm":     ImageFont.truetype(base + "DejaVuSans.ttf", 14),
            "xs":     ImageFont.truetype(base + "DejaVuSans.ttf", 12),
            "italic": ImageFont.truetype(base + "DejaVuSans-Oblique.ttf", 13),
            "rx":     ImageFont.truetype(base + "DejaVuSans-Bold.ttf", 36),
            "sig":    ImageFont.truetype("DancingScript.ttf", 34),
            "sig_sm": ImageFont.truetype("DancingScript.ttf", 17),
            "caveat": ImageFont.truetype("Caveat.ttf", 18),
        }
    except:
        d = ImageFont.load_default()
        return {k: d for k in ["lg","md","sm","xs","italic","rx","sig","sig_sm","caveat"]}


# ── Signature image helper ──────────────────────────────────────────────────
def make_sig_image(name, width=300, height=62, color=(10,10,120)):
    img = Image.new("RGBA", (width, height), (255,255,255,0))
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("DancingScript.ttf", 34)
    except:
        font = ImageFont.load_default()
    draw.text((8, 6), name, fill=color, font=font)
    return img

def sig_image_bytes(name, width=260, height=58, color=(10,10,120)):
    img = make_sig_image(name, width, height, color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


# ── Post-processing effects ─────────────────────────────────────────────────
def apply_post(img, case):
    effect = case.get("post", "none")
    W, H = img.size

    if effect == "rotate":
        deg = case.get("rotate_deg", 3.0)
        # Expand canvas slightly so corners don't clip
        img = img.rotate(-deg, expand=True, fillcolor=(245, 243, 238))
        # Crop back to A4 size centred
        nw, nh = img.size
        left = (nw - W) // 2
        top  = (nh - H) // 2
        img  = img.crop((left, top, left + W, top + H))

    elif effect == "shadow":
        # Create larger canvas, paste original with offset, add dark strip underneath
        pad = 18
        canvas = Image.new("RGB", (W + pad, H + pad), (210, 210, 210))
        # Shadow layer — dark offset
        shadow = Image.new("RGB", (W, H), (160, 160, 160))
        canvas.paste(shadow, (pad, pad))
        canvas.paste(img, (0, 0))
        img = canvas.crop((0, 0, W, H))

    elif effect == "blur":
        img = img.filter(ImageFilter.GaussianBlur(radius=1.4))

    elif effect == "crop":
        # Cut off the bottom ~12% — like someone photographed it slightly short
        crop_h = int(H * 0.88)
        img = img.crop((0, 0, W, crop_h))
        # Pad back to same size with white so file dimensions are consistent
        padded = Image.new("RGB", (W, H), (252, 250, 245))
        padded.paste(img, (0, 0))
        img = padded

    return img


# ── Printed prescription (3 templates) ─────────────────────────────────────
def make_printed_prescription(case, out_path):
    W, H   = 794, 1123
    tmpl   = TEMPLATES[case["template"]]
    hbg    = tmpl["header_bg"]
    htxt   = tmpl["header_text"]
    acc    = tmpl["accent"]
    sub    = tmpl["subtext"]
    F      = load_fonts()

    img  = Image.new("RGB", (W, H), color=(252, 250, 245))
    draw = ImageDraw.Draw(img)

    # Header band
    draw.rectangle([0, 0, W, 135], fill=hbg)
    draw.text((30, 18),  case["clinic"],           fill=htxt, font=F["lg"])
    draw.text((30, 48),  case["address"],           fill=sub,  font=F["xs"])
    draw.text((30, 68),  f"Ph: {case['phone']}",   fill=sub,  font=F["xs"])
    draw.text((W-320,18),case["doctor"],            fill=htxt, font=F["md"])
    draw.text((W-320,44),f"Reg. No: {case['reg']}", fill=sub, font=F["xs"])
    draw.text((W-320,64),"MBBS, MD (General Medicine)", fill=sub, font=F["xs"])
    draw.line([0, 135, W, 135], fill=hbg, width=3)

    # Date
    draw.text((W-200, 148), f"Date: {case['date']}", fill=(50,50,50), font=F["sm"])

    # Patient box
    draw.rectangle([30,148,W-30,218], outline=(180,180,180), width=1)
    draw.text((40,158), f"Patient Name:  {case['patient']}",          fill=(30,30,30), font=F["sm"])
    draw.text((40,178), f"Age / Sex:         {case['age']} yrs / {case['sex']}", fill=(30,30,30), font=F["sm"])
    draw.text((40,198), f"Diagnosis:          {case['diagnosis']}",   fill=(30,30,30), font=F["sm"])

    # Complaints
    y = 238
    draw.text((30,y), "Chief Complaints:", fill=tuple(acc), font=F["md"]); y += 24
    for c in case.get("complaints", []):
        draw.text((50,y), f"•  {c}", fill=(50,50,50), font=F["sm"]); y += 20

    # Rx divider
    y += 10
    draw.line([30,y,W-30,y], fill=(200,200,200), width=1); y += 10
    draw.text((30,y), "Rx", fill=tuple(acc), font=F["rx"]); y += 50

    # Medicines
    for i, (name, dosage, duration) in enumerate(case.get("medicines", []), 1):
        draw.text((60,y),  f"{i}.  {name}",                   fill=(20,20,20),   font=F["sm"]); y += 18
        draw.text((80,y),  f"     {dosage}   ×   {duration}", fill=(80,80,80),   font=F["italic"]); y += 22

    # Investigations
    if case.get("tests"):
        y += 8
        draw.text((30,y), "Investigations:", fill=tuple(acc), font=F["md"]); y += 22
        for t in case["tests"]:
            draw.text((50,y), f"☐  {t}", fill=(50,50,50), font=F["sm"]); y += 20

    # Follow-up
    if case.get("followup"):
        y += 15
        draw.text((30,y), f"Follow-up:  {case['followup']}", fill=tuple(acc), font=F["md"])

    # Signature area
    draw.line([30,H-155,W-30,H-155], fill=(200,200,200), width=1)
    draw.text((30,H-143), "Doctor's Signature & Stamp", fill=(120,120,120), font=F["xs"])

    sig_img = make_sig_image(case["sig_name"], width=320, height=65, color=(10,10,120))
    img.paste(sig_img, (45, H-128), sig_img)
    draw.text((50, H-56), case["reg"], fill=(90,90,90), font=F["sig_sm"])

    # Stamp circle (uses accent colour)
    draw.ellipse([W-188,H-153,W-52,H-62], outline=tuple(acc), width=2)
    draw.ellipse([W-186,H-151,W-54,H-64], outline=tuple(acc), width=1)
    draw.text((W-175,H-138), case["clinic"][:14], fill=tuple(acc), font=F["xs"])
    draw.text((W-167,H-120), case["reg"][:16],   fill=tuple(acc), font=F["xs"])
    draw.text((W-160,H-102), case["phone"],       fill=tuple(acc), font=F["xs"])

    img = apply_post(img, case)
    img.save(out_path, "PNG", quality=95)
    print(f"  ✓ Prescription  [{case['post']:8s}] [T{case['template']}] → {out_path}")


# ── Handwritten prescription (3 templates via paper/ink colour) ─────────────
def make_handwritten_prescription(case, out_path):
    W, H  = 794, 1123
    tmpl  = TEMPLATES[case["template"]]
    acc   = tmpl["accent"]
    F     = load_fonts()

    # Paper tints per template
    paper_colours = {1:(255,253,240), 2:(245,255,245), 3:(255,248,248)}
    line_colours  = {1:(180,200,230), 2:(180,220,180), 3:(220,180,180)}
    paper = paper_colours[case["template"]]
    lc    = line_colours[case["template"]]

    img  = Image.new("RGB", (W,H), color=paper)
    draw = ImageDraw.Draw(img)

    for y_line in range(80, H-60, 30):
        draw.line([40,y_line,W-40,y_line], fill=lc, width=1)
    draw.line([90,0,90,H], fill=(255,160,160), width=2)

    y = 30
    draw.text((100,y), case["clinic"],                                    fill=tuple(acc), font=F["md"]); y+=28
    draw.text((100,y), f"{case['doctor']}   Reg: {case['reg']}",          fill=tuple(acc), font=F["xs"]); y+=28
    draw.text((100,y), case.get("address",""),                            fill=(80,80,80), font=F["xs"]); y+=35
    draw.text((W-250,y-10), f"Date: {case['date']}",                     fill=(40,40,40), font=F["xs"])
    draw.text((100,y), f"Patient: {case['patient']}   Age: {case['age']}y  Sex: {case['sex']}",
              fill=(30,30,30), font=F["italic"]); y+=30
    draw.text((100,y), f"Dx: {case['diagnosis']}", fill=(180,20,20), font=F["italic"]); y+=40

    draw.text((100,y), "Rx", fill=tuple(acc), font=F["rx"]); y+=44

    for i,(name,dosage,duration) in enumerate(case.get("medicines",[]),1):
        off = random.randint(-2,2)
        draw.text((110,y+off), f"{i}) {name}",            fill=(20,20,20), font=F["italic"]); y+=25
        draw.text((130,y+off), f"   {dosage}  x  {duration}", fill=(60,60,60), font=F["xs"]);  y+=28

    if case.get("tests"):
        y+=5; draw.text((100,y),"Investigations:", fill=tuple(acc), font=F["md"]); y+=25
        for t in case["tests"]:
            draw.text((115,y),f"[ ] {t}", fill=(40,40,40), font=F["italic"]); y+=25

    if case.get("followup"):
        y+=10; draw.text((100,y),f"F/U: {case['followup']}", fill=tuple(acc), font=F["italic"])

    # Handwriting signature
    sig_img = make_sig_image(case["sig_name"], width=300, height=62, color=(10,10,120))
    img.paste(sig_img, (100,H-120), sig_img)
    draw.text((100,H-55), case["reg"], fill=(70,70,70), font=F["caveat"])

    # Slight random rotation for handwritten feel BEFORE post-processing
    base_angle = random.uniform(-0.8, 0.8)
    img = img.rotate(base_angle, expand=False, fillcolor=paper)

    img = apply_post(img, case)
    img.save(out_path, "PNG", quality=95)
    print(f"  ✓ Prescription  [{case['post']:8s}] [T{case['template']}] → {out_path}")


# ── Bill PDF with real signature images ─────────────────────────────────────
def make_bill_pdf(case, out_path):
    doc = SimpleDocTemplate(out_path, pagesize=A4,
                            leftMargin=20*mm, rightMargin=20*mm,
                            topMargin=15*mm, bottomMargin=15*mm)
    W = A4[0] - 40*mm

    blue       = colors.HexColor("#0D47A1")
    light_blue = colors.HexColor("#E3F2FD")
    dark       = colors.HexColor("#212121")
    mid        = colors.HexColor("#616161")

    hs  = ParagraphStyle("hs",  fontSize=18, textColor=blue, fontName="Helvetica-Bold", alignment=TA_CENTER)
    ss  = ParagraphStyle("ss",  fontSize=9,  textColor=mid,  fontName="Helvetica",      alignment=TA_CENTER)
    ls  = ParagraphStyle("ls",  fontSize=9,  textColor=mid,  fontName="Helvetica")
    vs  = ParagraphStyle("vs",  fontSize=10, textColor=dark, fontName="Helvetica-Bold")
    ns  = ParagraphStyle("ns",  fontSize=8,  textColor=mid,  fontName="Helvetica-Oblique")
    tds = ParagraphStyle("tds", fontSize=9,  textColor=dark, fontName="Helvetica")
    tdr = ParagraphStyle("tdr", fontSize=9,  textColor=dark, fontName="Helvetica", alignment=TA_RIGHT)
    ths = ParagraphStyle("ths", fontSize=9,  textColor=colors.white, fontName="Helvetica-Bold", alignment=TA_CENTER)

    story = []

    # Header
    story.append(Paragraph(case["hospital"], hs))
    story.append(Spacer(1,2*mm))
    story.append(Paragraph(case.get("address",""), ss))
    story.append(Paragraph(f"GST No: {case['gst']}  |  Ph: {case.get('phone','')}", ss))
    story.append(HRFlowable(width="100%", thickness=2, color=blue, spaceAfter=4*mm))

    # Bill + Patient info
    half  = W/2 - 5*mm
    cw    = [28*mm, half-28*mm]
    bi = [[Paragraph("Bill No:", ls), Paragraph(case["bill_no"], vs)],
          [Paragraph("Date:",    ls), Paragraph(case["date"],    vs)],
          [Paragraph("Payment:", ls), Paragraph("Cash / UPI",   vs)]]
    pi = [[Paragraph("Patient Name:", ls), Paragraph(case["patient"],                      vs)],
          [Paragraph("Age / Sex:",    ls), Paragraph(f"{case['age']} yrs / {case['sex']}", vs)],
          [Paragraph("Ref. Doctor:",  ls), Paragraph(case.get("doctor") or "Self",         vs)]]
    combo = Table([[Table(bi,colWidths=cw), Table(pi,colWidths=cw)]], colWidths=[half,half])
    combo.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP")]))
    story.append(combo)
    story.append(Spacer(1,4*mm))
    story.append(HRFlowable(width="100%",thickness=1,color=colors.HexColor("#BBDEFB"),spaceAfter=3*mm))

    # Items table
    col_widths = [12*mm, W-12*mm-18*mm-25*mm-28*mm, 18*mm, 25*mm, 28*mm]
    rows = [[Paragraph("S.No",ths), Paragraph("Particulars",ths),
             Paragraph("Qty",ths),  Paragraph("Rate (₹)",ths), Paragraph("Amount (₹)",ths)]]
    subtotal = 0
    for i,(name,qty,rate,amt) in enumerate(case["bill_items"],1):
        rows.append([
            Paragraph(str(i), ParagraphStyle("c",fontSize=9,alignment=TA_CENTER)),
            Paragraph(name, tds),
            Paragraph(str(qty), ParagraphStyle("c",fontSize=9,alignment=TA_CENTER)),
            Paragraph(f"{rate:,.0f}", tdr),
            Paragraph(f"{amt:,.0f}", tdr),
        ])
        subtotal += amt

    it = Table(rows, colWidths=col_widths, repeatRows=1)
    it.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0),blue),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,light_blue]),
        ("GRID",(0,0),(-1,-1),0.5,colors.HexColor("#BBDEFB")),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
        ("TOPPADDING",(0,0),(-1,-1),4), ("BOTTOMPADDING",(0,0),(-1,-1),4),
        ("LEFTPADDING",(0,0),(-1,-1),4),("RIGHTPADDING",(0,0),(-1,-1),4),
    ]))
    story.append(it)
    story.append(Spacer(1,3*mm))

    # Totals
    gst_amt     = round(subtotal * case["gst_rate"] / 100)
    grand_total = subtotal + gst_amt
    td = [["","Sub Total:", f"₹ {subtotal:,.0f}"]]
    if case["gst_rate"] > 0:
        td.append(["", f"GST ({case['gst_rate']}%):", f"₹ {gst_amt:,.0f}"])
    td.append(["","GRAND TOTAL:", f"₹ {grand_total:,.0f}"])
    tt = Table(td, colWidths=[W-70*mm-35*mm, 70*mm, 35*mm])
    tt.setStyle(TableStyle([
        ("ALIGN",(1,0),(2,-1),"RIGHT"),
        ("FONTNAME",(1,-1),(2,-1),"Helvetica-Bold"),("FONTSIZE",(1,-1),(2,-1),11),
        ("TEXTCOLOR",(1,-1),(2,-1),blue),("LINEABOVE",(1,-1),(2,-1),1,blue),
        ("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3),
    ]))
    story.append(tt)
    story.append(Spacer(1,5*mm))
    story.append(Paragraph(f"Amount in Words: <b>Rupees {grand_total:,.0f} Only</b>",
                            ParagraphStyle("aw",fontSize=9,fontName="Helvetica")))
    story.append(Spacer(1,8*mm))

    # ── Signature images in PDF ──
    story.append(HRFlowable(width="100%",thickness=1,
                            color=colors.HexColor("#BBDEFB"),spaceBefore=3*mm,spaceAfter=4*mm))

    doc_buf  = sig_image_bytes(case["sig_name"],  width=240, height=55, color=(10,10,120))
    auth_buf = sig_image_bytes(case["auth_name"], width=240, height=55, color=(10,10,120))
    doc_img  = RLImage(doc_buf,  width=58*mm, height=13*mm)
    auth_img = RLImage(auth_buf, width=58*mm, height=13*mm)

    sig_tbl = Table([[doc_img, auth_img]], colWidths=[W/2, W/2])
    sig_tbl.setStyle(TableStyle([
        ("ALIGN",(0,0),(0,0),"LEFT"),("ALIGN",(1,0),(1,0),"RIGHT"),
        ("VALIGN",(0,0),(-1,-1),"BOTTOM"),
    ]))
    story.append(sig_tbl)

    lbl_tbl = Table([[
        Paragraph("Doctor's Signature", ns),
        Paragraph("Authorised Signatory",
                  ParagraphStyle("nr",fontSize=8,textColor=mid,
                                 fontName="Helvetica-Oblique",alignment=TA_RIGHT))
    ]], colWidths=[W/2, W/2])
    story.append(lbl_tbl)
    story.append(Spacer(1,2*mm))
    story.append(Paragraph("This is a computer-generated bill and is valid without signature.",
                            ParagraphStyle("disc",fontSize=7,textColor=mid,
                                           fontName="Helvetica-Oblique",alignment=TA_CENTER)))
    doc.build(story)
    print(f"  ✓ Bill                               → {out_path}")


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    print("\n=== ClaimGuard Edge Cases TC011–TC020 ===\n")
    for case in CASES:
        cid = case["id"]
        print(f"[{cid}] {case['patient']} — {case['edge']}")
        pres_path = os.path.join(OUT_PRES, f"{cid}_prescription.png")
        bill_path = os.path.join(OUT_BILLS, f"{cid}_bill.pdf")
        if case["style"] == "printed":
            make_printed_prescription(case, pres_path)
        else:
            make_handwritten_prescription(case, pres_path)
        make_bill_pdf(case, bill_path)
        print()
    print("Done. Prescriptions → ./prescriptions/   Bills → ./bills/")

if __name__ == "__main__":
    main()

