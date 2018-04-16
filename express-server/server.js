"use strict";

const
    express = require("express"),
    proxy = require("http-proxy-middleware"),
    colors = require("colors/safe");

function logFn (req, err) {
    let t = new Date(),
        tz = t.getTimezoneOffset(),
        fmt = el => el < 10 ? "0" + el.toString() : el,
        args = [];
    tz = (tz < 0 ? "+" : "-") +
        ("00" + Math.floor(Math.abs(tz) / 60)).slice(-2) +
        ("00" + (Math.abs(tz) % 60)).slice(-2);

    // time format e.g. 2017/06/30 18:00:46.423 +0800
    t = [t.getFullYear(), t.getMonth() + 1, t.getDate()].map(fmt).join("/") +
        " " + [t.getHours(), t.getMinutes(), t.getSeconds()].map(fmt).join(":") +
        "." + t.getMilliseconds() + " " + tz;
    args.push(`[${t}]`, `"${colors.cyan(req.method)} ${colors.cyan(req.url)}"`);
    if (err) {
        args.pop();
        args.push(`"${colors.red(req.method)} ${colors.red(req.url)}${colors.red("(" + err + ")")}"`);
    }
    args.push(`"${req.headers["user-agent"]}"`);

    console.log.apply(console.log, args);
}

module.exports = {
    start: function (args) {
        var app = express();
        app.use(function (req, res, next) {
            logFn(req);
            next();
        });
        app.use(function (err, req, res, next) {
            logFn(req, err);
            next();
        });
        if (args.hasProxy()) {
            Object.keys(args.proxy).forEach(ctx => {
                if (ctx) {
                    app.use(new RegExp(ctx), proxy({
                        target: args.proxy[ctx],
                        secure: false,
                        changeOrigin: true
                    }));
                }
            });
        }
        var staticServe = express.static(args.root);
        app.use(function (req, res, next) {
            staticServe(req, res, function (err) {
                err = err || "404 - Not Found";
                logFn(req, err);
                next();
            });
        });

        console.log("> Starting web server...");
        app.listen(args.port, function () {
            console.log("> Listening at " + colors.yellow(args.origin));
            if (args.open) {
                console.log("start up url:", colors.green(args.open));
                let fs = require("fs"),
                    timer;

                timer = setInterval(function () {
                    // wait fis build complete
                    if (fs.existsSync(args.root)) {
                        require("opn")(args.open);
                        clearInterval(timer);
                    }
                }, 50);
            }
        });
    }
};