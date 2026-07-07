/**
 * Transfer requests route handler unit tests.
 *
 * Tests the mitigation for stored HTML injection in transfer-request notification emails.
 * Verifies that user-controlled content (message, cat name, email) is properly escaped
 * before being embedded in HTML email templates.
 *
 * Security focus: Ensures escapeHtml is applied to all user-controlled data in email templates
 * to prevent HTML injection attacks in notification emails.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  handleRequestTransfer,
  handleAcceptTransfer,
  handleDeclineTransfer,
} from "../transferRequests.js";
import type { RequestContext } from "../../middleware/session.js";

// -- Mocks ------------------------------------------------------------------

const mockGetCatPublicProfile = vi.fn();
const mockHasPendingTransferRequest = vi.fn();
const mockInsertTransferRequest = vi.fn();
const mockFindOwnerById = vi.fn();
const mockGetTransferRequest = vi.fn();
const mockTransferCatOwnership = vi.fn();
const mockResolveTransferRequest = vi.fn();

vi.mock("../../db/index.js", () => ({
  getCatPublicProfile: (...args: unknown[]) => mockGetCatPublicProfile(...args),
  hasPendingTransferRequest: (...args: unknown[]) => mockHasPendingTransferRequest(...args),
  insertTransferRequest: (...args: unknown[]) => mockInsertTransferRequest(...args),
  findOwnerById: (...args: unknown[]) => mockFindOwnerById(...args),
  getTransferRequest: (...args: unknown[]) => mockGetTransferRequest(...args),
  transferCatOwnership: (...args: unknown[]) => mockTransferCatOwnership(...args),
  resolveTransferRequest: (...args: unknown[]) => mockResolveTransferRequest(...args),
  getTransferRequestsForOwner: vi.fn().mockResolvedValue([]),
}));

const mockSendEmail = vi.fn();
vi.mock("../../utils/email.js", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

const fakeDb = {
  prepare: vi.fn().mockReturnValue({
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue({ owner_id: 2 }),
  }),
} as unknown as D1Database;

const PUBLIC_BASE_URL = "https://mishipass.example.com";
const RESEND_API_KEY = "re_test_key";

function jsonRequest(body: unknown, catId = "MP-MX-0000-0001"): Request {
  return new Request(`https://example.com/api/cats/${catId}/request-transfer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockGetCatPublicProfile.mockReset();
  mockHasPendingTransferRequest.mockReset();
  mockInsertTransferRequest.mockReset();
  mockFindOwnerById.mockReset();
  mockSendEmail.mockReset();
  mockGetTransferRequest.mockReset();
  mockTransferCatOwnership.mockReset();
  mockResolveTransferRequest.mockReset();
  
  // Reset the DB mock
  (fakeDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue({
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue({ owner_id: 2 }),
  });
});

// ---------------------------------------------------------------------------
// POST /api/cats/:catId/request-transfer
// ---------------------------------------------------------------------------

describe("handleRequestTransfer - HTML injection mitigation", () => {
  const requester: RequestContext = { ownerId: 1 };
  const unauthed: RequestContext = { ownerId: null };

  it("returns 401 when not authenticated", async () => {
    const res = await handleRequestTransfer(
      jsonRequest({ message: "I want to adopt" }),
      "MP-MX-0000-0001",
      fakeDb,
      unauthed,
      RESEND_API_KEY,
      PUBLIC_BASE_URL,
    );
    expect(res.status).toBe(401);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 404 when cat does not exist", async () => {
    mockGetCatPublicProfile.mockResolvedValue(null);
    const res = await handleRequestTransfer(
      jsonRequest({ message: "I want to adopt" }),
      "MP-MX-0000-0001",
      fakeDb,
      requester,
      RESEND_API_KEY,
      PUBLIC_BASE_URL,
    );
    expect(res.status).toBe(404);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 404 when cat is not in adoption mode", async () => {
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: "MP-MX-0000-0001",
      name: "Luna",
      current_mode: "normal",
      country_code: "MX",
      photo_r2_key: null,
    });
    const res = await handleRequestTransfer(
      jsonRequest({ message: "I want to adopt" }),
      "MP-MX-0000-0001",
      fakeDb,
      requester,
      RESEND_API_KEY,
      PUBLIC_BASE_URL,
    );
    expect(res.status).toBe(404);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 400 when requester owns the cat", async () => {
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: "MP-MX-0000-0001",
      name: "Luna",
      current_mode: "adoption",
      country_code: "MX",
      photo_r2_key: null,
    });
    (fakeDb.prepare as ReturnType<typeof vi.fn>).mockReturnValue({
      bind: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue({ owner_id: 1 }), // Same as requester
    });
    const res = await handleRequestTransfer(
      jsonRequest({ message: "I want to adopt" }),
      "MP-MX-0000-0001",
      fakeDb,
      requester,
      RESEND_API_KEY,
      PUBLIC_BASE_URL,
    );
    expect(res.status).toBe(400);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 409 when there is already a pending request", async () => {
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: "MP-MX-0000-0001",
      name: "Luna",
      current_mode: "adoption",
      country_code: "MX",
      photo_r2_key: null,
    });
    mockHasPendingTransferRequest.mockResolvedValue(true);
    const res = await handleRequestTransfer(
      jsonRequest({ message: "I want to adopt" }),
      "MP-MX-0000-0001",
      fakeDb,
      requester,
      RESEND_API_KEY,
      PUBLIC_BASE_URL,
    );
    expect(res.status).toBe(409);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("escapes HTML in message field when sending email", async () => {
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: "MP-MX-0000-0001",
      name: "Luna",
      current_mode: "adoption",
      country_code: "MX",
      photo_r2_key: null,
    });
    mockHasPendingTransferRequest.mockResolvedValue(false);
    mockInsertTransferRequest.mockResolvedValue(123);
    mockFindOwnerById.mockImplementation((db: unknown, ownerId: number) => {
      if (ownerId === 1) return Promise.resolve({ id: 1, email: "requester@example.com" });
      if (ownerId === 2) return Promise.resolve({ id: 2, email: "owner@example.com" });
      return Promise.resolve(null);
    });

    const maliciousMessage = '<script>alert("XSS")</script><img src=x onerror=alert(1)>';
    const res = await handleRequestTransfer(
      jsonRequest({ message: maliciousMessage }),
      "MP-MX-0000-0001",
      fakeDb,
      requester,
      RESEND_API_KEY,
      PUBLIC_BASE_URL,
    );

    expect(res.status).toBe(201);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    
    const emailPayload = mockSendEmail.mock.calls[0][0];
    expect(emailPayload.html).toContain("&lt;script&gt;");
    expect(emailPayload.html).toContain("&lt;/script&gt;");
    expect(emailPayload.html).toContain("&lt;img");
    expect(emailPayload.html).not.toContain("<script>");
    expect(emailPayload.html).not.toContain("<img src=x");
  });

  it("escapes HTML in cat name when sending email", async () => {
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: "MP-MX-0000-0001",
      name: '<b>Evil</b><script>alert("cat")</script>',
      current_mode: "adoption",
      country_code: "MX",
      photo_r2_key: null,
    });
    mockHasPendingTransferRequest.mockResolvedValue(false);
    mockInsertTransferRequest.mockResolvedValue(123);
    mockFindOwnerById.mockImplementation((db: unknown, ownerId: number) => {
      if (ownerId === 1) return Promise.resolve({ id: 1, email: "requester@example.com" });
      if (ownerId === 2) return Promise.resolve({ id: 2, email: "owner@example.com" });
      return Promise.resolve(null);
    });

    const res = await handleRequestTransfer(
      jsonRequest({ message: "I want to adopt this cat" }),
      "MP-MX-0000-0001",
      fakeDb,
      requester,
      RESEND_API_KEY,
      PUBLIC_BASE_URL,
    );

    expect(res.status).toBe(201);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    
    const emailPayload = mockSendEmail.mock.calls[0][0];
    expect(emailPayload.html).toContain("&lt;b&gt;Evil&lt;/b&gt;");
    expect(emailPayload.html).toContain("&lt;script&gt;");
    expect(emailPayload.html).not.toContain("<b>Evil</b>");
    expect(emailPayload.html).not.toContain('<script>alert("cat")</script>');
  });

  it("escapes HTML in requester email when sending email", async () => {
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: "MP-MX-0000-0001",
      name: "Luna",
      current_mode: "adoption",
      country_code: "MX",
      photo_r2_key: null,
    });
    mockHasPendingTransferRequest.mockResolvedValue(false);
    mockInsertTransferRequest.mockResolvedValue(123);
    mockFindOwnerById.mockImplementation((db: unknown, ownerId: number) => {
      if (ownerId === 1) return Promise.resolve({ id: 1, email: '<a href="evil.com">click</a>' });
      if (ownerId === 2) return Promise.resolve({ id: 2, email: "owner@example.com" });
      return Promise.resolve(null);
    });

    const res = await handleRequestTransfer(
      jsonRequest({ message: "I want to adopt" }),
      "MP-MX-0000-0001",
      fakeDb,
      requester,
      RESEND_API_KEY,
      PUBLIC_BASE_URL,
    );

    expect(res.status).toBe(201);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    
    const emailPayload = mockSendEmail.mock.calls[0][0];
    expect(emailPayload.html).toContain("&lt;a href=");
    expect(emailPayload.html).toContain("&gt;click&lt;/a&gt;");
    expect(emailPayload.html).not.toContain('<a href="evil.com">');
  });

  it("handles message with special HTML characters", async () => {
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: "MP-MX-0000-0001",
      name: "Luna",
      current_mode: "adoption",
      country_code: "MX",
      photo_r2_key: null,
    });
    mockHasPendingTransferRequest.mockResolvedValue(false);
    mockInsertTransferRequest.mockResolvedValue(123);
    mockFindOwnerById.mockImplementation((db: unknown, ownerId: number) => {
      if (ownerId === 1) return Promise.resolve({ id: 1, email: "requester@example.com" });
      if (ownerId === 2) return Promise.resolve({ id: 2, email: "owner@example.com" });
      return Promise.resolve(null);
    });

    const messageWithSpecialChars = 'I love cats & dogs! <3 "Best" \'pets\' > all';
    const res = await handleRequestTransfer(
      jsonRequest({ message: messageWithSpecialChars }),
      "MP-MX-0000-0001",
      fakeDb,
      requester,
      RESEND_API_KEY,
      PUBLIC_BASE_URL,
    );

    expect(res.status).toBe(201);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    
    const emailPayload = mockSendEmail.mock.calls[0][0];
    expect(emailPayload.html).toContain("&amp;");
    expect(emailPayload.html).toContain("&lt;3");
    expect(emailPayload.html).toContain("&quot;Best&quot;");
    expect(emailPayload.html).toContain("&#39;pets&#39;");
    expect(emailPayload.html).toContain("&gt; all");
  });

  it("successfully creates transfer request without message", async () => {
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: "MP-MX-0000-0001",
      name: "Luna",
      current_mode: "adoption",
      country_code: "MX",
      photo_r2_key: null,
    });
    mockHasPendingTransferRequest.mockResolvedValue(false);
    mockInsertTransferRequest.mockResolvedValue(123);
    mockFindOwnerById.mockImplementation((db: unknown, ownerId: number) => {
      if (ownerId === 1) return Promise.resolve({ id: 1, email: "requester@example.com" });
      if (ownerId === 2) return Promise.resolve({ id: 2, email: "owner@example.com" });
      return Promise.resolve(null);
    });

    const res = await handleRequestTransfer(
      jsonRequest({}),
      "MP-MX-0000-0001",
      fakeDb,
      requester,
      RESEND_API_KEY,
      PUBLIC_BASE_URL,
    );

    expect(res.status).toBe(201);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    
    const emailPayload = mockSendEmail.mock.calls[0][0];
    // Should not contain message section when no message provided
    expect(emailPayload.html).not.toContain("Their message:");
  });

  it("trims and limits message to 500 characters", async () => {
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: "MP-MX-0000-0001",
      name: "Luna",
      current_mode: "adoption",
      country_code: "MX",
      photo_r2_key: null,
    });
    mockHasPendingTransferRequest.mockResolvedValue(false);
    mockInsertTransferRequest.mockResolvedValue(123);
    mockFindOwnerById.mockImplementation((db: unknown, ownerId: number) => {
      if (ownerId === 1) return Promise.resolve({ id: 1, email: "requester@example.com" });
      if (ownerId === 2) return Promise.resolve({ id: 2, email: "owner@example.com" });
      return Promise.resolve(null);
    });

    const longMessage = "A".repeat(600);
    const res = await handleRequestTransfer(
      jsonRequest({ message: `  ${longMessage}  ` }),
      "MP-MX-0000-0001",
      fakeDb,
      requester,
      RESEND_API_KEY,
      PUBLIC_BASE_URL,
    );

    expect(res.status).toBe(201);
    expect(mockInsertTransferRequest).toHaveBeenCalledWith(
      fakeDb,
      "MP-MX-0000-0001",
      1,
      2,
      "A".repeat(500), // Trimmed and limited to 500
    );
  });
});

// ---------------------------------------------------------------------------
// POST /api/transfer-requests/:id/accept
// ---------------------------------------------------------------------------

describe("handleAcceptTransfer - HTML injection mitigation", () => {
  const owner: RequestContext = { ownerId: 2 };

  it("escapes HTML in cat name when sending acceptance email", async () => {
    mockGetTransferRequest.mockResolvedValue({
      id: 123,
      cat_public_id: "MP-MX-0000-0001",
      requester_owner_id: 1,
      current_owner_id: 2,
      message: "I want to adopt",
      status: "pending",
    });
    mockTransferCatOwnership.mockResolvedValue(true);
    mockResolveTransferRequest.mockResolvedValue(undefined);
    mockFindOwnerById.mockResolvedValue({ id: 1, email: "requester@example.com" });
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: "MP-MX-0000-0001",
      name: '<iframe src="evil.com"></iframe>Fluffy',
      current_mode: "adoption",
      country_code: "MX",
      photo_r2_key: null,
    });

    const res = await handleAcceptTransfer(
      123,
      fakeDb,
      owner,
      RESEND_API_KEY,
      PUBLIC_BASE_URL,
    );

    expect(res.status).toBe(200);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    
    const emailPayload = mockSendEmail.mock.calls[0][0];
    expect(emailPayload.html).toContain("&lt;iframe");
    expect(emailPayload.html).toContain("&lt;/iframe&gt;");
    expect(emailPayload.html).not.toContain("<iframe");
  });

  it("handles null cat name gracefully", async () => {
    mockGetTransferRequest.mockResolvedValue({
      id: 123,
      cat_public_id: "MP-MX-0000-0001",
      requester_owner_id: 1,
      current_owner_id: 2,
      message: "I want to adopt",
      status: "pending",
    });
    mockTransferCatOwnership.mockResolvedValue(true);
    mockResolveTransferRequest.mockResolvedValue(undefined);
    mockFindOwnerById.mockResolvedValue({ id: 1, email: "requester@example.com" });
    mockGetCatPublicProfile.mockResolvedValue(null);

    const res = await handleAcceptTransfer(
      123,
      fakeDb,
      owner,
      RESEND_API_KEY,
      PUBLIC_BASE_URL,
    );

    expect(res.status).toBe(200);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    
    const emailPayload = mockSendEmail.mock.calls[0][0];
    expect(emailPayload.html).toContain("the cat");
  });
});

// ---------------------------------------------------------------------------
// POST /api/transfer-requests/:id/decline
// ---------------------------------------------------------------------------

describe("handleDeclineTransfer - HTML injection mitigation", () => {
  const owner: RequestContext = { ownerId: 2 };

  it("escapes HTML in cat name when sending decline email", async () => {
    mockGetTransferRequest.mockResolvedValue({
      id: 123,
      cat_public_id: "MP-MX-0000-0001",
      requester_owner_id: 1,
      current_owner_id: 2,
      message: "I want to adopt",
      status: "pending",
    });
    mockResolveTransferRequest.mockResolvedValue(undefined);
    mockFindOwnerById.mockResolvedValue({ id: 1, email: "requester@example.com" });
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: "MP-MX-0000-0001",
      name: '<style>body{display:none}</style>Shadow',
      current_mode: "adoption",
      country_code: "MX",
      photo_r2_key: null,
    });

    const res = await handleDeclineTransfer(
      123,
      fakeDb,
      owner,
      RESEND_API_KEY,
    );

    expect(res.status).toBe(200);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    
    const emailPayload = mockSendEmail.mock.calls[0][0];
    expect(emailPayload.html).toContain("&lt;style&gt;");
    expect(emailPayload.html).toContain("&lt;/style&gt;");
    expect(emailPayload.html).not.toContain("<style>");
  });

  it("returns 404 when transfer request does not exist", async () => {
    mockGetTransferRequest.mockResolvedValue(null);

    const res = await handleDeclineTransfer(
      999,
      fakeDb,
      owner,
      RESEND_API_KEY,
    );

    expect(res.status).toBe(404);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
