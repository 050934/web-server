const
    httpserver = require("./http-server/http-server"),
    // note use npm key --httpserver-root, not --httpserver_root
    root = process.env.npm_config_httpserver_root || process.env["httpserver-root"] || "./dist",
    port = Number(process.env.npm_config_httpserver_port) ||
        Number(process.env["httpserver-port"]) ||
        Number(process.env["PORT"]) || 8082;
    proxy = process.env.npm_config_httpserver_proxy || process.env["httpserver-proxy"];

let open = process.env.npm_config_httpserver_open;
open = open !== undefined ? open : process.env["httpserver-open"];
if (open === "true") {
    open = true;
} else if (open === "" || open === "false") {
    open = false;
}
// absolute path without origin
if (typeof open === "string" && !/^https?:\/\//.test(open)) {
    open = open.startsWith("/") ? open : ("/" + open);
    open = `http://localhost:${port}` + open;
}

let argv = require("optimist").boolean("cors").argv;
argv._[0] = argv._[0] || root;
argv.p = argv.p || port;
if (!argv.o && open !== undefined) {
    argv.o = open;
}
if (!argv.proxy && proxy) {
    try {
        // proxy object param e.g. {"^/api": "http://localhost:8080"}
        // NOTE cmd quote & ^ issue, we use single quote
        // JSON string only support double quote
        // npm run dev --httpserver-port=8083 --httpserver-proxy="{'^/api': 'http://localhost:8080'}"
        proxy = JSON.parse(proxy.replace(/'/g, "\""));
    } catch (e) {}
    argv.proxy = proxy;
}

httpserver.run(argv);