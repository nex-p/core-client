"use server";
import axios, { AxiosHeaders, isAxiosError } from "axios";
import { getServerSession } from "next-auth";
import { Readable } from "stream";
function CoreAPIHandler(options) {
    return async (req, { params }) => {
        var _a, _b, _c, _d;
        const { paths } = await params;
        const session = await getServerSession(options);
        if (paths[0] == "data") {
            return handleDataRequest(req, (_a = session === null || session === void 0 ? void 0 : session.accessToken) === null || _a === void 0 ? void 0 : _a.accessToken);
        }
        if (paths[0] == "ui") {
            return handleUIRequest(req, (_b = session === null || session === void 0 ? void 0 : session.accessToken) === null || _b === void 0 ? void 0 : _b.accessToken);
        }
        if (paths[0] == "file" && req.method == "POST") {
            return handleAttachmentUpload(req, (_c = session === null || session === void 0 ? void 0 : session.accessToken) === null || _c === void 0 ? void 0 : _c.accessToken);
        }
        if (paths[0] == "file" && req.method == "GET") {
            return handleAttachmentDownload(req, (_d = session === null || session === void 0 ? void 0 : session.accessToken) === null || _d === void 0 ? void 0 : _d.accessToken);
        }
        const data = {
            message: "Invaid Resource Path",
        };
        return Response.json(data, { status: 200 });
    };
}
export default CoreAPIHandler;
async function handleDataRequest(req, accessToken) {
    var _a, _b, _c, _d, _e;
    try {
        const url = `${process.env.CORE_DATA_URL}/v1/${req.url.split("/api/core/data/")[1]}`;
        const headers = new AxiosHeaders();
        headers.set("Content-Type", "application/json");
        if (req.headers.has("prefer")) {
            headers.set("prefer", req.headers.get("prefer"));
        }
        console.log("HEADER ::: ", req.headers.get("prefer"));
        const config = {
            method: req.method,
            url,
        };
        // Only add body for applicable methods
        if (["POST", "PUT", "PATCH"].includes(req.method)) {
            config.data = await req.json();
        }
        if (accessToken) {
            headers.set("Authorization", `Bearer ${accessToken}`);
        }
        else {
            const secret = process.env.NXP_SECRECT;
            if (!secret) {
                throw new Error("NXP_SECRECT environment variable is not set");
            }
            const site_id = process.env.NXP_SITE_ID;
            if (!secret) {
                throw new Error("NXP_SITE_ID environment variable is not set");
            }
            const timestamp = Math.floor(Date.now() / 1000).toString();
            const body = config.data ? JSON.stringify(config.data) : "";
            const payload = `${timestamp}.${body}`;
            const signature = await crypto.subtle
                .importKey("raw", new TextEncoder().encode(secret), "HMAC", false, [
                "sign",
            ])
                .then((key) => crypto.subtle.sign("SHA-256", key, new TextEncoder().encode(payload)))
                .then((buffer) => Array.from(new Uint8Array(buffer))
                .map((b) => b.toString(16).padStart(2, "0"))
                .join(""));
            headers.set("X-Timestamp", timestamp);
            headers.set("X-Signature", signature);
            headers.set("X-SiteId", site_id);
        }
        config.headers = headers;
        const resp = await axios(config);
        return req.method === "DELETE"
            ? Response.json({ message: "Successfully deleted the record!" })
            : Response.json(Object.assign({}, resp.data));
    }
    catch (e) {
        console.error(e);
        let message;
        if (isAxiosError(e)) {
            console.log(e.response);
            message = (_c = (_b = (_a = e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message;
            return new Response(message !== null && message !== void 0 ? message : "Something went wrong", {
                status: (_e = (_d = e.response) === null || _d === void 0 ? void 0 : _d.status) !== null && _e !== void 0 ? _e : 500,
            });
        }
        return new Response("Something went wrong", { status: 500 });
    }
}
async function handleUIRequest(req, accessToken) {
    var _a, _b, _c, _d;
    try {
        const url = `${process.env.CORE_UI_URL}/v1/${req.url.split("/api/core/ui/")[1]}`;
        const headers = new AxiosHeaders();
        headers.set("Authorization", `Bearer ${accessToken}`);
        headers.set("Content-Type", "application/json");
        if (req.headers.has("prefer")) {
            headers.set("prefer", req.headers.get("prefer"));
        }
        const config = {
            method: req.method,
            url,
            headers,
        };
        // Only add body for applicable methods
        if (["POST", "PUT", "PATCH"].includes(req.method)) {
            config.data = await req.json();
        }
        const resp = await axios(config);
        return req.method === "DELETE"
            ? Response.json({ message: "Successfully deleted the record" })
            : Response.json(Object.assign({}, resp.data));
    }
    catch (e) {
        console.error(e);
        let message;
        if (isAxiosError(e)) {
            message = (_b = (_a = e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message;
            return new Response(message !== null && message !== void 0 ? message : "Something went wrong", {
                status: (_d = (_c = e.response) === null || _c === void 0 ? void 0 : _c.status) !== null && _d !== void 0 ? _d : 500,
            });
        }
        return new Response("Something went wrong", { status: 500 });
    }
}
async function handleAttachmentUpload(req, accessToken) {
    var _a, _b, _c;
    try {
        const url = `${process.env.CORE_META_URL}/v1/file?ftp=yes`;
        const reader = (_a = req.body) === null || _a === void 0 ? void 0 : _a.getReader();
        if (reader) {
            const stream = new Readable({
                async read() {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            this.push(null);
                            break;
                        }
                        this.push(Buffer.from(value));
                    }
                },
            });
            const headers = new AxiosHeaders();
            headers.set("Authorization", `Bearer ${accessToken}`);
            headers.set("Content-Type", "application/octet-stream");
            const resp = await axios({
                method: req.method,
                url,
                headers: headers,
                data: stream,
            });
            return Response.json(Object.assign({}, resp.data));
        }
        else {
            return new Response("Something went wrong", { status: 500 });
        }
    }
    catch (e) {
        let message;
        if (isAxiosError(e)) {
            console.log((_b = e.response) === null || _b === void 0 ? void 0 : _b.data);
            message = (_c = e.response) === null || _c === void 0 ? void 0 : _c.data.message;
            return new Response(message !== null && message !== void 0 ? message : "Something went wrong", {
                status: 500,
            });
        }
        return new Response("Something went wrong", { status: 500 });
    }
}
async function handleAttachmentDownload(req, accessToken) {
    var _a, _b, _c, _d, _e, _f;
    try {
        const url = `${process.env.CORE_META_URL}/v1/${req.url.split("/api/core/")[1]}`;
        const headers = new AxiosHeaders();
        headers.set("Authorization", `Bearer ${accessToken}`);
        if (req.headers.has("prefer")) {
            headers.set("prefer", req.headers.get("prefer"));
        }
        const config = {
            method: "GET",
            url,
            headers,
            responseType: "stream",
        };
        const resp = await axios(config);
        const contentType = resp.headers["content-type"] || "application/octet-stream";
        const contentDisposition = resp.headers["content-disposition"] || "attachment";
        return new Response(resp.data, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": contentDisposition,
            },
        });
    }
    catch (e) {
        if (isAxiosError(e)) {
            console.error((_a = e.response) === null || _a === void 0 ? void 0 : _a.data);
        }
        let message;
        if (isAxiosError(e)) {
            message = (_d = (_c = (_b = e.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message;
            return new Response(message !== null && message !== void 0 ? message : "Something went wrong", {
                status: (_f = (_e = e.response) === null || _e === void 0 ? void 0 : _e.status) !== null && _f !== void 0 ? _f : 500,
            });
        }
        return new Response("Something went wrong", { status: 500 });
    }
}
