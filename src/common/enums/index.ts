export enum Role {
  STATE_REVIEWER = 'STATE_REVIEWER',
  CENTRAL_REVIEWER = 'CENTRAL_REVIEWER',
}

export enum SchemeStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  PUBLISHED = 'PUBLISHED',
  SENT_BACK = 'SENT_BACK',
}

export enum ReviewAction {
  APPROVED = 'APPROVED',
  SENT_BACK = 'SENT_BACK',
}

export enum ReviewFlagStatus {
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
}
