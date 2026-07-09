import pymysql

passwords = [
    "root",
    "admin",
    "Admin@123",
    "123456",
    "1234",
    "mysql",
    "password",
    "root123",
    "admin123"
]

found = False
for pwd in passwords:
    try:
        conn = pymysql.connect(
            host="localhost",
            port=3306,
            user="root",
            password=pwd,
            charset="utf8mb4"
        )
        print(f"SUCCESS: Connected with password '{pwd}'")
        conn.close()
        found = True
        break
    except pymysql.err.OperationalError as e:
        if e.args[0] == 1045:
            # Access denied, try next
            continue
        else:
            print(f"Error for password '{pwd}': {e}")
            break
    except Exception as e:
        print(f"Error for password '{pwd}': {e}")
        break

if not found:
    print("None of the common passwords worked.")
