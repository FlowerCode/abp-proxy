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

module.exports.stylesheetInject = function (elemHide) {
    return function (req, res, next) {
        // TODO: Move element hiding related code to here
        next();
    };
};
