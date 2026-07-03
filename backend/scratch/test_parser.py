import sys
import re
from pathlib import Path
import pdfplumber

def clean_line(line: str) -> str:
    # Remove common resume section headers and job title keywords case-insensitively
    keywords = [
        r"\bwork experience\b", r"\bprofessional experience\b", r"\bemployment history\b", r"\bwork history\b",
        r"\bexperience\b", r"\bdeveloper\b", r"\bengineer\b", r"\bdesigner\b", r"\bmanager\b",
        r"\banalyst\b", r"\bconsultant\b", r"\barchitect\b", r"\blead\b", r"\bdirector\b",
        r"\bspecialist\b", r"\bintern\b", r"\bassociate\b", r"\bofficer\b", r"\badministrator\b",
        r"\bresume\b", r"\bcurriculum vitae\b", r"\bcv\b", r"\bsummary\b", r"\bobjective\b",
        r"\bprofile\b", r"\bcontact\b", r"\beducation\b", r"\bskills\b", r"\bprojects\b",
        r"\bcertifications\b", r"\bportfolio\b", r"\babout me\b", r"\bpersonal info\b",
        r"\bpython\b", r"\bjava\b", r"\bjavascript\b", r"\bc\+\+\b", r"\bc#\b", r"\bruby\b",
        r"\bphp\b", r"\bgo\b", r"\bswift\b", r"\brust\b", r"\btypescript\b", r"\bsql\b"
    ]
    cleaned = line
    for pattern in keywords:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)
    # Clean up extra spaces/symbols
    cleaned = re.sub(r"[|\-–—•·:\s]+", " ", cleaned).strip()
    return cleaned

def extract_name_improved(text: str, email: str | None = None) -> str | None:
    if not text:
        return None

    # First, try to extract name by analyzing the first 15 non-empty lines
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    cleaned_lines = []
    
    for line in lines[:15]:
        cleaned = clean_line(line)
        if not cleaned:
            continue
        # Validate that the cleaned line contains only name-like characters
        if not re.fullmatch(r"[A-Za-z][A-Za-z .'-]*", cleaned):
            continue
        if "@" in cleaned or re.search(r"\d", cleaned):
            continue
        parts = [p for p in cleaned.split() if p]
        cleaned_lines.append((cleaned, parts))

    # Try to find a line with 2 to 4 words first
    for cleaned, parts in cleaned_lines[:5]:
        if 2 <= len(parts) <= 4:
            return " ".join(p.capitalize() for p in parts)

    # If no line has 2-4 words, check if we have two consecutive lines that each have 1 word
    for i in range(len(cleaned_lines) - 1):
        cleaned_curr, parts_curr = cleaned_lines[i]
        cleaned_next, parts_next = cleaned_lines[i+1]
        if len(parts_curr) == 1 and len(parts_next) == 1:
            combined = [parts_curr[0], parts_next[0]]
            return " ".join(p.capitalize() for p in combined)

    # Fallback to email local-part
    if email and "@" in email:
        local = email.split("@", 1)[0]
        local = re.sub(r"[._\-]+", " ", local).strip()
        parts = [p for p in local.split() if p and p.isalpha()]
        if 1 < len(parts) <= 4:
            return " ".join(part.capitalize() for part in parts)
            
    return None

# Test the improved function on the files
import sys
sys.path.append(str(Path(__file__).parent.parent))
from app.services.parser_service import ParserService

uploads_dir = Path(__file__).parent.parent / "uploads" / "resumes"
for pdf_path in sorted(uploads_dir.glob("*.pdf")):
    raw_text = ParserService.extract_text(str(pdf_path))
    email = ParserService.extract_email(raw_text)
    name = extract_name_improved(raw_text, email=email)
    print(f"File: {pdf_path.name} -> Email: {email} -> Extracted Name: {name}")
