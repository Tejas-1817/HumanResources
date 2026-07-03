import os
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Import models
import sys
sys.path.append(os.getcwd())
from app.models.job_application import JobApplication
from app.models.job_role import JobRole
from app.models.company import Company

load_dotenv()

db_url = f"mysql+pymysql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}/{os.getenv('DB_NAME')}"
engine = create_engine(db_url)

def check():
    with Session(engine) as session:
        # Get all companies
        companies = session.execute(select(Company)).scalars().all()
        for comp in companies:
            print(f"Company: {comp.name} (ID: {comp.id})")
            # Applications for this company roles
            apps = session.query(JobApplication).join(JobRole).filter(JobRole.company_id == comp.id).all()
            print(f"  Total Applications: {len(apps)}")
            for app in apps:
                # Double check the role's company
                role = session.get(JobRole, app.job_role_id)
                if role.company_id != comp.id:
                    print(f"  !!! LEAK !!! App {app.id} belongs to role {role.id} (Company {role.company_id}) but found in Company {comp.id} query!")
                else:
                    pass
        print("Done check.")

if __name__ == "__main__":
    check()
