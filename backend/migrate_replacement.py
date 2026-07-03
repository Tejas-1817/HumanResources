import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

# Extract connection info from .env or manual config
# Using pymysql directly for a simple ALTER TABLE
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
            print(f"Adding is_replacement column to job_applications table...")
            # Using Boolean (TINYINT(1)) with default 0 (False)
            sql = "ALTER TABLE job_applications ADD COLUMN is_replacement TINYINT(1) NOT NULL DEFAULT 0 AFTER status"
            cursor.execute(sql)
            connection.commit()
            print("Migration successful!")
    except Exception as e:
        if "Duplicate column name" in str(e):
            print("Column 'is_replacement' already exists. Skipping.")
        else:
            print(f"Error during migration: {e}")
    finally:
        connection.close()

if __name__ == "__main__":
    run_migration()
