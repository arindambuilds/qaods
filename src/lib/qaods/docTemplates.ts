/**
 * docTemplates.ts
 *
 * Template registry for the Critical Document domain.
 * Each template defines the field manifest and a set of deterministic Rule
 * functions that the Auditor evaluates without any LLM.
 *
 * Adding a new document type:
 *   1. Add the docType string to DocType in types.ts
 *   2. Add a template entry here
 *   3. getTemplate() picks it up automatically
 */

import type { DocField, DocIssue, DocTemplate, DocType, Rule } from './types'
import { ValidationError } from './errors'

// ── Shared helpers ────────────────────────────────────────────────────────

const DD_MM_YYYY = /^\d{2}\/\d{2}\/\d{4}$/

function parseDMY(value: string): Date | null {
  if (!DD_MM_YYYY.test(value)) return null
  const [d, m, y] = value.split('/').map(Number)
  const date = new Date(y, m - 1, d)
  // Guard against JS date overflow (e.g. 31/02/2005)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null
  return date
}

function issue(
  fieldId: string | null,
  severity: 'error' | 'warn',
  code: string,
  message: string
): DocIssue {
  return { fieldId, severity, code, message }
}

// ── CBSE Exam Form v1 ─────────────────────────────────────────────────────

const CBSE_FIELDS: DocField[] = [
  // Personal details
  { id: 'candidateName',  label: 'Candidate Name',       type: 'text',   required: true,  minLength: 2, maxLength: 100 },
  { id: 'fatherName',     label: "Father's Name",         type: 'text',   required: true,  minLength: 2, maxLength: 100 },
  { id: 'motherName',     label: "Mother's Name",         type: 'text',   required: false, minLength: 2, maxLength: 100 },
  { id: 'dob',            label: 'Date of Birth',         type: 'date',   required: true,  pattern: '^\\d{2}/\\d{2}/\\d{4}$' },
  { id: 'gender',         label: 'Gender',                type: 'select', required: true,  options: ['Male', 'Female', 'Other'] },

  // Academic details
  { id: 'rollNumber',     label: 'Roll Number',           type: 'text',   required: true,  pattern: '^\\d{7}$' },
  { id: 'schoolCode',     label: 'School Code',           type: 'text',   required: true,  pattern: '^\\d{5}$' },
  { id: 'classLevel',     label: 'Class',                 type: 'select', required: true,  options: ['10', '12'] },
  { id: 'stream',         label: 'Stream',                type: 'select', required: false, options: ['Science', 'Commerce', 'Arts', 'N/A'] },

  // Category & reservation
  {
    id: 'category',
    label: 'Category',
    type: 'select',
    required: true,
    options: ['General', 'OBC', 'SC', 'ST', 'EWS'],
  },
  {
    id: 'certificateType',
    label: 'Caste Certificate Type',
    type: 'select',
    required: false,
    options: ['Central', 'State', 'N/A'],
  },

  // Exam centre
  { id: 'examCentre',     label: 'Exam Centre Name',      type: 'text',   required: true,  minLength: 3, maxLength: 120 },
  { id: 'examCentreCode', label: 'Exam Centre Code',      type: 'text',   required: true,  pattern: '^\\d{5}$' },

  // Subjects (comma-separated subject codes)
  { id: 'subjects',       label: 'Subject Codes',         type: 'text',   required: true,  pattern: '^(\\d{3})(,\\d{3}){4,5}$' },

  // Declarations
  { id: 'photoUploaded',      label: 'Photo Uploaded',        type: 'select', required: true,  options: ['yes', 'no'] },
  { id: 'signatureConfirmed', label: 'Signature Confirmed',   type: 'select', required: true,  options: ['yes', 'no'] },
]

// ── Rules ─────────────────────────────────────────────────────────────────
// Each rule is a pure function. Weights must sum to ≤ 1.0.
// The Auditor computes: score = 100 × Σ(weight_i × (1 if rule_i passes else 0))

const CBSE_RULES: Rule[] = [
  // ── Rule 1: Required fields present (weight 0.35) ──────────────────────
  {
    id: 'required_fields',
    description: 'All required fields must be non-empty',
    weight: 0.35,
    evaluate(inputs) {
      return CBSE_FIELDS
        .filter(f => f.required && !inputs[f.id]?.trim())
        .map(f => issue(f.id, 'error', 'REQUIRED_MISSING', `${f.label} is required`))
    },
  },

  // ── Rule 2: Date of birth format and plausibility (weight 0.15) ────────
  {
    id: 'dob_format',
    description: 'DOB must be dd/mm/yyyy and represent a plausible exam candidate age (10–25 years)',
    weight: 0.15,
    evaluate(inputs) {
      const raw = inputs['dob']?.trim()
      if (!raw) return []   // covered by required_fields rule

      if (!DD_MM_YYYY.test(raw)) {
        return [issue('dob', 'error', 'DATE_FORMAT_INVALID', 'Date of Birth must be in dd/mm/yyyy format')]
      }

      const dob = parseDMY(raw)
      if (!dob) {
        return [issue('dob', 'error', 'DATE_INVALID', 'Date of Birth is not a valid calendar date')]
      }

      const today = new Date()
      const ageYears = (today.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
      if (ageYears < 10 || ageYears > 25) {
        return [issue('dob', 'warn', 'DOB_AGE_IMPLAUSIBLE', `Candidate age (${Math.round(ageYears)}) is outside the expected range of 10–25 years`)]
      }

      return []
    },
  },

  // ── Rule 3: Category vs certificate type consistency (weight 0.15) ─────
  {
    id: 'category_certificate_consistency',
    description: 'OBC/SC/ST candidates must provide a caste certificate type; General/EWS should not',
    weight: 0.15,
    evaluate(inputs) {
      const category = inputs['category']?.trim()
      const certType = inputs['certificateType']?.trim()
      if (!category) return []

      const reservedCategories = ['OBC', 'SC', 'ST']
      const needsCert = reservedCategories.includes(category)

      if (needsCert && (!certType || certType === 'N/A')) {
        return [issue('certificateType', 'error', 'CERT_TYPE_REQUIRED',
          `Category '${category}' requires a Caste Certificate Type (Central or State)`)]
      }

      if (!needsCert && certType && certType !== 'N/A') {
        return [issue('certificateType', 'warn', 'CERT_TYPE_UNEXPECTED',
          `Category '${category}' does not require a caste certificate — set to N/A`)]
      }

      return []
    },
  },

  // ── Rule 4: Class 12 must have a stream (weight 0.10) ──────────────────
  {
    id: 'class12_stream_required',
    description: 'Class 12 candidates must specify a stream',
    weight: 0.10,
    evaluate(inputs) {
      const classLevel = inputs['classLevel']?.trim()
      const stream = inputs['stream']?.trim()
      if (classLevel !== '12') return []
      if (!stream || stream === 'N/A') {
        return [issue('stream', 'error', 'STREAM_REQUIRED', 'Stream is required for Class 12 candidates')]
      }
      return []
    },
  },

  // ── Rule 5: Photo and signature declarations (weight 0.10) ─────────────
  {
    id: 'photo_signature_confirmed',
    description: 'Photo must be uploaded and signature must be confirmed',
    weight: 0.10,
    evaluate(inputs) {
      const issues: DocIssue[] = []
      if (inputs['photoUploaded']?.trim() !== 'yes') {
        issues.push(issue('photoUploaded', 'error', 'PHOTO_NOT_UPLOADED',
          'Candidate photo must be uploaded before submission'))
      }
      if (inputs['signatureConfirmed']?.trim() !== 'yes') {
        issues.push(issue('signatureConfirmed', 'error', 'SIGNATURE_NOT_CONFIRMED',
          'Candidate signature must be confirmed before submission'))
      }
      return issues
    },
  },

  // ── Rule 6: Roll number and school code format (weight 0.10) ───────────
  {
    id: 'id_formats',
    description: 'Roll number must be 7 digits; school code and exam centre code must be 5 digits',
    weight: 0.10,
    evaluate(inputs) {
      const issues: DocIssue[] = []
      const roll = inputs['rollNumber']?.trim()
      if (roll && !/^\d{7}$/.test(roll)) {
        issues.push(issue('rollNumber', 'error', 'ROLL_NUMBER_FORMAT', 'Roll Number must be exactly 7 digits'))
      }
      const school = inputs['schoolCode']?.trim()
      if (school && !/^\d{5}$/.test(school)) {
        issues.push(issue('schoolCode', 'error', 'SCHOOL_CODE_FORMAT', 'School Code must be exactly 5 digits'))
      }
      const centre = inputs['examCentreCode']?.trim()
      if (centre && !/^\d{5}$/.test(centre)) {
        issues.push(issue('examCentreCode', 'error', 'CENTRE_CODE_FORMAT', 'Exam Centre Code must be exactly 5 digits'))
      }
      return issues
    },
  },

  // ── Rule 7: Subject codes format (weight 0.05) ─────────────────────────
  {
    id: 'subject_codes_format',
    description: 'Subjects must be 5–6 comma-separated 3-digit codes',
    weight: 0.05,
    evaluate(inputs) {
      const raw = inputs['subjects']?.trim()
      if (!raw) return []
      const codes = raw.split(',').map(s => s.trim())
      if (codes.length < 5 || codes.length > 6) {
        return [issue('subjects', 'error', 'SUBJECT_COUNT_INVALID',
          `Expected 5–6 subject codes, got ${codes.length}`)]
      }
      const badCodes = codes.filter(c => !/^\d{3}$/.test(c))
      if (badCodes.length > 0) {
        return [issue('subjects', 'error', 'SUBJECT_CODE_FORMAT',
          `Subject codes must be 3-digit numbers. Invalid: ${badCodes.join(', ')}`)]
      }
      return []
    },
  },
]

// ── Template registry ─────────────────────────────────────────────────────

export const templates: Record<DocType, DocTemplate> = {
  exam_form_cbse_v1: {
    id: 'exam_form_cbse_v1',
    version: 1,
    docType: 'exam_form_cbse_v1',
    fieldsManifest: CBSE_FIELDS,
    rules: CBSE_RULES,
    lastVerifiedAt: '2025-04-01T00:00:00.000Z',
  },

  resume_simple_v1: {
    id: 'resume_simple_v1',
    version: 1,
    docType: 'resume_simple_v1',
    fieldsManifest: [
      { id: 'fullName',   label: 'Full Name',   type: 'text', required: true,  minLength: 2, maxLength: 100 },
      { id: 'email',      label: 'Email',        type: 'text', required: true,  pattern: '^[^@]+@[^@]+\\.[^@]+$' },
      { id: 'phone',      label: 'Phone',        type: 'text', required: false, pattern: '^[0-9+\\-\\s]{7,15}$' },
      { id: 'summary',    label: 'Summary',      type: 'text', required: false, maxLength: 500 },
      { id: 'experience', label: 'Experience',   type: 'text', required: true,  minLength: 10 },
      { id: 'education',  label: 'Education',    type: 'text', required: true,  minLength: 10 },
    ],
    rules: [
      {
        id: 'required_fields',
        description: 'All required fields must be non-empty',
        weight: 0.50,
        evaluate(inputs) {
          const manifest: DocField[] = templates.resume_simple_v1.fieldsManifest
          return manifest
            .filter(f => f.required && !inputs[f.id]?.trim())
            .map(f => issue(f.id, 'error', 'REQUIRED_MISSING', `${f.label} is required`))
        },
      },
      {
        id: 'email_format',
        description: 'Email must be a valid address',
        weight: 0.30,
        evaluate(inputs) {
          const email = inputs['email']?.trim()
          if (!email) return []
          if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
            return [issue('email', 'error', 'EMAIL_FORMAT_INVALID', 'Email address is not valid')]
          }
          return []
        },
      },
      {
        id: 'content_length',
        description: 'Experience and education must have meaningful content',
        weight: 0.20,
        evaluate(inputs) {
          const issues: DocIssue[] = []
          if ((inputs['experience']?.trim().length ?? 0) < 10) {
            issues.push(issue('experience', 'warn', 'CONTENT_TOO_SHORT', 'Experience section is too brief'))
          }
          if ((inputs['education']?.trim().length ?? 0) < 10) {
            issues.push(issue('education', 'warn', 'CONTENT_TOO_SHORT', 'Education section is too brief'))
          }
          return issues
        },
      },
    ],
    lastVerifiedAt: '2025-04-01T00:00:00.000Z',
  },
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Returns the template for the given docType.
 * Throws ValidationError (non-retryable) if the docType is not registered.
 */
export function getTemplate(docType: DocType): DocTemplate {
  const template = templates[docType]
  if (!template) {
    throw new ValidationError(`No template registered for docType '${docType}'`)
  }
  return template
}
