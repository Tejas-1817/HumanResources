from app.database.session import engine
from sqlalchemy import text

with engine.connect() as conn:
    res = conn.execute(text('DESCRIBE job_roles'))
    for row in res:
        print(row)
