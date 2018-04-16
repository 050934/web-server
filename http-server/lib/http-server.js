'use strict';

var fs = require('fs'),
    union = require('union'),
    ecstatic = require('ecstatic'),
    httpProxy = require('http-proxy'),
    corser = require('corser');

//
// Remark: backwards compatibility for previous
// case convention of HTTP
//
exports.HttpServer = exports.HTTPServer = HttpServer;

/**
 * Returns a new instance of HttpServer with the
 * specified `options`.
 */
exports.createServer = function (options) {
  return new HttpServer(options);
};

/**
 * Constructor function for the HttpServer object
 * which is responsible for serving static files along
 * with other HTTP-related features.
 */
function HttpServer(options) {
  options = options || {};

  if (options.root) {
    this.root = options.root;
  }
  else {
    try {
      fs.lstatSync('./public');
      this.root = './public';
    }
    catch (err) {
      this.root = './';
    }
  }

  this.headers = options.headers || {};

  this.cache = options.cache === undefined ? 3600 : options.cache; // in seconds.
  this.showDir = options.showDir !== 'false';
  this.autoIndex = options.autoIndex !== 'false';
  this.showDotfiles = options.showDotfiles;
  this.gzip = options.gzip === true;
  this.contentType = options.contentType || 'application/octet-stream';

  if (options.ext) {
    this.ext = options.ext === true
      ? 'html'
      : options.ext;
  }

  var before = options.before ? options.before.slice() : [];

  before.push(function (req, res) {
    if (options.logFn) {
      options.logFn(req, res);
    }

    res.emit('next');
  });

  if (options.cors) {
    this.headers['Access-Control-Allow-Origin'] = '*';
    this.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Range';
    if (options.corsHeaders) {
      options.corsHeaders.split(/\s*,\s*/)
          .forEach(function (h) { this.headers['Access-Control-Allow-Headers'] += ', ' + h; }, this);
    }
    before.push(corser.create(options.corsHeaders ? {
      requestHeaders: this.headers['Access-Control-Allow-Headers'].split(/\s*,\s*/)
    } : null));
  }

  if (options.robots) {
    before.push(function (req, res) {
      if (req.url === '/robots.txt') {
        res.setHeader('Content-Type', 'text/plain');
        var robots = options.robots === true
          ? 'User-agent: *\nDisallow: /'
          : options.robots.replace(/\\n/, '\n');

        return res.end(robots);
      }

      res.emit('next');
    });
  }

  before.push(ecstatic({
    root: this.root,
    cache: this.cache,
    showDir: this.showDir,
    showDotfiles: this.showDotfiles,
    autoIndex: this.autoIndex,
    defaultExt: this.ext,
    gzip: this.gzip,
    contentType: this.contentType,
    handleError: false
  }));

  let proxyOpts = options.proxy;
  if (typeof proxyOpts === 'string' ||
    Object.prototype.toString.call(proxyOpts) === "[object Object]") {
    
    let proxy = httpProxy.createProxyServer({}),
        proxyFn,
        urls;
    if (typeof proxyOpts === "string") {
      proxyOpts = {
        "": proxyOpts
      };
    }
    urls = Object.keys(proxyOpts);
    urls.forEach(url => {
      proxyOpts[url] = {
        reg: url && new RegExp(url),
        target: proxyOpts[url]
      };
    });

    proxyFn = function (req, res, target) {
      proxy.web(req, res, {
        target: target,
        changeOrigin: true
      }, function (err) {
        if (err && options.logFn) {
          err.status = err.status || err.statusCode || 500;
          options.logFn(req, res, err);
          res.writeHead(err.status, {
            "Content-Type": "text/plain;charset=UTF-8"
          });
          res.end(`${req.method} ${req.url}, Error (${err.status}): ${err.message}`);
        }
      });
    };

    before.push(function (req, res) {
      for (let i = 0; i < urls.length; i++) {
        let obj = proxyOpts[urls[i]],
            reg = obj.reg,
            target = obj.target;

        if (!reg || reg.test(req.url)) {
          proxyFn(req, res, target);
          return;
        }
      }
      res.emit("next");
    });
  }

  var serverOptions = {
    before: before,
    headers: this.headers,
    onError: function (err, req, res) {
      if (options.logFn) {
        options.logFn(req, res, err);
      }

      res.writeHead(err.status, {
        "Content-Type": "text/plain;charset=UTF-8"
      });
      res.end(`${req.method} ${req.url}, Error (${err.status}): ${err.message}`);
    }
  };

  if (options.https) {
    serverOptions.https = options.https;
  }

  this.server = union.createServer(serverOptions);
}

HttpServer.prototype.listen = function () {
  this.server.listen.apply(this.server, arguments);
};

HttpServer.prototype.close = function () {
  return this.server.close();
};
