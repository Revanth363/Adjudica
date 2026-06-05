"""
Mock Medical Document Generator
Generates realistic prescription images (PNG) and hospital bill PDFs
for testing the ClaimGuard OPD adjudication engine.
"""

import os
import math
import random
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.pdfgen import canvas

OUT_PRES = "prescriptions"
OUT_BILLS = "bills"

# ─────────────────────────────────────────────
# CASE DATA
# ─────────────────────────────────────────────

CASES = [
    {
        "id": "TC001",
        "style": "printed",
        "patient": "Rajesh Kumar",
        "age": 34, "sex": "Male",
        "date": "01/11/2024",
        "doctor": "Dr. Anil Sharma",
        "reg": "KA/45678/2015",
        "clinic": "Sharma Medical Centre",
        "address": "14, MG Road, Bengaluru - 560001",
        "phone": "080-23456789",
        "diagnosis": "Viral Fever with Mild URI",
        "complaints": ["High grade fever since 3 days", "Sore throat", "Body ache"],
        "medicines": [
            ("Tab. Paracetamol 650mg", "1-0-1 after food", "5 days"),
            ("Tab. Vitamin C 500mg", "0-0-1 after food", "7 days"),
            ("Syp. Benadryl 10ml", "1 tsp twice daily", "3 days"),
        ],
        "tests": ["CBC", "Dengue NS1 Antigen"],
        "followup": "07/11/2024",
        "hospital": "Sharma Medical Centre",
        "gst": "29ABCDE1234F1Z5",
        "bill_no": "SMC/2024/1101",
        "bill_items": [
            ("Consultation Fee", 1, 380, 380),
            ("CBC - Complete Blood Count", 1, 312, 312),
            ("Dengue NS1 Antigen Test", 1, 198, 198),
        ],
        "gst_rate": 0,
    },
    {
        "id": "TC002",
        "style": "printed",
        "patient": "Priya Singh",
        "age": 28, "sex": "Female",
        "date": "15/10/2024",
        "doctor": "Dr. Ramesh Patel",
        "reg": "MH/23456/2018",
        "clinic": "Patel Dental Care",
        "address": "Plot 7, Andheri West, Mumbai - 400053",
        "phone": "022-28901234",
        "diagnosis": "Tooth Decay — Root Canal Indicated (Tooth #36)",
        "complaints": ["Severe tooth pain since 1 week", "Sensitivity to hot/cold", "Swelling in lower jaw"],
        "medicines": [
            ("Tab. Amoxicillin 500mg", "1-0-1 after food", "5 days"),
            ("Tab. Ibuprofen 400mg", "SOS for pain", "3 days"),
            ("Chlorhexidine Mouthwash", "Rinse twice daily", "7 days"),
        ],
        "procedures": ["Root Canal Treatment - Tooth #36", "Teeth Whitening (Patient requested)"],
        "tests": [],
        "followup": "22/10/2024",
        "hospital": "Patel Dental Care & Implant Centre",
        "gst": "27FGHIJ5678K2L6",
        "bill_no": "PDC/2024/1015",
        "bill_items": [
            ("Root Canal Treatment - Tooth #36", 1, 7840, 7840),
            ("Teeth Whitening (Cosmetic)", 1, 3950, 3950),
            ("Tab. Amoxicillin 500mg x10", 1, 114, 114),
            ("Chlorhexidine Mouthwash 200ml", 1, 176, 176),
        ],
        "gst_rate": 18,
    },
    {
        "id": "TC003",
        "style": "handwritten",
        "patient": "Vikram Joshi",
        "age": 52, "sex": "Male",
        "date": "15/10/2024",
        "doctor": "Dr. Sanjay Mehta",
        "reg": "GJ/56789/2014",
        "clinic": "Mehta Diabetes & Endocrine Clinic",
        "address": "22, CG Road, Ahmedabad - 380006",
        "phone": "079-26543210",
        "diagnosis": "Type 2 Diabetes Mellitus — Newly Diagnosed",
        "complaints": ["Increased thirst and urination", "Weight loss", "Fatigue"],
        "medicines": [
            ("Tab. Metformin 500mg", "1-0-1 after food", "30 days"),
            ("Tab. Glimepiride 1mg", "1-0-0 before breakfast", "30 days"),
            ("Tab. Vitamin B12 500mcg", "0-0-1", "30 days"),
        ],
        "tests": ["Fasting Blood Sugar", "HbA1c", "Lipid Profile", "KFT"],
        "followup": "15/11/2024",
        "hospital": "Mehta Diabetes & Endocrine Clinic",
        "gst": "24KLMNO9012P3Q7",
        "bill_no": "MDEC/2024/1015",
        "bill_items": [
            ("Consultation Fee (Specialist)", 1, 620, 620),
            ("Fasting Blood Sugar", 1, 134, 134),
            ("HbA1c Test", 1, 487, 487),
            ("Lipid Profile", 1, 574, 574),
            ("Kidney Function Test (KFT)", 1, 423, 423),
            ("Tab. Metformin 500mg x30", 1, 167, 167),
            ("Tab. Glimepiride 1mg x30", 1, 108, 108),
        ],
        "gst_rate": 0,
    },
    {
        "id": "TC004",
        "style": "printed",
        "patient": "Meena Iyer",
        "age": 41, "sex": "Female",
        "date": "20/10/2024",
        "doctor": "Dr. Krishnamurthy R.",
        "reg": "TN/34521/2013",
        "clinic": "Sri Balaji Medical Centre",
        "address": "45, Anna Salai, Chennai - 600002",
        "phone": "044-28123456",
        "diagnosis": "Acute Gastroenteritis",
        "complaints": ["Vomiting since morning", "Loose stools", "Abdominal cramps"],
        "medicines": [
            ("Tab. Ondansetron 4mg", "SOS for vomiting", "3 days"),
            ("Tab. Norfloxacin 400mg", "1-0-1 before food", "5 days"),
            ("ORS Sachet", "After every loose stool", "5 days"),
        ],
        "tests": ["Stool Routine"],
        "followup": "25/10/2024",
        "hospital": "Sri Balaji Medical Centre",
        "gst": "33PQRST3456U4V8",
        "bill_no": "SBMC/2024/1020",
        # Round numbers — fraud flag
        "bill_items": [
            ("Consultation Fee", 1, 500, 500),
            ("Stool Routine Examination", 1, 500, 500),
            ("Tab. Norfloxacin 400mg x10", 1, 500, 500),
            ("ORS Sachet x5", 1, 500, 500),
        ],
        "gst_rate": 0,
    },
    {
        "id": "TC005",
        "style": "handwritten",
        "patient": "Suresh Patil",
        "age": 45, "sex": "Male",
        "date": "02/11/2024",
        "doctor": "Dr. Venkata Rao",
        "reg": "AP/67890/2017",
        "clinic": "Rao Neuro & Spine Clinic",
        "address": "8-2-293, Road No. 78, Jubilee Hills, Hyderabad - 500033",
        "phone": "040-23456712",
        "diagnosis": "Suspected Lumbar Disc Herniation (L4-L5)",
        "complaints": ["Lower back pain radiating to left leg", "Numbness in foot", "Pain since 3 weeks"],
        "medicines": [
            ("Tab. Diclofenac 50mg", "1-0-1 after food", "5 days"),
            ("Tab. Pregabalin 75mg", "0-0-1", "10 days"),
            ("Ointment Volini", "Apply locally twice daily", "7 days"),
        ],
        "tests": ["MRI Lumbar Spine (Contrast)"],
        "followup": "09/11/2024",
        "hospital": "Apollo Diagnostics",
        "gst": "36UVWXY7890Z5A9",
        "bill_no": "APDIAG/2024/1102",
        "bill_items": [
            ("MRI Lumbar Spine with Contrast", 1, 11840, 11840),
            ("Radiologist Report Charges", 1, 1375, 1375),
            ("CD / Film Charges", 1, 185, 185),
            ("Tab. Pregabalin 75mg x10", 1, 284, 284),
        ],
        "gst_rate": 18,
    },
    {
        "id": "TC006",
        "style": "printed",
        "patient": "Anita Desai",
        "age": 38, "sex": "Female",
        "date": "18/10/2024",
        "doctor": "Dr. Subhash Banerjee",
        "reg": "WB/34567/2015",
        "clinic": "Banerjee Wellness & Obesity Clinic",
        "address": "12, Park Street, Kolkata - 700016",
        "phone": "033-22345678",
        "diagnosis": "Obesity — BMI 35.2 kg/m²",
        "complaints": ["Weight gain over 2 years", "Breathlessness on exertion", "Joint pain"],
        "medicines": [
            ("Tab. Orlistat 120mg", "1-1-1 with meals", "30 days"),
            ("Protein Supplement Powder", "1 scoop daily", "30 days"),
        ],
        "procedures": ["Bariatric Consultation", "Customised Diet Plan (3 months)"],
        "tests": ["Thyroid Profile", "Fasting Insulin"],
        "followup": "18/11/2024",
        "hospital": "Banerjee Wellness & Obesity Clinic",
        "gst": "19BCDEF2345G6H0",
        "bill_no": "BWOC/2024/1018",
        "bill_items": [
            ("Bariatric Specialist Consultation", 1, 2850, 2850),
            ("Customised Diet Plan (3 months)", 1, 4799, 4799),
            ("Thyroid Profile (T3/T4/TSH)", 1, 618, 618),
            ("Fasting Insulin Level", 1, 436, 436),
            ("Tab. Orlistat 120mg x30", 1, 763, 763),
        ],
        "gst_rate": 18,
    },
    {
        "id": "TC007",
        "style": "printed",
        "patient": "Sneha Reddy",
        "age": 26, "sex": "Female",
        "date": "25/10/2024",
        "doctor": None,  # Missing prescription case
        "reg": None,
        "clinic": None,
        "address": None,
        "phone": None,
        "diagnosis": "Unknown",
        "complaints": [],
        "medicines": [],
        "tests": [],
        "followup": None,
        "hospital": "City Medical Store & Clinic",
        "gst": "29GHIJK6789L7M1",
        "bill_no": "CMS/2024/1025",
        "bill_items": [
            ("Consultation Fee", 1, 420, 420),
            ("Tab. Azithromycin 500mg x5", 1, 237, 237),
            ("Tab. Cetirizine 10mg x10", 1, 74, 74),
            ("Nasal Spray Otrivin", 1, 163, 163),
        ],
        "gst_rate": 0,
    },
    {
        "id": "TC008",
        "style": "printed",
        "patient": "Deepak Shah",
        "age": 55, "sex": "Male",
        "date": "03/11/2024",
        "doctor": "Dr. Suresh Iyer",
        "reg": "TN/56789/2013",
        "clinic": "Apollo Hospitals",
        "address": "21, Greams Road, Chennai - 600006",
        "phone": "044-28296000",
        "diagnosis": "Acute Bronchitis",
        "complaints": ["Productive cough since 5 days", "Mild fever", "Chest tightness"],
        "medicines": [
            ("Tab. Azithromycin 500mg", "1-0-0 before food", "5 days"),
            ("Syp. Ascoril LS 10ml", "1 tsp three times daily", "5 days"),
            ("Tab. Montelukast 10mg", "0-0-1", "7 days"),
        ],
        "tests": ["X-Ray Chest PA View", "CBC"],
        "followup": "10/11/2024",
        "hospital": "Apollo Hospitals — Chennai",
        "gst": "33MNOPQ4567R8S2",
        "bill_no": "APCH/2024/1103",
        "bill_items": [
            ("Specialist Consultation Fee", 1, 1450, 1450),
            ("X-Ray Chest PA View", 1, 587, 587),
            ("CBC - Complete Blood Count", 1, 312, 312),
            ("Tab. Azithromycin 500mg x5", 1, 173, 173),
            ("Syp. Ascoril LS 100ml", 1, 138, 138),
            ("Tab. Montelukast 10mg x7", 1, 196, 196),
            ("Network Cashless Discount (20%)", 1, -571, -571),
        ],
        "gst_rate": 0,
        "network": True,
    },
    {
        "id": "TC009",
        "style": "handwritten",
        "patient": "Ramesh Nair",
        "age": 60, "sex": "Male",
        "date": "05/11/2024",
        "doctor": "Dr. Pradeep Kumar",
        "reg": "KL/78901/2012",
        "clinic": "Kerala Heart & General Hospital",
        "address": "MG Road, Kochi - 682016",
        "phone": "0484-2345678",
        "diagnosis": "Hypertension with Dyslipidaemia",
        "complaints": ["Headache", "Dizziness", "BP: 160/100 mmHg"],
        "medicines": [
            ("Tab. Amlodipine 5mg", "1-0-0", "30 days"),
            ("Tab. Atorvastatin 20mg", "0-0-1", "30 days"),
            ("Tab. Aspirin 75mg", "0-1-0 after food", "30 days"),
            ("Tab. Telmisartan 40mg", "1-0-0", "30 days"),
        ],
        "tests": ["Lipid Profile", "ECG", "2D Echo", "Renal Function Test"],
        "followup": "05/12/2024",
        "hospital": "Kerala Heart & General Hospital",
        "gst": "32STUVW8901X9Y3",
        "bill_no": "KHGH/2024/1105",
        "bill_items": [
            ("Specialist Consultation (Cardiology)", 1, 1750, 1750),
            ("ECG", 1, 276, 276),
            ("2D Echocardiography", 1, 3284, 3284),
            ("Lipid Profile", 1, 574, 574),
            ("Renal Function Test", 1, 463, 463),
            ("Tab. Amlodipine 5mg x30", 1, 167, 167),
            ("Tab. Atorvastatin 20mg x30", 1, 228, 228),
            ("Tab. Telmisartan 40mg x30", 1, 398, 398),
            ("Tab. Aspirin 75mg x30", 1, 54, 54),
        ],
        "gst_rate": 0,
    },
    {
        "id": "TC010",
        "style": "handwritten",
        "patient": "Kavita Sharma",
        "age": 33, "sex": "Female",
        "date": "08/11/2024",
        "doctor": "Dr. Nitin Gupta",
        "reg": "DL/12345/2016",
        "clinic": "Gupta Multi-Speciality Clinic",
        "address": "34, Karol Bagh, New Delhi - 110005",
        "phone": "011-45678901",
        "diagnosis": "Migraine — Chronic",
        "complaints": ["Severe unilateral headache", "Nausea", "Light sensitivity"],
        "medicines": [
            ("Tab. Sumatriptan 50mg", "SOS during attack", "—"),
            ("Tab. Propranolol 40mg", "1-0-1", "30 days"),
            # Mismatched — joint pain medicine for migraine (low confidence flag)
            ("Tab. Diclofenac 50mg", "1-0-1 after food", "5 days"),
            ("Cap. Flunarizine 10mg", "0-0-1", "30 days"),
        ],
        "tests": ["MRI Brain (Plain)", "CBC"],
        "followup": "22/11/2024",
        "hospital": "Gupta Multi-Speciality Clinic",
        "gst": "07YZABC2345D0E4",
        "bill_no": "GMSC/2024/1108",
        "bill_items": [
            ("Consultation Fee", 1, 743, 743),
            ("MRI Brain Plain", 1, 6284, 6284),
            ("CBC", 1, 312, 312),
            ("Tab. Sumatriptan 50mg x6", 1, 396, 396),
            ("Tab. Propranolol 40mg x30", 1, 143, 143),
            ("Tab. Diclofenac 50mg x10", 1, 76, 76),
        ],
        "gst_rate": 18,
    },
]


# ─────────────────────────────────────────────
# PRESCRIPTION IMAGE GENERATOR
# ─────────────────────────────────────────────

def make_printed_prescription(case, out_path):
    W, H = 794, 1123  # A4 at 96dpi
    img = Image.new("RGB", (W, H), color=(252, 250, 245))
    draw = ImageDraw.Draw(img)

    try:
        font_lg = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
        font_md = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
        font_sm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
        font_xs = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
        font_italic = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf", 13)
        font_rx = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
    except:
        font_lg = font_md = font_sm = font_xs = font_italic = font_rx = ImageFont.load_default()

    # Header background
    draw.rectangle([0, 0, W, 130], fill=(13, 71, 161))

    # Clinic name
    draw.text((30, 18), case["clinic"], fill="white", font=font_lg)
    draw.text((30, 48), case["address"], fill=(200, 220, 255), font=font_xs)
    draw.text((30, 68), f"Ph: {case['phone']}", fill=(200, 220, 255), font=font_xs)

    # Doctor info on right
    doc_text = case["doctor"]
    draw.text((W - 320, 18), doc_text, fill="white", font=font_md)
    draw.text((W - 320, 44), f"Reg. No: {case['reg']}", fill=(200, 220, 255), font=font_xs)
    draw.text((W - 320, 64), "MBBS, MD (General Medicine)", fill=(200, 220, 255), font=font_xs)

    # Divider
    draw.line([0, 130, W, 130], fill=(13, 71, 161), width=3)

    # Date
    draw.text((W - 200, 145), f"Date: {case['date']}", fill=(50, 50, 50), font=font_sm)

    # Patient info box
    draw.rectangle([30, 145, W - 30, 215], outline=(180, 180, 180), width=1)
    draw.text((40, 155), f"Patient Name:  {case['patient']}", fill=(30, 30, 30), font=font_sm)
    draw.text((40, 175), f"Age / Sex:         {case['age']} yrs / {case['sex']}", fill=(30, 30, 30), font=font_sm)
    draw.text((40, 195), f"Diagnosis:          {case['diagnosis']}", fill=(30, 30, 30), font=font_sm)

    # Complaints
    y = 235
    draw.text((30, y), "Chief Complaints:", fill=(13, 71, 161), font=font_md)
    y += 24
    for c in case.get("complaints", []):
        draw.text((50, y), f"•  {c}", fill=(50, 50, 50), font=font_sm)
        y += 20

    # Rx symbol
    y += 10
    draw.line([30, y, W - 30, y], fill=(200, 200, 200), width=1)
    y += 10
    draw.text((30, y), "Rx", fill=(13, 71, 161), font=font_rx)
    y += 50

    # Medicines
    for i, med in enumerate(case.get("medicines", []), 1):
        name, dosage, duration = med
        draw.text((60, y), f"{i}.  {name}", fill=(20, 20, 20), font=font_sm)
        y += 18
        draw.text((80, y), f"     {dosage}   ×   {duration}", fill=(80, 80, 80), font=font_italic)
        y += 22

    # Procedures if any
    if case.get("procedures"):
        y += 8
        draw.text((30, y), "Procedures Advised:", fill=(13, 71, 161), font=font_md)
        y += 22
        for p in case["procedures"]:
            draw.text((50, y), f"→  {p}", fill=(50, 50, 50), font=font_sm)
            y += 20

    # Tests
    if case.get("tests"):
        y += 8
        draw.text((30, y), "Investigations:", fill=(13, 71, 161), font=font_md)
        y += 22
        for t in case["tests"]:
            draw.text((50, y), f"☐  {t}", fill=(50, 50, 50), font=font_sm)
            y += 20

    # Follow up
    if case.get("followup"):
        y += 15
        draw.text((30, y), f"Follow-up:  {case['followup']}", fill=(13, 71, 161), font=font_md)

    # Signature area
    draw.line([30, H - 140, W - 30, H - 140], fill=(200, 200, 200), width=1)
    draw.text((30, H - 130), "Doctor's Signature & Stamp", fill=(120, 120, 120), font=font_xs)

    # Handwriting font signature — doctor name written in cursive
    try:
        font_sig = ImageFont.truetype("DancingScript.ttf", 34)
        font_sig_sm = ImageFont.truetype("DancingScript.ttf", 17)
    except:
        font_sig = font_md
        font_sig_sm = font_xs
    draw.text((45, H - 118), case["doctor"], fill=(10, 10, 120), font=font_sig)
    draw.text((45, H - 78), case["reg"], fill=(90, 90, 90), font=font_sig_sm)

    # Stamp circle on right
    draw.ellipse([W - 185, H - 138, W - 52, H - 52], outline=(13, 71, 161), width=2)
    draw.ellipse([W - 183, H - 136, W - 54, H - 54], outline=(13, 71, 161), width=1)
    draw.text((W - 170, H - 120), case["clinic"][:13], fill=(13, 71, 161), font=font_xs)
    draw.text((W - 162, H - 102), case["reg"][:16], fill=(13, 71, 161), font=font_xs)
    draw.text((W - 155, H - 84), case["phone"], fill=(13, 71, 161), font=font_xs)

    img.save(out_path, "PNG", quality=95)
    print(f"  ✓ Prescription saved: {out_path}")


def make_handwritten_prescription(case, out_path):
    W, H = 794, 1123
    # Lined paper background
    img = Image.new("RGB", (W, H), color=(255, 253, 240))
    draw = ImageDraw.Draw(img)

    # Draw lines
    for y in range(80, H - 60, 30):
        draw.line([40, y, W - 40, y], fill=(180, 200, 230), width=1)

    # Red margin line
    draw.line([90, 0, 90, H], fill=(255, 160, 160), width=2)

    try:
        font_hd = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
        font_hw = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf", 15)
        font_sm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13)
        font_rx = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 32)
    except:
        font_hd = font_hw = font_sm = font_rx = ImageFont.load_default()

    # Slight rotation for realism
    y = 30
    draw.text((100, y), case["clinic"] or "Private Prescription", fill=(20, 20, 120), font=font_hd)
    y += 28
    draw.text((100, y), f"Dr. {case['doctor'] or 'Unknown'}   Reg: {case['reg'] or 'N/A'}", fill=(20, 20, 120), font=font_sm)
    y += 28
    draw.text((100, y), case.get("address") or "", fill=(80, 80, 80), font=font_sm)
    y += 35

    draw.text((W - 250, y - 10), f"Date: {case['date']}", fill=(40, 40, 40), font=font_sm)

    draw.text((100, y), f"Patient: {case['patient']}   Age: {case['age']}y  Sex: {case['sex']}", fill=(30, 30, 30), font=font_hw)
    y += 30
    draw.text((100, y), f"Dx: {case['diagnosis']}", fill=(180, 20, 20), font=font_hw)
    y += 40

    draw.text((100, y), "Rx", fill=(20, 20, 120), font=font_rx)
    y += 44

    for i, med in enumerate(case.get("medicines", []), 1):
        name, dosage, duration = med
        # Slight random offset for handwritten feel
        offset = random.randint(-2, 2)
        draw.text((110, y + offset), f"{i}) {name}", fill=(20, 20, 20), font=font_hw)
        y += 25
        draw.text((130, y + offset), f"   {dosage}  x  {duration}", fill=(60, 60, 60), font=font_sm)
        y += 28

    if case.get("procedures"):
        y += 5
        draw.text((100, y), "Procedures:", fill=(20, 20, 120), font=font_hd)
        y += 25
        for p in case["procedures"]:
            draw.text((115, y), f"- {p}", fill=(40, 40, 40), font=font_hw)
            y += 25

    if case.get("tests"):
        y += 5
        draw.text((100, y), "Investigations:", fill=(20, 20, 120), font=font_hd)
        y += 25
        for t in case["tests"]:
            draw.text((115, y), f"[ ] {t}", fill=(40, 40, 40), font=font_hw)
            y += 25

    if case.get("followup"):
        y += 10
        draw.text((100, y), f"F/U: {case['followup']}", fill=(20, 20, 120), font=font_hw)

    # Signature — doctor name in cursive handwriting font
    try:
        font_sig = ImageFont.truetype("DancingScript.ttf", 30)
        font_sig_sm = ImageFont.truetype("Caveat.ttf", 18)
    except:
        font_sig = font_hd
        font_sig_sm = font_sm
    draw.text((100, H - 110), case["doctor"] or "", fill=(10, 10, 120), font=font_sig)
    draw.text((100, H - 78), case["reg"] or "", fill=(70, 70, 70), font=font_sig_sm)

    # Add very slight rotation to whole image
    angle = random.uniform(-1.2, 1.2)
    img = img.rotate(angle, expand=False, fillcolor=(255, 253, 240))
    img.save(out_path, "PNG", quality=95)
    print(f"  ✓ Prescription saved: {out_path}")


# ─────────────────────────────────────────────
# BILL PDF GENERATOR
# ─────────────────────────────────────────────

def make_bill_pdf(case, out_path):
    doc = SimpleDocTemplate(
        out_path,
        pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm,
        topMargin=15*mm, bottomMargin=15*mm
    )
    styles = getSampleStyleSheet()
    W = A4[0] - 40*mm

    blue = colors.HexColor("#0D47A1")
    light_blue = colors.HexColor("#E3F2FD")
    dark = colors.HexColor("#212121")
    mid = colors.HexColor("#616161")

    header_style = ParagraphStyle("header", fontSize=18, textColor=blue,
                                  fontName="Helvetica-Bold", alignment=TA_CENTER)
    sub_style = ParagraphStyle("sub", fontSize=9, textColor=mid,
                               fontName="Helvetica", alignment=TA_CENTER)
    label_style = ParagraphStyle("label", fontSize=9, textColor=mid, fontName="Helvetica")
    value_style = ParagraphStyle("value", fontSize=10, textColor=dark, fontName="Helvetica-Bold")
    note_style = ParagraphStyle("note", fontSize=8, textColor=mid, fontName="Helvetica-Oblique")

    story = []

    # ── Header ──
    story.append(Paragraph(case["hospital"], header_style))
    story.append(Spacer(1, 2*mm))

    addr = case.get("address") or "123, Medical Complex, India"
    story.append(Paragraph(addr, sub_style))
    story.append(Paragraph(f"GST No: {case['gst']}  |  Ph: {case.get('phone','')}", sub_style))
    story.append(HRFlowable(width="100%", thickness=2, color=blue, spaceAfter=4*mm))

    # ── Bill info + Patient info side by side ──
    bill_info = [
        [Paragraph("Bill No:", label_style), Paragraph(case["bill_no"], value_style)],
        [Paragraph("Date:", label_style), Paragraph(case["date"], value_style)],
        [Paragraph("Payment:", label_style), Paragraph("Cash / UPI", value_style)],
    ]
    patient_info = [
        [Paragraph("Patient Name:", label_style), Paragraph(case["patient"], value_style)],
        [Paragraph("Age / Sex:", label_style), Paragraph(f"{case['age']} yrs / {case['sex']}", value_style)],
        [Paragraph("Ref. Doctor:", label_style), Paragraph(case.get("doctor") or "Self", value_style)],
    ]

    half = W / 2 - 5*mm
    col_w = [25*mm, half - 25*mm]

    combined = Table(
        [[Table(bill_info, colWidths=col_w), Table(patient_info, colWidths=col_w)]],
        colWidths=[half, half]
    )
    combined.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(combined)
    story.append(Spacer(1, 4*mm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#BBDEFB"), spaceAfter=3*mm))

    # ── Items table ──
    th_style = ParagraphStyle("th", fontSize=9, textColor=colors.white,
                               fontName="Helvetica-Bold", alignment=TA_CENTER)
    td_style = ParagraphStyle("td", fontSize=9, textColor=dark, fontName="Helvetica")
    td_right = ParagraphStyle("tdr", fontSize=9, textColor=dark,
                               fontName="Helvetica", alignment=TA_RIGHT)

    headers = [
        Paragraph("S.No", th_style),
        Paragraph("Particulars", th_style),
        Paragraph("Qty", th_style),
        Paragraph("Rate (₹)", th_style),
        Paragraph("Amount (₹)", th_style),
    ]
    col_widths = [12*mm, W - 12*mm - 18*mm - 25*mm - 28*mm, 18*mm, 25*mm, 28*mm]

    rows = [headers]
    subtotal = 0
    for i, item in enumerate(case["bill_items"], 1):
        name, qty, rate, amt = item
        rows.append([
            Paragraph(str(i), ParagraphStyle("c", fontSize=9, alignment=TA_CENTER)),
            Paragraph(name, td_style),
            Paragraph(str(qty), ParagraphStyle("c", fontSize=9, alignment=TA_CENTER)),
            Paragraph(f"{rate:,.0f}", td_right),
            Paragraph(f"{amt:,.0f}", td_right),
        ])
        subtotal += amt

    items_table = Table(rows, colWidths=col_widths, repeatRows=1)
    items_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), blue),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, light_blue]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#BBDEFB")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 3*mm))

    # ── Totals ──
    gst_amt = round(subtotal * case["gst_rate"] / 100)
    grand_total = subtotal + gst_amt

    totals_data = []
    totals_data.append(["", "Sub Total:", f"₹ {subtotal:,.0f}"])
    if case["gst_rate"] > 0:
        totals_data.append(["", f"GST ({case['gst_rate']}%):", f"₹ {gst_amt:,.0f}"])
    totals_data.append(["", "GRAND TOTAL:", f"₹ {grand_total:,.0f}"])

    tot_col = [W - 70*mm - 35*mm, 70*mm, 35*mm]
    totals_table = Table(totals_data, colWidths=tot_col)
    totals_table.setStyle(TableStyle([
        ("ALIGN", (1, 0), (2, -1), "RIGHT"),
        ("FONTNAME", (1, -1), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE", (1, -1), (2, -1), 11),
        ("TEXTCOLOR", (1, -1), (2, -1), blue),
        ("LINEABOVE", (1, -1), (2, -1), 1, blue),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 6*mm))

    # Amount in words (simple)
    story.append(Paragraph(
        f"Amount in Words: <b>Rupees {grand_total:,.0f} Only</b>",
        ParagraphStyle("aw", fontSize=9, fontName="Helvetica")
    ))
    story.append(Spacer(1, 10*mm))

    # ── Footer ──
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#BBDEFB"), spaceBefore=4*mm))
    footer_data = [[
        Paragraph("Patient Signature: ___________________", note_style),
        Paragraph("Authorised Signatory: ___________________", ParagraphStyle(
            "ns", fontSize=8, textColor=mid, fontName="Helvetica-Oblique", alignment=TA_RIGHT))
    ]]
    footer_table = Table(footer_data, colWidths=[W / 2, W / 2])
    story.append(footer_table)
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(
        "This is a computer-generated bill and is valid without signature.",
        ParagraphStyle("disc", fontSize=7, textColor=mid, fontName="Helvetica-Oblique", alignment=TA_CENTER)
    ))

    doc.build(story)
    print(f"  ✓ Bill saved:         {out_path}")


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

def main():
    print("\n=== ClaimGuard Mock Document Generator ===\n")
    for case in CASES:
        cid = case["id"]
        print(f"Generating {cid} — {case['patient']} ...")

        pres_path = os.path.join(OUT_PRES, f"{cid}_prescription.png")
        bill_path = os.path.join(OUT_BILLS, f"{cid}_bill.pdf")

        # Skip prescription for TC007 (missing docs test case)
        if case["id"] == "TC007":
            print(f"  ⚠  TC007: Skipping prescription (missing docs test case)")
        else:
            if case["style"] == "printed":
                make_printed_prescription(case, pres_path)
            else:
                make_handwritten_prescription(case, pres_path)

        make_bill_pdf(case, bill_path)
        print()

    print("=== Done! All documents generated. ===")
    print(f"  Prescriptions → ./{OUT_PRES}/")
    print(f"  Bills         → ./{OUT_BILLS}/")


if __name__ == "__main__":
    main()
