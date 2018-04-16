"use strict";

const
    args = require("./args");

if (args.id === "ecstatic") {
    const httpserver = require("./http-server/http-server");
    let argv = require("optimist").boolean("cors").argv;
    argv._[0] = argv._[0] || args.root;
    argv.p = argv.p || args.port;
    if (!argv.o && args.hasOpen()) {
        argv.o = args.open;
        if (argv.o) {
            delete argv.o;
            argv._cb = function () {
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
        }
    }
    if (!argv.proxy && args.hasProxy()) {
        argv.proxy = args.proxy;
    }

    httpserver.start(argv);
} else if (args.id === "express") {
    require("./express-server/server").start(args);
}