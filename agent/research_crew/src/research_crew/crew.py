from crewai import Agent, Crew, LLM, Process, Task
from crewai.agents.agent_builder.base_agent import BaseAgent
from crewai.project import CrewBase, agent, crew, task
from .tools.log_tools import get_past_incidents, semantic_search

def _get_llm() -> LLM:
    return LLM(
        model="ollama/llama3.2:1b",
        base_url="http://localhost:11434",
    )


@CrewBase
class LogAnalyzerCrew:
    """Analyzes a window of production logs to identify incidents and root causes."""

    agents: list[BaseAgent]
    tasks: list[Task]

    @agent
    def correlator(self) -> Agent:
        return Agent(
            config=self.agents_config["correlator"],
            llm=_get_llm(),
            verbose=True,
        )

    @agent
    def root_cause(self) -> Agent:
        return Agent(
            config=self.agents_config["root_cause"],
            llm=_get_llm(),
            tools=[semantic_search, get_past_incidents],
            verbose=True,
        )

    @agent
    def responder(self) -> Agent:
        return Agent(
            config=self.agents_config["responder"],
            llm=_get_llm(),
            verbose=True,
        )

    @task
    def correlate_incident(self) -> Task:
        return Task(config=self.tasks_config["correlate_incident"])

    @task
    def investigate_root_cause(self) -> Task:
        return Task(
            config=self.tasks_config["investigate_root_cause"],
            context=[self.correlate_incident()],
        )

    @task
    def generate_incident_report(self) -> Task:
        return Task(
            config=self.tasks_config["generate_incident_report"],
            context=[self.correlate_incident(), self.investigate_root_cause()],
        )

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True,
        )
