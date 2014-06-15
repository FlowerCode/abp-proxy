/*
 * This file is part of ABP-Proxy <https://github.com/FlowerCode/abp-proxy>,
 * Copyright (C) 2014 FlowerCode
 *
 * ABP-Proxy is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * ABP-Proxy is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with ABP-Proxy.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

module.exports.requestFilter = function (matcher) {
    return function (req, res, next) {
        var URI = require('URIjs'),
            contentType = require('./contentType'),
            filterClasses = require('./filterClasses'),
            Filter = filterClasses.Filter;

        // 1px transparent GIF from http://upload.wikimedia.org/wikipedia/commons/c/ce/Transparent.gif
        var transparentImage = '\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xFF\xFF\xFF\x21\xF9\x04\x01\x00\x00\x00\x00\x2C\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x01\x44\x00\x3B';

        var uri = new URI(req.url);
        var referrer = req.headers['referer'];
        var referrerURI = referrer ? new URI(referrer) : null;
        var sourceHost = referrerURI ? referrerURI.hostname() : null;
        var thirdParty = referrerURI ? referrerURI.domain() == uri.domain() : true;
        var resourceType = contentType.contentTypeFromRequest(req);

        var matched =
            matcher.matchesAny(req.url,
                resourceType,
                sourceHost ? sourceHost : uri.hostname(),
                thirdParty);

        if (matched instanceof filterClasses.BlockingFilter) {
            console.log('Filtered: ' + req.url);

            if (resourceType == 'IMAGE') {
                // Fake a transparent image response
                console.log('Transparent image sent: ' + req.url);
                res.writeHead(200);
                res.end(transparentImage);
            } else {
                res.writeHead(403);
                res.end('Blocked by ABP-Proxy. Filter: ' + matched.text);
            }

        } else {
            if (matched) {
                console.log('Whitelisted: ' + req.url);
            }

            next();
        }
    }
};
