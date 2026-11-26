import os, sqlalchemy as sa
from sqlalchemy.exc import IntegrityError
host, pw = os.environ["MSSQL_HOST"], os.environ["MSSQL_PW"]
e = sa.create_engine(f"mssql+mssqlpython://sa:{pw}@{host}:14333/FavoritesSpike?TrustServerCertificate=yes&Encrypt=yes")
def attempt(label, sql):
    try:
        with e.begin() as c: c.execute(sa.text(sql))
    except IntegrityError as ex:
        o = ex.orig
        pub = {k: (v if not callable(v) else "<callable>") for k, v in vars(o).items()}
        print(f"[{label}] class={type(o).__name__}")
        print("   vars:", {k: str(v)[:90] for k, v in pub.items()})
        print("   public attrs:", [a for a in dir(o) if not a.startswith('_')][:14])
        print("   text:", str(o)[:230].replace(pw, '***'))
with e.begin() as c:
    c.execute(sa.text("INSERT INTO Users (DisplayName,Email) VALUES ('p','p@x.test')"))
    uid = c.execute(sa.text("SELECT TOP 1 Id FROM Users")).scalar_one()
c = e.connect(); c.execute(sa.text(f"INSERT INTO Favorites (UserId,ResourceType,ResourceId) VALUES ('{uid}','location',5)")); c.commit(); c.close()
attempt("unique violation", f"INSERT INTO Favorites (UserId,ResourceType,ResourceId) VALUES ('{uid}','location',5)")
attempt("foreign key violation", "INSERT INTO Favorites (UserId,ResourceType,ResourceId) VALUES (NEWID(),'location',6)")
