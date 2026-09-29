export const operations = {
  login: `mutation Login($role: String!, $password: String!) {
    login(role: $role, password: $password) { token role expiresAt }
  }`,
  workspace: `{ studies { id title description domain records updated fields trend }
    requests { studyId purpose status date } }`,
  requestAccess: `mutation RequestAccess($studyId: ID!, $purpose: String!) {
    requestAccess(studyId: $studyId, purpose: $purpose) {
      studyId purpose status date
    }
  }`,
  decideAccess: `mutation DecideAccess($studyId: ID!, $approve: Boolean!) {
    decideAccess(studyId: $studyId, approve: $approve) {
      studyId purpose status date
    }
  }`,
  dashboard: `{ dashboard { mode url } }`,
  recommend: `query Recommend($question: String!) {
    recommend(question: $question) {
      mode recommendations { id fields }
    }
  }`,
} as const;
