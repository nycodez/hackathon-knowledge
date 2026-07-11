export const TRACK_CODE = 'tasco' as const
export const TRACK_TITLE = 'Tasco Enterprise Knowledge' as const
export const API_PREFIX = '/api/v1' as const
export const PRIMARY_LOCALE = 'vi-VN' as const
export const QA_PREFIX = 'wsp' as const
export { en, type I18nKey } from './i18n/en.js'
export { vi } from './i18n/vi.js'

export const QA_IDS = [
  'wsp-shell',
  'wsp-assistant',
  'wsp-search',
  'wsp-documents',
  'wsp-admin',
  'wsp-eval',
] as const

export type PermissionDecision = 'allow' | 'deny'
export type AnswerState = 'answered' | 'permission_refusal' | 'no_answer' | 'step_up_required'
export type TascoRole = 'Employee' | 'Manager' | 'Director' | 'Executive'
export type TascoClassification = 'Public' | 'Internal' | 'Confidential' | 'Restricted'
export type TascoDepartmentId = 'COMP' | 'HR' | 'FIN' | 'PROD' | 'ENG' | 'OPS' | 'LEGAL' | 'EXEC'
export type TascoEvalExpectation = 'Allow' | 'Deny'
export type TascoEvalAnswerType = 'Exact' | 'Semantic' | 'Summary' | 'Permission' | 'Multi-document'

export interface TascoApiEnvelope<T> {
  success: boolean
  data?: T
  meta?: Record<string, unknown>
  errors?: Array<{ rule: string; field: string; message: string }>
}

export interface TascoCitation {
  sourceId: string
  chunkId: string
  title: string
  permissionClass: TascoClassification
  departmentId: TascoDepartmentId
  subsidiaryId: string
}

export interface ChatAnswer {
  state: AnswerState
  answer: string
  citations: TascoCitation[]
  enforcementTrace: PermissionTrace
}

export interface TascoDepartment {
  id: TascoDepartmentId
  en: string
  vi: string
}

export interface TascoUser {
  id: string
  name: string
  department: string
  role: TascoRole
  subsidiaryId: string
}

export interface TascoDocument {
  id: string
  titleVi: string
  titleEn: string
  department: string
  classification: TascoClassification
  subsidiaryId: string
}

export interface TascoQuestion {
  documentId: string
  questionEn: string
  questionVi: string
  answerEn: string
  answerVi: string
}

export type TascoQuestionPrompt = Pick<TascoQuestion, 'documentId' | 'questionEn' | 'questionVi'>

export interface TascoSubsidiary {
  id: string
  name: string
  metaEn: string
  metaVi: string
}

export interface TascoPermissionCase {
  id: string
  userId: string
  documentId: string
  ruleEn: string
  ruleVi: string
  expected: TascoEvalExpectation
  point: 'pre-filter' | 'subsidiary pre-filter'
}

export interface TascoPublicEvalRow {
  questionId: string
  userId: string
  expected: TascoEvalExpectation
  documentIds: string[]
  answerType: TascoEvalAnswerType
}

export interface TascoSeedData {
  departments: TascoDepartment[]
  users: TascoUser[]
  documents: TascoDocument[]
  questions: TascoQuestion[]
  subsidiaries: TascoSubsidiary[]
  personaIds: string[]
  permissionCases: TascoPermissionCase[]
  publicEvaluation: TascoPublicEvalRow[]
}

export interface TascoWorkspaceBootstrap {
  departments: TascoDepartment[]
  users: TascoUser[]
  documents: TascoDocument[]
  questions: TascoQuestionPrompt[]
  subsidiaries: TascoSubsidiary[]
  personaIds: string[]
}

export interface TascoPermissionResult {
  decision: PermissionDecision
  expected?: PermissionDecision
  passed?: boolean
  user: TascoUser
  document: TascoDocument
  rule: string
  enforcementPoint: 'retrieval_pre_filter' | 'subsidiary_pre_filter'
}

export interface PermissionTrace {
  user: TascoUser
  document: TascoDocument
  decision: PermissionDecision
  rule: string
  enforcementPoint: string
  sameQuestionByPersona: Array<{ user: TascoUser; decision: PermissionDecision }>
}

export interface TascoSearchResult {
  document: TascoDocument
  citation: TascoCitation
  snippet: string
}

export interface TascoSearchResponse {
  results: TascoSearchResult[]
  hiddenCount: number
  totalCandidates: number
}

export interface TascoAskResponse {
  state: AnswerState
  answer: string
  question: TascoQuestion
  citation?: TascoCitation
  trace: PermissionTrace
  threadId?: string
  messageId?: string
}

export interface TascoDocumentChunk {
  id: string
  headingPath: string
  language: 'en' | 'vi'
  tokenCount: number
  classification: TascoClassification
}

export interface TascoAccessMatrixRow {
  user: TascoUser
  decision: PermissionDecision
  rule: string
}

export interface TascoDocumentDetailResponse {
  document: TascoDocument
  decision: PermissionDecision
  trace: PermissionTrace
  citation?: TascoCitation
  content?: string
  deniedReason?: string
  chunks?: TascoDocumentChunk[]
  accessMatrix?: TascoAccessMatrixRow[]
}

export interface TascoThreadResponse {
  id: string
  userId: string
  language: 'en' | 'vi'
  title: string
  messages: Array<{
    id: string
    role: 'user' | 'assistant' | 'refusal' | 'system'
    content: string
    response?: TascoAskResponse
    createdAt: string
  }>
}

export type TascoAuditEventType =
  | 'retrieval_query'
  | 'permission_denied'
  | 'deterministic_answer'
  | 'claude_answer'
  | 'document_detail'
  | 'eval_run'

export interface TascoAuditReplayEvent {
  id: string
  tenantId: string
  actorUserId: string | null
  eventType: TascoAuditEventType
  enforcementPoint: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface TascoRetrievalTraceReplayResponse {
  source: 'audit' | 'seed'
  filters: {
    userId?: string
    documentId?: string
    eventType?: TascoAuditEventType
    limit: number
  }
  summary: {
    events: number
    persisted: boolean
  }
  events: TascoAuditReplayEvent[]
}

export interface TascoEvalCaseResult {
  id: string
  expected: TascoEvalExpectation
  actual: TascoEvalExpectation
  passed: boolean
  user: TascoUser
  document: TascoDocument
  rule: string
}

export interface TascoPublicEvalResult {
  questionId: string
  expected: TascoEvalExpectation
  actual: TascoEvalExpectation
  passed: boolean
  leak: boolean
  user: TascoUser
  documents: TascoDocument[]
  answerType: TascoEvalAnswerType
}

export interface TascoEvalReport {
  score: number
  total: number
  leaks: number
  caseResults: TascoEvalCaseResult[]
  publicResults: TascoPublicEvalResult[]
  metrics?: {
    recallAt5: number
    restrictedContextHits: number
    latencyP50Ms: number
    latencyP95Ms: number
  }
}

export interface TascoRuntimeMeta {
  track: typeof TRACK_CODE
  title: typeof TRACK_TITLE
  apiPrefix: typeof API_PREFIX
  stack: string
  counts: {
    documents: number
    chunks: number
    kgNodes?: number
    kgEdges?: number
    departments: number
    users: number
    subsidiaries: number
    permissionCases: number
    publicEvalRows: number
    evalRuns?: number
    seedChecksums?: number
  }
  llm: 'deterministic' | 'claude'
  embeddings: string
  locale: typeof PRIMARY_LOCALE
  source: 'database' | 'seed'
}

const departments: TascoDepartment[] = [
  { id: 'COMP', en: 'Company', vi: 'Công ty' },
  { id: 'HR', en: 'Human Resources', vi: 'Nhân sự' },
  { id: 'FIN', en: 'Finance', vi: 'Tài chính' },
  { id: 'PROD', en: 'Product', vi: 'Sản phẩm' },
  { id: 'ENG', en: 'Engineering', vi: 'Kỹ thuật' },
  { id: 'OPS', en: 'Operations', vi: 'Vận hành' },
  { id: 'LEGAL', en: 'Legal & Compliance', vi: 'Pháp chế & Tuân thủ' },
  { id: 'EXEC', en: 'Executive Office', vi: 'Ban Điều hành' },
]

export const DEPARTMENT_LABELS: Record<TascoDepartmentId, { en: string; vi: string }> = Object.fromEntries(
  departments.map((department) => [department.id, { en: department.en, vi: department.vi }])
) as Record<TascoDepartmentId, { en: string; vi: string }>

export const ROLE_LABELS: Record<TascoRole, { en: string; vi: string }> = {
  Employee: { en: 'Employee', vi: 'Nhân viên' },
  Manager: { en: 'Manager', vi: 'Quản lý' },
  Director: { en: 'Director', vi: 'Giám đốc' },
  Executive: { en: 'Executive', vi: 'Điều hành' },
}

const departmentAliases: Record<string, TascoDepartmentId> = {
  Company: 'COMP',
  COMP: 'COMP',
  HR: 'HR',
  'Human Resources': 'HR',
  Finance: 'FIN',
  FIN: 'FIN',
  Product: 'PROD',
  PROD: 'PROD',
  Engineering: 'ENG',
  ENG: 'ENG',
  Operations: 'OPS',
  OPS: 'OPS',
  'Legal & Compliance': 'LEGAL',
  LEGAL: 'LEGAL',
  'Executive Office': 'EXEC',
  EXEC: 'EXEC',
}

export function deptId(raw: string): TascoDepartmentId {
  return departmentAliases[raw] ?? 'COMP'
}

export function createTascoDemoData(): TascoSeedData {
  const documents: TascoDocument[] = [
    { id: 'DOC001', titleVi: 'Sổ tay nhân viên', titleEn: 'Employee Handbook', department: 'Company', classification: 'Public', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC002', titleVi: 'Chính sách nghỉ phép', titleEn: 'Leave Policy', department: 'Company', classification: 'Internal', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC003', titleVi: 'Chính sách công tác và di chuyển', titleEn: 'Business Travel & Transport Policy', department: 'Company', classification: 'Internal', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC004', titleVi: 'Chính sách sử dụng CNTT', titleEn: 'IT Usage Policy', department: 'Company', classification: 'Internal', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC005', titleVi: 'Quy tắc ứng xử', titleEn: 'Code of Conduct', department: 'Company', classification: 'Public', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC006', titleVi: 'Quy trình tuyển dụng', titleEn: 'Recruitment Process', department: 'HR', classification: 'Confidential', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC007', titleVi: 'Khung lương tham khảo', titleEn: 'Salary Band Reference', department: 'HR', classification: 'Confidential', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC008', titleVi: 'Quy trình đánh giá hiệu suất', titleEn: 'Performance Review Process', department: 'HR', classification: 'Confidential', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC009', titleVi: 'Chính sách đào tạo', titleEn: 'Training Policy', department: 'HR', classification: 'Internal', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC010', titleVi: 'Hướng dẫn onboarding', titleEn: 'Onboarding Guide', department: 'HR', classification: 'Internal', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC011', titleVi: 'Chính sách hoàn ứng chi phí', titleEn: 'Expense Reimbursement Policy', department: 'Finance', classification: 'Internal', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC012', titleVi: 'Hướng dẫn lập ngân sách', titleEn: 'Budgeting Guide', department: 'Finance', classification: 'Confidential', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC013', titleVi: 'Quy trình thanh toán nhà cung cấp', titleEn: 'Vendor Payment Process', department: 'Finance', classification: 'Internal', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC014', titleVi: 'Ma trận phê duyệt tài chính', titleEn: 'Financial Approval Matrix', department: 'Finance', classification: 'Confidential', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC015', titleVi: 'Chính sách mua sắm', titleEn: 'Procurement Policy', department: 'Finance', classification: 'Internal', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC016', titleVi: 'Chiến lược sản phẩm', titleEn: 'Product Strategy', department: 'Product', classification: 'Confidential', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC017', titleVi: 'Lộ trình sản phẩm', titleEn: 'Product Roadmap', department: 'Product', classification: 'Confidential', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC018', titleVi: 'Quy trình phát hành sản phẩm', titleEn: 'Product Release Process', department: 'Product', classification: 'Confidential', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC019', titleVi: 'Khung KPI sản phẩm', titleEn: 'Product KPI Framework', department: 'Product', classification: 'Confidential', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC020', titleVi: 'Mẫu PRD chuẩn', titleEn: 'Standard PRD Template', department: 'Product', classification: 'Internal', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC021', titleVi: 'Tiêu chuẩn kiến trúc hệ thống', titleEn: 'System Architecture Standards', department: 'Engineering', classification: 'Confidential', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC022', titleVi: 'Coding Standards', titleEn: 'Coding Standards', department: 'Engineering', classification: 'Internal', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC023', titleVi: 'Hướng dẫn triển khai', titleEn: 'Deployment Guide', department: 'Engineering', classification: 'Confidential', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC024', titleVi: 'Quy trình xử lý sự cố kỹ thuật', titleEn: 'Technical Incident Process', department: 'Engineering', classification: 'Internal', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC025', titleVi: 'Quy trình yêu cầu môi trường phát triển', titleEn: 'Dev Environment Request Process', department: 'Engineering', classification: 'Internal', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC026', titleVi: 'Quy trình hỗ trợ khách hàng', titleEn: 'Customer Support Process', department: 'Operations', classification: 'Internal', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC027', titleVi: 'Quy định SLA vận hành', titleEn: 'Operations SLA Policy', department: 'Operations', classification: 'Confidential', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC028', titleVi: 'Quy trình phản hồi sự cố vận hành', titleEn: 'Operational Incident Response Process', department: 'Operations', classification: 'Internal', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC029', titleVi: 'Kế hoạch liên tục kinh doanh', titleEn: 'Business Continuity Plan', department: 'Operations', classification: 'Confidential', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC030', titleVi: 'Quy trình quản lý chất lượng dịch vụ', titleEn: 'Service Quality Management Process', department: 'Operations', classification: 'Internal', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC031', titleVi: 'Chính sách bảo vệ dữ liệu cá nhân', titleEn: 'Personal Data Protection Policy', department: 'Legal & Compliance', classification: 'Internal', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC032', titleVi: 'Chính sách tuân thủ', titleEn: 'Compliance Policy', department: 'Legal & Compliance', classification: 'Internal', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC033', titleVi: 'Quy trình phê duyệt hợp đồng', titleEn: 'Contract Approval Process', department: 'Legal & Compliance', classification: 'Confidential', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC034', titleVi: 'Chính sách phân loại thông tin', titleEn: 'Information Classification Policy', department: 'Legal & Compliance', classification: 'Internal', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC035', titleVi: 'Chính sách lưu trữ hồ sơ', titleEn: 'Records Retention Policy', department: 'Legal & Compliance', classification: 'Internal', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC036', titleVi: 'Chiến lược công ty 2026', titleEn: 'Company Strategy 2026', department: 'Executive Office', classification: 'Restricted', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC037', titleVi: 'Dự báo tài chính 2026', titleEn: 'Financial Forecast 2026', department: 'Executive Office', classification: 'Restricted', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC038', titleVi: 'Ưu tiên kinh doanh năm 2026', titleEn: '2026 Business Priorities', department: 'Executive Office', classification: 'Restricted', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC039', titleVi: 'Kế hoạch M&A giả lập', titleEn: 'M&A Plan (Simulated)', department: 'Executive Office', classification: 'Restricted', subsidiaryId: 'DNP-WATER' },
    { id: 'DOC040', titleVi: 'Báo cáo chuyển đổi số nội bộ', titleEn: 'Internal Digital Transformation Report', department: 'Executive Office', classification: 'Restricted', subsidiaryId: 'DNP-WATER' },
    { id: 'TLD001', titleVi: 'Chính sách thử việc (Tasco Logistics - bản sao đồng bộ)', titleEn: 'Probation Policy (Tasco Logistics - synced copy)', department: 'Company', classification: 'Internal', subsidiaryId: 'TASCO-LOGISTICS-DEMO' },
  ]

  const users: TascoUser[] = [
    { id: 'U001', name: 'Nguyễn Văn An', department: 'Human Resources', role: 'Employee', subsidiaryId: 'DNP-WATER' },
    { id: 'U002', name: 'Trần Thị Bình', department: 'Finance', role: 'Manager', subsidiaryId: 'DNP-WATER' },
    { id: 'U003', name: 'Lê Minh Châu', department: 'Product', role: 'Director', subsidiaryId: 'DNP-WATER' },
    { id: 'U004', name: 'Phạm Quốc Dũng', department: 'Engineering', role: 'Employee', subsidiaryId: 'DNP-WATER' },
    { id: 'U005', name: 'Hoàng Thu Hà', department: 'Operations', role: 'Manager', subsidiaryId: 'DNP-WATER' },
    { id: 'U006', name: 'Đỗ Anh Khoa', department: 'Legal & Compliance', role: 'Director', subsidiaryId: 'DNP-WATER' },
    { id: 'U007', name: 'Vũ Thị Lan', department: 'Executive Office', role: 'Executive', subsidiaryId: 'DNP-WATER' },
    { id: 'U008', name: 'Bùi Đức Minh', department: 'Company', role: 'Employee', subsidiaryId: 'DNP-WATER' },
    { id: 'U009', name: 'Đặng Thanh Nga', department: 'Human Resources', role: 'Employee', subsidiaryId: 'DNP-WATER' },
    { id: 'U010', name: 'Phan Hải Nam', department: 'Finance', role: 'Manager', subsidiaryId: 'DNP-WATER' },
    { id: 'U011', name: 'Mai Phương Linh', department: 'Product', role: 'Director', subsidiaryId: 'DNP-WATER' },
    { id: 'U012', name: 'Tạ Quang Huy', department: 'Engineering', role: 'Employee', subsidiaryId: 'DNP-WATER' },
    { id: 'U013', name: 'Ngô Thùy Dương', department: 'Operations', role: 'Manager', subsidiaryId: 'DNP-WATER' },
    { id: 'U014', name: 'Cao Việt Long', department: 'Legal & Compliance', role: 'Director', subsidiaryId: 'DNP-WATER' },
    { id: 'U015', name: 'Đinh Thu Trang', department: 'Company', role: 'Employee', subsidiaryId: 'DNP-WATER' },
    { id: 'U016', name: 'Lý Minh Quân', department: 'Human Resources', role: 'Manager', subsidiaryId: 'DNP-WATER' },
    { id: 'U017', name: 'Trương Bảo Ngọc', department: 'Finance', role: 'Employee', subsidiaryId: 'DNP-WATER' },
    { id: 'U018', name: 'Hà Đức Anh', department: 'Product', role: 'Employee', subsidiaryId: 'DNP-WATER' },
    { id: 'U019', name: 'Võ Thanh Tâm', department: 'Engineering', role: 'Manager', subsidiaryId: 'DNP-WATER' },
    { id: 'U020', name: 'Chu Mai Anh', department: 'Operations', role: 'Employee', subsidiaryId: 'DNP-WATER' },
    { id: 'U021', name: 'Quách Hoàng Sơn', department: 'Legal & Compliance', role: 'Manager', subsidiaryId: 'DNP-WATER' },
    { id: 'U022', name: 'Nguyễn Diệu Linh', department: 'Company', role: 'Employee', subsidiaryId: 'DNP-WATER' },
    { id: 'U023', name: 'Trần Quốc Khánh', department: 'Human Resources', role: 'Director', subsidiaryId: 'DNP-WATER' },
    { id: 'U024', name: 'Lê Mỹ Hạnh', department: 'Finance', role: 'Employee', subsidiaryId: 'DNP-WATER' },
    { id: 'U025', name: 'Phạm Tuấn Kiệt', department: 'Product', role: 'Manager', subsidiaryId: 'DNP-WATER' },
    { id: 'U026', name: 'Hoàng Minh Thư', department: 'Engineering', role: 'Director', subsidiaryId: 'DNP-WATER' },
    { id: 'U027', name: 'Đỗ Gia Huy', department: 'Operations', role: 'Employee', subsidiaryId: 'DNP-WATER' },
    { id: 'U028', name: 'Bùi Hải Yến', department: 'Legal & Compliance', role: 'Employee', subsidiaryId: 'DNP-WATER' },
    { id: 'U029', name: 'Đặng Minh Tân', department: 'Company', role: 'Manager', subsidiaryId: 'DNP-WATER' },
    { id: 'U030', name: 'Phan Ngọc Mai', department: 'Human Resources', role: 'Employee', subsidiaryId: 'DNP-WATER' },
    { id: 'U031', name: 'Tạ Anh Dũng', department: 'Finance', role: 'Director', subsidiaryId: 'DNP-WATER' },
    { id: 'U032', name: 'Ngô Khánh Vy', department: 'Engineering', role: 'Employee', subsidiaryId: 'DNP-WATER' },
    { id: 'TLU001', name: 'Lâm Gia Bảo', department: 'Company', role: 'Employee', subsidiaryId: 'TASCO-LOGISTICS-DEMO' },
  ]

  return {
    departments,
    users,
    documents,
    questions,
    subsidiaries,
    personaIds: ['U001', 'U004', 'U003', 'U007'],
    permissionCases,
    publicEvaluation,
  }
}

const subsidiaries: TascoSubsidiary[] = [
  { id: 'DNP-WATER', name: 'DNP Water', metaEn: '40 documents · 32 users · seed dataset', metaVi: '40 tài liệu · 32 người dùng · dữ liệu gốc' },
  { id: 'TASCO-LOGISTICS-DEMO', name: 'Tasco Logistics', metaEn: 'Synthetic clone - demonstrates 150+ subsidiary isolation', metaVi: 'Bản sao tổng hợp - minh họa cách ly 150+ công ty con' },
]

const questions: TascoQuestion[] = [
  {
    documentId: 'DOC007',
    questionEn: 'What is the salary band for a Product Manager?',
    questionVi: 'Khung lương Product Manager là bao nhiêu?',
    answerEn: 'Per the Salary Band Reference (DOC007), the Product Manager band is set internally by HR and reviewed annually alongside the department budget.',
    answerVi: 'Theo Khung lương tham khảo (DOC007), khung lương vị trí Product Manager do phòng Nhân sự quy định nội bộ và rà soát định kỳ hằng năm cùng ngân sách phòng ban.',
  },
  {
    documentId: 'DOC036',
    questionEn: "What are the company's strategic priorities for 2026?",
    questionVi: 'Ưu tiên chiến lược của công ty năm 2026 là gì?',
    answerEn: 'Per Company Strategy 2026 (DOC036), the three strategic priorities focus on market expansion, operational optimization, and investment in an internal AI technology platform.',
    answerVi: 'Theo Chiến lược công ty 2026 (DOC036), ba ưu tiên chiến lược năm 2026 tập trung vào mở rộng thị trường, tối ưu vận hành và đầu tư nền tảng công nghệ AI nội bộ.',
  },
  {
    documentId: 'DOC002',
    questionEn: 'How many days of annual leave do employees get?',
    questionVi: 'Nhân viên được bao nhiêu ngày nghỉ phép năm?',
    answerEn: 'Per the Leave Policy (DOC002), permanent employees receive annual leave per the company standard, accruing with tenure.',
    answerVi: 'Theo Chính sách nghỉ phép (DOC002), nhân viên chính thức được nghỉ phép năm theo quy định chung của công ty, cộng dồn theo thâm niên công tác.',
  },
  {
    documentId: 'DOC027',
    questionEn: 'What is the target SLA for critical services?',
    questionVi: 'SLA mục tiêu cho dịch vụ quan trọng là bao nhiêu?',
    answerEn: 'Per the Operations SLA Policy (DOC027), services rated critical must meet the SLA targets set and monitored monthly by the Operations department.',
    answerVi: 'Theo Quy định SLA vận hành (DOC027), các dịch vụ xếp hạng quan trọng phải đáp ứng mục tiêu SLA do phòng Vận hành thiết lập và giám sát hằng tháng.',
  },
  {
    documentId: 'DOC001',
    questionEn: 'What is the probation policy?',
    questionVi: 'Chính sách thử việc là gì?',
    answerEn: 'Per the Employee Handbook (DOC001): "The standard probation period for permanent employees is 60 calendar days."',
    answerVi: 'Theo Sổ tay nhân viên (DOC001): "Thời gian thử việc tiêu chuẩn đối với nhân viên chính thức là 60 ngày lịch."',
  },
  {
    documentId: 'DOC034',
    questionEn: "What kind of information is 'Restricted'?",
    questionVi: 'Restricted nghĩa là loại thông tin như thế nào?',
    answerEn: "Per the Information Classification Policy (DOC034), 'Restricted' is the highest security level: only the Executive office may access it; every other role is denied by default.",
    answerVi: 'Theo Chính sách phân loại thông tin (DOC034), "Restricted" là mức phân loại bảo mật cao nhất: chỉ Ban Điều hành được truy cập; mọi vai trò khác bị từ chối theo mặc định.',
  },
  {
    documentId: 'DOC039',
    questionEn: 'What is in the M&A plan this year?',
    questionVi: 'Kế hoạch M&A năm nay có gì?',
    answerEn: 'Per the M&A Plan (DOC039), the simulated plan outlines candidate targets, valuation ranges, and an integration timeline - reserved to the Executive office.',
    answerVi: 'Theo Kế hoạch M&A giả lập (DOC039), bản kế hoạch nêu các mục tiêu tiềm năng, khoảng định giá và lộ trình tích hợp - chỉ dành cho Ban Điều hành.',
  },
  {
    documentId: 'DOC003',
    questionEn: 'What is required before booking business travel?',
    questionVi: 'Cần làm gì trước khi đặt chuyến công tác?',
    answerEn: 'Per the Business Travel & Transport Policy (DOC003), employees must obtain the required manager approval and use approved booking channels before travel is confirmed.',
    answerVi: 'Theo Chính sách công tác và di chuyển (DOC003), nhân viên phải có phê duyệt của quản lý và sử dụng kênh đặt chỗ được chấp thuận trước khi xác nhận chuyến đi.',
  },
  {
    documentId: 'DOC011',
    questionEn: 'How are employee expenses reimbursed?',
    questionVi: 'Chi phí của nhân viên được hoàn ứng như thế nào?',
    answerEn: 'Per the Expense Reimbursement Policy (DOC011), employees submit itemized evidence through the approved workflow for manager and Finance review.',
    answerVi: 'Theo Chính sách hoàn ứng chi phí (DOC011), nhân viên nộp chứng từ chi tiết qua quy trình được phê duyệt để quản lý và Tài chính rà soát.',
  },
  {
    documentId: 'DOC031',
    questionEn: 'How must personal data be handled?',
    questionVi: 'Dữ liệu cá nhân phải được xử lý như thế nào?',
    answerEn: 'Per the Personal Data Protection Policy (DOC031), personal data is collected for an approved purpose, accessed only by authorized staff, and retained only as required.',
    answerVi: 'Theo Chính sách bảo vệ dữ liệu cá nhân (DOC031), dữ liệu cá nhân chỉ được thu thập cho mục đích được phê duyệt, chỉ người có quyền được truy cập và chỉ lưu trong thời gian cần thiết.',
  },
]

const permissionCases: TascoPermissionCase[] = [
  { id: 'T1', userId: 'U003', documentId: 'DOC036', ruleEn: 'Restricted -> non-Executive denied', ruleVi: 'Restricted -> không phải Điều hành bị từ chối', expected: 'Deny', point: 'pre-filter' },
  { id: 'T2', userId: 'U007', documentId: 'DOC036', ruleEn: 'Restricted -> Executive allowed', ruleVi: 'Restricted -> Điều hành được phép', expected: 'Allow', point: 'pre-filter' },
  { id: 'T3', userId: 'U004', documentId: 'DOC007', ruleEn: 'Confidential -> cross-department denied', ruleVi: 'Confidential -> khác phòng bị từ chối', expected: 'Deny', point: 'pre-filter' },
  { id: 'T4', userId: 'U001', documentId: 'DOC007', ruleEn: 'Confidential -> own-department allowed', ruleVi: 'Confidential -> cùng phòng được phép', expected: 'Allow', point: 'pre-filter' },
  { id: 'T5', userId: 'U002', documentId: 'DOC002', ruleEn: 'Internal -> all roles allowed', ruleVi: 'Internal -> mọi vai trò được phép', expected: 'Allow', point: 'pre-filter' },
  { id: 'T6', userId: 'U003', documentId: 'DOC034', ruleEn: 'Internal -> ignores department', ruleVi: 'Internal -> bỏ qua phòng ban', expected: 'Allow', point: 'pre-filter' },
  { id: 'T7', userId: 'U001', documentId: 'DOC001', ruleEn: 'Public -> everyone', ruleVi: 'Public -> tất cả', expected: 'Allow', point: 'pre-filter' },
  { id: 'T8', userId: 'U010', documentId: 'TLD001', ruleEn: 'Subsidiary isolation (150+ requirement)', ruleVi: 'Cách ly công ty con (yêu cầu 150+)', expected: 'Deny', point: 'subsidiary pre-filter' },
]

const publicEvaluation: TascoPublicEvalRow[] = [
  ['P001', 'U001', 'Allow', ['DOC001'], 'Exact'],
  ['P002', 'U002', 'Allow', ['DOC002'], 'Exact'],
  ['P003', 'U010', 'Allow', ['DOC011'], 'Semantic'],
  ['P004', 'U003', 'Allow', ['DOC018'], 'Summary'],
  ['P005', 'U004', 'Allow', ['DOC025'], 'Semantic'],
  ['P006', 'U006', 'Allow', ['DOC035'], 'Exact'],
  ['P007', 'U003', 'Deny', ['DOC036'], 'Permission'],
  ['P008', 'U007', 'Allow', ['DOC036'], 'Summary'],
  ['P009', 'U004', 'Deny', ['DOC007'], 'Permission'],
  ['P010', 'U001', 'Allow', ['DOC007'], 'Exact'],
  ['P011', 'U005', 'Allow', ['DOC004'], 'Exact'],
  ['P012', 'U011', 'Allow', ['DOC003'], 'Exact'],
  ['P013', 'U010', 'Allow', ['DOC013'], 'Exact'],
  ['P014', 'U010', 'Allow', ['DOC012'], 'Exact'],
  ['P015', 'U010', 'Allow', ['DOC014'], 'Exact'],
  ['P016', 'U003', 'Allow', ['DOC019'], 'Semantic'],
  ['P017', 'U003', 'Allow', ['DOC020'], 'Summary'],
  ['P018', 'U004', 'Allow', ['DOC021'], 'Semantic'],
  ['P019', 'U004', 'Allow', ['DOC022'], 'Exact'],
  ['P020', 'U004', 'Allow', ['DOC024'], 'Exact'],
  ['P021', 'U005', 'Allow', ['DOC026'], 'Summary'],
  ['P022', 'U005', 'Allow', ['DOC027'], 'Exact'],
  ['P023', 'U006', 'Allow', ['DOC031'], 'Exact'],
  ['P024', 'U006', 'Allow', ['DOC032'], 'Exact'],
  ['P025', 'U006', 'Allow', ['DOC033'], 'Exact'],
  ['P026', 'U003', 'Allow', ['DOC034'], 'Semantic'],
  ['P027', 'U003', 'Deny', ['DOC037'], 'Permission'],
  ['P028', 'U007', 'Allow', ['DOC037'], 'Exact'],
  ['P029', 'U007', 'Allow', ['DOC039'], 'Summary'],
  ['P030', 'U007', 'Allow', ['DOC040'], 'Exact'],
  ['P031', 'U003', 'Allow', ['DOC001', 'DOC011'], 'Multi-document'],
  ['P032', 'U004', 'Deny', ['DOC017'], 'Permission'],
  ['P033', 'U003', 'Allow', ['DOC017'], 'Exact'],
  ['P034', 'U005', 'Allow', ['DOC030'], 'Summary'],
  ['P035', 'U002', 'Allow', ['DOC030'], 'Permission'],
  ['P036', 'U001', 'Allow', ['DOC010'], 'Exact'],
  ['P037', 'U003', 'Deny', ['DOC006'], 'Permission'],
  ['P038', 'U004', 'Allow', ['DOC023'], 'Exact'],
  ['P039', 'U002', 'Allow', ['DOC015'], 'Exact'],
  ['P040', 'U006', 'Allow', ['DOC031'], 'Semantic'],
  ['P041', 'U007', 'Allow', ['DOC038'], 'Summary'],
  ['P042', 'U004', 'Deny', ['DOC038'], 'Permission'],
  ['P043', 'U003', 'Allow', ['DOC018'], 'Exact'],
  ['P044', 'U012', 'Allow', ['DOC022'], 'Exact'],
  ['P045', 'U008', 'Allow', ['DOC005'], 'Exact'],
  ['P046', 'U001', 'Allow', ['DOC009'], 'Exact'],
  ['P047', 'U010', 'Allow', ['DOC013'], 'Summary'],
  ['P048', 'U014', 'Allow', ['DOC035'], 'Exact'],
  ['P049', 'U013', 'Allow', ['DOC028'], 'Exact'],
  ['P050', 'U003', 'Allow', ['DOC016'], 'Summary'],
].map(([questionId, userId, expected, documentIds, answerType]) => ({
  questionId,
  userId,
  expected,
  documentIds,
  answerType,
})) as TascoPublicEvalRow[]

export function findUser(userId: string, data = createTascoDemoData()): TascoUser {
  const user = data.users.find((candidate) => candidate.id === userId)
  if (!user) throw new Error(`Unknown Tasco user: ${userId}`)
  return user
}

export function findDocument(documentId: string, data = createTascoDemoData()): TascoDocument {
  const document = data.documents.find((candidate) => candidate.id === documentId)
  if (!document) throw new Error(`Unknown Tasco document: ${documentId}`)
  return document
}

export function permissionRuleFor(document: TascoDocument): string {
  if (document.classification === 'Public') return 'Public -> everyone is allowed'
  if (document.classification === 'Internal') return 'Internal -> all employees are allowed'
  if (document.classification === 'Confidential') return 'Confidential -> owning department or any Executive'
  if (document.classification === 'Restricted') return 'Restricted -> Executive only'
  return 'Unknown classification -> deny by default'
}

export function canAccess(user: TascoUser, document: TascoDocument): boolean {
  if (document.subsidiaryId !== user.subsidiaryId) return false
  if (document.classification === 'Public') return true
  if (document.classification === 'Internal') return true
  if (document.classification === 'Confidential') {
    return user.role === 'Executive' || deptId(user.department) === deptId(document.department)
  }
  if (document.classification === 'Restricted') return user.role === 'Executive'
  return false
}

export function decideAccess(user: TascoUser, document: TascoDocument): TascoPermissionResult {
  const allowed = canAccess(user, document)
  return {
    decision: allowed ? 'allow' : 'deny',
    user,
    document,
    rule: permissionRuleFor(document),
    enforcementPoint: document.subsidiaryId === user.subsidiaryId ? 'retrieval_pre_filter' : 'subsidiary_pre_filter',
  }
}

export function buildCitation(document: TascoDocument): TascoCitation {
  return {
    sourceId: document.id,
    chunkId: `${document.id}-chunk-001`,
    title: document.titleEn,
    permissionClass: document.classification,
    departmentId: deptId(document.department),
    subsidiaryId: document.subsidiaryId,
  }
}

export function buildTrace(user: TascoUser, document: TascoDocument, data = createTascoDemoData()): PermissionTrace {
  const decision = canAccess(user, document) ? 'allow' : 'deny'
  return {
    user,
    document,
    decision,
    rule: permissionRuleFor(document),
    enforcementPoint: document.subsidiaryId === user.subsidiaryId ? 'retrieval pre-filter' : 'subsidiary pre-filter',
    sameQuestionByPersona: data.personaIds.map((userId) => {
      const persona = findUser(userId, data)
      return {
        user: persona,
        decision: canAccess(persona, document) ? 'allow' : 'deny',
      }
    }),
  }
}

export function answerQuestion(userId: string, questionText: string, data = createTascoDemoData()): TascoAskResponse {
  const user = findUser(userId, data)
  const normalized = questionText.trim().toLowerCase()
  const question =
    data.questions.find((candidate) => candidate.questionEn.toLowerCase() === normalized || candidate.questionVi.toLowerCase() === normalized) ??
    data.questions.find((candidate) => candidate.questionEn.toLowerCase().includes(normalized) || candidate.questionVi.toLowerCase().includes(normalized)) ??
    data.questions[0]
  const document = findDocument(question.documentId, data)
  const trace = buildTrace(user, document, data)

  if (!canAccess(user, document)) {
    return {
      state: 'permission_refusal',
      answer: 'You do not have permission to access this document. The restricted chunk was blocked before retrieval and never sent to the model.',
      question,
      trace,
    }
  }

  return {
    state: 'answered',
    answer: question.answerEn,
    question,
    citation: buildCitation(document),
    trace,
  }
}

export function searchAuthorized(userId: string, query: string, data = createTascoDemoData()): TascoSearchResponse {
  const user = findUser(userId, data)
  const normalized = query.trim().toLowerCase()
  const candidates = data.documents.filter((document) => {
    if (document.subsidiaryId !== user.subsidiaryId) return false
    if (!normalized) return true
    return (
      document.id.toLowerCase().includes(normalized) ||
      document.titleEn.toLowerCase().includes(normalized) ||
      document.titleVi.toLowerCase().includes(normalized) ||
      document.classification.toLowerCase().includes(normalized) ||
      document.department.toLowerCase().includes(normalized)
    )
  })
  const visible = candidates.filter((document) => canAccess(user, document))

  return {
    hiddenCount: candidates.length - visible.length,
    totalCandidates: candidates.length,
    results: visible.map((document) => ({
      document,
      citation: buildCitation(document),
      snippet: 'Permission-checked citation available. Retrieved because the canonical user passed the pre-filter for this source.',
    })),
  }
}

export function runPermissionCases(data = createTascoDemoData()): TascoEvalCaseResult[] {
  return data.permissionCases.map((testCase) => {
    const user = findUser(testCase.userId, data)
    const document = findDocument(testCase.documentId, data)
    const actual: TascoEvalExpectation = canAccess(user, document) ? 'Allow' : 'Deny'
    return {
      id: testCase.id,
      expected: testCase.expected,
      actual,
      passed: actual === testCase.expected,
      user,
      document,
      rule: testCase.ruleEn,
    }
  })
}

export function runPublicEvaluation(data = createTascoDemoData()): TascoPublicEvalResult[] {
  return data.publicEvaluation.map((row) => {
    const user = findUser(row.userId, data)
    const documents = row.documentIds.map((documentId) => findDocument(documentId, data))
    const actual: TascoEvalExpectation = documents.every((document) => canAccess(user, document)) ? 'Allow' : 'Deny'
    return {
      questionId: row.questionId,
      expected: row.expected,
      actual,
      passed: actual === row.expected,
      leak: row.expected === 'Deny' && actual === 'Allow',
      user,
      documents,
      answerType: row.answerType,
    }
  })
}

export function buildEvalReport(data = createTascoDemoData()): TascoEvalReport {
  const caseResults = runPermissionCases(data)
  const publicResults = runPublicEvaluation(data)
  return {
    score: publicResults.filter((result) => result.passed).length,
    total: publicResults.length,
    leaks: publicResults.filter((result) => result.leak).length,
    caseResults,
    publicResults,
  }
}

export function buildTascoSummary(data = createTascoDemoData()) {
  return {
    track: TRACK_CODE,
    title: TRACK_TITLE,
    documents: data.documents.length,
    users: data.users.length,
    subsidiaries: data.subsidiaries.length,
    publicEvalRows: data.publicEvaluation.length,
    permissionCases: data.permissionCases.length,
    stack: 'Angular + Express + Postgres/pgvector + Claude-ready retrieval',
  }
}
