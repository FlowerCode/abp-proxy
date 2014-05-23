"use strict";

var http = require('http'),
    https = require('https'),
    _ = require('underscore'),
    httpProxy = require('http-proxy'),
    URI = require('URIjs'),
    matcher = require('./matcher').defaultMatcher,
    filterClasses = require('./filterClasses'),
    Filter = filterClasses.Filter,
    fs = require('fs');

var list;

function contentTypeFromRequest(req) {
    var accept = req.headers['accept'] || '';
    accept = accept.toLowerCase().split(',')[0];

    if (accept.indexOf('script') != -1) {
        return "SCRIPT";
    } else if (accept.indexOf('image') != -1) {
        return "IMAGE";
    } else if (accept.indexOf('css') != -1) {
        return "STYLESHEET";
    } else if (accept.indexOf('text') != -1) {
        return "SUBDOCUMENT";
    } else {
        var requestedWith = req.headers['x-requested-with'] || '';

        if (requestedWith.toLowerCase() == 'xmlhttprequest') {
            return "XMLHTTPREQUEST";
        }

        var url = req.url.toLowerCase();

        if (/\.js$/.test(url)) {
            return "SCRIPT";
        } else if (/\.css$/.test(url)) {
            return "STYLESHEET";
        } else if (/\.(?:gif|png|jpe?g|bmp|ico)$/.test(url)) {
            return "IMAGE";
        } else if (/\.(?:ttf|woff)$/.test(url)) {
            return "FONT";
        }  else if (/\.swf$/.test(url)) {
            return "OBJECT";
        }

        return "OTHER";
    }
}

https.get({
        host: 'easylist-downloads.adblockplus.org',
        path: '/easylistchina+easylist.txt'
    },

    function (res) {
        res.on('data', function (chunk) {
            console.log('Received ' + chunk.length + ' bytes');
            list += chunk;
        });
        res.on('end', function () {
            startFiltering();
        });
    });

function startFiltering() {
    list = list.split('\n');
    list.shift();

    do {
        var filter = new Filter.fromText(list.shift());
        if ((filter instanceof filterClasses.BlockingFilter) || (filter instanceof filterClasses.WhitelistFilter)) {
            matcher.add(filter);
        }
    } while (list.length > 0);

    var proxy = new httpProxy.createProxyServer();

    proxy.on('error', function (e) {
        console.log(e);
    });

    var server = http.createServer(function (req, res) {
        var uri = new URI(req.url);
        var referrer = req.headers['referer'];
        var referrerURI = referrer ? new URI(referrer) : null;
        var sourceHost = referrerURI ? referrerURI.hostname() : null;
        var thirdParty = referrerURI ? referrerURI.domain() == uri.domain() : true;
        var contentType = contentTypeFromRequest(req);

        var matched =
            matcher.matchesAny(req.url,
                               contentType,
                               sourceHost ? sourceHost : uri.hostname(),
                               thirdParty);

        if (matched instanceof filterClasses.BlockingFilter) {
            console.log('Filtered: ' + req.url);
            res.writeHead(403);
            res.end('Blocked by ABP-Proxy. Filter: ' + matched.text);
        } else {
            delete req.headers['proxy-connection'];
            proxy.web(req, res, { target: req.url, xfwd: false, toProxy: false });
        }
    });

    server.on('upgrade', function (req, socket, head) {
        proxy.ws(req, socket, head, { target: req.url, xfwd:false, toProxy:false });
    });

    server.on('error', function (e) {
        console.log(e);
    });

    server.listen(9000);

    console.log('Filter started.');
}
