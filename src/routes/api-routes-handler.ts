"use server";

import axios, { AxiosHeaders, isAxiosError } from "axios";
import { AuthOptions, getServerSession } from "next-auth";
import { Readable } from "stream";

/* -------------------------------------------------------
 * Core handler 
 * ----------------------------------------------------- */

function CoreAPIHandler(options: AuthOptions): any;

function CoreAPIHandler(options: AuthOptions) {
  return async (
    req: Request,
    { params }: { params: Promise<{ paths: string[] }> },
  ) => {
    const { paths } = await params;
    const session = await getServerSession<any, any>(options);
    const token = session?.accessToken?.accessToken;

    if (paths[0] === "data") return handleDataRequest(req, token);
    if (paths[0] === "ui") return handleUIRequest(req, token);
    if (paths[0] === "file" && req.method === "POST")
      return handleAttachmentUpload(req, token);
    if (paths[0] === "file" && req.method === "GET")
      return handleAttachmentDownload(req, token);

    return Response.json({ message: "Invalid Resource Path" });
  };
}

export default CoreAPIHandler;

/* -------------------------------------------------------
 * Helpers
 * ----------------------------------------------------- */

function extractPath(req: Request, marker: string) {
  return req.url.split(marker)[1] ?? "";
}

async function buildSignedHeaders(
  headers: AxiosHeaders,
  body?: unknown,
) {
  const secret = process.env.NXP_SECRECT;
  const siteId = process.env.NXP_SITE_ID;

  if (!secret) throw new Error("NXP_SECRECT environment variable is not set");
  if (!siteId) throw new Error("NXP_SITE_ID environment variable is not set");

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = `${timestamp}.${body ? JSON.stringify(body) : ""}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );

  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  headers.set("X-Timestamp", timestamp);
  headers.set("X-Signature", signature);
  headers.set("X-SiteId", siteId);
}

function applyPreferHeader(req: Request, headers: AxiosHeaders) {
  if (req.headers.has("prefer")) {
    headers.set("prefer", req.headers.get("prefer")!);
  }
}

function handleAxiosError(e: unknown) {
  if (isAxiosError(e)) {
    const message =
      e.response?.data?.data?.message ||
      e.response?.data?.message ||
      "Something went wrong";

    return new Response(message, {
      status: e.response?.status ?? 500,
    });
  }

  return new Response("Something went wrong", { status: 500 });
}

/* -------------------------------------------------------
 * Data API
 * ----------------------------------------------------- */

async function handleDataRequest(req: Request, accessToken?: string) {
  try {
    const path = extractPath(req, "/api/core/data/");
    const url = `${process.env.CORE_DATA_URL}/v1/${path}`;

    const headers = new AxiosHeaders({
      "Content-Type": "application/json",
    });

    applyPreferHeader(req, headers);

    const config: any = {
      method: req.method,
      url,
      headers,
    };

    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      config.data = await req.json();
    }

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    } else {
      await buildSignedHeaders(headers, config.data);
    }

    const resp = await axios(config);

    return req.method === "DELETE"
      ? Response.json({ message: "Successfully deleted the record!" })
      : Response.json(resp.data);
  } catch (e) {
    return handleAxiosError(e);
  }
}

/* -------------------------------------------------------
 * UI API
 * ----------------------------------------------------- */

async function handleUIRequest(req: Request, accessToken?: string) {
  try {
    const path = extractPath(req, "/api/core/ui/");
    const url = `${process.env.CORE_UI_URL}/v1/${path}`;

    const headers = new AxiosHeaders({
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    });

    applyPreferHeader(req, headers);

    const config: any = {
      method: req.method,
      url,
      headers,
    };

    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      config.data = await req.json();
    }

    const resp = await axios(config);

    return req.method === "DELETE"
      ? Response.json({ message: "Successfully deleted the record" })
      : Response.json(resp.data);
  } catch (e) {
    return handleAxiosError(e);
  }
}

/* -------------------------------------------------------
 * File Upload
 * ----------------------------------------------------- */

async function handleAttachmentUpload(req: Request, accessToken?: string) {
  try {
    const url = `${process.env.CORE_META_URL}/v1/file?ftp=yes`;
    const reader = req.body?.getReader();

    if (!reader) throw new Error("Request body missing");

    const stream = new Readable({
      async read() {
        while (true) {
          const { done, value } = await reader.read();
          if (done) return this.push(null);
          this.push(Buffer.from(value));
        }
      },
    });

    const headers = new AxiosHeaders({
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/octet-stream",
    });

    const resp = await axios({
      method: req.method,
      url,
      headers,
      data: stream,
    });

    return Response.json(resp.data);
  } catch (e) {
    return handleAxiosError(e);
  }
}

/* -------------------------------------------------------
 * File Download
 * ----------------------------------------------------- */

async function handleAttachmentDownload(req: Request, accessToken?: string) {
  try {
    const path = extractPath(req, "/api/core/");
    const url = `${process.env.CORE_META_URL}/v1/${path}`;

    const headers = new AxiosHeaders();
    applyPreferHeader(req, headers);

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    } else {
      await buildSignedHeaders(headers);
    }

    const resp = await axios({
      method: "GET",
      url,
      headers,
      responseType: "stream",
    });

    return new Response(resp.data as any, {
      status: 200,
      headers: {
        "Content-Type":
          resp.headers["content-type"] ?? "application/octet-stream",
        "Content-Disposition":
          resp.headers["content-disposition"] ?? "attachment",
      },
    });
  } catch (e) {
    return handleAxiosError(e);
  }
}
