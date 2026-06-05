# // generate_cases_json.py
# // ---------------------------------------------------------------
# // Scans every `generate_*.py` file, extracts the `CASES` list, and writes a
# // single JSON file (`all_cases.json`) that contains an array of all
# // test payloads together with the expected decision for each case.
# // ---------------------------------------------------------------
import ast
import json
from pathlib import Path

def load_cases_from_file(py_path: Path):
    """Parse a Python file and return the literal value assigned to `CASES`."""
    src = py_path.read_text(encoding="utf-8")
    tree = ast.parse(src, filename=str(py_path))
    for node in ast.iter_child_nodes(tree):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "CASES":
                    return ast.literal_eval(node.value)
    return []

def normalise_expected(case: dict) -> str:
    return case.get("edge", "APPROVED").upper()

def build_payload(case: dict):
    claim_data = {
        "claim_id": case.get("id"),
        "member_id": f"EMP{case.get('id')[-3:]}",
        "member_name": case.get("patient"),
        "member_join_date": case.get("date"),
        "claim_amount": sum(item[3] for item in case.get("bill_items", [])),
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
        "total_amount": claim_data["claim_amount"],
        "document_types": ["prescription", "bill"],
        "is_prescription_present": True,
        "is_bill_present": True,
        "quality_issues": [],
        "extraction_confidence": 0.95,
    }
    return {"claimData": claim_data, "extracted": extracted}

def main():
    base_dir = Path(__file__).parent
    py_files = sorted(base_dir.glob("generate_*.py"))
    all_cases = []
    for py_file in py_files:
        cases = load_cases_from_file(py_file)
        for case in cases:
            payload = build_payload(case)
            payload["expected"] = normalise_expected(case)
            all_cases.append(payload)
    out_path = base_dir / "all_cases.json"
    out_path.write_text(json.dumps(all_cases, indent=2), encoding="utf-8")
    print(f"Created {out_path.name} with {len(all_cases)} cases")

if __name__ == "__main__":
    main()
