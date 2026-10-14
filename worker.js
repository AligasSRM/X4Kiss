import { getXKissSettingsRuntimeStatus as getX4KissSettingsRuntimeStatus } from "./settings/xkiss-settings-runtime-core.js";
import {
  createVideoKey,
  isStorageReady,
  listVideos,
  storeVideo
} from "./storage/elasticlake-adapter.js";
import {
  MONETIZATION_RULES,
  CREATOR_ELIGIBILITY_RULES,
  evaluateCreatorEligibility,
  calculateRevenue,
  MONETIZATION_POLICY_RULES,
  evaluateMonetizationPolicy,
  CREATOR_ACTIVATION_RULES,
  evaluateCreatorActivation
} from "./monetization/monetization-rules.js";
import {
  isViewEventStoreReady,
  storeViewEvent,
  getViewEvent,
  deleteViewEvent
} from "./views-revenue/view-event-store.js";
import { evaluateViewPipeline } from "./views-revenue/view-pipeline.js";
import { evaluateViewCountDecision } from "./views-revenue/view-count-decision.js";
import { isWalletLedgerReady, storeWalletEntry, getWalletEntry } from "./wallet/wallet-ledger-store.js";
import { evaluateRevenueToWallet } from "./wallet/revenue-to-wallet.js";
import { evaluatePendingSettlement, WALLET_SETTLEMENT_RULES } from "./wallet/wallet-settlement.js";
import { evaluateWalletReversal } from "./wallet/wallet-reversals.js";
import { evaluatePayoutEligibility } from "./wallet/payout-eligibility.js";
import { createPayoutRequest, transitionPayoutStatus, PAYOUT_LIFECYCLE_RULES } from "./wallet/payout-lifecycle.js";
import { createPayoutAuditEvent, buildPayoutHistory, PAYOUT_AUDIT_RULES } from "./wallet/payout-audit.js";
import { evaluatePayoutAuthorization, PAYOUT_SECURITY_RULES } from "./wallet/payout-security.js";
import {
  VIEWS_REVENUE_RULES,
  validateViewEvent,
  evaluateViewCount,
  evaluateQualifiedView,
  evaluateTrafficQuality,
  validateRevenueEvent
} from "./views-revenue/views-revenue-rules.js";
import { runSafetySelfTest, getSafetyVerificationOverview } from "./safety/safety-integration.js";
import { getSafetyBackendStatus, runSafetyBackendSelfTest, recordSafetyBackendEvent } from "./safety/safety-backend.js";
import { verifyDiditWebhook, mapDiditVerificationState } from "./safety/didit-kyc-provider.js";
import { verifyVeriffWebhook, mapVeriffVerificationState } from "./safety/veriff-kyc-provider.js";
import { createVeriffSession } from "./safety/veriff-session-provider.js";
import { registerMember, loginMember, authenticateSession, logoutMember, reauthenticateMemberSession, AUTH_SECURITY_INVARIANTS } from "./security/x4kiss-auth-backend.js";
import { beginSuperAdminMfaEnrollment, verifyAndEnableSuperAdminMfa, verifySuperAdminMfaForSession } from "./security/super-admin-mfa.js";
import { adminBackendStatus, authorizeAdminAction, ADMIN_BACKEND_SECURITY } from "./admin/x4kiss-admin-backend.js";
import { recordAdminSecurityAudit } from "./security/admin-security-audit.js";
import { isRecentSuperAdminMfa } from "./security/admin-mfa-authorization.js";
import { settingsBackendStatus, validateSettingsBackendAction, SETTINGS_BACKEND_SECURITY } from "./settings/x4kiss-settings-backend.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://aligassrm.github.io",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-X4Kiss-Upload-Key, X-X4Kiss-File-Name, X-X4Kiss-File-Size, X-X4Kiss-Title, X-X4Kiss-Description, X-X4Kiss-Category, X-X4Kiss-Download-Policy, X-X4Kiss-Visibility",
  "Vary": "Origin"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      ...CORS_HEADERS
    }
  });
}

async function ensureCreatorVideoIndex(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS creator_videos (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      storage_key TEXT NOT NULL UNIQUE,
      file_name TEXT NOT NULL,
      content_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'private',
      download_policy TEXT NOT NULL DEFAULT 'disabled',
      status TEXT NOT NULL DEFAULT 'uploading',
      storage TEXT NOT NULL DEFAULT 'ElasticLake',
      created_at TEXT NOT NULL
    )
  `).run();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const storageReady = isStorageReady(env);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      });
    }

    if (url.pathname === "/api/auth/security" && request.method === "GET") {
      return json({ ok: true, service: "X4Kiss Authentication Security", invariants: AUTH_SECURITY_INVARIANTS });
    }

    if (url.pathname === "/api/auth/register" && request.method === "POST") {
      if (!env.X4KISS_AUTH_DB) return json({ ok: false, status: "backend_not_configured" }, 503);
      let body;
      try { body = await request.json(); } catch { return json({ ok: false, status: "invalid_input" }, 400); }
      const result = await registerMember(env, body);
      const statusCode = result.ok ? 201 : result.status === "already_exists" ? 409 : result.status === "invalid_input" ? 400 : 500;
      return json(result, statusCode);
    }

    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      if (!env.X4KISS_AUTH_DB) return json({ ok: false, status: "backend_not_configured" }, 503);
      let body;
      try { body = await request.json(); } catch { return json({ ok: false, status: "invalid_credentials" }, 401); }
      const result = await loginMember(env, body);
      return json(result, result.ok ? 200 : 401);
    }

    if (url.pathname === "/api/auth/me" && request.method === "GET") {
      if (!env.X4KISS_AUTH_DB) return json({ ok: false, status: "backend_not_configured" }, 503);
      const authorization = request.headers.get("Authorization") || "";
      const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
      const result = await authenticateSession(env, token);
      return json(result, result.ok ? 200 : 401);
    }

    if (url.pathname === "/api/auth/logout" && request.method === "POST") {
      if (!env.X4KISS_AUTH_DB) return json({ ok: false, status: "backend_not_configured" }, 503);
      const authorization = request.headers.get("Authorization") || "";
      const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
      return json(await logoutMember(env, token));
    }

    if (url.pathname === "/api/admin/backend/status" && request.method === "GET") {
      return json(adminBackendStatus(env));
    }

    if (url.pathname === "/api/admin/security/reauth" && request.method === "POST") {
      if (!env.X4KISS_AUTH_DB) return json({ok:false,status:"backend_not_configured"},503);
      let body; try { body=await request.json(); } catch { return json({ok:false,status:"invalid_input"},400); }
      const authorization=request.headers.get("Authorization")||"";
      const token=authorization.startsWith("Bearer ")?authorization.slice(7).trim():"";
      const result=await reauthenticateMemberSession(env,token,body.password);
      return json(result,result.ok?200:result.status==="unauthenticated"?401:403);
    }

    if (url.pathname === "/api/admin/security/mfa/enroll" && request.method === "POST") {
      if (!env.X4KISS_AUTH_DB) return json({ok:false,status:"backend_not_configured"},503);
      const authorization=request.headers.get("Authorization")||"";
      const token=authorization.startsWith("Bearer ")?authorization.slice(7).trim():"";
      const session=await authenticateSession(env,token);
      if(!session.ok) return json({ok:false,status:"unauthenticated"},401);
      const result=await beginSuperAdminMfaEnrollment(env,session.user,session);
      return json(result,result.ok?200:result.status==="forbidden"?403:result.status==="reauthentication_required"?428:503);
    }

    if (url.pathname === "/api/admin/security/mfa/enable" && request.method === "POST") {
      if (!env.X4KISS_AUTH_DB) return json({ok:false,status:"backend_not_configured"},503);
      let body; try { body=await request.json(); } catch { return json({ok:false,status:"invalid_input"},400); }
      const authorization=request.headers.get("Authorization")||"";
      const token=authorization.startsWith("Bearer ")?authorization.slice(7).trim():"";
      const session=await authenticateSession(env,token);
      if(!session.ok) return json({ok:false,status:"unauthenticated"},401);
      const result=await verifyAndEnableSuperAdminMfa(env,session.user,session,body.code);
      return json(result,result.ok?200:result.status==="forbidden"?403:result.status==="reauthentication_required"?428:401);
    }

    if (url.pathname === "/api/admin/security/mfa/verify" && request.method === "POST") {
      if (!env.X4KISS_AUTH_DB) return json({ok:false,status:"backend_not_configured"},503);
      let body; try { body=await request.json(); } catch { return json({ok:false,status:"invalid_input"},400); }
      const authorization=request.headers.get("Authorization")||"";
      const token=authorization.startsWith("Bearer ")?authorization.slice(7).trim():"";
      const session=await authenticateSession(env,token);
      if(!session.ok) return json({ok:false,status:"unauthenticated"},401);
      const result=await verifySuperAdminMfaForSession(env,session.user,session,body.code);
      return json(result,result.ok?200:result.status==="forbidden"?403:401);
    }

    if (url.pathname === "/api/admin/authorize" && request.method === "POST") {
      if (!env.X4KISS_AUTH_DB) {
        return json({ ok: false, allowed: false, status: "auth_backend_not_configured" }, 503);
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return json({ ok: false, allowed: false, status: "invalid_input" }, 400);
      }

      // Never trust identity or role fields supplied by the caller.
      const authorization = request.headers.get("Authorization") || "";
      const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
      const session = await authenticateSession(env, token);
      const requestId = request.headers.get("cf-ray") || request.headers.get("x-request-id") || null;

      if (!env.X4KISS_DB || !env.X4KISS_ADMIN_AUDIT) {
        return json({ ok: false, allowed: false, status: "admin_security_providers_not_configured" }, 503);
      }

      if (!session.ok) {
        const audit = await recordAdminSecurityAudit(env, {
          action: "admin_authorize",
          target: typeof body.permission === "string" ? body.permission : null,
          outcome: "denied",
          reason: "unauthenticated",
          requestId
        });
        if (!audit.ok) return json({ ok: false, allowed: false, status: "admin_audit_unavailable" }, 503);
        return json({ ok: false, allowed: false, status: "unauthenticated" }, 401);
      }

      // Super Admin actions require a successfully verified, recent MFA step.
      if (session.user.role === "super_admin") {
        if (!isRecentSuperAdminMfa(session.mfaVerifiedAt)) {
          const audit = await recordAdminSecurityAudit(env, {
            actorUserId: session.user.id,
            actorEmail: session.user.email,
            action: "admin_authorize",
            target: typeof body.permission === "string" ? body.permission : null,
            outcome: "denied",
            reason: "mfa_verification_required",
            requestId
          });
          if (!audit.ok) return json({ ok: false, allowed: false, status: "admin_audit_unavailable" }, 503);
          return json({ ok: false, allowed: false, status: "mfa_verification_required" }, 403);
        }
      }

      const result = authorizeAdminAction(session.user, body.permission);
      const audit = await recordAdminSecurityAudit(env, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: "admin_authorize",
        target: typeof body.permission === "string" ? body.permission : null,
        outcome: result.allowed ? "allowed" : "denied",
        reason: result.status,
        requestId
      });
      if (!audit.ok) {
        return json({ ok: false, allowed: false, status: "admin_audit_unavailable" }, 503);
      }
      return json(result, result.allowed ? 200 : 403);
    }

    if (url.pathname === "/api/admin/security" && request.method === "GET") {
      return json({ok:true,service:"X4Kiss Admin Security",security:ADMIN_BACKEND_SECURITY});
    }

    if (url.pathname === "/api/settings/backend/status" && request.method === "GET") {
      return json(settingsBackendStatus(env));
    }

    if (url.pathname === "/api/settings/backend/action" && request.method === "POST") {
      let body; try { body = await request.json(); } catch { return json({ok:false,status:"invalid_input"},400); }
      return json(validateSettingsBackendAction(body));
    }

    if (url.pathname === "/api/settings/backend/security" && request.method === "GET") {
      return json({ok:true,service:"X4Kiss Settings Backend Security",security:SETTINGS_BACKEND_SECURITY});
    }

    if (url.pathname === "/api/settings/status" && request.method === "GET") {
      return json(getX4KissSettingsRuntimeStatus());
    }

    if (url.pathname === "/api/health") {
      return json({
        service: "X4Kiss Worker",
        status: "online",
        storageReady,
        uploadEndpoint: true
      });
    }

    if (url.pathname === "/api/safety/status" && request.method === "GET") {
      return json(getSafetyVerificationOverview());
    }

    if (url.pathname === "/api/safety/self-test" && request.method === "GET") {
      return json(runSafetySelfTest());
    }

    if (url.pathname === "/api/verification/didit/webhook" && request.method === "POST") {
      const result = await verifyDiditWebhook(request, env);

      if (!result.ok) {
        return json({
          ok: false,
          service: "X4Kiss Didit KYC Webhook",
          status: result.status,
          reason: result.reason
        }, result.status === "provider_not_configured" ? 503 : 401);
      }

      const verificationState = mapDiditVerificationState(result.verificationStatus);

      const audit = await recordSafetyBackendEvent(env, {
        eventType: "didit_verification_status",
        provider: "didit",
        sessionId: result.sessionId,
        vendorData: result.vendorData,
        providerStatus: result.verificationStatus,
        verificationState
      });

      if (!audit.ok) {
        return json({
          ok: false,
          service: "X4Kiss Didit KYC Webhook",
          status: "storage-not-ready",
          reason: "Verified Didit event could not be durably recorded."
        }, 503);
      }

      return json({
        ok: true,
        service: "X4Kiss Didit KYC Webhook",
        provider: "didit",
        sessionId: result.sessionId,
        vendorData: result.vendorData,
        providerStatus: result.verificationStatus,
        verificationState,
        recorded: audit.recorded
      });
    }

    if (url.pathname === "/api/verification/veriff/session" && request.method === "POST") {
      let body = {};

      try {
        body = await request.json();
      } catch {
        return json({
          ok: false,
          service: "X4Kiss Veriff KYC Session",
          status: "invalid_input"
        }, 400);
      }

      let result;

      try {
        result = await createVeriffSession(env, {
          vendorData: body.vendorData,
          endUserId: body.endUserId,
          callback: body.callback
        });
      } catch (error) {
        return json({
          ok: false,
          service: "X4Kiss Veriff KYC Session",
          status: "provider_not_configured",
          reason: String(error?.message || error || "Veriff session creation failed.")
        }, 503);
      }

      if (!result.ok) {
        return json({
          ok: false,
          service: "X4Kiss Veriff KYC Session",
          status: result.status,
          providerHttpStatus: result.providerHttpStatus || null,
          providerStatus: result.providerStatus || null
        }, result.status === "invalid_vendor_data" || result.status === "invalid_end_user_id" ? 400 : 502);
      }

      return json({
        ok: true,
        service: "X4Kiss Veriff KYC Session",
        provider: "veriff",
        verificationId: result.verificationId,
        verificationUrl: result.verificationUrl,
        vendorData: result.vendorData,
        endUserId: result.endUserId,
        status: result.status
      });
    }

    if (url.pathname === "/api/verification/veriff/webhook" && request.method === "POST") {
      let result;

      try {
        result = await verifyVeriffWebhook(request, env);
      } catch (error) {
        return json({
          ok: false,
          service: "X4Kiss Veriff KYC Webhook",
          status: "provider_not_configured",
          reason: String(
            error?.message ||
            error ||
            "Veriff webhook verification failed."
          )
        }, 503);
      }

      if (!result.ok) {
        return json({
          ok: false,
          service: "X4Kiss Veriff KYC Webhook",
          status: result.error || "verification_failed"
        }, 401);
      }

      const verificationState = mapVeriffVerificationState(result.status);

      const audit = await recordSafetyBackendEvent(env, {
        eventType: "veriff_verification_status",
        provider: "veriff",
        sessionId: result.verificationId,
        vendorData: result.vendorData,
        providerStatus: result.status,
        verificationState
      });

      if (!audit.ok) {
        return json({
          ok: false,
          service: "X4Kiss Veriff KYC Webhook",
          status: "storage-not-ready",
          reason: "Verified Veriff event could not be durably recorded."
        }, 503);
      }

      return json({
        ok: true,
        service: "X4Kiss Veriff KYC Webhook",
        provider: "veriff",
        verificationId: result.verificationId,
        vendorData: result.vendorData,
        providerStatus: result.status,
        verificationState,
        recorded: audit.recorded
      });
    }

    if (url.pathname === "/api/safety/backend/status" && request.method === "GET") {
      return json(getSafetyBackendStatus(env));
    }

    if (url.pathname === "/api/safety/backend/self-test" && request.method === "GET") {
      return json(runSafetyBackendSelfTest(env));
    }

    if (url.pathname === "/api/views/storage/status" && request.method === "GET") {
      return json({
        ok: true,
        service: "X4Kiss Durable View Event Store",
        storageReady: isViewEventStoreReady(env),
        storage: "ElasticLake",
        message: isViewEventStoreReady(env)
          ? "ElasticLake durable view event storage is connected."
          : "ElasticLake durable view event storage is not connected yet."
      });
    }

    if (url.pathname === "/api/views/event/count-decision" && request.method === "POST") {
      let body;

      try {
        body = await request.json();
      } catch {
        return json({
          ok: false,
          message: "Invalid view count decision data."
        }, 400);
      }

      return json({
        ok: true,
        service: "X4Kiss View Count Decision Engine",
        result: await evaluateViewCountDecision(env, body)
      });
    }

    if (url.pathname === "/api/views/event/pipeline-check" && request.method === "POST") {
      let body;

      try {
        body = await request.json();
      } catch {
        return json({
          ok: false,
          message: "Invalid view pipeline data."
        }, 400);
      }

      return json({
        ok: true,
        service: "X4Kiss View Qualification Pipeline",
        result: evaluateViewPipeline(body)
      });
    }

    if (url.pathname === "/api/wallet/payout/status" && request.method === "GET") {
      return json({
        ok: true,
        service: "X4Kiss Payout Lifecycle",
        lifecycleReady: PAYOUT_LIFECYCLE_RULES.enabled,
        rulesVersion: PAYOUT_LIFECYCLE_RULES.version,
        status: PAYOUT_LIFECYCLE_RULES.status,
        payoutEnabled: false,
        message: PAYOUT_LIFECYCLE_RULES.enabled
          ? "Payout lifecycle rules are connected and ready. Real payouts remain disabled."
          : "Payout lifecycle rules are not ready."
      });
    }

    if (url.pathname === "/api/wallet/payout/security/status" && request.method === "GET") {
      return json({
        ok: true,
        service: "X4Kiss Payout Security",
        securityReady: PAYOUT_SECURITY_RULES.enabled,
        rulesVersion: PAYOUT_SECURITY_RULES.version,
        status: PAYOUT_SECURITY_RULES.status,
        payoutEnabled: false,
        clientCannotAuthorize: PAYOUT_SECURITY_RULES.clientCannotAuthorize,
        secretsServerSideOnly: PAYOUT_SECURITY_RULES.secretsServerSideOnly,
        message: PAYOUT_SECURITY_RULES.enabled
          ? "Payout security rules are connected and ready. Real payouts remain disabled."
          : "Payout security rules are not ready."
      });
    }

    if (url.pathname === "/api/wallet/payout/self-test" && request.method === "GET") {
      const requestResult = createPayoutRequest({
        creatorId: "production-payout-self-test-creator",
        payoutRequestId: "production-payout-self-test-request",
        amount: 10,
        availableBalance: 25,
        currency: "USD"
      });

      const transition = transitionPayoutStatus({
        currentStatus: "requested",
        nextStatus: "under_review"
      });

      const authorization = evaluatePayoutAuthorization({
        authenticated: true,
        creatorId: "production-payout-self-test-creator",
        requestCreatorId: "production-payout-self-test-creator",
        creatorVerified: true,
        payoutProfileReady: true,
        sensitiveAction: true,
        reauthenticated: true
      });

      const audit = createPayoutAuditEvent({
        payoutRequestId: "production-payout-self-test-request",
        creatorId: "production-payout-self-test-creator",
        eventType: "payout_requested",
        amount: 10,
        currency: "USD",
        referenceId: "production-payout-self-test-reference"
      });

      return json({
        ok: true,
        service: "X4Kiss Payout Lifecycle & Security",
        test: "request-transition-authorization-audit",
        payoutEnabled: false,
        request: requestResult,
        transition,
        authorization,
        audit,
        verified: Boolean(
          requestResult.ok === true &&
          requestResult.status === "requested" &&
          transition.ok === true &&
          transition.to === "under_review" &&
          authorization.authorized === true &&
          audit.ok === true &&
          audit.status === "ready"
        )
      });
    }

    if (url.pathname === "/api/wallet/payout/authorize" && request.method === "POST") {
      let body;

      try {
        body = await request.json();
      } catch {
        return json({
          ok: false,
          message: "Invalid payout authorization data."
        }, 400);
      }

      return json({
        ok: true,
        service: "X4Kiss Payout Authorization",
        result: evaluatePayoutAuthorization(body)
      });
    }

    if (url.pathname === "/api/wallet/payout/audit" && request.method === "POST") {
      let body;

      try {
        body = await request.json();
      } catch {
        return json({
          ok: false,
          message: "Invalid payout audit data."
        }, 400);
      }

      return json({
        ok: true,
        service: "X4Kiss Payout Audit",
        result: createPayoutAuditEvent(body)
      });
    }

    if (url.pathname === "/api/wallet/payout/history" && request.method === "POST") {
      let body;

      try {
        body = await request.json();
      } catch {
        return json({
          ok: false,
          message: "Invalid payout history data."
        }, 400);
      }

      return json({
        ok: true,
        service: "X4Kiss Payout History",
        result: buildPayoutHistory(body.events)
      });
    }

    if (url.pathname === "/api/wallet/payout/request" && request.method === "POST") {
      let body;

      try {
        body = await request.json();
      } catch {
        return json({
          ok: false,
          message: "Invalid payout request data."
        }, 400);
      }

      return json({
        ok: true,
        service: "X4Kiss Payout Request",
        result: createPayoutRequest(body)
      });
    }

    if (url.pathname === "/api/wallet/payout/status" && request.method === "POST") {
      let body;

      try {
        body = await request.json();
      } catch {
        return json({
          ok: false,
          message: "Invalid payout status data."
        }, 400);
      }

      return json({
        ok: true,
        service: "X4Kiss Payout Status",
        result: transitionPayoutStatus(body)
      });
    }

    if (url.pathname === "/api/wallet/payout-eligibility" && request.method === "POST") {
      let body;

      try {
        body = await request.json();
      } catch {
        return json({
          ok: false,
          message: "Invalid payout eligibility data."
        }, 400);
      }

      return json({
        ok: true,
        service: "X4Kiss Payout Eligibility",
        result: evaluatePayoutEligibility(body)
      });
    }

    if (url.pathname === "/api/wallet/reversal-check" && request.method === "POST") {
      let body;

      try {
        body = await request.json();
      } catch {
        return json({
          ok: false,
          message: "Invalid wallet reversal data."
        }, 400);
      }

      return json({
        ok: true,
        service: "X4Kiss Wallet Reversal",
        result: evaluateWalletReversal(body)
      });
    }

    if (url.pathname === "/api/wallet/settlement-check" && request.method === "POST") {
      let body;

      try {
        body = await request.json();
      } catch {
        return json({
          ok: false,
          message: "Invalid wallet settlement data."
        }, 400);
      }

      return json({
        ok: true,
        service: "X4Kiss Wallet Settlement",
        result: evaluatePendingSettlement(body)
      });
    }

    if (url.pathname === "/api/wallet/revenue-to-pending" && request.method === "POST") {
      let body;

      try {
        body = await request.json();
      } catch {
        return json({
          ok: false,
          message: "Invalid revenue-to-wallet data."
        }, 400);
      }

      return json({
        ok: true,
        service: "X4Kiss Revenue To Wallet",
        result: evaluateRevenueToWallet(body)
      });
    }

    if (url.pathname === "/api/wallet/settlement/status" && request.method === "GET") {
      return json({
        ok: true,
        service: "X4Kiss Wallet Settlement",
        walletLedgerReady: isWalletLedgerReady(env),
        settlementReady: isWalletLedgerReady(env) && WALLET_SETTLEMENT_RULES.enabled,
        rulesVersion: WALLET_SETTLEMENT_RULES.version,
        status: WALLET_SETTLEMENT_RULES.status,
        message: isWalletLedgerReady(env) && WALLET_SETTLEMENT_RULES.enabled
          ? "Wallet settlement checks are connected and ready."
          : "Wallet settlement checks are not ready."
      });
    }

    if (url.pathname === "/api/wallet/settlement/self-test" && request.method === "GET") {
      const result = evaluatePendingSettlement({
        creatorId: "production-settlement-self-test-creator",
        revenueEventId: "production-settlement-self-test-revenue",
        amount: 1,
        revenueQualified: true,
        settlementConfirmed: true,
        refundOrChargebackHold: false
      });

      return json({
        ok: true,
        service: "X4Kiss Wallet Settlement",
        test: "qualification-check",
        result,
        verified: Boolean(
          result.ok === true &&
          result.status === "settlement_ready" &&
          result.settled === true &&
          result.fromBalanceType === "pending" &&
          result.toBalanceType === "available"
        )
      });
    }

    if (url.pathname === "/api/wallet/ledger/status" && request.method === "GET") {
      return json({
        ok: true,
        service: "X4Kiss Wallet Ledger",
        storageReady: isWalletLedgerReady(env),
        storage: "X4KISS_WALLET_LEDGER",
        message: isWalletLedgerReady(env)
          ? "Wallet ledger storage is connected and ready."
          : "Wallet ledger storage is prepared but not connected yet."
      });
    }

    if (url.pathname === "/api/wallet/ledger/self-test" && request.method === "GET") {
      const entry = {
        entryId: "production-wallet-self-test-entry",
        creatorId: "production-wallet-self-test-creator",
        type: "earning",
        amount: 1,
        currency: "USD",
        balanceType: "pending",
        referenceId: "production-wallet-self-test-reference",
        occurredAt: new Date().toISOString()
      };

      if (!isWalletLedgerReady(env)) {
        return json({ ok: false, storageReady: false, verified: false }, 503);
      }

      try {
        const write = await storeWalletEntry(env, entry);
        const read = await getWalletEntry(env, entry);

        return json({
          ok: true,
          service: "X4Kiss Wallet Ledger",
          test: "write-read",
          write,
          read,
          verified: write.ok === true && read.status === "found" && Boolean(read.entry)
        });
      } catch {
        return json({
          ok: false,
          service: "X4Kiss Wallet Ledger",
          test: "write-read",
          verified: false
        }, 500);
      }
    }

    if (url.pathname === "/api/wallet/ledger/store" && request.method === "POST") {
      if (!isWalletLedgerReady(env)) {
        return json({
          ok: false,
          storageReady: false,
          recorded: false,
          message: "Wallet ledger storage is not connected yet. The entry was not recorded."
        }, 503);
      }

      let body;

      try {
        body = await request.json();
      } catch {
        return json({
          ok: false,
          message: "Invalid wallet ledger data."
        }, 400);
      }

      const result = await storeWalletEntry(env, body);

      return json({
        ok: true,
        service: "X4Kiss Wallet Ledger",
        result
      });
    }

    if (url.pathname === "/api/wallet/ledger/get" && request.method === "POST") {
      if (!isWalletLedgerReady(env)) {
        return json({
          ok: false,
          storageReady: false,
          message: "Wallet ledger storage is not connected yet."
        }, 503);
      }

      let body;

      try {
        body = await request.json();
      } catch {
        return json({
          ok: false,
          message: "Invalid wallet ledger lookup data."
        }, 400);
      }

      const result = await getWalletEntry(env, body);

      return json({
        ok: true,
        service: "X4Kiss Wallet Ledger",
        result
      });
    }

    if (url.pathname === "/api/views/status" && request.method === "GET") {
      return json({
        ok: true,
        service: "X4Kiss Views & Revenue",
        rules: VIEWS_REVENUE_RULES,
        message: isViewEventStoreReady(env)
          ? "Views and revenue event storage is connected and active."
          : "Views and revenue event architecture is prepared. Durable event storage is not connected yet."
      });
    }

    if (url.pathname === "/api/views/storage/self-test" && request.method === "GET") {
      const event = {
        videoId: "production-self-test-video",
        creatorId: "production-self-test-creator",
        viewerSessionId: "production-self-test-session",
        eventId: crypto.randomUUID(),
        eventType: "view",
        playbackSignal: "playing",
        watchSeconds: 10,
        watchPercent: 20,
        occurredAt: new Date().toISOString()
      };

      if (!isViewEventStoreReady(env)) {
        return json({ ok: false, storageReady: false, verified: false }, 503);
      }

      try {
        const write = await storeViewEvent(env, event);
        const read = await getViewEvent(env, event);
        const verified = write.ok === true && read.status === "found" && Boolean(read.event);
        const cleanup = await deleteViewEvent(env, event);

        return json({
          ok: true,
          service: "X4Kiss Durable View Event Store",
          storage: "ElasticLake",
          test: "write-read-delete",
          write,
          read,
          cleanup,
          verified: verified && cleanup.ok === true
        });
      } catch (error) {
        return json({
          ok: false,
          service: "X4Kiss Durable View Event Store",
          storage: "ElasticLake",
          test: "write-read-delete",
          verified: false,
          diagnostic: String(error?.message || error || "Unknown storage error").slice(0, 1000)
        }, 500);
      }
    }

    if (url.pathname === "/api/views/event/store" && request.method === "POST") {
      if (!isViewEventStoreReady(env)) {
        return json({
          ok: false,
          storageReady: false,
          message: "Durable view event storage is not connected yet. The event was not stored."
        }, 503);
      }

      let body;

      try {
        body = await request.json();
      } catch {
        return json({
          ok: false,
          message: "Invalid view event data."
        }, 400);
      }

      const validation = validateViewEvent(body);

      if (!validation.valid) {
        return json({
          ok: true,
          service: "X4Kiss Durable View Event Store",
          result: validation
        });
      }

      const result = await storeViewEvent(env, body);

      return json({
        ok: true,
        service: "X4Kiss Durable View Event Store",
        result
      });
    }

    if (url.pathname === "/api/views/event/validate" && request.method === "POST") {
      let body;

      try {
        body = await request.json();
      } catch {
        return json({
          ok: false,
          message: "Invalid view event data."
        }, 400);
      }

      return json({
        ok: true,
        service: "X4Kiss View Event Validator",
        result: validateViewEvent(body)
      });
    }

    if (url.pathname === "/api/views/event/count-check" && request.method === "POST") {
      let body;

      try {
        body = await request.json();
      } catch {
        return json({
          ok: false,
          message: "Invalid view count data."
        }, 400);
      }

      return json({
        ok: true,
        service: "X4Kiss View Count Check",
        result: evaluateViewCount(body)
      });
    }

    if (url.pathname === "/api/views/event/traffic-check" && request.method === "POST") {
      let body;

      try {
        body = await request.json();
      } catch {
        return json({
          ok: false,
          message: "Invalid traffic data."
        }, 400);
      }

      return json({
        ok: true,
        service: "X4Kiss Traffic Quality Check",
        result: evaluateTrafficQuality(body)
      });
    }

    if (url.pathname === "/api/views/event/qualified-check" && request.method === "POST") {
      let body;

      try {
        body = await request.json();
      } catch {
        return json({
          ok: false,
          message: "Invalid qualified view data."
        }, 400);
      }

      return json({
        ok: true,
        service: "X4Kiss Qualified View Check",
        result: evaluateQualifiedView(body)
      });
    }

    if (url.pathname === "/api/revenue/event/validate" && request.method === "POST") {
      let body;

      try {
        body = await request.json();
      } catch {
        return json({
          ok: false,
          message: "Invalid revenue event data."
        }, 400);
      }

      return json({
        ok: true,
        service: "X4Kiss Revenue Event Validator",
        result: validateRevenueEvent(body)
      });
    }

    if (url.pathname === "/api/monetization/status" && request.method === "GET") {
      return json({
        ok: true,
        service: "X4Kiss Monetization",
        enabled: MONETIZATION_RULES.enabled,
        status: MONETIZATION_RULES.status,
        version: MONETIZATION_RULES.version,
        model: MONETIZATION_RULES.model,
        message: MONETIZATION_RULES.enabled
          ? "Monetization is active."
          : "Monetization rules are prepared but not active."
      });
    }

    if (url.pathname === "/api/monetization/rules" && request.method === "GET") {
      return json({
        ok: true,
        service: "X4Kiss Monetization Rules",
        rules: MONETIZATION_RULES
      });
    }

    if (url.pathname === "/api/monetization/eligibility/rules" && request.method === "GET") {
      return json({
        ok: true,
        service: "X4Kiss Creator Eligibility",
        rules: CREATOR_ELIGIBILITY_RULES
      });
    }

    if (url.pathname === "/api/monetization/activation/rules" && request.method === "GET") {
      return json({
        ok: true,
        service: "X4Kiss Creator Monetization Activation",
        rules: CREATOR_ACTIVATION_RULES
      });
    }

    if (url.pathname === "/api/monetization/activation/evaluate" && request.method === "POST") {
      let body;

      try {
        body = await request.json();
      } catch {
        return json({
          ok: false,
          message: "Invalid activation data."
        }, 400);
      }

      return json({
        ok: true,
        service: "X4Kiss Creator Monetization Activation",
        result: evaluateCreatorActivation(body)
      });
    }

    if (url.pathname === "/api/monetization/policy/rules" && request.method === "GET") {
      return json({
        ok: true,
        service: "X4Kiss Monetization Policy",
        rules: MONETIZATION_POLICY_RULES
      });
    }

    if (url.pathname === "/api/monetization/policy/evaluate" && request.method === "POST") {
      let body;

      try {
        body = await request.json();
      } catch {
        return json({
          ok: false,
          message: "Invalid policy evaluation data."
        }, 400);
      }

      return json({
        ok: true,
        service: "X4Kiss Monetization Policy",
        result: evaluateMonetizationPolicy(body)
      });
    }

    if (url.pathname === "/api/monetization/revenue/calculate" && request.method === "POST") {
      let body;

      try {
        body = await request.json();
      } catch {
        return json({
          ok: false,
          message: "Invalid revenue calculation data."
        }, 400);
      }

      return json({
        ok: true,
        service: "X4Kiss Revenue Calculation",
        result: calculateRevenue(body)
      });
    }

    if (url.pathname === "/api/monetization/eligibility/evaluate" && request.method === "POST") {
      let body;

      try {
        body = await request.json();
      } catch {
        return json({
          ok: false,
          message: "Invalid eligibility data."
        }, 400);
      }

      return json({
        ok: true,
        service: "X4Kiss Creator Eligibility",
        result: evaluateCreatorEligibility(body)
      });
    }

    if (url.pathname === "/api/upload/status" && request.method === "GET") {
      return json({
        ok: true,
        service: "X4Kiss Upload",
        storageReady,
        uploadEndpoint: true,
        message: storageReady
          ? "Production video storage is connected."
          : "Production video storage is not activated yet."
      });
    }

    if (url.pathname === "/api/upload/prepare" && request.method === "POST") {
      if (!storageReady) return json({ ok: false, storageReady: false, message: "Production storage is not ready. No file was uploaded." }, 503);
      if (!env.X4KISS_AUTH_DB) return json({ ok: false, message: "Authentication backend is not configured." }, 503);
      const authorization = request.headers.get("Authorization") || "";
      const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
      const session = await authenticateSession(env, token);
      if (!session.ok) return json({ ok: false, message: "Sign in with your creator account before uploading." }, 401);
      let body;
      try { body = await request.json(); } catch { return json({ ok: false, message: "Invalid upload metadata." }, 400); }
      if (!body.fileName || !body.contentType || !String(body.contentType).startsWith("video/") || !body.title || !body.category) {
        return json({ ok: false, message: "A file name, video content type, title and category are required." }, 400);
      }
      if (!Number.isSafeInteger(body.fileSize) || body.fileSize < 1 || body.fileSize > 100 * 1024 * 1024) {
        return json({ ok: false, message: "Video must be no larger than 100 MB." }, 413);
      }
      return json({ ok: true, storageReady: true, uploadReady: true, creatorId: session.user.id, visibility: "private", message: "Creator session verified; private upload is authorized." });
    }

    if (url.pathname === "/api/upload" && request.method === "POST") {
      if (!storageReady) {
        return json({
          ok: false,
          storageReady: false,
          message: "Production video storage is not activated yet. The video was not uploaded."
        }, 503);
      }

      if (!env.X4KISS_AUTH_DB) {
        return json({ ok: false, message: "Authentication backend is not configured." }, 503);
      }
      const authorization = request.headers.get("Authorization") || "";
      const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
      const session = await authenticateSession(env, token);
      if (!session.ok) {
        return json({ ok: false, message: "Sign in with your creator account before uploading." }, 401);
      }

      const fileName = request.headers.get("X-X4Kiss-File-Name");
      const contentType = request.headers.get("Content-Type") || "application/octet-stream";
      const fileSize = Number(request.headers.get("X-X4Kiss-File-Size") || 0);

      if (!fileName) {
        return json({
          ok: false,
          message: "X-X4Kiss-File-Name is required."
        }, 400);
      }

      if (!contentType.startsWith("video/")) {
        return json({
          ok: false,
          message: "Only video content is accepted."
        }, 415);
      }

      if (!request.body || !Number.isSafeInteger(fileSize) || fileSize < 1 || fileSize > 100 * 1024 * 1024) {
        return json({
          ok: false,
          message: "Video must be present and no larger than 100 MB."
        }, 400);
      }

      const title = request.headers.get("X-X4Kiss-Title") || "";
      const description = request.headers.get("X-X4Kiss-Description") || "";
      const category = request.headers.get("X-X4Kiss-Category") || "";
      const key = createVideoKey(fileName);
      const videoId = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      try {
        await ensureCreatorVideoIndex(env.X4KISS_AUTH_DB);
        await env.X4KISS_AUTH_DB.prepare(
          "INSERT INTO creator_videos (id,creator_id,storage_key,file_name,content_type,file_size,title,description,category,visibility,download_policy,status,storage,created_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,'private','disabled','uploading','ElasticLake',?10)"
        ).bind(videoId, session.user.id, key, fileName, contentType, fileSize, title, description, category, createdAt).run();
      } catch {
        return json({ ok: false, storageReady: true, status: "index_unavailable", message: "The private video library is not ready. No video was uploaded; please try again later." }, 503);
      }

      try {
        const stored = await storeVideo(env, key, request.body, {
          fileName, contentType, title, description, category,
          creatorId: session.user.id,
          downloadPolicy: "disabled",
          visibility: "private"
        });
        await env.X4KISS_AUTH_DB.prepare(
          "UPDATE creator_videos SET status='stored' WHERE id=?1 AND creator_id=?2"
        ).bind(videoId, session.user.id).run();

        return json({
          ...stored,
          id: videoId,
          title,
          category,
          visibility: "private",
          status: "stored",
          storage: "ElasticLake",
          createdAt,
          message: "Video uploaded to private storage and added to My Videos. Public publishing and playback are not enabled yet."
        }, 201);
      } catch {
        await env.X4KISS_AUTH_DB.prepare(
          "UPDATE creator_videos SET status='failed' WHERE id=?1 AND creator_id=?2"
        ).bind(videoId, session.user.id).run().catch(() => {});
        return json({
          ok: false,
          storageReady: true,
          status: "failed",
          message: "Video storage failed. No completed upload is available in My Videos."
        }, 500);
      }
    }

    if (url.pathname === "/api/creator/videos" && request.method === "GET") {
      if (!env.X4KISS_AUTH_DB) return json({ ok: false, message: "Authentication backend is not configured." }, 503);
      const authorization = request.headers.get("Authorization") || "";
      const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
      const session = await authenticateSession(env, token);
      if (!session.ok) return json({ ok: false, message: "Sign in to access your creator library." }, 401);
      try {
        await ensureCreatorVideoIndex(env.X4KISS_AUTH_DB);
        const result = await env.X4KISS_AUTH_DB.prepare(
          "SELECT id,storage_key AS key,file_name AS fileName,content_type AS contentType,file_size AS size,title,description,category,visibility,download_policy AS downloadPolicy,status,storage,created_at AS uploaded FROM creator_videos WHERE creator_id=?1 ORDER BY created_at DESC LIMIT 100"
        ).bind(session.user.id).all();
        return json({
          ok: true,
          storageReady,
          videos: result.results || [],
          status: "ready"
        });
      } catch {
        return json({ ok: false, storageReady, videos: [], status: "library_unavailable", message: "Your private video library is temporarily unavailable." }, 503);
      }
    }

    return json({
      service: "X4Kiss Worker",
      status: "online",
      path: url.pathname
    });
  }
};
