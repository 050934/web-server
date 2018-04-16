"use strict";

const
    // server id(ecstatic|express)
    id = process.env.npm_config_webserver_id || process.env["webserver-id"] || "ecstatic",
    protocol = process.env.npm_config_webserver_protocol || process.env["webserver-protocol"] || "http",
    host = process.env.npm_config_webserver_host || process.env["webserver-host"] || "localhost",
    // note use npm key --httpserver-root, not --httpserver_root
    root = process.env.npm_config_webserver_root || process.env["webserver-root"] || "./dist",
    port = Number(process.env.npm_config_webserver_port) ||
        Number(process.env["webserver-port"]) ||
        Number(process.env["PORT"]) || 8082,

    origin = `${protocol}://${host}` + (port !== 80 && port !== 443 ? ":" + port : "");

let proxy = process.env.npm_config_webserver_proxy ||
        process.env["webserver-proxy"] ||
        JSON.stringify({
            "^/api": "http://localhost:8080"
        }),
    proxyTable;

let open = process.env.npm_config_webserver_open;
open = open !== undefined ? open : process.env["webserver-open"];
if (open === "true") {
    open = true;
    open = origin;
} else if (open === "" || open === "false") {
    open = false;
}
// absolute path without origin
if (typeof open === "string" && !/^https?:\/\//.test(open)) {
    open = open.startsWith("/") ? open : ("/" + open);
    open = `${protocol}://${host}:${port}` + open;
}

module.exports = {
    id: id,
    protocol: protocol,
    host: host,
    port: port,
    origin: origin,
    root: root,
    // proxy can be normal string or json object string
    get proxy () {
        if (!this.hasProxy()) {
            return;
        }
        if (!proxyTable) {
            proxyTable = proxy;
            try {
                // proxy object param e.g. {"^/api": "http://localhost:8080"}
                // NOTE cmd quote & ^ issue, we use single quote
                // JSON string only support double quote
                // npm run dev --webserver-port=8083 --webserver-proxy="{'^/api': 'http://localhost:8080'}"
                proxyTable = JSON.parse(proxyTable.replace(/'/g, "\""));
                if (typeof proxyTable ===  "string") {
                    proxyTable = {"": proxyTable};
                }
            } catch (e) {}
        }
        return proxyTable;
    },
    open: open,
    hasOpen: function () {
        return open !== undefined;
    },
    hasProxy: function () {
        return proxy !== undefined;
    }
};