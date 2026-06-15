import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  Library, BookMarked, GraduationCap, Languages,
  Plus, Search, Star, BookOpen, CheckCircle, Clock,
  Upload, FileText, X, ChevronRight, ChevronLeft,
  Sparkles, RotateCcw, Trophy, Target, Play, ExternalLink,
  Globe, Mic, Volume2, RefreshCw, Brain, Zap, TrendingUp,
  Check, ArrowRight, Filter, Tag, Maximize2, Minimize2,
  AlertCircle,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'books' | 'vocab' | 'roadmaps' | 'language'

interface Book {
  id: string
  title: string
  author: string
  cover?: string
  status: 'to-read' | 'reading' | 'done'
  rating: number
  progress: number
  notes: string
  highlights: string[]
  category: string
  totalPages?: number
  pdfId?: string
  dateAdded: string
}

interface VocabWord {
  id: string
  word: string
  definition: string
  example: string
  professionalUsage: string
  category: string
  mastered: boolean
  reviewCount: number
}

interface Roadmap {
  id: string
  topic: string
  currentLevel: string
  hoursPerWeek: number
  deadline: string
  phases: RoadmapPhase[]
  currentPhase: number
  aiGenerated: boolean
  createdAt: string
}

interface RoadmapPhase {
  title: string
  duration: string
  resources: { type: 'video' | 'article' | 'course' | 'docs'; title: string; url: string }[]
  tasks: string[]
  completed: boolean
}

interface StoredPdf {
  id: string
  name: string
  size: number
  bookId?: string
}

// ─── Pre-loaded Vocabulary Bank ───────────────────────────────────────────────

const VOCAB_BANK: VocabWord[] = [
  // Power Words
  { id: 'v1', word: 'Leverage', definition: 'Use something to maximum advantage', example: 'We can leverage our existing data pipelines.', professionalUsage: 'Use in emails/proposals: "We should leverage our Databricks investment to accelerate delivery."', category: 'Power Words', mastered: false, reviewCount: 0 },
  { id: 'v2', word: 'Synergy', definition: 'Interaction producing a combined effect greater than the sum of parts', example: 'The merger created synergy between teams.', professionalUsage: 'In presentations: "The synergy between ML and BI teams will reduce TTI by 40%."', category: 'Power Words', mastered: false, reviewCount: 0 },
  { id: 'v3', word: 'Iterate', definition: 'Perform repeatedly to approach a desired result', example: 'We will iterate on the MVP based on feedback.', professionalUsage: 'Standups/sprints: "Let\'s iterate on this approach after the pilot."', category: 'Power Words', mastered: false, reviewCount: 0 },
  { id: 'v4', word: 'Scalable', definition: 'Able to be expanded or upgraded without loss of performance', example: 'The architecture must be scalable to 10x load.', professionalUsage: 'Architecture reviews: "We need a scalable solution that handles Pfizer\'s global data volume."', category: 'Power Words', mastered: false, reviewCount: 0 },
  { id: 'v5', word: 'Pragmatic', definition: 'Dealing with things sensibly and practically', example: 'Take a pragmatic approach to the problem.', professionalUsage: 'Client calls: "I\'m suggesting a pragmatic solution that balances speed and quality."', category: 'Power Words', mastered: false, reviewCount: 0 },
  { id: 'v6', word: 'Holistic', definition: 'Characterized by comprehension of the whole rather than parts', example: 'A holistic review of the system.', professionalUsage: 'Status reports: "This requires a holistic approach across data, infra, and governance."', category: 'Power Words', mastered: false, reviewCount: 0 },
  { id: 'v7', word: 'Robust', definition: 'Strong and effective in all or most situations', example: 'Build a robust error-handling mechanism.', professionalUsage: 'Code reviews: "The pipeline needs robust retry logic for production readiness."', category: 'Power Words', mastered: false, reviewCount: 0 },
  { id: 'v8', word: 'Streamline', definition: 'Make more efficient and effective', example: 'We streamlined the onboarding process.', professionalUsage: 'Process improvement: "The agent mapping will streamline manual classification work."', category: 'Power Words', mastered: false, reviewCount: 0 },
  { id: 'v9', word: 'Paradigm', definition: 'A typical example or pattern of something', example: 'A new paradigm in data engineering.', professionalUsage: 'Thought leadership: "Generative AI represents a paradigm shift in how we build analytics."', category: 'Power Words', mastered: false, reviewCount: 0 },
  { id: 'v10', word: 'Proactive', definition: 'Acting in anticipation of future problems', example: 'Be proactive about identifying risks.', professionalUsage: 'Performance reviews: "I proactively flagged the schema drift before it hit production."', category: 'Power Words', mastered: false, reviewCount: 0 },
  { id: 'v11', word: 'Tangible', definition: 'Clear and definite; real', example: 'Deliver tangible results this quarter.', professionalUsage: 'Business case: "The tangible benefits include $2M cost reduction and 30% faster processing."', category: 'Power Words', mastered: false, reviewCount: 0 },
  { id: 'v12', word: 'Cadence', definition: 'A regular rhythm or pattern of activity', example: 'We established a weekly release cadence.', professionalUsage: 'Planning: "Let\'s set a bi-weekly cadence for stakeholder syncs."', category: 'Power Words', mastered: false, reviewCount: 0 },

  // Data & Tech
  { id: 'v13', word: 'Latency', definition: 'Time delay between cause and effect in a system', example: 'Reduce query latency below 200ms.', professionalUsage: 'System design: "We optimized Delta cache to reduce latency from 4s to 0.8s."', category: 'Data & Tech', mastered: false, reviewCount: 0 },
  { id: 'v14', word: 'Idempotent', definition: 'Producing the same result no matter how many times executed', example: 'Make all API calls idempotent.', professionalUsage: 'Code review: "The MERGE operation must be idempotent to handle pipeline retries safely."', category: 'Data & Tech', mastered: false, reviewCount: 0 },
  { id: 'v15', word: 'Orchestration', definition: 'Automated arrangement and coordination of complex systems', example: 'Pipeline orchestration via Airflow.', professionalUsage: 'Architecture docs: "Databricks Workflows handles orchestration across ingestion, transform, and serving layers."', category: 'Data & Tech', mastered: false, reviewCount: 0 },
  { id: 'v16', word: 'Throughput', definition: 'Amount of work performed in a given period', example: 'Maximize data throughput in ingestion.', professionalUsage: 'Performance tuning: "After partition optimization, throughput increased from 50K to 200K records/sec."', category: 'Data & Tech', mastered: false, reviewCount: 0 },
  { id: 'v17', word: 'Schema', definition: 'The structure defining the organization of data', example: 'Define the table schema before ingestion.', professionalUsage: 'Data modeling: "We enforce schema evolution rules to prevent breaking downstream consumers."', category: 'Data & Tech', mastered: false, reviewCount: 0 },
  { id: 'v18', word: 'Lineage', definition: 'Tracking the origin and transformations of data', example: 'Data lineage helps with debugging.', professionalUsage: 'Governance: "Unity Catalog provides end-to-end data lineage from raw to gold layer."', category: 'Data & Tech', mastered: false, reviewCount: 0 },
  { id: 'v19', word: 'Refactoring', definition: 'Restructuring code without changing external behavior', example: 'Refactor legacy ETL into medallion architecture.', professionalUsage: 'Sprint planning: "Refactoring this notebook will reduce tech debt and improve testability."', category: 'Data & Tech', mastered: false, reviewCount: 0 },
  { id: 'v20', word: 'Inference', definition: 'Using a trained model to make predictions on new data', example: 'Run inference on the production dataset.', professionalUsage: 'ML presentations: "The model performs real-time inference on incoming claims data within 100ms."', category: 'Data & Tech', mastered: false, reviewCount: 0 },
  { id: 'v21', word: 'Abstraction', definition: 'Hiding complexity by providing simplified interfaces', example: 'The API abstracts database complexity.', professionalUsage: 'Design discussions: "This abstraction layer lets analysts query without knowing the underlying Spark logic."', category: 'Data & Tech', mastered: false, reviewCount: 0 },
  { id: 'v22', word: 'Deprecate', definition: 'Phase out something in favor of a newer alternative', example: 'Deprecate the legacy ingestion pipeline.', professionalUsage: 'Migration planning: "We\'ll deprecate the old Glue jobs once Delta Live Tables are stable."', category: 'Data & Tech', mastered: false, reviewCount: 0 },
  { id: 'v23', word: 'Partitioning', definition: 'Dividing data into logical segments for performance', example: 'Partition the table by date for faster queries.', professionalUsage: 'Optimization: "Proper partitioning by ingestion_date reduced scan from full table to 1-day window."', category: 'Data & Tech', mastered: false, reviewCount: 0 },
  { id: 'v24', word: 'Resilience', definition: 'Ability to recover quickly from difficulties', example: 'Build resilience into the pipeline.', professionalUsage: 'Architecture review: "Circuit breakers and dead letter queues add resilience to the streaming pipeline."', category: 'Data & Tech', mastered: false, reviewCount: 0 },

  // Leadership
  { id: 'v25', word: 'Alignment', definition: 'Agreement and coordination between parties toward a goal', example: 'Ensure alignment across business and IT.', professionalUsage: 'Stakeholder management: "I\'ll schedule a call to get alignment on the delivery timeline."', category: 'Leadership', mastered: false, reviewCount: 0 },
  { id: 'v26', word: 'Accountability', definition: 'The fact of being responsible for actions or decisions', example: 'Each team member has clear accountability.', professionalUsage: 'Team lead discussions: "We need clear accountability for each data domain to avoid ownership gaps."', category: 'Leadership', mastered: false, reviewCount: 0 },
  { id: 'v27', word: 'Bandwidth', definition: 'Available capacity or resources (time/attention)', example: 'I don\'t have bandwidth for this sprint.', professionalUsage: 'Workload discussions: "The team\'s bandwidth is at capacity — we need to defer the reporting module."', category: 'Leadership', mastered: false, reviewCount: 0 },
  { id: 'v28', word: 'Visibility', definition: 'Degree to which something is easily observed', example: 'Increase visibility into pipeline failures.', professionalUsage: 'Monitoring: "We need better visibility into job run times — let\'s add Grafana dashboards."', category: 'Leadership', mastered: false, reviewCount: 0 },
  { id: 'v29', word: 'Escalate', definition: 'Raise an issue to a higher authority for resolution', example: 'Escalate blockers to the project manager.', professionalUsage: 'Risk management: "If the vendor doesn\'t respond by Friday, I\'ll escalate to the engagement lead."', category: 'Leadership', mastered: false, reviewCount: 0 },
  { id: 'v30', word: 'Prioritize', definition: 'Designate something as most important', example: 'Prioritize the critical path items.', professionalUsage: 'Backlog grooming: "We need to prioritize the security patch over feature development this sprint."', category: 'Leadership', mastered: false, reviewCount: 0 },
  { id: 'v31', word: 'Stakeholder', definition: 'Person or group with interest in an organization\'s decisions', example: 'Map all project stakeholders early.', professionalUsage: 'Project kickoff: "The key stakeholder for this workstream is the VP of Data Governance at Pfizer."', category: 'Leadership', mastered: false, reviewCount: 0 },
  { id: 'v32', word: 'Mentor', definition: 'To advise and guide a less experienced person', example: 'Mentor junior engineers on best practices.', professionalUsage: 'Performance appraisal: "I mentored two analysts on Delta Lake and improved their query performance by 60%."', category: 'Leadership', mastered: false, reviewCount: 0 },
  { id: 'v33', word: 'Delegate', definition: 'Entrust a task to another person', example: 'Delegate routine tasks to free strategic time.', professionalUsage: 'Team management: "I delegated the data quality checks to the associate so I could focus on architecture."', category: 'Leadership', mastered: false, reviewCount: 0 },
  { id: 'v34', word: 'Autonomy', definition: 'Self-governance; freedom to make independent decisions', example: 'Give engineers autonomy over architecture.', professionalUsage: 'Culture discussion: "I work best with autonomy on implementation while staying aligned on outcomes."', category: 'Leadership', mastered: false, reviewCount: 0 },

  // Communication
  { id: 'v35', word: 'Articulate', definition: 'Express clearly and effectively', example: 'Articulate the technical debt impact to leadership.', professionalUsage: 'Presentations: "I can articulate the trade-offs between batch and streaming for non-technical audiences."', category: 'Communication', mastered: false, reviewCount: 0 },
  { id: 'v36', word: 'Concise', definition: 'Giving a lot of information briefly', example: 'Keep status updates concise and actionable.', professionalUsage: 'Email writing: "Stakeholders appreciate concise updates — lead with the decision needed, then context."', category: 'Communication', mastered: false, reviewCount: 0 },
  { id: 'v37', word: 'Facilitate', definition: 'Make a process easier; lead a discussion', example: 'Facilitate the architecture review session.', professionalUsage: 'Meeting leadership: "I\'ll facilitate the requirements gathering session with the Pfizer data team."', category: 'Communication', mastered: false, reviewCount: 0 },
  { id: 'v38', word: 'Synthesize', definition: 'Combine elements into a coherent whole', example: 'Synthesize stakeholder feedback into requirements.', professionalUsage: 'Analysis work: "I synthesized inputs from 5 teams into a unified data model for the platform."', category: 'Communication', mastered: false, reviewCount: 0 },
  { id: 'v39', word: 'Compelling', definition: 'Evoking strong interest; convincing', example: 'Build a compelling business case.', professionalUsage: 'Proposals: "The ROI numbers make a compelling case for the AI mapping investment."', category: 'Communication', mastered: false, reviewCount: 0 },
  { id: 'v40', word: 'Nuanced', definition: 'Characterized by subtle distinctions', example: 'The answer requires a nuanced explanation.', professionalUsage: 'Complex discussions: "The performance improvement is nuanced — it depends on data distribution and cluster config."', category: 'Communication', mastered: false, reviewCount: 0 },
  { id: 'v41', word: 'Transparent', definition: 'Open and honest about processes and decisions', example: 'Be transparent about project risks.', professionalUsage: 'Status updates: "I want to be transparent about the delay — the upstream dependency is 2 weeks behind."', category: 'Communication', mastered: false, reviewCount: 0 },
  { id: 'v42', word: 'Constructive', definition: 'Having a useful purpose; building rather than criticizing', example: 'Provide constructive feedback on the design.', professionalUsage: 'Code review culture: "Frame feedback as constructive suggestions rather than criticisms."', category: 'Communication', mastered: false, reviewCount: 0 },
  { id: 'v43', word: 'Persuasive', definition: 'Good at convincing people', example: 'A persuasive presentation wins stakeholder buy-in.', professionalUsage: 'Pitches: "Use data and analogies to make technical arguments persuasive to non-technical leaders."', category: 'Communication', mastered: false, reviewCount: 0 },
  { id: 'v44', word: 'Succinct', definition: 'Briefly and clearly expressed', example: 'A succinct summary helps decision-makers.', professionalUsage: 'Executive comms: "Keep the exec summary succinct — one problem, one solution, one ask."', category: 'Communication', mastered: false, reviewCount: 0 },

  // Consulting & Business
  { id: 'v45', word: 'ROI', definition: 'Return on Investment; measure of profitability', example: 'Calculate ROI before proposing the initiative.', professionalUsage: 'Business cases: "The agent automation has an ROI of 340% over 3 years based on manual hour savings."', category: 'Consulting', mastered: false, reviewCount: 0 },
  { id: 'v46', word: 'Deliverable', definition: 'A tangible outcome produced for a client', example: 'Define all deliverables in the SOW.', professionalUsage: 'Project planning: "The key deliverable for Sprint 3 is a working proof of concept with 85% accuracy."', category: 'Consulting', mastered: false, reviewCount: 0 },
  { id: 'v47', word: 'Benchmark', definition: 'A standard point of reference against which to measure', example: 'Benchmark performance against industry standards.', professionalUsage: 'Quality: "We benchmarked our pipeline latency against 5 comparable Pharma implementations."', category: 'Consulting', mastered: false, reviewCount: 0 },
  { id: 'v48', word: 'Feasibility', definition: 'The state of being possible or likely to be achieved', example: 'Run a feasibility study before committing.', professionalUsage: 'Due diligence: "A 2-week feasibility assessment will determine if real-time sync is achievable in scope."', category: 'Consulting', mastered: false, reviewCount: 0 },
  { id: 'v49', word: 'Governance', definition: 'Framework for policies, rules, and accountability', example: 'Establish data governance from day one.', professionalUsage: 'Compliance: "Unity Catalog enables governance across all Databricks workspaces with column-level security."', category: 'Consulting', mastered: false, reviewCount: 0 },
  { id: 'v50', word: 'Mitigation', definition: 'Lessening the severity of a problem or risk', example: 'Propose risk mitigation strategies.', professionalUsage: 'Risk log: "The mitigation for the API rate limit risk is to implement exponential backoff with queuing."', category: 'Consulting', mastered: false, reviewCount: 0 },
  { id: 'v51', word: 'Value proposition', definition: 'The value a product/service promises to deliver', example: 'Define the solution\'s value proposition clearly.', professionalUsage: 'Client pitches: "Our value proposition is 10x faster insight generation at 60% of legacy cost."', category: 'Consulting', mastered: false, reviewCount: 0 },
  { id: 'v52', word: 'Scope creep', definition: 'Uncontrolled expansion of project scope', example: 'Avoid scope creep with strict change management.', professionalUsage: 'Project management: "The new reporting requirement is scope creep — it needs a formal change request."', category: 'Consulting', mastered: false, reviewCount: 0 },
  { id: 'v53', word: 'Cadence', definition: 'Regular rhythm of activities or meetings', example: 'Establish a reporting cadence.', professionalUsage: 'Client management: "We have a bi-weekly cadence with the Pfizer team for status and blockers."', category: 'Consulting', mastered: false, reviewCount: 0 },
  { id: 'v54', word: 'Due diligence', definition: 'Reasonable steps taken to avoid problems', example: 'Conduct due diligence on vendor claims.', professionalUsage: 'Vendor evaluation: "We\'ll do due diligence on the model\'s bias and security before production deployment."', category: 'Consulting', mastered: false, reviewCount: 0 },
  { id: 'v55', word: 'Pivot', definition: 'Change strategy based on learning or circumstances', example: 'Pivot the approach based on user feedback.', professionalUsage: 'Agile discussions: "Based on accuracy results, we need to pivot from a rule-based to an LLM-based approach."', category: 'Consulting', mastered: false, reviewCount: 0 },
  { id: 'v56', word: 'Traction', definition: 'Early progress or momentum on a goal', example: 'The MVP is getting traction with users.', professionalUsage: 'Updates to leadership: "The Smart Mapping Agent is gaining traction — 3 additional teams have requested access."', category: 'Consulting', mastered: false, reviewCount: 0 },
  { id: 'v57', word: 'Bandwidth', definition: 'Team capacity or time available', example: 'We don\'t have bandwidth for additional work.', professionalUsage: 'Resource planning: "Given current bandwidth constraints, we recommend deferring Phase 3 by 2 weeks."', category: 'Consulting', mastered: false, reviewCount: 0 },
  { id: 'v58', word: 'Actionable', definition: 'Able to be acted on directly', example: 'Make recommendations actionable.', professionalUsage: 'Reports/decks: "The dashboard surfaces actionable insights — not just metrics but suggested next steps."', category: 'Consulting', mastered: false, reviewCount: 0 },
  { id: 'v59', word: 'Transparency', definition: 'Openness about processes and information', example: 'Maintain transparency with the client.', professionalUsage: 'Trust building: "Full transparency on timelines builds long-term client relationships."', category: 'Consulting', mastered: false, reviewCount: 0 },
  { id: 'v60', word: 'Accelerate', definition: 'Make something happen faster', example: 'Accelerate delivery with automation.', professionalUsage: 'Proposals: "The pre-built connectors will accelerate integration by 3 weeks."', category: 'Consulting', mastered: false, reviewCount: 0 },
]

// ─── Roadmap Templates ────────────────────────────────────────────────────────

const ROADMAP_TEMPLATES: Record<string, { phases: Omit<RoadmapPhase, 'completed'>[] }> = {
  'Python for Data Science': {
    phases: [
      { title: 'Python Fundamentals', duration: '2 weeks', tasks: ['Variables & data types', 'Control flow & functions', 'File I/O & error handling'], resources: [{ type: 'video', title: 'Python for Beginners – freeCodeCamp', url: 'https://www.youtube.com/watch?v=rfscVS0vtbw' }, { type: 'course', title: 'Python Crash Course – Udemy', url: 'https://www.udemy.com/course/automate/' }, { type: 'docs', title: 'Python Official Docs', url: 'https://docs.python.org/3/tutorial/' }] },
      { title: 'Data Manipulation', duration: '2 weeks', tasks: ['Pandas DataFrames', 'NumPy arrays', 'Data cleaning & EDA'], resources: [{ type: 'article', title: 'Pandas Getting Started', url: 'https://pandas.pydata.org/docs/getting_started/intro_tutorials/' }, { type: 'video', title: 'Pandas Tutorial – Corey Schafer', url: 'https://www.youtube.com/watch?v=ZyhVh-qRZPA' }] },
      { title: 'Data Visualization', duration: '1 week', tasks: ['Matplotlib & Seaborn', 'Plotly interactive charts', 'Dashboard basics'], resources: [{ type: 'video', title: 'Matplotlib Tutorial', url: 'https://www.youtube.com/watch?v=OZOOLe2imFo' }, { type: 'article', title: 'Plotly Python Docs', url: 'https://plotly.com/python/' }] },
      { title: 'Machine Learning Basics', duration: '3 weeks', tasks: ['Scikit-learn basics', 'Regression & Classification', 'Model evaluation'], resources: [{ type: 'course', title: 'ML with Python – Coursera', url: 'https://www.coursera.org/learn/machine-learning-with-python' }, { type: 'docs', title: 'Scikit-learn User Guide', url: 'https://scikit-learn.org/stable/user_guide.html' }] },
    ],
  },
  'Apache Spark & Databricks': {
    phases: [
      { title: 'Spark Fundamentals', duration: '2 weeks', tasks: ['RDDs vs DataFrames', 'Transformations & Actions', 'Spark SQL basics'], resources: [{ type: 'video', title: 'Apache Spark Tutorial – Simplilearn', url: 'https://www.youtube.com/watch?v=F8pyaR4uQ2g' }, { type: 'docs', title: 'Spark Official Docs', url: 'https://spark.apache.org/docs/latest/' }] },
      { title: 'Databricks Platform', duration: '2 weeks', tasks: ['Databricks notebooks', 'Delta Lake basics', 'Clusters & Jobs'], resources: [{ type: 'course', title: 'Databricks Fundamentals – Databricks Academy', url: 'https://customer-academy.databricks.com/' }, { type: 'docs', title: 'Databricks Documentation', url: 'https://docs.databricks.com/' }] },
      { title: 'Advanced Delta & ML', duration: '3 weeks', tasks: ['Delta Live Tables', 'MLflow tracking', 'Unity Catalog'], resources: [{ type: 'video', title: 'Delta Lake Deep Dive', url: 'https://www.youtube.com/watch?v=BMO90DI82Zc' }, { type: 'article', title: 'Delta Lake Guide', url: 'https://docs.delta.io/latest/index.html' }] },
    ],
  },
  'LLMs & Generative AI': {
    phases: [
      { title: 'AI/ML Foundations', duration: '2 weeks', tasks: ['Transformers architecture', 'Attention mechanism', 'Pre-training vs fine-tuning'], resources: [{ type: 'article', title: 'Attention Is All You Need – paper', url: 'https://arxiv.org/abs/1706.03762' }, { type: 'video', title: 'Illustrated Transformer – 3Blue1Brown', url: 'https://www.youtube.com/watch?v=wjZofJX0v4M' }] },
      { title: 'Prompt Engineering', duration: '1 week', tasks: ['Zero/few-shot prompting', 'Chain-of-thought', 'System prompts & personas'], resources: [{ type: 'article', title: 'Prompt Engineering Guide', url: 'https://www.promptingguide.ai/' }, { type: 'course', title: 'ChatGPT Prompt Engineering – DeepLearning.AI', url: 'https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/' }] },
      { title: 'RAG & Agents', duration: '2 weeks', tasks: ['Vector databases', 'RAG pipeline', 'Tool-use & function calling'], resources: [{ type: 'video', title: 'LangChain RAG Tutorial', url: 'https://www.youtube.com/watch?v=sVcwVQRHIc8' }, { type: 'article', title: 'LlamaIndex Docs', url: 'https://docs.llamaindex.ai/' }] },
      { title: 'Production LLM Apps', duration: '2 weeks', tasks: ['Fine-tuning LoRA', 'Evaluation & red-teaming', 'Cost & latency optimization'], resources: [{ type: 'course', title: 'LLMOps – Coursera', url: 'https://www.coursera.org/learn/llmops' }, { type: 'docs', title: 'Hugging Face Transformers', url: 'https://huggingface.co/docs/transformers/index' }] },
    ],
  },
  'System Design': {
    phases: [
      { title: 'Design Fundamentals', duration: '2 weeks', tasks: ['Scalability concepts', 'CAP theorem', 'Load balancing & caching'], resources: [{ type: 'article', title: 'System Design Primer – GitHub', url: 'https://github.com/donnemartin/system-design-primer' }, { type: 'video', title: 'System Design Interview – Gaurav Sen', url: 'https://www.youtube.com/c/GauravSensei' }] },
      { title: 'Databases & Storage', duration: '2 weeks', tasks: ['SQL vs NoSQL tradeoffs', 'Indexing strategies', 'Sharding & replication'], resources: [{ type: 'video', title: 'Database Design – CMU 15-445', url: 'https://www.youtube.com/playlist?list=PLSE8ODhjZXjbohkNBWQs_otTrBTrjyohi' }] },
      { title: 'Real System Designs', duration: '2 weeks', tasks: ['Design URL shortener', 'Design Twitter feed', 'Design distributed cache'], resources: [{ type: 'course', title: 'Grokking System Design – Educative', url: 'https://www.educative.io/courses/grokking-the-system-design-interview' }] },
    ],
  },
  'AWS Cloud': {
    phases: [
      { title: 'Cloud Fundamentals', duration: '2 weeks', tasks: ['Core AWS services', 'IAM & security basics', 'VPC & networking'], resources: [{ type: 'course', title: 'AWS Cloud Practitioner – freeCodeCamp', url: 'https://www.youtube.com/watch?v=SOTamWNgDKc' }, { type: 'docs', title: 'AWS Documentation', url: 'https://docs.aws.amazon.com/' }] },
      { title: 'Data Services', duration: '2 weeks', tasks: ['S3 & Glue', 'Redshift & Athena', 'EMR & Kinesis'], resources: [{ type: 'video', title: 'AWS Data Analytics – A Cloud Guru', url: 'https://acloudguru.com/course/aws-certified-data-analytics-specialty' }] },
      { title: 'Certification Prep', duration: '3 weeks', tasks: ['Practice exams', 'Hands-on labs', 'Mock interviews'], resources: [{ type: 'course', title: 'AWS SAA Practice Tests – Udemy', url: 'https://www.udemy.com/course/practice-exams-aws-certified-solutions-architect-associate/' }] },
    ],
  },
  'React & Frontend': {
    phases: [
      { title: 'React Basics', duration: '2 weeks', tasks: ['JSX & components', 'Props & state', 'Hooks (useState, useEffect)'], resources: [{ type: 'docs', title: 'React Official Docs (beta.reactjs.org)', url: 'https://react.dev/' }, { type: 'video', title: 'React Tutorial – Traversy Media', url: 'https://www.youtube.com/watch?v=w7ejDZ8SWv8' }] },
      { title: 'State Management', duration: '1 week', tasks: ['Context API', 'Zustand / Redux basics', 'React Query'], resources: [{ type: 'article', title: 'Zustand Docs', url: 'https://docs.pmnd.rs/zustand/getting-started/introduction' }] },
      { title: 'TypeScript + Styling', duration: '1 week', tasks: ['TypeScript with React', 'Tailwind CSS', 'Component libraries'], resources: [{ type: 'docs', title: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/handbook/' }, { type: 'docs', title: 'Tailwind CSS Docs', url: 'https://tailwindcss.com/docs' }] },
      { title: 'Production Patterns', duration: '2 weeks', tasks: ['Performance optimization', 'Testing with Vitest', 'Deploy with Vercel'], resources: [{ type: 'article', title: 'React Patterns', url: 'https://reactpatterns.com/' }] },
    ],
  },
}

// ─── IndexedDB helpers for PDFs ───────────────────────────────────────────────

const DB_NAME = 'cortex-pdfs'
const DB_VERSION = 1
const STORE_NAME = 'pdfs'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function savePdfToDB(id: string, name: string, data: ArrayBuffer): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put({ id, name, data })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function getPdfFromDB(id: string): Promise<{ id: string; name: string; data: ArrayBuffer } | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(id)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function loadBooks(): Book[] {
  try { return JSON.parse(localStorage.getItem('cortex-learn-books') || '[]') } catch { return [] }
}
function saveBooks(b: Book[]) { localStorage.setItem('cortex-learn-books', JSON.stringify(b)) }

function loadWords(): VocabWord[] {
  try {
    const saved = JSON.parse(localStorage.getItem('cortex-learn-vocab') || '[]') as VocabWord[]
    if (saved.length > 0) return saved
    return VOCAB_BANK
  } catch { return VOCAB_BANK }
}
function saveWords(w: VocabWord[]) { localStorage.setItem('cortex-learn-vocab', JSON.stringify(w)) }

function loadRoadmaps(): Roadmap[] {
  try { return JSON.parse(localStorage.getItem('cortex-learn-roadmaps') || '[]') } catch { return [] }
}
function saveRoadmaps(r: Roadmap[]) { localStorage.setItem('cortex-learn-roadmaps', JSON.stringify(r)) }

function loadPdfIndex(): StoredPdf[] {
  try { return JSON.parse(localStorage.getItem('cortex-pdf-index') || '[]') } catch { return [] }
}
function savePdfIndex(p: StoredPdf[]) { localStorage.setItem('cortex-pdf-index', JSON.stringify(p)) }

// ─── PDF Reader Overlay ───────────────────────────────────────────────────────

function PdfReader({ pdfId, title, onClose }: { pdfId: string; title: string; onClose: () => void }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let url: string
    getPdfFromDB(pdfId).then(record => {
      if (!record) { setError(true); setLoading(false); return }
      const blob = new Blob([record.data], { type: 'application/pdf' })
      url = URL.createObjectURL(blob)
      setBlobUrl(url)
      setLoading(false)
    }).catch(() => { setError(true); setLoading(false) })
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [pdfId])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#1a1a2e]">
      <div className="flex items-center justify-between px-4 py-3 glass border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground truncate max-w-xs">{title}</span>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg glass flex items-center justify-center text-muted-foreground hover:text-red-400 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Loading PDF...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
              <p className="text-sm text-muted-foreground">Could not load PDF. It may have been cleared.</p>
              <button onClick={onClose} className="px-4 py-2 rounded-lg bg-primary/20 text-primary text-sm">Close</button>
            </div>
          </div>
        )}
        {blobUrl && (
          <iframe
            src={blobUrl}
            className="w-full h-full border-0"
            title={title}
          />
        )}
      </div>
    </div>
  )
}

// ─── Books Tab ────────────────────────────────────────────────────────────────

function BooksTab() {
  const [books, setBooks] = useState<Book[]>(loadBooks)
  const [pdfIndex, setPdfIndex] = useState<StoredPdf[]>(loadPdfIndex)
  const [filter, setFilter] = useState<'all' | 'to-read' | 'reading' | 'done'>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [readingPdf, setReadingPdf] = useState<{ pdfId: string; title: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ key: string; title: string; author: string; cover?: string }[]>([])
  const [searching, setSearching] = useState(false)
  const [geminiKey] = useState(() => localStorage.getItem('cortex-gemini-key') || '')
  const [aiRecs, setAiRecs] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [expandedBook, setExpandedBook] = useState<string | null>(null)

  const [form, setForm] = useState({ title: '', author: '', cover: '', category: 'Non-Fiction', totalPages: '', notes: '' })
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const pendingPdfBookId = useRef<string | undefined>(undefined)

  const persist = (b: Book[]) => { setBooks(b); saveBooks(b) }
  const persistPdfIndex = (p: StoredPdf[]) => { setPdfIndex(p); savePdfIndex(p) }

  const readingGoal = 12
  const doneCount = books.filter(b => b.status === 'done').length

  const searchOpenLibrary = async (q: string) => {
    if (!q.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=6&fields=key,title,author_name,cover_i`)
      const data = await res.json()
      setSearchResults((data.docs || []).map((d: { key: string; title: string; author_name?: string[]; cover_i?: number }) => ({
        key: d.key,
        title: d.title,
        author: d.author_name?.[0] || 'Unknown',
        cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : undefined,
      })))
    } catch { setSearchResults([]) }
    setSearching(false)
  }

  const selectSearchResult = (r: { title: string; author: string; cover?: string }) => {
    setForm(f => ({ ...f, title: r.title, author: r.author, cover: r.cover || '' }))
    setSearchResults([])
    setSearchQuery('')
  }

  const addBook = () => {
    if (!form.title.trim()) return
    const b: Book = {
      id: Date.now().toString(),
      title: form.title, author: form.author, cover: form.cover,
      status: 'to-read', rating: 0, progress: 0,
      notes: form.notes, highlights: [],
      category: form.category,
      totalPages: form.totalPages ? parseInt(form.totalPages) : undefined,
      dateAdded: new Date().toISOString(),
    }
    persist([...books, b])
    setForm({ title: '', author: '', cover: '', category: 'Non-Fiction', totalPages: '', notes: '' })
    setShowAdd(false)
  }

  const updateBook = (id: string, changes: Partial<Book>) => {
    persist(books.map(b => b.id === id ? { ...b, ...changes } : b))
  }

  const deleteBook = (id: string) => {
    persist(books.filter(b => b.id !== id))
  }

  const addHighlight = (bookId: string, text: string) => {
    const book = books.find(b => b.id === bookId)
    if (!book || !text.trim()) return
    updateBook(bookId, { highlights: [...book.highlights, text.trim()] })
  }

  const triggerPdfUpload = (bookId?: string) => {
    pendingPdfBookId.current = bookId
    pdfInputRef.current?.click()
  }

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || file.type !== 'application/pdf') return
    const bookId = pendingPdfBookId.current
    const pdfId = `pdf-${Date.now()}`
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const data = ev.target?.result as ArrayBuffer
      await savePdfToDB(pdfId, file.name, data)
      const entry: StoredPdf = { id: pdfId, name: file.name, size: file.size, bookId }
      persistPdfIndex([...pdfIndex, entry])
      if (bookId) updateBook(bookId, { pdfId })
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
    pendingPdfBookId.current = undefined
  }

  const getAiRecs = async () => {
    if (!geminiKey) { setAiRecs('Add your Gemini API key in Settings to get AI recommendations.'); return }
    setAiLoading(true)
    const readTitles = books.filter(b => b.status === 'done').map(b => b.title).join(', ') || 'no books yet'
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `I've read: ${readTitles}. Suggest 5 books I should read next, considering my interest in data engineering, AI, personal growth, and consulting. For each give: title, author, 1-line why it's relevant to a data/tech professional. Format as a numbered list.` }] }] }),
      })
      const data = await res.json()
      setAiRecs(data.candidates?.[0]?.content?.parts?.[0]?.text || 'No suggestions returned.')
    } catch { setAiRecs('Failed to get recommendations. Check your API key.') }
    setAiLoading(false)
  }

  const filtered = books.filter(b => filter === 'all' || b.status === filter)

  const STATUS_COLORS: Record<string, string> = {
    'to-read': 'text-blue-400 bg-blue-400/10',
    'reading': 'text-amber-400 bg-amber-400/10',
    'done': 'text-green-400 bg-green-400/10',
  }

  const deletePdf = (pdfId: string) => {
    persistPdfIndex(pdfIndex.filter(p => p.id !== pdfId))
    persist(books.map(b => b.pdfId === pdfId ? { ...b, pdfId: undefined } : b))
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (readingPdf) return <PdfReader pdfId={readingPdf.pdfId} title={readingPdf.title} onClose={() => setReadingPdf(null)} />

  return (
    <div className="space-y-4">
      {/* ── PDF Library (standalone reader) ── */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">PDF Library</span>
            <span className="text-xs text-muted-foreground">({pdfIndex.length} file{pdfIndex.length !== 1 ? 's' : ''})</span>
          </div>
          <button onClick={() => triggerPdfUpload(undefined)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-all">
            <Upload className="w-3.5 h-3.5" /> Upload PDF
          </button>
        </div>
        {pdfIndex.length === 0 ? (
          <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer hover:border-primary/30 transition-all"
            onClick={() => triggerPdfUpload(undefined)}>
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">Click to upload any PDF — books, articles, reports</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {pdfIndex.map(pdf => {
              const linkedBook = books.find(b => b.id === pdf.bookId)
              return (
                <div key={pdf.id} className="flex items-center gap-3 glass rounded-lg px-3 py-2.5 group">
                  <FileText className="w-4 h-4 text-red-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{pdf.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatBytes(pdf.size)}
                      {linkedBook && <span className="ml-2 text-primary/70">· Linked: {linkedBook.title}</span>}
                    </p>
                  </div>
                  <button onClick={() => setReadingPdf({ pdfId: pdf.id, title: pdf.name.replace('.pdf', '') })}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/20 text-primary text-[10px] font-medium hover:bg-primary/30 transition-all shrink-0">
                    <BookOpen className="w-3 h-3" /> Read
                  </button>
                  <button onClick={() => deletePdf(pdf.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground/50 hover:text-red-400 transition-all">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Books section ── */}
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-3">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="text-sm text-muted-foreground">Reading Goal</span>
          <span className="text-sm font-bold text-foreground">{doneCount}/{readingGoal} books</span>
          <div className="w-24 h-1.5 rounded-full bg-white/10">
            <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${Math.min(100, (doneCount / readingGoal) * 100)}%` }} />
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {(['all', 'to-read', 'reading', 'done'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all', filter === s ? 'bg-primary/20 text-primary' : 'glass text-muted-foreground hover:text-foreground')}>
              {s === 'all' ? 'All' : s === 'to-read' ? 'To Read' : s === 'reading' ? 'Reading' : 'Done'}
            </button>
          ))}
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-all">
            <Plus className="w-3.5 h-3.5" /> Add Book
          </button>
        </div>
      </div>

      {/* Add book form */}
      {showAdd && (
        <div className="glass rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Add a Book</p>
          <div className="flex gap-2">
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchOpenLibrary(searchQuery)}
              placeholder="Search Open Library..." className="flex-1 glass rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none" />
            <button onClick={() => searchOpenLibrary(searchQuery)} disabled={searching}
              className="px-3 py-2 rounded-lg bg-primary/20 text-primary text-xs font-medium disabled:opacity-50 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" /> {searching ? 'Searching...' : 'Search'}
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {searchResults.map(r => (
                <button key={r.key} onClick={() => selectSearchResult(r)}
                  className="flex items-center gap-2 glass rounded-lg p-2 text-left hover:bg-white/5 transition-all">
                  {r.cover ? <img src={r.cover} alt="" className="w-8 h-12 object-cover rounded shrink-0" /> : <div className="w-8 h-12 rounded bg-primary/20 flex items-center justify-center shrink-0"><BookOpen className="w-3 h-3 text-primary" /></div>}
                  <div className="min-w-0"><p className="text-xs font-medium text-foreground truncate">{r.title}</p><p className="text-[10px] text-muted-foreground truncate">{r.author}</p></div>
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title *" className="glass rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none" />
            <input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} placeholder="Author" className="glass rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="glass rounded-lg px-3 py-2 text-sm text-foreground bg-transparent outline-none">
              {['Non-Fiction', 'Fiction', 'Technical', 'Self-Help', 'Business', 'Biography'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input value={form.totalPages} onChange={e => setForm(f => ({ ...f, totalPages: e.target.value }))} placeholder="Total pages" type="number" className="glass rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none" />
          </div>
          <p className="text-xs text-muted-foreground/60">After adding, you can link a PDF from the book card.</p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAdd(false)} className="px-4 py-1.5 rounded-lg glass text-sm text-muted-foreground">Cancel</button>
            <button onClick={addBook} className="px-4 py-1.5 rounded-lg bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-all">Add</button>
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      <div className="glass rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">AI Book Recommendations</span>
          </div>
          <button onClick={getAiRecs} disabled={aiLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs font-medium disabled:opacity-50 hover:bg-primary/30 transition-all">
            {aiLoading ? <><RefreshCw className="w-3 h-3 animate-spin" /> Thinking...</> : <><Sparkles className="w-3 h-3" /> Get Recs</>}
          </button>
        </div>
        {aiRecs && <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{aiRecs}</p>}
        {!aiRecs && <p className="text-xs text-muted-foreground">Based on your reading list, Gemini will suggest what to read next.</p>}
      </div>

      {/* Single shared PDF file input */}
      <input type="file" accept=".pdf" ref={pdfInputRef} className="hidden" onChange={handlePdfUpload} />

      {/* Book list */}
      {filtered.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center text-muted-foreground">
          <Library className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No books yet. Add your first book!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(book => {
            const isExpanded = expandedBook === book.id
            const bookPdf = pdfIndex.find(p => p.bookId === book.id)
            return (
              <div key={book.id} className="glass rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 p-3">
                  {book.cover
                    ? <img src={book.cover} alt="" className="w-12 h-16 object-cover rounded-lg shrink-0" />
                    : <div className="w-12 h-16 rounded-lg flex items-center justify-center shrink-0" style={{ background: `hsl(${(book.title.charCodeAt(0) * 37) % 360} 50% 25%)` }}>
                        <BookOpen className="w-5 h-5 text-white/70" />
                      </div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{book.title}</p>
                    <p className="text-xs text-muted-foreground">{book.author}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[book.status])}>
                        {book.status === 'to-read' ? 'To Read' : book.status === 'reading' ? 'Reading' : 'Done'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{book.category}</span>
                    </div>
                    {book.status === 'reading' && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1 rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${book.progress}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{book.progress}%</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button onClick={() => setExpandedBook(isExpanded ? null : book.id)} className="text-muted-foreground hover:text-foreground">
                      {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    {(bookPdf || book.pdfId) && (
                      <button onClick={() => setReadingPdf({ pdfId: book.pdfId || bookPdf!.id, title: book.title })}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/20 text-primary text-[10px] font-medium hover:bg-primary/30 transition-all">
                        <BookOpen className="w-3 h-3" /> Read PDF
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-white/5 p-3 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      {(['to-read', 'reading', 'done'] as const).map(s => (
                        <button key={s} onClick={() => updateBook(book.id, { status: s })}
                          className={cn('py-1.5 rounded-lg text-xs font-medium transition-all', book.status === s ? 'bg-primary/20 text-primary' : 'glass text-muted-foreground')}>
                          {s === 'to-read' ? 'To Read' : s === 'reading' ? 'Reading' : 'Done'}
                        </button>
                      ))}
                    </div>
                    {book.status === 'reading' && (
                      <div>
                        <label className="text-xs text-muted-foreground">Progress: {book.progress}%</label>
                        <input type="range" min={0} max={100} value={book.progress}
                          onChange={e => updateBook(book.id, { progress: parseInt(e.target.value) })}
                          className="w-full mt-1 accent-primary" />
                      </div>
                    )}
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} onClick={() => updateBook(book.id, { rating: n })}
                          className={cn('text-lg transition-colors', n <= book.rating ? 'text-amber-400' : 'text-white/20 hover:text-amber-400/50')}>
                          ★
                        </button>
                      ))}
                    </div>
                    <textarea value={book.notes} onChange={e => updateBook(book.id, { notes: e.target.value })}
                      placeholder="Notes & thoughts..." rows={2}
                      className="w-full glass rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none resize-none" />
                    <HighlightsSection book={book} onAdd={addHighlight} />
                    <div className="flex items-center gap-2">
                      {!book.pdfId && (
                        <button onClick={() => triggerPdfUpload(book.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-xs text-muted-foreground hover:text-foreground transition-all">
                          <Upload className="w-3 h-3" /> Upload PDF
                        </button>
                      )}
                      {book.pdfId && (
                        <button onClick={() => setReadingPdf({ pdfId: book.pdfId!, title: book.title })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-all">
                          <BookOpen className="w-3 h-3" /> Open PDF Reader
                        </button>
                      )}
                      <button onClick={() => deleteBook(book.id)} className="ml-auto px-3 py-1.5 rounded-lg glass text-xs text-red-400/70 hover:text-red-400 transition-all">Delete</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function HighlightsSection({ book, onAdd }: { book: Book; onAdd: (id: string, text: string) => void }) {
  const [text, setText] = useState('')
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1.5">Highlights & Quotes</p>
      <div className="space-y-1.5 mb-2">
        {book.highlights.map((h, i) => (
          <div key={i} className="text-xs text-foreground/80 glass rounded-lg px-3 py-2 border-l-2 border-primary/40">"{h}"</div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Add a highlight..."
          className="flex-1 glass rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none" />
        <button onClick={() => { onAdd(book.id, text); setText('') }}
          className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs font-medium">Add</button>
      </div>
    </div>
  )
}

// ─── Vocabulary Tab ───────────────────────────────────────────────────────────

type VocabMode = 'browse' | 'quiz' | 'word'

function VocabTab() {
  const [words, setWords] = useState<VocabWord[]>(loadWords)
  const [mode, setMode] = useState<VocabMode>('browse')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [selectedWord, setSelectedWord] = useState<VocabWord | null>(null)
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizWords, setQuizWords] = useState<VocabWord[]>([])
  const [quizFlipped, setQuizFlipped] = useState(false)
  const [quizScore, setQuizScore] = useState({ right: 0, wrong: 0 })

  const persist = (w: VocabWord[]) => { setWords(w); saveWords(w) }

  const categories = ['All', ...Array.from(new Set(words.map(w => w.category)))]
  const filtered = selectedCategory === 'All' ? words : words.filter(w => w.category === selectedCategory)
  const masteredCount = words.filter(w => w.mastered).length

  const startQuiz = () => {
    const pool = filtered.filter(w => !w.mastered)
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 10)
    if (shuffled.length === 0) return
    setQuizWords(shuffled)
    setQuizIndex(0)
    setQuizFlipped(false)
    setQuizScore({ right: 0, wrong: 0 })
    setMode('quiz')
  }

  const markRight = () => {
    const w = quizWords[quizIndex]
    persist(words.map(v => v.id === w.id ? { ...v, reviewCount: v.reviewCount + 1, mastered: v.reviewCount + 1 >= 3 } : v))
    setQuizScore(s => ({ ...s, right: s.right + 1 }))
    nextQuizCard()
  }

  const markWrong = () => {
    setQuizScore(s => ({ ...s, wrong: s.wrong + 1 }))
    nextQuizCard()
  }

  const nextQuizCard = () => {
    if (quizIndex + 1 >= quizWords.length) {
      setMode('browse')
    } else {
      setQuizIndex(i => i + 1)
      setQuizFlipped(false)
    }
  }

  const shuffleWords = () => {
    persist([...words].sort(() => Math.random() - 0.5))
  }

  if (mode === 'quiz' && quizWords.length > 0) {
    const card = quizWords[quizIndex]
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setMode('browse')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-green-400">{quizScore.right} ✓</span>
            <span className="text-muted-foreground">{quizIndex + 1}/{quizWords.length}</span>
            <span className="text-red-400">{quizScore.wrong} ✗</span>
          </div>
        </div>
        <div className="glass rounded-2xl p-6 min-h-[240px] flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-white/5"
          onClick={() => setQuizFlipped(!quizFlipped)}>
          {!quizFlipped ? (
            <div className="space-y-3">
              <p className="text-xs text-primary font-medium uppercase tracking-widest">{card.category}</p>
              <p className="text-3xl font-bold text-foreground">{card.word}</p>
              <p className="text-xs text-muted-foreground mt-4">Tap to reveal definition & usage</p>
            </div>
          ) : (
            <div className="space-y-3 max-w-sm">
              <p className="text-xl font-bold text-foreground">{card.word}</p>
              <p className="text-sm text-muted-foreground">{card.definition}</p>
              <div className="text-left glass rounded-xl p-3 mt-2">
                <p className="text-[10px] text-primary font-semibold uppercase tracking-wider mb-1">Professional Use</p>
                <p className="text-xs text-foreground/80">{card.professionalUsage}</p>
              </div>
              <p className="text-xs text-muted-foreground italic">"{card.example}"</p>
            </div>
          )}
        </div>
        {quizFlipped && (
          <div className="flex gap-3">
            <button onClick={markWrong} className="flex-1 py-3 rounded-xl bg-red-500/15 text-red-400 font-medium text-sm hover:bg-red-500/25 transition-all">
              Didn't Know
            </button>
            <button onClick={markRight} className="flex-1 py-3 rounded-xl bg-green-500/15 text-green-400 font-medium text-sm hover:bg-green-500/25 transition-all">
              Got It!
            </button>
          </div>
        )}
      </div>
    )
  }

  if (mode === 'word' && selectedWord) {
    return (
      <div className="space-y-4">
        <button onClick={() => setMode('browse')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <div className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-primary font-medium uppercase tracking-widest">{selectedWord.category}</p>
              <h2 className="text-3xl font-bold text-foreground mt-1">{selectedWord.word}</h2>
            </div>
            <button onClick={() => {
              const updated = words.map(w => w.id === selectedWord.id ? { ...w, mastered: !w.mastered } : w)
              persist(updated)
              setSelectedWord(updated.find(w => w.id === selectedWord.id) || null)
            }} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all', selectedWord.mastered ? 'bg-green-500/20 text-green-400' : 'glass text-muted-foreground')}>
              {selectedWord.mastered ? <><Check className="w-3 h-3" /> Mastered</> : 'Mark Mastered'}
            </button>
          </div>
          <div className="space-y-3">
            <div className="glass rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Definition</p>
              <p className="text-sm text-foreground">{selectedWord.definition}</p>
            </div>
            <div className="glass rounded-xl p-3 border-l-2 border-primary/50">
              <p className="text-[10px] text-primary uppercase tracking-wider mb-1 font-semibold">Professional Usage</p>
              <p className="text-sm text-foreground/90">{selectedWord.professionalUsage}</p>
            </div>
            <div className="glass rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Example</p>
              <p className="text-sm text-foreground/80 italic">"{selectedWord.example}"</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Brain className="w-3 h-3" />
              <span>Reviewed {selectedWord.reviewCount} times</span>
              {selectedWord.mastered && <span className="text-green-400 flex items-center gap-1"><Check className="w-3 h-3" /> Mastered</span>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats + actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-3">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-sm text-muted-foreground">Mastered</span>
          <span className="text-sm font-bold text-foreground">{masteredCount}/{words.length}</span>
          <div className="w-20 h-1.5 rounded-full bg-white/10">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(masteredCount / words.length) * 100}%` }} />
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={shuffleWords} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-muted-foreground hover:text-foreground text-xs transition-all">
            <RotateCcw className="w-3.5 h-3.5" /> Shuffle
          </button>
          <button onClick={startQuiz} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-all">
            <Zap className="w-3.5 h-3.5" /> Quiz Mode
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(c => (
          <button key={c} onClick={() => setSelectedCategory(c)}
            className={cn('px-3 py-1 rounded-lg text-xs font-medium transition-all', selectedCategory === c ? 'bg-primary/20 text-primary' : 'glass text-muted-foreground hover:text-foreground')}>
            {c}
          </button>
        ))}
      </div>

      {/* Word grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {filtered.map(word => (
          <button key={word.id} onClick={() => { setSelectedWord(word); setMode('word') }}
            className={cn('glass rounded-xl p-3 text-left hover:bg-white/5 transition-all group', word.mastered && 'border border-green-500/20')}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{word.word}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{word.definition}</p>
              </div>
              {word.mastered && <Check className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-primary/70">{word.category}</span>
              <span className="text-[10px] text-muted-foreground">{word.reviewCount}× reviewed</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Roadmaps Tab ─────────────────────────────────────────────────────────────

type RoadmapStep = 'topic' | 'level' | 'time' | 'generating' | 'view'

function RoadmapsTab() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>(loadRoadmaps)
  const [step, setStep] = useState<RoadmapStep | null>(null)
  const [selectedRoadmap, setSelectedRoadmap] = useState<Roadmap | null>(null)
  const [form, setForm] = useState({ topic: '', customTopic: '', level: 'Beginner', hours: '5', deadline: '' })
  const [generating, setGenerating] = useState(false)
  const [geminiKey] = useState(() => localStorage.getItem('cortex-gemini-key') || '')

  const persist = (r: Roadmap[]) => { setRoadmaps(r); saveRoadmaps(r) }

  const TOPICS = Object.keys(ROADMAP_TEMPLATES)
  const LEVELS = ['Complete Beginner', 'Beginner', 'Intermediate', 'Advanced']

  const generateRoadmap = async () => {
    const topicName = form.topic === 'custom' ? form.customTopic : form.topic
    if (!topicName) return
    setGenerating(true)

    let phases: RoadmapPhase[]

    if (ROADMAP_TEMPLATES[topicName]) {
      phases = ROADMAP_TEMPLATES[topicName].phases.map(p => ({ ...p, completed: false }))
    } else if (geminiKey) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: `Create a learning roadmap for "${topicName}" for a ${form.level} learner with ${form.hours} hours/week available. Return JSON only with this structure: {"phases": [{"title": "string", "duration": "X weeks", "tasks": ["task1"], "resources": [{"type": "video|article|course|docs", "title": "string", "url": "string"}]}]}. Include 3-4 phases. Use real URLs from YouTube, Udemy, Coursera, or official docs.` }] }] }),
        })
        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          phases = (parsed.phases || []).map((p: Omit<RoadmapPhase, 'completed'>) => ({ ...p, completed: false }))
        } else throw new Error('No JSON')
      } catch {
        phases = [{ title: 'Getting Started', duration: '2 weeks', tasks: ['Research fundamentals', 'Find learning resources', 'Set up environment'], resources: [{ type: 'article', title: 'Search on YouTube for ' + topicName, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(topicName + ' tutorial')}` }], completed: false }]
      }
    } else {
      phases = [{ title: 'Getting Started', duration: '2 weeks', tasks: ['Research fundamentals', 'Find resources'], resources: [{ type: 'article', title: 'YouTube search: ' + topicName, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(topicName + ' tutorial')}` }], completed: false }]
    }

    const roadmap: Roadmap = {
      id: Date.now().toString(),
      topic: topicName,
      currentLevel: form.level,
      hoursPerWeek: parseInt(form.hours),
      deadline: form.deadline,
      phases,
      currentPhase: 0,
      aiGenerated: !!geminiKey && !ROADMAP_TEMPLATES[topicName],
      createdAt: new Date().toISOString(),
    }

    persist([...roadmaps, roadmap])
    setSelectedRoadmap(roadmap)
    setStep('view')
    setGenerating(false)
    setForm({ topic: '', customTopic: '', level: 'Beginner', hours: '5', deadline: '' })
  }

  const togglePhase = (roadmapId: string, phaseIdx: number) => {
    const updated = roadmaps.map(r => {
      if (r.id !== roadmapId) return r
      const phases = r.phases.map((p, i) => i === phaseIdx ? { ...p, completed: !p.completed } : p)
      const currentPhase = phases.findIndex(p => !p.completed)
      return { ...r, phases, currentPhase: currentPhase === -1 ? phases.length : currentPhase }
    })
    persist(updated)
    if (selectedRoadmap?.id === roadmapId) setSelectedRoadmap(updated.find(r => r.id === roadmapId) || null)
  }

  const ICON_MAP: Record<string, React.ElementType> = { video: Play, article: FileText, course: GraduationCap, docs: Globe }
  const ICON_COLOR: Record<string, string> = { video: 'text-red-400', article: 'text-blue-400', course: 'text-amber-400', docs: 'text-green-400' }

  if (step === 'view' && selectedRoadmap) {
    const totalPhases = selectedRoadmap.phases.length
    const donePhases = selectedRoadmap.phases.filter(p => p.completed).length
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => { setStep(null); setSelectedRoadmap(null) }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4" /> All Roadmaps
          </button>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span>{selectedRoadmap.currentLevel}</span>
            <span>·</span>
            <span>{selectedRoadmap.hoursPerWeek}h/week</span>
            {selectedRoadmap.deadline && <><span>·</span><span>By {selectedRoadmap.deadline}</span></>}
          </div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">{selectedRoadmap.topic}</h2>
              {selectedRoadmap.aiGenerated && <span className="text-[10px] text-primary flex items-center gap-1 mt-0.5"><Sparkles className="w-2.5 h-2.5" /> AI-generated roadmap</span>}
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-foreground">{donePhases}/{totalPhases}</p>
              <p className="text-xs text-muted-foreground">phases done</p>
            </div>
          </div>
          <div className="flex gap-1 mb-1">
            {selectedRoadmap.phases.map((p, i) => (
              <div key={i} className={cn('h-1.5 flex-1 rounded-full transition-all', p.completed ? 'bg-green-400' : i === selectedRoadmap.currentPhase ? 'bg-primary' : 'bg-white/10')} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{Math.round((donePhases / totalPhases) * 100)}% complete</p>
        </div>
        <div className="space-y-3">
          {selectedRoadmap.phases.map((phase, i) => (
            <div key={i} className={cn('glass rounded-xl overflow-hidden border', phase.completed ? 'border-green-500/20' : i === selectedRoadmap.currentPhase ? 'border-primary/30' : 'border-transparent')}>
              <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => togglePhase(selectedRoadmap.id, i)}>
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold', phase.completed ? 'bg-green-500/20 text-green-400' : i === selectedRoadmap.currentPhase ? 'bg-primary/20 text-primary' : 'bg-white/10 text-muted-foreground')}>
                  {phase.completed ? '✓' : i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{phase.title}</p>
                  <p className="text-xs text-muted-foreground">{phase.duration}</p>
                </div>
                {i === selectedRoadmap.currentPhase && !phase.completed && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">Current</span>
                )}
              </div>
              {(i === selectedRoadmap.currentPhase || phase.completed) && (
                <div className="px-3 pb-3 space-y-2 border-t border-white/5 pt-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Tasks</p>
                    <div className="space-y-1">
                      {phase.tasks.map((t, ti) => (
                        <div key={ti} className="flex items-center gap-2 text-xs text-foreground/80">
                          <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', phase.completed ? 'bg-green-400' : 'bg-primary')} />
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Resources</p>
                    <div className="space-y-1.5">
                      {phase.resources.map((r, ri) => {
                        const Icon = ICON_MAP[r.type] || Globe
                        return (
                          <a key={ri} href={r.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 glass rounded-lg px-3 py-2 hover:bg-white/5 transition-all group">
                            <Icon className={cn('w-3.5 h-3.5 shrink-0', ICON_COLOR[r.type])} />
                            <span className="text-xs text-foreground/80 flex-1">{r.title}</span>
                            <ExternalLink className="w-3 h-3 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                          </a>
                        )
                      })}
                    </div>
                  </div>
                  {!phase.completed && (
                    <button onClick={() => togglePhase(selectedRoadmap.id, i)}
                      className="w-full py-2 rounded-lg bg-green-500/15 text-green-400 text-xs font-medium hover:bg-green-500/25 transition-all flex items-center justify-center gap-1.5">
                      <Check className="w-3.5 h-3.5" /> Mark Phase Complete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (step !== null && step !== 'view') {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <button onClick={() => setStep(null)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        {step === 'topic' && (
          <div className="glass rounded-2xl p-5 space-y-4">
            <div className="text-center">
              <Target className="w-8 h-8 text-primary mx-auto mb-2" />
              <h2 className="text-lg font-bold text-foreground">What do you want to learn?</h2>
              <p className="text-xs text-muted-foreground mt-1">Pick a template or enter your own topic</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TOPICS.map(t => (
                <button key={t} onClick={() => { setForm(f => ({ ...f, topic: t })); setStep('level') }}
                  className={cn('px-3 py-2.5 rounded-xl glass text-left text-sm hover:bg-white/5 transition-all', form.topic === t && 'bg-primary/15 text-primary border border-primary/20')}>
                  {t}
                </button>
              ))}
              <button onClick={() => setForm(f => ({ ...f, topic: 'custom' }))}
                className={cn('px-3 py-2.5 rounded-xl glass text-left text-sm hover:bg-white/5 transition-all col-span-2', form.topic === 'custom' && 'bg-primary/15 text-primary border border-primary/20')}>
                + Custom topic...
              </button>
            </div>
            {form.topic === 'custom' && (
              <input value={form.customTopic} onChange={e => setForm(f => ({ ...f, customTopic: e.target.value }))}
                placeholder="e.g. Kubernetes, Product Management, SQL..."
                className="w-full glass rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none" />
            )}
            {form.topic && (
              <button onClick={() => setStep('level')}
                className="w-full py-3 rounded-xl bg-primary/20 text-primary font-semibold hover:bg-primary/30 transition-all flex items-center justify-center gap-2">
                Next <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {step === 'level' && (
          <div className="glass rounded-2xl p-5 space-y-4">
            <div className="text-center">
              <TrendingUp className="w-8 h-8 text-primary mx-auto mb-2" />
              <h2 className="text-lg font-bold text-foreground">What's your current level?</h2>
              <p className="text-xs text-muted-foreground mt-1">For: {form.topic === 'custom' ? form.customTopic : form.topic}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {LEVELS.map(l => (
                <button key={l} onClick={() => setForm(f => ({ ...f, level: l }))}
                  className={cn('py-3 rounded-xl glass text-sm font-medium transition-all', form.level === l ? 'bg-primary/20 text-primary border border-primary/20' : 'text-muted-foreground hover:text-foreground')}>
                  {l}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Hours per week you can dedicate</label>
              <div className="flex gap-2">
                {['2', '5', '10', '20'].map(h => (
                  <button key={h} onClick={() => setForm(f => ({ ...f, hours: h }))}
                    className={cn('flex-1 py-2 rounded-lg glass text-sm transition-all', form.hours === h ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground')}>
                    {h}h
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Target completion date (optional)</label>
              <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                className="w-full glass rounded-xl px-4 py-2.5 text-sm text-foreground outline-none" />
            </div>
            <button onClick={generateRoadmap} disabled={generating}
              className="w-full py-3 rounded-xl bg-primary/20 text-primary font-semibold hover:bg-primary/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
              {generating ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating Roadmap...</> : <><Sparkles className="w-4 h-4" /> Generate My Roadmap</>}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{roadmaps.length} roadmap{roadmaps.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setStep('topic')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-all">
          <Plus className="w-3.5 h-3.5" /> New Roadmap
        </button>
      </div>

      {roadmaps.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center space-y-3">
          <GraduationCap className="w-10 h-10 mx-auto text-primary/30" />
          <p className="text-sm font-semibold text-foreground">No roadmaps yet</p>
          <p className="text-xs text-muted-foreground">Create your first learning roadmap with AI-powered phases, real resources, and progress tracking.</p>
          <button onClick={() => setStep('topic')} className="px-5 py-2.5 rounded-xl bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-all">
            Create Roadmap
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {roadmaps.map(r => {
            const done = r.phases.filter(p => p.completed).length
            const pct = Math.round((done / r.phases.length) * 100)
            return (
              <button key={r.id} onClick={() => { setSelectedRoadmap(r); setStep('view') }}
                className="glass rounded-xl p-4 text-left hover:bg-white/5 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{r.topic}</p>
                  <span className="text-xs text-muted-foreground">{pct}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 mb-2">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span>{r.currentLevel}</span>
                  <span>·</span>
                  <span>{done}/{r.phases.length} phases</span>
                  <span>·</span>
                  <span>{r.hoursPerWeek}h/wk</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Language Tab ─────────────────────────────────────────────────────────────

const LANGUAGES = ['Spanish', 'French', 'German', 'Japanese', 'Mandarin', 'Hindi', 'Portuguese']
const SCENARIOS = ['Introduce yourself', 'Order food at a restaurant', 'Ask for directions', 'Business meeting small talk', 'Handle a complaint professionally', 'Make a formal presentation']
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced']

interface LangMessage { role: 'user' | 'ai'; text: string }

function LanguageTab() {
  const [geminiKey] = useState(() => localStorage.getItem('cortex-gemini-key') || '')
  const [lang, setLang] = useState('Spanish')
  const [scenario, setScenario] = useState(SCENARIOS[0])
  const [difficulty, setDifficulty] = useState('Beginner')
  const [messages, setMessages] = useState<LangMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startConversation = async () => {
    if (!geminiKey) return
    setStarted(true)
    setLoading(true)
    const systemPrompt = `You are a ${lang} language tutor. The difficulty is ${difficulty}. The scenario is: "${scenario}". Start the conversation in ${lang}, then provide an English translation in brackets. Keep it natural and educational. After each response, provide 1-2 vocabulary tips or grammar notes.`
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] }),
      })
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not start conversation.'
      setMessages([{ role: 'ai', text }])
    } catch { setMessages([{ role: 'ai', text: 'Failed to connect. Check your API key.' }]) }
    setLoading(false)
  }

  const sendMessage = async () => {
    if (!input.trim() || !geminiKey || loading) return
    const userMsg = input.trim()
    setInput('')
    const newMessages: LangMessage[] = [...messages, { role: 'user', text: userMsg }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const context = newMessages.map(m => ({ role: m.role === 'ai' ? 'model' : 'user', parts: [{ text: m.text }] }))
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: context }),
      })
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.'
      setMessages([...newMessages, { role: 'ai', text }])
    } catch { setMessages([...newMessages, { role: 'ai', text: 'Error getting response.' }]) }
    setLoading(false)
  }

  if (!geminiKey) {
    return (
      <div className="glass rounded-2xl p-8 text-center space-y-4">
        <Languages className="w-10 h-10 mx-auto text-primary/40" />
        <div>
          <p className="text-sm font-semibold text-foreground">Gemini API Key Required</p>
          <p className="text-xs text-muted-foreground mt-1">Language practice is powered by Gemini AI. Add your key in Settings to start practicing.</p>
        </div>
        <div className="glass rounded-xl p-3 text-left space-y-1">
          <p className="text-xs text-muted-foreground">Once connected, you can:</p>
          <div className="space-y-0.5">
            {['Practice 7 languages with AI conversation', 'Real-world scenarios (business, travel, daily life)', 'Grammar corrections and vocabulary tips', 'Beginner to Advanced difficulty'].map(f => (
              <div key={f} className="flex items-center gap-2 text-xs text-foreground/80"><Check className="w-3 h-3 text-green-400" />{f}</div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!started ? (
        <div className="space-y-4 max-w-lg mx-auto">
          <div className="glass rounded-2xl p-5 space-y-4">
            <div className="text-center">
              <Languages className="w-8 h-8 text-primary mx-auto mb-2" />
              <h2 className="text-lg font-bold text-foreground">Language Practice</h2>
              <p className="text-xs text-muted-foreground mt-1">AI-powered conversation practice</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Language</label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(l => (
                  <button key={l} onClick={() => setLang(l)}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all', lang === l ? 'bg-primary/20 text-primary border border-primary/20' : 'glass text-muted-foreground hover:text-foreground')}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Scenario</label>
              <div className="space-y-1.5">
                {SCENARIOS.map(s => (
                  <button key={s} onClick={() => setScenario(s)}
                    className={cn('w-full px-3 py-2 rounded-lg text-xs text-left transition-all', scenario === s ? 'bg-primary/20 text-primary border border-primary/20' : 'glass text-muted-foreground hover:text-foreground')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Difficulty</label>
              <div className="flex gap-2">
                {DIFFICULTIES.map(d => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={cn('flex-1 py-2 rounded-lg text-xs font-medium transition-all', difficulty === d ? 'bg-primary/20 text-primary' : 'glass text-muted-foreground hover:text-foreground')}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={startConversation} className="w-full py-3 rounded-xl bg-primary/20 text-primary font-semibold hover:bg-primary/30 transition-all flex items-center justify-center gap-2">
              <Mic className="w-4 h-4" /> Start Practice
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-[calc(100vh-220px)] min-h-[400px]">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => { setStarted(false); setMessages([]) }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-4 h-4" /> Settings
            </button>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs px-2 py-1 rounded-lg glass text-primary">{lang}</span>
              <span className="text-xs text-muted-foreground">{difficulty}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{scenario}</span>
            </div>
          </div>
          <div className="flex-1 glass rounded-2xl p-4 overflow-y-auto space-y-3 mb-3">
            {messages.map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap', m.role === 'user' ? 'bg-primary/20 text-foreground' : 'glass text-foreground/90')}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="glass rounded-2xl px-4 py-2.5 flex items-center gap-2">
                  <div className="flex gap-1">{[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}</div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={`Reply in ${lang} or ask for help...`}
              className="flex-1 glass rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none" />
            <button onClick={sendMessage} disabled={loading || !input.trim()}
              className="px-4 py-2.5 rounded-xl bg-primary/20 text-primary hover:bg-primary/30 transition-all disabled:opacity-50">
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main LearnHub ────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'books', label: 'Books', icon: Library },
  { id: 'vocab', label: 'Vocabulary', icon: BookMarked },
  { id: 'roadmaps', label: 'Roadmaps', icon: GraduationCap },
  { id: 'language', label: 'Language', icon: Languages },
]

export function LearnHub() {
  const [activeTab, setActiveTab] = useState<Tab>('books')

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 glass rounded-xl p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all',
              activeTab === id ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'books' && <BooksTab />}
      {activeTab === 'vocab' && <VocabTab />}
      {activeTab === 'roadmaps' && <RoadmapsTab />}
      {activeTab === 'language' && <LanguageTab />}
    </div>
  )
}
