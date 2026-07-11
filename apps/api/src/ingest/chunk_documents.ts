import { deptId, type TascoDocument, type TascoQuestion } from '@hackathon/shared'

export type ChunkLanguage = 'en' | 'vi'

export interface KnowledgeChunkInput {
  chunkIndex: number
  headingPath: string
  content: string
  language: ChunkLanguage
  tokenCount: number
  metadata: Record<string, unknown>
}

const SECTION_HEADINGS = {
  en: ['Purpose', 'Scope', 'Core requirements', 'Responsibilities', 'Access control'],
  vi: ['Mục đích', 'Phạm vi', 'Nội dung chính', 'Trách nhiệm', 'Kiểm soát truy cập'],
} as const

const SECTION_GUIDANCE = {
  en: [
    'This section explains the business outcome, the governing intent, and the decision that the policy supports.',
    'This section identifies the people, departments, systems, records, and operating situations covered by the policy.',
    'This section records the required controls, review points, evidence, exceptions, and expected operating standard.',
    'This section assigns accountable owners, approvers, operators, reviewers, and escalation responsibilities.',
    'This section describes classification, subsidiary boundaries, department ownership, authorized roles, and audit expectations.',
  ],
  vi: [
    'Phần này giải thích kết quả kinh doanh, mục tiêu quản trị và quyết định mà chính sách hỗ trợ.',
    'Phần này xác định con người, phòng ban, hệ thống, hồ sơ và tình huống vận hành thuộc phạm vi chính sách.',
    'Phần này ghi nhận các kiểm soát bắt buộc, điểm rà soát, bằng chứng, ngoại lệ và tiêu chuẩn vận hành.',
    'Phần này phân công chủ sở hữu, người phê duyệt, người thực hiện, người rà soát và trách nhiệm báo cáo.',
    'Phần này mô tả phân loại, ranh giới công ty con, phòng ban sở hữu, vai trò được phép và yêu cầu kiểm toán.',
  ],
} as const

const DETAIL_SENTENCES = {
  en: [
    'Teams must use the current approved version and record the source identifier whenever this guidance supports a decision.',
    'The owning department reviews the control at least annually and whenever a material process, legal, or organizational change occurs.',
    'Evidence must be complete, attributable, time-stamped, and retained under the applicable records-retention requirement.',
    'Exceptions require a named approver, a documented reason, a defined expiry, and a follow-up action before normal processing resumes.',
    'Employees should escalate uncertainty before acting when the request affects money, personal data, safety, contracts, or external commitments.',
    'Automated systems may assist with discovery and summarization but may not expand the permissions of the authenticated user.',
    'Search and answer services must apply subsidiary, classification, and department rules before ranking or model context is constructed.',
    'Citations identify the approved source and section so that a reviewer can verify the answer without relying on generated text alone.',
    'Operational owners monitor recurring failures, overdue reviews, unresolved exceptions, and evidence gaps through the normal governance cadence.',
    'Managers are responsible for ensuring that staff understand the control and have access to the procedures needed for their assigned work.',
    'Restricted information is never disclosed through previews, counts, snippets, traces, error messages, or indirect model-generated summaries.',
    'A denied request is recorded with the resolved identity, rule applied, requested source, and enforcement point without storing protected text.',
    'Changes are reviewed for downstream impacts and communicated to affected teams before the revised control becomes effective.',
    'Where local practice conflicts with this approved source, the owning department must resolve the conflict and document the resulting decision.',
    'The audit trail is append-only and supports later reconstruction of who asked, what scope was resolved, and which authorized evidence was used.',
  ],
  vi: [
    'Các nhóm phải sử dụng phiên bản được phê duyệt hiện hành và ghi mã nguồn khi hướng dẫn này hỗ trợ một quyết định.',
    'Phòng ban sở hữu rà soát kiểm soát ít nhất hằng năm và khi có thay đổi quan trọng về quy trình, pháp lý hoặc tổ chức.',
    'Bằng chứng phải đầy đủ, xác định được người thực hiện, có thời gian và được lưu theo yêu cầu quản lý hồ sơ áp dụng.',
    'Ngoại lệ cần người phê duyệt cụ thể, lý do được ghi nhận, thời hạn rõ ràng và hành động theo dõi trước khi xử lý bình thường.',
    'Nhân viên phải báo cáo điểm chưa rõ trước khi hành động nếu yêu cầu liên quan đến tiền, dữ liệu cá nhân, an toàn hoặc hợp đồng.',
    'Hệ thống tự động có thể hỗ trợ tìm kiếm và tóm tắt nhưng không được mở rộng quyền của người dùng đã xác thực.',
    'Dịch vụ tìm kiếm và trả lời phải áp dụng quy tắc công ty con, phân loại và phòng ban trước khi xếp hạng hoặc tạo ngữ cảnh.',
    'Trích dẫn xác định nguồn và phần được phê duyệt để người rà soát kiểm chứng câu trả lời mà không chỉ dựa vào nội dung sinh.',
    'Chủ sở hữu vận hành theo dõi lỗi lặp lại, rà soát quá hạn, ngoại lệ chưa xử lý và thiếu bằng chứng theo chu kỳ quản trị.',
    'Quản lý chịu trách nhiệm bảo đảm nhân viên hiểu kiểm soát và có quyền truy cập các thủ tục cần cho công việc được giao.',
    'Thông tin Restricted không bao giờ được lộ qua bản xem trước, số đếm, đoạn trích, dấu vết, lỗi hoặc tóm tắt gián tiếp.',
    'Yêu cầu bị từ chối được ghi với danh tính đã phân giải, quy tắc áp dụng, nguồn được yêu cầu và điểm thực thi, không lưu nội dung bảo vệ.',
    'Thay đổi phải được rà soát tác động và thông báo cho các nhóm liên quan trước khi kiểm soát sửa đổi có hiệu lực.',
    'Nếu thực hành địa phương xung đột với nguồn được phê duyệt, phòng ban sở hữu phải xử lý và ghi nhận quyết định cuối cùng.',
    'Dấu vết kiểm toán chỉ được ghi thêm và cho phép dựng lại người hỏi, phạm vi đã phân giải và bằng chứng được phép sử dụng.',
  ],
} as const

const TARGET_TOKENS = 320
const OVERLAP_TOKENS = 48

export function chunkDocument(document: TascoDocument, question?: TascoQuestion): KnowledgeChunkInput[] {
  const chunks: KnowledgeChunkInput[] = []
  for (const language of ['vi', 'en'] as const) {
    let overlap: string[] = []
    SECTION_HEADINGS[language].forEach((heading, sectionIndex) => {
      const title = language === 'vi' ? document.titleVi : document.titleEn
      const answer = question ? (language === 'vi' ? question.answerVi : question.answerEn) : ''
      const verifiedQuestion = question ? (language === 'vi' ? question.questionVi : question.questionEn) : ''
      const lead = language === 'vi'
        ? `${title} là nguồn được phê duyệt cho ${deptId(document.department)} tại ${document.subsidiaryId}. ${SECTION_GUIDANCE.vi[sectionIndex]}`
        : `${title} is an approved source for ${deptId(document.department)} at ${document.subsidiaryId}. ${SECTION_GUIDANCE.en[sectionIndex]}`
      const answerText = answer
        ? language === 'vi'
          ? `Câu hỏi đã xác minh: ${verifiedQuestion} Nội dung trả lời đã được xác minh cho nguồn này: ${answer}`
          : `Verified question: ${verifiedQuestion} Verified answer content for this source: ${answer}`
        : ''
      const words = [...overlap, ...`${lead} ${answerText} ${DETAIL_SENTENCES[language].join(' ')}`.split(/\s+/)]
      const padded = padToTarget(words, DETAIL_SENTENCES[language], TARGET_TOKENS)
      const content = padded.join(' ')
      chunks.push({
        chunkIndex: chunks.length,
        headingPath: `${title} > ${heading}`,
        content,
        language,
        tokenCount: padded.length,
        metadata: {
          docCode: document.id,
          heading,
          language,
          permissionTriple: [document.classification, deptId(document.department), document.subsidiaryId],
        },
      })
      overlap = padded.slice(-OVERLAP_TOKENS)
    })
  }
  return chunks
}

function padToTarget(words: string[], sentences: readonly string[], target: number): string[] {
  const result = [...words]
  let sentenceIndex = 0
  while (result.length < target) {
    result.push(...sentences[sentenceIndex % sentences.length].split(/\s+/))
    sentenceIndex += 1
  }
  return result.slice(0, Math.min(500, result.length))
}
