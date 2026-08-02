import type { VaultType } from '@vaultx/shared';

export type FieldKind = 'text' | 'password' | 'textarea' | 'date' | 'select' | 'mood' | 'number';

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  options?: string[];
  placeholder?: string;
  secret?: boolean;
  span?: boolean;
}

export interface ItemTypeDef {
  type: VaultType;
  fields: FieldDef[];
  supportsNote: boolean;
  supportsTags: boolean;
}

export const ITEM_TYPE_DEFS: Record<VaultType, ItemTypeDef> = {
  login: {
    type: 'login',
    fields: [
      { key: 'website', label: 'Website', kind: 'text', placeholder: 'https://example.com' },
      { key: 'username', label: 'Username', kind: 'text' },
      { key: 'email', label: 'Email', kind: 'text', placeholder: 'you@example.com' },
      { key: 'password', label: 'Password', kind: 'password', secret: true },
      { key: 'otp', label: '2FA Secret / OTP', kind: 'password', secret: true },
    ],
    supportsNote: true,
    supportsTags: true,
  },
  password: {
    type: 'password',
    fields: [
      { key: 'url', label: 'URL', kind: 'text', placeholder: 'https://example.com' },
      { key: 'username', label: 'Username', kind: 'text' },
      { key: 'email', label: 'Email', kind: 'text', placeholder: 'you@example.com' },
      { key: 'password', label: 'Password', kind: 'password', secret: true },
    ],
    supportsNote: true,
    supportsTags: true,
  },
  note: {
    type: 'note',
    fields: [{ key: 'content', label: 'Content', kind: 'textarea', span: true, placeholder: 'Write anything… (markdown supported)' }],
    supportsNote: false,
    supportsTags: true,
  },
  card: {
    type: 'card',
    fields: [
      { key: 'cardType', label: 'Card type', kind: 'select', options: ['Visa', 'Mastercard', 'American Express', 'RuPay', 'Discover', 'Other'] },
      { key: 'cardholder', label: 'Cardholder name', kind: 'text' },
      { key: 'number', label: 'Card number', kind: 'password', secret: true },
      { key: 'expiry', label: 'Expiry (MM/YY)', kind: 'text', placeholder: '12/28' },
      { key: 'cvv', label: 'CVV', kind: 'password', secret: true },
      { key: 'bank', label: 'Bank / issuer', kind: 'text' },
    ],
    supportsNote: true,
    supportsTags: true,
  },
  identity: {
    type: 'identity',
    fields: [
      {
        key: 'identityType',
        label: 'Document type',
        kind: 'select',
        options: ['Passport', "Driver's license", 'PAN', 'Aadhaar', 'Insurance', 'Medical card', 'Employee ID', 'Student ID', 'Voter ID', 'Other'],
      },
      { key: 'fullName', label: 'Full name', kind: 'text' },
      { key: 'number', label: 'Document number', kind: 'password', secret: true },
      { key: 'dob', label: 'Date of birth', kind: 'date' },
      { key: 'issueDate', label: 'Issue date', kind: 'date' },
      { key: 'expiry', label: 'Expiry date', kind: 'date' },
      { key: 'issuingCountry', label: 'Issuing country', kind: 'text' },
    ],
    supportsNote: true,
    supportsTags: true,
  },
  apiKey: {
    type: 'apiKey',
    fields: [
      { key: 'service', label: 'Service', kind: 'text', placeholder: 'OpenAI, GitHub, AWS…' },
      { key: 'key', label: 'API Key', kind: 'password', secret: true },
      { key: 'secret', label: 'Secret', kind: 'password', secret: true },
      { key: 'expiry', label: 'Expires', kind: 'date' },
      { key: 'scopes', label: 'Scopes / permissions', kind: 'text', placeholder: 'read, write' },
    ],
    supportsNote: true,
    supportsTags: true,
  },
  secret: {
    type: 'secret',
    fields: [
      {
        key: 'kind',
        label: 'Kind',
        kind: 'select',
        options: ['Recovery codes', 'License key', 'SSH key', 'Private key', 'Certificate', 'Recovery seed', 'Other'],
      },
      { key: 'value', label: 'Secret value', kind: 'textarea', secret: true, span: true },
    ],
    supportsNote: true,
    supportsTags: true,
  },
  journal: {
    type: 'journal',
    fields: [
      { key: 'date', label: 'Date', kind: 'date' },
      { key: 'mood', label: 'Mood', kind: 'mood' },
      { key: 'content', label: 'Entry', kind: 'textarea', span: true },
    ],
    supportsNote: false,
    supportsTags: false,
  },
  address: {
    type: 'address',
    fields: [
      { key: 'label', label: 'Label', kind: 'text', placeholder: 'Home, Office…' },
      { key: 'line1', label: 'Address line 1', kind: 'text', span: true },
      { key: 'line2', label: 'Address line 2', kind: 'text', span: true },
      { key: 'city', label: 'City', kind: 'text' },
      { key: 'state', label: 'State / Province', kind: 'text' },
      { key: 'postal', label: 'Postal code', kind: 'text' },
      { key: 'country', label: 'Country', kind: 'text' },
    ],
    supportsNote: true,
    supportsTags: true,
  },
  contact: {
    type: 'contact',
    fields: [
      { key: 'relationship', label: 'Relationship', kind: 'select', options: ['Family', 'Friend', 'Doctor', 'Work', 'Emergency', 'Other'] },
      { key: 'phone', label: 'Phone', kind: 'text' },
      { key: 'email', label: 'Email', kind: 'text' },
      { key: 'address', label: 'Address', kind: 'textarea' },
    ],
    supportsNote: true,
    supportsTags: true,
  },
};

export const MOODS = ['😄', '🙂', '😐', '😕', '😢', '🤩', '😴', '😤'] as const;

export const IDENTITY_LABELS: Record<string, string> = {
  Passport: '🛂',
  "Driver's license": '🚗',
  PAN: '🪪',
  Aadhaar: '🆔',
  Insurance: '🛡️',
  'Medical card': '💊',
  'Employee ID': '💼',
  'Student ID': '🎓',
  'Voter ID': '🗳️',
  Other: '📄',
};
