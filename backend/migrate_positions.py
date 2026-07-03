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
            print(f"Adding positions_required column to job_roles table...")
            
            try:
                cursor.execute("ALTER TABLE job_roles ADD COLUMN positions_required INT NOT NULL DEFAULT 1 AFTER currency")
                print("Added positions_required")
            except Exception as e:
                if "Duplicate column name" in str(e): print("positions_required exists")
                else: raise e

            connection.commit()
            print("Migration successful!")
    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        connection.close()

if __name__ == "__main__":
    run_migration()
