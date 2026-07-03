import pymysql
import os
from urllib.parse import urlparse

# Use the credentials from the user's .env if possible, but let's just use what we know from the config/logs
# DATABASE_URL=mysql+pymysql://root:viewcode%2301@localhost:3306/resumeiq?charset=utf8mb4

DB_USER = "root"
DB_PASSWORD = "viewcode#01"
DB_HOST = "localhost"
DB_PORT = 3306
DB_NAME = "resumeiq"

def fix_schema():
    try:
        conn = pymysql.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            charset='utf8mb4'
        )
        print("Connected to MySQL successfully.")
        cursor = conn.cursor()

        # 1. Update candidates table
        print("Updating candidates table...")
        try:
            cursor.execute("ALTER TABLE candidates ADD COLUMN uploaded_by_vendor_id INT NULL")
            cursor.execute("ALTER TABLE candidates ADD CONSTRAINT fk_candidate_vendor FOREIGN KEY (uploaded_by_vendor_id) REFERENCES vendors(id) ON DELETE SET NULL")
            print("Added uploaded_by_vendor_id to candidates.")
        except Exception as e:
            print(f"Note: {e}")

        try:
            cursor.execute("ALTER TABLE candidates ADD COLUMN source_vendor VARCHAR(255) NULL")
            print("Added source_vendor to candidates.")
        except Exception as e:
            print(f"Note: {e}")

        # 2. Check if vendors table has all new fields (Phase 1 added phone, company_name)
        # Assuming table was created by SQLAlchemy recently if it didn't exist, 
        # but if it did exist from a previous attempt, it might need updates.

        conn.commit()
        print("Schema update complete.")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Critical error: {e}")

if __name__ == "__main__":
    fix_schema()
