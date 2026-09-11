import sys
import os
from datetime import datetime, timezone, date

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from sqlalchemy import select, and_, or_
from app.database.session import SessionLocal
import app.models.vendor
import app.models.user
import app.models.activity_log
from app.models.candidate import Candidate
from app.models.company import Company
from app.models.job_role import JobRole
from app.models.job_application import JobApplication
from app.services.candidate_service import CandidateService
from app.services.application_service import ApplicationService
from app.schemas.job_application import ApplicationCreate, ApplicationStatusUpdate

def run_tests():
    db = SessionLocal()
    print("=== STARTING COMPANY-WISE & PROJECT-WISE CANDIDATE HISTORY TESTS ===")

    test_email = "adhiraj.pradhan.test@example.com"

    # Cleanup any previous test data
    existing_cand = db.query(Candidate).filter(Candidate.email == test_email).first()
    if existing_cand:
        db.delete(existing_cand)
        db.commit()

    # 1. Setup Companies
    def get_or_create_company(name):
        c = db.query(Company).filter(Company.name == name).first()
        if not c:
            c = Company(name=name, location="Test City", note="Test Company")
            db.add(c)
            db.commit()
            db.refresh(c)
        return c

    comp_itxm = get_or_create_company("ITxM")
    comp_gyde = get_or_create_company("Gyde")
    comp_c = get_or_create_company("Company C")

    # 2. Setup Job Roles
    def get_or_create_role(company, title):
        r = db.query(JobRole).filter(JobRole.company_id == company.id, JobRole.title == title).first()
        if not r:
            r = JobRole(
                company_id=company.id,
                title=title,
                description=f"Role {title} at {company.name}",
                positions_required=2,
                status="open"
            )
            db.add(r)
            db.commit()
            db.refresh(r)
        return r

    role_dummy28 = get_or_create_role(comp_itxm, "Dummy28")
    role_abc = get_or_create_role(comp_gyde, "Project ABC")
    role_c = get_or_create_role(comp_c, "Project C")

    # Helper functions to check state
    def check_candidate_state(cand_id):
        # Master candidate count
        cand_count = db.query(Candidate).filter(Candidate.email == test_email).count()
        assert cand_count == 1, f"Expected exactly 1 candidate record, found {cand_count}"

        # Total candidates query
        items, total = CandidateService.get_all(db, search="Adhiraj Pradhan")
        in_total = any(c.id == cand_id for c in items)

        # Selected query
        selected_items, _ = CandidateService.get_all(db, applicant_status="selected")
        in_selected = any(c.id == cand_id for c in selected_items)

        # On Bench query
        bench_items, _ = CandidateService.get_all(db, applicant_status="available")
        in_bench = any(c.id == cand_id for c in bench_items)

        # Applications / History
        apps = ApplicationService.get_all(db, candidate_id=cand_id)

        return in_total, in_selected, in_bench, apps

    # Create Candidate Master
    cand = Candidate(
        name="Adhiraj Pradhan",
        email=test_email,
        phone="+91 9876543210",
        skills="Java, Spring Boot, Microservices",
        experience_years=5.0,
        source="direct",
        original_filename="adhiraj_resume.pdf"
    )
    db.add(cand)
    db.commit()
    db.refresh(cand)
    cand_id = cand.id
    print(f"Created Candidate Master: ID={cand_id}, Name={cand.name}, Email={cand.email}")

    # =========================================================================
    # TEST 1: Candidate -> ITxM -> Dummy28 -> Active (selected)
    # Expected: Total Candidates = YES, Selected = YES, On Bench = NO
    # =========================================================================
    print("\n--- Running TEST 1 ---")
    app1 = ApplicationService.create(
        db,
        ApplicationCreate(
            candidate_id=cand_id,
            job_role_id=role_dummy28.id,
            status="selected",
            start_date=date(2026, 1, 1)
        ),
        submitted_by=None
    )
    in_total, in_selected, in_bench, apps = check_candidate_state(cand_id)
    print(f"TEST 1 Results: Total={in_total}, Selected={in_selected}, OnBench={in_bench}, History Count={len(apps)}")
    assert in_total == True, "TEST 1 Failed: Candidate must be in Total Candidates"
    assert in_selected == True, "TEST 1 Failed: Candidate must be in Selected"
    assert in_bench == False, "TEST 1 Failed: Candidate must NOT be On Bench"
    assert len(apps) == 1, "TEST 1 Failed: Expected 1 application"
    assert apps[0].status == "selected"
    assert apps[0].company_name == "ITxM"
    assert apps[0].job_role_title == "Dummy28"
    print(">>> TEST 1 PASSED!")

    # =========================================================================
    # TEST 2: Complete Dummy28
    # Expected: Total Candidates = YES, Selected = NO, On Bench = YES
    # History: ITxM -> Dummy28 -> Completed
    # =========================================================================
    print("\n--- Running TEST 2 ---")
    ApplicationService.update_status(
        db,
        app1.id,
        ApplicationStatusUpdate(
            status="completed",
            end_date=date(2026, 8, 31),
            completion_date=datetime(2026, 8, 31, 18, 0, tzinfo=timezone.utc),
            note="Completed project Dummy28 successfully"
        ),
        changed_by=None
    )
    in_total, in_selected, in_bench, apps = check_candidate_state(cand_id)
    print(f"TEST 2 Results: Total={in_total}, Selected={in_selected}, OnBench={in_bench}, History Count={len(apps)}")
    assert in_total == True, "TEST 2 Failed: Candidate must be in Total Candidates"
    assert in_selected == False, "TEST 2 Failed: Candidate must NOT be in Selected"
    assert in_bench == True, "TEST 2 Failed: Candidate must be in On Bench"
    assert len(apps) == 1, "TEST 2 Failed: History must be preserved"
    assert apps[0].status == "completed"
    assert apps[0].company_name == "ITxM"
    assert apps[0].job_role_title == "Dummy28"
    assert apps[0].end_date == date(2026, 8, 31)
    print(">>> TEST 2 PASSED!")

    # =========================================================================
    # TEST 3: Assign same candidate to Gyde -> Project ABC (Active)
    # Expected: Total Candidates = YES, Selected = YES, On Bench = NO
    # History: ITxM -> Dummy28 -> Completed, Gyde -> Project ABC -> Active
    # There must be ONLY ONE candidate record.
    # =========================================================================
    print("\n--- Running TEST 3 ---")
    app2 = ApplicationService.create(
        db,
        ApplicationCreate(
            candidate_id=cand_id,
            job_role_id=role_abc.id,
            status="selected",
            start_date=date(2026, 9, 1)
        ),
        submitted_by=None
    )
    in_total, in_selected, in_bench, apps = check_candidate_state(cand_id)
    print(f"TEST 3 Results: Total={in_total}, Selected={in_selected}, OnBench={in_bench}, History Count={len(apps)}")
    assert in_total == True, "TEST 3 Failed: Candidate must be in Total Candidates"
    assert in_selected == True, "TEST 3 Failed: Candidate must be in Selected under Gyde"
    assert in_bench == False, "TEST 3 Failed: Candidate must NOT be On Bench"
    assert len(apps) == 2, "TEST 3 Failed: Expected 2 history records"
    # Verify ITxM record was NOT overwritten
    itxm_app = next(a for a in apps if a.job_role_id == role_dummy28.id)
    gyde_app = next(a for a in apps if a.job_role_id == role_abc.id)
    assert itxm_app.status == "completed", "ITxM assignment status must still be completed"
    assert itxm_app.company_name == "ITxM"
    assert gyde_app.status == "selected", "Gyde assignment status must be selected (active)"
    assert gyde_app.company_name == "Gyde"
    print(">>> TEST 3 PASSED!")

    # =========================================================================
    # TEST 4: Complete Gyde Project ABC
    # Expected: Total Candidates = YES, Selected = NO, On Bench = YES
    # History: ITxM -> Dummy28 -> Completed, Gyde -> Project ABC -> Completed
    # =========================================================================
    print("\n--- Running TEST 4 ---")
    ApplicationService.update_status(
        db,
        app2.id,
        ApplicationStatusUpdate(
            status="completed",
            end_date=date(2027, 2, 28),
            completion_date=datetime(2027, 2, 28, 18, 0, tzinfo=timezone.utc),
            note="Completed Project ABC at Gyde"
        ),
        changed_by=None
    )
    in_total, in_selected, in_bench, apps = check_candidate_state(cand_id)
    print(f"TEST 4 Results: Total={in_total}, Selected={in_selected}, OnBench={in_bench}, History Count={len(apps)}")
    assert in_total == True, "TEST 4 Failed: Candidate must be in Total Candidates"
    assert in_selected == False, "TEST 4 Failed: Candidate must NOT be in Selected"
    assert in_bench == True, "TEST 4 Failed: Candidate must be On Bench"
    assert len(apps) == 2, "TEST 4 Failed: Expected 2 history records"
    assert all(a.status == "completed" for a in apps), "TEST 4 Failed: Both must be completed"
    print(">>> TEST 4 PASSED!")

    # =========================================================================
    # TEST 5: Assign same candidate to Company C -> Project C (Active)
    # Expected: Total Candidates = YES, Selected = YES, On Bench = NO
    # History: ITxM -> Dummy28 -> Completed, Gyde -> Project ABC -> Completed, Company C -> Project C -> Active
    # =========================================================================
    print("\n--- Running TEST 5 ---")
    app3 = ApplicationService.create(
        db,
        ApplicationCreate(
            candidate_id=cand_id,
            job_role_id=role_c.id,
            status="selected",
            start_date=date(2027, 3, 1)
        ),
        submitted_by=None
    )
    in_total, in_selected, in_bench, apps = check_candidate_state(cand_id)
    print(f"TEST 5 Results: Total={in_total}, Selected={in_selected}, OnBench={in_bench}, History Count={len(apps)}")
    assert in_total == True, "TEST 5 Failed: Candidate must be in Total Candidates"
    assert in_selected == True, "TEST 5 Failed: Candidate must be in Selected under Company C"
    assert in_bench == False, "TEST 5 Failed: Candidate must NOT be in On Bench"
    assert len(apps) == 3, "TEST 5 Failed: Expected 3 distinct assignments"

    # Verify company filter
    itxm_cands, _ = CandidateService.get_all(db, company_id=comp_itxm.id)
    gyde_cands, _ = CandidateService.get_all(db, company_id=comp_gyde.id)
    comp_c_cands, _ = CandidateService.get_all(db, company_id=comp_c.id)
    assert any(c.id == cand_id for c in itxm_cands), "Company filter: Candidate must appear under ITxM history"
    assert any(c.id == cand_id for c in gyde_cands), "Company filter: Candidate must appear under Gyde history"
    assert any(c.id == cand_id for c in comp_c_cands), "Company filter: Candidate must appear under Company C history"

    # Verify project filter
    dummy28_cands, _ = CandidateService.get_all(db, job_role_id=role_dummy28.id)
    abc_cands, _ = CandidateService.get_all(db, job_role_id=role_abc.id)
    c_cands, _ = CandidateService.get_all(db, job_role_id=role_c.id)
    assert any(c.id == cand_id for c in dummy28_cands), "Project filter: Candidate must appear under Dummy28"
    assert any(c.id == cand_id for c in abc_cands), "Project filter: Candidate must appear under Project ABC"
    assert any(c.id == cand_id for c in c_cands), "Project filter: Candidate must appear under Project C"

    print(">>> TEST 5 PASSED!")
    print("\n=======================================================")
    print("ALL 5 TESTS PASSED PERFECTLY!")
    print("ONE CANDIDATE RECORD MAINTAINED.")
    print("COMPLETE HISTORICAL ASSIGNMENT RECORDS PRESERVED.")
    print("=======================================================")

    # Cleanup test data
    db.delete(cand)
    db.commit()
    db.close()

if __name__ == "__main__":
    run_tests()
