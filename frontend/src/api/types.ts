import type { components } from './schema'

/** nombres cortos para los tipos generados del backend */
type S = components['schemas']

export type TokenResponse = S['TokenResponse']
export type MembershipSummary = S['MembershipSummaryResponse']
export type Me = S['MeResponse']
export type Invitation = S['InvitationResponse']
export type Business = S['BusinessResponse']
export type BusinessHour = S['BusinessHourResponse']
export type Booth = S['BoothResponse']
export type Tax = S['TaxResponse']
export type Category = S['ServiceCategoryResponse']
export type Offering = S['OfferingResponse']
export type Client = S['ClientResponse']
export type Employee = S['UserResponse']
export type EmployeeSchedule = S['EmployeeScheduleResponse']
export type EmployeeAbsence = S['EmployeeAbsenceResponse']
export type ScheduleBlock = S['ScheduleBlockResponse']
export type Appointment = S['AppointmentResponse']
export type Availability = S['AvailabilityResponse']
export type AvailabilitySlot = S['AvailabilitySlotResponse']
export type Role = S['RoleResponse']

/** pagina de resultados: {content, page: {size, number, totalElements, totalPages}} */
export type Page<T> = { content?: T[]; page?: S['PageMetadata'] }

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
export type PaymentMethod = 'CASH' | 'CARD' | 'BIZUM' | 'OTHER'
