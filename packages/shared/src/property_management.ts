import type { TascoDepartment, TascoDocument, TascoPermissionCase, TascoQuestion, TascoRole, TascoUser } from './tasco.js'

export const PROPERTY_MANAGEMENT_BUSINESS_UNIT = {
  id: 'TASCO-PROPERTY-DEMO',
  name: 'Tasco Property Management',
} as const

const roles: TascoRole[] = ['Employee', 'Manager', 'Director', 'Executive']

export function createPropertyManagementPersonas(departments: TascoDepartment[]): TascoUser[] {
  return departments.flatMap((department) => roles.map((role) => ({
    id: `PM-${department.id}-${role === 'Employee' ? 'EMP' : role === 'Manager' ? 'MGR' : role === 'Director' ? 'DIR' : 'EXEC'}`,
    name: `${department.id === 'FIN' ? 'Accounting' : department.en} ${role}`,
    department: department.id,
    displayDepartment: department.id === 'FIN' ? 'Accounting' : department.en,
    role,
    subsidiaryId: PROPERTY_MANAGEMENT_BUSINESS_UNIT.id,
    identityType: 'demo_persona',
    businessUnitId: PROPERTY_MANAGEMENT_BUSINESS_UNIT.id,
    businessUnitName: PROPERTY_MANAGEMENT_BUSINESS_UNIT.name,
    provenance: 'property-management demo persona; ACL department resolves through the canonical Departments dimension',
    status: 'Active',
  })))
}

export const PROPERTY_MANAGEMENT_DOCUMENTS: TascoDocument[] = [
  { id: 'PM-COMP-001', titleEn: 'Property Management Operating Model', titleVi: 'Mô hình vận hành quản lý bất động sản', department: 'COMP', classification: 'Internal', subsidiaryId: PROPERTY_MANAGEMENT_BUSINESS_UNIT.id, provenance: 'curated-demo' },
  { id: 'PM-HR-001', titleEn: 'Property Accountant Onboarding Guide', titleVi: 'Hướng dẫn hội nhập kế toán bất động sản', department: 'HR', classification: 'Internal', subsidiaryId: PROPERTY_MANAGEMENT_BUSINESS_UNIT.id, provenance: 'curated-demo' },
  { id: 'ACC-PM-001', titleEn: 'Property Month-End Close Playbook', titleVi: 'Quy trình khóa sổ tháng bất động sản', department: 'FIN', classification: 'Internal', subsidiaryId: PROPERTY_MANAGEMENT_BUSINESS_UNIT.id, provenance: 'curated-demo' },
  { id: 'ACC-PM-002', titleEn: 'Management Fee Billing Policy', titleVi: 'Chính sách lập hóa đơn phí quản lý', department: 'FIN', classification: 'Internal', subsidiaryId: PROPERTY_MANAGEMENT_BUSINESS_UNIT.id, provenance: 'official-context-reviewed', ingestionProvider: 'apify-website-content-crawler', sourceUrls: ['https://moc.gov.vn/pl/pages/ChiTietVanBan.aspx?TypeVB=1&vID=420'] },
  { id: 'ACC-PM-003', titleEn: 'Property Cost Allocation Standard', titleVi: 'Chuẩn phân bổ chi phí bất động sản', department: 'FIN', classification: 'Internal', subsidiaryId: PROPERTY_MANAGEMENT_BUSINESS_UNIT.id, provenance: 'official-context-reviewed', ingestionProvider: 'apify-website-content-crawler', sourceUrls: ['https://www.mof.gov.vn/tin-tuc-tai-chinh/tin-chinh-sach-tai-chinh/quy-dinh-moi-ve-che-do-ke-toan-doanh-nghiep'] },
  { id: 'ACC-PM-004', titleEn: 'Vietnam E-Invoice Control Guide', titleVi: 'Hướng dẫn kiểm soát hóa đơn điện tử Việt Nam', department: 'FIN', classification: 'Internal', subsidiaryId: PROPERTY_MANAGEMENT_BUSINESS_UNIT.id, provenance: 'official-context-reviewed', ingestionProvider: 'apify-website-content-crawler', sourceUrls: ['https://vanban.chinhphu.vn/?docid=201365&lang=vi&pageid=27160'] },
  { id: 'ACC-PM-005', titleEn: 'Maintenance Fund Reconciliation', titleVi: 'Đối soát quỹ bảo trì', department: 'FIN', classification: 'Confidential', subsidiaryId: PROPERTY_MANAGEMENT_BUSINESS_UNIT.id, provenance: 'official-context-reviewed', ingestionProvider: 'apify-website-content-crawler', sourceUrls: ['https://vanban.chinhphu.vn/?docid=209627&pageid=27160', 'https://moc.gov.vn/pl/pages/ChiTietVanBan.aspx?TypeVB=1&vID=420'] },
  { id: 'ACC-PM-006', titleEn: 'Vendor Three-Way Match Controls', titleVi: 'Kiểm soát đối chiếu ba bên nhà cung cấp', department: 'FIN', classification: 'Confidential', subsidiaryId: PROPERTY_MANAGEMENT_BUSINESS_UNIT.id, provenance: 'curated-demo' },
  { id: 'PM-PROD-001', titleEn: 'Billing Release Controls', titleVi: 'Kiểm soát phát hành chức năng tính phí', department: 'PROD', classification: 'Confidential', subsidiaryId: PROPERTY_MANAGEMENT_BUSINESS_UNIT.id, provenance: 'curated-demo' },
  { id: 'PM-ENG-001', titleEn: 'Property Finance Data Pipeline', titleVi: 'Luồng dữ liệu tài chính bất động sản', department: 'ENG', classification: 'Internal', subsidiaryId: PROPERTY_MANAGEMENT_BUSINESS_UNIT.id, provenance: 'curated-demo' },
  { id: 'PM-OPS-001', titleEn: 'Resident Arrears Handoff', titleVi: 'Quy trình bàn giao công nợ cư dân', department: 'OPS', classification: 'Internal', subsidiaryId: PROPERTY_MANAGEMENT_BUSINESS_UNIT.id, provenance: 'curated-demo' },
  { id: 'PM-LEGAL-001', titleEn: 'Property Contract Evidence Standard', titleVi: 'Chuẩn chứng từ hợp đồng bất động sản', department: 'LEGAL', classification: 'Internal', subsidiaryId: PROPERTY_MANAGEMENT_BUSINESS_UNIT.id, provenance: 'official-context-reviewed', ingestionProvider: 'apify-website-content-crawler', sourceUrls: ['https://vanban.chinhphu.vn/?docid=209627&pageid=27160'] },
  { id: 'PM-DIR-001', titleEn: 'Property Portfolio Performance — Accounting View', titleVi: 'Hiệu quả danh mục bất động sản — góc nhìn kế toán', department: 'FIN', classification: 'Confidential', subsidiaryId: PROPERTY_MANAGEMENT_BUSINESS_UNIT.id, provenance: 'curated-demo' },
  { id: 'PM-EXEC-001', titleEn: 'Property Acquisition and M&A Pipeline', titleVi: 'Danh mục mua lại và M&A bất động sản', department: 'EXEC', classification: 'Restricted', subsidiaryId: PROPERTY_MANAGEMENT_BUSINESS_UNIT.id, provenance: 'curated-demo' },
  { id: 'PM-EXEC-002', titleEn: 'Executive Property Portfolio Performance', titleVi: 'Hiệu quả danh mục bất động sản cấp điều hành', department: 'EXEC', classification: 'Restricted', subsidiaryId: PROPERTY_MANAGEMENT_BUSINESS_UNIT.id, provenance: 'curated-demo' },
]

export const PROPERTY_MANAGEMENT_QUESTIONS: TascoQuestion[] = [
  qa('PM-COMP-001', 'Who owns the property management operating model?', 'Ai phụ trách mô hình vận hành quản lý bất động sản?', 'The Property Operations lead owns the operating model; Accounting owns billing, close, reconciliation, and financial controls.', 'Trưởng bộ phận Vận hành Bất động sản phụ trách mô hình vận hành; Kế toán phụ trách tính phí, khóa sổ, đối soát và kiểm soát tài chính.'),
  qa('PM-HR-001', 'What should a new property accountant complete in week one?', 'Kế toán bất động sản mới cần hoàn thành gì trong tuần đầu?', 'Complete system access, chart-of-accounts mapping, property assignment, segregation-of-duties review, and a supervised close rehearsal.', 'Hoàn thành quyền hệ thống, ánh xạ hệ thống tài khoản, phân công tòa nhà, rà soát phân tách nhiệm vụ và diễn tập khóa sổ có giám sát.'),
  qa('ACC-PM-001', 'What is the property month-end close sequence?', 'Trình tự khóa sổ tháng bất động sản là gì?', 'Freeze billing inputs, reconcile bank and receivables, post approved accruals, reconcile owner and maintenance-fund balances, review variances, then lock the period.', 'Chốt dữ liệu tính phí, đối soát ngân hàng và công nợ, hạch toán dồn tích đã duyệt, đối soát số dư chủ sở hữu và quỹ bảo trì, rà soát biến động, sau đó khóa kỳ.'),
  qa('ACC-PM-002', 'How is the monthly management fee calculated?', 'Phí quản lý hàng tháng được tính như thế nào?', 'Use the contract- or conference-approved rate multiplied by the billable usable area, apply approved concessions, then validate tax and e-invoice fields before issue.', 'Lấy đơn giá được hợp đồng hoặc hội nghị thông qua nhân với diện tích sử dụng tính phí, áp dụng ưu đãi được duyệt, rồi kiểm tra thuế và trường hóa đơn điện tử trước khi phát hành.'),
  qa('ACC-PM-003', 'How are shared property costs allocated?', 'Chi phí dùng chung bất động sản được phân bổ thế nào?', 'Post direct costs to the benefiting property first; allocate shared costs only with the approved driver, period, and reviewer documented in the journal support.', 'Hạch toán chi phí trực tiếp vào bất động sản hưởng lợi trước; chỉ phân bổ chi phí chung khi chứng từ bút toán ghi rõ tiêu thức, kỳ và người duyệt.'),
  qa('ACC-PM-004', 'What controls apply before issuing a Vietnam e-invoice?', 'Cần kiểm soát gì trước khi phát hành hóa đơn điện tử tại Việt Nam?', 'Validate customer identity, tax code, service period, taxable amount, tax treatment, approval, and the invoice sequence; retain correction or replacement evidence with the accounting record.', 'Kiểm tra danh tính khách hàng, mã số thuế, kỳ dịch vụ, giá trị tính thuế, cách xử lý thuế, phê duyệt và số hóa đơn; lưu bằng chứng điều chỉnh hoặc thay thế cùng hồ sơ kế toán.'),
  qa('ACC-PM-005', 'How is the apartment maintenance fund reconciled?', 'Quỹ bảo trì nhà chung cư được đối soát thế nào?', 'Reconcile the dedicated bank balance to owner-level receipts and authorized expenditure, investigate every variance, and keep the fund separate from operating cash.', 'Đối soát số dư tài khoản riêng với khoản thu theo chủ sở hữu và chi phí được phê duyệt, điều tra mọi chênh lệch và tách quỹ khỏi tiền vận hành.'),
  qa('ACC-PM-006', 'What evidence is required for a vendor payment?', 'Thanh toán nhà cung cấp cần bằng chứng gì?', 'Match the approved purchase order or contract, service acceptance, and valid invoice; route exceptions to an independent approver before payment release.', 'Đối chiếu đơn mua hàng hoặc hợp đồng đã duyệt, biên bản nghiệm thu và hóa đơn hợp lệ; ngoại lệ phải được người phê duyệt độc lập xử lý trước khi chi.'),
  qa('PM-PROD-001', 'What must be tested before a billing change is released?', 'Cần kiểm thử gì trước khi phát hành thay đổi tính phí?', 'Test rate, area, concession, proration, tax, rounding, duplicate prevention, audit fields, and rollback against an approved accounting fixture.', 'Kiểm thử đơn giá, diện tích, ưu đãi, phân bổ theo thời gian, thuế, làm tròn, chống trùng, trường kiểm toán và hoàn tác với bộ dữ liệu kế toán đã duyệt.'),
  qa('PM-ENG-001', 'How are finance pipeline failures handled?', 'Lỗi luồng dữ liệu tài chính được xử lý thế nào?', 'Quarantine failed events, preserve the immutable source payload and correlation id, reconcile control totals, and replay only after Accounting approval.', 'Cách ly sự kiện lỗi, giữ nguyên payload nguồn và mã liên kết, đối chiếu tổng kiểm soát và chỉ chạy lại sau khi Kế toán phê duyệt.'),
  qa('PM-OPS-001', 'When is resident arrears handed to Accounting?', 'Khi nào công nợ cư dân được bàn giao cho Kế toán?', 'Operations hands off after validating the resident ledger, notices, disputes, and approved payment plans; Accounting reconciles the control account before escalation.', 'Vận hành bàn giao sau khi xác minh sổ công nợ cư dân, thông báo, tranh chấp và kế hoạch thanh toán đã duyệt; Kế toán đối soát tài khoản kiểm soát trước khi chuyển cấp xử lý.'),
  qa('PM-LEGAL-001', 'What contract evidence must Accounting retain?', 'Kế toán phải lưu bằng chứng hợp đồng nào?', 'Retain the signed agreement, approval trail, scope, fee basis, acceptance evidence, amendments, invoices, and the retention classification.', 'Lưu hợp đồng đã ký, luồng phê duyệt, phạm vi, cơ sở tính phí, bằng chứng nghiệm thu, phụ lục, hóa đơn và phân loại lưu trữ.'),
  qa('PM-DIR-001', 'How is the property portfolio performing this month?', 'Danh mục bất động sản tháng này hoạt động thế nào?', 'Accounting view: close is on track; management-fee collections are 94%, controllable operating cost is 1.8% over plan, and two properties need arrears follow-up.', 'Góc nhìn Kế toán: khóa sổ đúng tiến độ; thu phí quản lý đạt 94%, chi phí vận hành kiểm soát được vượt kế hoạch 1,8% và hai bất động sản cần xử lý công nợ.'),
  qa('PM-EXEC-001', 'What property acquisition or M&A targets are under review?', 'Mục tiêu mua lại hoặc M&A bất động sản nào đang được xem xét?', 'Executive-only: the simulated pipeline contains two targets under diligence. This answer and its source are never exposed to non-Executive principals.', 'Chỉ dành cho Điều hành: danh mục mô phỏng có hai mục tiêu đang thẩm định. Câu trả lời và nguồn không bao giờ hiển thị cho người dùng không phải Điều hành.'),
  qa('PM-EXEC-002', 'How is the property portfolio performing this month?', 'Danh mục bất động sản tháng này hoạt động thế nào?', 'Executive view: collections are 94% and operating cost is 1.8% over plan; acquisition sensitivity and owner-level margin forecasts are available only in this Restricted source.', 'Góc nhìn Điều hành: thu phí đạt 94% và chi phí vận hành vượt kế hoạch 1,8%; độ nhạy mua lại và dự báo biên lợi nhuận theo chủ sở hữu chỉ có trong nguồn Restricted này.'),
]

export const PROPERTY_MANAGEMENT_PERMISSION_CASES: TascoPermissionCase[] = [
  pc('PMT1', 'PM-FIN-EMP', 'ACC-PM-001', 'Allow', 'Internal -> every authenticated property-management employee'),
  pc('PMT2', 'PM-FIN-EMP', 'ACC-PM-005', 'Allow', 'Confidential -> own canonical department'),
  pc('PMT3', 'PM-OPS-EMP', 'ACC-PM-005', 'Deny', 'Confidential -> cross-department denied before retrieval'),
  pc('PMT4', 'PM-FIN-DIR', 'PM-PROD-001', 'Deny', 'Director -> no cross-department Confidential access'),
  pc('PMT5', 'PM-FIN-EXEC', 'PM-PROD-001', 'Allow', 'Executive -> all department knowledge'),
  pc('PMT6', 'PM-FIN-EMP', 'PM-EXEC-001', 'Deny', 'Restricted -> non-Executive denied before retrieval'),
  pc('PMT7', 'PM-FIN-EXEC', 'PM-EXEC-001', 'Allow', 'Restricted -> Executive only'),
  pc('PMT8', 'U010', 'ACC-PM-001', 'Deny', 'Subsidiary isolation -> sponsor identity cannot cross into demo business unit'),
]

function qa(documentId: string, questionEn: string, questionVi: string, answerEn: string, answerVi: string): TascoQuestion {
  return { documentId, questionEn, questionVi, answerEn, answerVi }
}

function pc(id: string, userId: string, documentId: string, expected: 'Allow' | 'Deny', ruleEn: string): TascoPermissionCase {
  return { id, userId, documentId, expected, ruleEn, ruleVi: ruleEn, point: ruleEn.startsWith('Subsidiary') ? 'subsidiary pre-filter' : 'pre-filter' }
}
