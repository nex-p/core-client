import axios, { AxiosHeaders, isAxiosError } from "axios";
export class DataCore {
    constructor(entity, scope, token) {
        this.filters = {};
        this.headers = new AxiosHeaders();
        this.fields = [];
        this.prefer = [];
        this.isServerSide = () => {
            return !(typeof window === "object");
        };
        this.entity = entity !== null && entity !== void 0 ? entity : "";
        this.scope = scope !== null && scope !== void 0 ? scope : "core";
        this.token = token;
        if (token) {
            if (typeof window === "object") {
                throw Error("Authentication Issue.");
            }
        }
    }
    select(...fields) {
        this.fields.push(...fields);
        return this;
    }
    order(key, ascending = true) {
        this.filters["order"] = `${key}.${ascending ? "asc" : "desc"}`;
        return this;
    }
    limit(count) {
        this.filters["limit"] = `${count}`;
        return this;
    }
    offset(count) {
        this.filters["offset"] = `${count}`;
        return this;
    }
    eq(key, value) {
        this.filters[key] = `eq.${encodeURIComponent(value)}`;
        return this;
    }
    neq(key, value) {
        this.filters[key] = `neq.${encodeURIComponent(value)}`;
        return this;
    }
    lt(key, value) {
        this.filters[key] = `lt.${value}`;
        return this;
    }
    lte(key, value) {
        this.filters[key] = `lte.${value}`;
        return this;
    }
    gt(key, value) {
        this.filters[key] = `gt.${value}`;
        return this;
    }
    gte(key, value) {
        this.filters[key] = `gte.${value}`;
        return this;
    }
    between(key, value, value1) {
        this.filters[key] = `and=(a.gte.${value},a.lte.${value1})`;
        return this;
    }
    notBetween(key, value, value1) {
        this.filters[key] = `not.and=(a.gte.${value},a.lte.${value1})`;
        return this;
    }
    ilike(key, value) {
        this.filters[key] = `ilike.*%${value.split(" ").join("%")}%`;
        return this;
    }
    plfts(key, value) {
        this.filters[key] = `phfts(english).${encodeURIComponent(value)}`;
        return this;
    }
    cs(key, value) {
        this.filters[key] = `cs.{${encodeURIComponent(value.split(" ").join())}}`;
        return this;
    }
    like(key, value) {
        this.filters[key] = `like.*${encodeURIComponent(value)}*`;
        return this;
    }
    not_like(key, value) {
        this.filters[key] = `not.like.*${encodeURIComponent(value)}*`;
        return this;
    }
    startWith(key, value) {
        this.filters[key] = `like.${encodeURIComponent(value)}*`;
        return this;
    }
    endWith(key, value) {
        this.filters[key] = `like.*${encodeURIComponent(value)}`;
        return this;
    }
    in(key, values) {
        const list = values.map((v) => encodeURIComponent(v)).join(",");
        this.filters[key] = `in.(${list})`;
        return this;
    }
    contains(key, values, negative) {
        const list = values.map((v) => encodeURIComponent(v)).join(",");
        this.filters[key] = `${negative ? "not.cs" : "cs"}.{${list}}`;
        return this;
    }
    isNull(key) {
        this.filters[key] = `is.null`;
        return this;
    }
    or(conditions) {
        this.filters["or"] = `(${conditions.join(",")})`;
        return this;
    }
    and(conditions) {
        this.filters["and"] = `(${conditions.join(",")})`;
        return this;
    }
    extends(refFieldName, refEntityFields) {
        const q = `${refFieldName.trim()}(${refEntityFields.join(",")})`;
        this.fields.push(q);
        return this;
    }
    includeCount() {
        this.headers.set("Prefer", "count=exact");
        return this;
    }
    queryPreProcess() {
        if (this.fields.length > 0) {
            this.filters["select"] = this.fields.join(",");
        }
    }
    async setServerSide() {
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
                .importKey("raw", new TextEncoder().encode(secret), "HMAC", false, [
                "sign",
            ])
                .then((key) => crypto.subtle.sign("SHA-256", key, new TextEncoder().encode(payload)))
                .then((buffer) => Array.from(new Uint8Array(buffer))
                .map((b) => b.toString(16).padStart(2, "0"))
                .join(""));
            this.headers.set("X-Timestamp", timestamp);
            this.headers.set("X-Signature", signature);
            this.headers.set("X-SiteId", site_id);
            return;
        }
        this.headers.set("Authorization", `Bearer ${this.token}`);
    }
    async allowRowOperations(data) {
        if (this.isServerSide()) {
            await this.setServerSide();
            this.url = `${process.env.CORE_UI_URL}/check-row-operation`;
        }
        else {
            this.url = `/api/core/ui/check-row-operation`;
        }
        return new Promise((res, rej) => axios
            .post(`${this.url}`, Object.assign(Object.assign({}, data), { scope: this.scope, table: this.entity }), {
            headers: this.headers,
        })
            .then((resp) => res(resp.data.data))
            .catch((e) => rej(e)));
    }
    async allowOperations() {
        if (this.isServerSide()) {
            await this.setServerSide();
            this.url = `${process.env.CORE_UI_URL}/v1/allow-operations`;
        }
        else {
            this.url = `/api/core/ui/allow-operations`;
        }
        return new Promise((res, rej) => axios
            .get(`${this.url}`, {
            headers: this.headers,
        })
            .then((resp) => res(resp.data.data))
            .catch((e) => {
            var _a;
            if (isAxiosError(e)) {
                console.log(JSON.stringify((_a = e.response) === null || _a === void 0 ? void 0 : _a.data));
            }
            rej(e);
        }));
    }
    async allowOperation(operation) {
        if (this.isServerSide()) {
            await this.setServerSide();
            this.url = `${process.env.CORE_UI_URL}/v1/allow-operations?scopes=${this.scope}&tables=${this.entity}&operations=${operation}`;
        }
        else {
            this.url = `/api/core/ui/allow-operations?scopes=${this.scope}&tables=${this.entity}&operations=${operation}`;
        }
        return new Promise((res, rej) => axios
            .get(`${this.url}`, {
            headers: this.headers,
        })
            .then((resp) => {
            const perm = resp.data.data;
            let allow = false;
            let columns = [];
            if (perm &&
                perm[this.scope] &&
                perm[this.scope][this.entity] &&
                perm[this.scope][this.entity][operation] &&
                perm[this.scope][this.entity][operation].length > 0) {
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
            .catch((e) => rej(e)));
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
        return new Promise((res) => {
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
    payload(data) {
        this._payload = data;
        return this;
    }
    async query() {
        var _a, _b;
        if (this.isServerSide()) {
            this.url = `${process.env.CORE_DATA_URL}/v1/${(_a = this.scope) !== null && _a !== void 0 ? _a : "core"}/${this.entity}`;
            await this.setServerSide();
        }
        else {
            this.url = `/api/core/data/${(_b = this.scope) !== null && _b !== void 0 ? _b : "core"}/${this.entity}`;
        }
        this.headers.set("prefer", "count=exact");
        this.queryPreProcess();
        return new Promise((res, rej) => axios
            .get(`${this.url}`, {
            params: this.filters,
            headers: this.headers,
        })
            .then((resp) => res(resp.data))
            .catch((e) => {
            console.log(e === null || e === void 0 ? void 0 : e.response);
            rej(e);
        }));
    }
    async queryByCoreId(core_id) {
        var _a, _b;
        if (this.isServerSide()) {
            this.url = `${process.env.CORE_DATA_URL}/v1/${(_a = this.scope) !== null && _a !== void 0 ? _a : "core"}/${this.entity}`;
            await this.setServerSide();
        }
        else {
            this.url = `/api/core/data/${(_b = this.scope) !== null && _b !== void 0 ? _b : "core"}/${this.entity}`;
        }
        this.queryPreProcess();
        this.filters["core_id"] = `eq.${encodeURIComponent(core_id)}`;
        return new Promise((res, rej) => axios
            .get(`${this.url}`, {
            params: this.filters,
            headers: this.headers,
        })
            .then((resp) => res(resp.data.data[0]))
            .catch((e) => rej(e)));
    }
    async insert() {
        var _a, _b;
        if (this.isServerSide()) {
            await this.setServerSide();
            this.url = `${process.env.CORE_DATA_URL}/v1/${(_a = this.scope) !== null && _a !== void 0 ? _a : "core"}/${this.entity}`;
        }
        else {
            this.url = `/api/core/data/${(_b = this.scope) !== null && _b !== void 0 ? _b : "core"}/${this.entity}`;
        }
        this.headers.set("prefer", "tx=commit,return=representation");
        if (!this._payload) {
            throw new Error("Payload value should be set.");
        }
        return new Promise((res, rej) => axios
            .post(`${this.url}`, this._payload, {
            params: this.filters,
            headers: this.headers,
        })
            .then((resp) => res(resp.data.data))
            .catch((e) => rej(e)));
    }
    async update() {
        var _a, _b;
        if (this.isServerSide()) {
            await this.setServerSide();
            this.url = `${process.env.CORE_DATA_URL}/v1/${(_a = this.scope) !== null && _a !== void 0 ? _a : "core"}/${this.entity}`;
        }
        else {
            this.url = `/api/core/data/${(_b = this.scope) !== null && _b !== void 0 ? _b : "core"}/${this.entity}`;
        }
        if (!this._payload) {
            throw new Error("Payload value should be set.");
        }
        this.headers.set("prefer", "tx=commit,return=representation");
        return new Promise((res, rej) => axios
            .put(`${this.url}`, this._payload, {
            params: this.filters,
            headers: this.headers,
        })
            .then((resp) => res(resp.data))
            .catch((e) => rej(e)));
    }
    async updateById(coreId) {
        var _a, _b;
        if (this.isServerSide()) {
            await this.setServerSide();
            this.url = `${process.env.CORE_DATA_URL}/v1/${(_a = this.scope) !== null && _a !== void 0 ? _a : "core"}/${this.entity}`;
        }
        else {
            this.url = `/api/core/data/${(_b = this.scope) !== null && _b !== void 0 ? _b : "core"}/${this.entity}`;
        }
        this.eq("core_id", coreId);
        if (!this._payload || !this.filters) {
            throw new Error("Payload value should be set.");
        }
        this.headers.set("prefer", "tx=commit,return=representation");
        return new Promise((res, rej) => axios
            .patch(`${this.url}`, this._payload, {
            params: this.filters,
            headers: this.headers,
        })
            .then((resp) => {
            if (resp.data.data.length > 0) {
                res(resp.data);
            }
            else {
                rej("Not allow");
            }
        })
            .catch((e) => rej(e)));
    }
    async upsert(on_conflict) {
        var _a, _b;
        if (this.isServerSide()) {
            await this.setServerSide();
            this.url = `${process.env.CORE_DATA_URL}/v1/${(_a = this.scope) !== null && _a !== void 0 ? _a : "core"}/${this.entity}`;
        }
        else {
            this.url = `/api/core/data/${(_b = this.scope) !== null && _b !== void 0 ? _b : "core"}/${this.entity}`;
        }
        this.headers.set("prefer", "tx=commit,resolution=merge-duplicates,missing=default,return=representation");
        if (on_conflict.length > 0) {
            this.filters["on_conflict"] = `${on_conflict.join(",")}`;
        }
        return new Promise((res, rej) => axios
            .post(`${this.url}`, this._payload, {
            params: this.filters,
            headers: this.headers,
        })
            .then((resp) => res(resp.data.data))
            .catch((e) => rej(e)));
    }
    async deleteById(coreId) {
        var _a, _b;
        if (this.isServerSide()) {
            await this.setServerSide();
            this.url = `${process.env.CORE_DATA_URL}/v1/${(_a = this.scope) !== null && _a !== void 0 ? _a : "core"}/${this.entity}`;
        }
        else {
            this.url = `/api/core/data/${(_b = this.scope) !== null && _b !== void 0 ? _b : "core"}/${this.entity}`;
        }
        this.eq("core_id", coreId);
        this.headers.set("prefer", "tx=commit");
        return new Promise((res, rej) => axios
            .delete(`${this.url}`, {
            params: this.filters,
            headers: this.headers,
        })
            .then((resp) => res(resp.data))
            .catch((e) => rej(e)));
    }
    async delete() {
        var _a, _b, _c;
        if (this.isServerSide()) {
            await this.setServerSide();
            this.url = `${process.env.CORE_DATA_URL}/v1/${(_a = this.scope) !== null && _a !== void 0 ? _a : "core"}/${this.entity}`;
        }
        else {
            this.url = `/api/core/data/${(_b = this.scope) !== null && _b !== void 0 ? _b : "core"}/${this.entity}`;
        }
        if (Object.keys((_c = this.filters) !== null && _c !== void 0 ? _c : {}).length == 0) {
            throw new Error("at least one filter value should be there");
        }
        this.headers.set("prefer", "tx=commit");
        return new Promise((res, rej) => axios
            .delete(`${this.url}`, {
            params: this.filters,
            headers: this.headers,
        })
            .then((resp) => res(resp.data))
            .catch((e) => rej(e)));
    }
    // check functions
    async checkInsert() {
        var _a, _b;
        if (this.isServerSide()) {
            await this.setServerSide();
            this.url = `${process.env.CORE_DATA_URL}/v1/${(_a = this.scope) !== null && _a !== void 0 ? _a : "core"}/${this.entity}`;
        }
        else {
            this.url = `/api/core/data/${(_b = this.scope) !== null && _b !== void 0 ? _b : "core"}/${this.entity}`;
        }
        if (!this._payload) {
            throw new Error("Payload value should be set.");
        }
        this.headers.set("prefer", "return=representation");
        return new Promise((res, rej) => axios
            .post(`${this.url}`, this._payload, {
            params: this.filters,
            headers: this.headers,
        })
            .then((resp) => res(resp.data.data))
            .catch((e) => rej(e)));
    }
    async checkUpdateById(coreId) {
        var _a, _b;
        if (this.isServerSide()) {
            await this.setServerSide();
            this.url = `${process.env.CORE_DATA_URL}/v1/${(_a = this.scope) !== null && _a !== void 0 ? _a : "core"}/${this.entity}`;
        }
        else {
            this.url = `/api/core/data/${(_b = this.scope) !== null && _b !== void 0 ? _b : "core"}/${this.entity}`;
        }
        this.eq("core_id", coreId);
        if (!this._payload || !this.filters) {
            throw new Error("Payload value should be set.");
        }
        this.headers.set("prefer", "return=representation");
        return new Promise((res, rej) => axios
            .patch(`${this.url}`, this._payload, {
            params: this.filters,
            headers: this.headers,
        })
            .then((resp) => res(resp.data))
            .catch((e) => rej(e)));
    }
    async chcekUpsert() {
        var _a, _b;
        if (this.isServerSide()) {
            await this.setServerSide();
            this.url = `${process.env.CORE_DATA_URL}/v1/${(_a = this.scope) !== null && _a !== void 0 ? _a : "core"}/${this.entity}`;
        }
        else {
            this.url = `/api/core/data/${(_b = this.scope) !== null && _b !== void 0 ? _b : "core"}/${this.entity}`;
        }
        this.headers.set("prefer", "return=representation");
        return new Promise((res, rej) => axios
            .get(`${this.url}`, {
            params: this.filters,
            headers: this.headers,
        })
            .then((resp) => res(resp.data))
            .catch((e) => rej(e)));
    }
    async checkDeleteById(coreId) {
        var _a, _b;
        if (this.isServerSide()) {
            await this.setServerSide();
            this.url = `${process.env.CORE_DATA_URL}/v1/${(_a = this.scope) !== null && _a !== void 0 ? _a : "core"}/${this.entity}`;
        }
        else {
            this.url = `/api/core/data/${(_b = this.scope) !== null && _b !== void 0 ? _b : "core"}/${this.entity}`;
        }
        this.eq("core_id", coreId);
        return new Promise((res, rej) => axios
            .delete(`${this.url}`, {
            params: this.filters,
            headers: this.headers,
        })
            .then((resp) => res(resp.data))
            .catch((e) => rej(e)));
    }
}
