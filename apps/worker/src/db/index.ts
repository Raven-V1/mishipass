/**
 * MishiPass D1 access layer — barrel export.
 *
 * D1 enforces foreign keys by default. Runtime PRAGMA foreign_keys is not
 * required. Future table-rebuild migrations may use PRAGMA defer_foreign_keys
 * only when needed.
 */

// Types
export type {
  CatInsert,
  CatMode,
  CatPublicView,
  ContactMode,
  ContactSettingsPublicView,
  ContactSettingsUpsert,
  MedicationEntry,
  MedicationInsert,
  MissingAlertPublicView,
  MissingAlertUpsert,
  OwnerInsert,
  RecoveryBoardEntry,
  SessionInsert,
  SightingReportInsert,
  SightingReportOwnerView,
  VaccineEntry,
  VaccineInsert,
  VetSessionInsert,
  VetSessionStatus,
  VetVisitEntry,
  VetVisitInsert,
} from "./types.js";

// Owners
export { findOwnerByEmail, insertOwner } from "./repositories/owners.js";

// Sessions
export {
  deleteSession,
  findSessionByTokenHash,
  insertSession,
} from "./repositories/sessions.js";

// Cats
export {
  getCatPublicProfile,
  insertCat,
  listCatsForOwner,
  updateCatMode,
  updateCatPhoto,
} from "./repositories/cats.js";

// Contact settings
export {
  getContactSettingsForOwner,
  getContactSettingsPublic,
  upsertContactSettings,
} from "./repositories/contactSettings.js";

// Missing alerts
export {
  getMissingAlertForOwner,
  getMissingAlertPublic,
  listRecoveryBoardAlerts,
  upsertMissingAlert,
} from "./repositories/missingAlerts.js";

// Sighting reports
export {
  insertSightingReport,
  listSightingReportsForOwner,
} from "./repositories/sightingReports.js";

// Vet sessions
export {
  findLatestVetSession,
  finishVetSession,
  insertVetSession,
} from "./repositories/vetSessions.js";

// Cartilla
export {
  insertMedication,
  insertVaccine,
  insertVetVisit,
  listMedications,
  listVaccines,
  listVetVisits,
} from "./repositories/cartilla.js";
