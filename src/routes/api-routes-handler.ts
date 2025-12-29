"use server";
import axios, { AxiosHeaders, isAxiosError } from "axios";
import { AuthOptions, getServerSession } from "next-auth";
import { Readable } from "stream";

function CoreAPIHandler(options: AuthOptions): any;

function CoreAPIHandler(options: AuthOptions) {
  return async (
    req: Request,
    { params }: { params: Promise<{ paths: string[] }> }
  ) => {
    const { paths } = await params;

    console.log('path', params)

    const session = await getServerSession<any, any>(options);

    if (!session) {
      return new Response("Autentication Error", { status: 401 });
    }

    const data = {
      message: "Invaid path",
    };

    if (paths[0] == "data") {
      return handleDataRequest(req, session.accessToken.accessToken);
    }

    if (paths[0] == "ui") {
      return handleUIRequest(req, session.accessToken.accessToken);
    }

    if (paths[0] == "file" && req.method == "POST") {
      return handleAttachmentUpload(req, session.accessToken.accessToken);
    }

    if (paths[0] == "file" && req.method == "GET") {
      return handleAttachmentDownload(req, session.accessToken.accessToken);
    }

    return Response.json(data, { status: 200 });
  };
}

export default CoreAPIHandler;

async function handleDataRequest(req: Request, accessToken: string) {
  try {
    const url = `${process.env.CORE_DATA_URL}/v1/${
      req.url.split("/api/core/data/")[1]
    }`;

    const headers = new AxiosHeaders();
    headers.set("Authorization", `Bearer ${accessToken}`);
    headers.set("Content-Type", "application/json");

    if (req.headers.has("prefer")) {
      headers.set("prefer", req.headers.get("prefer"));
    }

    console.log("HEADER ::: ", req.headers.get("prefer"));

    const config: any = {
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
      ? Response.json({ message: "Successfully deleted the record!" })
      : Response.json({ ...resp.data });
  } catch (e) {
    console.error(e);
    let message;
    if (isAxiosError(e)) {
      console.log(e.response);
      message = e.response?.data?.data?.message;
      return new Response(message ?? "Something went wrong", {
        status: e.response?.status ?? 500,
      });
    }
    return new Response("Something went wrong", { status: 500 });
  }
}

async function handleUIRequest(req: Request, accessToken: string) {
  try {
    const url = `${process.env.CORE_UI_URL}/v1/${
      req.url.split("/api/core/ui/")[1]
    }`;

    const headers = new AxiosHeaders();
    headers.set("Authorization", `Bearer ${accessToken}`);
    headers.set("Content-Type", "application/json");

    if (req.headers.has("prefer")) {
      headers.set("prefer", req.headers.get("prefer"));
    }

    const config: any = {
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
      : Response.json({ ...resp.data });
  } catch (e) {
    console.error(e);
    let message;
    if (isAxiosError(e)) {
      message = e.response?.data?.message;
      return new Response(message ?? "Something went wrong", {
        status: e.response?.status ?? 500,
      });
    }
    return new Response("Something went wrong", { status: 500 });
  }
}

async function handleAttachmentUpload(req: Request, accessToken: string) {
  try {
    const url = `${process.env.CORE_DATA_URL}/v1/file?ftp=yes`;

    const reader = req.body?.getReader();

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

      return Response.json({ ...resp.data });
    } else {
      return new Response("Something went wrong", { status: 500 });
    }
  } catch (e) {
    console.error(e)
    let message;
    if (isAxiosError(e)) {
      console.log(e.response);

      message = e.response?.data.message;
      return new Response(message ?? "Something went wrong", {
        status: 500,
      });
    }
    return new Response("Something went wrong", { status: 500 });
  }
}

async function handleAttachmentDownload(req: Request, accessToken: string) {
  try {
    const url = `${process.env.CORE_DATA_URL}/v1/${
      req.url.split("/api/core/")[1]
    }`;

    const headers = new AxiosHeaders();
    headers.set("Authorization", `Bearer ${accessToken}`);

    if (req.headers.has("prefer")) {
      headers.set("prefer", req.headers.get("prefer"));
    }

    const config: any = {
      method: "GET",
      url,
      headers,
      responseType: "stream",
    };

    const resp = await axios(config);

    const contentType =
      resp.headers["content-type"] || "application/octet-stream";
    const contentDisposition =
      resp.headers["content-disposition"] || "attachment";

    return new Response(resp.data as any, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
      },
    });
  } catch (e) {
    if (isAxiosError(e)) {
      console.error(e.response?.data);
    }

    let message;
    if (isAxiosError(e)) {
      message = e.response?.data?.data?.message;
      return new Response(message ?? "Something went wrong", {
        status: e.response?.status ?? 500,
      });
    }
    return new Response("Something went wrong", { status: 500 });
  }
}
