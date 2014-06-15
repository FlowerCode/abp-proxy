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

var URI = require('URIjs');

module.exports.contentTypeFromRequest = function (req) {
    var accept = req.headers['accept'] || '';
    accept = accept.toLowerCase().split(',')[0];

    if (accept.indexOf('script') != -1) {
        return "SCRIPT";
    } else if (accept.indexOf('image') != -1) {
        return "IMAGE";
    } else if (accept.indexOf('css') != -1) {
        return "STYLESHEET";
    } else if (accept.indexOf('text') != -1) {
        if (new URI(req.url).path() == '/') {
            return "DOCUMENT";
        } else {
            return "SUBDOCUMENT";
        }
    } else {
        var requestedWith = req.headers['x-requested-with'] || '';

        if (requestedWith.toLowerCase() == 'xmlhttprequest') {
            return "XMLHTTPREQUEST";
        }

        var url = new URI(req.url).path().toLowerCase();

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
};
