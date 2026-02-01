import axios, { AxiosHeaders, isAxiosError } from "axios";
import { UIPermission } from "../types";

export class DataCore {
  private filters: Record<string, any> = {};
  private headers: InstanceType<typeof AxiosHeaders> = new AxiosHeaders();

  private fields: string[] = [];

  private entity: string;
  private scope: string;

  private prefer: string[] = [];

  private url?: string;

  private token?: string;

  constructor(entity?: string, scope?: string, token?: string) {
    this.entity = entity ?? "";
    this.scope = scope ?? "core";

    this.token = token;

    if (token) {
      if (typeof window === "object") {
        throw Error("Authentication Issue.");
      }
    }
  }

  private isServerSide = () => {
    return !(typeof window === "object");
  };

  select(...fields: string[]) {
    this.fields.push(...fields);
    return this;
  }

  order(key: string, ascending: boolean = true) {
    this.filters["order"] = `${key}.${ascending ? "asc" : "desc"}`;
    return this;
  }

  limit(count: number) {
    this.filters["limit"] = `${count}`;
    return this;
  }

  offset(count: number) {
    this.filters["offset"] = `${count}`;
    return this;
  }

  eq(key: string, value: string | number) {
    this.filters[key] = `eq.${encodeURIComponent(value)}`;
    return this;
  }

  neq(key: string, value: string | number) {
    this.filters[key] = `neq.${encodeURIComponent(value)}`;
    return this;
  }

  lt(key: string, value: string) {
    this.filters[key] = `lt.${value}`;
    return this;
  }

  lte(key: string, value: string) {
    this.filters[key] = `lte.${value}`;
    return this;
  }

  gt(key: string, value: string) {
    this.filters[key] = `gt.${value}`;
    return this;
  }

  gte(key: string, value: string) {
    this.filters[key] = `gte.${value}`;
    return this;
  }

  between(key: string, value: string, value1: string) {
    this.filters[key] = `and=(a.gte.${value},a.lte.${value1})`;
    return this;
  }

  notBetween(key: string, value: string, value1: string) {
    this.filters[key] = `not.and=(a.gte.${value},a.lte.${value1})`;
    return this;
  }

  ilike(key: string, value: string) {
    this.filters[key] = `ilike.*%${value.split(" ").join("%")}%`;
    return this;
  }

  plfts(key: string, value: string) {
    this.filters[key] = `phfts(english).${encodeURIComponent(value)}`;
    return this;
  }

  cs(key: string, value: string) {
    this.filters[key] = `cs.{${encodeURIComponent(value.split(" ").join())}}`;
    return this;
  }

  like(key: string, value: string) {
    this.filters[key] = `like.*${encodeURIComponent(value)}*`;
    return this;
  }

  not_like(key: string, value: string) {
    this.filters[key] = `not.like.*${encodeURIComponent(value)}*`;
    return this;
  }

  startWith(key: string, value: string) {
    this.filters[key] = `like.${encodeURIComponent(value)}*`;
    return this;
  }

  endWith(key: string, value: string) {
    this.filters[key] = `like.*${encodeURIComponent(value)}`;
    return this;
  }

  in(key: string, values: (string | number)[]) {
    const list = values.map((v) => encodeURIComponent(v)).join(",");

    this.filters[key] = `in.(${list})`;
    return this;
  }

  contains(key: string, values: (string | number)[], negative?: boolean) {
    const list = values.map((v) => encodeURIComponent(v)).join(",");
    this.filters[key] = `${negative ? "not.cs" : "cs"}.{${list}}`;
    return this;
  }

  isNull(key: string) {
    this.filters[key] = `is.null`;
    return this;
  }

  or(conditions: string[]) {
    this.filters["or"] = `(${conditions.join(",")})`;
    return this;
  }

  and(conditions: string[]) {
    this.filters["and"] = `(${conditions.join(",")})`;
    return this;
  }

  extends(refFieldName: string, refEntityFields: string[]) {
    const q = `${refFieldName.trim()}(${refEntityFields.join(",")})`;

    this.fields.push(q);

    return this;
  }

  includeCount() {
    this.headers.set("Prefer", "count=exact");
    return this;
  }

  private queryPreProcess() {
    if (this.fields.length > 0) {
      this.filters["select"] = this.fields.join(",");
    }
  }

  private async setServerSide() {
    if (!this.token) {
      const secret = process.env.NXP_SECRECT;
      if (!secret) {
        throw new Error("NXP_SECRECT environment variable is not set");
      }

      const site_id = process.env.NXP_SITE_ID;

      if (!secret) {
        throw new Error("NXP_SITE_ID environment variable is not set");
      }

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = this._payload ? JSON.stringify(this._payload) : "";
      const payload = `${timestamp}.${body}`;

      const signature = await crypto.subtle
        .importKey(
          "raw",
          new TextEncoder().encode(secret),
          { name: "HMAC", hash: { name: "SHA-256" } },
          false,
          ["sign"],
        )
        .then((key) =>
          crypto.subtle.sign("SHA-256", key, new TextEncoder().encode(payload)),
        )
        .then((buffer) =>
          Array.from(new Uint8Array(buffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(""),
        );

      this.headers.set("X-Timestamp", timestamp);
      this.headers.set("X-Signature", signature);
      this.headers.set("X-SiteId", site_id);

      return;
    }

    this.headers.set("Authorization", `Bearer ${this.token}`);
  }

  async allowRowOperations(data: {
    operation: "delete" | "update";
    id_value: string;
    id_field?: string;
    payload?: Record<string, any>;
  }) {
    if (this.isServerSide()) {
      await this.setServerSide();
      this.url = `${process.env.CORE_UI_URL}/check-row-operation`;
    } else {
      this.url = `/api/core/ui/check-row-operation`;
    }
    return new Promise<boolean>((res, rej) =>
      axios
        .post<{
          status: string;
          data: boolean;
        }>(
          `${this.url}`,
          { ...data, scope: this.scope, table: this.entity },
          {
            headers: this.headers,
          },
        )
        .then((resp) => res(resp.data.data))
        .catch((e) => rej(e)),
    );
  }

  async allowOperations() {
    if (this.isServerSide()) {
      await this.setServerSide();
      this.url = `${process.env.CORE_UI_URL}/v1/allow-operations`;
    } else {
      this.url = `/api/core/ui/allow-operations`;
    }

    return new Promise<
      Record<string, Record<string, Record<string, string[]>>>
    >((res, rej) =>
      axios
        .get<{
          data: Record<string, Record<string, Record<string, string[]>>>;
        }>(`${this.url}`, {
          headers: this.headers,
        })
        .then((resp) => res(resp.data.data))
        .catch((e) => {
          if (isAxiosError(e)) {
            console.log(JSON.stringify(e.response?.data));
          }

          rej(e);
        }),
    );
  }

  async allowOperation(operation: "SELECT" | "INSERT" | "DELETE" | "UPDATE") {
    if (this.isServerSide()) {
      await this.setServerSide();
      this.url = `${process.env.CORE_UI_URL}/v1/allow-operations?scopes=${this.scope}&tables=${this.entity}&operations=${operation}`;
    } else {
      this.url = `/api/core/ui/allow-operations?scopes=${this.scope}&tables=${this.entity}&operations=${operation}`;
    }

    return new Promise<UIPermission>((res, rej) =>
      axios
        .get<{
          data: Record<string, Record<string, Record<string, string[]>>>;
        }>(`${this.url}`, {
          headers: this.headers,
        })
        .then((resp) => {
          const perm = resp.data.data;
          let allow = false;
          let columns: string[] = [];

          if (
            perm &&
            perm[this.scope] &&
            perm[this.scope][this.entity] &&
            perm[this.scope][this.entity][operation] &&
            perm[this.scope][this.entity][operation].length > 0
          ) {
            allow = true;
            columns = perm[this.scope][this.entity][operation];
          }

          res({
            columns: columns,
            entity: this.entity,
            operation: operation,
            scope: this.scope,
            allow: allow,
          });
        })
        .catch((e) => rej(e)),
    );
  }

  async allowRead() {
    return this.allowOperation("SELECT");
  }

  async allowInsert() {
    return this.allowOperation("INSERT");
  }

  async allowUpdate() {
    return this.allowOperation("UPDATE");
  }

  async allowDelete() {
    return this.allowOperation("DELETE");
  }

  allowPermission() {
    return new Promise<{
      read: UIPermission;
      insert: UIPermission;
      update: UIPermission;
      delete: UIPermission;
    }>((res) => {
      Promise.all([
        this.allowRead(),
        this.allowInsert(),
        this.allowUpdate(),
        this.allowDelete(),
      ]).then(([read, insert, update, delete_]) => {
        res({ read, insert, update, delete: delete_ });
      });
    });
  }

  private _payload?: Record<string, any>;

  payload(data: Record<string, any>) {
    this._payload = data;
    return this;
  }

  async query(): Promise<{ data: Record<string, any>[]; count?: number }> {
    if (this.isServerSide()) {
      this.url = `${process.env.CORE_DATA_URL}/v1/${this.scope ?? "core"}/${
        this.entity
      }`;

      await this.setServerSide();
    } else {
      this.url = `/api/core/data/${this.scope ?? "core"}/${this.entity}`;
    }

    this.headers.set("prefer", "count=exact");

    this.queryPreProcess();

    return new Promise<{ data: Record<string, any>[]; count?: number }>(
      (res, rej) =>
        axios
          .get<{ data: Record<string, any>[]; count?: number }>(`${this.url}`, {
            params: this.filters,
            headers: this.headers,
          })
          .then((resp) => res(resp.data))
          .catch((e) => {
            console.log(e?.response);
            rej(e);
          }),
    );
  }

  async queryByCoreId(core_id: string): Promise<Record<string, any>> {
    if (this.isServerSide()) {
      this.url = `${process.env.CORE_DATA_URL}/v1/${this.scope ?? "core"}/${
        this.entity
      }`;
      await this.setServerSide();
    } else {
      this.url = `/api/core/data/${this.scope ?? "core"}/${this.entity}`;
    }

    this.queryPreProcess();
    this.filters["core_id"] = `eq.${encodeURIComponent(core_id)}`;

    return new Promise<Record<string, any>>((res, rej) =>
      axios
        .get<{ data: Record<string, any>[] }>(`${this.url}`, {
          params: this.filters,
          headers: this.headers,
        })
        .then((resp) => res(resp.data.data[0]))
        .catch((e) => rej(e)),
    );
  }

  async insert(): Promise<Record<string, any>[]> {
    if (this.isServerSide()) {
      await this.setServerSide();
      this.url = `${process.env.CORE_DATA_URL}/v1/${this.scope ?? "core"}/${
        this.entity
      }`;
    } else {
      this.url = `/api/core/data/${this.scope ?? "core"}/${this.entity}`;
    }

    this.headers.set("prefer", "tx=commit,return=representation");

    if (!this._payload) {
      throw new Error("Payload value should be set.");
    }

    return new Promise<Record<string, any>[]>((res, rej) =>
      axios
        .post<{ data: Record<string, any>[] }>(`${this.url}`, this._payload, {
          params: this.filters,
          headers: this.headers,
        })
        .then((resp) => res(resp.data.data))
        .catch((e) => rej(e)),
    );
  }

  async update(): Promise<Record<string, any>[]> {
    if (this.isServerSide()) {
      await this.setServerSide();
      this.url = `${process.env.CORE_DATA_URL}/v1/${this.scope ?? "core"}/${
        this.entity
      }`;
    } else {
      this.url = `/api/core/data/${this.scope ?? "core"}/${this.entity}`;
    }

    if (!this._payload) {
      throw new Error("Payload value should be set.");
    }

    this.headers.set("prefer", "tx=commit,return=representation");

    return new Promise<Record<string, any>[]>((res, rej) =>
      axios
        .put<Record<string, any>[]>(`${this.url}`, this._payload, {
          params: this.filters,
          headers: this.headers,
        })
        .then((resp) => res(resp.data))
        .catch((e) => rej(e)),
    );
  }

  async updateById(coreId: string): Promise<{ data: Record<string, any>[] }> {
    if (this.isServerSide()) {
      await this.setServerSide();
      this.url = `${process.env.CORE_DATA_URL}/v1/${this.scope ?? "core"}/${
        this.entity
      }`;
    } else {
      this.url = `/api/core/data/${this.scope ?? "core"}/${this.entity}`;
    }
    this.eq("core_id", coreId);

    if (!this._payload || !this.filters) {
      throw new Error("Payload value should be set.");
    }

    this.headers.set("prefer", "tx=commit,return=representation");

    return new Promise<{ data: Record<string, any>[] }>((res, rej) =>
      axios
        .patch<{ data: Record<string, any>[] }>(`${this.url}`, this._payload, {
          params: this.filters,
          headers: this.headers,
        })
        .then((resp) => {
          if (resp.data.data.length > 0) {
            res(resp.data);
          } else {
            rej("Not allow");
          }
        })
        .catch((e) => rej(e)),
    );
  }

  async upsert(on_conflict: string[]): Promise<Record<string, any>[]> {
    if (this.isServerSide()) {
      await this.setServerSide();
      this.url = `${process.env.CORE_DATA_URL}/v1/${this.scope ?? "core"}/${
        this.entity
      }`;
    } else {
      this.url = `/api/core/data/${this.scope ?? "core"}/${this.entity}`;
    }

    this.headers.set(
      "prefer",
      "tx=commit,resolution=merge-duplicates,missing=default,return=representation",
    );

    if (on_conflict.length > 0) {
      this.filters["on_conflict"] = `${on_conflict.join(",")}`;
    }

    return new Promise<Record<string, any>[]>((res, rej) =>
      axios
        .post<{ data: Record<string, any>[] }>(`${this.url}`, this._payload, {
          params: this.filters,
          headers: this.headers,
        })
        .then((resp) => res(resp.data.data))
        .catch((e) => rej(e)),
    );
  }

  async deleteById(coreId: string): Promise<Record<string, any>[]> {
    if (this.isServerSide()) {
      await this.setServerSide();
      this.url = `${process.env.CORE_DATA_URL}/v1/${this.scope ?? "core"}/${
        this.entity
      }`;
    } else {
      this.url = `/api/core/data/${this.scope ?? "core"}/${this.entity}`;
    }

    this.eq("core_id", coreId);

    this.headers.set("prefer", "tx=commit");

    return new Promise<Record<string, any>[]>((res, rej) =>
      axios
        .delete<Record<string, any>[]>(`${this.url}`, {
          params: this.filters,
          headers: this.headers,
        })
        .then((resp) => res(resp.data))
        .catch((e) => rej(e)),
    );
  }

  async delete(): Promise<Record<string, any>[]> {
    if (this.isServerSide()) {
      await this.setServerSide();
      this.url = `${process.env.CORE_DATA_URL}/v1/${this.scope ?? "core"}/${
        this.entity
      }`;
    } else {
      this.url = `/api/core/data/${this.scope ?? "core"}/${this.entity}`;
    }

    if (Object.keys(this.filters ?? {}).length == 0) {
      throw new Error("at least one filter value should be there");
    }

    this.headers.set("prefer", "tx=commit");

    return new Promise<Record<string, any>[]>((res, rej) =>
      axios
        .delete<Record<string, any>[]>(`${this.url}`, {
          params: this.filters,
          headers: this.headers,
        })
        .then((resp) => res(resp.data))
        .catch((e) => rej(e)),
    );
  }

  // check functions
  async checkInsert(): Promise<Record<string, any>[]> {
    if (this.isServerSide()) {
      await this.setServerSide();
      this.url = `${process.env.CORE_DATA_URL}/v1/${this.scope ?? "core"}/${
        this.entity
      }`;
    } else {
      this.url = `/api/core/data/${this.scope ?? "core"}/${this.entity}`;
    }

    if (!this._payload) {
      throw new Error("Payload value should be set.");
    }
    this.headers.set("prefer", "return=representation");

    return new Promise<Record<string, any>[]>((res, rej) =>
      axios
        .post<{ data: Record<string, any>[] }>(`${this.url}`, this._payload, {
          params: this.filters,
          headers: this.headers,
        })
        .then((resp) => res(resp.data.data))
        .catch((e) => rej(e)),
    );
  }

  async checkUpdateById(coreId: string): Promise<Record<string, any>[]> {
    if (this.isServerSide()) {
      await this.setServerSide();
      this.url = `${process.env.CORE_DATA_URL}/v1/${this.scope ?? "core"}/${
        this.entity
      }`;
    } else {
      this.url = `/api/core/data/${this.scope ?? "core"}/${this.entity}`;
    }

    this.eq("core_id", coreId);

    if (!this._payload || !this.filters) {
      throw new Error("Payload value should be set.");
    }

    this.headers.set("prefer", "return=representation");

    return new Promise<Record<string, any>[]>((res, rej) =>
      axios
        .patch<Record<string, any>[]>(`${this.url}`, this._payload, {
          params: this.filters,
          headers: this.headers,
        })
        .then((resp) => res(resp.data))
        .catch((e) => rej(e)),
    );
  }

  async chcekUpsert(): Promise<Record<string, any>[]> {
    if (this.isServerSide()) {
      await this.setServerSide();
      this.url = `${process.env.CORE_DATA_URL}/v1/${this.scope ?? "core"}/${
        this.entity
      }`;
    } else {
      this.url = `/api/core/data/${this.scope ?? "core"}/${this.entity}`;
    }

    this.headers.set("prefer", "return=representation");
    return new Promise<Record<string, any>[]>((res, rej) =>
      axios
        .get<Record<string, any>[]>(`${this.url}`, {
          params: this.filters,
          headers: this.headers,
        })
        .then((resp) => res(resp.data))
        .catch((e) => rej(e)),
    );
  }

  async checkDeleteById(coreId: string): Promise<Record<string, any>[]> {
    if (this.isServerSide()) {
      await this.setServerSide();
      this.url = `${process.env.CORE_DATA_URL}/v1/${this.scope ?? "core"}/${
        this.entity
      }`;
    } else {
      this.url = `/api/core/data/${this.scope ?? "core"}/${this.entity}`;
    }

    this.eq("core_id", coreId);

    return new Promise<Record<string, any>[]>((res, rej) =>
      axios
        .delete<Record<string, any>[]>(`${this.url}`, {
          params: this.filters,
          headers: this.headers,
        })
        .then((resp) => res(resp.data))
        .catch((e) => rej(e)),
    );
  }
}
