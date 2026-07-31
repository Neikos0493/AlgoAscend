"""
数据库初始化和会话管理
"""
import hashlib

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, Session
from config import AppConfig
from models import Base


# SQLite 的相对路径会随着启动目录变化，导致从根目录和 backend 目录启动时
# 使用两份不同的数据库。AppConfig 默认将数据库固定到 backend 目录，同时
# 允许通过 .env 中的 DATABASE_URL 覆盖。
DATABASE_URL = AppConfig().database_url

engine_kwargs = {"echo": False}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _upgrade_additive_cache_columns():
    """Add cache evolution columns for existing databases without a migration stack."""
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    with engine.begin() as connection:
        if "problem_detail_cache" in tables:
            columns = {column["name"] for column in inspector.get_columns("problem_detail_cache")}
            if "schema_version" not in columns:
                connection.execute(text(
                    "ALTER TABLE problem_detail_cache "
                    "ADD COLUMN schema_version INTEGER NOT NULL DEFAULT 1"
                ))
        if "problem_media_cache" in tables:
            columns = {column["name"] for column in inspector.get_columns("problem_media_cache")}
            if "media_key" not in columns:
                connection.execute(text("ALTER TABLE problem_media_cache ADD COLUMN media_key VARCHAR(64)"))
                rows = connection.execute(text(
                    "SELECT id, canonical_id, source_url FROM problem_media_cache"
                )).mappings()
                for row in rows:
                    media_key = hashlib.sha256(
                        f"{row['canonical_id']}\0{row['source_url']}".encode("utf-8")
                    ).hexdigest()
                    connection.execute(text(
                        "UPDATE problem_media_cache SET media_key = :media_key WHERE id = :id"
                    ), {"media_key": media_key, "id": row["id"]})
            connection.execute(text(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_problem_media_cache_media_key "
                "ON problem_media_cache (media_key)"
            ))


def init_db():
    """初始化数据库，创建所有表并补充兼容性的新增列。"""
    Base.metadata.create_all(bind=engine)
    _upgrade_additive_cache_columns()


def get_db() -> Session:
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_db_sync() -> Session:
    """同步获取数据库会话"""
    return SessionLocal()
