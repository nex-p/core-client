"use server";
import axios, { AxiosHeaders, isAxiosError } from "axios";
import { getServerSession } from "next-auth";
import { Readable } from "stream";
function CoreAPIHandler(options) {
    return async (req, { params }) => {
        var _a;
        const { paths } = await params;
        const session = await getServerSession(options);
        const token = (_a = session === null || session === void 0 ? void 0 : session.accessToken) === null || _a === void 0 ? void 0 : _a.accessToken;
        if (paths[0] === "data")
            return handleDataRequest(req, token);
        if (paths[0] === "report")
            return handleReportRequest(req, token);
        if (paths[0] === "ui")
            return handleUIRequest(req, token);
        if (paths[0] === "action" && req.method === "POST")
            return handleActionRequest(req, token);
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
function extractPath(req, marker) {
    var _a;
    return (_a = req.url.split(marker)[1]) !== null && _a !== void 0 ? _a : "";
}
async function buildSignedHeaders(headers, body) {
    const secret = process.env.NXP_SECRECT;
    const siteId = process.env.NXP_SITE_ID;
    if (!secret)
        throw new Error("NXP_SECRECT environment variable is not set");
    if (!siteId)
        throw new Error("NXP_SITE_ID environment variable is not set");
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payload = `${timestamp}.${body ? JSON.stringify(body) : ""}`;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
    const signature = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    console.log("X-Timestamp : ", timestamp);
    console.log("X-Signature : ", signature);
    console.log("X-SiteId : ", siteId);
    headers.set("X-Timestamp", timestamp);
    headers.set("X-Signature", signature);
    headers.set("X-SiteId", siteId);
}
function applyPreferHeader(req, headers) {
    if (req.headers.has("prefer")) {
        headers.set("prefer", req.headers.get("prefer"));
    }
}
function handleAxiosError(e) {
    var _a, _b, _c, _d, _e, _f, _g;
    if (isAxiosError(e)) {
        const message = ((_c = (_b = (_a = e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) ||
            ((_e = (_d = e.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.message) ||
            "Something went wrong";
        return new Response(message, {
            status: (_g = (_f = e.response) === null || _f === void 0 ? void 0 : _f.status) !== null && _g !== void 0 ? _g : 500,
        });
    }
    return new Response("Something went wrong", { status: 500 });
}
/* -------------------------------------------------------
 * Data API
 * ----------------------------------------------------- */
async function handleDataRequest(req, accessToken) {
    try {
        const path = extractPath(req, "/api/core/data/");
        const url = `${process.env.CORE_DATA_URL}/v1/${path}`;
        const headers = new AxiosHeaders({
            "Content-Type": "application/json",
        });
        applyPreferHeader(req, headers);
        const config = {
            method: req.method,
            url,
            headers,
        };
        if (["POST", "PUT", "PATCH"].includes(req.method)) {
            config.data = await req.json();
        }
        if (accessToken) {
            headers.set("Authorization", `Bearer ${accessToken}`);
        }
        else {
            await buildSignedHeaders(headers, config.data);
        }
        const resp = await axios(config);
        return req.method === "DELETE"
            ? Response.json({ message: "Successfully deleted the record!" })
            : Response.json(resp.data);
    }
    catch (e) {
        return handleAxiosError(e);
    }
}
/* -------------------------------------------------------
 * Action API
 * ----------------------------------------------------- */
async function handleActionRequest(req, accessToken) {
    try {
        const path = extractPath(req, "/api/core/action/");
        const url = `${process.env.CORE_ACTION_URL}/v1/${path}`;
        const headers = new AxiosHeaders({
            "Content-Type": "application/json",
        });
        applyPreferHeader(req, headers);
        const config = {
            method: req.method,
            url,
            headers,
        };
        if (["POST", "PUT", "PATCH"].includes(req.method)) {
            config.data = await req.json();
        }
        if (accessToken) {
            headers.set("Authorization", `Bearer ${accessToken}`);
        }
        else {
            await buildSignedHeaders(headers, config.data);
        }
        const resp = await axios(config);
        return req.method === "DELETE"
            ? Response.json({ message: "Successfully deleted the record!" })
            : Response.json(resp.data);
    }
    catch (e) {
        return handleAxiosError(e);
    }
}
/* -------------------------------------------------------
 * Report API
 * ----------------------------------------------------- */
async function handleReportRequest(req, accessToken) {
    try {
        console.log("REPORT");
        const path = extractPath(req, "/api/core/report/");
        const url = `${process.env.CORE_REPORT_URL}/v1/${path}`;
        const headers = new AxiosHeaders({
            "Content-Type": "application/json",
        });
        applyPreferHeader(req, headers);
        const config = {
            method: req.method,
            url,
            headers,
            responseType: "stream", // 🔑 stream any type
        };
        if (["POST", "PUT", "PATCH"].includes(req.method)) {
            config.data = await req.json();
        }
        if (accessToken) {
            headers.set("Authorization", `Bearer ${accessToken}`);
        }
        else {
            await buildSignedHeaders(headers, config.data);
        }
        const resp = await axios(config);
        // Stream Axios response → Web Response
        const stream = new ReadableStream({
            start(controller) {
                resp.data.on("data", (chunk) => controller.enqueue(chunk));
                resp.data.on("end", () => controller.close());
                resp.data.on("error", (err) => controller.error(err));
            },
        });
        return new Response(stream, {
            status: resp.status,
            headers: Object.assign({}, Object.fromEntries(Object.entries(resp.headers).map(([key, value]) => [
                key,
                Array.isArray(value) ? value.join(",") : String(value !== null && value !== void 0 ? value : ""),
            ]))),
        });
    }
    catch (e) {
        return handleAxiosError(e);
    }
}
/* -------------------------------------------------------
 * UI API
 * ----------------------------------------------------- */
async function handleUIRequest(req, accessToken) {
    try {
        const path = extractPath(req, "/api/core/ui/");
        const url = `${process.env.CORE_UI_URL}/v1/${path}`;
        const headers = new AxiosHeaders({
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        });
        applyPreferHeader(req, headers);
        const config = {
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
    }
    catch (e) {
        return handleAxiosError(e);
    }
}
/* -------------------------------------------------------
 * File Upload
 * ----------------------------------------------------- */
async function handleAttachmentUpload(req, accessToken) {
    var _a;
    try {
        const path = extractPath(req, "/api/core/");
        const url = `${process.env.CORE_DATA_URL}/${path}`;
        const reader = (_a = req.body) === null || _a === void 0 ? void 0 : _a.getReader();
        if (!reader)
            throw new Error("Request body missing");
        const stream = new Readable({
            async read() {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done)
                        return this.push(null);
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
    }
    catch (e) {
        return handleAxiosError(e);
    }
}
/* -------------------------------------------------------
 * File Download
 * ----------------------------------------------------- */
async function handleAttachmentDownload(req, accessToken) {
    var _a, _b;
    try {
        const path = extractPath(req, "/api/core/");
        const url = `${process.env.CORE_DATA_URL}/${path}`;
        const headers = new AxiosHeaders();
        applyPreferHeader(req, headers);
        if (accessToken) {
            headers.set("Authorization", `Bearer ${accessToken}`);
        }
        else {
            await buildSignedHeaders(headers);
        }
        const resp = await axios({
            method: "GET",
            url,
            headers,
            responseType: "stream",
        });
        return new Response(resp.data, {
            status: 200,
            headers: {
                "Content-Type": (_a = resp.headers["content-type"]) !== null && _a !== void 0 ? _a : "application/octet-stream",
                "Content-Disposition": (_b = resp.headers["content-disposition"]) !== null && _b !== void 0 ? _b : "attachment",
            },
        });
    }
    catch (e) {
        return handleAxiosError(e);
    }
}
