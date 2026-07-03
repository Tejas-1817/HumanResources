import os
import pymysql
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
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )

    try:
        with connection.cursor() as cursor:
            # Add source column
            try:
                print("Adding 'source' column to candidates table...")
                cursor.execute(
                    "ALTER TABLE candidates ADD COLUMN source VARCHAR(50) NOT NULL DEFAULT 'direct' AFTER raw_text"
                )
                connection.commit()
                print("  OK: 'source' column added.")
            except Exception as e:
                if "Duplicate column name" in str(e):
                    print("  SKIP: 'source' column already exists.")
                else:
                    raise

            # Add consultancy_name column
            try:
                print("Adding 'consultancy_name' column to candidates table...")
                cursor.execute(
                    "ALTER TABLE candidates ADD COLUMN consultancy_name VARCHAR(255) NULL AFTER source"
                )
                connection.commit()
                print("  OK: 'consultancy_name' column added.")
            except Exception as e:
                if "Duplicate column name" in str(e):
                    print("  SKIP: 'consultancy_name' column already exists.")
                else:
                    raise

        print("\nMigration complete!")
    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        connection.close()


if __name__ == "__main__":
    run_migration()
