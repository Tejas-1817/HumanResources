import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

db_url = f"mysql+pymysql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}/{os.getenv('DB_NAME')}"
engine = create_engine(db_url)

def test_api_logic():
    with engine.connect() as conn:
        # Get a real application and its company
        row = conn.execute(text("""
            SELECT ja.id, jr.company_id 
            FROM job_applications ja
            JOIN job_roles jr ON ja.job_role_id = jr.id
            LIMIT 1
        """)).fetchone()
        
        if not row:
            print("No applications found to test.")
            return
            
        app_id, company_id = row
        print(f"Testing App ID {app_id} with Company ID {company_id}")
        
        # Simulate get_by_id_for_company
        result = conn.execute(text("""
            SELECT ja.id 
            FROM job_applications ja
            JOIN job_roles jr ON ja.job_role_id = jr.id
            WHERE ja.id = :aid AND jr.company_id = :cid
        """), {"aid": app_id, "cid": company_id}).fetchone()
        
        if result:
            print("SQL Logic: SUCCESS (Found Match)")
        else:
            print("SQL Logic: FAILURE (No Match found!)")
            
        # Check current state of resume_sent
        state = conn.execute(text("SELECT resume_sent FROM job_applications WHERE id = :aid"), {"aid": app_id}).scalar()
        print(f"Current resume_sent state: {state}")
        
        # Test update logic manually
        conn.execute(text("UPDATE job_applications SET resume_sent = 1, resume_sent_at = NOW() WHERE id = :aid"), {"aid": app_id})
        conn.commit()
        
        new_state = conn.execute(text("SELECT resume_sent FROM job_applications WHERE id = :aid"), {"aid": app_id}).scalar()
        print(f"New resume_sent state after direct SQL update: {new_state}")
        
        # Revert
        conn.execute(text("UPDATE job_applications SET resume_sent = 0 WHERE id = :aid"), {"aid": app_id})
        conn.commit()
        print("Reverted state for future tests.")

if __name__ == "__main__":
    test_api_logic()
