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
            print(f"Adding status_date column to job_applications table...")
            try:
                cursor.execute("ALTER TABLE job_applications ADD COLUMN status_date DATETIME(6) NULL AFTER status")
                print("Added status_date")
            except Exception as e:
                if "Duplicate column name" in str(e): print("status_date column already exists")
                else: raise e

            connection.commit()
            print("Migration successful!")
    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        connection.close()

if __name__ == "__main__":
    run_migration()
