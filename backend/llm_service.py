"""
LLM服务 - 统一的LLM调用接口，支持流式和非流式
同时为 CrewAI/LiteLLM 设置环境变量
"""
import os
import json
import httpx
from typing import AsyncGenerator, Optional
from config import LLMConfig, AppConfig

# 全局配置
_config = AppConfig()


def init_llm_config(config: AppConfig = None):
    global _config
    if config:
        _config = config

    # 为 CrewAI / LiteLLM 设置环境变量
    # LiteLLM 通过 OPENAI_API_KEY / OPENAI_API_BASE 路由到兼容接口
    os.environ["OPENAI_API_KEY"] = _config.llm.api_key
    os.environ["OPENAI_API_BASE"] = _config.llm.api_base.rstrip("/") + "/v1"

    # 也设置 CrewAI 可直接识别的变量
    os.environ["LLM_API_KEY"] = _config.llm.api_key
    os.environ["LLM_API_BASE"] = _config.llm.api_base
    os.environ["LLM_MODEL"] = _config.llm.model


def _get_headers() -> dict:
    return {
        "Authorization": f"Bearer {_config.llm.api_key}",
        "Content-Type": "application/json",
    }


def _build_messages(system_prompt: str, user_message: str, history: list = None) -> list:
    messages = [{"role": "system", "content": system_prompt}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": user_message})
    return messages


async def chat_completion(
    system_prompt: str,
    user_message: str,
    history: list = None,
    temperature: float = None,
    max_tokens: int = None,
    api_key: str = None,
    model: str = None,
    api_base: str = None,
) -> str:
    """非流式对话补全。支持传入动态 api_key/model/api_base 覆盖全局配置"""
    messages = _build_messages(system_prompt, user_message, history)

    key = api_key or _config.llm.api_key
    base_url = (api_base or _config.llm.api_base).rstrip("/")
    mdl = model or _config.llm.model

    # 智能构造 URL：如果 base_url 已经包含 /chat/completions，直接用；否则追加
    if "/chat/completions" in base_url:
        url = base_url
    elif base_url.endswith("/v1"):
        url = f"{base_url}/chat/completions"
    else:
        url = f"{base_url}/v1/chat/completions"

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            url,
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            json={
                "model": mdl,
                "messages": messages,
                "temperature": temperature or _config.llm.temperature,
                "max_tokens": max_tokens or _config.llm.max_tokens,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


async def chat_completion_stream(
    system_prompt: str,
    user_message: str,
    history: list = None,
    temperature: float = None,
    max_tokens: int = None,
) -> AsyncGenerator[str, None]:
    """流式对话补全"""
    messages = _build_messages(system_prompt, user_message, history)

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            f"{_config.llm.api_base}/v1/chat/completions",
            headers=_get_headers(),
            json={
                "model": _config.llm.model,
                "messages": messages,
                "temperature": temperature or _config.llm.temperature,
                "max_tokens": max_tokens or _config.llm.max_tokens,
                "stream": True,
            },
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:]
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                        delta = chunk["choices"][0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue


async def chat_with_json_output(
    system_prompt: str,
    user_message: str,
    history: list = None,
    api_key: str = None,
    model: str = None,
    api_base: str = None,
) -> dict:
    """对话并返回JSON结构化输出。支持动态 api_key/model/api_base"""
    full_prompt = f"{system_prompt}\n\n请以JSON格式返回你的分析结果。确保输出是有效的JSON。"
    response = await chat_completion(
        full_prompt, user_message, history, temperature=0.3,
        api_key=api_key, model=model, api_base=api_base,
    )

    # 尝试从响应中提取JSON
    try:
        # 尝试直接解析
        return json.loads(response)
    except json.JSONDecodeError:
        # 尝试提取```json...```块
        import re
        match = re.search(r'```json\s*(.*?)\s*```', response, re.DOTALL)
        if match:
            return json.loads(match.group(1))
        # 尝试提取{...}
        match = re.search(r'\{.*\}', response, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return {"raw_response": response, "error": "无法解析为JSON"}
