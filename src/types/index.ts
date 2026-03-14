// ── Supabase Types for MedSync ────────────────────────────────────────────

export type UserRole = 'doctor' | 'patient' | 'pharmacist' | 'admin';
export type RecordStatus = 'New' | 'In Progress' | 'Done';
export type RxStatus = 'Active' | 'Dispensed' | 'Expired' | 'Cancelled';
export type AllergySeverity = 'Mild' | 'Moderate' | 'Severe';
export type ConditionStatus = 'Active' | 'Resolved' | 'Chronic';
export type LabStatus = 'Pending' | 'Completed' | 'Abnormal';

export interface Profile {
    id: string;
    role: UserRole;
    full_name: string;
    email: string;
    phone?: string;
    created_at: string;
    updated_at: string;
}

export interface Doctor {
    id: string;
    profile_id: string;
    license_number: string;
    specialty: string;
    clinic_name?: string;
    is_verified: boolean;
    created_at: string;
    profile?: Profile;
}

export interface Pharmacist {
    id: string;
    profile_id: string;
    pharmacy_name: string;
    pharmacy_address?: string;
    license_number?: string;
    is_verified: boolean;
    created_at: string;
    profile?: Profile;
}

export interface Patient {
    id: string;
    profile_id?: string;
    trn: string;
    full_name: string;
    date_of_birth: string;
    sex?: string;
    blood_type?: string;
    phone?: string;
    email?: string;
    address?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    photo_url?: string;
    general_notes?: string;
    created_at: string;
    updated_at: string;
}

export interface Visit {
    id: string;
    patient_id: string;
    doctor_id?: string;
    doctor_name: string;
    clinic_name?: string;
    visit_date: string;
    status: RecordStatus;
    reason_for_visit?: string;
    symptoms?: string;
    symptom_duration?: string;
    blood_pressure?: string;
    heart_rate?: number;
    body_temp?: number;
    respiratory_rate?: number;
    height?: string;
    weight?: number;
    bmi?: number;
    spo2?: number;
    primary_diagnosis?: string;
    secondary_diagnosis?: string;
    diagnosis_notes?: string;
    doctor_notes?: string;
    created_at: string;
    updated_at: string;
}

export interface MedicalHistory {
    id: string;
    patient_id: string;
    condition: string;
    diagnosed_date?: string;
    status: ConditionStatus;
    notes?: string;
    recorded_by?: string;
    created_at: string;
}

export interface Allergy {
    id: string;
    patient_id: string;
    allergen: string;
    reaction?: string;
    severity: AllergySeverity;
    date_reported?: string;
    recorded_by?: string;
    created_at: string;
}

export interface CurrentMedication {
    id: string;
    patient_id: string;
    medication: string;
    dosage?: string;
    frequency?: string;
    prescribed_by?: string;
    start_date?: string;
    is_active: boolean;
    recorded_by?: string;
    created_at: string;
}

export interface Immunization {
    id: string;
    patient_id: string;
    vaccine: string;
    dose?: string;
    date_administered: string;
    batch_number?: string;
    provider?: string;
    recorded_by?: string;
    created_at: string;
}

export interface LabTest {
    id: string;
    patient_id: string;
    visit_id?: string;
    test_name: string;
    test_date?: string;
    laboratory?: string;
    result?: string;
    status: LabStatus;
    recorded_by?: string;
    created_at: string;
}

export interface Prescription {
    id: string;
    patient_id: string;
    visit_id?: string;
    doctor_id?: string;
    doctor_name: string;
    medication: string;
    dosage?: string;
    frequency?: string;
    instructions?: string;
    issue_date: string;
    expiry_date?: string;
    status: RxStatus;
    qr_code: string;
    dispensed_at?: string;
    dispensed_by?: string;
    created_at: string;
    updated_at: string;
}

export interface AuditLog {
    id: string;
    patient_id?: string;
    actor_id?: string;
    actor_name: string;
    actor_role: UserRole;
    action: string;
    details?: Record<string, unknown>;
    ip_address?: string;
    created_at: string;
}

// Patient with all related data (for doctor view)
export interface PatientFull extends Patient {
    medical_history?: MedicalHistory[];
    allergies?: Allergy[];
    current_medications?: CurrentMedication[];
    immunizations?: Immunization[];
    lab_tests?: LabTest[];
    prescriptions?: Prescription[];
    visits?: Visit[];
    audit_logs?: AuditLog[];
}
