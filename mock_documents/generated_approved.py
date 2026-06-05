
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
"id": "TC021",
"template": 1,
"post": "none",
"edge": "APPROVED",
"style": "printed",
"patient": "Rajat Verma",
"age": 32,
"sex": "Male",
"date": "02/12/2024",
"doctor": "Dr. Neha Kapoor",
"reg": "DL/45678/2018",
"clinic": "Kapoor Family Clinic",
"address": "Pitampura, New Delhi - 110034",
"phone": "011-27894561",
"diagnosis": "Viral Fever",
"complaints": [
"Fever for 2 days",
"Body aches",
"General weakness"
],
"medicines": [
("Tab. Paracetamol 650mg", "1-1-1 after food", "5 days"),
("ORS Sachet", "As required", "3 days"),
("Tab. Vitamin C 500mg", "0-1-0", "7 days")
],
"tests": ["CBC"],
"followup": "07/12/2024",
"hospital": "Kapoor Family Clinic",
"gst": "07ABCDE2345F1Z8",
"bill_no": "KFC/2024/1202",
"bill_items": [
    ("Consultation Fee", 1, 643, 643),
    ("CBC", 1, 387, 387),
    ("Tab. Paracetamol 650mg x15", 1, 118, 118),
    ("ORS Sachets x5", 1, 83, 83),
    ("Vitamin C 500mg x10", 1, 126, 126),
],
"gst_rate": 0,
"sig_name": "Dr. Neha Kapoor",
"auth_name": "Ritu Sharma"
},

{
"id": "TC022",
"template": 2,
"post": "shadow",
"edge": "APPROVED",
"style": "handwritten",
"patient": "Anjali Rao",
"age": 28,
"sex": "Female",
"date": "05/12/2024",
"doctor": "Dr. Karthik Reddy",
"reg": "KA/56789/2017",
"clinic": "Reddy Gastro Clinic",
"address": "Indiranagar, Bengaluru - 560038",
"phone": "080-25467890",
"diagnosis": "Acute Gastroenteritis",
"complaints": [
"Loose stools",
"Vomiting",
"Abdominal cramps"
],
"medicines": [
("ORS Powder", "After each loose stool", "3 days"),
("Tab. Pantoprazole 40mg", "1-0-0", "5 days"),
("Probiotic Capsules", "1-0-1", "5 days")
],
"tests": ["Stool Routine"],
"followup": "10/12/2024",
"hospital": "Reddy Gastro Clinic",
"gst": "29ABCDE5678F2G1",
"bill_no": "RGC/2024/1205",
"bill_items": [
    ("Consultation Fee", 1, 712, 712),
    ("Stool Routine Examination", 1, 268, 268),
    ("ORS Powder x10", 1, 174, 174),
    ("Pantoprazole 40mg x10", 1, 287, 287),
    ("Probiotic Capsules x10", 1, 463, 463),
],
"gst_rate": 0,
"sig_name": "Dr. Karthik Reddy",
"auth_name": "Shilpa Rao"
},

{
"id": "TC023",
"template": 3,
"post": "rotate",
"rotate_deg": 2.1,
"edge": "APPROVED",
"style": "printed",
"patient": "Prakash Nair",
"age": 51,
"sex": "Male",
"date": "08/12/2024",
"doctor": "Dr. Sunil Menon",
"reg": "KL/89012/2014",
"clinic": "Menon Heart Care",
"address": "Marine Drive, Kochi - 682031",
"phone": "0484-2678123",
"diagnosis": "Hypertension Follow-up",
"complaints": [
"Routine follow-up",
"BP monitoring",
"No new complaints"
],
"medicines": [
("Tab. Amlodipine 5mg", "1-0-0", "30 days"),
("Tab. Losartan 50mg", "0-0-1", "30 days")
],
"tests": ["ECG"],
"followup": "08/01/2025",
"hospital": "Menon Heart Care",
"gst": "32MNOPQ6789H1K2",
"bill_no": "MHC/2024/1208",
"bill_items": [
    ("Cardiology Consultation", 1, 1187, 1187),
    ("ECG 12 Lead", 1, 463, 463),
    ("Amlodipine 5mg x30", 1, 167, 167),
    ("Losartan 50mg x30", 1, 348, 348),
],
"gst_rate": 0,
"sig_name": "Dr. Sunil Menon",
"auth_name": "Anita George"
},

{
"id": "TC024",
"template": 1,
"post": "none",
"edge": "APPROVED - NETWORK CASHLESS",
"style": "printed",
"patient": "Sneha Kulkarni",
"age": 26,
"sex": "Female",
"date": "10/12/2024",
"doctor": "Dr. Vivek Sharma",
"reg": "MH/45678/2019",
"clinic": "Apollo Clinic",
"address": "Baner Road, Pune - 411045",
"phone": "020-26678901",
"diagnosis": "Ankle Sprain",
"complaints": [
"Pain while walking",
"Swelling",
"Twisted ankle"
],
"medicines": [
("Tab. Aceclofenac", "1-0-1", "5 days"),
("Pain Relief Gel", "Apply TDS", "7 days")
],
"tests": ["X-Ray Ankle"],
"followup": "17/12/2024",
"hospital": "Apollo Clinic Pune",
"gst": "27PQRS5678T1U2",
"bill_no": "APC/2024/1210",
"bill_items": [
    ("Orthopaedic Consultation", 1, 876, 876),
    ("X-Ray Ankle AP/Lateral", 1, 743, 743),
    ("Aceclofenac Tablets", 1, 218, 218),
    ("Pain Relief Gel", 1, 176, 176),
],
"gst_rate": 0,
"sig_name": "Dr. Vivek Sharma",
"auth_name": "Rohan Patil"
},

{
"id": "TC025",
"template": 2,
"post": "blur",
"edge": "APPROVED",
"style": "handwritten",
"patient": "Arvind Patel",
"age": 37,
"sex": "Male",
"date": "12/12/2024",
"doctor": "Dr. Hina Shah",
"reg": "GJ/67890/2018",
"clinic": "Shah Allergy Centre",
"address": "CG Road, Ahmedabad - 380009",
"phone": "079-26789011",
"diagnosis": "Allergic Rhinitis",
"complaints": [
"Sneezing",
"Runny nose",
"Itchy eyes"
],
"medicines": [
("Tab. Cetirizine 10mg", "0-0-1", "10 days"),
("Fluticasone Nasal Spray", "2 puffs OD", "14 days")
],
"tests": [],
"followup": "20/12/2024",
"hospital": "Shah Allergy Centre",
"gst": "24ABCDE9876P4Q5",
"bill_no": "SAC/2024/1212",
"bill_items": [
    ("ENT Consultation", 1, 834, 834),
    ("Tab. Cetirizine 10mg x10", 1, 124, 124),
    ("Fluticasone Nasal Spray", 1, 987, 987),
],
"gst_rate": 0,
"sig_name": "Dr. Hina Shah",
"auth_name": "Meera Joshi"
},

{
"id": "TC026",
"template": 3,
"post": "shadow",
"edge": "APPROVED",
"style": "printed",
"patient": "Kiran Sharma",
"age": 49,
"sex": "Male",
"date": "15/12/2024",
"doctor": "Dr. Farida Haidari",
"reg": "RJ/99123/2019",
"clinic": "Haidari Medical Centre",
"address": "MI Road, Jaipur - 302001",
"phone": "0141-2345678",
"diagnosis": "Type 2 Diabetes Follow-up",
"complaints": [
"Routine diabetes review",
"Stable sugar levels"
],
"medicines": [
("Tab. Metformin 500mg", "1-0-1", "30 days"),
("Tab. Glimepiride 1mg", "1-0-0", "30 days")
],
"tests": ["Fasting Blood Sugar", "HbA1c"],
"followup": "15/01/2025",
"hospital": "Haidari Medical Centre",
"gst": "08JKLMN3456P7Q8",
"bill_no": "HMC/2024/1215",
"bill_items": [
    ("Diabetology Consultation", 1, 912, 912),
    ("HbA1c Test", 1, 687, 687),
    ("Fasting Blood Sugar", 1, 184, 184),
    ("Metformin 500mg x30", 1, 246, 246),
    ("Glimepiride 1mg x30", 1, 283, 283),
],
"gst_rate": 0,
"sig_name": "Dr. Farida Haidari",
"auth_name": "Asha Gupta"
},

{
"id": "TC027",
"template": 1,
"post": "none",
"edge": "APPROVED",
"style": "printed",
"patient": "Pallavi Menon",
"age": 34,
"sex": "Female",
"date": "18/12/2024",
"doctor": "Dr. Anita Nair",
"reg": "KL/56789/2016",
"clinic": "Nair Neuro Clinic",
"address": "Kozhikode - 673001",
"phone": "0495-2233445",
"diagnosis": "Migraine",
"complaints": [
"Severe headache",
"Light sensitivity",
"Nausea"
],
"medicines": [
("Tab. Sumatriptan 50mg", "SOS", "5 days"),
("Tab. Paracetamol 650mg", "1-1-1", "3 days")
],
"tests": [],
"followup": "24/12/2024",
"hospital": "Nair Neuro Clinic",
"gst": "32ABCDE1111F1Z5",
"bill_no": "NNC/2024/1218",
"bill_items": [
    ("Neurology Consultation", 1, 1246, 1246),
    ("Sumatriptan 50mg x5", 1, 438, 438),
    ("Paracetamol 650mg x10", 1, 113, 113),
],
"gst_rate": 0,
"sig_name": "Dr. Anita Nair",
"auth_name": "Lakshmi Menon"
}
,
   {
"id": "TC028",
"template": 2,
"post": "shadow",
"edge": "APPROVED",
"style": "printed",
"patient": "Nikhil Agarwal",
"age": 42,
"sex": "Male",
"date": "20/12/2024",
"doctor": "Dr. Ruchi Malhotra",
"reg": "DL/78456/2016",
"clinic": "Malhotra Chest Clinic",
"address": "Janakpuri, New Delhi - 110058",
"phone": "011-26784512",
"diagnosis": "Upper Respiratory Tract Infection",
"complaints": [
"Sore throat",
"Dry cough",
"Mild fever"
],
"medicines": [
("Tab. Azithromycin 500mg", "1-0-0", "3 days"),
("Tab. Paracetamol 650mg", "1-1-1", "5 days"),
("Cough Syrup", "10ml TDS", "5 days")
],
"tests": ["CBC"],
"followup": "27/12/2024",
"hospital": "Malhotra Chest Clinic",
"gst": "07ABCDE6789F1Z2",
"bill_no": "MCC/2024/1220",
"bill_items": [
("Consultation Fee", 1, 768, 768),
("CBC", 1, 392, 392),
("Azithromycin 500mg", 1, 286, 286),
("Paracetamol 650mg x15", 1, 118, 118),
("Cough Syrup", 1, 243, 243)
],
"gst_rate": 0,
"sig_name": "Dr. Ruchi Malhotra",
"auth_name": "Amit Khanna"
},

{
"id": "TC029",
"template": 3,
"post": "rotate",
"rotate_deg": 1.7,
"edge": "APPROVED",
"style": "handwritten",
"patient": "Shalini Verma",
"age": 31,
"sex": "Female",
"date": "22/12/2024",
"doctor": "Dr. K. Balasubramanian",
"reg": "TN/45891/2015",
"clinic": "Balaji Women's Clinic",
"address": "T Nagar, Chennai - 600017",
"phone": "044-24561278",
"diagnosis": "Urinary Tract Infection",
"complaints": [
"Burning urination",
"Frequency of urination",
"Lower abdominal discomfort"
],
"medicines": [
("Tab. Nitrofurantoin 100mg", "1-0-1", "7 days"),
("Urinary Alkalizer Syrup", "10ml TDS", "5 days")
],
"tests": ["Urine Routine"],
"followup": "29/12/2024",
"hospital": "Balaji Women's Clinic",
"gst": "33ABCDE2345G1Z7",
"bill_no": "BWC/2024/1222",
"bill_items": [
("Consultation Fee", 1, 824, 824),
("Urine Routine", 1, 276, 276),
("Nitrofurantoin 100mg", 1, 334, 334),
("Urinary Alkalizer Syrup", 1, 218, 218)
],
"gst_rate": 0,
"sig_name": "Dr. K. Balasubramanian",
"auth_name": "Meena Iyer"
},

{
"id": "TC030",
"template": 1,
"post": "none",
"edge": "APPROVED",
"style": "printed",
"patient": "Harish Chandra",
"age": 46,
"sex": "Male",
"date": "24/12/2024",
"doctor": "Dr. Vivek Sinha",
"reg": "MH/67321/2014",
"clinic": "Sinha Orthopaedic Centre",
"address": "Andheri West, Mumbai - 400053",
"phone": "022-27893456",
"diagnosis": "Cervical Spondylosis",
"complaints": [
"Neck pain",
"Stiffness",
"Pain radiating to shoulder"
],
"medicines": [
("Tab. Etoricoxib 60mg", "1-0-1", "5 days"),
("Muscle Relaxant", "0-0-1", "5 days"),
("Pain Relief Gel", "Apply TDS", "7 days")
],
"tests": ["X-Ray Cervical Spine"],
"followup": "02/01/2025",
"hospital": "Sinha Orthopaedic Centre",
"gst": "27ABCDE9876K1Z5",
"bill_no": "SOC/2024/1224",
"bill_items": [
("Orthopaedic Consultation", 1, 1136, 1136),
("X-Ray Cervical Spine", 1, 847, 847),
("Etoricoxib 60mg", 1, 294, 294),
("Muscle Relaxant", 1, 186, 186),
("Pain Relief Gel", 1, 173, 173)
],
"gst_rate": 0,
"sig_name": "Dr. Vivek Sinha",
"auth_name": "Rakesh Mehta"
}



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

