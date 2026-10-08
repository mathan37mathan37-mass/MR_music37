import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

/**
 * /auth/callback  – Supabase PKCE OAuth landing page.
 *
 * Handles all timing scenarios:
 * - Session already stored by detectSessionInUrl (fast path)
 * - Session being exchanged by authStore's getSession() (poll path)
 * - Neither worked → manual exchangeCodeForSession (fallback)
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const done = useRef(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(
      window.location.hash.startsWith("#")
        ? window.location.hash.substring(1)
        : window.location.hash
    );

    const code = searchParams.get("code") || hashParams.get("code");
    const urlError = searchParams.get("error") || hashParams.get("error");
    const urlErrorDesc = searchParams.get("error_description") || hashParams.get("error_description");
    const accessToken = hashParams.get("access_token") || searchParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token") || searchParams.get("refresh_token");

    console.log("[AuthCallback] URL:", window.location.href);
    console.log("[AuthCallback] code:", code ? "PRESENT" : "MISSING");
    console.log("[AuthCallback] accessToken:", accessToken ? "PRESENT" : "MISSING");
    console.log("[AuthCallback] error:", urlError ?? "none");

    if (!supabase) {
      setErrorMsg("Supabase not configured.");
      setStatus("error");
      setTimeout(() => navigate("/", { replace: true }), 3000);
      return;
    }

    // Provider returned an error (user denied, redirect_uri_mismatch, etc.)
    if (urlError) {
      console.error("[AuthCallback] Provider error:", urlError, urlErrorDesc);
      setErrorMsg(urlErrorDesc ?? urlError);
      setStatus("error");
      setTimeout(() => navigate("/", { replace: true }), 4000);
      return;
    }

    const succeed = () => {
      if (done.current) return;
      done.current = true;
      console.log("[AuthCallback] SUCCESS");
      setStatus("success");
      setTimeout(() => navigate("/", { replace: true }), 800);
    };

    const fail = (msg: string) => {
      if (done.current) return;
      done.current = true;
      console.error("[AuthCallback] FAIL:", msg);
      setErrorMsg(msg);
      setStatus("error");
      setTimeout(() => navigate("/", { replace: true }), 4000);
    };

    // Subscribe to auth events fired AFTER we mount
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[AuthCallback] onAuthStateChange:", event, session ? "session=yes" : "session=no");
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
        succeed();
      }
    });

    const handle = async () => {
      // ── Step 0: Direct Hash Access Token (Implicit flow) ───────────────────
      if (accessToken) {
        console.log("[AuthCallback] Step 0: Setting session from hash token");
        try {
          const { data: setRes, error: setErr } = await supabase!.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || "",
          });
          if (setRes.session) {
            succeed();
            return;
          }
          if (setErr) console.warn("[AuthCallback] setSession notice:", setErr.message);
        } catch (err) {
          console.warn("[AuthCallback] setSession threw:", err);
        }
      }

      // ── Step 1: Fast path ──────────────────────────────────────────────────
      const { data: s1 } = await supabase!.auth.getSession();
      console.log("[AuthCallback] Step 1 getSession:", s1.session ? "SESSION FOUND" : "no session");
      if (s1.session) { succeed(); return; }

      // ── Step 2: Poll (detectSessionInUrl / authStore exchange in-flight) ───
      for (let i = 0; i < 12; i++) {
        await new Promise(r => setTimeout(r, 500));
        if (done.current) return;
        const { data: poll } = await supabase!.auth.getSession();
        console.log(`[AuthCallback] poll ${i + 1}:`, poll.session ? "SESSION FOUND" : "waiting");
        if (poll.session) { succeed(); return; }
      }

      // ── Step 3: Manual exchange (PKCE code exchange) ───────────────────────
      if (code && !done.current) {
        console.log("[AuthCallback] Step 3: manual exchangeCodeForSession");
        try {
          const { data: exch, error: exchErr } = await supabase!.auth.exchangeCodeForSession(code);
          console.log("[AuthCallback] exchange result:", exch.session ? "SESSION FOUND" : "no session", exchErr?.message ?? "");
          if (exch.session) { succeed(); return; }
          // Code may have been consumed already; check storage again
          const { data: retry } = await supabase!.auth.getSession();
          if (retry.session) { succeed(); return; }
          if (exchErr) fail(`Exchange error: ${exchErr.message}`);
        } catch (err: any) {
          console.error("[AuthCallback] exchange threw:", err.message);
          // One last check
          const { data: last } = await supabase!.auth.getSession();
          if (last.session) { succeed(); return; }
        }
      }

      if (!done.current) fail("Sign-in could not be completed. Please ensure your production site URL is registered in Supabase Redirect URLs.");
    };

    void handle();

    const hardTimer = setTimeout(() => {
      if (!done.current) fail("Sign-in timed out. Please try again.");
    }, 20000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(hardTimer);
    };
  }, [navigate]);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        alignItems: "center",
        justifyContent: "center",
        background: "#080810",
        color: "#fff",
        fontFamily: "Inter, system-ui, sans-serif",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {status === "loading" && (
        <>
          <div
            style={{
              height: 44,
              width: 44,
              borderRadius: "50%",
              border: "2px solid rgba(139,92,246,0.25)",
              borderTopColor: "#a78bfa",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, margin: 0 }}>
            Completing sign-in with Google&hellip;
          </p>
        </>
      )}

      {status === "success" && (
        <>
          <div style={{ fontSize: 44 }}>&#10003;</div>
          <p style={{ color: "#86efac", fontSize: 16, fontWeight: 600, margin: 0 }}>
            Signed in successfully!
          </p>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: 0 }}>
            Taking you home&hellip;
          </p>
        </>
      )}

      {status === "error" && (
        <>
          <div style={{ fontSize: 44 }}>&#10007;</div>
          <p style={{ color: "#fca5a5", fontSize: 16, fontWeight: 600, margin: 0 }}>
            Sign-in failed
          </p>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, margin: 0 }}>
            {errorMsg}
          </p>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, margin: 0 }}>
            Redirecting in 3 s&hellip;
          </p>
        </>
      )}
    </div>
  );
}
