from app.database.session import get_db
from app.models.vendor import Vendor
from app.models.user import User
from app.models.interviewer import Interviewer
import datetime

db = next(get_db())

print("VENDORS:")
for v in db.query(Vendor).all():
    print(f"Name: {v.name}, Email: {v.email}, Token: {v.reset_token}, Expires: {v.reset_token_expires}")

print("\nUSERS:")
for u in db.query(User).all():
    print(f"Name: {u.name}, Email: {u.email}, Token: {u.reset_token}, Expires: {u.reset_token_expires}")

print("\nINTERVIEWERS:")
for i in db.query(Interviewer).all():
    print(f"Name: {i.name}, Email: {i.email}, Token: {i.reset_token}, Expires: {i.reset_token_expires}")

print("\nCurrent UTC time:", datetime.datetime.now(datetime.timezone.utc))
