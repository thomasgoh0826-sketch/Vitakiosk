import {
  Award,
  CalendarCheck,
  CheckCircle2,
  Code2,
  Cog,
  FileText,
  FlaskConical,
  GitBranch,
  GraduationCap,
  LockKeyhole,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

const academySteps = [
  {
    number: "01",
    title: "Codex Builds",
    copy: "Ship smarter with Codex.",
    Icon: Code2,
  },
  {
    number: "02",
    title: "Prompt Workflow",
    copy: "Design prompts that scale.",
    Icon: GitBranch,
  },
  {
    number: "03",
    title: "Automation Systems",
    copy: "Automate tasks. Drive outcomes.",
    Icon: Cog,
  },
  {
    number: "04",
    title: "Content Operations",
    copy: "Create, manage, and optimize.",
    Icon: FileText,
  },
  {
    number: "05",
    title: "Pharmacy AI Ops",
    copy: "Operate safely. Stay compliant.",
    Icon: ShieldCheck,
  },
];

const learningPath = ["Welcome", "Foundations", "Build", "Automate", "Operate", "Optimize"];

export function AcademyWorkflowVisual() {
  return (
    <div
      className="academy-workflow-visual"
      data-component="AcademyWorkflowVisual"
      aria-label="AI Academy workflow learning dashboard visual"
    >
      <div className="academy-orbit orbit-a" aria-hidden="true" />
      <div className="academy-orbit orbit-b" aria-hidden="true" />
      <div className="academy-orbit orbit-c" aria-hidden="true" />

      <article className="academy-floating-card academy-card-workshop" aria-label="Live Workshop schedule">
        <header>
          <CalendarCheck size={15} />
          <span>Live Workshop</span>
        </header>
        <small>Next session</small>
        <strong>May 22, 2026</strong>
        <p>10:00 AM</p>
        <span className="academy-card-link">Add to calendar</span>
      </article>

      <article className="academy-floating-card academy-card-progress" aria-label="Progress Tracker status">
        <header>
          <CheckCircle2 size={15} />
          <span>Progress Tracker</span>
        </header>
        <div className="academy-progress-ring" aria-label="Progress 78 percent">
          <strong>78%</strong>
          <small>Complete</small>
        </div>
        <p>28 of 36 lessons</p>
        <small>You are on track.</small>
      </article>

      <article className="academy-floating-card academy-card-lab" aria-label="Practice Lab status">
        <header>
          <FlaskConical size={15} />
          <span>Practice Lab</span>
        </header>
        <strong>12 Active Exercises</strong>
        <p>Sandbox access</p>
        <span className="academy-status-dot">Active</span>
      </article>

      <article className="academy-floating-card academy-card-certification" aria-label="Certification badge">
        <header>
          <Award size={15} />
          <span>Certification</span>
        </header>
        <div className="academy-badge-mark" aria-hidden="true">
          <Award size={30} />
        </div>
        <strong>AI Academy Practitioner</strong>
        <small>Badge earned</small>
      </article>

      <article className="academy-floating-card academy-card-team" aria-label="Team Learning seats">
        <header>
          <UsersRound size={15} />
          <span>Team Learning</span>
        </header>
        <strong>24 Active Learners</strong>
        <p>18 / 25 seats used</p>
      </article>

      <section className="academy-main-panel" aria-labelledby="academy-visual-title">
        <div className="academy-title-lockup">
          <GraduationCap size={38} aria-hidden="true" />
          <div>
            <h3 id="academy-visual-title">AI Academy</h3>
            <p>Learn the workflow. Build with confidence.</p>
          </div>
        </div>

        <div className="academy-workflow-flow" aria-label="Five step AI Academy learning workflow">
          {academySteps.map(({ number, title, copy, Icon }) => (
            <div className="academy-step" key={title}>
              <span className="academy-step-number">{number}</span>
              <span className="academy-step-icon">
                <Icon size={24} aria-hidden="true" />
              </span>
              <strong>{title}</strong>
              <small>{copy}</small>
            </div>
          ))}
        </div>

        <div className="academy-learning-panel">
          <div className="academy-learning-header">
            <strong>Learning Path</strong>
            <span className="academy-progress-pill">In Progress</span>
            <span>68% Complete</span>
          </div>
          <div className="academy-learning-path" aria-label="Learning path progress">
            {learningPath.map((label, index) => {
              const isDone = index < 3;
              const isCurrent = index === 3;
              return (
                <span
                  className={`academy-path-node ${isDone ? "is-done" : ""} ${isCurrent ? "is-current" : ""}`}
                  key={label}
                >
                  <span className="academy-path-dot">
                    {isDone && <CheckCircle2 size={13} aria-hidden="true" />}
                    {index > 3 && <LockKeyhole size={12} aria-hidden="true" />}
                  </span>
                  {label}
                </span>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
