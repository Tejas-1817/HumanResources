import re
from datetime import datetime
from pathlib import Path

import docx
import pdfplumber


class ParserService:
    SKILL_NORMALIZATION_MAP = {
        "js": "javascript",
        "reactjs": "react",
        "node": "node.js",
        "py": "python",
    }
    SKILL_KEYWORDS = [
        "Python",
        "Java",
        "JavaScript",
        "TypeScript",
        "C",
        "C++",
        "C#",
        "Go",
        "Rust",
        "PHP",
        "Ruby",
        "Kotlin",
        "Swift",
        "Scala",
        "R",
        "Django",
        "Flask",
        "FastAPI",
        "Spring Boot",
        "Node.js",
        "Express",
        "NestJS",
        "React",
        "Next.js",
        "Vue",
        "Nuxt",
        "Angular",
        "Svelte",
        "Redux",
        "TailwindCSS",
        "Bootstrap",
        "Material UI",
        "HTML",
        "CSS",
        "SASS",
        "SQL",
        "MySQL",
        "PostgreSQL",
        "SQLite",
        "MongoDB",
        "Redis",
        "Elasticsearch",
        "Kafka",
        "RabbitMQ",
        "Docker",
        "Kubernetes",
        "AWS",
        "Azure",
        "GCP",
        "Terraform",
        "Ansible",
        "Jenkins",
        "GitHub Actions",
        "GitLab CI",
        "Linux",
        "Git",
        "REST",
        "GraphQL",
        "gRPC",
        "Pandas",
        "NumPy",
        "TensorFlow",
        "PyTorch",
        "Scikit-learn",
        "Spark",
        "Hadoop",
        "Airflow",
        "Tableau",
        "Power BI",
        "Figma",
        "Postman",
        "Selenium",
        "Playwright",
        "Pytest",
        "JUnit",
        "Cypress",
        "Agile",
        "Scrum",
    ]

    @staticmethod
    def extract_text(file_path: str) -> str:
        path = Path(file_path)
        suffix = path.suffix.lower()
        raw_text = ""
        if suffix == ".pdf":
            chunks: list[str] = []
            with pdfplumber.open(path) as pdf:
                for page in pdf.pages:
                    chunks.append(page.extract_text() or "")
            raw_text = "\n".join(chunks).strip()
        elif suffix == ".docx":
            document = docx.Document(path)
            raw_text = "\n".join(p.text for p in document.paragraphs if p.text).strip()
        else:
            raise ValueError(f"Unsupported file type: {suffix}")

        if not raw_text:
            return ""

        # Clean CID codes and normalize bullets
        cleaned = re.sub(r'\(cid:\s*0\)', '', raw_text)
        cleaned = re.sub(r'\(cid:\s*\d+\)', '• ', cleaned)
        cleaned = re.sub(r'[\u2022\u2023\u25E6\u2043\u2219\u25CB\u25CF\u25AA\u25AB\uF0B7\uF0A7\uF0A8\uF0D8]', '• ', cleaned)
        cleaned = cleaned.replace('\xa0', ' ').replace('\r\n', '\n').replace('\r', '\n')
        cleaned = re.sub(r'•\s+', '• ', cleaned)
        cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
        return "\n".join(line.strip() for line in cleaned.split("\n")).strip()

    @staticmethod
    def _work_history_text(text: str) -> str:
        if not text:
            return ""

        lines = text.splitlines()
        if not lines:
            return ""

        work_start_keywords = (
            "work experience",
            "professional experience",
            "employment history",
            "experience",
            "internships",
            "internship",
            "work history",
        )
        stop_keywords = (
            "education",
            "certifications",
            "projects",
            "skills",
            "summary",
            "achievements",
        )

        start_idx: int | None = None
        end_idx: int | None = None

        for idx, line in enumerate(lines):
            lower = re.sub(r"[:\-\s]+$", "", line.strip().lower())
            if any(re.fullmatch(rf"{re.escape(k)}", lower) for k in work_start_keywords):
                start_idx = idx
                break

        if start_idx is None:
            return ""

        for idx in range(start_idx + 1, len(lines)):
            lower = re.sub(r"[:\-\s]+$", "", lines[idx].strip().lower())
            if any(re.fullmatch(rf"{re.escape(k)}", lower) for k in stop_keywords):
                end_idx = idx
                break

        section = lines[start_idx:end_idx] if end_idx is not None else lines[start_idx:]
        return "\n".join(section).strip()

    @staticmethod
    def extract_name(text: str, email: str | None = None) -> str | None:
        if not text:
            return None

        # Clean line helper to remove common resume headers and job titles
        def clean_line(line: str) -> str:
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
            # Clean up extra spaces and punctuation symbols
            cleaned = re.sub(r"[|\-–—•·:\s]+", " ", cleaned).strip()
            return cleaned

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

        # Check for two consecutive lines that each have 1 word (for two-column layouts)
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

    @staticmethod
    def extract_email(text: str) -> str | None:
        if not text:
            return None
        pattern = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"
        matches = re.findall(pattern, text)
        if not matches:
            return None
        return matches[0].strip().lower()

    @staticmethod
    def extract_phone(text: str) -> str | None:
        if not text:
            return None
        pattern = r"(?:(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{4})"
        matches = re.findall(pattern, text)
        for raw in matches:
            digits = re.sub(r"\D", "", raw)
            if 10 <= len(digits) <= 15:
                return raw.strip()
        return None

    @staticmethod
    def _normalize_skill(skill: str) -> str:
        key = skill.strip().lower()
        return ParserService.SKILL_NORMALIZATION_MAP.get(key, key)

    @staticmethod
    def extract_skills(text: str) -> dict:
        if not text:
            return {"skills": [], "normalized_skills": []}

        lower_text = text.lower()
        found: list[str] = []
        for skill in ParserService.SKILL_KEYWORDS:
            escaped = re.escape(skill.lower())
            pattern = rf"(?<![a-z0-9]){escaped}(?![a-z0-9])"
            if re.search(pattern, lower_text):
                found.append(skill.lower())

        # Include short aliases for search-readiness.
        for alias in ParserService.SKILL_NORMALIZATION_MAP:
            escaped = re.escape(alias)
            pattern = rf"(?<![a-z0-9]){escaped}(?![a-z0-9])"
            if re.search(pattern, lower_text):
                found.append(alias)

        skills = list(dict.fromkeys(found))
        normalized = list(dict.fromkeys(ParserService._normalize_skill(item) for item in skills))
        return {"skills": skills, "normalized_skills": normalized}

    @staticmethod
    def _month_key(year: int, month: int) -> int:
        return year * 12 + month

    @staticmethod
    def _expand_range_to_month_keys(
        start_year: int, start_month: int, end_year: int, end_month: int
    ) -> set[int]:
        if (end_year, end_month) < (start_year, start_month):
            return set()
        keys: set[int] = set()
        y, m = start_year, start_month
        while (y, m) <= (end_year, end_month):
            keys.add(ParserService._month_key(y, m))
            m += 1
            if m > 12:
                y += 1
                m = 1
        return keys

    @staticmethod
    def _month_to_num(name: str) -> int | None:
        mapping = {
            "jan": 1,
            "january": 1,
            "feb": 2,
            "february": 2,
            "mar": 3,
            "march": 3,
            "apr": 4,
            "april": 4,
            "may": 5,
            "jun": 6,
            "june": 6,
            "jul": 7,
            "july": 7,
            "aug": 8,
            "august": 8,
            "sep": 9,
            "sept": 9,
            "september": 9,
            "oct": 10,
            "october": 10,
            "nov": 11,
            "november": 11,
            "dec": 12,
            "december": 12,
        }
        return mapping.get(name.strip().lower())

    @staticmethod
    def extract_experience_years(text: str) -> float:
        if not text:
            return 0.0

        try:
            work_text = ParserService._work_history_text(text)
            if not work_text:
                return 0.0

            month_keys: set[int] = set()
            best_explicit_months = 0
            now = datetime.now()
            now_year = now.year
            now_month = now.month

            # Matches ranges like 2019-2021, 2018 to Present, 2020 - current.
            range_pattern = re.compile(
                r"\b(19\d{2}|20\d{2})\s*(?:-|to|–)\s*(present|current|now|19\d{2}|20\d{2})\b",
                re.IGNORECASE,
            )
            for start_raw, end_raw in range_pattern.findall(work_text):
                start_year = int(start_raw)
                end_token = end_raw.lower()
                end_year = now_year if end_token in {"present", "current", "now"} else int(end_raw)
                end_month = now_month if end_token in {"present", "current", "now"} else 12
                month_keys.update(
                    ParserService._expand_range_to_month_keys(start_year, 1, end_year, end_month)
                )

            # Matches explicit spans like "2 years 6 months", "3+ years", "18 months".
            month_pattern = re.compile(
                r"\b(\d{1,2})(?:\+)?\s*(?:years?|yrs?)(?:\s+(\d{1,2})\s*(?:months?|mos?))?\b",
                re.IGNORECASE,
            )
            for years_raw, months_raw in month_pattern.findall(work_text):
                years = int(years_raw)
                months = int(months_raw) if months_raw else 0
                best_explicit_months = max(best_explicit_months, years * 12 + months)

            months_only_pattern = re.compile(r"\b(\d{1,2})\s*(?:months?|mos?)\b", re.IGNORECASE)
            for months_raw in months_only_pattern.findall(work_text):
                best_explicit_months = max(best_explicit_months, int(months_raw))

            # Matches month-year ranges like "Jan 2021 - Mar 2023".
            month_names = (
                r"jan|january|feb|february|mar|march|apr|april|may|jun|june|"
                r"jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december"
            )
            month_year_pattern = re.compile(
                rf"\b({month_names})\s+(19\d{{2}}|20\d{{2}})\s*(?:-|to|–)\s*"
                rf"(?:({month_names})\s+)?(present|current|now|19\d{{2}}|20\d{{2}})\b",
                re.IGNORECASE,
            )
            for start_month_raw, start_year_raw, end_month_raw, end_raw in month_year_pattern.findall(
                work_text
            ):
                start_year = int(start_year_raw)
                start_month = ParserService._month_to_num(start_month_raw) or 1
                end_token = end_raw.lower()
                end_year = now_year if end_token in {"present", "current", "now"} else int(end_raw)
                end_month = (
                    now_month
                    if end_token in {"present", "current", "now"}
                    else (ParserService._month_to_num(end_month_raw) or 12)
                )
                month_keys.update(
                    ParserService._expand_range_to_month_keys(
                        start_year, start_month, end_year, end_month
                    )
                )

            # Prefer explicit stated experience if available; otherwise use inferred ranges.
            resolved_months = max(best_explicit_months, len(month_keys))
            if resolved_months <= 0:
                return 0.0

            years_value = round(resolved_months / 12.0, 2)
            return min(years_value, 40.0)
        except Exception:
            return 0.0

    @staticmethod
    def parse(file_path: str) -> dict:
        safe_default = {
            "name": None,
            "email": None,
            "phone": None,
            "skills": [],
            "normalized_skills": [],
            "experience_years": 0.0,
        }

        try:
            raw_text = ParserService.extract_text(file_path)
            email = ParserService.extract_email(raw_text)
            name = ParserService.extract_name(raw_text, email=email)
            phone = ParserService.extract_phone(raw_text)
            skills_payload = ParserService.extract_skills(raw_text)
            experience_years = ParserService.extract_experience_years(raw_text)
            return {
                "name": name,
                "email": email,
                "phone": phone,
                "skills": skills_payload["skills"],
                "normalized_skills": skills_payload["normalized_skills"],
                "experience_years": experience_years,
            }
        except Exception:
            return safe_default

    @staticmethod
    def _digits_only(value: str) -> str:
        """Strip all non-digit characters for phone comparison."""
        return re.sub(r"\D", "", value)

    @staticmethod
    def search_candidates(candidates: list[dict], filters: dict) -> list[dict]:
        """
        Search candidates by partial name/email/phone and skill overlap.
        Skills are matched against both raw and normalized skill values.

        Fixes applied:
        - max_exp now defaults to None (no upper bound) instead of 10, so
          candidates with >10 years experience are no longer silently excluded.
        - Phone matching is done on digits-only strings so formatting
          differences (spaces, dashes, parentheses) don't block matches.
        - Skills are matched against both the raw `skills` list and the
          `normalized_skills` list, so aliases like "js" or "reactjs" resolve
          correctly regardless of how they were stored.
        - All filter fields are skipped (not rejected) when they are empty /
          not provided, ensuring an empty search returns all candidates.
        """
        name_filter = (filters.get("name") or "").strip().lower()
        email_filter = (filters.get("email") or "").strip().lower()
        phone_filter = ParserService._digits_only(str(filters.get("phone") or ""))

        # Normalize every requested skill so "JS", "ReactJS", etc. map correctly.
        raw_skills_filter: list[str] = [
            str(item).strip().lower()
            for item in (filters.get("skills") or [])
            if str(item).strip()
        ]
        skills_filter: list[str] = list(
            dict.fromkeys(
                ParserService._normalize_skill(s) for s in raw_skills_filter
            )
        )
        # Also keep the un-normalized forms so "python" matches "python" directly.
        skills_filter_raw: list[str] = raw_skills_filter

        min_exp = filters.get("min_exp")
        max_exp = filters.get("max_exp")

        # Convert only when a real value was provided; None means "no bound".
        try:
            min_exp = float(min_exp) if min_exp not in (None, "", "None") else None
        except (TypeError, ValueError):
            min_exp = None

        try:
            max_exp = float(max_exp) if max_exp not in (None, "", "None") else None
        except (TypeError, ValueError):
            max_exp = None

        results: list[dict] = []
        for candidate in candidates:
            name_value = str(candidate.get("name") or "").lower()
            email_value = str(candidate.get("email") or "").lower()
            phone_digits = ParserService._digits_only(str(candidate.get("phone") or ""))
            exp_value = float(candidate.get("experience_years") or 0.0)

            # Build a unified set of all skill tokens for this candidate
            # (both raw and normalized) so any reasonable query term matches.
            candidate_raw_skills: list[str] = [
                str(s).strip().lower() for s in (candidate.get("skills") or [])
            ]
            candidate_normalized_skills: list[str] = [
                str(s).strip().lower() for s in (candidate.get("normalized_skills") or [])
            ]
            candidate_all_skills: set[str] = set(candidate_raw_skills) | set(candidate_normalized_skills)

            # --- Filter checks (each is skipped when the filter is empty) ---

            if name_filter and name_filter not in name_value:
                continue

            if email_filter and email_filter not in email_value:
                continue

            # Compare digit strings so "+91 98765-43210" matches "9876543210".
            if phone_filter and phone_filter not in phone_digits:
                continue

            if min_exp is not None and exp_value < min_exp:
                continue

            if max_exp is not None and exp_value > max_exp:
                continue

            # A candidate passes if ANY requested skill appears in their skill set.
            if skills_filter or skills_filter_raw:
                all_requested = set(skills_filter) | set(skills_filter_raw)
                if not any(skill in candidate_all_skills for skill in all_requested):
                    continue

            results.append(candidate)

        return sorted(results, key=lambda c: float(c.get("experience_years") or 0.0), reverse=True)