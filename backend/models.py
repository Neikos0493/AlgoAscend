"""
数据库模型 - SQLAlchemy ORM
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float, DateTime, JSON, ForeignKey, create_engine, Boolean
)
from sqlalchemy.orm import DeclarativeBase, Session, relationship
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker


class Base(DeclarativeBase):
    pass


class Student(Base):
    """学生基本信息"""
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), default="学习者")
    email = Column(String(200), unique=True, nullable=True)
    major = Column(String(200), default="")       # 专业
    grade = Column(String(50), default="")        # 年级
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    profile = relationship("StudentProfile", back_populates="student", uselist=False)
    messages = relationship("ChatMessage", back_populates="student")
    resources = relationship("LearningResource", back_populates="student")
    learning_paths = relationship("LearningPath", back_populates="student")
    exercises = relationship("Exercise", back_populates="student")
    assessments = relationship("Assessment", back_populates="student")


class StudentProfile(Base):
    """六维学习画像"""
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("students.id"), unique=True)

    # 维度1: 知识基础
    knowledge_base = Column(JSON, default=dict)  # {cpp_level, algorithm_level, math_level, data_structure_level}

    # 维度2: 认知风格
    cognitive_style = Column(JSON, default=dict)  # {learning_type, thinking_style, preferred_media}

    # 维度3: 学习目标
    learning_goals = Column(JSON, default=dict)   # {short_term, long_term, target_competition}

    # 维度4: 易错点偏好
    error_patterns = Column(JSON, default=dict)   # {common_errors: [...], weak_areas: [...]}

    # 维度5: 学习节奏
    learning_pace = Column(JSON, default=dict)    # {weekly_hours, session_duration, study_frequency}

    # 维度6: 兴趣领域
    interests = Column(JSON, default=dict)        # {favorite_topics: [...], preferred_difficulty}

    # 元信息
    raw_analysis = Column(Text, default="")        # 原始分析记录
    confidence_score = Column(Float, default=0.0)  # 画像置信度
    version = Column(Integer, default=1)            # 画像版本号
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = relationship("Student", back_populates="profile")

    def to_dict(self):
        return {
            "knowledge_base": self.knowledge_base,
            "cognitive_style": self.cognitive_style,
            "learning_goals": self.learning_goals,
            "error_patterns": self.error_patterns,
            "learning_pace": self.learning_pace,
            "interests": self.interests,
            "confidence_score": self.confidence_score,
            "version": self.version,
        }

    def get_dimension_count(self):
        """获取已填充的维度数"""
        dims = [
            self.knowledge_base, self.cognitive_style, self.learning_goals,
            self.error_patterns, self.learning_pace, self.interests
        ]
        return sum(1 for d in dims if d and any(v for v in (d.values() if isinstance(d, dict) else []) if v))


class ChatMessage(Base):
    """对话消息"""
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    role = Column(String(20))       # user, assistant, system
    agent_type = Column(String(50), default="")  # 哪个智能体发出的
    content = Column(Text, default="")
    content_type = Column(String(30), default="text")  # text, markdown, resource_card, exercise, etc.
    metadata_ = Column(JSON, default=dict)  # 附加元数据
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="messages")

    def to_dict(self):
        return {
            "id": self.id,
            "role": self.role,
            "agent_type": self.agent_type,
            "content": self.content,
            "content_type": self.content_type,
            "metadata": self.metadata_,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class LearningResource(Base):
    """学习资源"""
    __tablename__ = "learning_resources"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    title = Column(String(300), default="")
    resource_type = Column(String(50))  # doc, mindmap, exercise, reading, video_script, code_case
    content = Column(Text, default="")
    topic = Column(String(200), default="")
    difficulty = Column(String(20), default="基础")  # 入门, 基础, 提高, 竞赛
    tags = Column(JSON, default=list)
    agent_generated = Column(String(50), default="")  # 生成该资源的智能体
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="resources")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "resource_type": self.resource_type,
            "content": self.content,
            "topic": self.topic,
            "difficulty": self.difficulty,
            "tags": self.tags,
            "agent_generated": self.agent_generated,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class LearningPath(Base):
    """学习路径"""
    __tablename__ = "learning_paths"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    title = Column(String(300), default="")
    description = Column(Text, default="")
    stages = Column(JSON, default=list)      # 阶段列表
    current_stage = Column(Integer, default=0)
    progress = Column(Float, default=0.0)    # 0-100
    milestones = Column(JSON, default=list)
    resources_ids = Column(JSON, default=list)  # 关联资源ID列表
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = relationship("Student", back_populates="learning_paths")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "stages": self.stages,
            "current_stage": self.current_stage,
            "progress": self.progress,
            "milestones": self.milestones,
            "resources_ids": self.resources_ids,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Exercise(Base):
    """练习题"""
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    question_type = Column(String(30))       # choice, fill, code_completion, algorithm_design
    title = Column(String(300), default="")
    content = Column(Text, default="")       # 题目内容
    options = Column(JSON, default=list)     # 选项(选择题)
    answer = Column(Text, default="")         # 参考答案
    explanation = Column(Text, default="")    # 解析
    difficulty = Column(String(20), default="基础")
    topic = Column(String(200), default="")
    tags = Column(JSON, default=list)
    student_answer = Column(Text, default="") # 学生作答
    is_correct = Column(Boolean, nullable=True)
    score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="exercises")

    def to_dict(self):
        return {
            "id": self.id,
            "question_type": self.question_type,
            "title": self.title,
            "content": self.content,
            "options": self.options,
            "difficulty": self.difficulty,
            "topic": self.topic,
            "tags": self.tags,
            "student_answer": self.student_answer,
            "is_correct": self.is_correct,
            "score": self.score,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Assessment(Base):
    """学习评估记录"""
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    assessment_type = Column(String(50))     # weekly, milestone, comprehensive
    dimensions = Column(JSON, default=dict)   # 各维度评估
    scores = Column(JSON, default=dict)       # 各知识点得分
    weak_points = Column(JSON, default=list)  # 薄弱点
    strengths = Column(JSON, default=list)    # 优势领域
    recommendations = Column(Text, default="") # 改进建议
    report_content = Column(Text, default="") # 完整评估报告
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="assessments")

    def to_dict(self):
        return {
            "id": self.id,
            "assessment_type": self.assessment_type,
            "dimensions": self.dimensions,
            "scores": self.scores,
            "weak_points": self.weak_points,
            "strengths": self.strengths,
            "recommendations": self.recommendations,
            "report_content": self.report_content,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
