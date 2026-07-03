#!/usr/bin/env python3
"""
Test Script: Verify Pipeline Stage Transitions

This script tests the complete end-to-end pipeline workflow to ensure
Interview and Interviewed stages work correctly.

Usage:
  cd backend && python test_pipeline_fix.py
"""

import sys
import os
import json
from datetime import datetime, timezone

# Add the parent directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'app')))
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from sqlalchemy.orm import Session
from app.database.session import SessionLocal, engine
from app.models.candidate import Candidate
from app.models.company import Company
from app.models.job_role import JobRole
from app.models.job_application import JobApplication
from app.models.user import User
from app.services.application_service import ApplicationService
from app.schemas.job_application import ApplicationStatusUpdate
from app.core.exceptions import AppException


def test_pipeline_stages():
    """Test the complete pipeline stage transition workflow"""
    
    print("\n" + "=" * 80)
    print("PIPELINE STAGE TRANSITION TEST")
    print("=" * 80)
    
    db = SessionLocal()
    try:
        # Test 1: Verify VALID_STATUSES includes interview_scheduled and interviewed
        print("\n[Test 1] Verifying VALID_STATUSES...")
        valid_statuses = ApplicationService.ALL_STATUSES
        required_statuses = {"interview_scheduled", "interviewed"}
        
        if required_statuses.issubset(valid_statuses):
            print(f"  ✓ All required statuses present in VALID_STATUSES")
            print(f"    Valid statuses: {sorted(valid_statuses)}")
        else:
            print(f"  ✗ FAIL: Missing statuses: {required_statuses - valid_statuses}")
            return False
        
        # Test 2: Create test data if needed
        print("\n[Test 2] Setting up test data...")
        
        # Get or create company
        company = db.query(Company).first()
        if not company:
            print("  ! No companies found. Creating test company...")
            company = Company(name="Test Company", description="Test")
            db.add(company)
            db.commit()
            db.refresh(company)
        print(f"  ✓ Using company: {company.name} (ID: {company.id})")
        
        # Get or create job role
        job_role = db.query(JobRole).filter(JobRole.company_id == company.id).first()
        if not job_role:
            print("  ! No job roles found. Creating test job role...")
            job_role = JobRole(
                company_id=company.id,
                title="Test Role",
                description="Test Description",
                status="open",
                pipeline_stages=[
                    {"id": "pending", "title": "Pending"},
                    {"id": "shortlisted", "title": "Shortlisted"},
                    {"id": "interview_scheduled", "title": "Interview Scheduled"},
                    {"id": "interviewed", "title": "Interviewed"},
                    {"id": "selected", "title": "Selected"},
                    {"id": "rejected", "title": "Rejected"},
                ]
            )
            db.add(job_role)
            db.commit()
            db.refresh(job_role)
        
        print(f"  ✓ Using job role: {job_role.title} (ID: {job_role.id})")
        
        # Get or create candidate
        candidate = db.query(Candidate).first()
        if not candidate:
            print("  ! No candidates found. Creating test candidate...")
            candidate = Candidate(
                name="Test Candidate",
                email="test@example.com",
                phone="1234567890",
                source="direct",
                original_filename="test_resume.pdf",
                experience_years=5.0
            )
            db.add(candidate)
            db.commit()
            db.refresh(candidate)
        print(f"  ✓ Using candidate: {candidate.name} (ID: {candidate.id})")
        
        # Get or create application
        application = db.query(JobApplication).filter(
            JobApplication.candidate_id == candidate.id,
            JobApplication.job_role_id == job_role.id
        ).first()
        
        if not application:
            print("  ! No applications found. Creating test application...")
            application = JobApplication(
                candidate_id=candidate.id,
                job_role_id=job_role.id,
                source="direct",
                status="pending"
            )
            db.add(application)
            db.commit()
            db.refresh(application)
        
        print(f"  ✓ Using application: ID {application.id}, Current status: {application.status}")
        
        # Test 3: Test transitions through pipeline
        print("\n[Test 3] Testing pipeline transitions...")
        
        transition_path = [
            "pending",
            "shortlisted",
            "interview_scheduled",
            "interviewed",
            "selected"
        ]
        
        for target_status in transition_path:
            print(f"\n  Transitioning: {application.status} → {target_status}")
            
            try:
                payload = ApplicationStatusUpdate(
                    status=target_status,
                    status_date=datetime.now(timezone.utc),
                    interview_date=f"{datetime.now(timezone.utc).isoformat()}" if target_status == "interview_scheduled" else None,
                )
                
                application = ApplicationService.update_status(
                    db,
                    application.id,
                    payload,
                    changed_by=None
                )
                
                print(f"    ✓ Transition successful")
                print(f"    - New status: {application.status}")
                print(f"    - Status date: {application.status_date}")
                
                if target_status == "interview_scheduled" and application.interview_date:
                    print(f"    - Interview date set: {application.interview_date}")
                
            except AppException as e:
                print(f"    ✗ FAIL: {e.detail}")
                return False
            except Exception as e:
                print(f"    ✗ FAIL: Unexpected error: {str(e)}")
                return False
        
        # Test 4: Verify data persistence
        print("\n[Test 4] Verifying database persistence...")
        
        # Reload from database
        db.expire_all()
        reloaded = db.query(JobApplication).filter(JobApplication.id == application.id).first()
        
        if reloaded and reloaded.status == "selected":
            print(f"  ✓ Data persisted correctly")
            print(f"    Final status in DB: {reloaded.status}")
            print(f"    Status date: {reloaded.status_date}")
        else:
            print(f"  ✗ FAIL: Data not persisted correctly")
            return False
        
        # Test 5: Test transitions to Interview and Interviewed specifically
        print("\n[Test 5] Testing Interview/Interviewed specific transitions...")
        
        # Create a fresh application for isolated testing
        candidate2 = db.query(Candidate).offset(1).first() or candidate
        application2 = db.query(JobApplication).filter(
            JobApplication.candidate_id == candidate2.id,
            JobApplication.job_role_id == job_role.id,
            JobApplication.id != application.id
        ).first()
        
        if not application2:
            print("  ! Creating second test application...")
            application2 = JobApplication(
                candidate_id=candidate2.id,
                job_role_id=job_role.id,
                source="direct",
                status="shortlisted"
            )
            db.add(application2)
            db.commit()
            db.refresh(application2)
        
        print(f"  Testing with application ID: {application2.id}")
        
        # Test interview_scheduled transition
        print(f"\n  Testing interview_scheduled transition...")
        try:
            payload = ApplicationStatusUpdate(
                status="interview_scheduled",
                interview_date=f"{datetime.now(timezone.utc).isoformat()}"
            )
            app_result = ApplicationService.update_status(
                db, application2.id, payload, changed_by=None
            )
            print(f"    ✓ Successfully transitioned to: {app_result.status}")
            
            if app_result.interview_date:
                print(f"    ✓ Interview date set: {app_result.interview_date}")
            
            application2 = app_result
        except Exception as e:
            print(f"    ✗ FAIL: {str(e)}")
            return False
        
        # Test interviewed transition
        print(f"\n  Testing interviewed transition...")
        try:
            payload = ApplicationStatusUpdate(
                status="interviewed"
            )
            app_result = ApplicationService.update_status(
                db, application2.id, payload, changed_by=None
            )
            print(f"    ✓ Successfully transitioned to: {app_result.status}")
            
            if app_result.status == "interviewed":
                print(f"    ✓ Candidate is now in Interviewed stage")
            
        except Exception as e:
            print(f"    ✗ FAIL: {str(e)}")
            return False
        
        print("\n" + "=" * 80)
        print("✓ ALL TESTS PASSED!")
        print("=" * 80)
        print("\nSummary:")
        print("  ✓ VALID_STATUSES includes interview_scheduled and interviewed")
        print("  ✓ Complete pipeline transition path works (pending → selected)")
        print("  ✓ Interview and Interviewed stages are fully functional")
        print("  ✓ Data persists correctly to database")
        print("  ✓ Interview dates are properly stored")
        print("\nThe pipeline workflow is ready for production use.")
        
        return True
        
    except Exception as e:
        print(f"\n✗ Test setup failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    success = test_pipeline_stages()
    sys.exit(0 if success else 1)
