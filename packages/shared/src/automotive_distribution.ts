import type { TascoDepartment, TascoDocument, TascoPermissionCase, TascoQuestion, TascoRole, TascoUser } from './tasco.js'

export const AUTOMOTIVE_DISTRIBUTION_BUSINESS_UNIT = {
  id: 'TASCO-AUTO-DISTRIBUTION-DEMO',
  name: 'Tasco Automotive Distribution',
} as const

const roles: TascoRole[] = ['Employee', 'Manager', 'Director', 'Executive']

export function createAutomotiveDistributionPersonas(departments: TascoDepartment[]): TascoUser[] {
  return departments.flatMap((department) => roles.map((role) => ({
    id: `AUTO-${department.id}-${role === 'Employee' ? 'EMP' : role === 'Manager' ? 'MGR' : role === 'Director' ? 'DIR' : 'EXEC'}`,
    name: `${department.id === 'FIN' ? 'Accounting' : department.en} ${role}`,
    department: department.id,
    displayDepartment: department.id === 'FIN' ? 'Accounting' : department.en,
    role,
    subsidiaryId: AUTOMOTIVE_DISTRIBUTION_BUSINESS_UNIT.id,
    identityType: 'demo_persona',
    businessUnitId: AUTOMOTIVE_DISTRIBUTION_BUSINESS_UNIT.id,
    businessUnitName: AUTOMOTIVE_DISTRIBUTION_BUSINESS_UNIT.name,
    provenance: 'automotive-distribution demo persona; ACL department resolves through the canonical Departments dimension',
    status: 'Active',
  })))
}

export const AUTOMOTIVE_DISTRIBUTION_DOCUMENTS: TascoDocument[] = [
  { id: 'AUTO-COMP-001', titleEn: 'Automotive Distribution Operating Model', titleVi: 'Mô hình vận hành phân phối ô tô', department: 'COMP', classification: 'Internal', subsidiaryId: AUTOMOTIVE_DISTRIBUTION_BUSINESS_UNIT.id, provenance: 'curated-demo' },
  { id: 'AUTO-HR-001', titleEn: 'Automotive Distribution Accountant Onboarding', titleVi: 'Hướng dẫn hội nhập kế toán phân phối ô tô', department: 'HR', classification: 'Internal', subsidiaryId: AUTOMOTIVE_DISTRIBUTION_BUSINESS_UNIT.id, provenance: 'curated-demo' },
  { id: 'ACC-AUTO-001', titleEn: 'Dealer Network Month-End Close Playbook', titleVi: 'Quy trình khóa sổ tháng mạng lưới đại lý', department: 'FIN', classification: 'Internal', subsidiaryId: AUTOMOTIVE_DISTRIBUTION_BUSINESS_UNIT.id, provenance: 'curated-demo' },
  { id: 'ACC-AUTO-002', titleEn: 'Vehicle Sales Invoice and Revenue Control', titleVi: 'Kiểm soát hóa đơn và doanh thu bán xe', department: 'FIN', classification: 'Internal', subsidiaryId: AUTOMOTIVE_DISTRIBUTION_BUSINESS_UNIT.id, provenance: 'official-context-reviewed', ingestionProvider: 'apify-website-content-crawler', sourceUrls: ['https://www.mof.gov.vn/tin-tuc-tai-chinh/tin-chinh-sach-tai-chinh/quy-dinh-moi-ve-che-do-ke-toan-doanh-nghiep'] },
  { id: 'ACC-AUTO-003', titleEn: 'Vehicle Landed Cost Allocation Standard', titleVi: 'Chuẩn phân bổ giá vốn xe nhập kho', department: 'FIN', classification: 'Internal', subsidiaryId: AUTOMOTIVE_DISTRIBUTION_BUSINESS_UNIT.id, provenance: 'official-context-reviewed', ingestionProvider: 'apify-website-content-crawler', sourceUrls: ['https://www.mof.gov.vn/tin-tuc-tai-chinh/tin-chinh-sach-tai-chinh/quy-dinh-moi-ve-che-do-ke-toan-doanh-nghiep'] },
  { id: 'ACC-AUTO-004', titleEn: 'Vietnam E-Invoice Controls for Vehicle Sales', titleVi: 'Kiểm soát hóa đơn điện tử khi bán xe tại Việt Nam', department: 'FIN', classification: 'Internal', subsidiaryId: AUTOMOTIVE_DISTRIBUTION_BUSINESS_UNIT.id, provenance: 'official-context-reviewed', ingestionProvider: 'apify-website-content-crawler', sourceUrls: ['https://vanban.chinhphu.vn/?docid=201365&lang=vi&pageid=27160'] },
  { id: 'ACC-AUTO-005', titleEn: 'Vehicle Inventory and VIN Reconciliation', titleVi: 'Đối soát tồn kho xe và số VIN', department: 'FIN', classification: 'Confidential', subsidiaryId: AUTOMOTIVE_DISTRIBUTION_BUSINESS_UNIT.id, provenance: 'curated-demo' },
  { id: 'ACC-AUTO-006', titleEn: 'Dealer Incentive and Vendor Match Controls', titleVi: 'Kiểm soát đối chiếu thưởng đại lý và nhà cung cấp', department: 'FIN', classification: 'Confidential', subsidiaryId: AUTOMOTIVE_DISTRIBUTION_BUSINESS_UNIT.id, provenance: 'curated-demo' },
  { id: 'AUTO-PROD-001', titleEn: 'Dealer Pricing Release Controls', titleVi: 'Kiểm soát phát hành bảng giá đại lý', department: 'PROD', classification: 'Confidential', subsidiaryId: AUTOMOTIVE_DISTRIBUTION_BUSINESS_UNIT.id, provenance: 'curated-demo' },
  { id: 'AUTO-ENG-001', titleEn: 'Dealer Management Finance Data Pipeline', titleVi: 'Luồng dữ liệu tài chính hệ thống quản lý đại lý', department: 'ENG', classification: 'Internal', subsidiaryId: AUTOMOTIVE_DISTRIBUTION_BUSINESS_UNIT.id, provenance: 'curated-demo' },
  { id: 'AUTO-OPS-001', titleEn: 'Dealer Receivables and Vehicle Handover', titleVi: 'Quy trình công nợ đại lý và bàn giao xe', department: 'OPS', classification: 'Internal', subsidiaryId: AUTOMOTIVE_DISTRIBUTION_BUSINESS_UNIT.id, provenance: 'curated-demo' },
  { id: 'AUTO-LEGAL-001', titleEn: 'Vehicle Sales Contract Evidence Standard', titleVi: 'Chuẩn chứng từ hợp đồng bán xe', department: 'LEGAL', classification: 'Internal', subsidiaryId: AUTOMOTIVE_DISTRIBUTION_BUSINESS_UNIT.id, provenance: 'official-context-reviewed', ingestionProvider: 'apify-website-content-crawler', sourceUrls: ['https://vanban.chinhphu.vn/?docid=201365&lang=vi&pageid=27160'] },
  { id: 'AUTO-DIR-001', titleEn: 'Distribution Network Performance — Accounting View', titleVi: 'Hiệu quả mạng lưới phân phối — góc nhìn kế toán', department: 'FIN', classification: 'Confidential', subsidiaryId: AUTOMOTIVE_DISTRIBUTION_BUSINESS_UNIT.id, provenance: 'curated-demo' },
  { id: 'AUTO-EXEC-001', titleEn: 'Dealer Acquisition and M&A Pipeline', titleVi: 'Danh mục mua lại đại lý và M&A', department: 'EXEC', classification: 'Restricted', subsidiaryId: AUTOMOTIVE_DISTRIBUTION_BUSINESS_UNIT.id, provenance: 'curated-demo' },
  { id: 'AUTO-EXEC-002', titleEn: 'Executive Automotive Distribution Performance', titleVi: 'Hiệu quả phân phối ô tô cấp điều hành', department: 'EXEC', classification: 'Restricted', subsidiaryId: AUTOMOTIVE_DISTRIBUTION_BUSINESS_UNIT.id, provenance: 'curated-demo' },
]

export const AUTOMOTIVE_DISTRIBUTION_QUESTIONS: TascoQuestion[] = [
  qa('AUTO-COMP-001', 'Who owns the automotive distribution operating model?', 'Ai phụ trách mô hình vận hành phân phối ô tô?', 'The Distribution Operations lead owns the dealer operating model; Accounting owns vehicle revenue, inventory, incentive, close, and reconciliation controls.', 'Trưởng bộ phận Vận hành Phân phối phụ trách mô hình đại lý; Kế toán phụ trách doanh thu xe, tồn kho, thưởng, khóa sổ và kiểm soát đối soát.'),
  qa('AUTO-HR-001', 'What should a new automotive distribution accountant complete in week one?', 'Kế toán phân phối ô tô mới cần hoàn thành gì trong tuần đầu?', 'Complete DMS and ERP access, chart-of-accounts mapping, dealer assignment, segregation-of-duties review, VIN-control training, and a supervised close rehearsal.', 'Hoàn thành quyền DMS và ERP, ánh xạ hệ thống tài khoản, phân công đại lý, rà soát phân tách nhiệm vụ, đào tạo kiểm soát VIN và diễn tập khóa sổ có giám sát.'),
  qa('ACC-AUTO-001', 'What is the dealer network month-end close sequence?', 'Trình tự khóa sổ tháng mạng lưới đại lý là gì?', 'Freeze sales and inventory interfaces, reconcile bank and dealer receivables, match every vehicle VIN to the subledger, post approved incentives and accruals, review margin variances, then lock the period.', 'Chốt giao diện bán hàng và tồn kho, đối soát ngân hàng và công nợ đại lý, khớp từng VIN với sổ chi tiết, hạch toán thưởng và dồn tích đã duyệt, rà soát biến động biên lợi nhuận, sau đó khóa kỳ.'),
  qa('ACC-AUTO-002', 'When can revenue for a vehicle sale be recorded?', 'Khi nào được ghi nhận doanh thu bán xe?', 'Record revenue only after the approved sales contract, payment or credit approval, VIN allocation, vehicle handover evidence, and valid invoice data agree; unresolved exceptions remain blocked.', 'Chỉ ghi nhận doanh thu khi hợp đồng bán đã duyệt, thanh toán hoặc phê duyệt tín dụng, phân bổ VIN, bằng chứng bàn giao xe và dữ liệu hóa đơn hợp lệ khớp nhau; ngoại lệ chưa xử lý tiếp tục bị chặn.'),
  qa('ACC-AUTO-003', 'How is landed cost allocated to each vehicle?', 'Giá vốn nhập kho được phân bổ cho từng xe thế nào?', 'Assign purchase price and directly attributable freight, import, inspection, and preparation costs to the VIN using the approved allocation basis; account for rebates separately with reviewer evidence.', 'Gán giá mua và chi phí vận chuyển, nhập khẩu, kiểm định, chuẩn bị liên quan trực tiếp cho từng VIN theo tiêu thức đã duyệt; hạch toán khoản giảm giá riêng với bằng chứng rà soát.'),
  qa('ACC-AUTO-004', 'What controls apply before issuing a vehicle sales e-invoice in Vietnam?', 'Cần kiểm soát gì trước khi phát hành hóa đơn điện tử bán xe tại Việt Nam?', 'Validate customer identity, tax code, contract, VIN, taxable amount, tax treatment, approval, and invoice sequence; retain correction or replacement evidence with the accounting record.', 'Kiểm tra danh tính khách hàng, mã số thuế, hợp đồng, VIN, giá trị tính thuế, cách xử lý thuế, phê duyệt và số hóa đơn; lưu bằng chứng điều chỉnh hoặc thay thế cùng hồ sơ kế toán.'),
  qa('ACC-AUTO-005', 'How is vehicle inventory reconciled?', 'Tồn kho xe được đối soát thế nào?', 'Reconcile the physical VIN list to the dealer-management subledger and general ledger by location and status; investigate vehicles in transit, demo units, sold-not-delivered units, and every unmatched VIN.', 'Đối soát danh sách VIN thực tế với sổ chi tiết hệ thống đại lý và sổ cái theo địa điểm và trạng thái; điều tra xe đang vận chuyển, xe lái thử, xe đã bán chưa bàn giao và mọi VIN không khớp.'),
  qa('ACC-AUTO-006', 'What evidence is required before paying a dealer incentive?', 'Cần bằng chứng gì trước khi thanh toán thưởng đại lý?', 'Match the approved incentive program, eligible VIN-level sales, delivery evidence, dealer claim, and Accounting calculation; route exceptions to an independent approver before payment.', 'Đối chiếu chương trình thưởng đã duyệt, doanh số đủ điều kiện theo VIN, bằng chứng bàn giao, yêu cầu của đại lý và phép tính của Kế toán; ngoại lệ phải được người phê duyệt độc lập xử lý trước khi chi.'),
  qa('AUTO-PROD-001', 'What must be tested before a dealer pricing change is released?', 'Cần kiểm thử gì trước khi phát hành thay đổi bảng giá đại lý?', 'Test model and trim mapping, base price, options, discount authority, tax, registration-related charges, incentive interaction, effective dates, duplicate prevention, audit fields, and rollback.', 'Kiểm thử ánh xạ mẫu và phiên bản xe, giá cơ sở, tùy chọn, thẩm quyền chiết khấu, thuế, khoản liên quan đăng ký, tương tác thưởng, ngày hiệu lực, chống trùng, trường kiểm toán và hoàn tác.'),
  qa('AUTO-ENG-001', 'How are dealer finance pipeline failures handled?', 'Lỗi luồng dữ liệu tài chính đại lý được xử lý thế nào?', 'Quarantine failed sales or inventory events, preserve the immutable source payload, VIN and correlation id, reconcile control totals, and replay only after Accounting approval.', 'Cách ly sự kiện bán hàng hoặc tồn kho lỗi, giữ nguyên payload nguồn, VIN và mã liên kết, đối chiếu tổng kiểm soát và chỉ chạy lại sau khi Kế toán phê duyệt.'),
  qa('AUTO-OPS-001', 'When is a dealer receivable handed to Accounting?', 'Khi nào công nợ đại lý được bàn giao cho Kế toán?', 'Sales Operations hands off after validating the contract, VIN, delivery status, deposit, financing approval, dealer ledger, disputes, and approved payment plan; Accounting reconciles the control account before escalation.', 'Vận hành Bán hàng bàn giao sau khi xác minh hợp đồng, VIN, trạng thái bàn giao, tiền đặt cọc, phê duyệt tài chính, sổ công nợ đại lý, tranh chấp và kế hoạch thanh toán; Kế toán đối soát tài khoản kiểm soát trước khi chuyển cấp xử lý.'),
  qa('AUTO-LEGAL-001', 'What vehicle sales contract evidence must Accounting retain?', 'Kế toán phải lưu bằng chứng hợp đồng bán xe nào?', 'Retain the signed agreement, approval trail, vehicle specification and VIN, price and discount authority, customer acceptance, handover record, amendments, invoice, and retention classification.', 'Lưu hợp đồng đã ký, luồng phê duyệt, thông số xe và VIN, thẩm quyền giá và chiết khấu, xác nhận khách hàng, biên bản bàn giao, phụ lục, hóa đơn và phân loại lưu trữ.'),
  qa('AUTO-DIR-001', 'How is the automotive distribution network performing this month?', 'Mạng lưới phân phối ô tô tháng này hoạt động thế nào?', 'Accounting view: close is on track; 1,240 vehicles were delivered, collections are 96%, gross margin is 8.4%, and three dealerships require aged-receivables follow-up.', 'Góc nhìn Kế toán: khóa sổ đúng tiến độ; 1.240 xe đã được bàn giao, tỷ lệ thu tiền đạt 96%, biên lợi nhuận gộp đạt 8,4% và ba đại lý cần xử lý công nợ quá hạn.'),
  qa('AUTO-EXEC-001', 'Which dealer acquisition or M&A targets are under review?', 'Mục tiêu mua lại đại lý hoặc M&A nào đang được xem xét?', 'Executive-only: the simulated pipeline contains two dealership groups under diligence. This answer and its source are never exposed to non-Executive principals.', 'Chỉ dành cho Điều hành: danh mục mô phỏng có hai nhóm đại lý đang được thẩm định. Câu trả lời và nguồn không bao giờ hiển thị cho người dùng không phải Điều hành.'),
  qa('AUTO-EXEC-002', 'How is the automotive distribution network performing this month?', 'Mạng lưới phân phối ô tô tháng này hoạt động thế nào?', 'Executive view: 1,240 vehicles were delivered, collections are 96%, and gross margin is 8.4%; OEM bonus forecasts, dealer-level profitability, and acquisition sensitivity are available only in this Restricted source.', 'Góc nhìn Điều hành: 1.240 xe đã được bàn giao, tỷ lệ thu tiền đạt 96% và biên lợi nhuận gộp đạt 8,4%; dự báo thưởng OEM, lợi nhuận theo đại lý và độ nhạy mua lại chỉ có trong nguồn Restricted này.'),
]

export const AUTOMOTIVE_DISTRIBUTION_PERMISSION_CASES: TascoPermissionCase[] = [
  pc('AUT1', 'AUTO-FIN-EMP', 'ACC-AUTO-001', 'Allow', 'Internal -> every authenticated automotive-distribution employee'),
  pc('AUT2', 'AUTO-FIN-EMP', 'ACC-AUTO-005', 'Allow', 'Confidential -> own canonical department'),
  pc('AUT3', 'AUTO-OPS-EMP', 'ACC-AUTO-005', 'Deny', 'Confidential -> cross-department denied before retrieval'),
  pc('AUT4', 'AUTO-FIN-DIR', 'AUTO-PROD-001', 'Deny', 'Director -> no cross-department Confidential access'),
  pc('AUT5', 'AUTO-FIN-EXEC', 'AUTO-PROD-001', 'Allow', 'Executive -> all department knowledge'),
  pc('AUT6', 'AUTO-FIN-EMP', 'AUTO-EXEC-001', 'Deny', 'Restricted -> non-Executive denied before retrieval'),
  pc('AUT7', 'AUTO-FIN-EXEC', 'AUTO-EXEC-001', 'Allow', 'Restricted -> Executive only'),
  pc('AUT8', 'U010', 'ACC-AUTO-001', 'Deny', 'Subsidiary isolation -> sponsor identity cannot cross into demo business unit'),
]

function qa(documentId: string, questionEn: string, questionVi: string, answerEn: string, answerVi: string): TascoQuestion {
  return { documentId, questionEn, questionVi, answerEn, answerVi }
}

function pc(id: string, userId: string, documentId: string, expected: 'Allow' | 'Deny', ruleEn: string): TascoPermissionCase {
  return { id, userId, documentId, expected, ruleEn, ruleVi: ruleEn, point: ruleEn.startsWith('Subsidiary') ? 'subsidiary pre-filter' : 'pre-filter' }
}
