"""Regression coverage for text-note create, update, and delete."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from models import Base, ErrorNotebookEntry
from routes import error_notebook


class ErrorNotebookRouteTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(bind=self.engine)
        self.db_patch = patch.object(error_notebook, "get_db_sync", side_effect=self.session_factory)
        self.db_patch.start()

    def tearDown(self):
        self.db_patch.stop()
        self.engine.dispose()

    async def test_text_note_persists_and_can_be_updated(self):
        created = await error_notebook.create_entry(1, error_notebook.ErrorNotebookCreate(
            problem_title="动态规划笔记",
            problem_platform="笔记",
            tags=["动态规划"],
            user_approach="原始正文",
        ))

        listed = await error_notebook.list_entries(1, platform=None, difficulty=None, tag=None)
        self.assertEqual(len(listed), 1)
        self.assertEqual(listed[0]["problem_title"], "动态规划笔记")
        self.assertEqual(listed[0]["user_approach"], "原始正文")
        self.assertEqual(listed[0]["notes"], "")

        updated = await error_notebook.update_entry(
            1,
            created["id"],
            error_notebook.ErrorNotebookUpdate(
                problem_title="更新后的标题",
                user_approach="更新后的正文",
            ),
        )
        self.assertEqual(updated["problem_title"], "更新后的标题")
        self.assertEqual(updated["user_approach"], "更新后的正文")

        persisted = self.session_factory().query(ErrorNotebookEntry).one()
        self.assertEqual(persisted.problem_title, "更新后的标题")
        self.assertEqual(persisted.user_approach, "更新后的正文")

    async def test_delete_removes_text_note(self):
        created = await error_notebook.create_entry(1, error_notebook.ErrorNotebookCreate(
            problem_title="待删除笔记",
            problem_platform="笔记",
        ))

        result = await error_notebook.delete_entry(1, created["id"])
        self.assertEqual(result, {"ok": True})
        self.assertEqual(await error_notebook.list_entries(1, platform=None, difficulty=None, tag=None), [])


if __name__ == "__main__":
    unittest.main()
