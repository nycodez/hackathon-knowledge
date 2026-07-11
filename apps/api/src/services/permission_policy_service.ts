import {
  buildEvalReport,
  canAccess,
  decideAccess,
  findDocument,
  findUser,
  runPermissionCases,
  runPublicEvaluation,
  type TascoDocument,
  type TascoSeedData,
  type TascoUser,
} from '@hackathon/shared'

export default class PermissionPolicyService {
  canAccess(user: TascoUser, document: TascoDocument): boolean {
    return canAccess(user, document)
  }

  decide(userId: string, documentId: string, data: TascoSeedData) {
    return decideAccess(findUser(userId, data), findDocument(documentId, data))
  }

  runPermissionCases(data: TascoSeedData) {
    return runPermissionCases(data)
  }

  runPublicEvaluation(data: TascoSeedData) {
    return runPublicEvaluation(data)
  }

  buildEvalReport(data: TascoSeedData) {
    return buildEvalReport(data)
  }
}
