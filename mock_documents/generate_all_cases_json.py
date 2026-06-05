# generate_all_cases_json.py
"""
Utility script that aggregates every `CASES` list from the
`generate_*.py` files in this directory and writes a single JSON
file (`all_cases.json`). The output is an array of objects, each
containing the payload the adjudication engine expects:

{
    "claimData": {...},
    "extracted": {...},
    "expected": "APPROVED" | "MANUAL_REVIEW" | ...,
    "case_id": "TC038"
}
"""
import ast
import json
from pathlib import Path

def load_cases_from_file(py_path: Path):
    """Return the literal value assigned to the top‑level name `CASES`.
    Returns an empty list if the file does not contain such an assignment.
    """
    src = py_path.read_text(encoding="utf-8")
    tree = ast.parse(src, filename=str(py_path))
    for node in ast.iter_child_nodes(tree):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "CASES":
                    return ast.literal_eval(node.value)
    return []

def build_payload(case: dict):
    """Convert a case dict into the `{claimData, extracted}` structure."""
    claim_amount = sum(item[3] for item in case.get("bill_items", []))

    claim_data = {
        "claim_id": case.get("id"),
        "member_id": f"EMP{case.get('id')[-3:]}",
        "member_name": case.get("patient"),
        "member_join_date": case.get("date"),
        "claim_amount": claim_amount,
        "ytd_claimed": 0,
        "treatment_date": case.get("date"),
    }

    extracted = {
        "patient_name": case.get("patient"),
        "treatment_date": case.get("date"),
        "doctor_name": case.get("doctor"),
        "doctor_reg": case.get("reg"),
        "diagnosis": case.get("diagnosis"),
        "medicines": [m[0] for m in case.get("medicines", [])],
        "tests": case.get("tests", []),
        "procedures": case.get("procedures", []),
        "bill_items": [
            {"name": itm[0], "quantity": itm[1], "rate": itm[2], "amount": itm[3]}
            for itm in case.get("bill_items", [])
        ],
        "total_amount": claim_amount,
        "document_types": ["prescription", "bill"],
        "is_prescription_present": True,
        "is_bill_present": True,
        "quality_issues": [],
        "extraction_confidence": 0.95,
    }
    return {"claimData": claim_data, "extracted": extracted}

def main():
    base_dir = Path(__file__).parent          # mock_documents folder

    # All 5 data files — listed explicitly because filenames differ
    # (generate.py has no underscore; generated_approved.py has a 'd')
    DATA_FILES = [
        "generate.py",            # TC001-TC010  REJECTED
        "generate_edge_cases.py", # TC011-TC020  edge cases (REJECTED variants)
        "generated_approved.py",  # TC021-TC030  APPROVED
        "generate_partial.py",    # TC031-TC037  PARTIAL
        "generate_manual.py",     # TC038-TC042  MANUAL_REVIEW
    ]

    all_payloads = []
    for fname in DATA_FILES:
        py_file = base_dir / fname
        if not py_file.exists():
            print(f"[WARN] {fname} not found, skipping")
            continue
        cases = load_cases_from_file(py_file)
        for case in cases:
            payload = build_payload(case)
            payload["expected"] = case.get("edge", "APPROVED").upper()
            payload["case_id"] = case.get("id")
            all_payloads.append(payload)

    out_path = base_dir / "all_cases.json"
    out_path.write_text(json.dumps(all_payloads, indent=2), encoding="utf-8")
    print(f"[OK] Wrote {len(all_payloads)} cases to {out_path.name}")


if __name__ == "__main__":
    main()
