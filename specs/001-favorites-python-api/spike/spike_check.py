"""Throwaway spike for issue #133: SQLAlchemy 2.1 + mssql-python against the real Favorites schema.
Not part of the service. Run in a Linux container against a disposable SQL Server."""
import os
import sys
import threading
import time
import uuid
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.exc import IntegrityError

host, port, pw = os.environ["MSSQL_HOST"], os.environ.get("MSSQL_PORT", "14333"), os.environ["MSSQL_PW"]
results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok, detail))
    print(("PASS " if ok else "FAIL ") + name + (f" :: {detail}" if detail else ""), flush=True)


def url(db: str) -> str:
    return f"mssql+mssqlpython://sa:{pw}@{host}:{port}/{db}?TrustServerCertificate=yes&Encrypt=yes"


# 1. connect and create the database
admin = sa.create_engine(url("master"), isolation_level="AUTOCOMMIT")
with admin.connect() as c:
    ver = c.execute(sa.text("select @@version")).scalar_one().splitlines()[0]
    check("connect with mssql-python (no ODBC manager)", True, ver)
    c.execute(sa.text("IF DB_ID('FavoritesSpike') IS NOT NULL DROP DATABASE FavoritesSpike"))
    c.execute(sa.text("CREATE DATABASE FavoritesSpike"))

engine = sa.create_engine(url("FavoritesSpike"), pool_size=10)

# 2. the exact schema of EF migration InitialCreate (Users, ExternalLogins, Favorites and their indexes)
DDL = [
    """CREATE TABLE Users (Id uniqueidentifier NOT NULL CONSTRAINT DF_U_Id DEFAULT NEWID(),
       DisplayName nvarchar(200) NOT NULL, Email nvarchar(320) NOT NULL,
       CreateAt datetime2 NOT NULL CONSTRAINT DF_U_C DEFAULT SYSUTCDATETIME(), UpdateAt datetime2 NULL,
       CONSTRAINT PK_Users PRIMARY KEY (Id))""",
    """CREATE TABLE ExternalLogins (Id bigint IDENTITY(1,1) NOT NULL, UserId uniqueidentifier NOT NULL,
       Provider nvarchar(50) NOT NULL, ProviderUserId nvarchar(200) NOT NULL,
       CreateAt datetime2 NOT NULL CONSTRAINT DF_E_C DEFAULT SYSUTCDATETIME(),
       CONSTRAINT PK_ExternalLogins PRIMARY KEY (Id),
       CONSTRAINT FK_ExternalLogins_Users_UserId FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE)""",
    """CREATE TABLE Favorites (Id bigint IDENTITY(1,1) NOT NULL, UserId uniqueidentifier NOT NULL,
       ResourceType nvarchar(50) NOT NULL, ResourceId int NOT NULL,
       CreateAt datetime2 NOT NULL CONSTRAINT DF_F_C DEFAULT SYSUTCDATETIME(),
       CONSTRAINT PK_Favorites PRIMARY KEY (Id),
       CONSTRAINT FK_Favorites_Users_UserId FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE)""",
    "CREATE UNIQUE INDEX IX_ExternalLogins_Provider_ProviderUserId ON ExternalLogins (Provider, ProviderUserId)",
    "CREATE INDEX IX_ExternalLogins_UserId ON ExternalLogins (UserId)",
    "CREATE UNIQUE INDEX IX_Favorites_UserId_ResourceType_ResourceId ON Favorites (UserId, ResourceType, ResourceId)",
    "CREATE INDEX IX_Users_Email ON Users (Email)",
]
with engine.begin() as c:
    for stmt in DDL:
        c.execute(sa.text(stmt))
check("schema created from the migration's DDL", True, f"{len(DDL)} statements")

# 3. Core table definitions that only MAP the existing tables (the service never creates them)
md = sa.MetaData()
users = sa.Table("Users", md, sa.Column("Id", sa.Uuid, primary_key=True, server_default=sa.text("NEWID()")),
                 sa.Column("DisplayName", sa.String(200)), sa.Column("Email", sa.String(320)),
                 sa.Column("CreateAt", sa.DateTime, server_default=sa.text("SYSUTCDATETIME()")))
favs = sa.Table("Favorites", md, sa.Column("Id", sa.BigInteger, primary_key=True),
                sa.Column("UserId", sa.Uuid, sa.ForeignKey("Users.Id")), sa.Column("ResourceType", sa.String(50)),
                sa.Column("ResourceId", sa.Integer), sa.Column("CreateAt", sa.DateTime))

with engine.begin() as c:
    uid = c.execute(sa.insert(users).values(DisplayName="Spike", Email="spike@example.test").returning(users.c.Id)).scalar_one()
check("server-generated Guid key comes back as uuid.UUID", isinstance(uid, uuid.UUID), str(type(uid).__name__))

now = datetime.utcnow()
with engine.begin() as c:
    row = c.execute(sa.insert(favs).values(UserId=uid, ResourceType="character", ResourceId=1, CreateAt=now)
                    .returning(favs.c.Id, favs.c.CreateAt)).one()
check("insert returns bigint identity and datetime2", isinstance(row.Id, int) and abs((row.CreateAt - now).total_seconds()) < 1,
      f"id={row.Id} createAt={row.CreateAt.isoformat()}")

# 4. duplicate: how does the driver report the unique-index violation (EF code uses SQL error 2601/2627)?
codes = None
try:
    with engine.begin() as c:
        c.execute(sa.insert(favs).values(UserId=uid, ResourceType="character", ResourceId=1, CreateAt=now))
    check("duplicate insert raises IntegrityError", False, "no error")
except IntegrityError as e:
    orig = e.orig
    codes = repr(orig.args)[:160]
    msg = str(orig)
    has_code = any(s in msg for s in ("2601", "2627"))
    check("duplicate insert raises IntegrityError", True, f"{type(orig).__module__}.{type(orig).__name__}")
    check("SQL Server error number 2601/2627 is visible in the exception", has_code, codes)

# 5. simultaneous duplicates: exactly one row, the rest are IntegrityError
ok, dup, other = [], [], []
lock = threading.Lock()


def worker() -> None:
    try:
        with engine.begin() as c:
            c.execute(sa.insert(favs).values(UserId=uid, ResourceType="episode", ResourceId=7, CreateAt=datetime.utcnow()))
        with lock:
            ok.append(1)
    except IntegrityError:
        with lock:
            dup.append(1)
    except Exception as e:  # noqa: BLE001
        with lock:
            other.append(repr(e)[:120])


threads = [threading.Thread(target=worker) for _ in range(8)]
[t.start() for t in threads]
[t.join() for t in threads]
with engine.connect() as c:
    n = c.execute(sa.select(sa.func.count()).select_from(favs).where(favs.c.ResourceType == "episode")).scalar_one()
check("8 simultaneous identical adds -> exactly 1 stored", n == 1 and len(ok) == 1 and len(dup) == 7 and not other,
      f"stored={n} ok={len(ok)} conflict={len(dup)} other={other}")

# 6. cascade delete as in the schema
with engine.begin() as c:
    c.execute(sa.delete(users).where(users.c.Id == uid))
    left = c.execute(sa.select(sa.func.count()).select_from(favs).where(favs.c.UserId == uid)).scalar_one()
check("deleting a user cascades to favorites", left == 0, f"favorites left={left}")

# 7. rough latency of a primary-key read through the pool
with engine.begin() as c:
    u2 = c.execute(sa.insert(users).values(DisplayName="Lat", Email="lat@example.test").returning(users.c.Id)).scalar_one()
t0 = time.perf_counter()
with engine.connect() as c:
    for _ in range(200):
        c.execute(sa.select(users.c.Id).where(users.c.Id == u2)).scalar_one()
check("200 sequential reads", True, f"{(time.perf_counter() - t0) * 1000 / 200:.2f} ms each (local emulated SQL Server)")

failed = [r for r in results if not r[1]]
print(f"\nSUMMARY {len(results) - len(failed)}/{len(results)} passed")
sys.exit(1 if failed else 0)
