import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

host = os.getenv("DB_HOST", "localhost")
port = int(os.getenv("DB_PORT", 3306))
user = os.getenv("DB_USER", "root")
password = os.getenv("DB_PASSWORD", "viewcode#01")
db_name = os.getenv("DB_NAME", "resumeiq")

def run_migration():
    connection = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=db_name,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )

    try:
        with connection.cursor() as cursor:
            print(f"Adding cost management columns to job_roles table...")
            
            # Add estimated_budget
            try:
                cursor.execute("ALTER TABLE job_roles ADD COLUMN estimated_budget FLOAT AFTER pipeline_stages")
                print("Added estimated_budget")
            except Exception as e:
                if "Duplicate column name" in str(e): print("estimated_budget exists")
                else: raise e
            
            # Add deal_amount
            try:
                cursor.execute("ALTER TABLE job_roles ADD COLUMN deal_amount FLOAT AFTER estimated_budget")
                print("Added deal_amount")
            except Exception as e:
                if "Duplicate column name" in str(e): print("deal_amount exists")
                else: raise e

            # Add currency
            try:
                cursor.execute("ALTER TABLE job_roles ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'INR' AFTER deal_amount")
                print("Added currency")
            except Exception as e:
                if "Duplicate column name" in str(e): print("currency exists")
                else: raise e

            connection.commit()
            print("Migration successful!")
    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        connection.close()

if __name__ == "__main__":
    run_migration()
