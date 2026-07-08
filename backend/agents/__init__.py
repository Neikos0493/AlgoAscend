"""
多智能体系统 — 基于 CrewAI 框架
"""
from .crewai_orchestrator import CrewAIOrchestrator
from .crewai_agents import (
    get_llm,
    create_profile_analyst,
    create_content_expert,
    create_exercise_coach,
    create_path_planner,
    create_tutor,
    create_assessment_analyst,
    create_content_reviewer,
)

__all__ = [
    "CrewAIOrchestrator",
    "get_llm",
    "create_profile_analyst",
    "create_content_expert",
    "create_exercise_coach",
    "create_path_planner",
    "create_tutor",
    "create_assessment_analyst",
    "create_content_reviewer",
]
