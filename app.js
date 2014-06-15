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

var fs = require('fs'),
    http = require('http'),
    https = require('https'),
    zlib = require('zlib'),
    connect = require('connect'),
    buffer_search = require('buffer-search'),
    path = require('path'),
    _ = require('underscore'),
    URI = require('URIjs'),
    async = require('async'),
    request = require('request'),
    filterClasses = require('./filterClasses'),
    elemHide = require('./elemHide').ElemHide,
    matcher = require('./matcher').defaultMatcher,
    contentType = require('./contentType'),
    requestFilter = require('./requestFilter'),
    stylesheetInject = require('./stylesheetInject'),
    Filter = filterClasses.Filter;

var filters = [
    { 'name': 'EasyList China+EasyList', 'url': 'https://easylist-downloads.adblockplus.org/easylistchina+easylist.txt' },
    { 'name': 'Adblock Warning Removal List', 'url': 'https://easylist-downloads.adblockplus.org/antiadblockfilters.txt' }
];

function loadFilter(data) {
    var list = data.split('\n');
    list.shift();

    do {
        var filter = new Filter.fromText(list.shift());
        if (filter instanceof filterClasses.RegExpFilter) {
            matcher.add(filter);
        } else if (filter instanceof filterClasses.ElemHideBase) {
            elemHide.add(filter);
        }
    } while (list.length > 0);
}

async.waterfall([
        function (callback) {
            fs.mkdir('filters', null, function () {
                callback(null);
            })
        },
        function (callback) {
            async.reject(filters, function (filter, callback) {
                var filterPath = path.join('filters', filter['name']);
                console.log('Trying to load local filter ' + filterPath);
                fs.readFile(filterPath, 'utf-8', function (error, data) {
                    if (!error && data) {
                        loadFilter(data);
                        callback(true);
                    } else {
                        callback(false);
                    }
                });
            }, function (result) {
                callback(null, result);
            });
        },
        function (filtersMissing, callback) {
            async.each(filtersMissing, function (filter, callback) {
                var filterPath = path.join('filters', filter['name']);
                var url = filter['url'];

                console.log('Downloading ' + url + ' to path ' + filterPath);
                request.get(url)
                    .pipe(fs.createWriteStream(filterPath))
                    .on('finish', function () {
                        console.log('Successfully downloaded ' + url);
                        callback();
                    })
                    .on('error', function (error) {
                        callback('Failed to download from url ' + url);
                    });
            }, function (error) {
                if (error) {
                    callback(error);
                } else {
                    callback(null, filtersMissing);
                }
            });
        },
        function (filtersMissing, callback) {
            async.reject(filtersMissing, function (filter, callback) {
                var filterPath = path.join('filters', filter['name']);
                console.log('Trying to reload missing filter ' + filterPath);
                fs.readFile(filterPath, 'utf-8', function (error, data) {
                    if (!error && data) {
                        loadFilter(data);
                        callback(true);
                    } else {
                        callback(false);
                    }
                });
            }, function (result) {
                callback(null, result);
            });
        }, function (filtersMissing, callback) {
            async.each(filtersMissing, function (filter, callback) {
                console.error('Could not load filter' + filter['name']);
            });

            callback(null);
        }
    ], function (error, result) {
        if (error) {
            throw error;
        } else {
            startFiltering();
        }
    }
);

function startFiltering() {
    var server = connect.createServer(
        requestFilter.requestFilter(matcher),
        stylesheetInject.stylesheetInject(elemHide),
        function (req, res) {
            var url = req.url;
            var real_req = new request(url);

            real_req.on('error', function (e) {
                console.error(url, e);
                real_req.abort();
                res.writeHead(204, { 'connection': 'close' });
                res.end(e.message);
            });

            delete req.headers['proxy-connection'];

            req = req.pipe(real_req);

            req.on('response', function (response) {
                if ((response.headers['content-encoding']) &&
                    (response.headers['content-encoding'] != 'identity') &&
                    (response.headers['content-encoding'] != 'none'))
                {
                    var unzip = zlib.createUnzip();
                    unzip.on('error', function (e) {
                        console.error(e, url);
                    });

                    req = req.pipe(unzip);
                }

                var response_headers = response.headers;

                delete response_headers['content-encoding'];
                delete response_headers['content-length'];
                response_headers['connection'] = 'close';

                res.writeHead(response.statusCode, response_headers);

                if ((response.headers['content-type']) &&
                    (response.headers['content-type'].indexOf('text/html') == 0)) {
                    req.once('data', function (chunk) {
                        var domain = new URI(url).domain();
                        var stylesheet_str = elemHide.getSelectorsForDomain(domain, true).join(', ');

                        if (!stylesheet_str.length) {
                            return;
                        }

                        var head_buffer = new Buffer('<head>', 'ascii');
                        var head_offset = buffer_search(chunk, head_buffer);

                        if (head_offset != -1) {
                            console.warn('Modifying ' + url);
                            head_offset += head_buffer.length;
                            var start_to_head = chunk.slice(0, head_offset);
                            var head_to_end = chunk.slice(head_offset, chunk.length);
                            var stylesheet_buffer = new Buffer('<style>' + stylesheet_str +
                                ' { display: none !important; }</style>', 'ascii');
                            res.write(Buffer.concat([start_to_head, stylesheet_buffer, head_to_end]));
                            var orig_write = res.write;
                            res.write = function () {
                                res.write = orig_write;
                            }
                        }
                    });
                }

                req = req.pipe(res);
            });
        }
    );

    http.globalAgent.maxSockets = 1024;

    server.on('error', function (e) {
        console.error(e);
    });

    server.listen(9000);

    console.log('Filter started.');
}
