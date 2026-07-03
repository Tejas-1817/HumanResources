import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

db_url = f"mysql+pymysql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}/{os.getenv('DB_NAME')}"
engine = create_engine(db_url)

def check_db():
    with engine.connect() as conn:
        print("Checking tables...")
        # Get all companies
        companies = conn.execute(text("SELECT id, name FROM companies")).fetchall()
        for c_id, c_name in companies:
            print(f"\nCompany: {c_name} (ID: {c_id})")
            
            # Count roles
            role_count = conn.execute(text("SELECT COUNT(*) FROM job_roles WHERE company_id = :cid"), {"cid": c_id}).scalar()
            print(f"  Roles: {role_count}")
            
            # Count applications via roles
            app_count = conn.execute(text("""
                SELECT COUNT(*) 
                FROM job_applications ja
                JOIN job_roles jr ON ja.job_role_id = jr.id
                WHERE jr.company_id = :cid
            """), {"cid": c_id}).scalar()
            print(f"  Applications (Pipeline items): {app_count}")
            
            if app_count > 0:
                apps = conn.execute(text("""
                    SELECT ja.id, ja.status, jr.title 
                    FROM job_applications ja
                    JOIN job_roles jr ON ja.job_role_id = jr.id
                    WHERE jr.company_id = :cid
                """), {"cid": c_id}).fetchall()
                for aid, astatus, rtitle in apps[:3]: # Show first 3
                    print(f"    - App {aid}: {astatus} for {rtole}") # Typo in my script? rtitle.
                    
        print("\nAll applications count:", conn.execute(text("SELECT COUNT(*) FROM job_applications")).scalar())

if __name__ == "__main__":
    check_db()
